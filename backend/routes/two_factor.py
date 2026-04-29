"""Two-Factor Authentication (TOTP) for accounts that need extra protection.

Threat model: even if a super-admin's password is compromised, the attacker
must also possess the live TOTP secret (or a backup code) to authenticate.
This caps the worst-case damage from a single-credential leak — combined
with the daily tier-change quota, downgrade/upgrade abuse becomes
mechanically impossible.

Policy:
  - Super-admins (role == "admin") are REQUIRED to enroll. The `/auth/login`
    flow rejects password-only logins for super-admins who haven't enrolled
    once a grace period (set in `TWO_FA_GRACE_DAYS`) has passed. During the
    grace, the API returns a soft warning so the existing super-admin can
    still log in once to set it up.
  - Moderators and regular users may opt in.

Storage layout on the user document:
  totp_enabled: bool
  totp_secret: str (base32 — guarded by row-level access)
  totp_pending_secret: str  # while user is in setup, before they confirm
  totp_backup_codes: List[str]  # SHA-256 hashes of single-use codes
  totp_enabled_at: datetime
"""
from __future__ import annotations

import base64
import hashlib
import io
import os
import secrets
import uuid
from datetime import datetime, timezone

import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from models.all import User
from utils.auth import get_current_user

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

ISSUER = "WanderMark"
BACKUP_CODE_COUNT = 10
TWO_FA_GRACE_DAYS = 7  # Super-admin grace period for first-time enrollment


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TwoFAVerifyRequest(BaseModel):
    code: str


class TwoFADisableRequest(BaseModel):
    code: str  # current TOTP or backup code (proof of possession)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_backup_code(code: str) -> str:
    """SHA-256 hash a backup code so DB leaks don't reveal the codes themselves."""
    return hashlib.sha256(code.upper().strip().encode("utf-8")).hexdigest()


def _generate_backup_codes(n: int = BACKUP_CODE_COUNT) -> list[str]:
    """Generate human-friendly backup codes: XXXX-XXXX (8 hex chars + dash)."""
    codes = []
    for _ in range(n):
        raw = secrets.token_hex(4).upper()  # 8 chars
        codes.append(f"{raw[:4]}-{raw[4:]}")
    return codes


def _make_qr_data_url(uri: str) -> str:
    """Return a base64-encoded PNG QR data URL the frontend can render via <Image>."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def verify_totp_or_backup(user_doc: dict, code: str) -> bool:
    """Verify a 6-digit TOTP or a single-use backup code.

    Backup codes, once consumed, are removed from the stored hash list so
    they cannot be reused.
    """
    code = (code or "").strip()
    if not code or not user_doc:
        return False

    # 1) Try TOTP
    if user_doc.get("totp_enabled") and user_doc.get("totp_secret"):
        clean = code.replace(" ", "")
        if clean.isdigit() and len(clean) == 6:
            totp = pyotp.TOTP(user_doc["totp_secret"])
            if totp.verify(clean, valid_window=1):  # accept ±30s clock skew
                return True

    # 2) Try backup code
    hashed = _hash_backup_code(code)
    backups = user_doc.get("totp_backup_codes") or []
    if hashed in backups:
        # Single-use: pull from list
        return _consume_backup_code(user_doc["user_id"], hashed)

    return False


async def _consume_backup_code_async(user_id: str, hashed: str) -> bool:
    res = await db.users.update_one(
        {"user_id": user_id, "totp_backup_codes": hashed},
        {"$pull": {"totp_backup_codes": hashed}},
    )
    return res.modified_count > 0


def _consume_backup_code(user_id: str, hashed: str) -> bool:
    """Sync wrapper used inside `verify_totp_or_backup` from auth-time helpers.

    We schedule the consumption asynchronously via the event loop. Since the
    callsite is itself async, we expose `verify_totp_or_backup_async` for
    callers that want strict await semantics.
    """
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_consume_backup_code_async(user_id, hashed))
            return True
        return loop.run_until_complete(_consume_backup_code_async(user_id, hashed))
    except RuntimeError:
        return asyncio.run(_consume_backup_code_async(user_id, hashed))


async def verify_totp_or_backup_async(user_doc: dict, code: str) -> bool:
    """Strict-async version used by the login flow."""
    code = (code or "").strip()
    if not code or not user_doc:
        return False

    if user_doc.get("totp_enabled") and user_doc.get("totp_secret"):
        clean = code.replace(" ", "")
        if clean.isdigit() and len(clean) == 6:
            totp = pyotp.TOTP(user_doc["totp_secret"])
            if totp.verify(clean, valid_window=1):
                return True

    hashed = _hash_backup_code(code)
    backups = user_doc.get("totp_backup_codes") or []
    if hashed in backups:
        return await _consume_backup_code_async(user_doc["user_id"], hashed)

    return False


def is_super_admin_grace_expired(user_doc: dict) -> bool:
    """Return True if the super-admin can no longer log in without 2FA."""
    if user_doc.get("role") != "admin":
        return False
    if user_doc.get("totp_enabled"):
        return False
    grace_started = user_doc.get("totp_grace_started_at")
    if not grace_started:
        # First time we see this admin without 2FA — start the clock
        return False
    if grace_started.tzinfo is None:
        grace_started = grace_started.replace(tzinfo=timezone.utc)
    elapsed = datetime.now(timezone.utc) - grace_started
    return elapsed.total_seconds() > TWO_FA_GRACE_DAYS * 86400


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/2fa/setup")
async def setup_2fa(current_user: User = Depends(get_current_user)):
    """Begin TOTP enrollment.

    Generates a fresh secret stored as `totp_pending_secret` (NOT yet active).
    The user must call /2fa/confirm with a valid code to activate it.
    Returns the otpauth URI + a base64 PNG QR code.
    """
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if user_doc.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled. Disable first to re-enroll.")

    secret = pyotp.random_base32()
    label = current_user.email or current_user.user_id
    uri = pyotp.TOTP(secret).provisioning_uri(name=label, issuer_name=ISSUER)

    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"totp_pending_secret": secret}},
    )
    return {
        "secret": secret,
        "otpauth_uri": uri,
        "qr_code_data_url": _make_qr_data_url(uri),
        "issuer": ISSUER,
        "label": label,
    }


@router.post("/2fa/confirm")
async def confirm_2fa(
    body: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """Activate 2FA after user has scanned the QR and entered a valid code.

    Returns 10 single-use backup codes (shown ONCE to the user).
    """
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    pending = user_doc.get("totp_pending_secret")
    if not pending:
        raise HTTPException(status_code=400, detail="No pending 2FA setup. Call /2fa/setup first.")
    if user_doc.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled.")

    code = (body.code or "").replace(" ", "").strip()
    if not code.isdigit() or len(code) != 6:
        raise HTTPException(status_code=400, detail="Code must be 6 digits.")

    totp = pyotp.TOTP(pending)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code. Please re-scan and try again.")

    backup_codes = _generate_backup_codes()
    hashed_backups = [_hash_backup_code(c) for c in backup_codes]

    await db.users.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "totp_enabled": True,
                "totp_secret": pending,
                "totp_backup_codes": hashed_backups,
                "totp_enabled_at": datetime.now(timezone.utc),
            },
            "$unset": {"totp_pending_secret": "", "totp_grace_started_at": ""},
        },
    )

    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": current_user.user_id,
        "admin_name": current_user.name,
        "action": "2fa_enabled",
        "target_id": current_user.user_id,
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "enabled": True,
        "backup_codes": backup_codes,
        "warning": "Save these backup codes in a safe place. Each can be used once if you lose your authenticator.",
    }


@router.post("/2fa/disable")
async def disable_2fa(
    body: TwoFADisableRequest,
    current_user: User = Depends(get_current_user),
):
    """Disable 2FA. Requires a valid TOTP or backup code as proof-of-possession.

    Super-admins CAN disable, but a fresh `totp_grace_started_at` is set so the
    enforcement clock resumes — they must re-enroll within `TWO_FA_GRACE_DAYS`
    or be locked out of normal login.
    """
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user_doc.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled.")

    if not await verify_totp_or_backup_async(user_doc, body.code):
        raise HTTPException(status_code=401, detail="Invalid code.")

    update = {
        "$set": {"totp_enabled": False},
        "$unset": {"totp_secret": "", "totp_backup_codes": "", "totp_enabled_at": ""},
    }
    if user_doc.get("role") == "admin":
        update["$set"]["totp_grace_started_at"] = datetime.now(timezone.utc)

    await db.users.update_one({"user_id": current_user.user_id}, update)

    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": current_user.user_id,
        "admin_name": current_user.name,
        "action": "2fa_disabled",
        "target_id": current_user.user_id,
        "created_at": datetime.now(timezone.utc),
    })

    return {"enabled": False}


@router.get("/2fa/status")
async def status_2fa(current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "totp_enabled": 1, "totp_enabled_at": 1, "totp_backup_codes": 1, "role": 1},
    )
    backups = user_doc.get("totp_backup_codes") or []
    return {
        "enabled": bool(user_doc.get("totp_enabled")),
        "enabled_at": user_doc.get("totp_enabled_at"),
        "backup_codes_remaining": len(backups),
        "required": user_doc.get("role") == "admin",
    }


@router.post("/2fa/regenerate-backup-codes")
async def regenerate_backup_codes(
    body: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate fresh backup codes. Old codes are invalidated immediately."""
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user_doc.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA must be enabled first.")
    if not await verify_totp_or_backup_async(user_doc, body.code):
        raise HTTPException(status_code=401, detail="Invalid code.")

    new_codes = _generate_backup_codes()
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"totp_backup_codes": [_hash_backup_code(c) for c in new_codes]}},
    )
    return {"backup_codes": new_codes}
