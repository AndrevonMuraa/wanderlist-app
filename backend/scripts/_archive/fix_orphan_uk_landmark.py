"""Delete the orphan landmark 'uk_york_minster' — it has an invalid country_id
and doesn't exist in the canonical local DB.

Safe: checks visit count first and refuses to delete if any visits reference it.

Run via Render Shell:
    cd scripts && python3 fix_orphan_uk_landmark.py          # dry-run
    cd scripts && python3 fix_orphan_uk_landmark.py --apply  # execute
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


async def run(apply: bool):
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    print(f"Mode: {'APPLY' if apply else 'DRY-RUN'}")
    print()

    orphan = await db.landmarks.find_one(
        {"landmark_id": "uk_york_minster"},
        {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1, "category": 1},
    )
    if not orphan:
        print("No orphan 'uk_york_minster' found — already fixed.")
        client.close()
        return 0

    print(f"Target: {orphan}")

    # Visit-count audit
    visits = await db.visits.count_documents({"landmark_id": "uk_york_minster"})
    print(f"User visits referencing this landmark: {visits}")

    if visits > 0:
        print("\nVisits exist — will ARCHIVE instead of delete (preserves visit history).")
        if apply:
            await db.landmarks.update_one(
                {"landmark_id": "uk_york_minster"},
                {"$set": {
                    "archived": True,
                    "archived_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            print("ARCHIVED.")
        else:
            print("Would archive (dry-run).")
    else:
        print("\nNo visits — safe to hard delete.")
        if apply:
            result = await db.landmarks.delete_one({"landmark_id": "uk_york_minster"})
            print(f"DELETED {result.deleted_count} document(s).")
        else:
            print("Would delete (dry-run).")

    # Final counts
    total = await db.landmarks.count_documents({"archived": {"$ne": True}})
    print(f"\nActive landmarks: {total}  (expected 1500)")

    # UK stats check
    uk_o = await db.landmarks.count_documents({"country_id": "uk", "category": "official", "archived": {"$ne": True}})
    uk_p = await db.landmarks.count_documents({"country_id": "uk", "category": "premium", "archived": {"$ne": True}})
    print(f"UK landmarks: {uk_o}o + {uk_p}p = {uk_o + uk_p}  (expected 10o + 5p = 15)")

    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run("--apply" in sys.argv)))
