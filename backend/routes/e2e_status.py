"""
E2E seed data status + cleanup — super-admin only.

Lets the super-admin verify how much e2e seed data is currently live in the
production DB and wipe it in one click before App Store submission.

Every read/write is namespaced by `_seed_source: "e2e"` so production user data
can never be touched.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from models.all import User
from utils.auth import get_super_admin_user
from utils.db import db

router = APIRouter()

SEED_TAG = "e2e"

# Collections that the seed script writes to. Order matters only for the UI tile order.
SEED_COLLECTIONS = [
    ("users",                "Users (seeded/refreshed)"),
    ("visits",               "Landmark visits"),
    ("user_created_visits",  "Custom visits"),
    ("country_visits",       "Country visits"),
    ("friends",              "Friendship rows"),
    ("friend_requests",      "Pending requests"),
    ("reports",              "Pending reports"),
    ("support_tickets",      "Support tickets"),
]


@router.get("/admin/e2e-status")
async def e2e_status(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    """Return per-collection counts of `_seed_source: "e2e"` documents."""
    counts: list[dict[str, Any]] = []
    total = 0
    for coll, label in SEED_COLLECTIONS:
        n = await db[coll].count_documents({"_seed_source": SEED_TAG})
        counts.append({"collection": coll, "label": label, "count": n})
        total += n

    # Hidden visits within the e2e set — useful to verify the moderator banner UX
    hidden_visits = await db.visits.count_documents(
        {"_seed_source": SEED_TAG, "hidden": True}
    )

    # Personas list (so the UI can show a roster + login emails at a glance)
    personas_cursor = db.users.find(
        {"_seed_source": SEED_TAG},
        {
            "_id": 0, "user_id": 1, "email": 1, "username": 1, "role": 1,
            "subscription_tier": 1, "trusted_traveler": 1, "suspended_until": 1,
            "points": 1,
        },
    ).sort("role", -1)
    personas = await personas_cursor.to_list(length=50)
    now = datetime.now(timezone.utc)
    for p in personas:
        s = p.get("suspended_until")
        # Render-safe ISO + a derived flag for the UI
        if isinstance(s, datetime):
            if s.tzinfo is None:
                s = s.replace(tzinfo=timezone.utc)
            p["suspended_until"] = s.isoformat()
            p["is_suspended"] = s > now
        else:
            p["suspended_until"] = None
            p["is_suspended"] = False

    return {
        "tag": SEED_TAG,
        "total": total,
        "counts": counts,
        "hidden_visits": hidden_visits,
        "personas": personas,
        "personas_count": len(personas),
        "generated_at": now.isoformat(),
    }


@router.post("/admin/e2e-status/wipe")
async def wipe_e2e_data(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    """Remove every `_seed_source: "e2e"` document from every collection.

    Users themselves are KEPT (so login credentials survive) but their seed
    artefacts are deleted. Mirrors `scripts/seed_e2e_data.py --wipe`.
    """
    deleted: dict[str, int] = {}
    total = 0
    # Same set as the seed script's wipe_seed() — keeps the two implementations
    # in lock-step.
    wipe_collections = [
        "visits", "user_created_visits", "country_visits", "friends",
        "friend_requests", "reports", "support_tickets", "activities",
        "comments", "notifications", "activity_likes",
    ]
    for coll in wipe_collections:
        res = await db[coll].delete_many({"_seed_source": SEED_TAG})
        if res.deleted_count:
            deleted[coll] = res.deleted_count
            total += res.deleted_count

    return {
        "ok": True,
        "deleted_total": total,
        "deleted_by_collection": deleted,
        "users_preserved": True,
        "wiped_at": datetime.now(timezone.utc).isoformat(),
    }
