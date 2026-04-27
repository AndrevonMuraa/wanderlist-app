"""Moderation actions — content removal, user warnings, suspensions, messages.

Replaces the previous "resolve report = nothing actually happens" gap. Now
moderators can:
  - Hide / restore / delete reported content (photo / diary / comment / activity)
  - Issue formal warnings with auto-escalation to suspension
  - Suspend users for N days (with auth-blocking enforced in get_current_user)
  - Send personal messages from a moderator to a user

All destructive operations are audit-logged via admin_logs. Hard-delete and
auto-escalation thresholds are super-admin sensitive.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.all import User
from utils.auth import get_admin_user, get_super_admin_user
from utils.notifications import create_notification

router = APIRouter()

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

VALID_CONTENT_TYPES = ("photo", "diary", "comment", "activity")
WARN_TO_SUSPEND_THRESHOLD = 3  # 3 warnings in 30d → 7d suspension
HARD_BAN_THRESHOLD = 5         # 5+ warnings ever → 30d suspension


async def _audit(admin_user: User, action: str, target_id: str, meta: dict = None):
    """Append entry to admin_logs."""
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "admin_role": admin_user.role,
        "action": action,
        "target_id": target_id,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc),
    })


# ============= CONTENT ACTIONS =============

class HideContentRequest(BaseModel):
    reason: Optional[str] = None
    notify_owner: bool = True


@router.post("/admin/content/{ctype}/{target_id}/hide")
async def hide_content(
    ctype: str,
    target_id: str,
    body: HideContentRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Soft-delete content — sets hidden=true. Owner sees 'Hidden by moderator'
    badge but content stays in DB for evidence/restore. Public feeds exclude it.
    """
    if ctype not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type. Must be one of {VALID_CONTENT_TYPES}")

    update = {
        "hidden": True,
        "hidden_at": datetime.now(timezone.utc),
        "hidden_by_user_id": admin_user.user_id,
        "hidden_by_name": admin_user.name,
        "hidden_reason": body.reason,
    }

    owner_id = None
    if ctype in ("photo", "activity", "diary"):
        # Try landmark visit first, then custom visit
        result = await db.visits.update_one({"visit_id": target_id}, {"$set": update})
        if result.matched_count == 0:
            result = await db.user_created_visits.update_one(
                {"user_created_visit_id": target_id}, {"$set": update}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Visit not found")
            doc = await db.user_created_visits.find_one({"user_created_visit_id": target_id})
        else:
            doc = await db.visits.find_one({"visit_id": target_id})
        owner_id = doc.get("user_id") if doc else None
    elif ctype == "comment":
        result = await db.comments.update_one({"comment_id": target_id}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
        doc = await db.comments.find_one({"comment_id": target_id})
        owner_id = doc.get("user_id") if doc else None

    await _audit(admin_user, f"hide_{ctype}", target_id, {"reason": body.reason})

    if body.notify_owner and owner_id and owner_id != admin_user.user_id:
        await create_notification(
            user_id=owner_id,
            notif_type="content_hidden",
            title="Your content was hidden",
            message=(
                f"Your {ctype} was hidden by a moderator after a community review. "
                + (f"Reason: {body.reason}. " if body.reason else "")
                + "Tap to read the community guidelines."
            ),
            related_id=target_id,
        )

    return {"message": f"{ctype} hidden", "target_id": target_id}


@router.post("/admin/content/{ctype}/{target_id}/restore")
async def restore_content(
    ctype: str,
    target_id: str,
    admin_user: User = Depends(get_admin_user)
):
    """Reverse a hide — un-hide content."""
    if ctype not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid content type")
    update = {"hidden": False}
    unset = {"hidden_at": "", "hidden_by_user_id": "", "hidden_by_name": "", "hidden_reason": ""}

    if ctype in ("photo", "activity", "diary"):
        result = await db.visits.update_one(
            {"visit_id": target_id}, {"$set": update, "$unset": unset}
        )
        if result.matched_count == 0:
            await db.user_created_visits.update_one(
                {"user_created_visit_id": target_id}, {"$set": update, "$unset": unset}
            )
    elif ctype == "comment":
        await db.comments.update_one({"comment_id": target_id}, {"$set": update, "$unset": unset})

    await _audit(admin_user, f"restore_{ctype}", target_id)
    return {"message": f"{ctype} restored", "target_id": target_id}


@router.delete("/admin/content/{ctype}/{target_id}")
async def delete_content(
    ctype: str,
    target_id: str,
    admin_user: User = Depends(get_super_admin_user)
):
    """Hard-delete content — irrecoverable. Super admin only."""
    if ctype not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid content type")

    if ctype in ("photo", "activity", "diary"):
        r1 = await db.visits.delete_one({"visit_id": target_id})
        r2 = await db.user_created_visits.delete_one({"user_created_visit_id": target_id})
        if r1.deleted_count + r2.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Visit not found")
    elif ctype == "comment":
        r = await db.comments.delete_one({"comment_id": target_id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")

    await _audit(admin_user, f"delete_{ctype}", target_id)
    return {"message": f"{ctype} permanently deleted", "target_id": target_id}


# ============= USER WARNINGS / SUSPENSIONS =============

class WarnUserRequest(BaseModel):
    reason: str
    related_report_id: Optional[str] = None
    message: Optional[str] = None  # personal note shown in notification


class SuspendUserRequest(BaseModel):
    reason: str
    duration_days: int = 7  # 1..365
    related_report_id: Optional[str] = None


class MessageUserRequest(BaseModel):
    message: str
    title: Optional[str] = "A message from the WanderMark team"


@router.post("/admin/users/{user_id}/warn")
async def warn_user(
    user_id: str,
    body: WarnUserRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Issue a formal warning to a user. Auto-escalates to suspension when
    threshold reached (3 warnings in 30 days → 7d suspension; 5+ → 30d).
    """
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    warning = {
        "warning_id": f"warn_{uuid.uuid4().hex[:12]}",
        "reason": body.reason,
        "related_report_id": body.related_report_id,
        "message": body.message,
        "issued_by_user_id": admin_user.user_id,
        "issued_by_name": admin_user.name,
        "issued_at": now,
    }

    await db.users.update_one(
        {"user_id": user_id},
        {
            "$push": {"warnings": warning},
            "$inc": {"warning_count": 1},
            "$set": {"last_warning_at": now},
        }
    )
    await _audit(admin_user, "warn_user", user_id, {"reason": body.reason})

    # Auto-escalation: count warnings in last 30 days
    thirty_days_ago = now - timedelta(days=30)
    recent_warnings = sum(
        1 for w in (user.get("warnings") or [])
        if (w.get("issued_at") and w["issued_at"] > thirty_days_ago)
    ) + 1  # plus the one we just issued

    auto_suspended = False
    suspend_days = 0
    if (user.get("warning_count") or 0) + 1 >= HARD_BAN_THRESHOLD:
        suspend_days = 30
        auto_suspended = True
    elif recent_warnings >= WARN_TO_SUSPEND_THRESHOLD:
        suspend_days = 7
        auto_suspended = True

    if auto_suspended:
        suspended_until = now + timedelta(days=suspend_days)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "suspended_until": suspended_until,
                "suspension_reason": f"Auto-suspended after {recent_warnings} warnings in 30d",
            }}
        )
        await _audit(admin_user, "auto_suspend_user", user_id, {"days": suspend_days})

    # Notify the user
    notify_msg = (
        f"You've received a warning from a WanderMark moderator. Reason: {body.reason}. "
        + (f"Note: {body.message} " if body.message else "")
        + (f"Your account has been auto-suspended for {suspend_days} days due to repeated warnings. " if auto_suspended else "")
        + "Please review our community guidelines."
    )
    await create_notification(
        user_id=user_id,
        notif_type="warning_issued",
        title="Warning from moderator" if not auto_suspended else "Account suspended",
        message=notify_msg,
        related_id=warning["warning_id"],
    )

    return {
        "message": "Warning issued",
        "warning_count": (user.get("warning_count") or 0) + 1,
        "auto_suspended": auto_suspended,
        "suspend_days": suspend_days if auto_suspended else 0,
    }


@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    body: SuspendUserRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Manually suspend a user for N days. Auth-blocked while suspended."""
    days = max(1, min(body.duration_days, 365))
    suspended_until = datetime.now(timezone.utc) + timedelta(days=days)

    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "suspended_until": suspended_until,
            "suspension_reason": body.reason,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    await _audit(admin_user, "suspend_user", user_id, {"days": days, "reason": body.reason})
    await create_notification(
        user_id=user_id,
        notif_type="account_suspended",
        title="Account suspended",
        message=f"Your account has been suspended for {days} days. Reason: {body.reason}. You can sign in again after {suspended_until.strftime('%b %d, %Y')}.",
        related_id=body.related_report_id,
    )
    return {"message": f"User suspended for {days} days", "suspended_until": suspended_until}


@router.post("/admin/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    admin_user: User = Depends(get_admin_user)
):
    """Clear suspended_until immediately."""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"suspended_until": "", "suspension_reason": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await _audit(admin_user, "unsuspend_user", user_id)
    return {"message": "Suspension lifted"}


@router.post("/admin/users/{user_id}/message")
async def message_user(
    user_id: str,
    body: MessageUserRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Send a personal moderator message to a user (push notification)."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await create_notification(
        user_id=user_id,
        notif_type="moderator_message",
        title=body.title or "A message from the WanderMark team",
        message=f"{body.message}\n\n— {admin_user.name}, WanderMark moderator",
    )
    await _audit(admin_user, "message_user", user_id)
    return {"message": "Message sent"}


@router.get("/admin/users/{user_id}/moderation-history")
async def get_user_moderation_history(
    user_id: str,
    admin_user: User = Depends(get_admin_user)
):
    """Get warnings + suspension state + recent reports against a user."""
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "warnings": 1, "warning_count": 1, "suspended_until": 1,
         "suspension_reason": 1, "is_banned": 1, "ban_reason": 1, "last_warning_at": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reports_against = await db.reports.find(
        {"target_id": user_id, "report_type": "user"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        "user_id": user_id,
        "warning_count": user.get("warning_count", 0),
        "warnings": user.get("warnings", []),
        "last_warning_at": user.get("last_warning_at"),
        "is_banned": user.get("is_banned", False),
        "ban_reason": user.get("ban_reason"),
        "suspended_until": user.get("suspended_until"),
        "suspension_reason": user.get("suspension_reason"),
        "reports_against": reports_against,
    }


# ============= MODERATOR ACTIVITY DASHBOARD =============

@router.get("/admin/moderator-activity")
async def get_moderator_activity(
    days: int = 30,
    admin_user: User = Depends(get_super_admin_user)
):
    """Per-moderator stats over the last N days. Super admin only."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # All admins/moderators
    mods = await db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "role": 1}
    ).to_list(100)

    activity = []
    for mod in mods:
        uid = mod["user_id"]

        # Reports reviewed
        reviewed = await db.reports.find(
            {"reviewed_by_user_id": uid, "reviewed_at": {"$gte": since}},
            {"_id": 0, "status": 1, "reviewed_at": 1, "created_at": 1}
        ).to_list(1000)
        resolved = sum(1 for r in reviewed if r.get("status") == "resolved")
        dismissed = sum(1 for r in reviewed if r.get("status") == "dismissed")

        # Average response time (hours)
        response_times = []
        for r in reviewed:
            ca = r.get("created_at")
            ra = r.get("reviewed_at")
            if ca and ra:
                if isinstance(ca, str):
                    ca = datetime.fromisoformat(ca.replace("Z", "+00:00"))
                delta_hours = (ra - ca).total_seconds() / 3600
                response_times.append(delta_hours)
        avg_response_hours = round(sum(response_times) / len(response_times), 1) if response_times else None

        # Audit-log actions
        actions = await db.admin_logs.find(
            {"admin_id": uid, "created_at": {"$gte": since}},
            {"_id": 0, "action": 1, "created_at": 1}
        ).to_list(1000)
        warnings_issued = sum(1 for a in actions if a.get("action") == "warn_user")
        suspensions = sum(1 for a in actions if a.get("action") in ("suspend_user", "auto_suspend_user"))
        content_hidden = sum(1 for a in actions if a.get("action", "").startswith("hide_"))
        content_deleted = sum(1 for a in actions if a.get("action", "").startswith("delete_"))

        # Last active
        last_action = await db.admin_logs.find_one(
            {"admin_id": uid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)]
        )

        activity.append({
            **mod,
            "reports_reviewed": len(reviewed),
            "resolved": resolved,
            "dismissed": dismissed,
            "avg_response_hours": avg_response_hours,
            "warnings_issued": warnings_issued,
            "suspensions": suspensions,
            "content_hidden": content_hidden,
            "content_deleted": content_deleted,
            "last_active": last_action.get("created_at") if last_action else None,
        })

    activity.sort(key=lambda a: a.get("reports_reviewed", 0), reverse=True)
    return {"days": days, "moderators": activity}
