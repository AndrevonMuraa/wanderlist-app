from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, is_user_pro, get_user_limits
from models.all import User


router = APIRouter()

# ============= SUBSCRIPTION ENDPOINTS =============

@router.get("/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """Get current user's subscription status and limits"""
    is_pro = is_user_pro(current_user)
    limits = get_user_limits(current_user)
    
    # Get current usage stats
    friends_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    return {
        "subscription_tier": "pro" if is_pro else "free",
        "is_pro": is_pro,
        "expires_at": current_user.subscription_expires_at.isoformat() if current_user.subscription_expires_at else None,
        "limits": limits,
        "usage": {
            "friends_count": friends_count,
            "friends_limit": limits["max_friends"],
            "friends_remaining": max(0, limits["max_friends"] - friends_count),
        },
        "pricing": {
            "monthly": {"price": 3.99, "currency": "USD"},
            "yearly": {"price": 29.99, "currency": "USD", "savings": "37%"},
        }
    }

@router.post("/subscription/upgrade")
async def upgrade_subscription(
    plan: str,  # "monthly" or "yearly"
    current_user: User = Depends(get_current_user)
):
    """
    Upgrade user to Pro subscription.
    In production, this would integrate with Stripe/RevenueCat.
    For now, it directly activates the subscription for testing.
    """
    if plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'monthly' or 'yearly'")
    
    # Calculate expiration date
    if plan == "monthly":
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    else:  # yearly
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    
    # Update user subscription
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "subscription_tier": "pro",
                "subscription_expires_at": expires_at,
                "is_premium": True  # For backward compatibility
            }
        }
    )
    
    # Create activity for feed
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "subscription_upgrade",
        "description": f"upgraded to WanderMark Pro! 🌟",
        "visibility": "public",
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    return {
        "success": True,
        "message": f"Welcome to WanderMark Pro! Your {plan} subscription is now active.",
        "subscription_tier": "pro",
        "expires_at": expires_at.isoformat(),
        "features_unlocked": [
            "Access to 150+ premium landmarks",
            "Unlimited friends",
            "Up to 10 photos per visit",
            "Custom visits feature",
            "All badges achievable"
        ]
    }

@router.post("/subscription/cancel")
async def cancel_subscription(current_user: User = Depends(get_current_user)):
    """Cancel Pro subscription (will remain active until expiry)"""
    if not is_user_pro(current_user):
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # In production, this would cancel the recurring payment
    # The subscription remains active until expires_at
    
    return {
        "success": True,
        "message": "Your subscription has been cancelled. You'll retain Pro access until your current period ends.",
        "expires_at": current_user.subscription_expires_at.isoformat() if current_user.subscription_expires_at else None
    }

# For testing purposes - remove in production
@router.post("/subscription/test-toggle")
async def toggle_subscription_for_testing(current_user: User = Depends(get_current_user)):
    """Toggle subscription on/off for testing purposes"""
    is_pro = is_user_pro(current_user)
    
    if is_pro:
        # Downgrade to free
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "subscription_tier": "free",
                    "subscription_expires_at": None,
                    "is_premium": False
                }
            }
        )
        return {"message": "Downgraded to free tier", "is_pro": False}
    else:
        # Upgrade to pro (1 year)
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "subscription_tier": "pro",
                    "subscription_expires_at": expires_at,
                    "is_premium": True
                }
            }
        )
        return {"message": "Upgraded to Pro tier", "is_pro": True, "expires_at": expires_at.isoformat()}

# ============= END SUBSCRIPTION ENDPOINTS =============
