from fastapi import APIRouter, Depends
import os
from datetime import datetime, timezone

from utils.db import db
from utils.auth import get_current_user
from models.all import User, PushTokenCreate


router = APIRouter()

# ============= PUSH NOTIFICATION ENDPOINTS =============

@router.post("/push-token")
async def save_push_token(token_data: PushTokenCreate, current_user: User = Depends(get_current_user)):
    """Save or update push token for the current user."""
    await db.push_tokens.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "user_id": current_user.user_id,
                "push_token": token_data.push_token,
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    return {"message": "Push token saved successfully"}

@router.delete("/push-token")
async def delete_push_token(current_user: User = Depends(get_current_user)):
    """Delete push token for the current user (logout/disable notifications)."""
    await db.push_tokens.delete_one({"user_id": current_user.user_id})
    return {"message": "Push token deleted successfully"}

@router.get("/push-settings")
async def get_push_settings(current_user: User = Depends(get_current_user)):
    """Get push notification settings for the current user."""
    settings = await db.push_settings.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        settings = {
            "user_id": current_user.user_id,
            "likes_enabled": True,
            "comments_enabled": True,
            "friend_requests_enabled": True,
            "messages_enabled": True,
            "achievements_enabled": True,
            "weekly_summary_enabled": True
        }
    
    return settings

@router.put("/push-settings")
async def update_push_settings(
    settings: dict,
    current_user: User = Depends(get_current_user)
):
    """Update push notification settings for the current user."""
    allowed_keys = [
        "likes_enabled", "comments_enabled", "friend_requests_enabled",
        "messages_enabled", "achievements_enabled", "weekly_summary_enabled"
    ]
    
    # Filter only allowed settings
    filtered_settings = {k: v for k, v in settings.items() if k in allowed_keys}
    filtered_settings["user_id"] = current_user.user_id
    filtered_settings["updated_at"] = datetime.now(timezone.utc)
    
    await db.push_settings.update_one(
        {"user_id": current_user.user_id},
        {"$set": filtered_settings},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

