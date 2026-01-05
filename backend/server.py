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
    name: str
    picture: Optional[str] = None
    is_premium: bool = False  # Deprecated, kept for backward compatibility
    subscription_tier: str = "free"  # "free", "basic", "premium"
    password_hash: Optional[str] = None
    created_at: datetime

class UserPublic(BaseModel):
    user_id: str
    email: str
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

class Challenge(BaseModel):
    challenge_id: str
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    tier_required: str  # "basic" or "premium"
    reward_badge_id: Optional[str] = None
    target_landmarks: List[str]
    target_count: int

class RegisterRequest(BaseModel):
    email: str
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
    landmark_count: int = 0

class Landmark(BaseModel):
    landmark_id: str
    name: str
    country_id: str
    country_name: str
    continent: str
    description: str
    category: str  # "official" or "user_suggested"
    image_url: str
    upvotes: int = 0
    created_by: Optional[str] = None
    created_at: datetime

class LandmarkCreate(BaseModel):
    name: str
    country_id: str
    description: str
    image_url: str

class Visit(BaseModel):
    visit_id: str
    user_id: str
    landmark_id: str
    photo_base64: str
    comments: Optional[str] = None
    diary_notes: Optional[str] = None
    visited_at: datetime

class VisitCreate(BaseModel):
    landmark_id: str
    photo_base64: str
    comments: Optional[str] = None
    diary_notes: Optional[str] = None

class Friend(BaseModel):
    friendship_id: str
    user_id: str
    friend_id: str
    status: str  # "pending" or "accepted"
    created_at: datetime

class FriendRequest(BaseModel):
    friend_email: str

class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    picture: Optional[str] = None
    visit_count: int
    rank: int

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
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "is_premium": False,
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
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if country_id:
        query["country_id"] = country_id
    if category:
        query["category"] = category
    
    landmarks = await db.landmarks.find(query, {"_id": 0}).sort("upvotes", -1).to_list(1000)
    return [Landmark(**l) for l in landmarks]

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

@api_router.post("/visits", response_model=Visit)
async def create_visit(data: VisitCreate, current_user: User = Depends(get_current_user)):
    # Check if landmark exists
    landmark = await db.landmarks.find_one({"landmark_id": data.landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")
    
    # Check if already visited
    existing = await db.visits.find_one({
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already visited this landmark")
    
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    visit = {
        "visit_id": visit_id,
        "user_id": current_user.user_id,
        "landmark_id": data.landmark_id,
        "photo_base64": data.photo_base64,
        "comments": data.comments,
        "diary_notes": data.diary_notes,
        "visited_at": datetime.now(timezone.utc)
    }
    
    await db.visits.insert_one(visit)
    return Visit(**visit)

# ============= LEADERBOARD ENDPOINTS =============

@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(current_user: User = Depends(get_current_user)):
    if current_user.is_premium:
        # Global leaderboard for premium users
        pipeline = [
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
                    visit_count=entry["visit_count"],
                    rank=idx + 1
                ))
        return leaderboard
    else:
        # Friends leaderboard for freemium users
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
                    visit_count=entry["visit_count"],
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
    # Find friend by email
    friend = await db.users.find_one({"email": data.friend_email}, {"_id": 0})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
