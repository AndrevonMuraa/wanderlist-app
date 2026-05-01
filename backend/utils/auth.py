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


# --- Per-user brute-force lockout ---
# Progressive backoff: 3 failures → 1min, 5 → 10min, 10 → 1h, 15 → 24h.
_LOCKOUT_TIERS = [
    (3, timedelta(minutes=1)),
    (5, timedelta(minutes=10)),
    (10, timedelta(hours=1)),
    (15, timedelta(hours=24)),
]


async def check_user_locked(email: str) -> Optional[datetime]:
    """Return `locked_until` datetime if the account is currently locked, else None."""
    doc = await db.users.find_one(
        {"email": email},
        {"_id": 0, "locked_until": 1},
    )
    if not doc:
        return None
    locked_until = doc.get("locked_until")
    if not locked_until:
        return None
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until > datetime.now(timezone.utc):
        return locked_until
    return None


async def register_failed_login(email: str) -> None:
    """Increment `failed_login_attempts` and apply progressive lockout."""
    user = await db.users.find_one(
        {"email": email},
        {"_id": 0, "user_id": 1, "failed_login_attempts": 1},
    )
    if not user:
        return
    attempts = (user.get("failed_login_attempts") or 0) + 1
    update = {"failed_login_attempts": attempts, "last_failed_login_at": datetime.now(timezone.utc)}
    # Find the highest threshold crossed — most strict wins.
    for threshold, duration in reversed(_LOCKOUT_TIERS):
        if attempts >= threshold:
            update["locked_until"] = datetime.now(timezone.utc) + duration
            break
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})


async def clear_failed_logins(user_id: str) -> None:
    """Reset lockout state after a successful login."""
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"failed_login_attempts": "", "locked_until": "", "last_failed_login_at": ""}},
    )


LIMITS = {
    "free": {
        "max_friends": 5,
        "photos_per_visit": 3,
        "diary_entries_per_month": 10,
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
    user: Optional[User] = None
    if session_token:
        user = await get_current_user_from_session(session_token)
    if not user:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            user = await get_current_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Enforce active suspensions (auth-blocked until the date passes).
    # Super-admins bypass so a suspended admin can un-suspend themselves.
    if user.role != "admin" and user.suspended_until:
        suspended_until = user.suspended_until
        if suspended_until.tzinfo is None:
            suspended_until = suspended_until.replace(tzinfo=timezone.utc)
        if suspended_until > datetime.now(timezone.utc):
            reason = user.suspension_reason or "Violation of community guidelines"
            raise HTTPException(
                status_code=403,
                detail=f"Account suspended until {suspended_until.strftime('%b %d, %Y')}. Reason: {reason}",
            )

    _tag_sentry_user(user)
    return user


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
        raise HTTPException(
            status_code=403,
            detail="This action requires Super Admin privileges. Moderators cannot perform destructive operations (leaderboard recalculation, stripping verified points, role changes)."
        )
    if current_user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    return current_user
