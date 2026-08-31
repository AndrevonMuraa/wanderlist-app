"""Seed test visits for testpro@wandermark.app to populate Year-in-Travel slides."""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    user = await db.users.find_one({"email": "testpro@wandermark.app"}, {"_id": 0, "user_id": 1})
    if not user:
        print("User not found")
        sys.exit(1)
    user_id = user["user_id"]

    # Wipe previous test seed
    await db.visits.delete_many({"user_id": user_id, "_seed_year_recap": True})

    # Spread 14 visits across 2025 with photos. Mix of recent + old visited_at dates
    plan = [
        # (landmark_id, created_month, visited_year, photos)
        ("france_eiffel_tower", 1, 2025, 4),
        ("france_louvre_museum", 1, 2025, 2),
        ("italy_colosseum", 2, 2025, 3),
        ("italy_pantheon", 3, 2025, 1),
        ("japan_mount_fuji", 3, 2025, 5),
        ("japan_kinkaku-ji_(golden_pavilion)", 3, 2025, 2),
        ("usa_grand_canyon", 4, 2025, 6),
        ("usa_statue_of_liberty", 4, 2025, 3),
        ("usa_times_square", 4, 2025, 2),
        ("egypt_great_pyramid_of_giza", 5, 1995, 1),  # time travel memory
        ("uk_tower_of_london", 6, 2024, 2),
        ("greece_parthenon", 7, 2025, 3),
        ("spain_sagrada_familia", 8, 2025, 4),
        ("germany_neuschwanstein_castle", 9, 2025, 2),
    ]

    sample_photos = [
        "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=900",
        "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900",
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900",
        "https://images.unsplash.com/photo-1535139262971-c51845709a48?w=900",
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900",
        "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=900",
    ]

    inserted = 0
    used: set = set()
    for lm_id, month, vyear, n_photos in plan:
        # Verify landmark exists; pick a fallback if not found
        lm = await db.landmarks.find_one(
            {"landmark_id": lm_id},
            {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1, "points": 1},
        )
        if not lm or lm_id in used:
            lm = await db.landmarks.find_one(
                {"landmark_id": {"$nin": list(used)}},
                {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1, "points": 1},
            )
            lm_id = lm["landmark_id"]
        used.add(lm_id)

        await db.visits.update_one(
            {"user_id": user_id, "landmark_id": lm_id},
            {
                "$set": {
                    "landmark_name": lm.get("name", ""),
                    "country_name": lm.get("country_name", ""),
                    "points_earned": lm.get("points", 10),
                    "verified": n_photos > 0,
                    "photos": sample_photos[:n_photos],
                    "visited_at": datetime(vyear, month, 12, 12, 0, tzinfo=timezone.utc),
                    "visibility": "public",
                    "is_public": True,
                    "created_at": datetime(2025, month, 15, 9, 30, tzinfo=timezone.utc),
                    "diary_notes": f"Test memory #{inserted+1}",
                    "share_diary": False,
                    "_seed_year_recap": True,
                },
                "$setOnInsert": {"visit_id": f"visit_{uuid.uuid4().hex[:12]}"},
            },
            upsert=True,
        )
        inserted += 1

    print(f"Seeded {inserted} test visits for {user_id}")


if __name__ == "__main__":
    asyncio.run(main())
