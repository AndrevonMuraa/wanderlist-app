"""Fixes for build 73: Northern Lights rename + Lake Manyara Tree Lions cleanup + premium test user.
Run on Render: cd scripts && python3 fix_build73.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]


async def fix():
    # 1. Rename "Northern Lights in Lapland" -> "Northern Lights"
    r = await db.landmarks.update_one(
        {"name": "Northern Lights in Lapland"},
        {"$set": {
            "name": "Northern Lights",
            "description": "One of the best places on Earth to witness the aurora borealis, visible across Finland from September to March."
        }}
    )
    print(f"Northern Lights rename: {r.modified_count}")

    # 2. Check and fix Lake Manyara Tree Lions (near-duplicate of Lake Manyara)
    tree_lions = await db.landmarks.find_one({"name": {"$regex": "Lake Manyara.*Tree Lions", "$options": "i"}})
    if tree_lions:
        # Rename to a unique Tanzania landmark
        await db.landmarks.update_one(
            {"_id": tree_lions["_id"]},
            {"$set": {
                "name": "Kondoa Rock Art Sites",
                "description": "UNESCO collection of ancient rock paintings spanning thousands of years in central Tanzania."
            }}
        )
        print(f"Lake Manyara Tree Lions -> Kondoa Rock Art Sites")
    else:
        print("Lake Manyara Tree Lions: not found (already fixed)")

    # 3. Create premium test user (or upgrade existing)
    test_pro = await db.users.find_one({"email": "testpro@wandermark.app"})
    if test_pro:
        await db.users.update_one(
            {"email": "testpro@wandermark.app"},
            {"$set": {"subscription_tier": "pro"}}
        )
        print(f"testpro@wandermark.app: upgraded to pro")
    else:
        # Create new pro user with same password hash as test user
        test_user = await db.users.find_one({"email": "test@wandermark.app"}, {"_id": 0, "password_hash": 1})
        if test_user:
            import uuid
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": "testpro@wandermark.app",
                "name": "Pro Tester",
                "username": "protester",
                "password_hash": test_user["password_hash"],
                "subscription_tier": "pro",
                "points": 0,
                "leaderboard_points": 0,
                "default_privacy": "public",
                "comment_permission": "everyone",
                "created_at": datetime.now(timezone.utc),
            })
            print(f"Created testpro@wandermark.app (pro) with password Test1234!")
        else:
            print("Could not find test user to copy password hash")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix())
