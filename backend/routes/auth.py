from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie, Body
from fastapi.responses import HTMLResponse
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, SECRET_KEY, ALGORITHM, pwd_context,
)
from models.all import (
    User, UserPublic, ProfileUpdate, RegisterRequest, LoginRequest,
    GoogleTokenRequest, MagicLinkRequest, MagicLinkVerifyRequest,
    SessionDataResponse, AppleAuthRequest,
)
import httpx

router = APIRouter()

# ============= ADMIN SETUP =============

@router.post("/admin/setup")
async def admin_setup(current_user: User = Depends(get_current_user)):
    """One-time setup: promote current user to admin if no admins exist"""
    existing_admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if existing_admin:
        raise HTTPException(status_code=403, detail="Admin already exists. Contact an existing admin for role changes.")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"role": "admin"}}
    )
    
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": current_user.user_id,
        "admin_name": current_user.name,
        "action": "initial_admin_setup",
        "target_id": current_user.user_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "You are now the admin", "role": "admin"}

# ============= AUTH ENDPOINTS =============

@router.post("/auth/register")
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

@router.post("/auth/login")
async def login(data: LoginRequest):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reactivate if deactivated
    reactivated = False
    if user_doc.get("is_active") is False:
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$unset": {"deactivated_at": "", "scheduled_deletion_at": ""}, "$set": {"is_active": True}}
        )
        reactivated = True
    
    access_token, expires_at = create_access_token({"sub": user_doc["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(**user_doc),
        "reactivated": reactivated,
    }

@router.post("/auth/google/callback")
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

@router.post("/auth/apple/callback")
async def apple_callback(auth_data: AppleAuthRequest, response: Response):
    """
    Handle Apple Sign-In callback.
    Apple only provides email/name on first sign-in, so we need to handle both cases.
    """
    import jwt
    
    try:
        logging.info(f"[Apple Auth] Received callback - has identity_token: {bool(auth_data.identity_token)}, "
                     f"user_id: {auth_data.user_id[:20] if auth_data.user_id else 'None'}..., "
                     f"email: {auth_data.email}, full_name: {auth_data.full_name}")
        logging.info(f"[Apple Auth] identity_token length: {len(auth_data.identity_token) if auth_data.identity_token else 0}")
        
        # Decode the identity token (we don't verify signature in dev, but should in production)
        # In production, verify against Apple's public keys
        decoded = jwt.decode(auth_data.identity_token, options={"verify_signature": False})
        logging.info(f"[Apple Auth] Token decoded successfully - sub: {decoded.get('sub', 'N/A')[:20]}..., email: {decoded.get('email', 'N/A')}")
        
        apple_user_id = decoded.get("sub")  # Apple's unique user ID
        email = auth_data.email or decoded.get("email")
        
        if not email:
            # Try to find existing user by Apple ID
            existing_user = await db.users.find_one({"apple_user_id": apple_user_id}, {"_id": 0})
            if existing_user:
                email = existing_user.get("email")
                logging.info(f"[Apple Auth] Found existing user by Apple ID, email: {email}")
            else:
                logging.warning(f"[Apple Auth] No email available and no existing user found")
                raise HTTPException(status_code=400, detail="Email is required for first-time sign-in")
        
        # Check if user exists by email or Apple ID
        existing_user = await db.users.find_one({
            "$or": [
                {"email": email},
                {"apple_user_id": apple_user_id}
            ]
        }, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            logging.info(f"[Apple Auth] Found existing user: {user_id}")
            # Update Apple user ID if not set
            if not existing_user.get("apple_user_id"):
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"apple_user_id": apple_user_id}}
                )
            # Reactivate if deactivated
            if existing_user.get("is_active") is False:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$unset": {"deactivated_at": "", "scheduled_deletion_at": ""}, "$set": {"is_active": True}}
                )
                logging.info(f"[Apple Auth] Reactivated deactivated account: {user_id}")
        else:
            # Create new user with auto-generated username
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            name = auth_data.full_name or email.split("@")[0]
            
            # Generate username from name (lowercase, no spaces, add random suffix)
            base_username = "".join(c for c in name.lower().replace(" ", "_") if c.isalnum() or c == "_")
            if not base_username or len(base_username) < 3:
                base_username = "wanderer"
            username = f"{base_username}_{uuid.uuid4().hex[:4]}"
            # Ensure uniqueness
            while await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0}):
                username = f"{base_username}_{uuid.uuid4().hex[:4]}"
            
            new_user = {
                "user_id": user_id,
                "email": email,
                "username": username,
                "name": name,
                "picture": None,
                "is_premium": False,
                "password_hash": None,
                "apple_user_id": apple_user_id,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
            logging.info(f"[Apple Auth] Created new user: {user_id} with username: {username}")
        
        # Create JWT token
        access_token, expires_at = create_access_token({"sub": user_id})
        
        # Get updated user data
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        logging.info(f"[Apple Auth] Login successful for user: {user_id}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_doc
        }
        
    except jwt.PyJWTError as e:
        logging.error(f"[Apple Auth] JWT decode error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid identity token: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"[Apple Auth] Unexpected error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Apple login error: {str(e)}")

# ============= MAGIC LINK AUTH =============

@router.post("/auth/magic-link/send")
async def send_magic_link(data: MagicLinkRequest):
    """Send a 6-digit login code to the user's email."""
    import asyncio
    import resend
    import random
    
    resend.api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    email = data.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store code in database
    await db.magic_codes.delete_many({"email": email})
    await db.magic_codes.insert_one({
        "email": email,
        "code": code,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Send email
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a2e; margin-bottom: 8px;">WanderMark Login</h2>
        <p style="color: #666; font-size: 15px; margin-bottom: 24px;">Enter this code to log in:</p>
        <div style="background: #f0f4ff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">{code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    
    try:
        params = {
            "from": f"WanderMark <{sender_email}>",
            "to": [email],
            "subject": f"WanderMark login code: {code}",
            "html": html_content,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"[Magic Link] Code sent to {email}")
        return {"status": "sent", "message": "Login code sent to your email"}
    except Exception as e:
        logging.error(f"[Magic Link] Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/auth/magic-link/verify")
async def verify_magic_link(data: MagicLinkVerifyRequest):
    """Verify the 6-digit code and log the user in."""
    email = data.email.strip().lower()
    code = data.code.strip()
    
    # Find and validate code
    record = await db.magic_codes.find_one({"email": email, "code": code}, {"_id": 0})
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid code")
    
    expires_at = record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        await db.magic_codes.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    
    # Delete used code
    await db.magic_codes.delete_many({"email": email})
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        logging.info(f"[Magic Link] Existing user logged in: {user_id}")
        # Reactivate if deactivated
        if existing_user.get("is_active") is False:
            await db.users.update_one(
                {"user_id": user_id},
                {"$unset": {"deactivated_at": "", "scheduled_deletion_at": ""}, "$set": {"is_active": True}}
            )
            logging.info(f"[Magic Link] Reactivated deactivated account: {user_id}")
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        name = email.split("@")[0]
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": None,
            "is_premium": False,
            "password_hash": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
        logging.info(f"[Magic Link] Created new user: {user_id}")
    
    # Create JWT token
    access_token, expires_at = create_access_token({"sub": user_id})
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_doc
    }

# ============= END MAGIC LINK AUTH =============

@router.post("/auth/google/token")
async def google_token_login(auth_data: GoogleTokenRequest, response: Response):
    """
    Handle Google Sign-In with access token.
    Receives user info that was fetched from Google's API using the access token.
    """
    try:
        email = auth_data.email
        google_id = auth_data.google_id
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Check if user exists by email or Google ID
        existing_user = await db.users.find_one({
            "$or": [
                {"email": email},
                {"google_id": google_id}
            ]
        }, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update Google ID and picture if not set
            update_fields = {}
            if not existing_user.get("google_id"):
                update_fields["google_id"] = google_id
            if auth_data.picture and not existing_user.get("picture"):
                update_fields["picture"] = auth_data.picture
            if update_fields:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": update_fields}
                )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            name = auth_data.name or email.split("@")[0]
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": auth_data.picture,
                "is_premium": False,
                "password_hash": None,
                "google_id": google_id,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
        
        # Create JWT token
        access_token, expires_at = create_access_token({"sub": user_id})
        
        # Get updated user data
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_doc
        }
        
    except Exception as e:
        logging.error(f"Google token login error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Google login failed: {str(e)}")

@router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic(**current_user.dict())

@router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile information"""
    update_fields = {}
    
    if profile_data.name is not None:
        update_fields["name"] = profile_data.name
    
    if profile_data.username is not None:
        # Validate username
        username = profile_data.username.strip()
        if len(username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if len(username) > 30:
            raise HTTPException(status_code=400, detail="Username must be 30 characters or less")
        if not username.replace("_", "").replace(".", "").isalnum():
            raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, underscores and dots")
        # Check uniqueness (case-insensitive), excluding current user
        existing = await db.users.find_one(
            {"username": {"$regex": f"^{username}$", "$options": "i"}, "user_id": {"$ne": current_user.user_id}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_fields["username"] = username
    
    if profile_data.picture is not None:
        update_fields["picture"] = profile_data.picture
    
    if profile_data.bio is not None:
        # Limit bio to 200 characters
        update_fields["bio"] = profile_data.bio[:200] if profile_data.bio else None
    
    if profile_data.location is not None:
        update_fields["location"] = profile_data.location
    
    if profile_data.banner_image is not None:
        update_fields["banner_image"] = profile_data.banner_image
    
    if profile_data.featured_badges is not None:
        # Limit to 3 featured badges max
        update_fields["featured_badges"] = profile_data.featured_badges[:3]
    
    if update_fields:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": update_fields}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return UserPublic(**updated_user)

@router.put("/auth/privacy")
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

@router.put("/auth/change-password")
async def change_password(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Change user password. Requires current password and new password."""
    body = await request.json()
    current_password = body.get("current_password", "")
    new_password = body.get("new_password", "")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Both current and new password are required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id})
    if not user_doc or not verify_password(current_password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    return {"message": "Password changed successfully"}

@router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

@router.get("/auth/temp-token")
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


@router.delete("/auth/account")
async def deactivate_account(current_user: User = Depends(get_current_user)):
    """Deactivate user account. Account will be permanently deleted after 30 days."""
    user_id = current_user.user_id
    deletion_date = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "deactivated_at": datetime.now(timezone.utc),
            "scheduled_deletion_at": deletion_date,
            "is_active": False,
        }}
    )
    
    return {
        "message": "Account deactivated",
        "scheduled_deletion_at": deletion_date.isoformat(),
        "reactivation_info": "Log in again within 30 days to reactivate your account."
    }


@router.post("/auth/account/purge-deactivated")
async def purge_deactivated_accounts():
    """Permanently delete accounts that have been deactivated for over 30 days.
    Call this periodically (e.g. daily cron job)."""
    now = datetime.now(timezone.utc)
    
    expired = db.users.find(
        {"is_active": False, "scheduled_deletion_at": {"$lte": now}},
        {"_id": 0, "user_id": 1}
    )
    
    deleted_count = 0
    async for user_doc in expired:
        uid = user_doc["user_id"]
        await db.visits.delete_many({"user_id": uid})
        await db.country_visits.delete_many({"user_id": uid})
        await db.user_created_visits.delete_many({"user_id": uid})
        await db.achievements.delete_many({"user_id": uid})
        await db.friendships.delete_many({"$or": [{"user_id": uid}, {"friend_id": uid}]})
        await db.friend_requests.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})
        await db.messages.delete_many({"$or": [{"sender_id": uid}, {"receiver_id": uid}]})
        await db.notifications.delete_many({"user_id": uid})
        await db.activities.delete_many({"user_id": uid})
        await db.community_photos.delete_many({"user_id": uid})
        await db.travel_diaries.delete_many({"user_id": uid})
        await db.users.delete_one({"user_id": uid})
        deleted_count += 1
    
    return {"purged_accounts": deleted_count}
