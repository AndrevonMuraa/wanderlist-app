"""Absolute last fix: Fiji duplicate + Australia gap.
Run: cd scripts && python3 fix_final_final.py && python3 db_compare.py
"""
import asyncio, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'wandermark')]

    # Fiji: two "Namosi Highlands" - rename the second one
    count = 0
    async for lm in db.landmarks.find({"country_id": "fiji", "name": "Namosi Highlands"}, {"_id": 1}):
        count += 1
        if count == 2:
            await db.landmarks.update_one(
                {"_id": lm["_id"]},
                {"$set": {
                    "name": "Navua River Gorge",
                    "description": "Dramatic gorge carved through volcanic highlands with towering canyon walls and pristine waterfalls."
                }}
            )
            print("Fiji: renamed duplicate Namosi Highlands -> Navua River Gorge")

    # Australia: find what premium names exist, add a unique one
    existing = set()
    async for lm in db.landmarks.find({"country_id": "australia"}, {"_id": 0, "name": 1}):
        existing.add(lm["name"])
    print(f"Australia existing: {len(existing)} landmarks")

    new_name = "Horizontal Falls Kimberley"
    if new_name in existing:
        new_name = "Ningaloo Reef"
    if new_name in existing:
        new_name = "Kangaroo Island Wildlife"
    if new_name in existing:
        new_name = "Lord Howe Island"

    if new_name not in existing:
        c = await db.countries.find_one({"country_id": "australia"}, {"_id": 0, "name": 1, "continent": 1})
        await db.landmarks.insert_one({
            "landmark_id": "australia_premium_final",
            "name": new_name,
            "country_id": "australia",
            "country_name": c["name"],
            "continent": c["continent"],
            "description": "UNESCO volcanic island paradise with unique wildlife, pristine coral lagoon, and towering Gower formation.",
            "category": "premium",
            "image_url": "", "images": [],
            "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
            "best_time_to_visit": "Year-round", "duration": "Full day",
            "difficulty": "Moderate", "latitude": None, "longitude": None,
            "points": 25, "upvotes": 0, "created_by": None,
            "created_at": datetime.now(timezone.utc),
        })
        print(f"Australia: added {new_name}")
    else:
        print(f"Australia: all candidates exist, manual fix needed")

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"Total: {t} ({o} official, {p} premium)")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix())
