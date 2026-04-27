"""Activity feed, likes, and comments endpoints."""
from ._social_common import *

router = APIRouter()

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
        "hidden": {"$ne": True},
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
    
    comments = await db.comments.find({"activity_id": activity_id, "hidden": {"$ne": True}}).sort("created_at", 1).to_list(1000)
    
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
