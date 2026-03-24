"""Recalculate user points using the canonical recalculate_user_points() from helpers.
Run: cd scripts && python3 recalculate_points.py [email]
"""
import asyncio
import os
import sys

# Add backend to path so we can import helpers
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from motor.motor_asyncio import AsyncIOMotorClient
from utils.helpers import recalculate_user_points
from utils.db import db

client = AsyncIOMotorClient(os.environ['MONGO_URL'])


async def recalculate_single(email: str):
    _db = client[os.environ.get('DB_NAME', 'wandermark')]
    user = await _db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "name": 1, "points": 1, "leaderboard_points": 1})
    if not user:
        print(f"User not found: {email}")
        return

    old_pts = user.get("points", 0)
    old_lb = user.get("leaderboard_points", 0)

    await recalculate_user_points(user["user_id"])

    updated = await _db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "points": 1, "leaderboard_points": 1})
    new_pts = updated.get("points", 0)
    new_lb = updated.get("leaderboard_points", 0)

    print(f"  User: {user['name']} ({user['user_id']})")
    print(f"  TOTAL: {old_pts} -> {new_pts} | VERIFIED: {old_lb} -> {new_lb}")
    if old_pts == new_pts and old_lb == new_lb:
        print("  (no change)")


async def recalculate_all():
    _db = client[os.environ.get('DB_NAME', 'wandermark')]
    users = await _db.users.find({}, {"_id": 0, "user_id": 1, "name": 1, "points": 1, "leaderboard_points": 1}).to_list(10000)
    print(f"Recalculating {len(users)} users...")
    changed = 0
    for user in users:
        old_pts = user.get("points", 0)
        old_lb = user.get("leaderboard_points", 0)
        await recalculate_user_points(user["user_id"])
        updated = await _db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "points": 1, "leaderboard_points": 1})
        new_pts = updated.get("points", 0)
        new_lb = updated.get("leaderboard_points", 0)
        if old_pts != new_pts or old_lb != new_lb:
            changed += 1
            print(f"  CHANGED: {user.get('name','?')} pts:{old_pts}->{new_pts} lb:{old_lb}->{new_lb}")
    print(f"Done. {changed}/{len(users)} users updated.")
    client.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(recalculate_single(sys.argv[1]))
    else:
        asyncio.run(recalculate_all())
