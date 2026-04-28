"""
Trusted Traveler — community trust signal.

A user qualifies as a Trusted Traveler when ALL criteria are met:
1. Account age >= 90 days
2. >= 10 verified visits (photo-verified, lifetime)
3. warning_count == 0 in the last 90 days
4. No hidden content in the last 90 days
5. Not currently suspended, not banned
6. >= 1 friend OR >= 5 likes received

Trust state is cached on the user doc (`trusted_traveler: bool`) and refreshed
on relevant events (warn/suspend/ban/hide/visit-create) and periodically.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import os
from motor.motor_asyncio import AsyncIOMotorClient

from utils.helpers import create_notification

_client: Optional[AsyncIOMotorClient] = None


def _db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client[os.environ["DB_NAME"]]


REQUIRED_ACCOUNT_DAYS = 90
REQUIRED_VERIFIED_VISITS = 10
CLEAN_WINDOW_DAYS = 90
REQUIRED_FRIENDS = 1
REQUIRED_LIKES = 5


def _aware(dt):
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def compute_trust_status(user_id: str) -> Dict[str, Any]:
    """Compute live trust status with full progress breakdown.

    Returns: {
      trusted: bool,
      criteria: {account_age, verified_visits, no_warnings, no_hidden, not_suspended, engagement},
      progress: {account_days, verified_visits_count, warnings_in_window, hidden_in_window, friends, likes_received},
      blocked_reasons: [str],
    }
    """
    db = _db()
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return {"trusted": False, "criteria": {}, "progress": {}, "blocked_reasons": ["user_not_found"]}

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=CLEAN_WINDOW_DAYS)

    created_at = _aware(user.get("created_at")) or now
    account_days = max(0, (now - created_at).days)

    verified_count = await db.visits.count_documents({"user_id": user_id, "verified": True})

    warnings = user.get("warnings", []) or []
    warnings_in_window = sum(1 for w in warnings if (_aware(w.get("issued_at")) or now) >= window_start)

    hidden_in_window = await db.visits.count_documents({
        "user_id": user_id,
        "hidden": True,
        "hidden_at": {"$gte": window_start},
    })

    is_banned = bool(user.get("is_banned"))
    suspended_until = _aware(user.get("suspended_until"))
    is_suspended = bool(suspended_until and suspended_until > now)

    friends_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"},
        ],
    })
    likes_received = await db.likes.count_documents({"target_user_id": user_id})

    criteria = {
        "account_age": account_days >= REQUIRED_ACCOUNT_DAYS,
        "verified_visits": verified_count >= REQUIRED_VERIFIED_VISITS,
        "no_warnings": warnings_in_window == 0,
        "no_hidden": hidden_in_window == 0,
        "not_suspended": (not is_suspended) and (not is_banned),
        "engagement": friends_count >= REQUIRED_FRIENDS or likes_received >= REQUIRED_LIKES,
    }
    trusted = all(criteria.values())

    blocked_reasons = [k for k, v in criteria.items() if not v]

    return {
        "trusted": trusted,
        "criteria": criteria,
        "progress": {
            "account_days": account_days,
            "account_days_required": REQUIRED_ACCOUNT_DAYS,
            "verified_visits_count": verified_count,
            "verified_visits_required": REQUIRED_VERIFIED_VISITS,
            "warnings_in_window": warnings_in_window,
            "hidden_in_window": hidden_in_window,
            "friends_count": friends_count,
            "likes_received": likes_received,
            "friends_required": REQUIRED_FRIENDS,
            "likes_required": REQUIRED_LIKES,
            "is_banned": is_banned,
            "is_suspended": is_suspended,
            "suspended_until": suspended_until.isoformat() if suspended_until else None,
        },
        "blocked_reasons": blocked_reasons,
    }


async def refresh_trust_for_user(user_id: str) -> bool:
    """Recompute trust + write `trusted_traveler` flag on user doc.

    Sends one-time `trusted_traveler_earned` notification on transition false→true.
    Returns the new trusted state.
    """
    db = _db()
    status = await compute_trust_status(user_id)
    new_trusted = bool(status["trusted"])
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "trusted_traveler": 1, "trust_earned_at": 1})
    if not user:
        return new_trusted
    was_trusted = bool(user.get("trusted_traveler"))

    update: Dict[str, Any] = {"trusted_traveler": new_trusted}
    if new_trusted and not was_trusted:
        update["trust_earned_at"] = datetime.now(timezone.utc)
    if not new_trusted and was_trusted:
        update["trust_revoked_at"] = datetime.now(timezone.utc)

    await db.users.update_one({"user_id": user_id}, {"$set": update})

    # Audit log
    await db.trust_events.insert_one({
        "user_id": user_id,
        "trusted": new_trusted,
        "changed": new_trusted != was_trusted,
        "blocked_reasons": status["blocked_reasons"],
        "at": datetime.now(timezone.utc),
    })

    # First-time earned: notification
    if new_trusted and not was_trusted:
        await create_notification(
            user_id=user_id,
            notif_type="trusted_traveler_earned",
            title="You're now a Trusted Traveler",
            message="90 days of clean contribution + active engagement. Your shield now appears across the community.",
            related_id=None,
        )

    return new_trusted


async def grandfather_all_users() -> Dict[str, int]:
    """Run-once: compute trust for every existing user. Returns counts."""
    db = _db()
    granted = 0
    revoked = 0
    total = 0
    async for user in db.users.find({}, {"user_id": 1, "trusted_traveler": 1}):
        total += 1
        was = bool(user.get("trusted_traveler"))
        is_now = await refresh_trust_for_user(user["user_id"])
        if is_now and not was:
            granted += 1
        elif was and not is_now:
            revoked += 1
    return {"total": total, "granted": granted, "revoked": revoked}
