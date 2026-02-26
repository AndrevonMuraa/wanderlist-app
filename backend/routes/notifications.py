from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user
from models.all import User
from utils.helpers import create_notification


router = APIRouter()

# ============= NOTIFICATION HELPER FUNCTIONS =============

async def create_notification(user_id: str, notif_type: str, title: str, message: str, 
                              related_id: Optional[str] = None, related_user_id: Optional[str] = None,
                              related_user_name: Optional[str] = None):
    """Helper function to create a notification"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    notification = {
        "notification_id": notification_id,
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "related_id": related_id,
        "related_user_id": related_user_id,
        "related_user_name": related_user_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    return notification_id

# ============= NOTIFICATION ENDPOINTS =============

@router.get("/notifications")
async def get_notifications(limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return notifications

@router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": current_user.user_id,
        "is_read": False
    })
    
    return {"unread_count": count}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@router.put("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user.user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        "notification_id": notification_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

# ============= END NOTIFICATION ENDPOINTS =============
