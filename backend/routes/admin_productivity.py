"""
Admin productivity endpoints — recent activity feed (live ticker) + bulk
user actions (suspend/warn/message N users at once) + user-trust explainer.

All super-admin / admin only.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from models.all import User
from utils.auth import get_admin_user, get_super_admin_user
from utils.db import db

router = APIRouter()


# ---------- Recent admin activity (ticker) -----------------------------------

@router.get("/admin/recent-activity")
async def recent_admin_activity(
    limit: int = 20,
    _: User = Depends(get_admin_user),
) -> dict[str, Any]:
    """Last N admin/moderator actions, denormalised with display names so the
    frontend ticker can render in one round-trip.
    """
    limit = max(1, min(limit, 50))
    cursor = db.admin_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)

    # Resolve admin & target user names in batch (no per-row lookups)
    ids = {r.get("admin_id") for r in rows} | {r.get("target_user_id") for r in rows}
    ids.discard(None)
    users = {}
    if ids:
        async for u in db.users.find(
            {"user_id": {"$in": list(ids)}},
            {"_id": 0, "user_id": 1, "username": 1, "name": 1},
        ):
            users[u["user_id"]] = u.get("username") or u.get("name") or u["user_id"][:8]

    for r in rows:
        if r.get("created_at") and isinstance(r["created_at"], datetime):
            ts = r["created_at"]
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            r["created_at"] = ts.isoformat()
        r["admin_name"] = users.get(r.get("admin_id"), r.get("admin_id", "")[:8])
        r["target_name"] = users.get(r.get("target_user_id"), "")

    return {"items": rows, "generated_at": datetime.now(timezone.utc).isoformat()}


# ---------- User-trust explainer (Why is this user trusted/suspended?) -------

@router.get("/admin/users/{user_id}/explain")
async def explain_user(
    user_id: str,
    _: User = Depends(get_admin_user),
) -> dict[str, Any]:
    """Returns a structured breakdown of trust + suspension state for a user.
    Used by the inline `<UserExplainer>` bottom sheet across admin screens.
    """
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")

    now = datetime.now(timezone.utc)
    suspended_until = u.get("suspended_until")
    is_suspended = False
    if isinstance(suspended_until, datetime):
        if suspended_until.tzinfo is None:
            suspended_until = suspended_until.replace(tzinfo=timezone.utc)
        is_suspended = suspended_until > now
        suspended_until = suspended_until.isoformat()

    # Counts the same signals the trust calculator uses
    verified_visits = await db.visits.count_documents({"user_id": user_id, "verified": True})
    warnings_recent = await db.admin_logs.count_documents({
        "target_user_id": user_id, "action": "warn",
        "created_at": {"$gte": now - timedelta(days=90)},
    })
    hidden_recent = await db.visits.count_documents({
        "user_id": user_id, "hidden": True,
        "hidden_at": {"$gte": now - timedelta(days=90)},
    })
    friend_count = await db.friends.count_documents({"user_id": user_id, "status": "accepted"})

    created_at = u.get("created_at")
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_old = (now - created_at).days
        created_at_iso = created_at.isoformat()
    else:
        days_old = 0
        created_at_iso = None

    return {
        "user_id": user_id,
        "username": u.get("username"),
        "email": u.get("email"),
        "role": u.get("role", "user"),
        "subscription_tier": u.get("subscription_tier", "free"),
        "trusted_traveler": bool(u.get("trusted_traveler")),
        "points": u.get("points", 0),
        "created_at": created_at_iso,
        "account_age_days": days_old,
        "is_suspended": is_suspended,
        "suspended_until": suspended_until if is_suspended else None,
        "suspended_reason": u.get("suspended_reason") if is_suspended else None,
        "criteria": {
            "account_90d":          {"label": "Account ≥ 90 days old", "ok": days_old >= 90, "value": days_old},
            "verified_visits_10":   {"label": "≥ 10 verified visits",  "ok": verified_visits >= 10, "value": verified_visits},
            "no_warnings_90d":      {"label": "0 warnings in 90 days", "ok": warnings_recent == 0, "value": warnings_recent},
            "no_hidden_90d":        {"label": "0 hidden content (90d)", "ok": hidden_recent == 0, "value": hidden_recent},
            "not_banned":           {"label": "Not suspended/banned", "ok": not is_suspended, "value": is_suspended},
            "friend_or_likes":      {"label": "≥ 1 friend",            "ok": friend_count >= 1, "value": friend_count},
        },
    }


# ---------- Bulk user actions -----------------------------------------------

class BulkUserAction(BaseModel):
    user_ids: list[str] = Field(..., min_length=1, max_length=200)
    action: Literal["suspend", "unsuspend", "warn", "message"]
    reason: Optional[str] = None
    duration_days: Optional[int] = None  # for suspend; default 7
    body: Optional[str] = None           # for message


@router.post("/admin/users/bulk-action")
async def bulk_user_action(
    payload: BulkUserAction,
    actor: User = Depends(get_admin_user),
) -> dict[str, Any]:
    """Apply a moderation action to up to 200 users at once. Mirrors the
    single-user endpoints in `routes/moderation.py` but batched, with one
    aggregated audit-log row per user."""
    successes = 0
    failures: list[dict[str, str]] = []
    now = datetime.now(timezone.utc)

    for uid in payload.user_ids:
        try:
            target = await db.users.find_one({"user_id": uid}, {"_id": 0, "user_id": 1, "role": 1})
            if not target:
                failures.append({"user_id": uid, "error": "not found"})
                continue

            # Defense-in-depth: never let a moderator bulk-touch admins.
            if target.get("role") == "admin" and actor.role != "admin":
                failures.append({"user_id": uid, "error": "forbidden"})
                continue

            if payload.action == "suspend":
                until = now + timedelta(days=payload.duration_days or 7)
                await db.users.update_one(
                    {"user_id": uid},
                    {"$set": {
                        "suspended_until": until,
                        "suspended_reason": payload.reason or "Bulk action — community guidelines",
                    }},
                )
            elif payload.action == "unsuspend":
                await db.users.update_one(
                    {"user_id": uid},
                    {"$set": {"suspended_until": None, "suspended_reason": None}},
                )
            elif payload.action == "warn":
                await db.users.update_one(
                    {"user_id": uid},
                    {"$inc": {"warnings_count": 1}, "$set": {"last_warning_at": now}},
                )
            elif payload.action == "message":
                if not payload.body:
                    failures.append({"user_id": uid, "error": "body required"})
                    continue
                await db.notifications.insert_one({
                    "notification_id": f"notif_{now.timestamp()}_{uid[:6]}",
                    "user_id": uid,
                    "type": "moderator_message",
                    "title": "Message from WanderMark Safety Team",
                    "body": payload.body,
                    "read": False,
                    "created_at": now,
                })

            await db.admin_logs.insert_one({
                "admin_id": actor.user_id,
                "action": f"bulk_{payload.action}",
                "target_user_id": uid,
                "reason": payload.reason or payload.body or "",
                "created_at": now,
            })
            successes += 1
        except Exception as e:
            failures.append({"user_id": uid, "error": str(e)[:120]})

    return {
        "ok": True,
        "action": payload.action,
        "succeeded": successes,
        "failed": len(failures),
        "failures": failures[:20],  # cap so the response stays small
    }
