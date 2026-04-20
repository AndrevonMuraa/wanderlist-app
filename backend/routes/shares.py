"""Lightweight share-tracking analytics.

- POST /api/shares → records a share event (user_id + share_type + period + ts).
  Powers the "virality" analytics for WanderMark (e.g. how many users share
  their monthly Top 10 card, who the top sharers are, which months spike).
- GET /api/admin/shares/stats → aggregated stats for admin analytics dashboard.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from utils.db import db
from utils.auth import get_current_user, get_admin_user
from models.all import User


router = APIRouter()


class ShareEvent(BaseModel):
    share_type: str = Field(..., description="e.g. 'top_month', 'journey', 'visit'")
    period: Optional[str] = Field(None, description="optional period label (e.g. 'April 2026')")


@router.post("/shares")
async def record_share(
    payload: ShareEvent,
    current_user: User = Depends(get_current_user),
):
    """Log a share event. Fire-and-forget from the client; never blocks UX."""
    allowed_types = {"top_month", "top_all", "journey", "rank", "visit", "compare"}
    if payload.share_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid share_type. Allowed: {sorted(allowed_types)}")

    await db.shares.insert_one({
        "user_id": current_user.user_id,
        "share_type": payload.share_type,
        "period": payload.period,
        "created_at": datetime.now(timezone.utc),
    })
    return {"success": True}


@router.get("/admin/shares/stats")
async def share_stats(
    _admin: User = Depends(get_admin_user),
):
    """Top-level virality dashboard.

    Returns:
    - totals_by_type: count per share_type
    - top_sharers: top 10 users by total shares (includes name/username)
    """
    by_type = await db.shares.aggregate([
        {"$group": {"_id": "$share_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)
    totals_by_type = {r["_id"]: r["count"] for r in by_type}

    top_sharers_agg = await db.shares.aggregate([
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)

    user_ids = [r["_id"] for r in top_sharers_agg]
    users = {}
    if user_ids:
        for u in await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1}
        ).to_list(len(user_ids)):
            users[u["user_id"]] = u

    top_sharers = []
    for r in top_sharers_agg:
        u = users.get(r["_id"], {})
        top_sharers.append({
            "user_id": r["_id"],
            "name": u.get("name"),
            "username": u.get("username"),
            "share_count": r["count"],
        })

    return {"totals_by_type": totals_by_type, "top_sharers": top_sharers}
