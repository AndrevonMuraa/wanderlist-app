"""Leaderboard endpoints."""
from ._social_common import *

router = APIRouter()

# ============= LEADERBOARD ENDPOINTS =============

@router.get("/leaderboard")
async def get_enhanced_leaderboard(
    time_period: str = "all_time",  # "all_time", "monthly", "weekly"
    category: str = "points",  # "points", "visits", "countries"
    friends_only: bool = False,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Enhanced leaderboard with time periods, categories, and filters"""
    
    # Calculate time filter if needed
    time_filter = {}
    if time_period == "weekly":
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        time_filter = {"created_at": {"$gte": week_ago}}
    elif time_period == "monthly":
        month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        time_filter = {"created_at": {"$gte": month_ago}}
    
    # Get friend IDs if friends_only filter
    user_filter = []
    if friends_only:
        friendships = await db.friends.find({
            "$or": [
                {"user_id": current_user.user_id, "status": "accepted"},
                {"friend_id": current_user.user_id, "status": "accepted"}
            ]
        }, {"_id": 0}).to_list(1000)
        
        user_filter = [current_user.user_id]
        for f in friendships:
            if f["user_id"] == current_user.user_id:
                user_filter.append(f["friend_id"])
            else:
                user_filter.append(f["user_id"])
    
    leaderboard = []
    user_rank = None
    
    if category == "points":
        query = {}
        if user_filter:
            query["user_id"] = {"$in": user_filter}
        elif not friends_only:
            # Global leaderboard: only include users with public privacy
            query["$or"] = [
                {"default_privacy": "public"},
                {"default_privacy": {"$exists": False}}
            ]
        
        # Friends leaderboard: sort by total points (trust among friends)
        # Global leaderboard: sort by leaderboard_points (anti-cheat, photo-verified)
        sort_field = "points" if friends_only else "leaderboard_points"
        
        users = await db.users.find(query, {"_id": 0}).sort(sort_field, -1).limit(limit).to_list(limit)
        
        for idx, user in enumerate(users):
            leaderboard.append({
                "user_id": user["user_id"],
                "name": user["name"],
                "picture": user.get("picture"),
                "username": user.get("username"),
                "value": user.get(sort_field, 0),
                "verified_points": user.get("leaderboard_points", 0),
                "total_points": user.get("points", 0),
                "rank": idx + 1,
                "current_streak": 0,
                "longest_streak": 0
            })
            if user["user_id"] == current_user.user_id:
                user_rank = idx + 1
                
    elif category == "visits":
        # Privacy filter: only include public users on global leaderboard
        privacy_match = {}
        if not user_filter:
            # Get public user IDs first
            public_users = await db.users.find(
                {"$or": [{"default_privacy": "public"}, {"default_privacy": {"$exists": False}}]},
                {"_id": 0, "user_id": 1}
            ).to_list(10000)
            public_ids = [u["user_id"] for u in public_users]
            privacy_match = {"user_id": {"$in": public_ids}}

        pipeline = [
            {"$match": {**time_filter, **({"user_id": {"$in": user_filter}} if user_filter else privacy_match)}},
            {"$group": {"_id": "$user_id", "visit_count": {"$sum": 1}}},
            {"$sort": {"visit_count": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "user_id",
                "as": "u",
                "pipeline": [{"$project": {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "username": 1}}]
            }},
            {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": True}}
        ]
        results = await db.visits.aggregate(pipeline).to_list(limit)
        
        for idx, entry in enumerate(results):
            u = entry.get("u", {})
            if u:
                leaderboard.append({
                    "user_id": u.get("user_id", entry["_id"]),
                    "name": u.get("name", "Unknown"),
                    "picture": u.get("picture"),
                    "username": u.get("username"),
                    "value": entry["visit_count"],
                    "rank": idx + 1
                })
                if u.get("user_id") == current_user.user_id:
                    user_rank = idx + 1
                    
    elif category == "countries":
        # Privacy filter: only include public users on global leaderboard
        privacy_match = {}
        if not user_filter:
            public_users = await db.users.find(
                {"$or": [{"default_privacy": "public"}, {"default_privacy": {"$exists": False}}]},
                {"_id": 0, "user_id": 1}
            ).to_list(10000)
            public_ids = [u["user_id"] for u in public_users]
            privacy_match = {"user_id": {"$in": public_ids}}

        pipeline = [
            {"$match": {**time_filter, **({"user_id": {"$in": user_filter}} if user_filter else privacy_match)}},
            {"$group": {"_id": {"user_id": "$user_id", "country": "$country_name"}}},
            {"$group": {"_id": "$_id.user_id", "country_count": {"$sum": 1}}},
            {"$sort": {"country_count": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "user_id",
                "as": "u",
                "pipeline": [{"$project": {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "username": 1}}]
            }},
            {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": True}}
        ]
        results = await db.visits.aggregate(pipeline).to_list(limit)
        
        for idx, entry in enumerate(results):
            u = entry.get("u", {})
            if u:
                leaderboard.append({
                    "user_id": u.get("user_id", entry["_id"]),
                    "name": u.get("name", "Unknown"),
                    "picture": u.get("picture"),
                    "username": u.get("username"),
                    "value": entry["country_count"],
                    "rank": idx + 1
                })
                if u.get("user_id") == current_user.user_id:
                    user_rank = idx + 1
    
    return {
        "leaderboard": leaderboard,
        "user_rank": user_rank,
        "total_users": len(leaderboard)
    }

@router.get("/leaderboard/rising-stars")
async def get_rising_stars(limit: int = 10, current_user: User = Depends(get_current_user)):
    """Get users with biggest point gains this week"""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Only include public users
    public_users = await db.users.find(
        {"$or": [{"default_privacy": "public"}, {"default_privacy": {"$exists": False}}]},
        {"_id": 0, "user_id": 1}
    ).to_list(10000)
    public_ids = [u["user_id"] for u in public_users]
    
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}, "user_id": {"$in": public_ids}}},
        {"$group": {"_id": "$user_id", "points_this_week": {"$sum": "$points_earned"}}},
        {"$sort": {"points_this_week": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "_id",
            "foreignField": "user_id",
            "as": "u",
            "pipeline": [{"$project": {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "username": 1}}]
        }},
        {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": True}}
    ]
    
    results = await db.activities.aggregate(pipeline).to_list(limit)
    
    rising_stars = []
    for idx, entry in enumerate(results):
        u = entry.get("u", {})
        if u:
            rising_stars.append({
                "user_id": u.get("user_id", entry["_id"]),
                "name": u.get("name", "Unknown"),
                "picture": u.get("picture"),
                "username": u.get("username"),
                "points_this_week": entry["points_this_week"],
                "rank": idx + 1
            })
    
    return rising_stars
