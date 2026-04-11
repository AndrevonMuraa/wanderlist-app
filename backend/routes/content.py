from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import os
import uuid
import asyncio
from datetime import datetime, timezone

from utils.db import db
from utils.auth import get_current_user
from models.all import User, Country, Landmark, LandmarkCreate


router = APIRouter()

# ============= COUNTRY & LANDMARK ENDPOINTS =============

@router.get("/continent-stats")
async def get_continent_stats(current_user: User = Depends(get_current_user)):
    """Get dynamic statistics for all continents - optimized with aggregation."""
    # Map DB continent names to display names
    # "Americas" is already standardized in DB, but keep North/South as fallback
    # "Oceania" in DB displays as "Oceania & Island Paradises" in frontend
    CONTINENT_MAP = {
        "North America": "Americas",
        "South America": "Americas",
    }

    # Single aggregation: landmark stats by continent
    pipeline = [
        {"$group": {
            "_id": "$continent",
            "total_landmarks": {"$sum": 1},
            "total_points": {"$sum": "$points"},
            "countries": {"$addToSet": "$country_name"}
        }},
        {"$project": {
            "_id": 0, "continent": "$_id",
            "landmarks": "$total_landmarks",
            "points": "$total_points",
            "country_list": "$countries"
        }},
        {"$sort": {"continent": 1}}
    ]
    raw_stats = await db.landmarks.aggregate(pipeline).to_list(20)

    # Merge continents
    merged: dict = {}
    for stat in raw_stats:
        name = CONTINENT_MAP.get(stat["continent"], stat["continent"])
        if name not in merged:
            merged[name] = {"landmarks": 0, "points": 0, "country_set": set()}
        merged[name]["landmarks"] += stat["landmarks"]
        merged[name]["points"] += stat["points"]
        merged[name]["country_set"].update(stat["country_list"])

    # Single aggregation: user's visited landmarks → group by continent + country
    visited_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "lm",
            "pipeline": [{"$project": {"_id": 0, "continent": 1, "country_name": 1, "points": 1}}]
        }},
        {"$unwind": {"path": "$lm", "preserveNullAndEmptyArrays": False}},
        {"$group": {
            "_id": "$lm.continent",
            "visited_count": {"$sum": 1},
            "visited_points": {"$sum": "$lm.points"},
            "visited_countries": {"$addToSet": "$lm.country_name"}
        }}
    ]
    # Also fetch destination visits and look up their continent
    cv_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$lookup": {
            "from": "countries",
            "localField": "country_id",
            "foreignField": "country_id",
            "as": "c",
            "pipeline": [{"$project": {"_id": 0, "continent": 1, "name": 1}}]
        }},
        {"$unwind": {"path": "$c", "preserveNullAndEmptyArrays": False}},
        {"$group": {
            "_id": "$c.continent",
            "visited_countries": {"$addToSet": "$c.name"}
        }}
    ]
    visited_results, cv_results = await asyncio.gather(
        db.visits.aggregate(visited_pipeline).to_list(10),
        db.country_visits.aggregate(cv_pipeline).to_list(10)
    )

    visited_by_continent: dict = {}
    for v in visited_results:
        name = CONTINENT_MAP.get(v["_id"], v["_id"])
        if name not in visited_by_continent:
            visited_by_continent[name] = {"visited_count": 0, "visited_points": 0, "visited_countries": set()}
        visited_by_continent[name]["visited_count"] += v["visited_count"]
        visited_by_continent[name]["visited_points"] += v["visited_points"]
        visited_by_continent[name]["visited_countries"].update(v["visited_countries"])
    
    # Merge destination visits into continent stats
    for cv in cv_results:
        name = CONTINENT_MAP.get(cv["_id"], cv["_id"])
        if name not in visited_by_continent:
            visited_by_continent[name] = {"visited_count": 0, "visited_points": 0, "visited_countries": set()}
        visited_by_continent[name]["visited_countries"].update(cv["visited_countries"])

    # Build result
    result = []
    for name in sorted(merged.keys()):
        data = merged[name]
        country_count = len(data["country_set"])
        vd = visited_by_continent.get(name, {})
        visited_landmarks_count = vd.get("visited_count", 0)
        visited_countries_count = len(vd.get("visited_countries", set()))

        result.append({
            "continent": name,
            "total_landmarks": data["landmarks"],
            "total_points": data["points"],
            "countries": country_count,
            "visited_landmarks": visited_landmarks_count,
            "visited_countries": visited_countries_count,
            "visited_points": vd.get("visited_points", 0),
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
async def get_countries(continent: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if continent:
        query["continent"] = continent
    countries = await db.countries.find(query, {"_id": 0}).to_list(1000)
    
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

    # Determine sort
    sort_map = {
        "upvotes_desc": {"upvotes": -1},
        "points_desc": {"points": -1},
        "points_asc": {"points": 1},
        "name_asc": {"name": 1},
        "name_desc": {"name": -1},
    }
    sort_stage = sort_map.get(sort_by, {"name": 1})

    # Step 1: Fetch landmarks (no correlated $lookup — much faster)
    pipeline = [
        {"$match": match_query},
        {"$addFields": {"category_order": {"$cond": [{"$eq": ["$category", "official"]}, 0, 1]}}},
        {"$sort": {"category_order": 1, **sort_stage}},
        {"$project": {"category_order": 0, "_id": 0}},
        {"$limit": limit},
    ]
    landmarks = await db.landmarks.aggregate(pipeline).to_list(limit)

    # Step 2: Batch-check visited status with a single indexed query
    landmark_ids = [l["landmark_id"] for l in landmarks]
    visited_docs = await db.visits.find(
        {"user_id": current_user.user_id, "landmark_id": {"$in": landmark_ids}},
        {"_id": 0, "landmark_id": 1}
    ).to_list(len(landmark_ids))
    visited_ids = {v["landmark_id"] for v in visited_docs}

    # Step 3: Enrich + filter
    is_free = current_user.subscription_tier == "free"
    result = []
    for l in landmarks:
        l["is_visited"] = l["landmark_id"] in visited_ids
        l["is_locked"] = is_free and l.get("category") == "premium"

        if visited == "true" and not l["is_visited"]:
            continue
        if visited == "false" and l["is_visited"]:
            continue
        result.append(l)

    return [Landmark(**l) for l in result]

@router.get("/landmarks/{landmark_id}", response_model=Landmark)
async def get_landmark(landmark_id: str, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    return Landmark(**landmark)

@router.get("/landmarks/search/query")
async def search_landmarks(q: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Search landmarks by name or country name across all countries and categories"""
    if not q or len(q.strip()) < 2:
        return []
    
    # Search by landmark name OR country name (case-insensitive, partial match)
    landmarks = await db.landmarks.find(
        {
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"country_name": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).sort("category", 1).limit(limit).to_list(limit)
    
    return landmarks

@router.post("/landmarks", response_model=Landmark)
async def create_landmark(data: LandmarkCreate, current_user: User = Depends(get_current_user)):
    # Check if user is premium
    if not current_user.is_premium:
        raise HTTPException(status_code=403, detail="Premium subscription required to suggest landmarks")
    
    # Get country info
    country = await db.countries.find_one({"country_id": data.country_id}, {"_id": 0})
    if not country:
        raise HTTPException(status_code=404, detail="Destination not found")
    
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

