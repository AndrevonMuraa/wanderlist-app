"""Last 2 fixes: Fiji activity name + Australia premium gap.
Run on Render: cd scripts && python3 fix_last_two.py
"""
import asyncio, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'wandermark')]

    r = await db.landmarks.update_one(
        {"name": "Navua River Rafting"},
        {"$set": {
            "name": "Namosi Highlands",
            "description": "Remote mountainous interior of Viti Levu with dramatic river gorges, waterfalls, and untouched rainforest."
        }}
    )
    print(f"Fiji rename: {r.modified_count}")

    exists = await db.landmarks.find_one({"country_id": "australia", "name": "Cradle Mountain Tasmania"})
    if exists:
        print("Australia: Cradle Mountain Tasmania already exists")
    else:
        c = await db.countries.find_one({"country_id": "australia"}, {"_id": 0, "name": 1, "continent": 1})
        await db.landmarks.insert_one({
            "landmark_id": "australia_premium_sync_5",
            "name": "Cradle Mountain Tasmania",
            "country_id": "australia",
            "country_name": c["name"],
            "continent": c["continent"],
            "description": "Iconic alpine wilderness with ancient rainforest, glacial lakes, and wombats in Tasmania.",
            "category": "premium",
            "image_url": "", "images": [],
            "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
            "best_time_to_visit": "Year-round", "duration": "Full day",
            "difficulty": "Moderate", "latitude": None, "longitude": None,
            "points": 25, "upvotes": 0, "created_by": None,
            "created_at": datetime.now(timezone.utc),
        })
        print("Australia: added Cradle Mountain Tasmania")

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"Total: {t} ({o} official, {p} premium)")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix())
