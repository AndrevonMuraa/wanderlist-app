from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
import os
import uuid
from datetime import datetime, timezone

from utils.db import db
from utils.auth import get_current_user, is_user_pro, get_user_limits
from utils.helpers import check_and_award_badges, recalculate_user_points
from models.all import User, CountryVisitCreate, UserCreatedVisitCreate


router = APIRouter()

# ============= COUNTRY VISIT ENDPOINTS =============

@router.post("/country-visits")
async def create_country_visit(data: CountryVisitCreate, current_user: User = Depends(get_current_user)):
    """Create a country visit with photo collage and diary.
    
    Users can mark a country as visited without having visited any landmarks.
    If a country was already auto-marked via landmark visits, this upgrades it with photos/diary.
    
    Points Logic:
    - Personal points (points): Always awarded for visits
    - Leaderboard points (leaderboard_points): Only awarded when photos are included
    """
    
    # Get user limits based on subscription
    limits = get_user_limits(current_user)
    max_photos = limits["photos_per_visit"]
    
    # Validate photos based on subscription tier
    if len(data.photos) > max_photos:
        if max_photos == 1:
            raise HTTPException(
                status_code=403, 
                detail="Free users can add 1 photo per country visit. Upgrade to WanderMark Pro for up to 10 photos!"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Maximum {max_photos} photos allowed")
    
    has_photos = len(data.photos) > 0
    
    # Look up country details from database
    country = await db.countries.find_one({"country_id": data.country_id}, {"_id": 0})
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    country_name = country.get("name", "Unknown")
    continent = country.get("continent", "Unknown")
    
    # Check if country visit already exists (either manual or auto from landmark)
    existing_visit = await db.country_visits.find_one({
        "user_id": current_user.user_id,
        "country_id": data.country_id
    })
    
    # Parse visit date
    visited_at = datetime.now(timezone.utc)
    if data.visited_at:
        try:
            visited_at = datetime.fromisoformat(data.visited_at.replace('Z', '+00:00'))
        except:
            pass
    
    # Determine visibility (use provided or user's default)
    visibility = data.visibility or current_user.default_privacy or "public"
    
    if existing_visit:
        # Upgrade existing visit with new photos/diary
        # If adding photos for the first time, also award leaderboard points
        existing_has_photos = bool(existing_visit.get("photos", []))
        leaderboard_points_to_add = 0
        
        # If upgrading from no photos to having photos, award leaderboard points
        if has_photos and not existing_has_photos:
            leaderboard_points_to_add = existing_visit.get("points_earned", 50)
        
        await db.country_visits.update_one(
            {"country_visit_id": existing_visit["country_visit_id"]},
            {"$set": {
                "photos": data.photos,
                "diary": data.diary_notes,
                "share_diary": getattr(data, 'share_diary', True),
                "visibility": visibility,
                "source": "manual",
                "has_photos": has_photos,
                "leaderboard_points_earned": existing_visit.get("points_earned", 50) if has_photos else 0,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # If adding photos for first time, recalculate points
        if leaderboard_points_to_add > 0:
            await recalculate_user_points(current_user.user_id)
            await check_and_award_badges(current_user.user_id)
        
        # Update activity if exists
        await db.activities.update_one(
            {"country_visit_id": existing_visit["country_visit_id"]},
            {"$set": {
                "photos": data.photos,
                "diary": data.diary_notes,
                "visibility": visibility,
                "has_photos": has_photos,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "message": "Country visit updated" + (" with photos - leaderboard points earned!" if leaderboard_points_to_add > 0 else ""),
            "country_visit_id": existing_visit["country_visit_id"],
            "points_earned": 0,
            "leaderboard_points_earned": leaderboard_points_to_add,
            "was_upgrade": True,
            "has_photos": has_photos
        }
    
    # Award 50 points for new country visit
    points_earned = 50
    leaderboard_points_earned = 50 if has_photos else 0
    
    # Create country visit
    country_visit_id = f"cv_{uuid.uuid4().hex[:12]}"
    country_visit = {
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "country_id": data.country_id,
        "country_name": country_name,
        "continent": continent,
        "photos": data.photos,
        "diary": data.diary_notes,
        "share_diary": getattr(data, 'share_diary', True),
        "visibility": visibility,
        "visited_at": visited_at,
        "points_earned": points_earned,
        "leaderboard_points_earned": leaderboard_points_earned,
        "has_photos": has_photos,
        "source": "manual",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.country_visits.insert_one(country_visit)
    
    # Award points to user
    # Personal points: always awarded
    # Leaderboard points: only if has photos
    increment_fields = {"points": points_earned}
    if has_photos:
        increment_fields["leaderboard_points"] = leaderboard_points_earned
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": increment_fields}
    )
    
    # Create activity for feed
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "country_visit",
        "country_visit_id": country_visit_id,
        "country_id": data.country_id,
        "country_name": country_name,
        "continent": continent,
        "photos": data.photos,
        "diary": data.diary_notes,
        "visibility": visibility,
        "points_earned": points_earned,
        "has_photos": has_photos,
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    # Check for continent bonus (first country visited in this continent)
    if continent:
        continent_countries = await db.countries.find({"continent": continent}).to_list(1000)
        user_continent_visits = 0
        for cont_country in continent_countries:
            cid = cont_country['country_id']
            lm_count = await db.visits.count_documents({
                "user_id": current_user.user_id,
                "landmark_id": {"$regex": f"^{cid}_"}
            })
            cv_count = await db.country_visits.count_documents({
                "user_id": current_user.user_id,
                "country_id": cid
            })
            if lm_count > 0 or cv_count > 0:
                user_continent_visits += 1
        
        if user_continent_visits == 1:  # First country in this continent
            continent_bonus_points = 50
            # Verified if this visit has photos
            continent_bonus_increment = {"points": continent_bonus_points}
            if has_photos:
                continent_bonus_increment["leaderboard_points"] = continent_bonus_points
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": continent_bonus_increment}
            )
    
    # Build response message
    if has_photos:
        message = "Country visit recorded with photos! Points added to leaderboard."
    else:
        message = "Country visit recorded! Add photos to earn leaderboard points 📸"
    
    return {
        "message": message,
        "country_visit_id": country_visit_id,
        "points_earned": points_earned,
        "leaderboard_points_earned": leaderboard_points_earned,
        "has_photos": has_photos
    }

@router.get("/country-visits")
async def get_country_visits(current_user: User = Depends(get_current_user)):
    """Get user's country visits"""
    country_visits = await db.country_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return country_visits

@router.get("/country-visits/{country_visit_id}")
async def get_country_visit_details(country_visit_id: str, current_user: User = Depends(get_current_user)):
    """Get country visit details with privacy enforcement"""
    country_visit = await db.country_visits.find_one(
        {"country_visit_id": country_visit_id},
        {"_id": 0}
    )
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    is_owner = country_visit.get("user_id") == current_user.user_id
    
    # Enforce visibility for non-owners
    if not is_owner:
        visibility = country_visit.get("visibility", "public")
        if visibility == "private":
            raise HTTPException(status_code=404, detail="Country visit not found")
        if visibility == "friends":
            are_friends = await db.friends.find_one({
                "$or": [
                    {"user_id": current_user.user_id, "friend_id": country_visit["user_id"], "status": "accepted"},
                    {"user_id": country_visit["user_id"], "friend_id": current_user.user_id, "status": "accepted"}
                ]
            })
            if not are_friends:
                raise HTTPException(status_code=404, detail="Country visit not found")
    
    result = {**country_visit}
    
    # Strip diary for non-owners when share_diary is False
    if not is_owner and not country_visit.get("share_diary", True):
        result.pop("diary", None)
        result.pop("diary_notes", None)
    
    return result

@router.delete("/country-visits/{country_visit_id}")
async def delete_country_visit(country_visit_id: str, current_user: User = Depends(get_current_user)):
    """Delete a country visit"""
    # Verify ownership
    country_visit = await db.country_visits.find_one({
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id
    })
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    # Block deletion if user has landmark visits in this country
    country_id = country_visit.get("country_id")
    if country_id:
        landmark_visits_in_country = await db.visits.count_documents({
            "user_id": current_user.user_id,
            "landmark_id": {"$regex": f"^{country_id}_"}
        })
        if landmark_visits_in_country > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot remove country visit — you have {landmark_visits_in_country} landmark visit(s) in this country. Remove those first."
            )
    
    # Delete country visit
    await db.country_visits.delete_one({"country_visit_id": country_visit_id})
    
    # Delete associated activity
    activity = await db.activities.find_one({"country_visit_id": country_visit_id}, {"_id": 0, "activity_id": 1})
    if activity:
        await db.likes.delete_many({"activity_id": activity["activity_id"]})
        await db.comments.delete_many({"activity_id": activity["activity_id"]})
    await db.activities.delete_many({"country_visit_id": country_visit_id})
    
    # Full recalculation of user points from actual data (robust, no drift)
    await recalculate_user_points(current_user.user_id)
    
    # Sync rank badges after points change
    await check_and_award_badges(current_user.user_id)
    
    return {"message": "Country visit deleted"}

@router.put("/country-visits/{country_visit_id}")
async def update_country_visit(country_visit_id: str, data: dict, current_user: User = Depends(get_current_user)):
    """Update a country visit (diary, photos, visibility)"""
    # Verify ownership
    country_visit = await db.country_visits.find_one({
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id
    })
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    # Build update fields
    update_fields = {}
    if "diary" in data:
        update_fields["diary"] = data["diary"]
    if "visibility" in data and data["visibility"] in ["public", "friends", "private"]:
        update_fields["visibility"] = data["visibility"]
    if "photos" in data:
        # Validate photo limits
        limits = get_user_limits(current_user)
        max_photos = limits["photos_per_visit"]
        new_photos = data["photos"]
        if len(new_photos) > max_photos:
            raise HTTPException(status_code=403, detail=f"Maximum {max_photos} photos allowed for your plan")
        update_fields["photos"] = new_photos
        has_photos = len(new_photos) > 0
        update_fields["has_photos"] = has_photos
        
        # Handle leaderboard points changes when photos change
        existing_has_photos = bool(country_visit.get("photos", []))
        points_earned = country_visit.get("points_earned", 50)
        
        if has_photos and not existing_has_photos:
            # Adding photos for the first time - award leaderboard points
            update_fields["leaderboard_points_earned"] = points_earned
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": {"leaderboard_points": points_earned}}
            )
        elif not has_photos and existing_has_photos:
            # Removing all photos - revoke leaderboard points
            old_lb_points = country_visit.get("leaderboard_points_earned", 0)
            update_fields["leaderboard_points_earned"] = 0
            if old_lb_points > 0:
                await db.users.update_one(
                    {"user_id": current_user.user_id},
                    {"$inc": {"leaderboard_points": -old_lb_points}}
                )
    if "share_diary" in data:
        update_fields["share_diary"] = bool(data["share_diary"])
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    # Update country visit
    await db.country_visits.update_one(
        {"country_visit_id": country_visit_id},
        {"$set": update_fields}
    )
    
    # Also update the associated activity if diary changed
    if "diary" in update_fields:
        await db.activities.update_many(
            {"country_visit_id": country_visit_id},
            {"$set": {"diary": update_fields["diary"]}}
        )
    if "visibility" in update_fields:
        await db.activities.update_many(
            {"country_visit_id": country_visit_id},
            {"$set": {"visibility": update_fields["visibility"]}}
        )
    
    # Return updated visit
    updated_visit = await db.country_visits.find_one(
        {"country_visit_id": country_visit_id},
        {"_id": 0}
    )
    return updated_visit

@router.get("/country-visits/check/{country_id}")
async def check_country_visit_status(country_id: str, current_user: User = Depends(get_current_user)):
    """
    Check if a country has been visited by the user.
    Returns visit status based on:
    1. Explicit country visit record exists, OR
    2. At least one landmark in the country has been visited
    """
    # First, check for explicit country visit record
    country_visit = await db.country_visits.find_one(
        {"user_id": current_user.user_id, "country_id": country_id},
        {"_id": 0}
    )
    
    if country_visit:
        return {
            "visited": True,
            "source": country_visit.get("source", "manual"),
            "country_visit_id": country_visit.get("country_visit_id"),
            "visited_at": country_visit.get("visited_at"),
            "has_photos": bool(country_visit.get("photos", [])),
            "has_diary": bool(country_visit.get("diary"))
        }
    
    # Check if any landmarks in this country have been visited
    # Get all landmarks for this country
    country_landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"landmark_id": 1}
    ).to_list(1000)
    
    landmark_ids = [lm["landmark_id"] for lm in country_landmarks]
    
    if landmark_ids:
        # Check if user has visited any of these landmarks
        landmark_visit = await db.visits.find_one({
            "user_id": current_user.user_id,
            "landmark_id": {"$in": landmark_ids}
        })
        
        if landmark_visit:
            return {
                "visited": True,
                "source": "landmark_visits",
                "country_visit_id": None,
                "visited_at": landmark_visit.get("visited_at"),
                "has_photos": False,
                "has_diary": False
            }
    
    return {
        "visited": False,
        "source": None,
        "country_visit_id": None,
        "visited_at": None,
        "has_photos": False,
        "has_diary": False
    }


@router.get("/country-visits/{country_visit_id}/landmarks")
async def get_country_visit_landmarks(country_visit_id: str, current_user: User = Depends(get_current_user)):
    """
    Get all visited landmarks for a specific country visit.
    """
    # Get the country visit
    country_visit = await db.country_visits.find_one(
        {"country_visit_id": country_visit_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not country_visit:
        return {"landmarks": []}
    
    country_id = country_visit.get("country_id")
    if not country_id:
        return {"landmarks": []}
    
    # Get all landmarks for this country
    country_landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(1000)
    
    if not country_landmarks:
        return {"landmarks": []}
    
    landmark_ids = [lm["landmark_id"] for lm in country_landmarks]
    landmark_name_map = {lm["landmark_id"]: lm["name"] for lm in country_landmarks}
    
    # Get user's visits for these landmarks
    visited_landmarks = await db.visits.find(
        {"user_id": current_user.user_id, "landmark_id": {"$in": landmark_ids}},
        {"_id": 0, "visit_id": 1, "landmark_id": 1, "landmark_name": 1, "visited_at": 1, "points_earned": 1}
    ).to_list(1000)
    
    results = []
    for v in visited_landmarks:
        results.append({
            "visit_id": v.get("visit_id"),
            "landmark_id": v.get("landmark_id"),
            "landmark_name": v.get("landmark_name") or landmark_name_map.get(v.get("landmark_id"), "Unknown"),
            "visited_at": str(v.get("visited_at", "")),
            "points_earned": v.get("points_earned", 0),
        })
    
    return {"landmarks": results}


@router.post("/country-visits/migrate-photos")
async def migrate_country_visit_photos(current_user: User = Depends(get_current_user)):
    """
    Migration endpoint: Clear photos from auto-created country visits
    that were copied from landmark visits before the fix.
    Only affects the current user's visits.
    """
    result = await db.country_visits.update_many(
        {
            "user_id": current_user.user_id,
            "source": "auto_landmark",
            "photos": {"$ne": []}
        },
        {"$set": {"photos": [], "has_photos": False, "leaderboard_points_earned": 0}}
    )
    
    return {
        "message": f"Cleaned {result.modified_count} auto-created country visits",
        "modified_count": result.modified_count
    }

# ============= END COUNTRY VISIT ENDPOINTS =============

# ============= USER CREATED VISIT ENDPOINTS =============

@router.post("/user-created-visits")
async def create_user_created_visit(data: UserCreatedVisitCreate, current_user: User = Depends(get_current_user)):
    """
    Create a user-created visit for countries/landmarks not in the app database.
    No points are awarded for user-created visits.
    
    REQUIRES: WanderMark Pro subscription
    
    Landmarks can now have individual photos:
    - landmarks: List of {name: str, photo: Optional[str]} (max 10 landmarks)
    - photos: General country photos (max 10)
    - Total photos: max 20 (10 country + 10 landmark photos)
    """
    
    # Check if user has Pro subscription
    if not is_user_pro(current_user):
        raise HTTPException(
            status_code=403,
            detail="Custom visits require WanderMark Pro. Upgrade to record visits to places not in our database!"
        )
    
    # Validate country name
    if not data.country_name or len(data.country_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Country name is required (at least 2 characters)")
    
    # Try to match country_name to a DB country for linking
    matched_country = await db.countries.find_one(
        {"name": {"$regex": f"^{data.country_name.strip()}$", "$options": "i"}},
        {"_id": 0, "country_id": 1, "name": 1, "continent": 1}
    )
    
    # Validate general photos (max 10)
    if len(data.photos) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 general photos allowed")
    
    # Process and validate landmarks (max 10)
    # Each landmark is a dict with 'name' (required) and 'photo' (optional)
    processed_landmarks = []
    for lm in data.landmarks[:10]:  # Max 10 landmarks
        if isinstance(lm, dict):
            name = lm.get('name', '').strip() if lm.get('name') else ''
            if name:  # Only include landmarks with valid names
                processed_landmarks.append({
                    'name': name,
                    'photo': lm.get('photo')  # Can be None or base64 string
                })
        elif isinstance(lm, str) and lm.strip():
            # Backward compatibility: if just a string, convert to dict
            processed_landmarks.append({
                'name': lm.strip(),
                'photo': None
            })
    
    # Count total photos for validation
    landmark_photos_count = sum(1 for lm in processed_landmarks if lm.get('photo'))
    total_photos = len(data.photos) + landmark_photos_count
    if total_photos > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 total photos allowed (10 country + 10 landmark)")
    
    # Parse visit date
    visited_at = datetime.now(timezone.utc)
    if data.visited_at:
        try:
            visited_at = datetime.fromisoformat(data.visited_at.replace('Z', '+00:00'))
        except:
            pass
    
    # Determine visibility
    visibility = data.visibility or "public"
    
    # Create user created visit
    user_created_visit_id = f"ucv_{uuid.uuid4().hex[:12]}"
    user_created_visit = {
        "user_created_visit_id": user_created_visit_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "country_name": matched_country["name"] if matched_country else data.country_name.strip(),
        "country_id": matched_country["country_id"] if matched_country else None,
        "continent": matched_country["continent"] if matched_country else None,
        "matched_country": bool(matched_country),
        "landmarks": processed_landmarks,
        "photos": data.photos,
        "diary": data.diary_notes,
        "share_diary": getattr(data, 'share_diary', True),
        "visibility": visibility,
        "visited_at": visited_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_created_visits.insert_one(user_created_visit)
    
    # Create activity for feed (respects privacy settings)
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    
    # Build description for activity
    landmark_names = [lm['name'] for lm in processed_landmarks]
    if landmark_names:
        if len(landmark_names) == 1:
            activity_description = f"visited {landmark_names[0]} in {data.country_name.strip()}"
        else:
            activity_description = f"visited {len(landmark_names)} places in {data.country_name.strip()}"
    else:
        activity_description = f"visited {data.country_name.strip()}"
    
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "user_created_visit",
        "user_created_visit_id": user_created_visit_id,
        "country_name": data.country_name.strip(),
        "landmarks": processed_landmarks,  # Array of {name, photo} objects
        "description": activity_description,
        "photos": data.photos,
        "diary": data.diary_notes,
        "visibility": visibility,
        "points_earned": 0,  # No points for user-created visits
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    return {
        "message": "Custom visit recorded successfully!",
        "user_created_visit_id": user_created_visit_id,
        "country_name": data.country_name.strip(),
        "landmarks": processed_landmarks,
        "landmarks_count": len(processed_landmarks),
        "total_photos": total_photos
    }


@router.get("/user-created-visits/by-country/{country_id}")
async def get_custom_visits_by_country(country_id: str, current_user: User = Depends(get_current_user)):
    """Get custom visit landmarks linked to a specific DB country for the current user."""
    visits = await db.user_created_visits.find(
        {"user_id": current_user.user_id, "country_id": country_id},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(100)
    
    # Flatten landmarks from all matching custom visits
    custom_landmarks = []
    for v in visits:
        for lm in v.get("landmarks", []):
            custom_landmarks.append({
                "name": lm.get("name", ""),
                "photo": lm.get("photo"),
                "visited_at": v.get("visited_at"),
                "user_created_visit_id": v.get("user_created_visit_id"),
            })
    
    return {"custom_landmarks": custom_landmarks, "custom_visits_count": len(visits)}


@router.get("/countries/names")
async def get_country_names():
    """Lightweight endpoint: return just country names + IDs for autocomplete."""
    countries = await db.countries.find(
        {}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}
    ).sort("name", 1).to_list(200)
    return countries



@router.get("/user-created-visits")
async def get_user_created_visits(current_user: User = Depends(get_current_user)):
    """Get all user-created visits for the current user"""
    visits = await db.user_created_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return visits


@router.get("/user-created-visits/{user_id}/public")
async def get_user_created_visits_public(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user-created visits for a specific user (respecting privacy settings)"""
    
    # Check if requesting own visits
    if user_id == current_user.user_id:
        # Return all own visits
        visits = await db.user_created_visits.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("visited_at", -1).to_list(1000)
        return visits
    
    # Check if users are friends
    are_friends = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": user_id, "status": "accepted"},
            {"user_id": user_id, "friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    # Build visibility filter
    visibility_filter = ["public"]
    if are_friends:
        visibility_filter.append("friends")
    
    visits = await db.user_created_visits.find(
        {"user_id": user_id, "visibility": {"$in": visibility_filter}},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return visits


@router.get("/user-created-visits/{visit_id}")
async def get_user_created_visit(visit_id: str, current_user: User = Depends(get_current_user)):
    """Get a single user-created visit by ID"""
    visit = await db.user_created_visits.find_one(
        {"user_created_visit_id": visit_id},
        {"_id": 0}
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Check access: own visit or respect privacy
    if visit["user_id"] != current_user.user_id:
        visibility = visit.get("visibility", "public")
        if visibility == "private":
            raise HTTPException(status_code=403, detail="This visit is private")
        if visibility == "friends":
            are_friends = await db.friends.find_one({
                "$or": [
                    {"user_id": current_user.user_id, "friend_id": visit["user_id"], "status": "accepted"},
                    {"user_id": visit["user_id"], "friend_id": current_user.user_id, "status": "accepted"}
                ]
            })
            if not are_friends:
                raise HTTPException(status_code=403, detail="This visit is only visible to friends")
    
    return visit


@router.put("/user-created-visits/{visit_id}")
async def update_user_created_visit(visit_id: str, body: dict = Body(...), current_user: User = Depends(get_current_user)):
    """Update a user-created visit (country name, landmarks, photos, diary, visibility, share_diary)"""
    
    # Verify ownership
    visit = await db.user_created_visits.find_one(
        {"user_created_visit_id": visit_id, "user_id": current_user.user_id}
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")
    
    update_fields = {}
    
    # Country name
    if "country_name" in body:
        name = body["country_name"].strip() if body["country_name"] else ""
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Country name must be at least 2 characters")
        update_fields["country_name"] = name
    
    # Landmarks (max 10)
    if "landmarks" in body:
        processed = []
        for lm in body["landmarks"][:10]:
            if isinstance(lm, dict):
                name = lm.get("name", "").strip() if lm.get("name") else ""
                if name:
                    processed.append({"name": name, "photo": lm.get("photo")})
            elif isinstance(lm, str) and lm.strip():
                processed.append({"name": lm.strip(), "photo": None})
        update_fields["landmarks"] = processed
    
    # General photos (max 10)
    if "photos" in body:
        photos = body["photos"][:10]
        update_fields["photos"] = photos
    
    # Diary
    if "diary_notes" in body:
        update_fields["diary"] = body["diary_notes"]
    
    # Visibility
    if "visibility" in body:
        if body["visibility"] in ("public", "friends", "private"):
            update_fields["visibility"] = body["visibility"]
    
    # Share diary
    if "share_diary" in body:
        update_fields["share_diary"] = bool(body["share_diary"])
    
    if not update_fields:
        return {"message": "No changes to apply"}
    
    await db.user_created_visits.update_one(
        {"user_created_visit_id": visit_id},
        {"$set": update_fields}
    )
    
    # Also update associated activity with relevant fields
    activity_update = {}
    if "country_name" in update_fields:
        activity_update["country_name"] = update_fields["country_name"]
    if "landmarks" in update_fields:
        activity_update["landmarks"] = update_fields["landmarks"]
        # Update description
        landmark_names = [lm["name"] for lm in update_fields["landmarks"]]
        cn = update_fields.get("country_name", visit.get("country_name", ""))
        if landmark_names:
            if len(landmark_names) == 1:
                activity_update["description"] = f"visited {landmark_names[0]} in {cn}"
            else:
                activity_update["description"] = f"visited {len(landmark_names)} places in {cn}"
        else:
            activity_update["description"] = f"visited {cn}"
    if "photos" in update_fields:
        activity_update["photos"] = update_fields["photos"]
    if "diary" in update_fields:
        activity_update["diary"] = update_fields["diary"]
    if "visibility" in update_fields:
        activity_update["visibility"] = update_fields["visibility"]
    
    if activity_update:
        await db.activities.update_one(
            {"user_created_visit_id": visit_id},
            {"$set": activity_update}
        )
    
    return {"message": "Visit updated successfully"}


@router.delete("/user-created-visits/{visit_id}")
async def delete_user_created_visit(visit_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user-created visit"""
    
    # Find the visit
    visit = await db.user_created_visits.find_one({
        "user_created_visit_id": visit_id,
        "user_id": current_user.user_id
    })
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")
    
    # Delete the visit
    await db.user_created_visits.delete_one({"user_created_visit_id": visit_id})
    
    # Delete associated activity
    await db.activities.delete_one({"user_created_visit_id": visit_id})
    
    return {"message": "Custom visit deleted successfully"}


@router.patch("/user-created-visits/{visit_id}/visibility")
async def update_custom_visit_visibility(visit_id: str, current_user: User = Depends(get_current_user), body: dict = Body(...)):
    """Update the visibility of a user-created visit"""
    new_visibility = body.get("visibility")
    if new_visibility not in ("public", "friends", "private"):
        raise HTTPException(status_code=400, detail="Visibility must be 'public', 'friends', or 'private'")

    result = await db.user_created_visits.update_one(
        {"user_created_visit_id": visit_id, "user_id": current_user.user_id},
        {"$set": {"visibility": new_visibility}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")

    # Also update the associated activity
    await db.activities.update_one(
        {"user_created_visit_id": visit_id},
        {"$set": {"visibility": new_visibility}}
    )

    return {"message": "Visibility updated", "visibility": new_visibility}


@router.get("/community/custom-visits")
async def get_community_custom_visits(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Browse all public custom visits from the community"""
    pipeline = [
        {"$match": {"visibility": "public"}},
        {"$sort": {"visited_at": -1}},
        {"$skip": offset},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "user_created_visit_id": 1,
            "user_id": 1,
            "country_name": 1,
            "landmarks": 1,
            "photos": 1,
            "diary": 1,
            "visited_at": 1,
            "created_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username",
        }}
    ]

    visits = await db.user_created_visits.aggregate(pipeline).to_list(limit)
    total = await db.user_created_visits.count_documents({"visibility": "public"})

    items = []
    for cv in visits:
        landmark_names = [lm["name"] for lm in (cv.get("landmarks") or []) if lm.get("name")]
        all_photos = list(cv.get("photos") or [])
        for lm in (cv.get("landmarks") or []):
            if lm.get("photo"):
                all_photos.append(lm["photo"])

        items.append({
            "user_created_visit_id": cv.get("user_created_visit_id"),
            "user_id": cv.get("user_id"),
            "country_name": cv.get("country_name"),
            "landmarks": landmark_names,
            "landmarks_count": len(landmark_names),
            "photo_url": all_photos[0] if all_photos else None,
            "photo_count": len(all_photos),
            "has_diary": bool(cv.get("diary")),
            "diary_snippet": (cv["diary"][:100] + "...") if cv.get("diary") and len(cv["diary"]) > 100 else cv.get("diary"),
            "user_name": cv.get("user_name", "Anonymous"),
            "user_picture": cv.get("user_picture"),
            "username": cv.get("username"),
            "visited_at": cv.get("visited_at").isoformat() if cv.get("visited_at") else None,
        })

    return {"items": items, "total": total, "offset": offset, "limit": limit}

# ============= END USER CREATED VISIT ENDPOINTS =============
