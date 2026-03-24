"""Update auto country visits from 20 to 50 pts, then recalculate all users.
Run: cd scripts && python3 fix_country_visit_points.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'wandermark')]

    r = await db.country_visits.update_many(
        {"source": "auto_landmark", "points_earned": 20},
        {"$set": {"points_earned": 50}}
    )
    print(f"Updated {r.modified_count} auto country visits from 20->50 pts")

    # Now recalculate all users
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1}).to_list(10000)
    changed = 0
    for user in users:
        from recalculate_points import recalculate_user as recalc
        result = await recalc(user["user_id"], verbose=False)
        if result["old_points"] != result["new_points"] or result["old_lb"] != result["new_lb"]:
            changed += 1
            print(f"  CHANGED: {user.get('name','?')} pts:{result['old_points']}->{result['new_points']} lb:{result['old_lb']}->{result['new_lb']}")

    print(f"Recalculated: {changed}/{len(users)} users updated")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix())
