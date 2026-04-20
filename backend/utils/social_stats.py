"""Shared helpers for friendship-driven routes (compare, leaderboards, hub)."""
from utils.db import db


async def assert_friends_or_self(current_user_id: str, other_user_id: str) -> bool:
    """Return True if the two users are the same person or accepted friends."""
    if current_user_id == other_user_id:
        return True
    friendship = await db.friends.find_one({
        "status": "accepted",
        "$or": [
            {"user_id": current_user_id, "friend_id": other_user_id},
            {"user_id": other_user_id, "friend_id": current_user_id},
        ],
    })
    return friendship is not None


async def friend_ids(user_id: str) -> list:
    """IDs of accepted friends for a user."""
    friendships = await db.friends.find(
        {"status": "accepted", "$or": [{"user_id": user_id}, {"friend_id": user_id}]},
        {"_id": 0, "user_id": 1, "friend_id": 1},
    ).to_list(2000)
    return [
        (f["friend_id"] if f["user_id"] == user_id else f["user_id"])
        for f in friendships
    ]


async def user_stats(user_id: str) -> dict:
    """Compute the 4 Journey-page stats for a single user."""
    agg = await db.visits.aggregate([
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "landmarks", "localField": "landmark_id", "foreignField": "landmark_id",
            "as": "lm", "pipeline": [{"$project": {"_id": 0, "country_name": 1, "continent": 1}}],
        }},
        {"$unwind": {"path": "$lm", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "landmarks": {"$sum": 1},
            "countries": {"$addToSet": "$lm.country_name"},
            "continents": {"$addToSet": "$lm.continent"},
        }},
    ]).to_list(1)
    stats = agg[0] if agg else {"landmarks": 0, "countries": [], "continents": []}
    user = await db.users.find_one(
        {"user_id": user_id}, {"_id": 0, "leaderboard_points": 1, "points": 1},
    )
    return {
        "continents": len([c for c in stats["continents"] if c]),
        "destinations": len([c for c in stats["countries"] if c]),
        "landmarks": stats["landmarks"],
        "points": (user or {}).get("leaderboard_points") or (user or {}).get("points", 0),
    }
