"""One-shot migration: repair legacy visits with null/missing critical fields.

Problem:
  33 of 41 visits had missing landmark_name, country_name, points_earned, verified.
  Caused by seed scripts (e.g. seed_year_recap_test.py) writing visits directly
  to MongoDB without going through the canonical /visits POST endpoint.

Fix:
  For each broken visit, look up its landmark and backfill:
    - landmark_name <- landmarks.name
    - country_name  <- landmarks.country_name
    - points_earned <- landmarks.points (default 10)
    - verified      <- (photos.length > 0)
  Then trigger recalculate_user_points for every affected user so caches sync.

Also patches users without an explicit `role` field -> defaults to "user".

Run from /app/backend with:
    python -m scripts.repair_legacy_visits
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


async def repair_visits(db) -> tuple[int, set[str]]:
    """Backfill null/missing fields on legacy visits. Returns (count_fixed, affected_user_ids)."""
    affected_users: set[str] = set()
    count_fixed = 0

    # Find every broken visit (any of the four critical fields null/missing)
    query = {
        "$or": [
            {"points_earned": None},
            {"points_earned": {"$exists": False}},
            {"verified": None},
            {"verified": {"$exists": False}},
            {"landmark_name": None},
            {"landmark_name": {"$exists": False}},
            {"country_name": None},
            {"country_name": {"$exists": False}},
        ]
    }

    async for v in db.visits.find(query):
        landmark_id = v.get("landmark_id")
        if not landmark_id:
            print(f"  SKIP visit {v.get('visit_id')} — no landmark_id")
            continue

        lm = await db.landmarks.find_one(
            {"landmark_id": landmark_id},
            {"_id": 0, "name": 1, "country_name": 1, "points": 1},
        )
        if not lm:
            print(f"  WARN visit {v.get('visit_id')} — landmark {landmark_id} not found")
            continue

        photos = v.get("photos") or []
        photo_base64 = v.get("photo_base64")
        is_verified = len(photos) > 0 or bool(photo_base64)

        update = {
            "landmark_name": lm.get("name", "Unknown"),
            "country_name": lm.get("country_name", ""),
            "points_earned": int(lm.get("points") or 10),
            "verified": is_verified,
            "has_photo": is_verified,
            "photo_count": len(photos),
        }
        await db.visits.update_one({"visit_id": v["visit_id"]}, {"$set": update})
        count_fixed += 1
        affected_users.add(v["user_id"])

    return count_fixed, affected_users


async def repair_user_roles(db) -> int:
    """Backfill role: 'user' for users where the field is missing."""
    result = await db.users.update_many(
        {"$or": [{"role": None}, {"role": {"$exists": False}}]},
        {"$set": {"role": "user"}},
    )
    return result.modified_count


async def recalculate_users(db, user_ids: set[str]) -> int:
    """Run recalculate_user_points for every affected user."""
    from utils.helpers import recalculate_user_points

    count = 0
    for uid in user_ids:
        await recalculate_user_points(uid)
        count += 1
    return count


async def verify_no_more_broken(db) -> int:
    """Sanity check: return count of remaining broken visits (should be 0)."""
    return await db.visits.count_documents({
        "$or": [
            {"points_earned": None},
            {"points_earned": {"$exists": False}},
            {"verified": None},
            {"verified": {"$exists": False}},
        ]
    })


async def main():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    print(f"=== Legacy visit repair starting at {datetime.now(timezone.utc).isoformat()} ===")

    print("\n[1/3] Repairing visits...")
    fixed, users = await repair_visits(db)
    print(f"  Fixed {fixed} visits across {len(users)} users")

    print("\n[2/3] Backfilling missing user.role...")
    role_fixed = await repair_user_roles(db)
    print(f"  Set role='user' on {role_fixed} users")

    print("\n[3/3] Recalculating points for affected users...")
    if users:
        recalc = await recalculate_users(db, users)
        print(f"  Recalculated {recalc} users")
    else:
        print("  Skipped (no affected users)")

    remaining = await verify_no_more_broken(db)
    print(f"\nRemaining broken visits: {remaining}")
    if remaining == 0:
        print("[OK] All visits clean.")
    else:
        print("[WARN] Some visits still broken (likely orphan landmark_ids). Inspect manually.")


if __name__ == "__main__":
    asyncio.run(main())
