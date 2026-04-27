from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import Optional
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_admin_user, get_super_admin_user
from utils.helpers import create_notification
from utils.sentry import IMAGE_NORM_COUNTERS
from models.all import User, AdminUserUpdate, AdminReportUpdate, AdminNotificationRequest


router = APIRouter()

# ============= ADMIN ENDPOINTS =============

@router.get("/admin/stats")
async def get_admin_stats(admin_user: User = Depends(get_admin_user)):
    """Get dashboard statistics for admin panel"""
    # User stats
    total_users = await db.users.count_documents({})
    pro_users = await db.users.count_documents({"subscription_tier": "pro"})
    banned_users = await db.users.count_documents({"is_banned": True})
    
    # Get users registered in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    # Get users registered in last 30 days
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    new_users_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
    
    # Visit stats
    total_visits = await db.visits.count_documents({})
    visits_week = await db.visits.count_documents({"created_at": {"$gte": week_ago}})
    visits_month = await db.visits.count_documents({"created_at": {"$gte": month_ago}})
    
    # Report stats
    total_reports = await db.reports.count_documents({})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    # Content stats
    total_landmarks = await db.landmarks.count_documents({})
    total_countries = await db.countries.count_documents({})
    
    return {
        "users": {
            "total": total_users,
            "pro": pro_users,
            "free": total_users - pro_users,
            "banned": banned_users,
            "new_this_week": new_users_week,
            "new_this_month": new_users_month
        },
        "visits": {
            "total": total_visits,
            "this_week": visits_week,
            "this_month": visits_month
        },
        "reports": {
            "total": total_reports,
            "pending": pending_reports
        },
        "content": {
            "landmarks": total_landmarks,
            "countries": total_countries
        }
    }


@router.get("/admin/image-normalization-stats")
async def get_image_normalization_stats(admin_user: User = Depends(get_admin_user)):
    """Observability for server-side image defense-in-depth (P5).

    Returns cumulative counters since the current process started. Use the
    ratio between `auto_resized` + `rejected` vs. total uploads as an
    early-warning signal:
    - High `auto_resized` → client-side compression failing / being bypassed
    - Non-zero `rejected` → users hitting the 5 MB hard ceiling (investigate)
    NOTE: counters reset on backend restart. For long-term trends, rely on
    the Sentry events / breadcrumbs emitted by the same code path.
    """
    return {
        "counters": dict(IMAGE_NORM_COUNTERS),
        "thresholds": {
            "auto_resize_above_mb": 2,
            "reject_above_mb": 5,
            "target_dimension_px": 1600,
            "jpeg_quality": 70,
        },
        "note": "Counters reset on backend restart. Sentry breadcrumbs + warnings provide the authoritative long-term record.",
    }

@router.get("/admin/users")
async def get_admin_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    tier: Optional[str] = None,
    is_banned: Optional[bool] = None,
    has_warnings: Optional[bool] = None,
    suspended: Optional[bool] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    admin_user: User = Depends(get_admin_user)
):
    """Get list of users with filtering and pagination"""
    query = {}
    
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    
    if role:
        query["role"] = role
    
    if tier:
        query["subscription_tier"] = tier
    
    if is_banned is not None:
        query["is_banned"] = is_banned

    if has_warnings is True:
        query["warning_count"] = {"$gt": 0}

    if suspended is True:
        query["suspended_until"] = {"$gt": datetime.now(timezone.utc)}
    
    # Get total count
    total = await db.users.count_documents(query)
    
    # Sort direction
    sort_dir = -1 if sort_order == "desc" else 1
    
    # Fetch users
    skip = (page - 1) * limit
    users = await db.users.find(
        query, 
        {"_id": 0, "password_hash": 0}
    ).sort(sort_by, sort_dir).skip(skip).limit(limit).to_list(limit)
    
    # Add visit counts for each user
    for user in users:
        user["visit_count"] = await db.visits.count_documents({"user_id": user["user_id"]})
        user["points"] = user.get("points", 0)
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/admin/users/{user_id}")
async def get_admin_user_detail(user_id: str, admin_user: User = Depends(get_admin_user)):
    """Get detailed user information for admin"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user statistics
    visit_count = await db.visits.count_documents({"user_id": user_id})
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    })
    
    # Get countries visited
    visits = await db.visits.find({"user_id": user_id}, {"landmark_id": 1}).to_list(10000)
    landmark_ids = [v["landmark_id"] for v in visits]
    if landmark_ids:
        countries = await db.landmarks.distinct("country_name", {"landmark_id": {"$in": landmark_ids}})
        countries_count = len(countries)
    else:
        countries_count = 0
    
    # Get recent activity
    recent_visits = await db.visits.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Get reports involving this user
    reports_about = await db.reports.find(
        {"target_id": user_id, "report_type": "user"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    reports_by = await db.reports.find(
        {"reporter_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        **user,
        "stats": {
            "visits": visit_count,
            "friends": friend_count,
            "countries": countries_count,
            "points": user.get("points", 0),
            "leaderboard_points": user.get("leaderboard_points", 0)
        },
        "recent_visits": recent_visits,
        "reports_about": reports_about,
        "reports_by": reports_by
    }

@router.put("/admin/users/{user_id}")
async def update_admin_user(
    user_id: str, 
    update_data: AdminUserUpdate,
    admin_user: User = Depends(get_admin_user)
):
    """Update user details (tier, role, ban status)"""
    update_fields = {}
    
    if update_data.subscription_tier is not None:
        if update_data.subscription_tier not in ["free", "pro"]:
            raise HTTPException(status_code=400, detail="Invalid tier. Must be 'free' or 'pro'")
        update_fields["subscription_tier"] = update_data.subscription_tier
        # Set expiration for pro (1 year from now)
        if update_data.subscription_tier == "pro":
            update_fields["subscription_expires_at"] = datetime.now(timezone.utc) + timedelta(days=365)
    
    if update_data.role is not None:
        # Only super admins can change roles
        if admin_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can change user roles")
        if update_data.role not in ["user", "moderator", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_fields["role"] = update_data.role
    
    if update_data.is_banned is not None:
        update_fields["is_banned"] = update_data.is_banned
        if update_data.is_banned:
            update_fields["banned_at"] = datetime.now(timezone.utc)
            update_fields["ban_reason"] = update_data.ban_reason or "Violation of terms of service"
        else:
            update_fields["banned_at"] = None
            update_fields["ban_reason"] = None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log admin action
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "action": "user_update",
        "target_id": user_id,
        "changes": update_fields,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "User updated successfully", "changes": update_fields}

@router.put("/admin/users/{user_id}/tier")
async def update_user_tier(
    user_id: str,
    request: dict,
    admin_user: User = Depends(get_admin_user)
):
    """Admin endpoint to upgrade/downgrade user subscription tier"""
    tier = request.get("tier")
    if not tier or tier not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid tier. Must be 'free' or 'pro'")
    
    update_fields = {"subscription_tier": tier}
    if tier == "pro":
        update_fields["subscription_expires_at"] = datetime.now(timezone.utc) + timedelta(days=365)
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_id} upgraded to {tier} tier", "tier": tier}

@router.get("/admin/reports")
async def get_admin_reports(
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin_user: User = Depends(get_admin_user)
):
    """Get list of reports with filtering"""
    query = {}
    
    if status:
        query["status"] = status
    
    if report_type:
        query["report_type"] = report_type
    
    total = await db.reports.count_documents(query)
    
    skip = (page - 1) * limit
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with reporter info + auto-flag state (3+ pending reports on same target)
    from utils.auto_flag import get_flagged_target_ids, AUTO_FLAG_THRESHOLD

    # Count pending photo/activity reports per target_id for badge
    target_ids_in_page = list({r.get("target_id") for r in reports if r.get("target_id")})
    pending_count_map = {}
    if target_ids_in_page:
        count_agg = await db.reports.aggregate([
            {"$match": {
                "target_id": {"$in": target_ids_in_page},
                "status": "pending",
                "report_type": {"$in": ["photo", "activity"]}
            }},
            {"$group": {"_id": "$target_id", "count": {"$sum": 1}}}
        ]).to_list(len(target_ids_in_page))
        pending_count_map = {c["_id"]: c["count"] for c in count_agg}

    for report in reports:
        reporter = await db.users.find_one(
            {"user_id": report["reporter_id"]},
            {"_id": 0, "name": 1, "email": 1, "picture": 1}
        )
        report["reporter"] = reporter

        # Get target info / content preview based on type. Allows moderators to
        # judge reports without leaving the queue.
        rtype = report.get("report_type")
        target_id = report.get("target_id")
        if rtype == "user" and target_id:
            target = await db.users.find_one(
                {"user_id": target_id},
                {"_id": 0, "name": 1, "email": 1, "picture": 1, "user_id": 1}
            )
            report["target"] = target
        elif rtype in ("photo", "activity", "diary") and target_id:
            visit = await db.visits.find_one(
                {"visit_id": target_id},
                {"_id": 0, "user_id": 1, "landmark_id": 1, "photos": 1, "diary_notes": 1, "visited_at": 1}
            )
            if not visit:
                visit = await db.user_created_visits.find_one(
                    {"user_created_visit_id": target_id},
                    {"_id": 0, "user_id": 1, "country_name": 1, "trip_name": 1, "photos": 1, "diary": 1, "visited_at": 1}
                )
            if visit:
                owner = await db.users.find_one(
                    {"user_id": visit.get("user_id")},
                    {"_id": 0, "name": 1, "email": 1, "picture": 1, "user_id": 1}
                )
                report["target"] = owner
                # Content preview: thumbnail (1st photo) + diary snippet (200 chars)
                photos = visit.get("photos") or []
                diary_text = visit.get("diary_notes") or visit.get("diary") or ""
                report["content_preview"] = {
                    "photo_url": photos[0] if photos else None,
                    "photo_count": len(photos),
                    "diary_snippet": (diary_text[:200] + "…") if len(diary_text) > 200 else diary_text,
                    "landmark_id": visit.get("landmark_id"),
                    "trip_name": visit.get("trip_name"),
                    "country_name": visit.get("country_name"),
                    "visited_at": visit.get("visited_at"),
                }
        elif rtype == "comment" and target_id:
            comment = await db.comments.find_one(
                {"comment_id": target_id},
                {"_id": 0, "user_id": 1, "text": 1, "created_at": 1, "activity_id": 1}
            )
            if comment:
                owner = await db.users.find_one(
                    {"user_id": comment.get("user_id")},
                    {"_id": 0, "name": 1, "email": 1, "picture": 1, "user_id": 1}
                )
                report["target"] = owner
                text = comment.get("text") or ""
                report["content_preview"] = {
                    "comment_text": (text[:300] + "…") if len(text) > 300 else text,
                    "comment_created_at": comment.get("created_at"),
                    "activity_id": comment.get("activity_id"),
                }

        # Auto-flag metadata
        pending = pending_count_map.get(report.get("target_id"), 0)
        report["pending_report_count"] = pending
        report["auto_flagged"] = pending >= AUTO_FLAG_THRESHOLD

    # Reorder: auto-flagged pending reports bubble to top; otherwise keep recency order
    reports.sort(
        key=lambda r: (
            0 if (r.get("auto_flagged") and r.get("status") == "pending") else 1,
            -(r.get("pending_report_count") or 0),
            -(r.get("created_at").timestamp() if hasattr(r.get("created_at"), "timestamp") else 0),
        )
    )

    return {
        "reports": reports,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.put("/admin/reports/{report_id}")
async def update_admin_report(
    report_id: str,
    update_data: AdminReportUpdate,
    admin_user: User = Depends(get_admin_user)
):
    """Update report status. If a photo/activity report is RESOLVED (content removed),
    notify the photo owner so they understand why the content is gone."""
    if update_data.status not in ["pending", "reviewed", "resolved", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    # Load existing report (needed for owner lookup)
    existing = await db.reports.find_one({"report_id": report_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Report not found")

    update_fields = {
        "status": update_data.status,
        "reviewed_at": datetime.now(timezone.utc),
        "reviewed_by_user_id": admin_user.user_id,
        "reviewed_by_name": admin_user.name,
        "reviewed_by_role": admin_user.role,
    }
    if update_data.admin_notes:
        update_fields["admin_notes"] = update_data.admin_notes

    await db.reports.update_one({"report_id": report_id}, {"$set": update_fields})

    # Notify content owner if the report was RESOLVED against a photo/activity
    is_new_resolution = update_data.status == "resolved" and existing.get("status") != "resolved"
    if is_new_resolution and existing.get("report_type") in ("photo", "activity"):
        target_id = existing.get("target_id")
        owner_id = None
        # target_id is a visit_id OR user_created_visit_id
        if target_id:
            visit = await db.visits.find_one({"visit_id": target_id}, {"_id": 0, "user_id": 1})
            if visit:
                owner_id = visit.get("user_id")
            else:
                cv = await db.user_created_visits.find_one(
                    {"user_created_visit_id": target_id}, {"_id": 0, "user_id": 1}
                )
                if cv:
                    owner_id = cv.get("user_id")
        if owner_id and owner_id != admin_user.user_id:
            target_name = existing.get("target_name") or "your photo"
            await create_notification(
                user_id=owner_id,
                notif_type="content_removed",
                title="A photo has been removed",
                message=(
                    f"Your photo at {target_name} was removed after a community review. "
                    "Tap to read the community guidelines."
                ),
                related_id=report_id,
            )

    return {"message": "Report updated successfully", "status": update_data.status}

@router.get("/admin/logs")
async def get_admin_logs(
    page: int = 1,
    limit: int = 50,
    admin_user: User = Depends(get_super_admin_user)
):
    """Get admin action logs (super admin only)"""
    total = await db.admin_logs.count_documents({})
    
    skip = (page - 1) * limit
    logs = await db.admin_logs.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("/admin/make-admin/{user_id}")
async def make_user_admin(user_id: str, admin_user: User = Depends(get_super_admin_user)):
    """Promote a user to admin (super admin only)"""
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": "admin"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log the action
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "action": "promote_to_admin",
        "target_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": f"User {user_id} promoted to admin"}


@router.post("/admin/make-moderator/{user_id}")
async def make_user_moderator(user_id: str, admin_user: User = Depends(get_super_admin_user)):
    """Promote a user to moderator (super admin only).

    Moderators get access to non-destructive admin tasks: viewing reports,
    moderating content, banning users, sending notifications. They CANNOT
    recalculate leaderboards, strip verified points, or promote other users.
    """
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": "moderator"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "action": "promote_to_moderator",
        "target_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
    return {"message": f"User {user_id} promoted to moderator"}


@router.post("/admin/demote-to-user/{user_id}")
async def demote_to_user(user_id: str, admin_user: User = Depends(get_super_admin_user)):
    """Remove admin/moderator role from a user (super admin only)."""
    if user_id == admin_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"role": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "action": "demote_to_user",
        "target_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
    return {"message": f"User {user_id} demoted to regular user"}


# ============= ADMIN PUSH NOTIFICATIONS =============

@router.post("/admin/notifications/send")
async def send_admin_notification(
    notification: AdminNotificationRequest,
    admin_user: User = Depends(get_admin_user)
):
    """Send push notification to users (admin only)"""
    
    # Build query based on target
    query = {}
    if notification.target == "pro":
        query["subscription_tier"] = "pro"
    elif notification.target == "free":
        query["subscription_tier"] = "free"
    elif notification.target == "segment" and notification.segment_user_ids:
        query["user_id"] = {"$in": notification.segment_user_ids}
    # "all" = no query filter
    
    # Get all users matching the query
    users = await db.users.find(query, {"user_id": 1}).to_list(10000)
    user_ids = [u["user_id"] for u in users]
    
    # Get push tokens for these users
    tokens = await db.push_tokens.find(
        {"user_id": {"$in": user_ids}},
        {"user_id": 1, "push_token": 1}
    ).to_list(10000)
    
    # Send notifications
    sent_count = 0
    failed_count = 0
    
    for token_doc in tokens:
        push_token = token_doc.get("push_token")
        if not push_token:
            continue
            
        message = {
            "to": push_token,
            "sound": "default",
            "title": notification.title,
            "body": notification.body,
            "data": {"type": "admin_broadcast"},
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=message,
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    sent_count += 1
                else:
                    failed_count += 1
        except Exception as e:
            failed_count += 1
            logging.error(f"Failed to send notification: {e}")
    
    # Store notification in history
    notification_record = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "title": notification.title,
        "body": notification.body,
        "target": notification.target,
        "segment_user_ids": notification.segment_user_ids,
        "sent_by": admin_user.user_id,
        "sent_by_name": admin_user.name,
        "target_count": len(user_ids),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "created_at": datetime.now(timezone.utc)
    }
    await db.admin_notifications.insert_one(notification_record)
    
    # Log admin action
    await db.admin_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "admin_id": admin_user.user_id,
        "admin_name": admin_user.name,
        "action": "send_notification",
        "details": {
            "title": notification.title,
            "target": notification.target,
            "sent_count": sent_count
        },
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "message": "Notification sent successfully",
        "target_count": len(user_ids),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "tokens_found": len(tokens)
    }

@router.get("/admin/notifications")
async def get_admin_notifications(
    page: int = 1,
    limit: int = 20,
    admin_user: User = Depends(get_admin_user)
):
    """Get notification history (admin only)"""
    
    total = await db.admin_notifications.count_documents({})
    
    skip = (page - 1) * limit
    notifications = await db.admin_notifications.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "notifications": notifications,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/admin/notifications/stats")
async def get_notification_stats(
    admin_user: User = Depends(get_admin_user)
):
    """Get notification statistics (admin only)"""
    
    # Total notifications sent
    total_sent = await db.admin_notifications.count_documents({})
    
    # Sent in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    sent_this_week = await db.admin_notifications.count_documents({"created_at": {"$gte": week_ago}})
    
    # Users with push tokens
    total_tokens = await db.push_tokens.count_documents({})
    
    # Total successful deliveries
    pipeline = [
        {"$group": {"_id": None, "total_sent": {"$sum": "$sent_count"}}}
    ]
    result = await db.admin_notifications.aggregate(pipeline).to_list(1)
    total_delivered = result[0]["total_sent"] if result else 0
    
    return {
        "total_notifications": total_sent,
        "sent_this_week": sent_this_week,
        "users_with_tokens": total_tokens,
        "total_delivered": total_delivered
    }

# ============= LEADERBOARD ENDPOINTS =============

@router.post("/admin/recalculate-leaderboard-points")
async def recalculate_leaderboard_points(admin_user: User = Depends(get_super_admin_user)):
    """Recalculate leaderboard_points for all users based on actual photo-verified visits.
    
    This endpoint scans all visits and country_visits, sums up points only from
    entries that have photos, and updates each user's leaderboard_points field.
    Use this to fix historical data from before the dual-points system was introduced.
    """
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1}).to_list(100000)
    
    updated_count = 0
    results = []
    
    for user in users:
        uid = user["user_id"]
        verified_points = 0
        
        # Sum points from landmark visits that have photos
        visits = await db.visits.find(
            {"user_id": uid},
            {"_id": 0, "photos": 1, "photo_base64": 1, "points_earned": 1, "landmark_id": 1}
        ).to_list(100000)
        
        visited_countries = set()
        visited_continents = set()
        
        for visit in visits:
            has_photos = bool(visit.get("photos")) or bool(visit.get("photo_base64"))
            if has_photos:
                verified_points += visit.get("points_earned", 10)
                
                # Track countries/continents for bonus calculation
                landmark = await db.landmarks.find_one(
                    {"landmark_id": visit.get("landmark_id")},
                    {"_id": 0, "country_id": 1, "continent": 1}
                )
                if landmark:
                    visited_countries.add(landmark.get("country_id"))
                    visited_continents.add(landmark.get("continent"))
        
        # Sum points from destination visits that have photos
        country_visits = await db.country_visits.find(
            {"user_id": uid},
            {"_id": 0, "photos": 1, "points_earned": 1}
        ).to_list(100000)
        
        for cv in country_visits:
            if bool(cv.get("photos")):
                verified_points += cv.get("points_earned", 50)
        
        # Add destination visit bonuses (50pts per country visited)
        verified_points += len(visited_countries) * 50
        
        # Add continent exploration bonuses (50pts per first continent with photo-verified visits)
        verified_points += len(visited_continents) * 50
        
        # Update user's leaderboard_points
        old_value = (await db.users.find_one({"user_id": uid}, {"_id": 0, "leaderboard_points": 1})) or {}
        old_lp = old_value.get("leaderboard_points", 0)
        
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"leaderboard_points": verified_points}}
        )
        
        if verified_points != old_lp:
            updated_count += 1
            results.append({
                "user_id": uid,
                "name": user.get("name", "Unknown"),
                "old_leaderboard_points": old_lp,
                "new_leaderboard_points": verified_points
            })
    
    return {
        "message": f"Recalculated leaderboard points for {len(users)} users. {updated_count} users updated.",
        "total_users_processed": len(users),
        "users_updated": updated_count,
        "changes": results
    }


@router.put("/admin/users/{user_id}/strip-verified")
async def strip_verified_points(user_id: str, admin_user: User = Depends(get_super_admin_user)):
    """
    Strip all verified status from a user's visits without deleting content.
    - Sets all visits to verified=false
    - Sets leaderboard_points to 0
    - Keeps photos, diary, personal points intact
    - Visit still counts for total points and friends leaderboard
    """
    # Verify the target user exists
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "user_id": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count verified visits before stripping
    verified_count = await db.visits.count_documents({"user_id": user_id, "verified": True})
    
    if verified_count == 0:
        return {"message": "User has no verified visits", "visits_stripped": 0}
    
    # Strip verified status from all visits (keep photos and content)
    result = await db.visits.update_many(
        {"user_id": user_id, "verified": True},
        {"$set": {"verified": False}}
    )
    
    # Reset leaderboard points to 0
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"leaderboard_points": 0}}
    )
    
    # Log the admin action
    log_entry = {
        "action_id": f"admin_action_{uuid.uuid4().hex[:12]}",
        "action": "strip_verified",
        "target_user_id": user_id,
        "target_user_name": target_user.get("name", "Unknown"),
        "performed_by": admin_user.user_id,
        "visits_stripped": result.modified_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_logs.insert_one(log_entry)
    
    return {
        "message": f"Stripped verified status from {result.modified_count} visits for user {target_user.get('name', user_id)}",
        "visits_stripped": result.modified_count,
        "leaderboard_points_reset": True
    }


# ============= BUG REPORTS ADMIN =============

@router.get("/admin/bug-reports")
async def get_bug_reports(admin_user: User = Depends(get_super_admin_user)):
    reports = await db.bug_reports.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return reports

@router.put("/admin/bug-reports/{report_id}")
async def update_bug_report(report_id: str, body: dict, admin_user: User = Depends(get_super_admin_user)):
    status = body.get("status", "open")
    admin_notes = body.get("admin_notes", "")
    await db.bug_reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": status, "admin_notes": admin_notes, "resolved_by": admin_user.user_id, "resolved_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Bug report updated"}


# ============= BLOCKS ADMIN =============

@router.get("/admin/blocks")
async def get_all_blocks(admin_user: User = Depends(get_admin_user)):
    blocks = await db.blocks.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    if not blocks:
        return []
    all_ids = set()
    for b in blocks:
        all_ids.add(b["blocker_id"])
        all_ids.add(b["blocked_id"])
    users = await db.users.find(
        {"user_id": {"$in": list(all_ids)}},
        {"_id": 0, "user_id": 1, "name": 1, "username": 1}
    ).to_list(len(all_ids))
    user_map = {u["user_id"]: u for u in users}
    result = []
    for b in blocks:
        blocker = user_map.get(b["blocker_id"], {})
        blocked = user_map.get(b["blocked_id"], {})
        result.append({
            "blocker_name": blocker.get("name", "Unknown"),
            "blocker_username": blocker.get("username"),
            "blocked_name": blocked.get("name", "Unknown"),
            "blocked_username": blocked.get("username"),
            "created_at": b.get("created_at").isoformat() if b.get("created_at") else None,
        })
    return result

