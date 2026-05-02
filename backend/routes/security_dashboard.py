"""Security Dashboard — real-time admin situational awareness.

Aggregates failed-login activity, recent admin actions, active lockouts,
2FA enrollment status, and lockdown history into a single super-admin-only
endpoint. Every query uses the indexes we added in utils/db.py.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends

from models.all import User
from utils.auth import get_super_admin_user
from utils.db import db
from utils.lockdown import get_lockdown_state

router = APIRouter()


@router.get("/admin/security-dashboard")
async def security_dashboard(admin_user: User = Depends(get_super_admin_user)):
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)

    # --- Active lockouts ---
    active_lockouts_cursor = db.users.find(
        {"locked_until": {"$gt": now}},
        {
            "_id": 0,
            "user_id": 1,
            "email": 1,
            "name": 1,
            "failed_login_attempts": 1,
            "locked_until": 1,
            "last_failed_login_at": 1,
        },
    ).sort("locked_until", -1).limit(25)
    active_lockouts = [doc async for doc in active_lockouts_cursor]

    # --- Recent admin actions (last 10) ---
    recent_actions_cursor = db.admin_logs.find(
        {},
        {"_id": 0, "admin_id": 1, "admin_name": 1, "action": 1, "target_id": 1, "created_at": 1, "changes": 1},
    ).sort("created_at", -1).limit(10)
    recent_actions = [doc async for doc in recent_actions_cursor]

    # --- Action counts last 30d (by action type) ---
    action_counts = await db.admin_logs.aggregate([
        {"$match": {"created_at": {"$gte": since_30d}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    action_counts = [{"action": a["_id"], "count": a["count"]} for a in action_counts]

    # --- 2FA enrollment status for staff accounts ---
    staff_cursor = db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {
            "_id": 0,
            "user_id": 1,
            "name": 1,
            "email": 1,
            "role": 1,
            "totp_enabled": 1,
            "totp_enabled_at": 1,
            "totp_grace_started_at": 1,
            "totp_backup_codes": 1,
        },
    ).sort("role", 1)
    staff_2fa = []
    async for doc in staff_cursor:
        staff_2fa.append({
            "user_id": doc.get("user_id"),
            "name": doc.get("name"),
            "email": doc.get("email"),
            "role": doc.get("role"),
            "totp_enabled": bool(doc.get("totp_enabled")),
            "totp_enabled_at": doc.get("totp_enabled_at"),
            "totp_grace_started_at": doc.get("totp_grace_started_at"),
            "backup_codes_remaining": len(doc.get("totp_backup_codes") or []),
        })

    # --- Current lockdown state + history ---
    lockdown_state = await get_lockdown_state()
    lockdown_events_cursor = db.admin_logs.find(
        {"action": {"$in": ["lockdown_enabled", "lockdown_disabled"]}},
        {"_id": 0, "admin_name": 1, "action": 1, "created_at": 1},
    ).sort("created_at", -1).limit(10)
    lockdown_events = [doc async for doc in lockdown_events_cursor]

    # --- Tier quota usage (today, per super-admin) ---
    today = now.strftime("%Y-%m-%d")
    tier_quota_cursor = db.tier_quota.find(
        {"date": today},
        {"_id": 0, "admin_id": 1, "used": 1, "limit": 1, "date": 1},
    )
    tier_quota_today = [doc async for doc in tier_quota_cursor]

    # --- Summary counters ---
    total_staff = len(staff_2fa)
    staff_with_2fa = sum(1 for s in staff_2fa if s["totp_enabled"])
    active_lockout_count = len(active_lockouts)

    return {
        "generated_at": now,
        "summary": {
            "active_lockouts": active_lockout_count,
            "staff_total": total_staff,
            "staff_with_2fa": staff_with_2fa,
            "staff_2fa_coverage_pct": round(100 * staff_with_2fa / total_staff, 1) if total_staff else 0,
            "lockdown_active": bool(lockdown_state.get("admin_lockdown")),
        },
        "active_lockouts": active_lockouts,
        "recent_actions": recent_actions,
        "action_counts_30d": action_counts,
        "staff_2fa": staff_2fa,
        "lockdown": {
            "state": lockdown_state,
            "recent_events": lockdown_events,
        },
        "tier_quota_today": tier_quota_today,
    }
