"""Friends, user search, and user profile endpoints."""
from ._social_common import *

router = APIRouter()

# ============= FRIEND ENDPOINTS =============

@router.get("/friends", response_model=List[UserPublic])
async def get_friends(current_user: User = Depends(get_current_user)):
    friendships = await db.friends.find({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friend_ids = []
    for f in friendships:
        if f["user_id"] == current_user.user_id:
            friend_ids.append(f["friend_id"])
        else:
            friend_ids.append(f["user_id"])
    
    friends = await db.users.find({"user_id": {"$in": friend_ids}}, {"_id": 0}).to_list(1000)
    return [UserPublic(**f) for f in friends]

@router.post("/friends/request")
async def send_friend_request(data: FriendRequest, current_user: User = Depends(get_current_user)):
    # Get user limits based on subscription
    limits = get_user_limits(current_user)
    max_friends = limits["max_friends"]
    
    # Count current accepted friendships
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    if friend_count >= max_friends:
        raise HTTPException(
            status_code=403,
            detail=f"Friend limit reached ({max_friends} friends). Upgrade to WanderMark Pro for unlimited friends!"
        )
    
    # Find friend by username only (no email search for privacy)
    if not data.friend_username:
        raise HTTPException(status_code=400, detail="Please provide a username")
    
    friend = await db.users.find_one(
        {"username": {"$regex": f"^{data.friend_username}$", "$options": "i"}},
        {"_id": 0}
    )
    
    if not friend:
        raise HTTPException(status_code=404, detail="User not found with that username")
    
    if friend["user_id"] == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as friend")
    
    # Check if friendship already exists
    existing = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": friend["user_id"]},
            {"user_id": friend["user_id"], "friend_id": current_user.user_id}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already exists")
    
    friendship_id = f"friend_{uuid.uuid4().hex[:12]}"
    friendship = {
        "friendship_id": friendship_id,
        "user_id": current_user.user_id,
        "friend_id": friend["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.friends.insert_one(friendship)
    
    # Notify the receiver about the friend request
    await create_notification(
        user_id=friend["user_id"],
        notif_type="friend_request",
        title="New Friend Request",
        message=f"{current_user.name} wants to be your friend",
        related_user_id=current_user.user_id,
        related_user_name=current_user.name
    )
    
    return {"message": "Friend request sent"}

@router.post("/friends/{friendship_id}/accept")
async def accept_friend_request(friendship_id: str, current_user: User = Depends(get_current_user)):
    friendship = await db.friends.find_one({"friendship_id": friendship_id}, {"_id": 0})
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if friendship["friend_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.friends.update_one(
        {"friendship_id": friendship_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Check for social badges for both users
    await check_and_award_badges(current_user.user_id)
    await check_and_award_badges(friendship["user_id"])
    
    # Notify the sender that their request was accepted
    await create_notification(
        user_id=friendship["user_id"],
        notif_type="friend_accepted",
        title="Friend Request Accepted",
        message=f"{current_user.name} accepted your friend request",
        related_user_id=current_user.user_id,
        related_user_name=current_user.name
    )
    
    return {"message": "Friend request accepted"}

@router.get("/friends/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    # Optimized: use $lookup instead of N+1 individual user queries
    pipeline = [
        {"$match": {"friend_id": current_user.user_id, "status": "pending"}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "u",
            "pipeline": [{"$project": {"_id": 0, "password_hash": 0}}]
        }},
        {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": False}},
        {"$project": {"_id": 0, "friendship_id": 1, "user": "$u", "created_at": 1}}
    ]
    return await db.friends.aggregate(pipeline).to_list(100)

@router.get("/friends/sent")
async def get_sent_requests(current_user: User = Depends(get_current_user)):
    """View friend requests you've sent"""
    pipeline = [
        {"$match": {"user_id": current_user.user_id, "status": "pending"}},
        {"$lookup": {
            "from": "users",
            "localField": "friend_id",
            "foreignField": "user_id",
            "as": "u",
            "pipeline": [{"$project": {"_id": 0, "password_hash": 0}}]
        }},
        {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": False}},
        {"$project": {"_id": 0, "friendship_id": 1, "user": "$u", "created_at": 1}}
    ]
    return await db.friends.aggregate(pipeline).to_list(100)

@router.post("/friends/{friendship_id}/reject")
async def reject_friend_request(friendship_id: str, current_user: User = Depends(get_current_user)):
    friendship = await db.friends.find_one({"friendship_id": friendship_id}, {"_id": 0})
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    if friendship["friend_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.friends.delete_one({"friendship_id": friendship_id})
    return {"message": "Friend request rejected"}

@router.delete("/friends/{friendship_id}")
async def remove_friend(friendship_id: str, current_user: User = Depends(get_current_user)):
    friendship = await db.friends.find_one({"friendship_id": friendship_id}, {"_id": 0})
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    if friendship["user_id"] != current_user.user_id and friendship["friend_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.friends.delete_one({"friendship_id": friendship_id})
    return {"message": "Friend removed"}

@router.get("/users/search")
async def search_users(q: str, current_user: User = Depends(get_current_user)):
    """Search users by username only (privacy)"""
    if len(q) < 2:
        return []
    results = await db.users.find(
        {"username": {"$regex": q, "$options": "i"}},
        {"_id": 0, "password_hash": 0}
    ).limit(20).to_list(20)
    # Exclude self, return public fields
    return [
        {"user_id": u["user_id"], "name": u["name"], "username": u.get("username"),
         "picture": u.get("picture"), "bio": u.get("bio")}
        for u in results if u["user_id"] != current_user.user_id
    ]

@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
    """Get a user's public profile"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check friendship status
    friendship = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": user_id},
            {"user_id": user_id, "friend_id": current_user.user_id}
        ]
    }, {"_id": 0, "friendship_id": 1, "status": 1, "user_id": 1})

    friendship_status = "none"
    friendship_id = None
    if friendship:
        friendship_id = friendship.get("friendship_id")
        if friendship["status"] == "accepted":
            friendship_status = "friends"
        elif friendship["status"] == "pending":
            friendship_status = "pending_sent" if friendship["user_id"] == current_user.user_id else "pending_received"

    is_own = user_id == current_user.user_id

    # Stats: visits, countries, continents (via aggregation)
    stats_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "landmarks", "localField": "landmark_id", "foreignField": "landmark_id",
            "as": "lm", "pipeline": [{"$project": {"_id": 0, "country_name": 1, "continent": 1}}]
        }},
        {"$unwind": {"path": "$lm", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "total_visits": {"$sum": 1},
            "countries": {"$addToSet": "$lm.country_name"},
            "continents": {"$addToSet": "$lm.continent"},
        }}
    ]
    stats_result = await db.visits.aggregate(stats_pipeline).to_list(1)
    stats = stats_result[0] if stats_result else {"total_visits": 0, "countries": [], "continents": []}

    # Recent public visits (limit 5)
    privacy_filter = {"user_id": user_id}
    if not is_own and friendship_status != "friends":
        privacy_filter["visibility"] = "public"
    elif not is_own:
        privacy_filter["visibility"] = {"$in": ["public", "friends"]}

    recent_visits = await db.visits.find(
        privacy_filter, {"_id": 0, "visit_id": 1, "landmark_id": 1, "landmark_name": 1, "visited_at": 1, "photos": {"$slice": 1}}
    ).sort("visited_at", -1).limit(5).to_list(5)

    friends_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    })

    return {
        "user_id": user["user_id"],
        "name": user.get("name", "Unknown"),
        "username": user.get("username"),
        "picture": user.get("picture"),
        "bio": user.get("bio"),
        "location": user.get("location"),
        "banner_image": user.get("banner_image"),
        "is_premium": user.get("is_premium", False),
        "points": user.get("points", 0),
        "leaderboard_points": user.get("leaderboard_points", 0),
        "created_at": user.get("created_at"),
        "friendship_status": friendship_status,
        "friendship_id": friendship_id,
        "is_own_profile": is_own,
        "stats": {
            "total_visits": stats["total_visits"],
            "countries_visited": len([c for c in stats["countries"] if c]),
            "continents_visited": len([c for c in stats["continents"] if c]),
            "friends_count": friends_count,
        },
        "recent_visits": [
            {"visit_id": v["visit_id"], "landmark_id": v.get("landmark_id"), "landmark_name": v.get("landmark_name"),
             "visited_at": v.get("visited_at"), "photo_url": v["photos"][0] if v.get("photos") else None,
             "has_diary": bool(v.get("diary_notes")), "country_name": v.get("country_name")}
            for v in recent_visits
        ],
        "comment_permission": user.get("comment_permission", "everyone"),
    }

@router.get("/users/{user_id}/visits")
async def get_user_all_visits(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """Get all visits from a user with privacy filtering and pagination"""
    is_own = user_id == current_user.user_id
    
    # Determine visibility filter
    if is_own:
        vis_filter = {}
    else:
        # Check friendship
        friendship = await db.friends.find_one({
            "status": "accepted",
            "$or": [
                {"user_id": current_user.user_id, "friend_id": user_id},
                {"user_id": user_id, "friend_id": current_user.user_id}
            ]
        })
        is_friend = friendship is not None
        
        if is_friend:
            vis_filter = {"visibility": {"$in": ["public", "friends"]}}
        else:
            vis_filter = {"visibility": "public"}
    
    query = {"user_id": user_id, **vis_filter}
    total = await db.visits.count_documents(query)
    visits = await db.visits.find(
        query, {"_id": 0}
    ).sort("visited_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "visits": [
            {
                "visit_id": v["visit_id"],
                "landmark_id": v.get("landmark_id"),
                "landmark_name": v.get("landmark_name"),
                "country_name": v.get("country_name"),
                "visited_at": v.get("visited_at"),
                "photo_url": v["photos"][0] if v.get("photos") else None,
                "has_diary": bool(v.get("diary_notes")),
                "points_earned": v.get("points_earned", 0),
                "visibility": v.get("visibility", "public"),
            }
            for v in visits
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """Get a user's activity stream with privacy filtering"""
    is_own = user_id == current_user.user_id
    
    if is_own:
        vis_filter = {}
    else:
        friendship = await db.friends.find_one({
            "status": "accepted",
            "$or": [
                {"user_id": current_user.user_id, "friend_id": user_id},
                {"user_id": user_id, "friend_id": current_user.user_id}
            ]
        })
        is_friend = friendship is not None
        if is_friend:
            vis_filter = {"visibility": {"$in": ["public", "friends"]}}
        else:
            vis_filter = {"visibility": "public"}
    
    query = {"user_id": user_id, **vis_filter}
    total = await db.activities.count_documents(query)
    
    pipeline = [
        {"$match": query},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$lookup": {
            "from": "activity_likes",
            "localField": "activity_id",
            "foreignField": "activity_id",
            "as": "likes"
        }},
        {"$lookup": {
            "from": "comments",
            "localField": "activity_id",
            "foreignField": "activity_id",
            "as": "comments_list"
        }},
        {"$addFields": {
            "like_count": {"$size": "$likes"},
            "comments_count": {"$size": "$comments_list"},
            "is_liked": {"$in": [current_user.user_id, "$likes.user_id"]}
        }},
        {"$project": {
            "_id": 0,
            "activity_id": 1,
            "activity_type": 1,
            "description": {"$ifNull": [
                "$description",
                {"$concat": ["Visited ", {"$ifNull": ["$landmark_name", "a landmark"]}]}
            ]},
            "landmark_name": 1,
            "country_name": 1,
            "points_earned": 1,
            "has_diary": 1,
            "has_photos": 1,
            "like_count": 1,
            "comments_count": 1,
            "is_liked": 1,
            "created_at": 1,
        }}
    ]
    
    activities = await db.activities.aggregate(pipeline).to_list(limit)
    
    return {
        "activities": activities,
        "total": total,
        "skip": skip,
        "limit": limit,
    }
