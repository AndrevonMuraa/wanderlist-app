"""Clean Atlas DB: remove images, coordinates, add indexes, fix duplicates.
Run: python3 scripts/clean_atlas.py"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

async def clean():
    # 1. Remove images and coordinates from landmarks
    r1 = await db.landmarks.update_many({}, {"$set": {"image_url": "", "images": [], "latitude": None, "longitude": None}})
    print(f"Landmarks cleaned: {r1.modified_count}")

    # 2. Remove country images
    r2 = await db.countries.update_many({}, {"$set": {"image_url": ""}})
    print(f"Countries cleaned: {r2.modified_count}")

    # 3. Add indexes
    await db.countries.create_index("country_id", unique=True)
    await db.countries.create_index("continent")
    await db.landmarks.create_index("continent")
    print("Indexes created")

    # 4. Fix duplicate visits for all users
    pipeline = [
        {"$group": {"_id": {"user_id": "$user_id", "landmark_id": "$landmark_id"}, "count": {"$sum": 1}, "ids": {"$push": "$visit_id"}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dupes = await db.visits.aggregate(pipeline).to_list(1000)
    removed = 0
    for d in dupes:
        for vid in d["ids"][1:]:
            await db.visits.delete_one({"visit_id": vid})
            await db.activities.delete_many({"visit_id": vid})
            removed += 1
    print(f"Removed {removed} duplicate visits")

    # 5. Verify
    total_lm = await db.landmarks.count_documents({})
    total_c = await db.countries.count_documents({})
    total_v = await db.visits.count_documents({})
    print(f"\nFinal: {total_c} countries, {total_lm} landmarks, {total_v} visits")
    client.close()

if __name__ == "__main__":
    asyncio.run(clean())
