"""Friends-hub leaderboard endpoint.

Split out of /app/backend/routes/friends.py in Apr-2026 for maintainability.
"""
from fastapi import APIRouter, Depends, Query

from utils.db import db
from utils.auth import get_current_user
from models.all import User
from utils.social_stats import friend_ids, user_stats


router = APIRouter()


@router.get("/friends/leaderboard")
async def friends_leaderboard(
    metric: str = Query("points", regex="^(points|landmarks|destinations|continents)$"),
    current_user: User = Depends(get_current_user),
):
    """Ranked list of the current user + all friends by the given metric.
    Powers the "Who's leading?" card on the Friends hub."""
    friends = await friend_ids(current_user.user_id)
    all_ids = [current_user.user_id] + friends

    rows = []
    users = {}
    if all_ids:
        for u in await db.users.find(
            {"user_id": {"$in": all_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ).to_list(len(all_ids)):
            users[u["user_id"]] = u

    for uid in all_ids:
        stats = await user_stats(uid)
        u = users.get(uid, {})
        rows.append({
            "user_id": uid,
            "name": u.get("name"),
            "username": u.get("username"),
            "picture": u.get("picture"),
            "is_me": uid == current_user.user_id,
            "value": stats.get(metric, 0),
        })

    rows.sort(key=lambda r: r["value"], reverse=True)
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1
    return {"metric": metric, "rows": rows[:10]}
