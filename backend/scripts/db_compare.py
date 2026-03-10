"""Database comparison tool - generates a fingerprint of landmark data.
Run on both local and production to compare.

Usage:
  cd scripts && python3 db_compare.py
"""
import asyncio
import hashlib
import os
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]


async def compare():
    # 1. Basic counts
    total = await db.landmarks.count_documents({})
    official = await db.landmarks.count_documents({"category": "official"})
    premium = await db.landmarks.count_documents({"category": "premium"})
    countries = await db.countries.count_documents({})

    print(f"Countries: {countries}")
    print(f"Landmarks: {total} ({official} official, {premium} premium)")

    # 2. Duplicate landmark_ids
    pipeline = [
        {"$group": {"_id": "$landmark_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dupes = []
    async for doc in db.landmarks.aggregate(pipeline):
        dupes.append(doc["_id"])
    print(f"Duplicate IDs: {len(dupes)}")

    # 3. Duplicate names within same country
    pipeline2 = [
        {"$group": {
            "_id": {"country_id": "$country_id", "name": "$name"},
            "count": {"$sum": 1},
        }},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dup_names = []
    async for doc in db.landmarks.aggregate(pipeline2):
        dup_names.append(f"{doc['_id']['country_id']}: {doc['_id']['name']}")
    print(f"Duplicate names: {len(dup_names)}")
    for dn in dup_names:
        print(f"  - {dn}")

    # 4. Countries with wrong landmark counts
    bad = []
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}).sort("name", 1):
        o = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "official"})
        p = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if o != 10 or p != 5:
            bad.append(f"{c['name']}: {o}o + {p}p = {o+p}")
    print(f"Wrong counts: {len(bad)}")
    for b in bad:
        print(f"  - {b}")

    # 5. Activity keyword check
    activity_patterns = [
        "cruise", "balloon", "safari", "diving", "surf", "rafting",
        "train", "whale watching", "swimming", "snorkeling", "fish fry",
        "festival", "dancers", "hunters", "camel", "shark cage",
        "land diving", "ride", "express", "tour", "icebreaker",
        "hot air", "sea turtles", "red elephants", "mud festival",
        "light show", "pepper farm", "shipwreck div", "boat tour",
        "fire dance", "bird watch", "whale shark swim", "walking tour",
        "gaucho festival", "white water",
    ]
    activities = []
    async for lm in db.landmarks.find({}, {"_id": 0, "name": 1, "landmark_id": 1}):
        name_lower = lm["name"].lower()
        for pat in activity_patterns:
            if pat in name_lower:
                if "sliding" in name_lower:
                    continue
                activities.append(f"{lm['landmark_id']}: {lm['name']}")
                break
    print(f"Activity names: {len(activities)}")
    for a in activities:
        print(f"  - {a}")

    # 6. Fingerprint (sorted list of landmark_id|name|category)
    entries = []
    async for lm in db.landmarks.find(
        {}, {"_id": 0, "landmark_id": 1, "name": 1, "category": 1}
    ).sort("landmark_id", 1):
        entries.append(f"{lm['landmark_id']}|{lm['name']}|{lm['category']}")
    fp = hashlib.md5("\n".join(entries).encode()).hexdigest()
    print(f"\nFINGERPRINT: {fp}")

    client.close()


if __name__ == "__main__":
    asyncio.run(compare())
