"""Messaging endpoints — available to all users (Free tier naturally capped by 5-friend limit)."""
from ._social_common import *
from utils.image_validate import normalize_photo

router = APIRouter()

# ============= MESSAGING ENDPOINTS =============

@router.get("/messages/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Get conversations list with last message and unread count — single optimized query.

    Available to all users. The Free tier's 5-friend cap naturally limits volume.
    """
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
    """Send a message to an accepted friend.

    Not a Pro-gated feature — the friend-count limit on Free accounts
    (max 5) already caps potential message volume to a healthy level.
    """
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
        "image_base64": normalize_photo(data.image_base64),  # Defense-in-depth: reject >5MB, auto-resize 2-5MB
        "created_at": datetime.now(timezone.utc),
        "read": False
    }
    
    await db.messages.insert_one(message)
    return Message(**message)

@router.get("/messages/{friend_id}")
async def get_messages(friend_id: str, current_user: User = Depends(get_current_user)):
    """Get message history with a friend. Available to all users (Free tier capped by 5-friend limit)."""
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
