"""Community Highlight endpoints.

- GET /api/community-highlight → single dynamic featured visit (hotness algorithm)
- GET /api/community-highlights/top → top N all-time by raw likes_count

See utils/highlight_scoring.py for the hotness algorithm.
"""
import random

from fastapi import APIRouter, Depends

from utils.db import db
from utils.auth import get_current_user
from utils.highlight_scoring import build_candidate_pool
from models.all import User


router = APIRouter()


@router.get("/community-highlight")
async def get_community_highlight(
    current_user: User = Depends(get_current_user)
):
    """Return ONE featured community highlight using the hotness algorithm.

    hotness = (likes_count + 1) * max(0.3, 1 - age_days/30)
    Picks randomly from top 20 for rotation. Two back-to-back callers may see
    different selections (intentional — keeps the hero dynamic).
    """
    candidates = await build_candidate_pool(current_user)
    if not candidates:
        return {"highlight": None}

    candidates.sort(key=lambda c: c["hotness"], reverse=True)
    top_pool = candidates[:20]
    featured = random.choice(top_pool)

    is_liked = False
    comments_count = 0
    if featured.get("activity_id"):
        is_liked = bool(await db.likes.find_one({
            "activity_id": featured["activity_id"],
            "user_id": current_user.user_id
        }))
        comments_count = await db.comments.count_documents({
            "activity_id": featured["activity_id"]
        })

    featured.pop("hotness", None)
    featured["is_liked"] = is_liked
    featured["comments_count"] = comments_count

    return {"highlight": featured}


@router.get("/community-highlights/top")
async def get_top_community_highlights(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Top N (max 50) all-time community photos ranked purely by likes_count."""
    limit = max(1, min(limit, 50))
    candidates = await build_candidate_pool(current_user)
    if not candidates:
        return {"items": []}

    candidates.sort(key=lambda c: (c.get("likes_count", 0), c.get("visited_at") or ""), reverse=True)
    top = candidates[:limit]

    activity_ids = [c["activity_id"] for c in top if c.get("activity_id")]
    liked_set: set = set()
    comments_map: dict = {}
    if activity_ids:
        liked_docs = await db.likes.find(
            {"activity_id": {"$in": activity_ids}, "user_id": current_user.user_id},
            {"_id": 0, "activity_id": 1}
        ).to_list(len(activity_ids))
        liked_set = {d["activity_id"] for d in liked_docs}
        comments_agg = await db.comments.aggregate([
            {"$match": {"activity_id": {"$in": activity_ids}}},
            {"$group": {"_id": "$activity_id", "count": {"$sum": 1}}}
        ]).to_list(len(activity_ids))
        comments_map = {r["_id"]: r["count"] for r in comments_agg}

    for idx, c in enumerate(top):
        c.pop("hotness", None)
        c["rank"] = idx + 1
        c["is_liked"] = c.get("activity_id") in liked_set
        c["comments_count"] = comments_map.get(c.get("activity_id"), 0)

    return {"items": top}
