from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, is_user_pro
from models.all import User


router = APIRouter()

# ============= COMMUNITY PHOTO ENDPOINTS =============

@router.get("/community-feed")
async def get_community_feed(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get a unified community feed of recent photos and diary entries from all countries, including custom visits."""
    # Standard landmark visits
    pipeline = [
        {"$match": {
            "visibility": "public",
            "photos": {"$exists": True, "$ne": []}
        }},
        {"$sort": {"visited_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "landmark_info"
        }},
        {"$unwind": {"path": "$landmark_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "photos": {"$slice": ["$photos", 1]},
            "diary_notes": 1,
            "share_diary": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username",
            "landmark_name": {"$ifNull": ["$landmark_info.name", "Unknown"]},
            "country_name": "$landmark_info.country_name",
            "country_id": "$landmark_info.country_id",
        }}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(limit)
    
    items = []
    for visit in visits:
        photo_url = visit.get("photos", [None])[0] if visit.get("photos") else None
        has_diary = bool(visit.get("diary_notes")) and visit.get("share_diary", True)
        diary_snippet = None
        if has_diary and visit.get("diary_notes"):
            text = visit["diary_notes"]
            diary_snippet = text[:100] + "..." if len(text) > 100 else text
        
        # Count upvotes for the first photo
        photo_id = f"{visit['visit_id']}_0"
        upvote_count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
        
        items.append({
            "visit_id": visit["visit_id"],
            "type": "diary" if has_diary else "photo",
            "source": "landmark",
            "photo_url": photo_url,
            "user_name": visit.get("user_name", "Anonymous"),
            "user_picture": visit.get("user_picture"),
            "username": visit.get("username"),
            "landmark_name": visit.get("landmark_name", "Unknown"),
            "landmark_id": visit.get("landmark_id"),
            "country_name": visit.get("country_name"),
            "country_id": visit.get("country_id"),
            "diary_snippet": diary_snippet,
            "has_diary": has_diary,
            "upvotes": upvote_count,
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        })

    # Custom visits (user-created)
    custom_pipeline = [
        {"$match": {"visibility": "public"}},
        {"$sort": {"visited_at": -1}},
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
            "photos": {"$slice": ["$photos", 1]},
            "diary": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username",
        }}
    ]
    custom_visits = await db.user_created_visits.aggregate(custom_pipeline).to_list(limit)

    for cv in custom_visits:
        photo_url = cv.get("photos", [None])[0] if cv.get("photos") else None
        # If no general photo, check landmark photos
        if not photo_url and cv.get("landmarks"):
            for lm in cv["landmarks"]:
                if lm.get("photo"):
                    photo_url = lm["photo"]
                    break

        landmark_names = [lm["name"] for lm in (cv.get("landmarks") or []) if lm.get("name")]
        landmark_label = ", ".join(landmark_names[:2])
        if len(landmark_names) > 2:
            landmark_label += f" +{len(landmark_names) - 2} more"

        has_diary = bool(cv.get("diary"))
        diary_snippet = None
        if has_diary:
            text = cv["diary"]
            diary_snippet = text[:100] + "..." if len(text) > 100 else text

        items.append({
            "visit_id": cv.get("user_created_visit_id"),
            "type": "custom_visit",
            "source": "custom",
            "photo_url": photo_url,
            "user_name": cv.get("user_name", "Anonymous"),
            "user_picture": cv.get("user_picture"),
            "username": cv.get("username"),
            "landmark_name": landmark_label or cv.get("country_name", "Unknown"),
            "landmark_id": None,
            "country_name": cv.get("country_name"),
            "country_id": None,
            "diary_snippet": diary_snippet,
            "has_diary": has_diary,
            "upvotes": 0,
            "visited_at": cv.get("visited_at").isoformat() if cv.get("visited_at") else None,
        })

    # Sort combined items by visited_at descending
    items.sort(key=lambda x: x.get("visited_at") or "", reverse=True)
    items = items[:limit]
    
    return {"items": items, "count": len(items)}


@router.get("/community-photos/photo-of-the-week")
async def get_photo_of_the_week(current_user: User = Depends(get_current_user)):
    """Get the most upvoted community photo from the last 7 days."""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Get all photo_upvotes from last 7 days, grouped by photo_id
    pipeline = [
        {"$match": {"created_at": {"$gte": seven_days_ago}}},
        {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ]
    top_photos = await db.photo_upvotes.aggregate(pipeline).to_list(1)
    
    if not top_photos:
        # Fallback: get most upvoted photo overall
        pipeline_all = [
            {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        top_photos = await db.photo_upvotes.aggregate(pipeline_all).to_list(1)
    
    if not top_photos:
        return {"photo": None}
    
    photo_id = top_photos[0]["_id"]
    upvote_count = top_photos[0]["count"]
    
    # Parse visit_id from photo_id (format: "visit_xxx_idx" or "cv_xxx_idx")
    parts = photo_id.rsplit("_", 1)
    if len(parts) != 2:
        return {"photo": None}
    
    visit_id_part = parts[0]
    photo_idx = int(parts[1]) if parts[1].isdigit() else 0
    
    # Find the visit
    visit = await db.visits.find_one({"visit_id": visit_id_part}, {"_id": 0})
    if not visit:
        return {"photo": None}
    
    photos = visit.get("photos", [])
    if photo_idx >= len(photos):
        return {"photo": None}
    
    # Get user info
    user_info = await db.users.find_one(
        {"user_id": visit["user_id"]},
        {"_id": 0, "name": 1, "username": 1, "picture": 1}
    )
    
    # Get landmark info
    landmark = await db.landmarks.find_one(
        {"landmark_id": visit.get("landmark_id")},
        {"_id": 0, "name": 1, "country_name": 1, "country_id": 1}
    )
    
    return {
        "photo": {
            "photo_id": photo_id,
            "photo_url": photos[photo_idx],
            "upvotes": upvote_count,
            "user_name": user_info.get("name", "Anonymous") if user_info else "Anonymous",
            "username": user_info.get("username") if user_info else None,
            "user_picture": user_info.get("picture") if user_info else None,
            "landmark_name": landmark.get("name", "Unknown") if landmark else "Unknown",
            "landmark_id": visit.get("landmark_id"),
            "country_name": landmark.get("country_name") if landmark else None,
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        }
    }

@router.get("/landmarks/{landmark_id}/community-photos")
async def get_landmark_community_photos(
    landmark_id: str,
    sort: str = "popular",
    current_user: User = Depends(get_current_user)
):
    """Get community photos for a specific landmark. 
    Free users: top 3 photos + total count. Premium: all photos + upvoting.
    sort: 'popular' (default) or 'newest'"""
    
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all public visits with photos for this landmark
    pipeline = [
        {"$match": {
            "landmark_id": landmark_id,
            "visibility": "public",
            "$or": [
                {"photos": {"$exists": True, "$ne": []}},
                {"photo_base64": {"$exists": True, "$ne": None}}
            ]
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "photos": 1,
            "photo_base64": 1,
            "visited_at": 1,
            "comments": 1,
            "diary_notes": 1,
            "share_diary": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(500)
    
    # Build photo list from visits
    photos = []
    for visit in visits:
        visit_photos = visit.get("photos", [])
        photo_base64 = visit.get("photo_base64")
        
        all_visit_photos = []
        if visit_photos:
            all_visit_photos.extend(visit_photos)
        if photo_base64 and photo_base64 not in all_visit_photos:
            all_visit_photos.append(photo_base64)
        
        for idx, photo in enumerate(all_visit_photos):
            photo_id = f"{visit['visit_id']}_{idx}"
            
            # Get upvote count for this photo
            upvote_count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
            
            # Check if current user has upvoted
            user_upvoted = False
            if is_premium:
                existing_upvote = await db.photo_upvotes.find_one({
                    "photo_id": photo_id,
                    "user_id": current_user.user_id
                })
                user_upvoted = existing_upvote is not None
            
            photos.append({
                "photo_id": photo_id,
                "photo_url": photo,
                "visit_id": visit["visit_id"],
                "user_id": visit["user_id"],
                "user_name": visit.get("user_name", "Anonymous"),
                "user_picture": visit.get("user_picture"),
                "username": visit.get("username"),
                "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
                "comments": visit.get("comments"),
                "diary_notes": visit.get("diary_notes") if visit.get("share_diary", True) else None,
                "has_diary": bool(visit.get("diary_notes")) and visit.get("share_diary", True),
                "upvotes": upvote_count,
                "user_upvoted": user_upvoted
            })
    
    # Sort by upvotes (most upvoted first), then by date
    if sort == "newest":
        photos.sort(key=lambda x: x.get("visited_at", "") or "", reverse=True)
    else:
        photos.sort(key=lambda x: (-x["upvotes"], x.get("visited_at", "") or ""), reverse=False)
    
    total_count = len(photos)
    
    if not is_premium:
        # Free users only see top 3
        return {
            "photos": photos[:3],
            "total_count": total_count,
            "is_preview": True,
            "landmark_id": landmark_id
        }
    
    return {
        "photos": photos,
        "total_count": total_count,
        "is_preview": False,
        "landmark_id": landmark_id
    }


@router.get("/countries/{country_id}/community-photos")
async def get_country_community_photos(
    country_id: str,
    sort: str = "popular",
    current_user: User = Depends(get_current_user)
):
    """Get community photos for all landmarks in a country.
    Free users: top 3 photos + total count. Premium: all photos.
    sort: 'popular' (default) or 'newest'"""
    
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    # Get country name
    country = await db.countries.find_one({"country_id": country_id}, {"_id": 0, "name": 1})
    country_name = country["name"] if country else country_id
    
    # Get all public visits with photos for landmarks in this country
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "$or": [
                {"photos": {"$exists": True, "$ne": []}},
                {"photo_base64": {"$exists": True, "$ne": None}}
            ]
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "photos": 1,
            "photo_base64": 1,
            "visited_at": 1,
            "comments": 1,
            "diary_notes": 1,
            "share_diary": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(1000)
    
    # Also get country visit photos
    country_visits_pipeline = [
        {"$match": {
            "country_name": country_name,
            "photos": {"$exists": True, "$ne": []},
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "country_visit_id": 1,
            "user_id": 1,
            "photos": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    country_visits = await db.country_visits.aggregate(country_visits_pipeline).to_list(500)
    
    # Build photo list
    photos = []
    
    for visit in visits:
        visit_photos = visit.get("photos", [])
        photo_base64 = visit.get("photo_base64")
        
        all_visit_photos = []
        if visit_photos:
            all_visit_photos.extend(visit_photos)
        if photo_base64 and photo_base64 not in all_visit_photos:
            all_visit_photos.append(photo_base64)
        
        lm_name = landmark_names.get(visit.get("landmark_id"), "Unknown")
        
        for idx, photo in enumerate(all_visit_photos):
            photo_id = f"{visit['visit_id']}_{idx}"
            upvote_count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
            
            user_upvoted = False
            if is_premium:
                existing = await db.photo_upvotes.find_one({
                    "photo_id": photo_id,
                    "user_id": current_user.user_id
                })
                user_upvoted = existing is not None
            
            photos.append({
                "photo_id": photo_id,
                "photo_url": photo,
                "landmark_name": lm_name,
                "landmark_id": visit.get("landmark_id"),
                "user_id": visit["user_id"],
                "user_name": visit.get("user_name", "Anonymous"),
                "user_picture": visit.get("user_picture"),
                "username": visit.get("username"),
                "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
                "diary_notes": visit.get("diary_notes") if visit.get("share_diary", True) else None,
                "has_diary": bool(visit.get("diary_notes")) and visit.get("share_diary", True),
                "upvotes": upvote_count,
                "user_upvoted": user_upvoted
            })
    
    # Add country visit photos
    for cv in country_visits:
        for idx, photo in enumerate(cv.get("photos", [])):
            photo_id = f"cv_{cv['country_visit_id']}_{idx}"
            upvote_count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
            
            user_upvoted = False
            if is_premium:
                existing = await db.photo_upvotes.find_one({
                    "photo_id": photo_id,
                    "user_id": current_user.user_id
                })
                user_upvoted = existing is not None
            
            photos.append({
                "photo_id": photo_id,
                "photo_url": photo,
                "landmark_name": "Country Visit",
                "landmark_id": None,
                "user_id": cv["user_id"],
                "user_name": cv.get("user_name", "Anonymous"),
                "user_picture": cv.get("user_picture"),
                "username": cv.get("username"),
                "visited_at": cv.get("visited_at").isoformat() if cv.get("visited_at") else None,
                "upvotes": upvote_count,
                "user_upvoted": user_upvoted
            })
    
    if sort == "newest":
        photos.sort(key=lambda x: x.get("visited_at", "") or "", reverse=True)
    else:
        photos.sort(key=lambda x: (-x["upvotes"], x.get("visited_at", "") or ""))
    
    total_count = len(photos)
    
    if not is_premium:
        return {
            "photos": photos[:3],
            "total_count": total_count,
            "is_preview": True,
            "country_id": country_id,
            "country_name": country_name
        }
    
    return {
        "photos": photos,
        "total_count": total_count,
        "is_preview": False,
        "country_id": country_id,
        "country_name": country_name
    }


@router.get("/countries/{country_id}/travel-diaries")
async def get_country_travel_diaries(
    country_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all shared travel diaries for a country. Premium feature."""
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    country = await db.countries.find_one({"country_id": country_id}, {"_id": 0, "name": 1})
    country_name = country["name"] if country else country_id
    
    # Get visits with shared diary notes
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "share_diary": True,
            "diary_notes": {"$exists": True, "$ne": None, "$ne": ""}
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "diary_notes": 1,
            "photos": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }},
        {"$sort": {"visited_at": -1}}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(200)
    
    diaries = []
    for visit in visits:
        photo_url = None
        photos = visit.get("photos", [])
        if photos:
            photo_url = photos[0]
        
        diaries.append({
            "visit_id": visit["visit_id"],
            "diary_notes": visit["diary_notes"],
            "photo_url": photo_url,
            "landmark_name": landmark_names.get(visit.get("landmark_id"), "Unknown"),
            "landmark_id": visit.get("landmark_id"),
            "user_name": visit.get("user_name", "Anonymous"),
            "user_picture": visit.get("user_picture"),
            "username": visit.get("username"),
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        })
    
    total_count = len(diaries)
    
    if not is_premium:
        return {
            "diaries": diaries[:2],
            "total_count": total_count,
            "is_preview": True,
            "country_name": country_name
        }
    
    return {
        "diaries": diaries,
        "total_count": total_count,
        "is_preview": False,
        "country_name": country_name
    }


@router.get("/countries/{country_id}/community-highlights")
async def get_country_community_highlights(
    country_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get top 3 most photographed landmarks in a country."""
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    if not landmark_ids:
        return {"highlights": []}
    
    # Aggregate: count photos per landmark from public visits
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "photos": {"$exists": True, "$ne": []}
        }},
        {"$project": {
            "landmark_id": 1,
            "photo_count": {"$size": "$photos"},
            "photos": {"$slice": ["$photos", 1]}
        }},
        {"$group": {
            "_id": "$landmark_id",
            "total_photos": {"$sum": "$photo_count"},
            "visitor_count": {"$sum": 1},
            "sample_photo": {"$first": {"$arrayElemAt": ["$photos", 0]}}
        }},
        {"$sort": {"total_photos": -1}},
        {"$limit": 3}
    ]
    
    results = await db.visits.aggregate(pipeline).to_list(3)
    
    highlights = []
    for r in results:
        lm_id = r["_id"]
        highlights.append({
            "landmark_id": lm_id,
            "landmark_name": landmark_names.get(lm_id, "Unknown"),
            "total_photos": r["total_photos"],
            "visitor_count": r["visitor_count"],
            "sample_photo": r.get("sample_photo"),
        })
    
    return {"highlights": highlights}


@router.post("/community-photos/{photo_id}/upvote")
async def upvote_community_photo(photo_id: str, current_user: User = Depends(get_current_user)):
    """Toggle upvote on a community photo. Premium only."""
    if current_user.subscription_tier != "pro":
        raise HTTPException(status_code=403, detail="Premium subscription required to upvote photos")
    
    existing = await db.photo_upvotes.find_one({
        "photo_id": photo_id,
        "user_id": current_user.user_id
    })
    
    if existing:
        await db.photo_upvotes.delete_one({"_id": existing["_id"]})
        count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
        return {"upvoted": False, "upvotes": count}
    else:
        await db.photo_upvotes.insert_one({
            "photo_id": photo_id,
            "user_id": current_user.user_id,
            "created_at": datetime.now(timezone.utc)
        })
        count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
        return {"upvoted": True, "upvotes": count}

