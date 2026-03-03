from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, is_user_pro
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
        # Get visit counts
        pipeline = [
            {"$match": {**time_filter, **({"user_id": {"$in": user_filter}} if user_filter else {})}},
            {"$group": {"_id": "$user_id", "visit_count": {"$sum": 1}}},
            {"$sort": {"visit_count": -1}},
            {"$limit": limit}
        ]
        results = await db.visits.aggregate(pipeline).to_list(limit)
        
        for idx, entry in enumerate(results):
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
            if user:
                leaderboard.append({
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "picture": user.get("picture"),
                    "username": user.get("username"),
                    "value": entry["visit_count"],
                    "rank": idx + 1
                })
                if user["user_id"] == current_user.user_id:
                    user_rank = idx + 1
                    
    elif category == "countries":
        # Get unique countries visited count
        pipeline = [
            {"$match": {**time_filter, **({"user_id": {"$in": user_filter}} if user_filter else {})}},
            {"$group": {"_id": {"user_id": "$user_id", "country": "$country_name"}}},
            {"$group": {"_id": "$_id.user_id", "country_count": {"$sum": 1}}},
            {"$sort": {"country_count": -1}},
            {"$limit": limit}
        ]
        results = await db.visits.aggregate(pipeline).to_list(limit)
        
        for idx, entry in enumerate(results):
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
            if user:
                leaderboard.append({
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "picture": user.get("picture"),
                    "username": user.get("username"),
                    "value": entry["country_count"],
                    "rank": idx + 1
                })
                if user["user_id"] == current_user.user_id:
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
    
    # Get points earned this week from activities
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id", "points_this_week": {"$sum": "$points_earned"}}},
        {"$sort": {"points_this_week": -1}},
        {"$limit": limit}
    ]
    
    results = await db.activities.aggregate(pipeline).to_list(limit)
    
    rising_stars = []
    for idx, entry in enumerate(results):
        user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
        if user:
            rising_stars.append({
                "user_id": user["user_id"],
                "name": user["name"],
                "picture": user.get("picture"),
                "username": user.get("username"),
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
    
    return {"message": "Friend request accepted"}

@router.get("/friends/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    friendships = await db.friends.find({
        "friend_id": current_user.user_id,
        "status": "pending"
    }, {"_id": 0}).to_list(1000)
    
    requests = []
    for f in friendships:
        user = await db.users.find_one({"user_id": f["user_id"]}, {"_id": 0})
        if user:
            requests.append({
                "friendship_id": f["friendship_id"],
                "user": UserPublic(**user)
            })
    
    return requests

# ============= MESSAGING ENDPOINTS (Basic+ Only) =============

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
    # Get user document
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    
    # Get user's visits
    visits = await db.visits.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(1000)
    
    # Get unique countries and continents
    landmark_ids = [v["landmark_id"] for v in visits]
    landmarks = await db.landmarks.find({"landmark_id": {"$in": landmark_ids}}, {"_id": 0}).to_list(1000)
    
    countries = set(l["country_name"] for l in landmarks)
    continents = set(l["continent"] for l in landmarks)
    
    # Count friends
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    return {
        "total_visits": len(visits),
        "countries_visited": len(countries),
        "continents_visited": len(continents),
        "friends_count": friend_count,
        "points": user.get("points", 0),
        "leaderboard_points": user.get("leaderboard_points", 0)
    }

# ============= PROGRESS STATISTICS ENDPOINT =============

@router.get("/progress")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive progress statistics for user"""
    
    # Get all user's visits
    visits = await db.visits.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(10000)
    visited_landmark_ids = {v["landmark_id"] for v in visits}
    
    # Calculate total points earned
    total_points = sum(v.get("points_earned", 10) for v in visits)
    
    # Get all landmarks and countries
    all_landmarks = await db.landmarks.find({}, {"_id": 0}).to_list(10000)
    all_countries = await db.countries.find({}, {"_id": 0}).to_list(100)
    
    # Calculate overall progress
    total_landmarks = len(all_landmarks)
    visited_landmarks = len(visited_landmark_ids)
    overall_percentage = round((visited_landmarks / total_landmarks * 100) if total_landmarks > 0 else 0, 1)
    
    # Calculate continental progress
    continental_progress = {}
    continent_country_map = {}
    
    for country in all_countries:
        continent = country["continent"]
        if continent not in continent_country_map:
            continent_country_map[continent] = []
        continent_country_map[continent].append(country["country_id"])
    
    for continent, country_ids in continent_country_map.items():
        # Count countries in this continent
        total_countries = len(country_ids)
        
        # Count visited countries in this continent
        visited_countries = set()
        for landmark in all_landmarks:
            if landmark["country_id"] in country_ids and landmark["landmark_id"] in visited_landmark_ids:
                visited_countries.add(landmark["country_id"])
        
        visited_count = len(visited_countries)
        percentage = round((visited_count / total_countries * 100) if total_countries > 0 else 0, 1)
        
        continental_progress[continent] = {
            "visited": visited_count,
            "total": total_countries,
            "percentage": percentage
        }
    
    # Calculate per-country progress
    country_progress = {}
    for country in all_countries:
        country_id = country["country_id"]
        country_landmarks = [l for l in all_landmarks if l["country_id"] == country_id]
        total = len(country_landmarks)
        visited = sum(1 for l in country_landmarks if l["landmark_id"] in visited_landmark_ids)
        percentage = round((visited / total * 100) if total > 0 else 0, 1)
        
        country_progress[country_id] = {
            "country_name": country["name"],
            "continent": country["continent"],
            "visited": visited,
            "total": total,
            "percentage": percentage
        }
    
    return {
        "overall": {
            "visited": visited_landmarks,
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
    """Get activity feed from friends with privacy filtering"""
    
    # Get all accepted friends
    friendships = await db.friends.find({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    }).to_list(1000)
    
    # Extract friend IDs
    friend_ids = []
    for friendship in friendships:
        if friendship["user_id"] == current_user.user_id:
            friend_ids.append(friendship["friend_id"])
        else:
            friend_ids.append(friendship["user_id"])
    
    # Privacy filtering query:
    # - Show all own activities (any visibility)
    # - Show friends' activities that are "public" or "friends"
    # - Never show "private" activities from others
    privacy_filter = {
        "$or": [
            # Own activities - show all
            {"user_id": current_user.user_id},
            # Friends' public activities
            {
                "user_id": {"$in": friend_ids},
                "$or": [
                    {"visibility": "public"},
                    {"visibility": "friends"},
                    {"visibility": {"$exists": False}}  # Legacy activities without visibility
                ]
            }
        ]
    }
    
    # Get activities with privacy filter, sorted by recent
    activities = await db.activities.find(privacy_filter).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich activities with like and comment counts, and check if current user liked
    enriched_activities = []
    for activity in activities:
        # Skip activities missing required fields
        if not activity.get("user_name"):
            # Try to get user_name from user_id
            user = await db.users.find_one({"user_id": activity.get("user_id")})
            if user:
                activity["user_name"] = user.get("name", "Unknown User")
                activity["user_picture"] = user.get("picture")
            else:
                activity["user_name"] = "Unknown User"
        
        # Get likes count
        likes_count = await db.likes.count_documents({"activity_id": activity["activity_id"]})
        
        # Check if current user liked this
        user_like = await db.likes.find_one({
            "activity_id": activity["activity_id"],
            "user_id": current_user.user_id
        })
        
        # Get comments count
        comments_count = await db.comments.count_documents({"activity_id": activity["activity_id"]})
        
        # Get first photo URL from associated visit
        photo_url = None
        if activity.get("has_photos") and activity.get("visit_id"):
            visit = await db.visits.find_one(
                {"visit_id": activity["visit_id"], "photos": {"$exists": True, "$ne": []}},
                {"photos": {"$slice": 1}, "_id": 0}
            )
            if visit and visit.get("photos"):
                photo_url = visit["photos"][0]
        
        activity["photo_url"] = photo_url
        activity["likes_count"] = likes_count
        activity["comments_count"] = comments_count
        activity["is_liked"] = bool(user_like)
        
        try:
            enriched_activities.append(Activity(**activity))
        except Exception as e:
            # Log the error but continue processing other activities
            print(f"Error processing activity {activity.get('activity_id')}: {e}")
            continue
    
    return enriched_activities

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
