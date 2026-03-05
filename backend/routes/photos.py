from fastapi import APIRouter, Depends
import os
import logging
import uuid
from datetime import datetime, timezone

from utils.db import db
from utils.auth import get_current_user
from models.all import User


router = APIRouter()

# ============= PHOTO COLLECTION ENDPOINTS =============

@router.get("/photos/collection")
async def get_photo_collection(current_user: User = Depends(get_current_user)):
    """
    Aggregate all photos from landmark visits, country visits, and custom visits.
    Returns photos with metadata for categorization.
    """
    photos = []
    
    # Get photos from landmark visits
    landmark_visits = await db.visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in landmark_visits:
        visit_photos = visit.get("photos", [])
        # Handle single photo case
        if visit.get("photo_base64"):
            visit_photos = [visit.get("photo_base64")]
        
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "landmark",
                    "visit_id": visit.get("visit_id"),
                    "landmark_id": visit.get("landmark_id"),
                    "landmark_name": visit.get("landmark_name", "Unknown Landmark"),
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": visit.get("country_id"),
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Get photos from country visits
    country_visits = await db.country_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in country_visits:
        visit_photos = visit.get("photos", [])
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "country",
                    "visit_id": visit.get("country_visit_id"),
                    "landmark_id": None,
                    "landmark_name": None,
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": visit.get("country_id"),
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Get photos from user-created visits
    custom_visits = await db.user_created_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in custom_visits:
        visit_photos = visit.get("photos", [])
        # Get landmarks (handle both old single landmark_name and new landmarks array)
        landmarks = visit.get("landmarks", [])
        landmark_name = landmarks[0] if landmarks else visit.get("landmark_name")
        
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "custom",
                    "visit_id": visit.get("user_created_visit_id"),
                    "landmark_id": None,
                    "landmark_name": landmark_name,
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": None,
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Sort by visited_at date (newest first)
    photos.sort(key=lambda x: x.get("visited_at") or x.get("created_at") or "", reverse=True)
    
    # Get unique countries for stats
    countries = set(p["country_name"] for p in photos if p.get("country_name"))
    
    # Group by year for stats
    years = set()
    for p in photos:
        date_str = p.get("visited_at") or p.get("created_at")
        if date_str:
            try:
                if isinstance(date_str, str):
                    year = date_str[:4]
                else:
                    year = str(date_str.year)
                years.add(year)
            except:
                pass
    
    return {
        "photos": photos,
        "total_count": len(photos),
        "countries_count": len(countries),
        "countries": list(countries),
        "years": sorted(list(years), reverse=True),
        "by_type": {
            "landmark": len([p for p in photos if p["visit_type"] == "landmark"]),
            "country": len([p for p in photos if p["visit_type"] == "country"]),
            "custom": len([p for p in photos if p["visit_type"] == "custom"]),
        }
    }

# ============= END PHOTO COLLECTION ENDPOINTS =============

# ============= END ACTIVITY FEED ENDPOINTS =============
