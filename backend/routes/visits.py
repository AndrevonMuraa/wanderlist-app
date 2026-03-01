from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, is_user_pro, get_user_limits
from models.all import User, Visit, VisitCreate
from utils.helpers import check_and_award_badges


router = APIRouter()

# ============= VISIT ENDPOINTS =============

@router.get("/visits", response_model=List[Visit])
async def get_visits(current_user: User = Depends(get_current_user)):
    visits = await db.visits.find({"user_id": current_user.user_id}, {"_id": 0}).sort("visited_at", -1).to_list(1000)
    return [Visit(**v) for v in visits]

@router.get("/visits/stats")
async def get_visit_stats(current_user: User = Depends(get_current_user)):
    """Get visit statistics including monthly count for free users"""
    # Get start of current month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Count visits this month
    monthly_count = await db.visits.count_documents({
        "user_id": current_user.user_id,
        "visited_at": {"$gte": start_of_month}
    })
    
    # Total visits all time
    total_count = await db.visits.count_documents({"user_id": current_user.user_id})
    
    # Get limit based on tier
    limit = 10 if current_user.subscription_tier == "free" else None
    
    return {
        "monthly_visits": monthly_count,
        "total_visits": total_count,
        "monthly_limit": limit,
        "tier": current_user.subscription_tier
    }


@router.get("/visits/{visit_id}")
async def get_visit_details(visit_id: str, current_user: User = Depends(get_current_user)):
    """Get full visit details including photos, diary, and tips"""
    visit = await db.visits.find_one({"visit_id": visit_id}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Get landmark details
    landmark = await db.landmarks.find_one(
        {"landmark_id": visit["landmark_id"]}, 
        {"_id": 0, "name": 1, "country_name": 1, "image_url": 1}
    )
    
    # Get user details
    user = await db.users.find_one(
        {"user_id": visit["user_id"]},
        {"_id": 0, "name": 1, "picture": 1, "username": 1}
    )
    
    return {
        **visit,
        "landmark_name": landmark.get("name") if landmark else None,
        "country_name": landmark.get("country_name") if landmark else None,
        "landmark_image": landmark.get("image_url") if landmark else None,
        "user_name": user.get("name") if user else None,
        "user_picture": user.get("picture") if user else None,
        "username": user.get("username") if user else None
    }

@router.post("/visits", response_model=Visit)
async def add_visit(data: VisitCreate, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Check if landmark is premium and user has access
    if landmark.get("category") == "premium" and not is_user_pro(current_user):
        raise HTTPException(
            status_code=403, 
            detail="WanderMark Pro required to visit premium landmarks. Upgrade to unlock 150+ premium landmarks!"
        )
    
    # Get user limits based on subscription
    limits = get_user_limits(current_user)
    max_photos = limits["photos_per_visit"]
    
    # Validate photo limit based on subscription tier
    photos = data.photos or []
    if len(photos) > max_photos:
        if max_photos == 1:
            raise HTTPException(
                status_code=403, 
                detail="Free users can add 1 photo per visit. Upgrade to WanderMark Pro for up to 10 photos!"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Maximum {max_photos} photos allowed per visit")
    
    # Validate travel tips limit (max 5 tips)
    travel_tips = data.travel_tips or []
    if len(travel_tips) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 travel tips allowed per visit")
    
    # Determine if visit is verified (has photo proof)
    is_verified = bool(data.photo_base64 or len(photos) > 0)
    
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    
    # Determine privacy setting (use provided or user's default)
    visibility = data.visibility or current_user.default_privacy or "public"
    
    visit = {
        "visit_id": visit_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "landmark_name": landmark.get("name"),  # Store landmark name for quick access
        "country_name": landmark.get("country_name"),  # Store country name
        "photo_base64": data.photo_base64,
        "photos": photos,
        "points_earned": landmark.get("points", 10),
        "comments": data.comments,
        "visit_location": data.visit_location,
        "diary_notes": data.diary_notes,
        "travel_tips": travel_tips,
        "share_diary": data.share_diary if data.share_diary is not None else True,
        "status": "accepted",
        "verified": is_verified,
        "visibility": visibility,  # Privacy setting
        "visited_at": data.visited_at if data.visited_at else datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.visits.insert_one(visit)
    
    # Update user streak
    from datetime import date
    today = date.today().isoformat()  # YYYY-MM-DD format
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id})
    last_visit_date = user_doc.get("last_visit_date")
    current_streak = user_doc.get("current_streak", 0)
    longest_streak = user_doc.get("longest_streak", 0)
    
    streak_continued = False
    streak_milestone_reached = False
    new_milestone = 0
    
    if last_visit_date:
        from datetime import datetime as dt, timedelta
        last_date_obj = dt.fromisoformat(last_visit_date).date()
        today_obj = dt.fromisoformat(today).date()
        days_diff = (today_obj - last_date_obj).days
        
        if days_diff == 0:
            # Same day visit - don't change streak
            pass
        elif days_diff == 1:
            # Consecutive day - increment streak
            current_streak += 1
            streak_continued = True
        else:
            # Streak broken - reset to 1
            current_streak = 1
    else:
        # First ever visit
        current_streak = 1
    
    # Update longest streak if current exceeds it
    if current_streak > longest_streak:
        longest_streak = current_streak
    
    # Check for streak milestones (7, 30, 100 days)
    streak_milestones = [7, 30, 100]
    if streak_continued and current_streak in streak_milestones:
        streak_milestone_reached = True
        new_milestone = current_streak
    
    # Update user document with new streak data AND award points
    # Points are always awarded to personal total
    # Leaderboard points only awarded if visit has photos (verified)
    landmark_points = landmark.get("points", 10)
    has_photos = bool(data.photo_base64 or len(photos) > 0)
    
    update_fields = {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_visit_date": today
    }
    
    # Always increment personal points
    increment_fields = {"points": landmark_points}
    
    # Only increment leaderboard_points if visit has photos
    if has_photos:
        increment_fields["leaderboard_points"] = landmark_points
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": update_fields,
            "$inc": increment_fields
        }
    )
    
    # Create rich activity for social feed (includes diary, tips, photos)
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "visit",
        "landmark_id": data.landmark_id,
        "landmark_name": landmark.get("name"),
        "landmark_image": landmark.get("image_url"),
        "country_name": landmark.get("country_name"),
        "points_earned": landmark.get("points", 10),
        "visit_id": visit_id,  # Link to full visit details
        "has_diary": bool(data.diary_notes),
        "has_tips": len(travel_tips) > 0,
        "has_photos": len(photos) > 0,
        "photo_count": len(photos),
        "visibility": data.visibility or current_user.default_privacy or "public",  # Privacy setting
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    
    await db.activities.insert_one(activity)
    

    # AUTO-REWARD: Award country points on first landmark visit
    country_id = landmark.get("country_id")
    if country_id:
        # Check if this is first visit to this country
        country_visit_count = await db.visits.count_documents({
            "user_id": current_user.user_id,
            "landmark_id": {"$regex": f"^{country_id}_"}
        })
        
        if country_visit_count == 1:  # First landmark in this country
            # Award country exploration bonus
            country_bonus_points = 20
            # Country bonus: only award leaderboard points if visit has photos
            bonus_increment = {"points": country_bonus_points}
            if has_photos:
                bonus_increment["leaderboard_points"] = country_bonus_points
            
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": bonus_increment}
            )
            
            # AUTO-CREATE country visit record (if doesn't exist)
            existing_country_visit = await db.country_visits.find_one({
                "user_id": current_user.user_id,
                "country_id": country_id
            })
            
            if not existing_country_visit:
                country_doc = await db.countries.find_one({"country_id": country_id})
                if country_doc:
                    auto_country_visit_id = f"cv_{uuid.uuid4().hex[:12]}"
                    auto_country_visit = {
                        "country_visit_id": auto_country_visit_id,
                        "user_id": current_user.user_id,
                        "user_name": current_user.name,
                        "user_picture": current_user.picture,
                        "country_id": country_id,
                        "country_name": country_doc.get("name", "Unknown"),
                        "continent": country_doc.get("continent", "Unknown"),
                        "photos": [],  # Auto-visits start empty — user adds photos via country page
                        "diary": None,
                        "visibility": "public",
                        "visited_at": datetime.now(timezone.utc),
                        "points_earned": country_bonus_points,
                        "leaderboard_points_earned": 0,  # No leaderboard points until user adds photos
                        "has_photos": False,
                        "source": "auto_landmark",
                        "first_landmark_id": data.landmark_id,
                        "first_landmark_name": landmark.get("name"),
                        "created_at": datetime.now(timezone.utc)
                    }
                    await db.country_visits.insert_one(auto_country_visit)
            
            # Check continent for auto-reward
            country_doc = await db.countries.find_one({"country_id": country_id})
            if country_doc:
                continent = country_doc.get("continent")
                # Check if this is first country in this continent
                continent_country_count = await db.countries.count_documents({
                    "continent": continent
                })
                user_continent_visits = 0
                continent_countries = await db.countries.find({"continent": continent}).to_list(1000)
                for cont_country in continent_countries:
                    count = await db.visits.count_documents({
                        "user_id": current_user.user_id,
                        "landmark_id": {"$regex": f"^{cont_country['country_id']}_"}
                    })
                    if count > 0:
                        user_continent_visits += 1
                
                if user_continent_visits == 1:  # First country in this continent
                    continent_bonus_points = 50
                    continent_bonus_increment = {"points": continent_bonus_points}
                    if has_photos:
                        continent_bonus_increment["leaderboard_points"] = continent_bonus_points
                    await db.users.update_one(
                        {"user_id": current_user.user_id},
                        {"$inc": continent_bonus_increment}
                    )

    # Track completion bonuses
    country_completed = False
    continent_completed = False
    completed_country_name = None
    completed_continent = None
    
    # Check for country completion bonus
    country_id = landmark.get("country_id")
    if country_id:
        # Get total landmarks in this country
        total_landmarks_in_country = await db.landmarks.count_documents({"country_id": country_id})
        # Get user's visits in this country
        user_visits_in_country = await db.visits.count_documents({
            "user_id": current_user.user_id,
            "landmark_id": {"$in": [
                lm["landmark_id"] for lm in await db.landmarks.find({"country_id": country_id}).to_list(1000)
            ]}
        })
        
        # If user just completed the country
        if user_visits_in_country == total_landmarks_in_country:
            country_completion_bonus = 50  # Bonus points for completing a country
            country_completed = True
            completed_country_name = landmark.get("country_name")
            
            # Award bonus points to user (leaderboard_points only if visit has photos)
            completion_increment = {"points": country_completion_bonus}
            if has_photos:
                completion_increment["leaderboard_points"] = country_completion_bonus
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": completion_increment}
            )
            
            # Create country completion activity
            country_completion_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
            country_completion_activity = {
                "activity_id": country_completion_activity_id,
                "user_id": current_user.user_id,
                "user_name": current_user.name,
                "user_picture": current_user.picture,
                "activity_type": "country_complete",
                "country_id": country_id,
                "country_name": landmark.get("country_name"),
                "continent": landmark.get("continent"),
                "points_earned": country_completion_bonus,
                "landmarks_count": total_landmarks_in_country,
                "created_at": datetime.now(timezone.utc),
                "likes_count": 0,
                "comments_count": 0
            }
            await db.activities.insert_one(country_completion_activity)
            
            # Check for continent completion bonus
            continent = landmark.get("continent")
            if continent:
                # Get all countries in this continent
                countries_in_continent = await db.countries.find({"continent": continent}).to_list(1000)
                country_ids_in_continent = [c["country_id"] for c in countries_in_continent]
                
                # Check if user completed all countries in this continent
                completed_countries = 0
                for cid in country_ids_in_continent:
                    total_landmarks = await db.landmarks.count_documents({"country_id": cid})
                    user_visits = await db.visits.count_documents({
                        "user_id": current_user.user_id,
                        "landmark_id": {"$in": [
                            lm["landmark_id"] for lm in await db.landmarks.find({"country_id": cid}).to_list(1000)
                        ]}
                    })
                    if user_visits == total_landmarks:
                        completed_countries += 1
                
                # If user just completed the continent
                if completed_countries == len(country_ids_in_continent):
                    continent_completion_bonus = 200  # Bonus points for completing a continent
                    continent_completed = True
                    completed_continent = continent
                    
                    # Award bonus points to user (leaderboard_points only if visit has photos)
                    cont_completion_increment = {"points": continent_completion_bonus}
                    if has_photos:
                        cont_completion_increment["leaderboard_points"] = continent_completion_bonus
                    await db.users.update_one(
                        {"user_id": current_user.user_id},
                        {"$inc": cont_completion_increment}
                    )
                    
                    # Create continent completion activity
                    continent_completion_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
                    continent_completion_activity = {
                        "activity_id": continent_completion_activity_id,
                        "user_id": current_user.user_id,
                        "user_name": current_user.name,
                        "user_picture": current_user.picture,
                        "activity_type": "continent_complete",
                        "continent": continent,
                        "points_earned": continent_completion_bonus,
                        "countries_count": len(country_ids_in_continent),
                        "created_at": datetime.now(timezone.utc),
                        "likes_count": 0,
                        "comments_count": 0
                    }
                    await db.activities.insert_one(continent_completion_activity)
    
    # Check for milestones and create activity if reached
    # Milestones adjusted for 520 total landmarks
    visit_count = await db.visits.count_documents({"user_id": current_user.user_id})
    if visit_count in [10, 25, 50, 100, 200, 350, 500]:
        milestone_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
        milestone_activity = {
            "activity_id": milestone_activity_id,
            "user_id": current_user.user_id,
            "user_name": current_user.name,
            "user_picture": current_user.picture,
            "activity_type": "milestone",
            "milestone_count": visit_count,
            "created_at": datetime.now(timezone.utc),
            "likes_count": 0,
            "comments_count": 0
        }
        await db.activities.insert_one(milestone_activity)
    
    # Check and award badges
    newly_awarded_badges = await check_and_award_badges(current_user.user_id)
    
    # Create visit response with badge info and completion flags
    visit_response = Visit(**visit)
    visit_dict = visit_response.dict()
    visit_dict["newly_awarded_badges"] = newly_awarded_badges
    visit_dict["country_completed"] = country_completed
    visit_dict["continent_completed"] = continent_completed
    visit_dict["current_streak"] = current_streak
    visit_dict["streak_milestone_reached"] = streak_milestone_reached
    visit_dict["new_milestone"] = new_milestone if streak_milestone_reached else 0
    if country_completed:
        visit_dict["completed_country_name"] = completed_country_name
    if continent_completed:
        visit_dict["completed_continent"] = completed_continent
    
    return visit_dict

# ============= ADMIN ENDPOINTS =============

