"""
Trust endpoints — exposes Trusted Traveler status and refresh hooks.
"""
from fastapi import APIRouter, Depends, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.all import User
from utils.auth import get_current_user, get_super_admin_user
from utils.trust import compute_trust_status, grandfather_all_users

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


@router.get("/users/me/trust")
async def my_trust(current_user: User = Depends(get_current_user)):
    """Live computed trust status for the authenticated user, with full progress."""
    return await compute_trust_status(current_user.user_id)


@router.get("/users/{user_id}/trust")
async def user_trust_summary(user_id: str, current_user: User = Depends(get_current_user)):
    """Public summary — only the boolean, never the progress detail."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "trusted_traveler": 1, "trust_earned_at": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user_id,
        "trusted": bool(user.get("trusted_traveler")),
        "trust_earned_at": user.get("trust_earned_at").isoformat() if user.get("trust_earned_at") else None,
    }


@router.post("/admin/trust/grandfather")
async def admin_grandfather(admin_user: User = Depends(get_super_admin_user)):
    """One-time job: re-evaluate all users. Returns counts."""
    return await grandfather_all_users()
