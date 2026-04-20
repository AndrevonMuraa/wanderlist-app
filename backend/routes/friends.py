"""Friends, user search, and user profile endpoints."""
from ._social_common import *
from fastapi import Query

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
    
    # Check if either user has blocked the other
    block = await db.blocks.find_one({
        "$or": [
            {"blocker_id": current_user.user_id, "blocked_id": friend["user_id"]},
            {"blocker_id": friend["user_id"], "blocked_id": current_user.user_id}
        ]
    })
    if block:
        raise HTTPException(status_code=403, detail="Unable to send friend request")
    
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


# ============= BLOCK ENDPOINTS =============

@router.post("/users/{user_id}/block")
async def block_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Block a user — removes any friendship and prevents future requests"""
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    existing = await db.blocks.find_one({
        "blocker_id": current_user.user_id, "blocked_id": user_id
    }, {"_id": 0})
    if existing:
        return {"message": "User already blocked"}
    
    # Remove any existing friendship
    await db.friends.delete_many({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": user_id},
            {"user_id": user_id, "friend_id": current_user.user_id}
        ]
    })
    
    await db.blocks.insert_one({
        "blocker_id": current_user.user_id,
        "blocked_id": user_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"message": "User blocked"}

@router.delete("/users/{user_id}/block")
async def unblock_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Unblock a user"""
    result = await db.blocks.delete_one({
        "blocker_id": current_user.user_id, "blocked_id": user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not blocked")
    return {"message": "User unblocked"}

@router.get("/blocked-users")
async def get_blocked_users(current_user: User = Depends(get_current_user)):
    """Get list of blocked users"""
    blocks = await db.blocks.find(
        {"blocker_id": current_user.user_id}, {"_id": 0}
    ).to_list(200)
    
    if not blocks:
        return []
    
    blocked_ids = [b["blocked_id"] for b in blocks]
    users = await db.users.find(
        {"user_id": {"$in": blocked_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1}
    ).to_list(200)
    
    return users


@router.get("/users/search")
async def search_users(q: str, current_user: User = Depends(get_current_user)):
    """Search users by username only (privacy)"""
    if len(q) < 2:
        return []
    
    # Get blocked user IDs (both directions)
    blocks = await db.blocks.find({
        "$or": [
            {"blocker_id": current_user.user_id},
            {"blocked_id": current_user.user_id}
        ]
    }, {"_id": 0, "blocker_id": 1, "blocked_id": 1}).to_list(200)
    blocked_ids = set()
    for b in blocks:
        blocked_ids.add(b["blocker_id"])
        blocked_ids.add(b["blocked_id"])
    blocked_ids.discard(current_user.user_id)
    
    results = await db.users.find(
        {"username": {"$regex": q, "$options": "i"}},
        {"_id": 0, "password_hash": 0}
    ).limit(20).to_list(20)
    return [
        {"user_id": u["user_id"], "name": u["name"], "username": u.get("username"),
         "picture": u.get("picture"), "bio": u.get("bio")}
        for u in results if u["user_id"] != current_user.user_id and u["user_id"] not in blocked_ids
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

    # Check block status
    is_blocked_by_me = False
    is_blocked_by_them = False
    if not is_own:
        my_block = await db.blocks.find_one({"blocker_id": current_user.user_id, "blocked_id": user_id}, {"_id": 0})
        their_block = await db.blocks.find_one({"blocker_id": user_id, "blocked_id": current_user.user_id}, {"_id": 0})
        is_blocked_by_me = my_block is not None
        is_blocked_by_them = their_block is not None
    
    # If blocked by them, show minimal profile
    if is_blocked_by_them:
        return {
            "user_id": user["user_id"],
            "name": user.get("name", "Unknown"),
            "username": user.get("username"),
            "picture": user.get("picture"),
            "is_premium": False,
            "points": 0,
            "leaderboard_points": 0,
            "friendship_status": "none",
            "is_own_profile": False,
            "is_blocked_by_me": is_blocked_by_me,
            "stats": {"total_visits": 0, "countries_visited": 0, "continents_visited": 0, "friends_count": 0},
            "recent_visits": [],
            "destinations_explored": [],
        }

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

    # Get destinations explored (country visits with landmark counts)
    country_visits = await db.country_visits.find(
        {"user_id": user_id},
        {"_id": 0, "country_id": 1, "country_name": 1}
    ).sort("visited_at", -1).to_list(100)
    
    destinations_explored = []
    seen_countries = set()
    for cv in country_visits:
        cid = cv.get("country_id", "")
        if cid in seen_countries:
            continue
        seen_countries.add(cid)
        lm_count = await db.visits.count_documents({"user_id": user_id, "landmark_id": {"$regex": f"^{cid}_"}})
        destinations_explored.append({
            "country_id": cid,
            "country_name": cv.get("country_name", "Unknown"),
            "landmarks_visited": lm_count,
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
        "is_blocked_by_me": is_blocked_by_me,
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
        "destinations_explored": destinations_explored,
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


# ============= OVERLAP / "WE'VE BOTH BEEN HERE" ENDPOINTS =============

async def _assert_friends_or_self(current_user_id: str, other_user_id: str) -> bool:
    """Return True if the two users are the same person or accepted friends."""
    if current_user_id == other_user_id:
        return True
    friendship = await db.friends.find_one({
        "status": "accepted",
        "$or": [
            {"user_id": current_user_id, "friend_id": other_user_id},
            {"user_id": other_user_id, "friend_id": current_user_id},
        ],
    })
    return friendship is not None


@router.get("/users/{user_id}/overlap")
async def get_user_overlap(
    user_id: str,
    limit: int = 12,
    current_user: User = Depends(get_current_user),
):
    """Landmarks both the current user and `user_id` have visited.

    Returns a compact list (ordered by the OTHER user's most recent visit) plus
    a total count. Limited to accepted friends (or the user themselves).
    """
    if not await _assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see overlap")

    limit = max(1, min(limit, 50))

    # Intersection of landmark_ids between the two users
    my_landmarks = set(await db.visits.distinct("landmark_id", {"user_id": current_user.user_id}))
    their_landmarks = set(await db.visits.distinct("landmark_id", {"user_id": user_id}))
    shared_ids = list(my_landmarks & their_landmarks)

    if not shared_ids:
        return {"total": 0, "items": []}

    # For each shared landmark, get THEIR most recent visit + the other user's photo
    their_visits = await db.visits.find(
        {"user_id": user_id, "landmark_id": {"$in": shared_ids}},
        {"_id": 0, "landmark_id": 1, "landmark_name": 1, "visited_at": 1,
         "photos": {"$slice": 1}, "country_name": 1}
    ).sort("visited_at", -1).to_list(len(shared_ids))

    # Current user's own visits to the same landmarks
    my_visits_raw = await db.visits.find(
        {"user_id": current_user.user_id, "landmark_id": {"$in": shared_ids}},
        {"_id": 0, "landmark_id": 1, "visited_at": 1, "photos": {"$slice": 1}}
    ).to_list(len(shared_ids))
    my_visits = {v["landmark_id"]: v for v in my_visits_raw}

    items = []
    for v in their_visits[:limit]:
        lid = v["landmark_id"]
        mine = my_visits.get(lid, {})
        items.append({
            "landmark_id": lid,
            "landmark_name": v.get("landmark_name"),
            "country_name": v.get("country_name"),
            "their_photo_url": v["photos"][0] if v.get("photos") else None,
            "their_visited_at": v.get("visited_at"),
            "my_photo_url": mine["photos"][0] if mine.get("photos") else None,
            "my_visited_at": mine.get("visited_at"),
        })

    return {"total": len(shared_ids), "items": items}


@router.get("/landmarks/{landmark_id}/friends-visited")
async def get_friends_who_visited_landmark(
    landmark_id: str,
    limit: int = 6,
    current_user: User = Depends(get_current_user),
):
    """Friends of the current user who have also visited this landmark.

    Powers the "Anna and Ola were also here" strip on a landmark page.
    """
    limit = max(1, min(limit, 20))

    friendships = await db.friends.find({
        "status": "accepted",
        "$or": [
            {"user_id": current_user.user_id},
            {"friend_id": current_user.user_id},
        ],
    }, {"_id": 0, "user_id": 1, "friend_id": 1}).to_list(2000)

    friend_ids = [
        (f["friend_id"] if f["user_id"] == current_user.user_id else f["user_id"])
        for f in friendships
    ]
    if not friend_ids:
        return {"total": 0, "friends": []}

    visited = await db.visits.find(
        {"user_id": {"$in": friend_ids}, "landmark_id": landmark_id},
        {"_id": 0, "user_id": 1, "visited_at": 1, "photos": {"$slice": 1}}
    ).sort("visited_at", -1).to_list(1000)

    # Deduplicate: most recent visit per friend
    seen = set()
    ordered = []
    for v in visited:
        if v["user_id"] in seen:
            continue
        seen.add(v["user_id"])
        ordered.append(v)

    users = {}
    if ordered:
        for u in await db.users.find(
            {"user_id": {"$in": [v["user_id"] for v in ordered]}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ).to_list(len(ordered)):
            users[u["user_id"]] = u

    friends_list = []
    for v in ordered[:limit]:
        u = users.get(v["user_id"], {})
        friends_list.append({
            "user_id": v["user_id"],
            "name": u.get("name"),
            "username": u.get("username"),
            "picture": u.get("picture"),
            "visited_at": v.get("visited_at"),
            "photo_url": v["photos"][0] if v.get("photos") else None,
        })

    return {"total": len(ordered), "friends": friends_list}


# ============= COMPARE / STATS / HUB ENDPOINTS =============

def _normalize_name(s: str) -> str:
    return (s or "").strip().lower()


async def _friend_ids(user_id: str) -> list:
    """IDs of accepted friends for a user."""
    friendships = await db.friends.find(
        {"status": "accepted", "$or": [{"user_id": user_id}, {"friend_id": user_id}]},
        {"_id": 0, "user_id": 1, "friend_id": 1},
    ).to_list(2000)
    return [
        (f["friend_id"] if f["user_id"] == user_id else f["user_id"])
        for f in friendships
    ]


async def _user_stats(user_id: str) -> dict:
    """Compute the 4 Journey-page stats for a single user."""
    agg = await db.visits.aggregate([
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "landmarks", "localField": "landmark_id", "foreignField": "landmark_id",
            "as": "lm", "pipeline": [{"$project": {"_id": 0, "country_name": 1, "continent": 1}}],
        }},
        {"$unwind": {"path": "$lm", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "landmarks": {"$sum": 1},
            "countries": {"$addToSet": "$lm.country_name"},
            "continents": {"$addToSet": "$lm.continent"},
        }},
    ]).to_list(1)
    stats = agg[0] if agg else {"landmarks": 0, "countries": [], "continents": []}
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "leaderboard_points": 1, "points": 1})
    return {
        "continents": len([c for c in stats["continents"] if c]),
        "destinations": len([c for c in stats["countries"] if c]),
        "landmarks": stats["landmarks"],
        "points": (user or {}).get("leaderboard_points") or (user or {}).get("points", 0),
    }


@router.get("/users/{user_id}/compare-stats")
async def get_compare_stats(
    user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Head-to-head Journey stats: continents / destinations / landmarks / points."""
    if not await _assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see compare stats")
    me = await _user_stats(current_user.user_id)
    friend = await _user_stats(user_id)
    return {"me": me, "friend": friend}


@router.get("/users/{user_id}/overlap/countries")
async def get_country_overlap(
    user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Destinations (countries) both users have visited — powers the flag strip."""
    if not await _assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see country overlap")
    mine = set(await db.country_visits.distinct("country_name", {"user_id": current_user.user_id}))
    theirs = set(await db.country_visits.distinct("country_name", {"user_id": user_id}))
    shared = sorted([c for c in (mine & theirs) if c])
    return {"total": len(shared), "countries": shared}


@router.get("/compare/landmarks/{landmark_id}/friends/{friend_user_id}")
async def compare_landmark_with_friend(
    landmark_id: str,
    friend_user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Side-by-side compare of both users' visits to this landmark.

    Friend's `private` visits are hidden but surfaced as `has_private_visits`.
    No time-delta computed — `visited_at` is registration timestamp only.
    """
    if not await _assert_friends_or_self(current_user.user_id, friend_user_id):
        raise HTTPException(status_code=403, detail="Only friends can compare")

    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")

    async def _visits_for(uid: str, include_private: bool):
        filt = {"user_id": uid, "landmark_id": landmark_id}
        if not include_private:
            filt["visibility"] = {"$in": ["public", "friends"]}
        visits = await db.visits.find(
            filt,
            {"_id": 0, "visit_id": 1, "visited_at": 1, "updated_at": 1,
             "photos": {"$slice": 3}, "diary_notes": 1, "visibility": 1},
        ).sort("updated_at", -1).to_list(3)
        return visits

    me_visits = await _visits_for(current_user.user_id, include_private=True)
    friend_visits = await _visits_for(friend_user_id, include_private=False)

    friend_private_count = await db.visits.count_documents({
        "user_id": friend_user_id, "landmark_id": landmark_id, "visibility": "private"
    })

    async def _user_stub(uid: str):
        u = await db.users.find_one(
            {"user_id": uid}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ) or {}
        return u

    me_user = await _user_stub(current_user.user_id)
    friend_user = await _user_stub(friend_user_id)

    return {
        "landmark": {
            "landmark_id": landmark["landmark_id"],
            "name": landmark.get("name"),
            "country_name": landmark.get("country_name"),
            "continent": landmark.get("continent"),
            "description": landmark.get("description"),
        },
        "me": {
            **me_user,
            "visits": me_visits,
            "photo_count": sum(len(v.get("photos") or []) for v in me_visits),
        },
        "friend": {
            **friend_user,
            "visits": friend_visits,
            "photo_count": sum(len(v.get("photos") or []) for v in friend_visits),
            "has_private_visits": friend_private_count > 0,
        },
    }


# ============= FRIENDS HUB ENDPOINTS =============

@router.get("/friends/leaderboard")
async def friends_leaderboard(
    metric: str = Query("points", regex="^(points|landmarks|destinations|continents)$"),
    current_user: User = Depends(get_current_user),
):
    """Ranked list of the current user + all friends by the given metric.
    Powers the "Who's leading?" card on the Friends hub."""
    friend_ids = await _friend_ids(current_user.user_id)
    all_ids = [current_user.user_id] + friend_ids

    rows = []
    users = {}
    if all_ids:
        for u in await db.users.find(
            {"user_id": {"$in": all_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ).to_list(len(all_ids)):
            users[u["user_id"]] = u

    for uid in all_ids:
        stats = await _user_stats(uid)
        u = users.get(uid, {})
        rows.append({
            "user_id": uid,
            "name": u.get("name"),
            "username": u.get("username"),
            "picture": u.get("picture"),
            "is_me": uid == current_user.user_id,
            "value": stats.get(metric, 0),
        })

    rows.sort(key=lambda r: r["value"], reverse=True)
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1
    return {"metric": metric, "rows": rows[:10]}


@router.get("/friends/shared-places")
async def friends_shared_places(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
):
    """Landmarks the current user + at least one friend have visited.
    Sorted by most friends overlapping first."""
    limit = max(1, min(limit, 30))
    friend_ids = await _friend_ids(current_user.user_id)
    if not friend_ids:
        return {"items": []}

    my_landmarks = set(await db.visits.distinct("landmark_id", {"user_id": current_user.user_id}))
    if not my_landmarks:
        return {"items": []}

    agg = await db.visits.aggregate([
        {"$match": {
            "user_id": {"$in": friend_ids},
            "landmark_id": {"$in": list(my_landmarks)},
            "visibility": {"$in": ["public", "friends"]},
        }},
        {"$group": {
            "_id": "$landmark_id",
            "friend_ids": {"$addToSet": "$user_id"},
            "any_photo": {"$first": "$photos"},
            "landmark_name": {"$first": "$landmark_name"},
            "country_name": {"$first": "$country_name"},
        }},
        {"$addFields": {"friend_count": {"$size": "$friend_ids"}}},
        {"$sort": {"friend_count": -1}},
        {"$limit": limit},
    ]).to_list(limit)

    # Enrich with friend sample info
    all_sample_ids = list({fid for row in agg for fid in row.get("friend_ids", [])[:3]})
    users = {}
    if all_sample_ids:
        for u in await db.users.find(
            {"user_id": {"$in": all_sample_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1},
        ).to_list(len(all_sample_ids)):
            users[u["user_id"]] = u

    items = []
    for row in agg:
        sample = [users.get(fid, {"user_id": fid}) for fid in (row.get("friend_ids") or [])[:3]]
        photo = (row.get("any_photo") or [None])[0]
        items.append({
            "landmark_id": row["_id"],
            "landmark_name": row.get("landmark_name"),
            "country_name": row.get("country_name"),
            "photo_url": photo,
            "friend_count": row["friend_count"],
            "friend_sample": sample,
        })
    return {"items": items}


@router.get("/friends/activity")
async def friends_activity(
    limit: int = 8,
    current_user: User = Depends(get_current_user),
):
    """Recent visits + photo uploads from your friends. Powers the activity
    strip on the Friends hub."""
    limit = max(1, min(limit, 20))
    friend_ids = await _friend_ids(current_user.user_id)
    if not friend_ids:
        return {"items": []}

    visits = await db.visits.find(
        {
            "user_id": {"$in": friend_ids},
            "visibility": {"$in": ["public", "friends"]},
        },
        {"_id": 0, "user_id": 1, "visit_id": 1, "landmark_id": 1, "landmark_name": 1,
         "country_name": 1, "updated_at": 1, "visited_at": 1, "photos": {"$slice": 1}},
    ).sort("updated_at", -1).limit(limit).to_list(limit)

    user_ids = list({v["user_id"] for v in visits})
    users = {}
    if user_ids:
        for u in await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ).to_list(len(user_ids)):
            users[u["user_id"]] = u

    items = []
    for v in visits:
        u = users.get(v["user_id"], {})
        items.append({
            "visit_id": v.get("visit_id"),
            "landmark_id": v.get("landmark_id"),
            "landmark_name": v.get("landmark_name"),
            "country_name": v.get("country_name"),
            "photo_url": (v.get("photos") or [None])[0],
            "updated_at": v.get("updated_at") or v.get("visited_at"),
            "user_id": v["user_id"],
            "user_name": u.get("name"),
            "user_username": u.get("username"),
            "user_picture": u.get("picture"),
        })
    return {"items": items}


@router.get("/friends/group-stats")
async def friends_group_stats(
    user_ids: str = Query(..., description="Comma-separated friend user IDs"),
    current_user: User = Depends(get_current_user),
):
    """Combined stats for a selected group (you + selected friends).
    Powers the basic "Group mode" overlay."""
    selected_ids = [u.strip() for u in (user_ids or "").split(",") if u.strip()]
    if len(selected_ids) > 4:
        raise HTTPException(status_code=400, detail="Max 4 friends in a group")
    for uid in selected_ids:
        if not await _assert_friends_or_self(current_user.user_id, uid):
            raise HTTPException(status_code=403, detail="Only accepted friends allowed")

    all_ids = [current_user.user_id] + selected_ids
    rows = []
    users_map = {u["user_id"]: u for u in await db.users.find(
        {"user_id": {"$in": all_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
    ).to_list(len(all_ids))}
    for uid in all_ids:
        stats = await _user_stats(uid)
        u = users_map.get(uid, {})
        rows.append({
            "user_id": uid, "name": u.get("name"), "username": u.get("username"),
            "picture": u.get("picture"), "is_me": uid == current_user.user_id,
            **stats,
        })
    return {"rows": rows}
