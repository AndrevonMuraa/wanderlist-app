"""Stats and progress endpoints."""
from ._social_common import *
from utils.helpers import recalculate_user_points

router = APIRouter()

# ============= STATS ENDPOINT =============

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    """Optimized stats: runs all DB queries in parallel."""
    import asyncio
    
    # Ensure points are fresh before returning stats
    await recalculate_user_points(current_user.user_id)
    
    # Single aggregation: visits → lookup landmarks → get unique countries/continents
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "landmark",
            "pipeline": [{"$project": {"country_id": 1, "country_name": 1, "continent": 1}}]
        }},
        {"$unwind": {"path": "$landmark", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "total_visits": {"$sum": 1},
            "country_ids": {"$addToSet": "$landmark.country_id"},
            "continents": {"$addToSet": "$landmark.continent"},
        }}
    ]
    
    # Run all queries in parallel
    visits_task = db.visits.aggregate(pipeline).to_list(1)
    user_task = db.users.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "points": 1, "leaderboard_points": 1}
    )
    friends_task = db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    # Count visits with photos (for points breakdown)
    photos_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$project": {
            "has_photo": {"$or": [
                {"$gt": [{"$size": {"$ifNull": ["$photos", []]}}, 0]},
                {"$and": [{"$ne": ["$photo_base64", None]}, {"$ne": ["$photo_base64", ""]}]}
            ]}
        }},
        {"$group": {"_id": None, "with_photos": {"$sum": {"$cond": ["$has_photo", 1, 0]}}}}
    ]
    photos_task = db.visits.aggregate(photos_pipeline).to_list(1)
    # Get country visits for accurate country count
    country_visits_task = db.country_visits.distinct("country_id", {"user_id": current_user.user_id})
    
    result, user, friend_count, photos_result, cv_country_ids = await asyncio.gather(
        visits_task, user_task, friends_task, photos_task, country_visits_task
    )
    
    stats = result[0] if result else {"total_visits": 0, "country_ids": [], "continents": []}
    user_lb_points = user.get("leaderboard_points", 0) if user else 0
    visits_with_photos = photos_result[0]["with_photos"] if photos_result else 0
    
    # Merge countries from landmark visits AND country visits (both use country_id)
    landmark_country_ids = set(c for c in stats.get("country_ids", []) if c)
    country_visit_ids = set(cv_country_ids) if cv_country_ids else set()
    all_visited_countries = landmark_country_ids | country_visit_ids
    
    # Merge continents from landmark visits AND country visits
    landmark_continents = set(c for c in stats.get("continents", []) if c)
    # Look up continents for country_visit countries not already covered by landmarks
    extra_cv_ids = country_visit_ids - landmark_country_ids
    if extra_cv_ids:
        cv_continents = await db.countries.distinct("continent", {"country_id": {"$in": list(extra_cv_ids)}})
        landmark_continents.update(cv_continents)
    all_visited_continents = landmark_continents
    
    # Calculate rank
    users_above = await db.users.count_documents({
        "leaderboard_points": {"$gt": user_lb_points},
        "$or": [
            {"default_privacy": "public"},
            {"default_privacy": {"$exists": False}}
        ]
    })
    
    return {
        "total_visits": stats["total_visits"],
        "countries_visited": len(all_visited_countries),
        "continents_visited": len(all_visited_continents),
        "friends_count": friend_count,
        "points": user.get("points", 0) if user else 0,
        "leaderboard_points": user_lb_points,
        "rank": users_above + 1,
        "visits_with_photos": visits_with_photos,
        "countries_with_landmarks": len(landmark_country_ids),
        "continents_with_landmarks": len(landmark_continents),
    }

# ============= PROGRESS STATISTICS ENDPOINT =============

@router.get("/progress")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive progress statistics - optimized with cache + parallel queries."""
    
    # Run user visits aggregation in parallel with cached static geo data
    visits_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$group": {
            "_id": None,
            "landmark_ids": {"$addToSet": "$landmark_id"},
            "total_points": {"$sum": {"$ifNull": ["$points_earned", 0]}},
            "visited_count": {"$sum": 1}
        }}
    ]
    
    # Also sum country visit points
    country_visits_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$group": {
            "_id": None,
            "total_points": {"$sum": {"$ifNull": ["$points_earned", 0]}}
        }}
    ]
    
    visits_task = db.visits.aggregate(visits_pipeline).to_list(1)
    country_visits_task = db.country_visits.aggregate(country_visits_pipeline).to_list(1)
    geo_task = _get_static_geo_data()
    user_task = db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "leaderboard_points": 1})
    visits_result, cv_result, (all_countries, lm_map, total_landmarks), user_doc = await asyncio.gather(visits_task, country_visits_task, geo_task, user_task)
    
    country_visit_points = cv_result[0]["total_points"] if cv_result else 0
    verified_points = user_doc.get("leaderboard_points", 0) if user_doc else 0
    
    if not visits_result:
        # No visits — build empty progress from cached data
        continental_progress = {}
        country_progress = {}
        for country in all_countries:
            continent = country["continent"]
            if continent not in continental_progress:
                continental_progress[continent] = {"visited": 0, "total": 0, "percentage": 0}
            continental_progress[continent]["total"] += 1
            country_progress[country["country_id"]] = {
                "country_name": country["name"],
                "continent": continent,
                "visited": 0,
                "total": lm_map.get(country["country_id"], {}).get("count", 0),
                "percentage": 0
            }
        return {
            "overall": {"visited": 0, "total": total_landmarks, "percentage": 0},
            "totalPoints": country_visit_points,
            "verifiedPoints": verified_points,
            "continents": continental_progress,
            "countries": country_progress
        }
    
    visited_landmark_ids = set(visits_result[0]["landmark_ids"])
    total_points = visits_result[0]["total_points"] + country_visit_points
    visited_count = len(visited_landmark_ids)
    overall_percentage = round((visited_count / total_landmarks * 100) if total_landmarks > 0 else 0, 1)
    
    continental_progress = {}
    country_progress = {}
    
    for country in all_countries:
        country_id = country["country_id"]
        continent = country["continent"]
        stats = lm_map.get(country_id, {"count": 0, "landmark_ids": []})
        
        total = stats["count"]
        visited = sum(1 for lid in stats.get("landmark_ids", []) if lid in visited_landmark_ids)
        percentage = round((visited / total * 100) if total > 0 else 0, 1)
        
        country_progress[country_id] = {
            "country_name": country["name"],
            "continent": continent,
            "visited": visited,
            "total": total,
            "percentage": percentage
        }
        
        if continent not in continental_progress:
            continental_progress[continent] = {"visited": 0, "total": 0, "percentage": 0}
        continental_progress[continent]["total"] += 1
        if visited > 0:
            continental_progress[continent]["visited"] += 1
    
    for continent_data in continental_progress.values():
        if continent_data["total"] > 0:
            continent_data["percentage"] = round(
                continent_data["visited"] / continent_data["total"] * 100, 1
            )
    
    # Add continent bonuses (50 pts for first country visited per continent)
    continents_with_visits = sum(1 for c in continental_progress.values() if c["visited"] > 0)
    continent_bonus = continents_with_visits * 50
    total_points += continent_bonus
    
    return {
        "overall": {
            "visited": len(visited_landmark_ids),
            "total": total_landmarks,
            "percentage": overall_percentage
        },
        "totalPoints": total_points,
        "verifiedPoints": verified_points,
        "continents": continental_progress,
        "countries": country_progress
    }
