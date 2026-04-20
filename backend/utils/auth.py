from fastapi import HTTPException, Request, Cookie, Depends
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
import os

from utils.db import db
from models.all import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


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


def is_user_pro(user: User) -> bool:
    if user.subscription_tier != "pro":
        return False
    if user.subscription_expires_at:
        expires_at = user.subscription_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return False
    return True


LIMITS = {
    "free": {
        "max_friends": 5,
        "photos_per_visit": 1,
        "diary_entries_per_month": 3,
        "can_access_premium_landmarks": False,
        "can_create_custom_visits": False,
    },
    "pro": {
        "max_friends": 999999,
        "photos_per_visit": 10,
        "diary_entries_per_month": 999999,
        "can_access_premium_landmarks": True,
        "can_create_custom_visits": True,
    }
}


def get_user_limits(user: User) -> dict:
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
    if session_token:
        user = await get_current_user_from_session(session_token)
        if user:
            _tag_sentry_user(user)
            return user
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user = await get_current_user_from_token(token)
        if user:
            _tag_sentry_user(user)
            return user
    raise HTTPException(status_code=401, detail="Not authenticated")


def _tag_sentry_user(user: User) -> None:
    """Attach user context to Sentry scope — safe no-op if Sentry is disabled."""
    try:
        from utils.sentry import set_sentry_user
        set_sentry_user(
            user_id=user.user_id,
            email=getattr(user, "email", None),
            username=getattr(user, "username", None),
        )
    except Exception:
        pass


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    return current_user


async def get_super_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    return current_user
