"""Lockdown control endpoints (super-admin only).

Enabling lockdown freezes all moderator/admin write actions across the app.
Disabling it requires a fresh TOTP/backup code (proof-of-possession) so a
compromised super-admin password alone cannot un-freeze the system.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from models.all import User
from utils.auth import get_super_admin_user
from utils.lockdown import get_lockdown_state, set_lockdown
from routes.two_factor import verify_totp_or_backup_async
from utils.db import db

router = APIRouter()


class LockdownToggleRequest(BaseModel):
    code: Optional[str] = None  # required for disable; optional for enable


@router.get("/admin/lockdown/status")
async def lockdown_status(admin_user: User = Depends(get_super_admin_user)):
    return await get_lockdown_state()


@router.post("/admin/lockdown/enable")
async def enable_lockdown(
    body: LockdownToggleRequest,
    admin_user: User = Depends(get_super_admin_user),
):
    """Freeze all moderator/admin write actions immediately."""
    state = await get_lockdown_state()
    if state.get("admin_lockdown"):
        return state
    return await set_lockdown(True, admin_user.user_id, admin_user.name)


@router.post("/admin/lockdown/disable")
async def disable_lockdown(
    body: LockdownToggleRequest,
    admin_user: User = Depends(get_super_admin_user),
):
    """Lift the lockdown.

    Requires a fresh TOTP / backup code. If the super-admin has not enrolled
    in 2FA yet, a strong fallback is required: the request is rejected with
    instructions to enroll first.
    """
    user_doc = await db.users.find_one({"user_id": admin_user.user_id}, {"_id": 0})
    if not user_doc.get("totp_enabled"):
        raise HTTPException(
            status_code=403,
            detail=(
                "Lifting the lockdown requires 2FA. Enroll at /admin/2fa-setup "
                "before enabling lockdown next time."
            ),
        )
    if not body.code or not await verify_totp_or_backup_async(user_doc, body.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    return await set_lockdown(False, admin_user.user_id, admin_user.name)
