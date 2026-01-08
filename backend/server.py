from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie
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
    is_premium: bool = False  # Deprecated, kept for backward compatibility
    subscription_tier: str = "free"  # "free", "basic", "premium"
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
    is_premium: bool = False  # Deprecated
    subscription_tier: str = "free"

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
    photo_base64: Optional[str] = None  # Main photo (for backward compatibility)
    photos: Optional[List[str]] = []  # Photo collage - up to 10 photos (base64)
    points_earned: int = 10  # Points earned for this visit
    comments: Optional[str] = None
    visit_location: Optional[dict] = None  # For Northern Lights: {"latitude": float, "longitude": float, "region": str}
    diary_notes: Optional[str] = None  # Travel diary entry
    travel_tips: Optional[List[str]] = []  # Array of travel tips
    status: str = "accepted"
    verified: bool = True  # True if has photo, False if no photo (friends-only)
    visited_at: datetime
    created_at: datetime

class VisitCreate(BaseModel):
    landmark_id: str
    photo_base64: Optional[str] = None  # Main photo (for backward compatibility)
    photos: Optional[List[str]] = []  # Photo collage - up to 10 photos
    comments: Optional[str] = None
    visit_location: Optional[dict] = None  # For Northern Lights: {"latitude": float, "longitude": float, "region": str}
    diary_notes: Optional[str] = None  # Travel diary entry
    travel_tips: Optional[List[str]] = []  # Array of travel tips (max 5)
    visited_at: Optional[datetime] = None  # Allow custom date for past visits

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

class TripPlan(BaseModel):
    trip_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    landmark_ids: List[str] = []
    budget: Optional[float] = None
    is_public: bool = False
    created_at: datetime
    updated_at: datetime

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

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ============= COUNTRY & LANDMARK ENDPOINTS =============

@api_router.get("/countries", response_model=List[Country])
async def get_countries(current_user: User = Depends(get_current_user)):
    countries = await db.countries.find({}, {"_id": 0}).to_list(1000)
    
    # Count landmarks for each country
    for country in countries:
        count = await db.landmarks.count_documents({"country_id": country["country_id"], "category": "official"})
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
    if landmark.get("category") == "premium" and current_user.subscription_tier == "free":
        raise HTTPException(status_code=403, detail="Premium subscription required to visit this landmark")
    
    # Validate photo collage limit (max 10 photos)
    photos = data.photos or []
    if len(photos) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 photos allowed per visit")
    
    # Validate travel tips limit (max 5 tips)
    travel_tips = data.travel_tips or []
    if len(travel_tips) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 travel tips allowed per visit")
    
    # Determine if visit is verified (has photo proof)
    is_verified = bool(data.photo_base64 or len(photos) > 0)
    
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    visit = {
        "visit_id": visit_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "photo_base64": data.photo_base64,
        "photos": photos,  # Photo collage
        "points_earned": landmark.get("points", 10),  # Use landmark's point value
        "comments": data.comments,
        "visit_location": data.visit_location,
        "diary_notes": data.diary_notes,  # Travel diary
        "travel_tips": travel_tips,  # Travel tips array
        "status": "accepted",
        "verified": is_verified,  # True if has photo, False if not
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
    
    # Update user document with new streak data
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_visit_date": today
        }}
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
        "created_at": datetime.now(timezone.utc),
        "likes_count": 0,
        "comments_count": 0
    }
    
    await db.activities.insert_one(activity)
    
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
    visit_count = await db.visits.count_documents({"user_id": current_user.user_id})
    if visit_count in [10, 25, 50, 100, 250, 500]:
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

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(current_user: User = Depends(get_current_user)):
    if current_user.is_premium:
        # Global leaderboard for premium users - ONLY VERIFIED VISITS (with photos)
        pipeline = [
            {"$match": {"verified": True}},  # Only count visits with photo proof
            {"$group": {"_id": "$user_id", "visit_count": {"$sum": 1}}},
            {"$sort": {"visit_count": -1}},
            {"$limit": 100}
        ]
        results = await db.visits.aggregate(pipeline).to_list(100)
        
        leaderboard = []
        for idx, entry in enumerate(results):
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
            if user:
                leaderboard.append(LeaderboardEntry(
                    user_id=user["user_id"],
                    name=user["name"],
                    picture=user.get("picture"),
                    total_points=entry["visit_count"],
                    rank=idx + 1
                ))
        return leaderboard
    else:
        # Friends leaderboard for freemium users - ALL VISITS (verified and unverified)
        # Get friend IDs
        friendships = await db.friends.find({
            "$or": [
                {"user_id": current_user.user_id, "status": "accepted"},
                {"friend_id": current_user.user_id, "status": "accepted"}
            ]
        }, {"_id": 0}).to_list(1000)
        
        friend_ids = [current_user.user_id]  # Include self
        for f in friendships:
            if f["user_id"] == current_user.user_id:
                friend_ids.append(f["friend_id"])
            else:
                friend_ids.append(f["user_id"])
        
        # Get visit counts for friends
        pipeline = [
            {"$match": {"user_id": {"$in": friend_ids}}},
            {"$group": {"_id": "$user_id", "visit_count": {"$sum": 1}}},
            {"$sort": {"visit_count": -1}}
        ]
        results = await db.visits.aggregate(pipeline).to_list(1000)
        
        leaderboard = []
        for idx, entry in enumerate(results):
            user = await db.users.find_one({"user_id": entry["_id"]}, {"_id": 0})
            if user:
                leaderboard.append(LeaderboardEntry(
                    user_id=user["user_id"],
                    name=user["name"],
                    picture=user.get("picture"),
                    total_points=entry["visit_count"],
                    rank=idx + 1
                ))
        return leaderboard

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
        "friends_count": friend_count
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
    """Get activity feed from friends"""
    
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
    
    # Add current user to see own activities
    friend_ids.append(current_user.user_id)
    
    # Get activities from friends, sorted by recent
    activities = await db.activities.find(
        {"user_id": {"$in": friend_ids}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich activities with like and comment counts, and check if current user liked
    enriched_activities = []
    for activity in activities:
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
        
        enriched_activities.append(Activity(**activity))
    
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

# ============= END ACTIVITY FEED ENDPOINTS =============

# ============= ACHIEVEMENTS ENDPOINTS =============

@api_router.get("/achievements", response_model=List[Achievement])
async def get_user_achievements(current_user: User = Depends(get_current_user)):
    """Get all achievements/badges for the current user"""
    achievements = await db.achievements.find(
        {"user_id": current_user.user_id}
    ).sort("earned_at", -1).to_list(1000)
    
    return [Achievement(**achievement) for achievement in achievements]

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
        "description": "Visited your first landmark",
        "icon": "🎯"
    },
    "milestone_10": {
        "name": "Explorer",
        "description": "Visited 10 landmarks",
        "icon": "🗺️"
    },
    "milestone_25": {
        "name": "Adventurer",
        "description": "Visited 25 landmarks",
        "icon": "🧗"
    },
    "milestone_50": {
        "name": "Globetrotter",
        "description": "Visited 50 landmarks",
        "icon": "🌍"
    },
    "milestone_100": {
        "name": "World Traveler",
        "description": "Visited 100 landmarks",
        "icon": "✈️"
    },
    "milestone_250": {
        "name": "Legend",
        "description": "Visited 250 landmarks",
        "icon": "🏆"
    },
    "milestone_500": {
        "name": "Ultimate Explorer",
        "description": "Visited 500 landmarks",
        "icon": "👑"
    },
    "country_complete": {
        "name": "Country Master",
        "description": "Completed all landmarks in a country",
        "icon": "🏁"
    },
    "points_100": {
        "name": "Point Starter",
        "description": "Earned 100 points",
        "icon": "⭐"
    },
    "points_500": {
        "name": "Point Collector",
        "description": "Earned 500 points",
        "icon": "🌟"
    },
    "points_1000": {
        "name": "Point Master",
        "description": "Earned 1,000 points",
        "icon": "💫"
    },
    "points_5000": {
        "name": "Point Legend",
        "description": "Earned 5,000 points",
        "icon": "✨"
    },
    "social_5": {
        "name": "Friendly",
        "description": "Made 5 friends",
        "icon": "👋"
    },
    "social_10": {
        "name": "Popular",
        "description": "Made 10 friends",
        "icon": "🤝"
    },
    "social_25": {
        "name": "Social Butterfly",
        "description": "Made 25 friends",
        "icon": "🦋"
    },
    "streak_3": {
        "name": "Getting Started",
        "description": "3-day visit streak",
        "icon": "🔥"
    },
    "streak_7": {
        "name": "Week Warrior",
        "description": "7-day visit streak",
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
    
    # Get user's visits
    visits = await db.visits.find({"user_id": user_id}).to_list(10000)
    visit_count = len(visits)
    
    # Calculate total points
    total_points = sum(v.get("points_earned", 10) for v in visits)
    
    # Get friend count
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    })
    
    # Check milestone badges
    milestones = [1, 10, 25, 50, 100, 250, 500]
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
