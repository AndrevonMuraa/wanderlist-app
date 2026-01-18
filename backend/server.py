from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    user_id: str
    email: str
    username: Optional[str] = None  # Made optional for backwards compatibility
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None  # User bio (max 200 chars)
    location: Optional[str] = None  # User location/home country
    is_premium: bool = False  # Deprecated, kept for backward compatibility
    subscription_tier: str = "free"  # "free" or "pro"
    subscription_expires_at: Optional[datetime] = None  # When pro subscription expires
    password_hash: Optional[str] = None
    current_streak: int = 0  # Current consecutive days streak
    longest_streak: int = 0  # Longest streak ever achieved
    last_visit_date: Optional[str] = None  # Last date user made a visit (YYYY-MM-DD)
    created_at: datetime

class UserPublic(BaseModel):
    user_id: str
    username: Optional[str] = None  # Made optional for backwards compatibility
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    is_premium: bool = False  # Deprecated
    subscription_tier: str = "free"  # "free" or "pro"
    default_privacy: str = "public"  # "public", "friends", "private"

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None  # Base64 image or URL
    bio: Optional[str] = None
    location: Optional[str] = None

class Badge(BaseModel):
    badge_id: str
    name: str
    description: str
    icon: str
    tier_required: str  # "free", "basic", "premium"
    created_at: datetime

class UserBadge(BaseModel):
    user_badge_id: str
    user_id: str
    badge_id: str
    earned_at: datetime
    progress: str  # e.g., "5/10"

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SessionDataResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Country(BaseModel):
    country_id: str
    name: str
    continent: str
    image_url: Optional[str] = None
    landmark_count: int = 0

class LandmarkFact(BaseModel):
    title: Optional[str] = None
    text: str
    icon: str

class Landmark(BaseModel):
    landmark_id: str
    name: str
    country_id: str
    country_name: str
    continent: str
    description: str
    category: str  # "official", "premium", or "user_suggested"
    image_url: str
    images: Optional[List[str]] = []  # Array of image URLs for gallery
    facts: Optional[List[LandmarkFact]] = []  # Historical/cultural facts
    best_time_to_visit: Optional[str] = "Year-round"
    duration: Optional[str] = "2-3 hours"
    difficulty: Optional[str] = "Easy"
    latitude: Optional[float] = None  # GPS latitude
    longitude: Optional[float] = None  # GPS longitude
    points: int = 10  # Points awarded for visiting (10 for official, 25 for premium)
    upvotes: int = 0
    created_by: Optional[str] = None
    created_at: datetime
    is_locked: bool = False  # True if premium landmark and user doesn't have access

class LandmarkCreate(BaseModel):
    name: str
    country_id: str
    description: str
    image_url: str

class Visit(BaseModel):
    visit_id: str
    user_id: str
    landmark_id: str
    photo_base64: Optional[str] = None
    photos: Optional[List[str]] = []
    points_earned: int = 10
    comments: Optional[str] = None
    visit_location: Optional[dict] = None
    diary_notes: Optional[str] = None
    travel_tips: Optional[List[str]] = []
    status: str = "accepted"
    verified: bool = True
    visibility: str = "public"  # "public", "friends", "private"
    visited_at: datetime
    created_at: datetime

class VisitCreate(BaseModel):
    landmark_id: str
    photo_base64: Optional[str] = None
    photos: Optional[List[str]] = []
    comments: Optional[str] = None
    visit_location: Optional[dict] = None
    diary_notes: Optional[str] = None
    travel_tips: Optional[List[str]] = []
    visibility: Optional[str] = "public"  # Privacy setting
    visited_at: Optional[datetime] = None

class Friend(BaseModel):
    friendship_id: str
    user_id: str
    friend_id: str
    status: str  # "pending" or "accepted"
    created_at: datetime

class FriendRequest(BaseModel):
    friend_email: Optional[str] = None  # Made optional
    friend_username: Optional[str] = None  # Added username option

class Message(BaseModel):
    message_id: str
    sender_id: str
    receiver_id: str

    content: str
    image_base64: Optional[str] = None  # Optional image attachment
    created_at: datetime
    read: bool = False

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    image_base64: Optional[str] = None  # Optional image attachment

# ============= ACTIVITY FEED & SOCIAL MODELS =============

class Activity(BaseModel):
    activity_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    activity_type: str  # "visit", "country_complete", "continent_complete", "milestone"
    landmark_id: Optional[str] = None
    landmark_name: Optional[str] = None
    landmark_image: Optional[str] = None
    country_id: Optional[str] = None
    country_name: Optional[str] = None
    continent: Optional[str] = None
    countries_count: Optional[int] = None  # For continent completion
    landmarks_count: Optional[int] = None  # For country completion
    points_earned: Optional[int] = None
    milestone_count: Optional[int] = None  # For milestone activities
    visit_id: Optional[str] = None  # Link to full visit details with rich content
    has_diary: Optional[bool] = False  # Whether visit has diary notes
    has_tips: Optional[bool] = False  # Whether visit has travel tips
    has_photos: Optional[bool] = False  # Whether visit has photos
    photo_count: Optional[int] = 0  # Number of photos in visit
    visibility: Optional[str] = "public"  # "public", "friends", "private"
    created_at: datetime
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False  # Whether current user liked this

class Like(BaseModel):
    like_id: str
    user_id: str
    activity_id: str
    created_at: datetime

class Comment(BaseModel):
    comment_id: str
    activity_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    content: str
    parent_comment_id: Optional[str] = None  # For threaded replies
    reply_to_user: Optional[str] = None  # Name of user being replied to
    created_at: datetime
    likes_count: int = 0
    is_liked: bool = False  # Whether current user liked this comment

class CommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None  # For replies

# ============= END ACTIVITY FEED MODELS =============

# ============= BUCKET LIST MODELS =============

class BucketListItem(BaseModel):
    bucket_list_id: str
    user_id: str
    landmark_id: str
    added_at: datetime
    notes: Optional[str] = None

class BucketListCreate(BaseModel):
    landmark_id: str
    notes: Optional[str] = None

# ============= END BUCKET LIST MODELS =============

# ============= USER CREATED VISIT MODELS =============

class LandmarkEntry(BaseModel):
    """A landmark with an optional photo"""
    name: str
    photo: Optional[str] = None  # Base64 image for this specific landmark

class UserCreatedVisit(BaseModel):
    user_created_visit_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    country_name: str  # Free text input
    landmarks: List[dict] = []  # List of {name: str, photo: Optional[str]} (max 10)
    photos: List[str] = []  # General country photos, max 10 (total with landmark photos: max 20)
    diary: Optional[str] = None
    visibility: str = "public"  # private, friends, public
    visited_at: datetime
    created_at: datetime

class UserCreatedVisitCreate(BaseModel):
    country_name: str  # Required - free text
    landmarks: List[dict] = []  # List of {name: str, photo: Optional[str]} (max 10)
    photos: List[str] = []  # General country photos (max 10)
    diary_notes: Optional[str] = None
    visibility: Optional[str] = "public"
    visited_at: Optional[str] = None  # ISO format date

# ============= END USER CREATED VISIT MODELS =============

# ============= COUNTRY VISIT MODELS =============

class CountryVisit(BaseModel):
    country_visit_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    country_name: str
    continent: str
    photos: List[str] = []  # Base64 images, max 10
    diary: Optional[str] = None
    visited_at: datetime
    points_earned: int = 15  # Points for country visit
    created_at: datetime

class CountryVisitCreate(BaseModel):
    country_id: str  # Country ID - backend will look up name and continent
    photos: List[str] = []  # Base64 images
    diary_notes: Optional[str] = None  # Diary entry
    visibility: Optional[str] = "public"  # Privacy setting
    visited_at: Optional[str] = None  # ISO format date

# ============= END COUNTRY VISIT MODELS =============

# ============= NOTIFICATION MODELS =============

class Notification(BaseModel):
    notification_id: str
    user_id: str  # Who receives the notification
    type: str  # "like", "comment", "reply", "friend_request", "achievement", "streak_milestone", "rank_up"
    title: str
    message: str
    related_id: Optional[str] = None  # ID of related entity (visit_id, comment_id, etc.)
    related_user_id: Optional[str] = None  # ID of user who triggered the notification
    related_user_name: Optional[str] = None  # Name of user who triggered the notification
    is_read: bool = False
    created_at: datetime

class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    related_id: Optional[str] = None
    related_user_id: Optional[str] = None
    related_user_name: Optional[str] = None

# ============= END NOTIFICATION MODELS =============

class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    total_points: int  # Changed from visit_count to total_points
    rank: int

# ============= ENHANCED FEATURES MODELS =============

class Achievement(BaseModel):
    achievement_id: str
    user_id: str
    badge_type: str  # "first_visit", "country_complete", "continent_complete", "streak_7", "milestone_10", etc.
    badge_name: str
    badge_description: str
    badge_icon: str
    earned_at: datetime
    is_featured: bool = False

class UserStreak(BaseModel):
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_visit_date: Optional[datetime] = None

class UserLevel(BaseModel):
    user_id: str
    level: int = 1  # Bronze=1, Silver=2, Gold=3, Platinum=4, Diamond=5
    level_name: str = "Bronze Traveler"
    total_points: int = 0
    visits_count: int = 0
    countries_count: int = 0
    continents_count: int = 0

class Challenge(BaseModel):
    challenge_id: str
    title: str
    description: str
    challenge_type: str  # "weekly", "monthly", "special"
    target_count: int
    target_landmarks: List[str]  # landmark_ids or "any"
    reward_points: int
    start_date: datetime
    end_date: datetime
    is_active: bool = True

class UserChallenge(BaseModel):
    user_id: str
    challenge_id: str
    progress: int = 0
    completed: bool = False
    completed_at: Optional[datetime] = None

class ActivityFeed(BaseModel):
    activity_id: str
    user_id: str
    username: str
    user_name: str
    user_picture: Optional[str] = None
    activity_type: str  # "visit", "achievement", "level_up", "friend_added"
    landmark_id: Optional[str] = None
    landmark_name: Optional[str] = None
    landmark_image: Optional[str] = None
    achievement_badge: Optional[str] = None
    content: str  # Activity description
    likes_count: int = 0
    comments_count: int = 0
    created_at: datetime

class ActivityLike(BaseModel):
    activity_id: str
    user_id: str
    created_at: datetime

class ActivityComment(BaseModel):
    comment_id: str
    activity_id: str
    user_id: str
    username: str
    user_name: str
    user_picture: Optional[str] = None
    comment_text: str
    created_at: datetime

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

# ============= SUBSCRIPTION HELPERS =============

def is_user_pro(user: "User") -> bool:
    """Check if user has an active Pro subscription"""
    if user.subscription_tier != "pro":
        return False
    
    # Check if subscription has expired
    if user.subscription_expires_at:
        expires_at = user.subscription_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return False
    
    return True

# Subscription limits
LIMITS = {
    "free": {
        "max_friends": 5,
        "photos_per_visit": 1,
        "can_access_premium_landmarks": False,
        "can_create_custom_visits": False,
    },
    "pro": {
        "max_friends": 999999,  # Effectively unlimited
        "photos_per_visit": 10,
        "can_access_premium_landmarks": True,
        "can_create_custom_visits": True,
    }
}

def get_user_limits(user: "User") -> dict:
    """Get the limits for a user based on their subscription"""
    tier = "pro" if is_user_pro(user) else "free"
    return LIMITS[tier]

async def get_current_user_from_token(token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def get_current_user_from_session(session_token: str) -> Optional[User]:
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry with timezone handling
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None) -> User:
    # Try session token from cookie first
    if session_token:
        user = await get_current_user_from_session(session_token)
        if user:
            return user
    
    # Try Authorization header (JWT)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user = await get_current_user_from_token(token)
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Not authenticated")

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    # Check if email exists
    existing_email = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists (case-insensitive)
    existing_username = await db.users.find_one({"username": {"$regex": f"^{data.username}$", "$options": "i"}}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": data.email,
        "username": data.username,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "is_premium": False,
        "subscription_tier": "free",
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user)
    
    # Create JWT token
    access_token, expires_at = create_access_token({"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(**user)
    }

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token, expires_at = create_access_token({"sub": user_doc["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(**user_doc)
    }

@api_router.post("/auth/google/callback")
async def google_callback(session_id: str, response: Response):
    # Exchange session_id for user data
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session")
        
        user_data = resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "is_premium": False,
            "password_hash": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return SessionDataResponse(
        user_id=user_id,
        email=user_data["email"],
        name=user_data["name"],
        picture=user_data.get("picture"),
        session_token=session_token
    )

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic(**current_user.dict())

@api_router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile information"""
    update_fields = {}
    
    if profile_data.name is not None:
        update_fields["name"] = profile_data.name
    
    if profile_data.picture is not None:
        update_fields["picture"] = profile_data.picture
    
    if profile_data.bio is not None:
        # Limit bio to 200 characters
        update_fields["bio"] = profile_data.bio[:200] if profile_data.bio else None
    
    if profile_data.location is not None:
        update_fields["location"] = profile_data.location
    
    if update_fields:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": update_fields}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return UserPublic(**updated_user)

@api_router.put("/auth/privacy")
async def update_default_privacy(
    privacy: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Update user's default privacy setting"""
    if privacy not in ["public", "friends", "private"]:
        raise HTTPException(status_code=400, detail="Invalid privacy setting")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"default_privacy": privacy}}
    )
    
    return {"message": "Privacy setting updated", "default_privacy": privacy}

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/temp-token")
async def get_temp_token(email: str = "mobile@test.com"):
    """Generate a temporary auto-login token for testing purposes"""
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create JWT token with 24 hour expiry for temp links
    access_token, expires_at = create_access_token({"sub": user_doc["user_id"]})
    
    return {
        "token": access_token,
        "user": UserPublic(**user_doc),
        "expires_at": expires_at.isoformat()
    }

# ============= COUNTRY & LANDMARK ENDPOINTS =============

@api_router.get("/continent-stats")
async def get_continent_stats(current_user: User = Depends(get_current_user)):
    """
    Get dynamic statistics for all continents.
    Returns landmark counts, total points, and country counts for each continent.
    This endpoint provides real-time data to keep continent cards in sync with database.
    """
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
                "countries": {"$size": "$countries"}
            }
        },
        {"$sort": {"continent": 1}}
    ]
    
    stats = await db.landmarks.aggregate(pipeline).to_list(10)
    
    # Get user's visited landmarks by continent for progress
    user_visits = await db.visits.find(
        {"user_id": current_user.user_id},
        {"landmark_id": 1}
    ).to_list(10000)
    visited_landmark_ids = [v["landmark_id"] for v in user_visits]
    
    # Get visited landmarks by continent
    if visited_landmark_ids:
        visited_pipeline = [
            {"$match": {"landmark_id": {"$in": visited_landmark_ids}}},
            {
                "$group": {
                    "_id": "$continent",
                    "visited_count": {"$sum": 1},
                    "visited_points": {"$sum": "$points"}
                }
            }
        ]
        visited_stats = await db.landmarks.aggregate(visited_pipeline).to_list(10)
        visited_by_continent = {v["_id"]: v for v in visited_stats}
    else:
        visited_by_continent = {}
    
    # Combine stats with user progress
    result = []
    for stat in stats:
        continent = stat["continent"]
        visited_data = visited_by_continent.get(continent, {})
        result.append({
            "continent": continent,
            "total_landmarks": stat["landmarks"],
            "total_points": stat["points"],
            "countries": stat["countries"],
            "visited_landmarks": visited_data.get("visited_count", 0),
            "visited_points": visited_data.get("visited_points", 0),
            "progress_percent": round((visited_data.get("visited_count", 0) / stat["landmarks"]) * 100, 1) if stat["landmarks"] > 0 else 0
        })
    
    return {
        "continents": result,
        "grand_total": {
            "landmarks": sum(s["landmarks"] for s in stats),
            "points": sum(s["points"] for s in stats),
            "countries": sum(s["countries"] for s in stats)
        }
    }

@api_router.get("/countries", response_model=List[Country])
async def get_countries(current_user: User = Depends(get_current_user)):
    countries = await db.countries.find({}, {"_id": 0}).to_list(1000)
    
    # Count ALL landmarks for each country (official + premium)
    for country in countries:
        count = await db.landmarks.count_documents({"country_id": country["country_id"]})
        country["landmark_count"] = count
    
    return [Country(**c) for c in countries]

@api_router.get("/landmarks", response_model=List[Landmark])
async def get_landmarks(
    country_id: Optional[str] = None,
    continent: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    visited: Optional[str] = None,  # "true", "false", or None (all)
    sort_by: Optional[str] = "upvotes_desc",  # upvotes_desc, points_desc, points_asc, name_asc, name_desc
    min_points: Optional[int] = None,
    max_points: Optional[int] = None,
    limit: int = 1000,
    current_user: User = Depends(get_current_user)
):
    """
    Get landmarks with advanced filtering and search
    
    Parameters:
    - country_id: Filter by country
    - continent: Filter by continent
    - category: Filter by category (free/premium)
    - search: Text search in name, description, country_name
    - visited: Filter by visit status ("true"/"false"/None)
    - sort_by: Sort order (upvotes_desc, points_desc, points_asc, name_asc, name_desc)
    - min_points, max_points: Filter by points range
    - limit: Maximum results
    """
    
    # Build query
    query = {}
    
    if country_id:
        query["country_id"] = country_id
    
    if continent:
        query["continent"] = continent
    
    if category:
        query["category"] = category
    
    # Text search
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"country_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Points range filter
    if min_points is not None or max_points is not None:
        query["points"] = {}
        if min_points is not None:
            query["points"]["$gte"] = min_points
        if max_points is not None:
            query["points"]["$lte"] = max_points
    
    # Fetch landmarks
    landmarks = await db.landmarks.find(query, {"_id": 0}).to_list(limit)
    
    # If filtering by visited status, get user's visits
    if visited is not None:
        user_visits = await db.visits.find(
            {"user_id": current_user.user_id},
            {"landmark_id": 1, "_id": 0}
        ).to_list(10000)
        visited_landmark_ids = {v["landmark_id"] for v in user_visits}
        
        if visited == "true":
            # Only visited landmarks
            landmarks = [l for l in landmarks if l["landmark_id"] in visited_landmark_ids]
        elif visited == "false":
            # Only unvisited landmarks
            landmarks = [l for l in landmarks if l["landmark_id"] not in visited_landmark_ids]
    
    # Add locked status for premium landmarks if user is free tier
    results = []
    for l in landmarks:
        landmark_dict = dict(l)
        if current_user.subscription_tier == "free" and landmark_dict.get("category") == "premium":
            landmark_dict["is_locked"] = True
        else:
            landmark_dict["is_locked"] = False
        results.append(landmark_dict)
    
    # Sort results
    if sort_by == "upvotes_desc":
        results.sort(key=lambda x: x.get("upvotes", 0), reverse=True)
    elif sort_by == "points_desc":
        results.sort(key=lambda x: x.get("points", 0), reverse=True)
    elif sort_by == "points_asc":
        results.sort(key=lambda x: x.get("points", 0))
    elif sort_by == "name_asc":
        results.sort(key=lambda x: x.get("name", ""))
    elif sort_by == "name_desc":
        results.sort(key=lambda x: x.get("name", ""), reverse=True)
    
    return [Landmark(**r) for r in results]

@api_router.get("/landmarks/{landmark_id}", response_model=Landmark)
async def get_landmark(landmark_id: str, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    return Landmark(**landmark)

@api_router.get("/landmarks/search/query")
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

@api_router.post("/landmarks", response_model=Landmark)
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

@api_router.post("/landmarks/{landmark_id}/upvote")
async def upvote_landmark(landmark_id: str, current_user: User = Depends(get_current_user)):
    # Check if already upvoted
    existing = await db.landmark_upvotes.find_one({
        "landmark_id": landmark_id,
        "user_id": current_user.user_id
    })
    
    if existing:
        # Remove upvote
        await db.landmark_upvotes.delete_one({"_id": existing["_id"]})
        await db.landmarks.update_one(
            {"landmark_id": landmark_id},
            {"$inc": {"upvotes": -1}}
        )
        return {"upvoted": False}
    else:
        # Add upvote
        await db.landmark_upvotes.insert_one({
            "landmark_id": landmark_id,
            "user_id": current_user.user_id,
            "created_at": datetime.now(timezone.utc)
        })
        await db.landmarks.update_one(
            {"landmark_id": landmark_id},
            {"$inc": {"upvotes": 1}}
        )
        return {"upvoted": True}

# ============= VISIT ENDPOINTS =============

@api_router.get("/visits", response_model=List[Visit])
async def get_visits(current_user: User = Depends(get_current_user)):
    visits = await db.visits.find({"user_id": current_user.user_id}, {"_id": 0}).sort("visited_at", -1).to_list(1000)
    return [Visit(**v) for v in visits]

@api_router.get("/visits/stats")
async def get_visit_stats(current_user: User = Depends(get_current_user)):
    """Get visit statistics including monthly count for free users"""
    # Get start of current month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Count visits this month
    monthly_count = await db.visits.count_documents({
        "user_id": current_user.user_id,
        "visited_at": {"$gte": start_of_month}
    })
    
    # Total visits all time
    total_count = await db.visits.count_documents({"user_id": current_user.user_id})
    
    # Get limit based on tier
    limit = 10 if current_user.subscription_tier == "free" else None
    
    return {
        "monthly_visits": monthly_count,
        "total_visits": total_count,
        "monthly_limit": limit,
        "tier": current_user.subscription_tier
    }


@api_router.get("/visits/{visit_id}")
async def get_visit_details(visit_id: str, current_user: User = Depends(get_current_user)):
    """Get full visit details including photos, diary, and tips"""
    visit = await db.visits.find_one({"visit_id": visit_id}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Get landmark details
    landmark = await db.landmarks.find_one(
        {"landmark_id": visit["landmark_id"]}, 
        {"_id": 0, "name": 1, "country_name": 1, "image_url": 1}
    )
    
    # Get user details
    user = await db.users.find_one(
        {"user_id": visit["user_id"]},
        {"_id": 0, "name": 1, "picture": 1, "username": 1}
    )
    
    return {
        **visit,
        "landmark_name": landmark.get("name") if landmark else None,
        "country_name": landmark.get("country_name") if landmark else None,
        "landmark_image": landmark.get("image_url") if landmark else None,
        "user_name": user.get("name") if user else None,
        "user_picture": user.get("picture") if user else None,
        "username": user.get("username") if user else None
    }

@api_router.post("/visits", response_model=Visit)
async def add_visit(data: VisitCreate, current_user: User = Depends(get_current_user)):
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Check if landmark is premium and user has access
    if landmark.get("category") == "premium" and not is_user_pro(current_user):
        raise HTTPException(
            status_code=403, 
            detail="WanderList Pro required to visit premium landmarks. Upgrade to unlock 92 premium landmarks!"
        )
    
    # Get user limits based on subscription
    limits = get_user_limits(current_user)
    max_photos = limits["photos_per_visit"]
    
    # Validate photo limit based on subscription tier
    photos = data.photos or []
    if len(photos) > max_photos:
        if max_photos == 1:
            raise HTTPException(
                status_code=403, 
                detail="Free users can add 1 photo per visit. Upgrade to WanderList Pro for up to 10 photos!"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Maximum {max_photos} photos allowed per visit")
    
    # Validate travel tips limit (max 5 tips)
    travel_tips = data.travel_tips or []
    if len(travel_tips) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 travel tips allowed per visit")
    
    # Determine if visit is verified (has photo proof)
    is_verified = bool(data.photo_base64 or len(photos) > 0)
    
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    
    # Determine privacy setting (use provided or user's default)
    visibility = data.visibility or current_user.default_privacy or "public"
    
    visit = {
        "visit_id": visit_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "photo_base64": data.photo_base64,
        "photos": photos,
        "points_earned": landmark.get("points", 10),
        "comments": data.comments,
        "visit_location": data.visit_location,
        "diary_notes": data.diary_notes,
        "travel_tips": travel_tips,
        "status": "accepted",
        "verified": is_verified,
        "visibility": visibility,  # Privacy setting
        "visited_at": data.visited_at if data.visited_at else datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.visits.insert_one(visit)
    
    # Update user streak
    from datetime import date
    today = date.today().isoformat()  # YYYY-MM-DD format
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id})
    last_visit_date = user_doc.get("last_visit_date")
    current_streak = user_doc.get("current_streak", 0)
    longest_streak = user_doc.get("longest_streak", 0)
    
    streak_continued = False
    streak_milestone_reached = False
    new_milestone = 0
    
    if last_visit_date:
        from datetime import datetime as dt, timedelta
        last_date_obj = dt.fromisoformat(last_visit_date).date()
        today_obj = dt.fromisoformat(today).date()
        days_diff = (today_obj - last_date_obj).days
        
        if days_diff == 0:
            # Same day visit - don't change streak
            pass
        elif days_diff == 1:
            # Consecutive day - increment streak
            current_streak += 1
            streak_continued = True
        else:
            # Streak broken - reset to 1
            current_streak = 1
    else:
        # First ever visit
        current_streak = 1
    
    # Update longest streak if current exceeds it
    if current_streak > longest_streak:
        longest_streak = current_streak
    
    # Check for streak milestones (7, 30, 100 days)
    streak_milestones = [7, 30, 100]
    if streak_continued and current_streak in streak_milestones:
        streak_milestone_reached = True
        new_milestone = current_streak
    
    # Update user document with new streak data AND award points
    # Points are always awarded to personal total
    # Leaderboard points only awarded if visit has photos (verified)
    landmark_points = landmark.get("points", 10)
    has_photos = bool(data.photo_base64 or len(photos) > 0)
    
    update_fields = {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_visit_date": today
    }
    
    # Always increment personal points
    increment_fields = {"points": landmark_points}
    
    # Only increment leaderboard_points if visit has photos
    if has_photos:
        increment_fields["leaderboard_points"] = landmark_points
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": update_fields,
            "$inc": increment_fields
        }
    )
    
    # Create rich activity for social feed (includes diary, tips, photos)
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "visit",
        "landmark_id": data.landmark_id,
        "landmark_name": landmark.get("name"),
        "landmark_image": landmark.get("image_url"),
        "country_name": landmark.get("country_name"),
        "points_earned": landmark.get("points", 10),
        "visit_id": visit_id,  # Link to full visit details
        "has_diary": bool(data.diary_notes),
        "has_tips": len(travel_tips) > 0,
        "has_photos": len(photos) > 0,
        "photo_count": len(photos),
        "visibility": data.visibility or current_user.default_privacy or "public",  # Privacy setting
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    
    await db.activities.insert_one(activity)
    

    # AUTO-REWARD: Award country points on first landmark visit
    country_id = landmark.get("country_id")
    if country_id:
        # Check if this is first visit to this country
        country_visit_count = await db.visits.count_documents({
            "user_id": current_user.user_id,
            "landmark_id": {"$regex": f"^{country_id}_"}
        })
        
        if country_visit_count == 1:  # First landmark in this country
            # Award country exploration bonus
            country_bonus_points = 20
            # Country bonus: only award leaderboard points if visit has photos
            bonus_increment = {"points": country_bonus_points}
            if has_photos:
                bonus_increment["leaderboard_points"] = country_bonus_points
            
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": bonus_increment}
            )
            
            # AUTO-CREATE country visit record (if doesn't exist)
            existing_country_visit = await db.country_visits.find_one({
                "user_id": current_user.user_id,
                "country_id": country_id
            })
            
            if not existing_country_visit:
                country_doc = await db.countries.find_one({"country_id": country_id})
                if country_doc:
                    auto_country_visit_id = f"cv_{uuid.uuid4().hex[:12]}"
                    auto_country_visit = {
                        "country_visit_id": auto_country_visit_id,
                        "user_id": current_user.user_id,
                        "user_name": current_user.name,
                        "user_picture": current_user.picture,
                        "country_id": country_id,
                        "country_name": country_doc.get("name", "Unknown"),
                        "continent": country_doc.get("continent", "Unknown"),
                        "photos": photos if has_photos else [],  # Include photos if present
                        "diary": None,
                        "visibility": "public",
                        "visited_at": datetime.now(timezone.utc),
                        "points_earned": country_bonus_points,
                        "leaderboard_points_earned": country_bonus_points if has_photos else 0,
                        "source": "auto_landmark",
                        "first_landmark_id": data.landmark_id,
                        "first_landmark_name": landmark.get("name"),
                        "created_at": datetime.now(timezone.utc)
                    }
                    await db.country_visits.insert_one(auto_country_visit)
            
            # Check continent for auto-reward
            country_doc = await db.countries.find_one({"country_id": country_id})
            if country_doc:
                continent = country_doc.get("continent")
                # Check if this is first country in this continent
                continent_country_count = await db.countries.count_documents({
                    "continent": continent
                })
                user_continent_visits = 0
                continent_countries = await db.countries.find({"continent": continent}).to_list(1000)
                for cont_country in continent_countries:
                    count = await db.visits.count_documents({
                        "user_id": current_user.user_id,
                        "landmark_id": {"$regex": f"^{cont_country['country_id']}_"}
                    })
                    if count > 0:
                        user_continent_visits += 1
                
                if user_continent_visits == 1:  # First country in this continent
                    continent_bonus_points = 50
                    await db.users.update_one(
                        {"user_id": current_user.user_id},
                        {"$inc": {"points": continent_bonus_points}}
                    )

    # Track completion bonuses
    country_completed = False
    continent_completed = False
    completed_country_name = None
    completed_continent = None
    
    # Check for country completion bonus
    country_id = landmark.get("country_id")
    if country_id:
        # Get total landmarks in this country
        total_landmarks_in_country = await db.landmarks.count_documents({"country_id": country_id})
        # Get user's visits in this country
        user_visits_in_country = await db.visits.count_documents({
            "user_id": current_user.user_id,
            "landmark_id": {"$in": [
                lm["landmark_id"] for lm in await db.landmarks.find({"country_id": country_id}).to_list(1000)
            ]}
        })
        
        # If user just completed the country
        if user_visits_in_country == total_landmarks_in_country:
            country_completion_bonus = 50  # Bonus points for completing a country
            country_completed = True
            completed_country_name = landmark.get("country_name")
            
            # Award bonus points to user
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": {"points": country_completion_bonus}}
            )
            
            # Create country completion activity
            country_completion_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
            country_completion_activity = {
                "activity_id": country_completion_activity_id,
                "user_id": current_user.user_id,
                "user_name": current_user.name,
                "user_picture": current_user.picture,
                "activity_type": "country_complete",
                "country_id": country_id,
                "country_name": landmark.get("country_name"),
                "continent": landmark.get("continent"),
                "points_earned": country_completion_bonus,
                "landmarks_count": total_landmarks_in_country,
                "created_at": datetime.now(timezone.utc),
                "likes_count": 0,
                "comments_count": 0
            }
            await db.activities.insert_one(country_completion_activity)
            
            # Check for continent completion bonus
            continent = landmark.get("continent")
            if continent:
                # Get all countries in this continent
                countries_in_continent = await db.countries.find({"continent": continent}).to_list(1000)
                country_ids_in_continent = [c["country_id"] for c in countries_in_continent]
                
                # Check if user completed all countries in this continent
                completed_countries = 0
                for cid in country_ids_in_continent:
                    total_landmarks = await db.landmarks.count_documents({"country_id": cid})
                    user_visits = await db.visits.count_documents({
                        "user_id": current_user.user_id,
                        "landmark_id": {"$in": [
                            lm["landmark_id"] for lm in await db.landmarks.find({"country_id": cid}).to_list(1000)
                        ]}
                    })
                    if user_visits == total_landmarks:
                        completed_countries += 1
                
                # If user just completed the continent
                if completed_countries == len(country_ids_in_continent):
                    continent_completion_bonus = 200  # Bonus points for completing a continent
                    continent_completed = True
                    completed_continent = continent
                    
                    # Award bonus points to user
                    await db.users.update_one(
                        {"user_id": current_user.user_id},
                        {"$inc": {"points": continent_completion_bonus}}
                    )
                    
                    # Create continent completion activity
                    continent_completion_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
                    continent_completion_activity = {
                        "activity_id": continent_completion_activity_id,
                        "user_id": current_user.user_id,
                        "user_name": current_user.name,
                        "user_picture": current_user.picture,
                        "activity_type": "continent_complete",
                        "continent": continent,
                        "points_earned": continent_completion_bonus,
                        "countries_count": len(country_ids_in_continent),
                        "created_at": datetime.now(timezone.utc),
                        "likes_count": 0,
                        "comments_count": 0
                    }
                    await db.activities.insert_one(continent_completion_activity)
    
    # Check for milestones and create activity if reached
    # Milestones adjusted for 520 total landmarks
    visit_count = await db.visits.count_documents({"user_id": current_user.user_id})
    if visit_count in [10, 25, 50, 100, 200, 350, 500]:
        milestone_activity_id = f"activity_{uuid.uuid4().hex[:12]}"
        milestone_activity = {
            "activity_id": milestone_activity_id,
            "user_id": current_user.user_id,
            "user_name": current_user.name,
            "user_picture": current_user.picture,
            "activity_type": "milestone",
            "milestone_count": visit_count,
            "created_at": datetime.now(timezone.utc),
            "likes_count": 0,
            "comments_count": 0
        }
        await db.activities.insert_one(milestone_activity)
    
    # Check and award badges
    newly_awarded_badges = await check_and_award_badges(current_user.user_id)
    
    # Create visit response with badge info and completion flags
    visit_response = Visit(**visit)
    visit_dict = visit_response.dict()
    visit_dict["newly_awarded_badges"] = newly_awarded_badges
    visit_dict["country_completed"] = country_completed
    visit_dict["continent_completed"] = continent_completed
    visit_dict["current_streak"] = current_streak
    visit_dict["streak_milestone_reached"] = streak_milestone_reached
    visit_dict["new_milestone"] = new_milestone if streak_milestone_reached else 0
    if country_completed:
        visit_dict["completed_country_name"] = completed_country_name
    if continent_completed:
        visit_dict["completed_continent"] = completed_continent
    
    return visit_dict

# ============= ADMIN ENDPOINTS =============

@api_router.put("/admin/users/{user_id}/tier")
async def update_user_tier(
    user_id: str,
    request: dict,  # {"tier": "free|basic|premium"}
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to upgrade/downgrade user subscription tier"""
    # In production, add proper admin authorization here
    
    tier = request.get("tier")
    if not tier or tier not in ["free", "basic", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'free', 'basic', or 'premium'")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_tier": tier}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} upgraded to {tier} tier", "tier": tier}

# ============= LEADERBOARD ENDPOINTS =============

@api_router.get("/leaderboard")
async def get_enhanced_leaderboard(
    time_period: str = "all_time",  # "all_time", "monthly", "weekly"
    category: str = "points",  # "points", "visits", "countries", "streaks"
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
        # Get users sorted by LEADERBOARD points (only verified visits with photos)
        query = {}
        if user_filter:
            query["user_id"] = {"$in": user_filter}
        
        # Use leaderboard_points for public leaderboard
        users = await db.users.find(query, {"_id": 0}).sort("leaderboard_points", -1).limit(limit).to_list(limit)
        
        for idx, user in enumerate(users):
            leaderboard.append({
                "user_id": user["user_id"],
                "name": user["name"],
                "picture": user.get("picture"),
                "username": user.get("username"),
                "value": user.get("leaderboard_points", 0),  # Use leaderboard_points
                "personal_points": user.get("points", 0),  # Also include personal points for comparison
                "rank": idx + 1,
                "current_streak": user.get("current_streak", 0),
                "longest_streak": user.get("longest_streak", 0)
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
                    
    elif category == "streaks":
        # Get users by longest streak
        query = {}
        if user_filter:
            query["user_id"] = {"$in": user_filter}
        
        users = await db.users.find(query, {"_id": 0}).sort("longest_streak", -1).limit(limit).to_list(limit)
        
        for idx, user in enumerate(users):
            leaderboard.append({
                "user_id": user["user_id"],
                "name": user["name"],
                "picture": user.get("picture"),
                "username": user.get("username"),
                "value": user.get("longest_streak", 0),
                "rank": idx + 1,
                "current_streak": user.get("current_streak", 0),
                "longest_streak": user.get("longest_streak", 0)
            })
            if user["user_id"] == current_user.user_id:
                user_rank = idx + 1
    
    return {
        "leaderboard": leaderboard,
        "user_rank": user_rank,
        "total_users": len(leaderboard)
    }

@api_router.get("/leaderboard/rising-stars")
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

@api_router.get("/friends", response_model=List[UserPublic])
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

@api_router.post("/friends/request")
async def send_friend_request(data: FriendRequest, current_user: User = Depends(get_current_user)):
    # Check friend limits based on subscription tier
    tier_limits = {"free": 5, "basic": 25, "premium": float('inf')}
    max_friends = tier_limits[current_user.subscription_tier]
    
    # Count current accepted friendships
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    if friend_count >= max_friends:
        tier_name = "Basic" if current_user.subscription_tier == "free" else "Premium"
        raise HTTPException(
            status_code=403,
            detail=f"Friend limit reached ({int(max_friends)} max). Upgrade to {tier_name} for more friends!"
        )
    
    # Find friend by email or username
    if not data.friend_email and not data.friend_username:
        raise HTTPException(status_code=400, detail="Please provide either email or username")
    
    # Build search query for email or username
    search_query = []
    if data.friend_email:
        search_query.append({"email": data.friend_email})
    if data.friend_username:
        # Case-insensitive username search
        search_query.append({"username": {"$regex": f"^{data.friend_username}$", "$options": "i"}})
    
    friend = await db.users.find_one({"$or": search_query}, {"_id": 0})
    
    if not friend:
        search_method = "email or username" if data.friend_email and data.friend_username else ("email" if data.friend_email else "username")
        raise HTTPException(status_code=404, detail=f"User not found with that {search_method}")
    
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

@api_router.post("/friends/{friendship_id}/accept")
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

@api_router.get("/friends/pending")
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

@api_router.post("/messages", response_model=Message)
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

@api_router.get("/messages/{friend_id}")
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

@api_router.get("/stats")
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

@api_router.get("/progress")
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

@api_router.get("/feed", response_model=List[Activity])
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

@api_router.post("/activities/{activity_id}/like")
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

@api_router.delete("/activities/{activity_id}/like")
async def unlike_activity(activity_id: str, current_user: User = Depends(get_current_user)):
    """Unlike an activity"""
    
    result = await db.likes.delete_one({
        "activity_id": activity_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    
    return {"message": "Unliked"}

@api_router.get("/activities/{activity_id}/likes")
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

@api_router.post("/activities/{activity_id}/comment", response_model=Comment)
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

@api_router.get("/activities/{activity_id}/comments", response_model=List[Comment])
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

@api_router.delete("/comments/{comment_id}")
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

@api_router.post("/comments/{comment_id}/like")
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

@api_router.delete("/comments/{comment_id}/like")
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

# ============= BUCKET LIST ENDPOINTS =============

@api_router.get("/bucket-list")
async def get_bucket_list(current_user: User = Depends(get_current_user)):
    """Get user's bucket list with full landmark details"""
    bucket_items = await db.bucket_list.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("added_at", -1).to_list(1000)
    
    # Get full landmark details
    landmark_ids = [item["landmark_id"] for item in bucket_items]
    landmarks = await db.landmarks.find(
        {"landmark_id": {"$in": landmark_ids}}, {"_id": 0}
    ).to_list(1000)
    
    # Create lookup dictionary
    landmarks_dict = {lm["landmark_id"]: lm for lm in landmarks}
    
    # Combine bucket list items with landmark details
    result = []
    for item in bucket_items:
        landmark = landmarks_dict.get(item["landmark_id"])
        if landmark:
            result.append({
                "bucket_list_id": item["bucket_list_id"],
                "added_at": item["added_at"],
                "notes": item.get("notes"),
                "landmark": landmark
            })
    
    return result

@api_router.post("/bucket-list")
async def add_to_bucket_list(data: BucketListCreate, current_user: User = Depends(get_current_user)):
    """Add a landmark to bucket list"""
    # Check if already in bucket list
    existing = await db.bucket_list.find_one({
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Landmark already in bucket list")
    
    # Verify landmark exists
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Create bucket list item
    bucket_list_id = f"bucket_{uuid.uuid4().hex[:12]}"
    bucket_item = {
        "bucket_list_id": bucket_list_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "added_at": datetime.now(timezone.utc),
        "notes": data.notes
    }
    
    await db.bucket_list.insert_one(bucket_item)
    


# ============= COUNTRY VISITS ENDPOINTS =============

@api_router.delete("/bucket-list/{bucket_list_id}")
async def remove_from_bucket_list(bucket_list_id: str, current_user: User = Depends(get_current_user)):
    """Remove a landmark from bucket list"""
    result = await db.bucket_list.delete_one({
        "bucket_list_id": bucket_list_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bucket list item not found")
    
    return {"message": "Removed from bucket list"}

@api_router.get("/bucket-list/check/{landmark_id}")
async def check_in_bucket_list(landmark_id: str, current_user: User = Depends(get_current_user)):
    """Check if a landmark is in user's bucket list"""
    item = await db.bucket_list.find_one({
        "user_id": current_user.user_id,
        "landmark_id": landmark_id
    })
    
    return {"in_bucket_list": item is not None, "bucket_list_id": item.get("bucket_list_id") if item else None}

# ============= END BUCKET LIST ENDPOINTS =============

# ============= CUSTOM COLLECTIONS ENDPOINTS (PREMIUM FEATURE) =============

class Collection(BaseModel):
    collection_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    icon: str = "star"  # Icon name for the collection
    color: str = "#20B2AA"  # Collection color theme
    landmark_count: int = 0
    created_at: datetime
    updated_at: datetime

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "star"
    color: Optional[str] = "#20B2AA"

@api_router.get("/collections")
async def get_user_collections(current_user: User = Depends(get_current_user)):
    """Get user's custom collections"""
    collections = await db.collections.find(
        {"user_id": current_user.user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get landmark count for each collection
    result = []
    for collection in collections:
        count = await db.collection_items.count_documents({"collection_id": collection["collection_id"]})
        collection["landmark_count"] = count
        result.append(Collection(**collection))
    
    return result

@api_router.post("/collections")
async def create_collection(data: CollectionCreate, current_user: User = Depends(get_current_user)):
    """Create a new custom collection"""
    collection_id = f"collection_{uuid.uuid4().hex[:12]}"
    
    collection = {
        "collection_id": collection_id,
        "user_id": current_user.user_id,
        "name": data.name,
        "description": data.description,
        "icon": data.icon or "star",
        "color": data.color or "#20B2AA",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.collections.insert_one(collection)
    collection["landmark_count"] = 0
    
    return Collection(**collection)

@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, current_user: User = Depends(get_current_user)):
    """Delete a collection"""
    # Verify ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Delete collection and all its items
    await db.collections.delete_one({"collection_id": collection_id})
    await db.collection_items.delete_many({"collection_id": collection_id})
    
    return {"message": "Collection deleted successfully"}

@api_router.post("/collections/{collection_id}/landmarks")
async def add_landmark_to_collection(
    collection_id: str, 
    landmark_id: str,
    current_user: User = Depends(get_current_user)
):
    """Add a landmark to a collection"""
    # Verify collection ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if landmark exists
    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Check if already in collection
    exists = await db.collection_items.find_one({
        "collection_id": collection_id,
        "landmark_id": landmark_id
    })
    if exists:
        raise HTTPException(status_code=400, detail="Landmark already in collection")
    
    # Add to collection
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    item = {
        "item_id": item_id,
        "collection_id": collection_id,
        "user_id": current_user.user_id,
        "landmark_id": landmark_id,
        "added_at": datetime.now(timezone.utc)
    }
    
    await db.collection_items.insert_one(item)
    
    # Update collection updated_at
    await db.collections.update_one(
        {"collection_id": collection_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Landmark added to collection", "item_id": item_id}

@api_router.get("/collections/{collection_id}/landmarks")
async def get_collection_landmarks(collection_id: str, current_user: User = Depends(get_current_user)):
    """Get all landmarks in a collection"""
    # Verify ownership
    collection = await db.collections.find_one({"collection_id": collection_id, "user_id": current_user.user_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get items
    items = await db.collection_items.find({"collection_id": collection_id}, {"_id": 0}).to_list(1000)
    
    # Get full landmark details
    landmark_ids = [item["landmark_id"] for item in items]
    landmarks = await db.landmarks.find({"landmark_id": {"$in": landmark_ids}}, {"_id": 0}).to_list(1000)
    
    # Add is_locked flag based on user tier
    results = []
    for landmark in landmarks:
        landmark_dict = dict(landmark)
        if current_user.subscription_tier == "free" and landmark_dict.get("category") == "premium":
            landmark_dict["is_locked"] = True
        else:
            landmark_dict["is_locked"] = False
        results.append(Landmark(**landmark_dict))
    
    return results

@api_router.delete("/collections/{collection_id}/landmarks/{landmark_id}")
async def remove_landmark_from_collection(
    collection_id: str,
    landmark_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a landmark from a collection"""
    result = await db.collection_items.delete_one({
        "collection_id": collection_id,
        "landmark_id": landmark_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in collection")
    
    # Update collection updated_at
    await db.collections.update_one(
        {"collection_id": collection_id},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Landmark removed from collection"}

# ============= END CUSTOM COLLECTIONS ENDPOINTS =============

# ============= NOTIFICATION HELPER FUNCTIONS =============

async def create_notification(user_id: str, notif_type: str, title: str, message: str, 
                              related_id: Optional[str] = None, related_user_id: Optional[str] = None,
                              related_user_name: Optional[str] = None):
    """Helper function to create a notification"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    notification = {
        "notification_id": notification_id,
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "related_id": related_id,
        "related_user_id": related_user_id,
        "related_user_name": related_user_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    return notification_id

# ============= NOTIFICATION ENDPOINTS =============

@api_router.get("/notifications")
async def get_notifications(limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": current_user.user_id,
        "is_read": False
    })
    
    return {"unread_count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user.user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        "notification_id": notification_id,
        "user_id": current_user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

# ============= END NOTIFICATION ENDPOINTS =============

# ============= COUNTRY VISIT ENDPOINTS =============

@api_router.post("/country-visits")
async def create_country_visit(data: CountryVisitCreate, current_user: User = Depends(get_current_user)):
    """Create a country visit with photo collage and diary.
    
    Users can mark a country as visited without having visited any landmarks.
    If a country was already auto-marked via landmark visits, this upgrades it with photos/diary.
    
    Points Logic:
    - Personal points (points): Always awarded for visits
    - Leaderboard points (leaderboard_points): Only awarded when photos are included
    """
    
    # Validate photos (max 10, but photos are now OPTIONAL)
    if len(data.photos) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 photos allowed")
    
    has_photos = len(data.photos) > 0
    
    # Look up country details from database
    country = await db.countries.find_one({"country_id": data.country_id}, {"_id": 0})
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    country_name = country.get("name", "Unknown")
    continent = country.get("continent", "Unknown")
    
    # Check if country visit already exists (either manual or auto from landmark)
    existing_visit = await db.country_visits.find_one({
        "user_id": current_user.user_id,
        "country_id": data.country_id
    })
    
    # Parse visit date
    visited_at = datetime.now(timezone.utc)
    if data.visited_at:
        try:
            visited_at = datetime.fromisoformat(data.visited_at.replace('Z', '+00:00'))
        except:
            pass
    
    # Determine visibility (use provided or user's default)
    visibility = data.visibility or current_user.default_privacy or "public"
    
    if existing_visit:
        # Upgrade existing visit with new photos/diary
        # If adding photos for the first time, also award leaderboard points
        existing_has_photos = bool(existing_visit.get("photos", []))
        leaderboard_points_to_add = 0
        
        # If upgrading from no photos to having photos, award leaderboard points
        if has_photos and not existing_has_photos:
            leaderboard_points_to_add = existing_visit.get("points_earned", 50)
        
        await db.country_visits.update_one(
            {"country_visit_id": existing_visit["country_visit_id"]},
            {"$set": {
                "photos": data.photos,
                "diary": data.diary_notes,
                "visibility": visibility,
                "source": "manual",
                "has_photos": has_photos,
                "leaderboard_points_earned": existing_visit.get("points_earned", 50) if has_photos else 0,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # If adding photos for first time, award leaderboard points
        if leaderboard_points_to_add > 0:
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$inc": {"leaderboard_points": leaderboard_points_to_add}}
            )
        
        # Update activity if exists
        await db.activities.update_one(
            {"country_visit_id": existing_visit["country_visit_id"]},
            {"$set": {
                "photos": data.photos,
                "diary": data.diary_notes,
                "visibility": visibility,
                "has_photos": has_photos,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "message": "Country visit updated" + (" with photos - leaderboard points earned!" if leaderboard_points_to_add > 0 else ""),
            "country_visit_id": existing_visit["country_visit_id"],
            "points_earned": 0,
            "leaderboard_points_earned": leaderboard_points_to_add,
            "was_upgrade": True,
            "has_photos": has_photos
        }
    
    # Award 50 points for new country visit
    points_earned = 50
    leaderboard_points_earned = 50 if has_photos else 0
    
    # Create country visit
    country_visit_id = f"cv_{uuid.uuid4().hex[:12]}"
    country_visit = {
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "country_id": data.country_id,
        "country_name": country_name,
        "continent": continent,
        "photos": data.photos,
        "diary": data.diary_notes,
        "visibility": visibility,
        "visited_at": visited_at,
        "points_earned": points_earned,
        "leaderboard_points_earned": leaderboard_points_earned,
        "has_photos": has_photos,
        "source": "manual",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.country_visits.insert_one(country_visit)
    
    # Award points to user
    # Personal points: always awarded
    # Leaderboard points: only if has photos
    increment_fields = {"points": points_earned}
    if has_photos:
        increment_fields["leaderboard_points"] = leaderboard_points_earned
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": increment_fields}
    )
    
    # Create activity for feed
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "country_visit",
        "country_visit_id": country_visit_id,
        "country_id": data.country_id,
        "country_name": country_name,
        "continent": continent,
        "photos": data.photos,
        "diary": data.diary_notes,
        "visibility": visibility,
        "points_earned": points_earned,
        "has_photos": has_photos,
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    # Build response message
    if has_photos:
        message = "Country visit recorded with photos! Points added to leaderboard."
    else:
        message = "Country visit recorded! Add photos to earn leaderboard points 📸"
    
    return {
        "message": message,
        "country_visit_id": country_visit_id,
        "points_earned": points_earned,
        "leaderboard_points_earned": leaderboard_points_earned,
        "has_photos": has_photos
    }

@api_router.get("/country-visits")
async def get_country_visits(current_user: User = Depends(get_current_user)):
    """Get user's country visits"""
    country_visits = await db.country_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return country_visits

@api_router.get("/country-visits/{country_visit_id}")
async def get_country_visit_details(country_visit_id: str, current_user: User = Depends(get_current_user)):
    """Get country visit details"""
    country_visit = await db.country_visits.find_one(
        {"country_visit_id": country_visit_id},
        {"_id": 0}
    )
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    return country_visit

@api_router.delete("/country-visits/{country_visit_id}")
async def delete_country_visit(country_visit_id: str, current_user: User = Depends(get_current_user)):
    """Delete a country visit"""
    # Verify ownership
    country_visit = await db.country_visits.find_one({
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id
    })
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    # Delete country visit
    await db.country_visits.delete_one({"country_visit_id": country_visit_id})
    
    # Delete associated activity
    await db.activities.delete_many({"country_visit_id": country_visit_id})
    
    # Deduct points (50 points for country visits)
    points_to_deduct = country_visit.get("points_earned", 50)
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": {"points": -points_to_deduct}}
    )
    
    return {"message": "Country visit deleted"}

@api_router.put("/country-visits/{country_visit_id}")
async def update_country_visit(country_visit_id: str, data: dict, current_user: User = Depends(get_current_user)):
    """Update a country visit (diary entry)"""
    # Verify ownership
    country_visit = await db.country_visits.find_one({
        "country_visit_id": country_visit_id,
        "user_id": current_user.user_id
    })
    
    if not country_visit:
        raise HTTPException(status_code=404, detail="Country visit not found")
    
    # Build update fields
    update_fields = {}
    if "diary" in data:
        update_fields["diary"] = data["diary"]
    if "visibility" in data and data["visibility"] in ["public", "friends", "private"]:
        update_fields["visibility"] = data["visibility"]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update country visit
    await db.country_visits.update_one(
        {"country_visit_id": country_visit_id},
        {"$set": update_fields}
    )
    
    # Also update the associated activity if diary changed
    if "diary" in update_fields:
        await db.activities.update_many(
            {"country_visit_id": country_visit_id},
            {"$set": {"diary": update_fields["diary"]}}
        )
    if "visibility" in update_fields:
        await db.activities.update_many(
            {"country_visit_id": country_visit_id},
            {"$set": {"visibility": update_fields["visibility"]}}
        )
    
    # Return updated visit
    updated_visit = await db.country_visits.find_one(
        {"country_visit_id": country_visit_id},
        {"_id": 0}
    )
    return updated_visit

@api_router.get("/country-visits/check/{country_id}")
async def check_country_visit_status(country_id: str, current_user: User = Depends(get_current_user)):
    """
    Check if a country has been visited by the user.
    Returns visit status based on:
    1. Explicit country visit record exists, OR
    2. At least one landmark in the country has been visited
    """
    # First, check for explicit country visit record
    country_visit = await db.country_visits.find_one(
        {"user_id": current_user.user_id, "country_id": country_id},
        {"_id": 0}
    )
    
    if country_visit:
        return {
            "visited": True,
            "source": country_visit.get("source", "manual"),
            "country_visit_id": country_visit.get("country_visit_id"),
            "visited_at": country_visit.get("visited_at"),
            "has_photos": bool(country_visit.get("photos", [])),
            "has_diary": bool(country_visit.get("diary"))
        }
    
    # Check if any landmarks in this country have been visited
    # Get all landmarks for this country
    country_landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"landmark_id": 1}
    ).to_list(1000)
    
    landmark_ids = [lm["landmark_id"] for lm in country_landmarks]
    
    if landmark_ids:
        # Check if user has visited any of these landmarks
        landmark_visit = await db.visits.find_one({
            "user_id": current_user.user_id,
            "landmark_id": {"$in": landmark_ids}
        })
        
        if landmark_visit:
            # User has visited a landmark but no country visit record exists
            # This means they visited before auto-creation was implemented
            # Return as visited via landmarks
            return {
                "visited": True,
                "source": "landmark_visits",
                "country_visit_id": None,
                "visited_at": landmark_visit.get("visited_at"),
                "has_photos": False,
                "has_diary": False
            }
    
    return {
        "visited": False,
        "source": None,
        "country_visit_id": None,
        "visited_at": None,
        "has_photos": False,
        "has_diary": False
    }

# ============= END COUNTRY VISIT ENDPOINTS =============

# ============= USER CREATED VISIT ENDPOINTS =============

@api_router.post("/user-created-visits")
async def create_user_created_visit(data: UserCreatedVisitCreate, current_user: User = Depends(get_current_user)):
    """
    Create a user-created visit for countries/landmarks not in the app database.
    No points are awarded for user-created visits.
    
    Landmarks can now have individual photos:
    - landmarks: List of {name: str, photo: Optional[str]} (max 10 landmarks)
    - photos: General country photos (max 10)
    - Total photos: max 20 (10 country + 10 landmark photos)
    """
    
    # Validate country name
    if not data.country_name or len(data.country_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Country name is required (at least 2 characters)")
    
    # Validate general photos (max 10)
    if len(data.photos) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 general photos allowed")
    
    # Process and validate landmarks (max 10)
    # Each landmark is a dict with 'name' (required) and 'photo' (optional)
    processed_landmarks = []
    for lm in data.landmarks[:10]:  # Max 10 landmarks
        if isinstance(lm, dict):
            name = lm.get('name', '').strip() if lm.get('name') else ''
            if name:  # Only include landmarks with valid names
                processed_landmarks.append({
                    'name': name,
                    'photo': lm.get('photo')  # Can be None or base64 string
                })
        elif isinstance(lm, str) and lm.strip():
            # Backward compatibility: if just a string, convert to dict
            processed_landmarks.append({
                'name': lm.strip(),
                'photo': None
            })
    
    # Count total photos for validation
    landmark_photos_count = sum(1 for lm in processed_landmarks if lm.get('photo'))
    total_photos = len(data.photos) + landmark_photos_count
    if total_photos > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 total photos allowed (10 country + 10 landmark)")
    
    # Parse visit date
    visited_at = datetime.now(timezone.utc)
    if data.visited_at:
        try:
            visited_at = datetime.fromisoformat(data.visited_at.replace('Z', '+00:00'))
        except:
            pass
    
    # Determine visibility
    visibility = data.visibility or "public"
    
    # Create user created visit
    user_created_visit_id = f"ucv_{uuid.uuid4().hex[:12]}"
    user_created_visit = {
        "user_created_visit_id": user_created_visit_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "country_name": data.country_name.strip(),
        "landmarks": processed_landmarks,  # Array of {name, photo} objects
        "photos": data.photos,  # General country photos
        "diary": data.diary_notes,
        "visibility": visibility,
        "visited_at": visited_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_created_visits.insert_one(user_created_visit)
    
    # Create activity for feed (respects privacy settings)
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    
    # Build description for activity
    landmark_names = [lm['name'] for lm in processed_landmarks]
    if landmark_names:
        if len(landmark_names) == 1:
            activity_description = f"visited {landmark_names[0]} in {data.country_name.strip()}"
        else:
            activity_description = f"visited {len(landmark_names)} places in {data.country_name.strip()}"
    else:
        activity_description = f"visited {data.country_name.strip()}"
    
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "user_created_visit",
        "user_created_visit_id": user_created_visit_id,
        "country_name": data.country_name.strip(),
        "landmarks": processed_landmarks,  # Array of {name, photo} objects
        "description": activity_description,
        "photos": data.photos,
        "diary": data.diary_notes,
        "visibility": visibility,
        "points_earned": 0,  # No points for user-created visits
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    return {
        "message": "Custom visit recorded successfully!",
        "user_created_visit_id": user_created_visit_id,
        "country_name": data.country_name.strip(),
        "landmarks": processed_landmarks,
        "landmarks_count": len(processed_landmarks),
        "total_photos": total_photos
    }


@api_router.get("/user-created-visits")
async def get_user_created_visits(current_user: User = Depends(get_current_user)):
    """Get all user-created visits for the current user"""
    visits = await db.user_created_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return visits


@api_router.get("/user-created-visits/{user_id}/public")
async def get_user_created_visits_public(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user-created visits for a specific user (respecting privacy settings)"""
    
    # Check if requesting own visits
    if user_id == current_user.user_id:
        # Return all own visits
        visits = await db.user_created_visits.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("visited_at", -1).to_list(1000)
        return visits
    
    # Check if users are friends
    are_friends = await db.friends.find_one({
        "$or": [
            {"user_id": current_user.user_id, "friend_id": user_id, "status": "accepted"},
            {"user_id": user_id, "friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    # Build visibility filter
    visibility_filter = ["public"]
    if are_friends:
        visibility_filter.append("friends")
    
    visits = await db.user_created_visits.find(
        {"user_id": user_id, "visibility": {"$in": visibility_filter}},
        {"_id": 0}
    ).sort("visited_at", -1).to_list(1000)
    
    return visits


@api_router.delete("/user-created-visits/{visit_id}")
async def delete_user_created_visit(visit_id: str, current_user: User = Depends(get_current_user)):
    """Delete a user-created visit"""
    
    # Find the visit
    visit = await db.user_created_visits.find_one({
        "user_created_visit_id": visit_id,
        "user_id": current_user.user_id
    })
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found or not authorized")
    
    # Delete the visit
    await db.user_created_visits.delete_one({"user_created_visit_id": visit_id})
    
    # Delete associated activity
    await db.activities.delete_one({"user_created_visit_id": visit_id})
    
    return {"message": "Custom visit deleted successfully"}

# ============= END USER CREATED VISIT ENDPOINTS =============

# ============= PHOTO COLLECTION ENDPOINTS =============

@api_router.get("/photos/collection")
async def get_photo_collection(current_user: User = Depends(get_current_user)):
    """
    Aggregate all photos from landmark visits, country visits, and custom visits.
    Returns photos with metadata for categorization.
    """
    photos = []
    
    # Get photos from landmark visits
    landmark_visits = await db.visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in landmark_visits:
        visit_photos = visit.get("photos", [])
        # Handle single photo case
        if visit.get("photo_base64"):
            visit_photos = [visit.get("photo_base64")]
        
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "landmark",
                    "visit_id": visit.get("visit_id"),
                    "landmark_id": visit.get("landmark_id"),
                    "landmark_name": visit.get("landmark_name", "Unknown Landmark"),
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": visit.get("country_id"),
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Get photos from country visits
    country_visits = await db.country_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in country_visits:
        visit_photos = visit.get("photos", [])
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "country",
                    "visit_id": visit.get("country_visit_id"),
                    "landmark_id": None,
                    "landmark_name": None,
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": visit.get("country_id"),
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Get photos from user-created visits
    custom_visits = await db.user_created_visits.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for visit in custom_visits:
        visit_photos = visit.get("photos", [])
        # Get landmarks (handle both old single landmark_name and new landmarks array)
        landmarks = visit.get("landmarks", [])
        landmark_name = landmarks[0] if landmarks else visit.get("landmark_name")
        
        for i, photo in enumerate(visit_photos):
            if photo:
                photos.append({
                    "photo_url": photo,
                    "visit_type": "custom",
                    "visit_id": visit.get("user_created_visit_id"),
                    "landmark_id": None,
                    "landmark_name": landmark_name,
                    "country_name": visit.get("country_name", "Unknown"),
                    "country_id": None,
                    "visited_at": visit.get("visited_at") or visit.get("created_at"),
                    "created_at": visit.get("created_at"),
                    "photo_index": i,
                })
    
    # Sort by visited_at date (newest first)
    photos.sort(key=lambda x: x.get("visited_at") or x.get("created_at") or "", reverse=True)
    
    # Get unique countries for stats
    countries = set(p["country_name"] for p in photos if p.get("country_name"))
    
    # Group by year for stats
    years = set()
    for p in photos:
        date_str = p.get("visited_at") or p.get("created_at")
        if date_str:
            try:
                if isinstance(date_str, str):
                    year = date_str[:4]
                else:
                    year = str(date_str.year)
                years.add(year)
            except:
                pass
    
    return {
        "photos": photos,
        "total_count": len(photos),
        "countries_count": len(countries),
        "countries": list(countries),
        "years": sorted(list(years), reverse=True),
        "by_type": {
            "landmark": len([p for p in photos if p["visit_type"] == "landmark"]),
            "country": len([p for p in photos if p["visit_type"] == "country"]),
            "custom": len([p for p in photos if p["visit_type"] == "custom"]),
        }
    }

# ============= END PHOTO COLLECTION ENDPOINTS =============

# ============= END ACTIVITY FEED ENDPOINTS =============

# ============= ACHIEVEMENTS ENDPOINTS =============

@api_router.get("/achievements", response_model=List[Achievement])
async def get_user_achievements(current_user: User = Depends(get_current_user)):
    """Get all achievements/badges for the current user"""
    achievements = await db.achievements.find(
        {"user_id": current_user.user_id}
    ).sort("earned_at", -1).to_list(1000)
    
    return [Achievement(**achievement) for achievement in achievements]

@api_router.get("/achievements/showcase")
async def get_achievements_showcase(current_user: User = Depends(get_current_user)):
    """Get comprehensive achievement data including progress toward locked badges"""
    # Get earned achievements
    earned_achievements = await db.achievements.find(
        {"user_id": current_user.user_id}
    ).sort("earned_at", -1).to_list(1000)
    
    earned_badge_types = {badge["badge_type"] for badge in earned_achievements}
    
    # Get user stats for progress calculation
    visit_count = await db.visits.count_documents({"user_id": current_user.user_id})
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    total_points = user.get("points", 0)
    longest_streak = user.get("longest_streak", 0)
    
    # Count friends
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    # Count completed countries
    completed_countries = await db.visits.aggregate([
        {"$match": {"user_id": current_user.user_id}},
        {"$group": {"_id": "$country_id", "visit_count": {"$sum": 1}}},
        {"$lookup": {
            "from": "landmarks",
            "let": {"country": "$_id"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [
                    {"$eq": ["$country_id", "$$country"]},
                    {"$eq": ["$category", "official"]}
                ]}}},
                {"$count": "total"}
            ],
            "as": "landmark_info"
        }},
        {"$match": {"$expr": {"$eq": [
            "$visit_count",
            {"$arrayElemAt": ["$landmark_info.total", 0]}
        ]}}}
    ]).to_list(1000)
    
    completed_country_count = len(completed_countries)
    
    # Build all badges with progress
    all_badges = []
    
    for badge_type, badge_def in BADGE_DEFINITIONS.items():
        is_earned = badge_type in earned_badge_types
        
        # Calculate progress
        progress = 0
        current_value = 0
        target_value = 0
        progress_text = ""
        
        # Milestone badges
        if badge_type.startswith("milestone_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = visit_count
            progress = min(100, int((visit_count / target) * 100))
            progress_text = f"{visit_count}/{target} visits"
        elif badge_type == "first_visit":
            target_value = 1
            current_value = visit_count
            progress = 100 if visit_count >= 1 else 0
            progress_text = f"{min(visit_count, 1)}/1 visit"
        
        # Points badges
        elif badge_type.startswith("points_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = total_points
            progress = min(100, int((total_points / target) * 100))
            progress_text = f"{total_points:,}/{target:,} points"
        
        # Social badges
        elif badge_type.startswith("social_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = friend_count
            progress = min(100, int((friend_count / target) * 100))
            progress_text = f"{friend_count}/{target} friends"
        
        # Streak badges
        elif badge_type.startswith("streak_"):
            target = int(badge_type.split("_")[1])
            target_value = target
            current_value = longest_streak
            progress = min(100, int((longest_streak / target) * 100))
            progress_text = f"{longest_streak}/{target} days"
        
        # Country complete
        elif badge_type == "country_complete":
            target_value = 1
            current_value = completed_country_count
            progress = 100 if completed_country_count >= 1 else 0
            progress_text = f"{completed_country_count} completed"
        
        badge_data = {
            "badge_type": badge_type,
            "badge_name": badge_def["name"],
            "badge_description": badge_def["description"],
            "badge_icon": badge_def["icon"],
            "is_earned": is_earned,
            "progress": progress,
            "current_value": current_value,
            "target_value": target_value,
            "progress_text": progress_text,
            "earned_at": None
        }
        
        # Add earned date if applicable
        if is_earned:
            earned_badge = next((b for b in earned_achievements if b["badge_type"] == badge_type), None)
            if earned_badge:
                badge_data["earned_at"] = earned_badge["earned_at"].isoformat()
        
        all_badges.append(badge_data)
    
    # Sort: earned first (by date desc), then locked by progress desc
    earned_badges = [b for b in all_badges if b["is_earned"]]
    locked_badges = [b for b in all_badges if not b["is_earned"]]
    
    earned_badges.sort(key=lambda x: x["earned_at"], reverse=True)
    locked_badges.sort(key=lambda x: x["progress"], reverse=True)
    
    return {
        "earned_badges": earned_badges,
        "locked_badges": locked_badges,
        "stats": {
            "total_badges": len(BADGE_DEFINITIONS),
            "earned_count": len(earned_badges),
            "locked_count": len(locked_badges),
            "completion_percentage": int((len(earned_badges) / len(BADGE_DEFINITIONS)) * 100)
        }
    }

@api_router.get("/achievements/featured", response_model=List[Achievement])
async def get_featured_achievements(current_user: User = Depends(get_current_user)):
    """Get featured achievements for the current user"""
    achievements = await db.achievements.find(
        {"user_id": current_user.user_id, "is_featured": True}
    ).sort("earned_at", -1).to_list(100)
    
    return [Achievement(**achievement) for achievement in achievements]

@api_router.post("/achievements/check")
async def manually_check_achievements(current_user: User = Depends(get_current_user)):
    """Manually trigger achievement checking (for testing/admin purposes)"""
    newly_awarded = await check_and_award_badges(current_user.user_id)
    return {"newly_awarded_badges": newly_awarded}

# ============= END ACHIEVEMENTS ENDPOINTS =============

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= BADGE DEFINITIONS =============

BADGE_DEFINITIONS = {
    "first_visit": {
        "name": "First Steps",
        "description": "Your journey begins! You've taken the first step into a world of adventure 🎉",
        "icon": "🎯"
    },
    "milestone_10": {
        "name": "Explorer",
        "description": "10 landmarks conquered! You're building momentum - the world is watching! 🌟",
        "icon": "🗺️"
    },
    "milestone_25": {
        "name": "Adventurer",
        "description": "25 landmarks down! You're not just traveling - you're collecting memories 💪",
        "icon": "🧗"
    },
    "milestone_50": {
        "name": "Globetrotter",
        "description": "50 landmarks explored! You've officially caught the travel bug - there's no cure! 🎊",
        "icon": "🌍"
    },
    "milestone_100": {
        "name": "World Traveler",
        "description": "100 landmarks! Triple digits! You're unstoppable - the world is your playground! 🚀",
        "icon": "✈️"
    },
    "milestone_200": {
        "name": "Seasoned Traveler",
        "description": "200 landmarks explored! You've seen corners of the world most only dream about! 🌏",
        "icon": "🧭"
    },
    "milestone_250": {
        "name": "Elite Explorer",
        "description": "250 landmarks?! Half the world knows your name. You're writing history! 🌟",
        "icon": "🎖️"
    },
    "milestone_350": {
        "name": "Legend",
        "description": "350 landmarks conquered! You're living proof that dreams become reality. LEGENDARY status! 👑",
        "icon": "🏆"
    },
    "milestone_500": {
        "name": "Ultimate Explorer",
        "description": "500 landmarks conquered! You've seen what most only dream of. You ARE the legend! 🌟",
        "icon": "👑"
    },
    "country_complete": {
        "name": "Country Master",
        "description": "All landmarks in one country! You don't just visit - you CONQUER! 🏁",
        "icon": "🏁"
    },
    "points_100": {
        "name": "Point Starter",
        "description": "Your first 100 points! Every journey starts with a single step - you're on your way! ⭐",
        "icon": "⭐"
    },
    "points_500": {
        "name": "Point Collector",
        "description": "500 points earned! The points are adding up and so are your amazing memories! 🎯",
        "icon": "🌟"
    },
    "points_1000": {
        "name": "Point Master",
        "description": "1,000 points! Four digits! You're in the big leagues now - keep climbing! 💫",
        "icon": "💫"
    },
    "points_5000": {
        "name": "Point Legend",
        "description": "5,000 points?! You're rewriting the leaderboard. Absolute LEGEND status! ✨",
        "icon": "✨"
    },
    "social_5": {
        "name": "Friendly",
        "description": "5 travel buddies! Adventure is better with friends by your side! 👋",
        "icon": "👋"
    },
    "social_10": {
        "name": "Popular",
        "description": "10 friends in your crew! You're building a travel community - love it! 🤝",
        "icon": "🤝"
    },
    "social_25": {
        "name": "Social Butterfly",
        "description": "25 friends! You're not just exploring the world - you're bringing people together! 🦋",
        "icon": "🦋"
    },
    "streak_3": {
        "name": "Getting Started",
        "description": "3 days in a row! Consistency is key - keep that fire burning! 🔥",
        "icon": "🔥"
    },
    "streak_7": {
        "name": "Week Warrior",
        "description": "A full week streak! You're building a habit that will change your life! 🔥",
        "icon": "🔥"
    },
    "streak_30": {
        "name": "Monthly Master",
        "description": "30-day visit streak",
        "icon": "🔥"
    },
}

async def check_and_award_badges(user_id: str):
    """Check for new badges and award them"""
    newly_awarded = []
    
    # Get user's existing badges
    existing_badges = await db.achievements.find({"user_id": user_id}).to_list(1000)
    existing_badge_types = {badge["badge_type"] for badge in existing_badges}
    
    # Get user document for accurate stats
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return newly_awarded
    
    # Get accurate stats from user document
    total_points = user.get("points", 0)
    longest_streak = user.get("longest_streak", 0)
    
    # Get user's visits for visit count
    visits = await db.visits.find({"user_id": user_id}).to_list(1000)
    visit_count = len(visits)
    
    # Get friend count
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    })
    
    # Check milestone badges (adjusted for 520 total landmarks)
    milestones = [1, 10, 25, 50, 100, 200, 350, 500]
    for milestone in milestones:
        badge_type = f"milestone_{milestone}" if milestone > 1 else "first_visit"
        if visit_count >= milestone and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type if milestone > 1 else "first_visit")
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": milestone >= 100
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)
    
    # Check points badges
    point_milestones = [(100, "points_100"), (500, "points_500"), (1000, "points_1000"), (5000, "points_5000")]
    for points, badge_type in point_milestones:
        if total_points >= points and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type)
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": points >= 1000
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)
    
    # Check social badges
    social_milestones = [(5, "social_5"), (10, "social_10"), (25, "social_25")]
    for count, badge_type in social_milestones:
        if friend_count >= count and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type)
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": count >= 25
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)
    
    # Check country complete badges
    if visits:
        # Group visits by country
        visited_by_country = {}
        for visit in visits:
            landmark = await db.landmarks.find_one({"landmark_id": visit["landmark_id"]})
            if landmark:
                country_id = landmark.get("country_id")
                if country_id:
                    if country_id not in visited_by_country:
                        visited_by_country[country_id] = set()
                    visited_by_country[country_id].add(visit["landmark_id"])
        
        # Check if any country is complete
        for country_id, visited_landmarks in visited_by_country.items():
            all_country_landmarks = await db.landmarks.find({"country_id": country_id}).to_list(1000)
            total_in_country = len(all_country_landmarks)
            
            if len(visited_landmarks) >= total_in_country and total_in_country > 0:
                badge_type = f"country_complete_{country_id}"
                if badge_type not in existing_badge_types:
                    country = await db.countries.find_one({"country_id": country_id})
                    country_name = country.get("name", "Unknown") if country else "Unknown"
                    
                    achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                    achievement = {
                        "achievement_id": achievement_id,
                        "user_id": user_id,
                        "badge_type": badge_type,
                        "badge_name": f"{country_name} Master",
                        "badge_description": f"Completed all landmarks in {country_name}",
                        "badge_icon": "🏁",
                        "earned_at": datetime.now(timezone.utc),
                        "is_featured": True
                    }
                    await db.achievements.insert_one(achievement)
                    newly_awarded.append(badge_type)
    
    return newly_awarded

# ============= END BADGE SYSTEM =============

# ============= SUBSCRIPTION ENDPOINTS =============

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """Get current user's subscription status and limits"""
    is_pro = is_user_pro(current_user)
    limits = get_user_limits(current_user)
    
    # Get current usage stats
    friends_count = await db.friends.count_documents({
        "$or": [
            {"user_id": current_user.user_id, "status": "accepted"},
            {"friend_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    return {
        "subscription_tier": "pro" if is_pro else "free",
        "is_pro": is_pro,
        "expires_at": current_user.subscription_expires_at.isoformat() if current_user.subscription_expires_at else None,
        "limits": limits,
        "usage": {
            "friends_count": friends_count,
            "friends_limit": limits["max_friends"],
            "friends_remaining": max(0, limits["max_friends"] - friends_count),
        },
        "pricing": {
            "monthly": {"price": 3.99, "currency": "USD"},
            "yearly": {"price": 29.99, "currency": "USD", "savings": "37%"},
        }
    }

@api_router.post("/subscription/upgrade")
async def upgrade_subscription(
    plan: str,  # "monthly" or "yearly"
    current_user: User = Depends(get_current_user)
):
    """
    Upgrade user to Pro subscription.
    In production, this would integrate with Stripe/RevenueCat.
    For now, it directly activates the subscription for testing.
    """
    if plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'monthly' or 'yearly'")
    
    # Calculate expiration date
    if plan == "monthly":
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    else:  # yearly
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    
    # Update user subscription
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {
            "$set": {
                "subscription_tier": "pro",
                "subscription_expires_at": expires_at,
                "is_premium": True  # For backward compatibility
            }
        }
    )
    
    # Create activity for feed
    activity_id = f"activity_{uuid.uuid4().hex[:12]}"
    activity = {
        "activity_id": activity_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "activity_type": "subscription_upgrade",
        "description": f"upgraded to WanderList Pro! 🌟",
        "visibility": "public",
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    await db.activities.insert_one(activity)
    
    return {
        "success": True,
        "message": f"Welcome to WanderList Pro! Your {plan} subscription is now active.",
        "subscription_tier": "pro",
        "expires_at": expires_at.isoformat(),
        "features_unlocked": [
            "Access to 92 premium landmarks",
            "Unlimited friends",
            "Up to 10 photos per visit",
            "Custom visits feature",
            "All badges achievable"
        ]
    }

@api_router.post("/subscription/cancel")
async def cancel_subscription(current_user: User = Depends(get_current_user)):
    """Cancel Pro subscription (will remain active until expiry)"""
    if not is_user_pro(current_user):
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # In production, this would cancel the recurring payment
    # The subscription remains active until expires_at
    
    return {
        "success": True,
        "message": "Your subscription has been cancelled. You'll retain Pro access until your current period ends.",
        "expires_at": current_user.subscription_expires_at.isoformat() if current_user.subscription_expires_at else None
    }

# For testing purposes - remove in production
@api_router.post("/subscription/test-toggle")
async def toggle_subscription_for_testing(current_user: User = Depends(get_current_user)):
    """Toggle subscription on/off for testing purposes"""
    is_pro = is_user_pro(current_user)
    
    if is_pro:
        # Downgrade to free
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "subscription_tier": "free",
                    "subscription_expires_at": None,
                    "is_premium": False
                }
            }
        )
        return {"message": "Downgraded to free tier", "is_pro": False}
    else:
        # Upgrade to pro (1 year)
        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {
                "$set": {
                    "subscription_tier": "pro",
                    "subscription_expires_at": expires_at,
                    "is_premium": True
                }
            }
        )
        return {"message": "Upgraded to Pro tier", "is_pro": True, "expires_at": expires_at.isoformat()}

# ============= END SUBSCRIPTION ENDPOINTS =============

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
