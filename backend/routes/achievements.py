from fastapi import APIRouter, Depends
import os
import logging
import uuid
from datetime import datetime

from utils.db import db
from utils.auth import get_current_user
from models.all import User, Achievement
from utils.helpers import check_and_award_badges, BADGE_DEFINITIONS


router = APIRouter()

# ============= ACHIEVEMENTS ENDPOINTS =============

@router.get("/achievements", response_model=List[Achievement])
async def get_user_achievements(current_user: User = Depends(get_current_user)):
    """Get all achievements/badges for the current user"""
    achievements = await db.achievements.find(
        {"user_id": current_user.user_id}
    ).sort("earned_at", -1).to_list(1000)
    
    return [Achievement(**achievement) for achievement in achievements]

@router.get("/achievements/showcase")
async def get_achievements_showcase(current_user: User = Depends(get_current_user)):
    """Get comprehensive achievement data including progress toward locked badges"""
    # Get earned achievements
    earned_achievements = await db.achievements.find(
        {"user_id": current_user.user_id}
    ).sort("earned_at", -1).to_list(1000)
    
    earned_badge_types = {badge["badge_type"] for badge in earned_achievements}
    
    # Get user stats for progress calculation
    visit_count = await db.visits.count_documents({"user_id": current_user.user_id})
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    total_points = user.get("points", 0)
    
    # Count friends
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    # Count completed countries
    completed_countries = await db.visits.aggregate([
        {"$match": {"user_id": current_user.user_id}},
        {"$group": {"_id": "$country_id", "visit_count": {"$sum": 1}}},
        {"$lookup": {
            "from": "landmarks",
            "let": {"country": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [
                    {"$eq": ["$country_id", "$$country"]},
                    {"$eq": ["$category", "official"]}
                ]}}},
                {"$count": "total"}
            ],
            "as": "landmark_info"
        }},
        {"$match": {"$expr": {"$eq": [
            "$visit_count",
            {"$arrayElemAt": ["$landmark_info.total", 0]}
        ]}}}
    ]).to_list(1000)
    
    completed_country_count = len(completed_countries)
    
    # Build all badges with progress
    all_badges = []
    
    for badge_type, badge_def in BADGE_DEFINITIONS.items():
        is_earned = badge_type in earned_badge_types
        
        # Calculate progress
        progress = 0
        current_value = 0
        target_value = 0
        progress_text = ""
        
        # Milestone badges
        if badge_type.startswith("milestone_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = visit_count
            progress = min(100, int((visit_count / target) * 100))
            progress_text = f"{visit_count}/{target} visits"
        elif badge_type == "first_visit":
            target_value = 1
            current_value = visit_count
            progress = 100 if visit_count >= 1 else 0
            progress_text = f"{min(visit_count, 1)}/1 visit"
        
        # Points badges
        elif badge_type.startswith("points_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = total_points
            progress = min(100, int((total_points / target) * 100))
            progress_text = f"{total_points:,}/{target:,} points"
        
        # Social badges
        elif badge_type.startswith("social_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = friend_count
            progress = min(100, int((friend_count / target) * 100))
            progress_text = f"{friend_count}/{target} friends"
        
        # Country complete
        elif badge_type == "country_complete":
            target_value = 1
            current_value = completed_country_count
            progress = 100 if completed_country_count >= 1 else 0
            progress_text = f"{completed_country_count} completed"
        
        badge_data = {
            "badge_type": badge_type,
            "badge_name": badge_def["name"],
            "badge_description": badge_def["description"],
            "badge_icon": badge_def["icon"],
            "is_earned": is_earned,
            "progress": progress,
            "current_value": current_value,
            "target_value": target_value,
            "progress_text": progress_text,
            "earned_at": None
        }
        
        # Add earned date if applicable
        if is_earned:
            earned_badge = next((b for b in earned_achievements if b["badge_type"] == badge_type), None)
            if earned_badge:
                badge_data["earned_at"] = earned_badge["earned_at"].isoformat()
        
        all_badges.append(badge_data)
    
    # Sort: earned first (by date desc), then locked by progress desc
    earned_badges = [b for b in all_badges if b["is_earned"]]
    locked_badges = [b for b in all_badges if not b["is_earned"]]
    
    earned_badges.sort(key=lambda x: x["earned_at"], reverse=True)
    locked_badges.sort(key=lambda x: x["progress"], reverse=True)
    
    return {
        "earned_badges": earned_badges,
        "locked_badges": locked_badges,
        "stats": {
            "total_badges": len(BADGE_DEFINITIONS),
            "earned_count": len(earned_badges),
            "locked_count": len(locked_badges),
            "completion_percentage": int((len(earned_badges) / len(BADGE_DEFINITIONS)) * 100)
        }
    }

@router.get("/achievements/featured", response_model=List[Achievement])
async def get_featured_achievements(current_user: User = Depends(get_current_user)):
    """Get featured achievements for the current user"""
    achievements = await db.achievements.find(
        {"user_id": current_user.user_id, "is_featured": True}
    ).sort("earned_at", -1).to_list(100)
    
    return [Achievement(**achievement) for achievement in achievements]

@router.post("/achievements/check")
async def manually_check_achievements(current_user: User = Depends(get_current_user)):
    """Manually trigger achievement checking (for testing/admin purposes)"""
    newly_awarded = await check_and_award_badges(current_user.user_id)
    return {"newly_awarded_badges": newly_awarded}
