from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user
from models.all import User, Country, Landmark, LandmarkCreate


router = APIRouter()

# ============= COUNTRY & LANDMARK ENDPOINTS =============

@router.get("/continent-stats")
async def get_continent_stats(current_user: User = Depends(get_current_user)):
    """
    Get dynamic statistics for all continents.
    Returns landmark counts, total points, and country counts for each continent.
    Normalizes continent names (North/South America → Americas) to match 5 continent cards.
    """
    # Mapping to normalize continent names to the 5 standard cards
    CONTINENT_MAP = {
        "North America": "Americas",
        "South America": "Americas",
    }
    
    # Aggregate landmark stats by continent
    pipeline = [
        {
            "$group": {
                "_id": "$continent",
                "total_landmarks": {"$sum": 1},
                "total_points": {"$sum": "$points"},
                "countries": {"$addToSet": "$country_name"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "continent": "$_id",
                "landmarks": "$total_landmarks",
                "points": "$total_points",
                "country_list": "$countries"
            }
        },
        {"$sort": {"continent": 1}}
    ]
    
    raw_stats = await db.landmarks.aggregate(pipeline).to_list(10)
    
    # Merge continents using the map
    merged: dict = {}
    for stat in raw_stats:
        name = CONTINENT_MAP.get(stat["continent"], stat["continent"])
        if name not in merged:
            merged[name] = {"landmarks": 0, "points": 0, "country_set": set()}
        merged[name]["landmarks"] += stat["landmarks"]
        merged[name]["points"] += stat["points"]
        merged[name]["country_set"].update(stat["country_list"])
    
    # Get user's visited landmarks by continent for progress
    user_visits = await db.visits.find(
        {"user_id": current_user.user_id},
        {"landmark_id": 1}
    ).to_list(10000)
    visited_landmark_ids = [v["landmark_id"] for v in user_visits]
    
    # Get visited landmarks by continent AND count visited countries
    visited_by_continent: dict = {}
    if visited_landmark_ids:
        visited_landmarks = await db.landmarks.find(
            {"landmark_id": {"$in": visited_landmark_ids}},
            {"continent": 1, "country_name": 1, "points": 1}
        ).to_list(10000)
        
        for landmark in visited_landmarks:
            continent = CONTINENT_MAP.get(landmark.get("continent", ""), landmark.get("continent", ""))
            if continent not in visited_by_continent:
                visited_by_continent[continent] = {
                    "visited_count": 0,
                    "visited_points": 0,
                    "visited_countries": set()
                }
            visited_by_continent[continent]["visited_count"] += 1
            visited_by_continent[continent]["visited_points"] += landmark.get("points", 0)
            visited_by_continent[continent]["visited_countries"].add(landmark.get("country_name"))
    
    # Build final result
    result = []
    for name in sorted(merged.keys()):
        data = merged[name]
        country_count = len(data["country_set"])
        visited_data = visited_by_continent.get(name, {})
        visited_landmarks_count = visited_data.get("visited_count", 0) if visited_data else 0
        visited_countries_count = len(visited_data.get("visited_countries", set())) if visited_data else 0
        
        result.append({
            "continent": name,
            "total_landmarks": data["landmarks"],
            "total_points": data["points"],
            "countries": country_count,
            "visited_landmarks": visited_landmarks_count,
            "visited_countries": visited_countries_count,
            "visited_points": visited_data.get("visited_points", 0) if visited_data else 0,
            "progress_percent": round((visited_countries_count / country_count) * 100, 1) if country_count > 0 else 0
        })
    
    return {
        "continents": result,
        "grand_total": {
            "landmarks": sum(s["total_landmarks"] for s in result),
            "points": sum(s["total_points"] for s in result),
            "countries": sum(s["countries"] for s in result)
        }
    }

@router.get("/countries", response_model=List[Country])
async def get_countries(current_user: User = Depends(get_current_user)):
    countries = await db.countries.find({}, {"_id": 0}).to_list(1000)
    
    # Single aggregation to get landmark counts and total points per country
    pipeline = [
        {
            "$group": {
                "_id": "$country_id",
                "landmark_count": {"$sum": 1},
                "total_points": {"$sum": {"$ifNull": ["$points", 10]}}
            }
        }
    ]
    landmark_stats = await db.landmarks.aggregate(pipeline).to_list(1000)
    stats_map = {s["_id"]: s for s in landmark_stats}
    
    for country in countries:
        stats = stats_map.get(country["country_id"], {})
        country["landmark_count"] = stats.get("landmark_count", 0)
        country["total_points"] = stats.get("total_points", 0)
    
    return [Country(**c) for c in countries]

@router.get("/landmarks", response_model=List[Landmark])
async def get_landmarks(
    country_id: Optional[str] = None,
    continent: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    visited: Optional[str] = None,
    sort_by: Optional[str] = "upvotes_desc",
    min_points: Optional[int] = None,
    max_points: Optional[int] = None,
    limit: int = 1000,
    current_user: User = Depends(get_current_user)
):
    # Build match query
    match_query = {}
    if country_id:
        match_query["country_id"] = country_id
    if continent:
        match_query["continent"] = continent
    if category:
        match_query["category"] = category
    if search:
        match_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"country_name": {"$regex": search, "$options": "i"}}
        ]
    if min_points is not None or max_points is not None:
        match_query["points"] = {}
        if min_points is not None:
            match_query["points"]["$gte"] = min_points
        if max_points is not None:
            match_query["points"]["$lte"] = max_points

    # Use aggregation with $lookup to check visited status in DB
    pipeline = [
        {"$match": match_query},
        {"$lookup": {
            "from": "visits",
            "let": {"lid": "$landmark_id"},
            "pipeline": [
                {"$match": {
                    "$expr": {
                        "$and": [
                            {"$eq": ["$landmark_id", "$$lid"]},
                            {"$eq": ["$user_id", current_user.user_id]}
                        ]
                    }
                }},
                {"$limit": 1},
                {"$project": {"_id": 0, "visit_id": 1}}
            ],
            "as": "user_visit"
        }},
        {"$addFields": {
            "is_visited": {"$gt": [{"$size": "$user_visit"}, 0]}
        }},
        {"$project": {"user_visit": 0, "_id": 0}}
    ]

    # Filter by visited status
    if visited == "true":
        pipeline.append({"$match": {"is_visited": True}})
    elif visited == "false":
        pipeline.append({"$match": {"is_visited": False}})

    # Sort in DB
    sort_stage = {}
    if sort_by == "upvotes_desc":
        sort_stage = {"upvotes": -1}
    elif sort_by == "points_desc":
        sort_stage = {"points": -1}
    elif sort_by == "points_asc":
        sort_stage = {"points": 1}
    elif sort_by == "name_asc":
        sort_stage = {"name": 1}
    elif sort_by == "name_desc":
        sort_stage = {"name": -1}
    else:
        sort_stage = {"name": 1}

    # Always sort official first
    pipeline.append({"$addFields": {
        "category_order": {"$cond": [{"$eq": ["$category", "official"]}, 0, 1]}
    }})
    pipeline.append({"$sort": {"category_order": 1, **sort_stage}})
    pipeline.append({"$project": {"category_order": 0}})
    pipeline.append({"$limit": limit})

    landmarks = await db.landmarks.aggregate(pipeline).to_list(limit)

    # Add locked status
    is_free = current_user.subscription_tier == "free"
    for l in landmarks:
        l["is_locked"] = is_free and l.get("category") == "premium"

    return [Landmark(**l) for l in landmarks]

@router.get("/landmarks/{landmark_id}", response_model=Landmark)
async def get_landmark(landmark_id: str, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    return Landmark(**landmark)

@router.get("/landmarks/search/query")
async def search_landmarks(q: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Search landmarks by name across all countries"""
    if not q or len(q.strip()) < 2:
        return []
    
    # Search by name (case-insensitive, partial match)
    landmarks = await db.landmarks.find(
        {
            "name": {"$regex": q, "$options": "i"}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    return landmarks

@router.post("/landmarks", response_model=Landmark)
async def create_landmark(data: LandmarkCreate, current_user: User = Depends(get_current_user)):
    # Check if user is premium
    if not current_user.is_premium:
        raise HTTPException(status_code=403, detail="Premium subscription required to suggest landmarks")
    
    # Get country info
    country = await db.countries.find_one({"country_id": data.country_id}, {"_id": 0})
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    landmark_id = f"landmark_{uuid.uuid4().hex[:12]}"
    landmark = {
        "landmark_id": landmark_id,
        "name": data.name,
        "country_id": data.country_id,
        "country_name": country["name"],
        "continent": country["continent"],
        "description": data.description,
        "category": "user_suggested",
        "image_url": data.image_url,
        "upvotes": 0,
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.landmarks.insert_one(landmark)
    return Landmark(**landmark)

