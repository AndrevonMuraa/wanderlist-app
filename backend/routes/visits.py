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
from utils.helpers import check_and_award_badges, create_notification, get_rank_for_points, recalculate_user_points


router = APIRouter()

# ============= VISIT ENDPOINTS =============

@router.get("/visits/list")
async def get_visits_list(current_user: User = Depends(get_current_user), limit: int = 100):
    """Lightweight visit list — no photo data. For lists, cards, offline cache."""
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$sort": {"visited_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "_lm",
            "pipeline": [{"$project": {"_id": 0, "name": 1, "country_name": 1}}]
        }},
        {"$addFields": {
            "landmark_name": {"$ifNull": ["$landmark_name", {"$arrayElemAt": ["$_lm.name", 0]}]},
            "country_name": {"$ifNull": ["$country_name", {"$arrayElemAt": ["$_lm.country_name", 0]}]},
            "has_photo": {"$or": [
                {"$gt": [{"$size": {"$ifNull": ["$photos", []]}}, 0]},
                {"$and": [{"$ne": ["$photo_base64", None]}, {"$ne": ["$photo_base64", ""]}]}
            ]},
            "photo_count": {"$size": {"$ifNull": ["$photos", []]}},
            "thumbnail_url": {"$arrayElemAt": [{"$ifNull": ["$photos", []]}, 0]},
            "has_diary": {"$and": [{"$ne": ["$diary_notes", None]}, {"$ne": ["$diary_notes", ""]}]},
            "verified": {"$or": [
                {"$gt": [{"$size": {"$ifNull": ["$photos", []]}}, 0]},
                {"$and": [{"$ne": ["$photo_base64", None]}, {"$ne": ["$photo_base64", ""]}]}
            ]},
        }},
        {"$project": {
            "_id": 0, "_lm": 0,
            "photo_base64": 0, "photos": 0,
            "diary_notes": 0, "comments": 0,
            "visit_location": 0
        }}
    ]
    return await db.visits.aggregate(pipeline).to_list(limit)


@router.get("/visits", response_model=List[Visit])
async def get_visits(current_user: User = Depends(get_current_user), limit: int = 100):
    # Single aggregation: fetch visits + lookup landmark names in one query
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$sort": {"visited_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "_lm",
            "pipeline": [{"$project": {"_id": 0, "name": 1}}]
        }},
        {"$addFields": {
            "landmark_name": {
                "$ifNull": [
                    "$landmark_name",
                    {"$arrayElemAt": ["$_lm.name", 0]}
                ]
            }
        }},
        {"$project": {"_id": 0, "_lm": 0}}
    ]
    visits = await db.visits.aggregate(pipeline).to_list(limit)
    return [Visit(**v) for v in visits]

@router.put("/visits/{visit_id}/privacy")
async def update_visit_privacy(visit_id: str, visibility: str = Body(..., embed=True), current_user: User = Depends(get_current_user)):
    """Change privacy on an existing visit"""
    if visibility not in ["public", "friends", "private"]:
        raise HTTPException(status_code=400, detail="Invalid visibility")
    visit = await db.visits.find_one({"visit_id": visit_id, "user_id": current_user.user_id}, {"_id": 0, "visit_id": 1})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    await db.visits.update_one({"visit_id": visit_id}, {"$set": {"visibility": visibility}})
    # Also update the associated activity
    await db.activities.update_one({"visit_id": visit_id}, {"$set": {"visibility": visibility}})
    return {"message": "Privacy updated", "visibility": visibility}


@router.put("/visits/{visit_id}")
async def update_visit(visit_id: str, body: dict = Body(...), current_user: User = Depends(get_current_user)):
    """Update a landmark visit (photos, diary, share_diary, visibility)"""
    visit = await db.visits.find_one({"visit_id": visit_id, "user_id": current_user.user_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")
    
    update_fields = {}
    
    if "photos" in body:
        update_fields["photos"] = body["photos"][:10]
        update_fields["has_photo"] = len(body["photos"]) > 0
        update_fields["photo_count"] = len(body["photos"][:10])
        update_fields["verified"] = len(body["photos"]) > 0
    
    if "diary_notes" in body:
        update_fields["diary"] = body["diary_notes"]
    
    if "share_diary" in body:
        update_fields["share_diary"] = bool(body["share_diary"])
    
    if "visibility" in body:
        if body["visibility"] in ("public", "friends", "private"):
            update_fields["visibility"] = body["visibility"]
    
    if not update_fields:
        return {"message": "No changes to apply"}
    
    await db.visits.update_one({"visit_id": visit_id}, {"$set": update_fields})
    
    # Recalculate points if photos changed (verified status may have changed)
    if "photos" in update_fields:
        await recalculate_user_points(current_user.user_id)
        await check_and_award_badges(current_user.user_id)
    
    # Sync relevant fields to activities
    activity_update = {}
    if "visibility" in update_fields:
        activity_update["visibility"] = update_fields["visibility"]
    if "photos" in update_fields:
        activity_update["photos"] = update_fields["photos"]
    if "diary" in update_fields:
        activity_update["diary"] = update_fields["diary"]
    if activity_update:
        await db.activities.update_one({"visit_id": visit_id}, {"$set": activity_update})
    
    return {"message": "Visit updated successfully"}


@router.delete("/visits/{visit_id}")
async def delete_visit(visit_id: str, current_user: User = Depends(get_current_user)):
    """Delete a landmark visit and associated data"""
    visit = await db.visits.find_one({"visit_id": visit_id, "user_id": current_user.user_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")
    
    landmark_id = visit.get("landmark_id")
    points_earned = visit.get("points_earned", 0)
    is_verified = visit.get("verified", False)
    
    # Find and delete associated activity + comments + likes BEFORE deleting activity
    activity = await db.activities.find_one({"visit_id": visit_id}, {"_id": 0, "activity_id": 1})
    if activity:
        await db.comments.delete_many({"activity_id": activity["activity_id"]})
        await db.likes.delete_many({"activity_id": activity["activity_id"]})
    
    # Clean up photo upvotes for this visit's photos
    await db.photo_upvotes.delete_many({"visit_id": visit_id})
    
    # Delete the visit and activity
    await db.visits.delete_one({"visit_id": visit_id})
    await db.activities.delete_many({"visit_id": visit_id})
    
    # Full recalculation of user points from actual data (robust, no drift)
    await recalculate_user_points(current_user.user_id)
    
    # Sync rank badges after points change
    await check_and_award_badges(current_user.user_id)
    
    return {"message": "Visit deleted successfully", "points_deducted": points_earned, "landmark_id": landmark_id}


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


@router.get("/visits/check/{landmark_id}")
async def check_landmark_visit_status(landmark_id: str, current_user: User = Depends(get_current_user)):
    """Lightweight check if user has visited a specific landmark. Single indexed query."""
    visit = await db.visits.find_one(
        {"user_id": current_user.user_id, "landmark_id": landmark_id},
        {"_id": 0, "visit_id": 1}
    )
    return {"visited": bool(visit), "visit_id": visit["visit_id"] if visit else None}


@router.get("/visits/{visit_id}")
async def get_visit_details(visit_id: str, current_user: User = Depends(get_current_user)):
    """Get full visit details including photos, diary, and tips"""
    visit = await db.visits.find_one({"visit_id": visit_id}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    is_owner = visit.get("user_id") == current_user.user_id
    
    # Enforce visibility for non-owners
    if not is_owner:
        visibility = visit.get("visibility", "public")
        if visibility == "private":
            raise HTTPException(status_code=404, detail="Visit not found")
        if visibility == "friends":
            are_friends = await db.friends.find_one({
                "$or": [
                    {"user_id": current_user.user_id, "friend_id": visit["user_id"], "status": "accepted"},
                    {"user_id": visit["user_id"], "friend_id": current_user.user_id, "status": "accepted"}
                ]
            })
            if not are_friends:
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
    
    # Get linked activity for comments
    activity = await db.activities.find_one(
        {"visit_id": visit_id},
        {"_id": 0, "activity_id": 1, "comments_count": 1}
    )
    
    result = {
        **visit,
        "landmark_name": landmark.get("name") if landmark else None,
        "country_name": landmark.get("country_name") if landmark else None,
        "landmark_image": landmark.get("image_url") if landmark else None,
        "user_name": user.get("name") if user else None,
        "user_picture": user.get("picture") if user else None,
        "username": user.get("username") if user else None,
        "activity_id": activity.get("activity_id") if activity else None,
        "comments_count": activity.get("comments_count", 0) if activity else 0,
    }
    
    # Strip diary for non-owners when share_diary is False
    if not is_owner and not visit.get("share_diary", True):
        result.pop("diary_notes", None)
        result.pop("diary", None)
    
    return result

@router.post("/visits", response_model=Visit)
async def add_visit(data: VisitCreate, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Prevent duplicate visits to the same landmark
    existing = await db.visits.find_one({
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id
    })
    if existing:
        raise HTTPException(
            status_code=409, 
            detail="You have already visited this landmark. You can add more photos from the visit detail page."
        )
    
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
    
    
    # Determine if visit is verified (has photo proof)
    is_verified = bool(data.photo_base64 or len(photos) > 0)
    
    # Check diary limit for free users
    if data.diary_notes and data.diary_notes.strip():
        user_limits = get_user_limits(current_user)
        diary_limit = user_limits.get("diary_entries_per_month", 999999)
        if diary_limit < 999999:
            now = datetime.now(timezone.utc)
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            diary_count = await db.visits.count_documents({
                "user_id": current_user.user_id,
                "diary_notes": {"$exists": True, "$ne": None, "$ne": ""},
                "created_at": {"$gte": start_of_month}
            })
            if diary_count >= diary_limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Free plan allows {diary_limit} diary entries per month. Upgrade to Pro for unlimited diaries."
                )
    
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
        "share_diary": data.share_diary if data.share_diary is not None else True,
        "status": "accepted",
        "verified": is_verified,
        "visibility": visibility,  # Privacy setting
        "visited_at": data.visited_at if data.visited_at else datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.visits.insert_one(visit)
    
    # Get user's current points BEFORE awarding (for rank-up check)
    user_doc_before = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "points": 1})
    old_points = user_doc_before.get("points", 0) if user_doc_before else 0
    old_rank = get_rank_for_points(old_points)
    
    # Update user document - award points
    # Points are always awarded to personal total
    # Leaderboard points only awarded if visit has photos (verified)
    landmark_points = landmark.get("points", 10)
    has_photos = bool(data.photo_base64 or len(photos) > 0)
    
    update_fields = {}
    
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
            # Award country visit points (same as manual country visit: 50 pts)
            country_bonus_points = 50
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
                        "visibility": visibility,
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
                "visibility": visibility,
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
                        "visibility": visibility,
                        "created_at": datetime.now(timezone.utc),
                        "likes_count": 0,
                        "comments_count": 0
                    }
                    await db.activities.insert_one(continent_completion_activity)
    
    # Check for milestones and create activity if reached
    # Milestones adjusted for 520 total landmarks

    # Return the created visit (exclude MongoDB _id)
    visit.pop("_id", None)
    return visit


@router.get("/points/breakdown")
async def get_points_breakdown(current_user: User = Depends(get_current_user)):
    """Detailed points breakdown with individual items for the Points Summary page."""
    import asyncio
    
    visits_task = db.visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0, "visit_id": 1, "landmark_id": 1, "landmark_name": 1, "country_name": 1, "points_earned": 1, "verified": 1}
    ).sort("visited_at", -1).to_list(10000)
    
    cv_task = db.country_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0, "country_visit_id": 1, "country_id": 1, "country_name": 1, "points_earned": 1, "source": 1, "photos": 1}
    ).sort("visited_at", -1).to_list(1000)
    
    visits, country_visits = await asyncio.gather(visits_task, cv_task)
    
    landmarks = []
    for v in visits:
        landmarks.append({
            "visit_id": v.get("visit_id"),
            "name": v.get("landmark_name", "Unknown"),
            "country": v.get("country_name", ""),
            "points": v.get("points_earned", 0),
            "verified": v.get("verified", False),
        })
    
    countries = []
    for cv in country_visits:
        has_photos = len(cv.get("photos", []) or []) > 0
        countries.append({
            "country_visit_id": cv.get("country_visit_id"),
            "name": cv.get("country_name", "Unknown"),
            "points": cv.get("points_earned", 0),
            "source": cv.get("source", "manual"),
            "verified": has_photos,
        })
    
    # Calculate continent bonuses from visited countries
    # Look up actual country_ids from landmarks collection (don't parse from landmark_id string)
    landmark_ids = [v.get("landmark_id") for v in visits if v.get("landmark_id")]
    landmark_country_map = {}
    if landmark_ids:
        lm_docs = await db.landmarks.find(
            {"landmark_id": {"$in": landmark_ids}},
            {"_id": 0, "landmark_id": 1, "country_id": 1}
        ).to_list(10000)
        landmark_country_map = {doc["landmark_id"]: doc["country_id"] for doc in lm_docs}
    
    country_ids_from_landmarks = set()
    verified_country_ids = set()
    for v in visits:
        cid = landmark_country_map.get(v.get("landmark_id"))
        if cid:
            country_ids_from_landmarks.add(cid)
            if v.get("verified", False):
                verified_country_ids.add(cid)
    
    # Also track verified country_visits (have photos)
    verified_cv_country_ids = set(
        cv.get("country_id") for cv in country_visits
        if cv.get("country_id") and len(cv.get("photos", []) or []) > 0
    )
    
    country_ids_from_cv = set(cv.get("country_id", "") for cv in country_visits if cv.get("country_id"))
    all_country_ids = country_ids_from_landmarks | country_ids_from_cv
    all_verified_country_ids = verified_country_ids | verified_cv_country_ids
    
    # Map continents and track if any country in that continent has a verified visit
    continents_visited = {}
    if all_country_ids:
        country_docs = await db.countries.find(
            {"country_id": {"$in": list(all_country_ids)}},
            {"_id": 0, "country_id": 1, "continent": 1}
        ).to_list(200)
        for doc in country_docs:
            cont = doc["continent"]
            has_verified = doc["country_id"] in all_verified_country_ids
            if cont not in continents_visited:
                continents_visited[cont] = has_verified
            elif has_verified:
                continents_visited[cont] = True
    
    continent_bonuses = [
        {"continent": c, "points": 50, "verified": v}
        for c, v in sorted(continents_visited.items())
    ]
    
    lm_total = sum(l["points"] for l in landmarks)
    lm_verified = sum(l["points"] for l in landmarks if l["verified"])
    cv_total = sum(c["points"] for c in countries)
    cv_verified = sum(c["points"] for c in countries if c["verified"])
    cont_total = len(continent_bonuses) * 50
    cont_verified = sum(50 for b in continent_bonuses if b["verified"])
    
    return {
        "landmarks": landmarks,
        "country_visits": countries,
        "continent_bonuses": continent_bonuses,
        "summary": {
            "landmark_total": lm_total,
            "landmark_verified": lm_verified,
            "country_total": cv_total,
            "country_verified": cv_verified,
            "continent_total": cont_total,
            "continent_verified": cont_verified,
            "grand_total": lm_total + cv_total + cont_total,
        }
    }

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
            "visibility": visibility,
            "created_at": datetime.now(timezone.utc),
            "likes_count": 0,
            "comments_count": 0
        }
        await db.activities.insert_one(milestone_activity)
    
    # Check and award badges
    newly_awarded_badges = await check_and_award_badges(current_user.user_id)
    
    # Check for rank-up notification
    user_doc_after = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "points": 1})
    new_points = user_doc_after.get("points", 0) if user_doc_after else 0
    new_rank = get_rank_for_points(new_points)
    
    ranked_up = new_rank != old_rank
    if ranked_up:
        await create_notification(
            user_id=current_user.user_id,
            notif_type="rank_up",
            title="Rank Up!",
            message=f"Congratulations! You've reached the rank of {new_rank}!",
        )
    
    # Create visit response with completion flags
    visit_response = Visit(**visit)
    visit_dict = visit_response.dict()
    visit_dict["ranked_up"] = ranked_up
    if ranked_up:
        visit_dict["new_rank"] = new_rank
    visit_dict["country_completed"] = country_completed
    visit_dict["continent_completed"] = continent_completed
    if country_completed:
        visit_dict["completed_country_name"] = completed_country_name
    if continent_completed:
        visit_dict["completed_continent"] = completed_continent
    
    return visit_dict

# ============= ADMIN ENDPOINTS =============

