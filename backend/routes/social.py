from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, get_user_limits
from models.all import (
    User, UserPublic, Friend, FriendRequest, Message, MessageCreate,
    Activity, Comment, CommentCreate,
)
from utils.helpers import check_and_award_badges, create_notification


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
    """Search users by name or username"""
    if len(q) < 2:
        return []
    results = await db.users.find(
        {"$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]},
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

# ============= MESSAGING ENDPOINTS (Basic+ Only) =============

@router.get("/messages/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Get conversations list with last message and unread count — single optimized query"""
    if current_user.subscription_tier == "free":
        raise HTTPException(status_code=403, detail="Messaging is a premium feature.")

    # Get friend list
    friendships = await db.friends.find({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)

    friend_ids = []
    for f in friendships:
        friend_ids.append(f["friend_id"] if f["user_id"] == current_user.user_id else f["user_id"])

    if not friend_ids:
        return []

    # Batch fetch friend info
    friends_docs = await db.users.find(
        {"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "username": 1}
    ).to_list(len(friend_ids))
    friend_map = {f["user_id"]: f for f in friends_docs}

    # Aggregation: get last message + unread count per friend in one pipeline
    pipeline = [
        {"$match": {"$or": [
            {"sender_id": current_user.user_id, "receiver_id": {"$in": friend_ids}},
            {"receiver_id": current_user.user_id, "sender_id": {"$in": friend_ids}}
        ]}},
        {"$addFields": {
            "friend_id": {"$cond": [
                {"$eq": ["$sender_id", current_user.user_id]},
                "$receiver_id", "$sender_id"
            ]}
        }},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$friend_id",
            "last_message": {"$first": "$content"},
            "last_message_time": {"$first": "$created_at"},
            "last_sender_id": {"$first": "$sender_id"},
            "unread_count": {"$sum": {"$cond": [
                {"$and": [
                    {"$ne": ["$sender_id", current_user.user_id]},
                    {"$eq": [{"$ifNull": ["$read", False]}, False]}
                ]}, 1, 0
            ]}}
        }}
    ]
    msg_results = await db.messages.aggregate(pipeline).to_list(len(friend_ids))
    msg_map = {r["_id"]: r for r in msg_results}

    conversations = []
    for fid in friend_ids:
        friend = friend_map.get(fid)
        if not friend:
            continue
        msg = msg_map.get(fid, {})
        conversations.append({
            "friend": friend,
            "last_message": msg.get("last_message"),
            "last_message_time": msg.get("last_message_time"),
            "unread_count": msg.get("unread_count", 0),
        })

    # Sort: conversations with messages first (by time), then without
    conversations.sort(key=lambda c: c.get("last_message_time") or datetime.min, reverse=True)
    return conversations

@router.post("/messages", response_model=Message)
async def send_message(data: MessageCreate, current_user: User = Depends(get_current_user)):
    """Send a message to a friend - Basic and Premium only"""
    # Check if user has messaging access
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Messaging is a premium feature. Upgrade to Basic or Premium to chat with friends!"
        )
    
    # Verify users are friends
    friendship = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": data.receiver_id, "status": "accepted"},
            {"user_id": data.receiver_id, "friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    if not friendship:
        raise HTTPException(status_code=403, detail="You can only message friends")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message = {
        "message_id": message_id,
        "sender_id": current_user.user_id,
        "receiver_id": data.receiver_id,
        "content": data.content,
        "image_base64": data.image_base64,  # Store image if provided
        "created_at": datetime.now(timezone.utc),
        "read": False
    }
    
    await db.messages.insert_one(message)
    return Message(**message)

@router.get("/messages/{friend_id}")
async def get_messages(friend_id: str, current_user: User = Depends(get_current_user)):
    """Get message history with a friend - Basic and Premium only"""
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Messaging is a premium feature. Upgrade to Basic or Premium to chat with friends!"
        )
    
    # Verify friendship
    friendship = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": friend_id, "status": "accepted"},
            {"user_id": friend_id, "friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    if not friendship:
        raise HTTPException(status_code=403, detail="You can only view messages with friends")
    
    # Get messages between the two users
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user.user_id, "receiver_id": friend_id},
            {"sender_id": friend_id, "receiver_id": current_user.user_id}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    return [Message(**m) for m in messages]

# ============= STATS ENDPOINT =============

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    # Use aggregation pipeline instead of loading all data into memory
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "points": 1, "leaderboard_points": 1})
    
    # Single aggregation: visits → lookup landmarks → get unique countries/continents
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "landmark",
            "pipeline": [{"$project": {"country_name": 1, "continent": 1}}]
        }},
        {"$unwind": {"path": "$landmark", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": None,
            "total_visits": {"$sum": 1},
            "countries": {"$addToSet": "$landmark.country_name"},
            "continents": {"$addToSet": "$landmark.continent"},
        }}
    ]
    
    result = await db.visits.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"total_visits": 0, "countries": [], "continents": []}
    
    # Count friends
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    return {
        "total_visits": stats["total_visits"],
        "countries_visited": len([c for c in stats.get("countries", []) if c]),
        "continents_visited": len([c for c in stats.get("continents", []) if c]),
        "friends_count": friend_count,
        "points": user.get("points", 0) if user else 0,
        "leaderboard_points": user.get("leaderboard_points", 0) if user else 0
    }

# ============= PROGRESS STATISTICS ENDPOINT =============

@router.get("/progress")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive progress statistics for user - optimized with aggregation"""
    
    # Get user's visited landmark IDs and total points in one query
    visits_pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$group": {
            "_id": None,
            "landmark_ids": {"$addToSet": "$landmark_id"},
            "total_points": {"$sum": {"$ifNull": ["$points_earned", 10]}},
            "visited_count": {"$sum": 1}
        }}
    ]
    visits_result = await db.visits.aggregate(visits_pipeline).to_list(1)
    
    if not visits_result:
        # No visits — return empty progress (use aggregation, not N+1)
        all_countries = await db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}).to_list(100)
        
        # Single aggregation to get landmark count per country
        country_lm_pipeline = [
            {"$group": {"_id": "$country_id", "count": {"$sum": 1}}}
        ]
        country_lm_stats = await db.landmarks.aggregate(country_lm_pipeline).to_list(200)
        lm_count_map = {s["_id"]: s["count"] for s in country_lm_stats}
        all_landmark_count = sum(lm_count_map.values())
        
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
                "total": lm_count_map.get(country["country_id"], 0),
                "percentage": 0
            }
        
        return {
            "overall": {"visited": 0, "total": all_landmark_count, "percentage": 0},
            "totalPoints": 0,
            "continents": continental_progress,
            "countries": country_progress
        }
    
    visited_landmark_ids = set(visits_result[0]["landmark_ids"])
    total_points = visits_result[0]["total_points"]
    visited_count = visits_result[0]["visited_count"]
    
    # Use aggregation to compute per-country stats (landmarks per country, how many visited)
    country_stats_pipeline = [
        {"$group": {
            "_id": "$country_id",
            "total_landmarks": {"$sum": 1},
            "landmark_ids": {"$push": "$landmark_id"}
        }}
    ]
    country_landmark_stats = await db.landmarks.aggregate(country_stats_pipeline).to_list(200)
    country_landmark_map = {s["_id"]: s for s in country_landmark_stats}
    
    # Get total landmarks count
    total_landmarks = sum(s["total_landmarks"] for s in country_landmark_stats)
    overall_percentage = round((visited_count / total_landmarks * 100) if total_landmarks > 0 else 0, 1)
    
    # Get all countries
    all_countries = await db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}).to_list(100)
    
    continental_progress = {}
    country_progress = {}
    
    for country in all_countries:
        country_id = country["country_id"]
        continent = country["continent"]
        stats = country_landmark_map.get(country_id, {"total_landmarks": 0, "landmark_ids": []})
        
        total = stats["total_landmarks"]
        visited = sum(1 for lid in stats["landmark_ids"] if lid in visited_landmark_ids)
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
    
    # Calculate continental percentages
    for continent_data in continental_progress.values():
        if continent_data["total"] > 0:
            continent_data["percentage"] = round(
                continent_data["visited"] / continent_data["total"] * 100, 1
            )
    
    return {
        "overall": {
            "visited": len(visited_landmark_ids),
            "total": total_landmarks,
            "percentage": overall_percentage
        },
        "totalPoints": total_points,
        "continents": continental_progress,
        "countries": country_progress
    }

# ============= ACTIVITY FEED & SOCIAL ENDPOINTS =============

@router.get("/feed", response_model=List[Activity])
async def get_activity_feed(current_user: User = Depends(get_current_user), limit: int = 50):
    """Get activity feed from friends with privacy filtering - optimized with aggregation"""

    # Get all accepted friends (single query, lightweight projection)
    friendships = await db.friends.find({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    }, {"_id": 0, "user_id": 1, "friend_id": 1}).to_list(1000)

    friend_ids = []
    for f in friendships:
        friend_ids.append(f["friend_id"] if f["user_id"] == current_user.user_id else f["user_id"])

    # Privacy filter
    privacy_filter = {
        "$or": [
            {"user_id": current_user.user_id},
            {
                "user_id": {"$in": friend_ids},
                "$or": [
                    {"visibility": "public"},
                    {"visibility": "friends"},
                    {"visibility": {"$exists": False}}
                ]
            }
        ]
    }

    # Single aggregation pipeline: replaces N+1 individual queries
    pipeline = [
        {"$match": privacy_filter},
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
        # Lookup user info (for activities missing user_name)
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "_user",
            "pipeline": [{"$project": {"_id": 0, "name": 1, "picture": 1}}]
        }},
        # Lookup likes
        {"$lookup": {
            "from": "likes",
            "localField": "activity_id",
            "foreignField": "activity_id",
            "as": "_likes",
            "pipeline": [{"$project": {"_id": 0, "user_id": 1}}]
        }},
        # Lookup comments count
        {"$lookup": {
            "from": "comments",
            "localField": "activity_id",
            "foreignField": "activity_id",
            "as": "_comments",
            "pipeline": [{"$project": {"_id": 0, "comment_id": 1}}]
        }},
        # Lookup visit photos
        {"$lookup": {
            "from": "visits",
            "localField": "visit_id",
            "foreignField": "visit_id",
            "as": "_visit",
            "pipeline": [
                {"$match": {"photos": {"$exists": True, "$ne": []}}},
                {"$project": {"_id": 0, "photos": {"$slice": ["$photos", 1]}}}
            ]
        }},
        # Project final shape
        {"$project": {
            "_id": 0,
            "activity_id": 1,
            "user_id": 1,
            "user_name": {
                "$ifNull": [
                    "$user_name",
                    {"$ifNull": [{"$arrayElemAt": ["$_user.name", 0]}, "Unknown User"]}
                ]
            },
            "user_picture": {
                "$ifNull": [
                    "$user_picture",
                    {"$arrayElemAt": ["$_user.picture", 0]}
                ]
            },
            "activity_type": 1,
            "landmark_id": 1,
            "landmark_name": 1,
            "landmark_image": 1,
            "country_id": 1,
            "country_name": 1,
            "continent": 1,
            "countries_count": 1,
            "landmarks_count": 1,
            "points_earned": 1,
            "milestone_count": 1,
            "visit_id": 1,
            "has_diary": 1,
            "has_photos": 1,
            "photo_count": 1,
            "photo_url": {
                "$cond": {
                    "if": {"$and": [
                        {"$eq": ["$has_photos", True]},
                        {"$gt": [{"$size": "$_visit"}, 0]}
                    ]},
                    "then": {"$arrayElemAt": [{"$arrayElemAt": ["$_visit.photos", 0]}, 0]},
                    "else": None
                }
            },
            "visibility": 1,
            "created_at": 1,
            "likes_count": {"$size": "$_likes"},
            "comments_count": {"$size": "$_comments"},
            "is_liked": {"$in": [current_user.user_id, "$_likes.user_id"]}
        }}
    ]

    activities = await db.activities.aggregate(pipeline).to_list(limit)

    result = []
    for a in activities:
        if not a.get("user_name"):
            a["user_name"] = "Unknown User"
        try:
            result.append(Activity(**a))
        except Exception as e:
            logging.warning(f"Error processing activity {a.get('activity_id')}: {e}")
            continue

    return result

@router.post("/activities/{activity_id}/like")
async def like_activity(activity_id: str, current_user: User = Depends(get_current_user)):
    """Like an activity"""
    
    # Check if activity exists
    activity = await db.activities.find_one({"activity_id": activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if already liked
    existing_like = await db.likes.find_one({
        "activity_id": activity_id,
        "user_id": current_user.user_id
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")
    
    # Create like
    like_id = f"like_{uuid.uuid4().hex[:12]}"
    like = {
        "like_id": like_id,
        "user_id": current_user.user_id,
        "activity_id": activity_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.likes.insert_one(like)
    
    # Create notification for activity owner (if not liking own activity)
    if activity["user_id"] != current_user.user_id:
        await create_notification(
            user_id=activity["user_id"],
            notif_type="like",
            title="New Like",
            message=f"{current_user.name} liked your visit",
            related_id=activity_id,
            related_user_id=current_user.user_id,
            related_user_name=current_user.name
        )
    
    return {"message": "Liked"}

@router.delete("/activities/{activity_id}/like")
async def unlike_activity(activity_id: str, current_user: User = Depends(get_current_user)):
    """Unlike an activity"""
    
    result = await db.likes.delete_one({
        "activity_id": activity_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    
    return {"message": "Unliked"}

@router.get("/activities/{activity_id}/likes")
async def get_activity_likes(activity_id: str, current_user: User = Depends(get_current_user)):
    """Get list of users who liked an activity"""
    
    likes = await db.likes.find({"activity_id": activity_id}).to_list(1000)
    
    # Get user details for each like
    user_ids = [like["user_id"] for like in likes]
    users = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
    ).to_list(1000)
    
    return {
        "count": len(likes),
        "users": users
    }

@router.post("/activities/{activity_id}/comment", response_model=Comment)
async def add_comment(activity_id: str, data: CommentCreate, current_user: User = Depends(get_current_user)):
    """Add a comment to an activity"""
    
    # Check if activity exists
    activity = await db.activities.find_one({"activity_id": activity_id})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check comment_permission of activity owner
    if activity["user_id"] != current_user.user_id:
        owner = await db.users.find_one({"user_id": activity["user_id"]}, {"_id": 0, "comment_permission": 1})
        perm = (owner or {}).get("comment_permission", "everyone")
        if perm == "nobody":
            raise HTTPException(status_code=403, detail="This user has disabled comments")
        if perm == "friends":
            friendship = await db.friends.find_one({
                "status": "accepted",
                "$or": [
                    {"user_id": current_user.user_id, "friend_id": activity["user_id"]},
                    {"user_id": activity["user_id"], "friend_id": current_user.user_id}
                ]
            })
            if not friendship:
                raise HTTPException(status_code=403, detail="Only friends can comment on this content")
    
    # If this is a reply, get parent comment details
    reply_to_user = None
    if data.parent_comment_id:
        parent_comment = await db.comments.find_one({"comment_id": data.parent_comment_id})
        if parent_comment:
            reply_to_user = parent_comment.get("user_name")
    
    comment_id = f"comment_{uuid.uuid4().hex[:12]}"
    comment = {
        "comment_id": comment_id,
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "content": data.content,
        "parent_comment_id": data.parent_comment_id,
        "reply_to_user": reply_to_user,
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0
    }
    
    await db.comments.insert_one(comment)
    
    # Update activity comments_count
    await db.activities.update_one(
        {"activity_id": activity_id},
        {"$inc": {"comments_count": 1}}
    )
    
    # Create notifications
    if data.parent_comment_id:
        # This is a reply - notify parent comment owner
        parent_comment = await db.comments.find_one({"comment_id": data.parent_comment_id})
        if parent_comment and parent_comment["user_id"] != current_user.user_id:
            await create_notification(
                user_id=parent_comment["user_id"],
                notif_type="reply",
                title="New Reply",
                message=f"{current_user.name} replied to your comment",
                related_id=activity_id,
                related_user_id=current_user.user_id,
                related_user_name=current_user.name
            )
    else:
        # This is a comment - notify activity owner
        if activity["user_id"] != current_user.user_id:
            await create_notification(
                user_id=activity["user_id"],
                notif_type="comment",
                title="New Comment",
                message=f"{current_user.name} commented on your visit",
                related_id=activity_id,
                related_user_id=current_user.user_id,
                related_user_name=current_user.name
            )
    
    return Comment(**comment, is_liked=False)

@router.get("/activities/{activity_id}/comments", response_model=List[Comment])
async def get_activity_comments(activity_id: str, current_user: User = Depends(get_current_user)):
    """Get comments for an activity"""
    
    comments = await db.comments.find({"activity_id": activity_id}).sort("created_at", 1).to_list(1000)
    
    # Check which comments current user has liked
    comment_ids = [c["comment_id"] for c in comments]
    user_comment_likes = await db.comment_likes.find({
        "comment_id": {"$in": comment_ids},
        "user_id": current_user.user_id
    }).to_list(1000)
    
    liked_comment_ids = {like["comment_id"] for like in user_comment_likes}
    
    # Add is_liked flag
    result_comments = []
    for comment in comments:
        comment["is_liked"] = comment["comment_id"] in liked_comment_ids
        result_comments.append(Comment(**comment))
    
    return result_comments

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    """Delete a comment (only own comments)"""
    
    comment = await db.comments.find_one({"comment_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user owns the comment
    if comment["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Can only delete your own comments")
    
    # Delete the comment
    await db.comments.delete_one({"comment_id": comment_id})
    
    # Update activity comments_count
    await db.activities.update_one(
        {"activity_id": comment["activity_id"]},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}

@router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    """Like a comment"""
    
    comment = await db.comments.find_one({"comment_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if already liked
    existing_like = await db.comment_likes.find_one({
        "comment_id": comment_id,
        "user_id": current_user.user_id
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked")
    
    # Create like
    like_id = f"comment_like_{uuid.uuid4().hex[:12]}"
    like = {
        "like_id": like_id,
        "user_id": current_user.user_id,
        "comment_id": comment_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.comment_likes.insert_one(like)
    
    # Update comment likes_count
    await db.comments.update_one(
        {"comment_id": comment_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Comment liked"}

@router.delete("/comments/{comment_id}/like")
async def unlike_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    """Unlike a comment"""
    
    result = await db.comment_likes.delete_one({
        "comment_id": comment_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    
    # Update comment likes_count
    await db.comments.update_one(
        {"comment_id": comment_id},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Comment unliked"}

# ============= END COMMENTS ENDPOINTS =============
