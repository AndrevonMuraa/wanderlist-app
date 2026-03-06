from fastapi import APIRouter, Depends
import os
import asyncio

from utils.db import db
from utils.auth import get_current_user
from models.all import User


router = APIRouter()

# ============= PHOTO COLLECTION ENDPOINTS =============

# Projection: only fetch fields needed for photo collection (excludes heavy photo_base64)
_VISIT_PHOTO_PROJ = {
    "_id": 0, "visit_id": 1, "landmark_id": 1, "landmark_name": 1,
    "country_name": 1, "country_id": 1, "photos": 1,
    "visited_at": 1, "created_at": 1,
}
_COUNTRY_PHOTO_PROJ = {
    "_id": 0, "country_visit_id": 1, "country_name": 1, "country_id": 1,
    "photos": 1, "visited_at": 1, "created_at": 1,
}
_CUSTOM_PHOTO_PROJ = {
    "_id": 0, "user_created_visit_id": 1, "country_name": 1,
    "landmarks": 1, "landmark_name": 1, "photos": 1,
    "visited_at": 1, "created_at": 1,
}

@router.get("/photos/collection")
async def get_photo_collection(current_user: User = Depends(get_current_user)):
    """
    Aggregate all photos from landmark visits, country visits, and custom visits.
    Runs all 3 queries in parallel with minimal projections.
    """
    # Parallel fetch from all 3 collections
    landmark_task = db.visits.find(
        {"user_id": current_user.user_id}, _VISIT_PHOTO_PROJ
    ).to_list(1000)
    country_task = db.country_visits.find(
        {"user_id": current_user.user_id}, _COUNTRY_PHOTO_PROJ
    ).to_list(1000)
    custom_task = db.user_created_visits.find(
        {"user_id": current_user.user_id}, _CUSTOM_PHOTO_PROJ
    ).to_list(1000)

    landmark_visits, country_visits, custom_visits = await asyncio.gather(
        landmark_task, country_task, custom_task
    )

    photos = []
    type_counts = {"landmark": 0, "country": 0, "custom": 0}
    countries = set()
    years = set()

    def _add_photo(photo_url, visit_type, visit_id, landmark_id, landmark_name, country_name, country_id, visited_at, created_at, idx):
        date = visited_at or created_at
        photos.append({
            "photo_url": photo_url, "visit_type": visit_type, "visit_id": visit_id,
            "landmark_id": landmark_id, "landmark_name": landmark_name,
            "country_name": country_name, "country_id": country_id,
            "visited_at": date, "created_at": created_at, "photo_index": idx,
        })
        type_counts[visit_type] += 1
        if country_name:
            countries.add(country_name)
        if date:
            try:
                years.add(str(date)[:4] if isinstance(date, str) else str(date.year))
            except Exception:
                pass

    # Process landmark visit photos (only URL-based photos, excludes legacy base64)
    for v in landmark_visits:
        visit_photos = v.get("photos") or []
        for i, p in enumerate(visit_photos):
            if p:
                _add_photo(p, "landmark", v.get("visit_id"), v.get("landmark_id"),
                           v.get("landmark_name", "Unknown Landmark"), v.get("country_name", "Unknown"),
                           v.get("country_id"), v.get("visited_at"), v.get("created_at"), i)

    # Process country visit photos
    for v in country_visits:
        for i, p in enumerate(v.get("photos", [])):
            if p:
                _add_photo(p, "country", v.get("country_visit_id"), None, None,
                           v.get("country_name", "Unknown"), v.get("country_id"),
                           v.get("visited_at"), v.get("created_at"), i)

    # Process custom visit photos
    for v in custom_visits:
        landmarks = v.get("landmarks", [])
        lm_name = landmarks[0] if landmarks else v.get("landmark_name")
        for i, p in enumerate(v.get("photos", [])):
            if p:
                _add_photo(p, "custom", v.get("user_created_visit_id"), None, lm_name,
                           v.get("country_name", "Unknown"), None,
                           v.get("visited_at"), v.get("created_at"), i)

    photos.sort(key=lambda x: x.get("visited_at") or x.get("created_at") or "", reverse=True)

    return {
        "photos": photos,
        "total_count": len(photos),
        "countries_count": len(countries),
        "countries": list(countries),
        "years": sorted(list(years), reverse=True),
        "by_type": type_counts,
    }
