from fastapi import APIRouter, HTTPException, Depends
import os
import uuid
from datetime import datetime, timezone

from utils.db import db
from utils.auth import get_current_user
from utils.image_validate import normalize_photos
from models.all import User, ReportCreate, Report


router = APIRouter()

# ============= REPORT/MODERATION ENDPOINTS =============

@router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: User = Depends(get_current_user)):
    """
    Submit a report for a user, activity, photo, or comment.
    Reports are reviewed by moderators within 24-48 hours.
    """
    # Validate report type
    valid_types = ["user", "activity", "photo", "comment"]
    if report_data.report_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    # Validate reason
    valid_reasons = [
        "fake_profile", "harassment", "spam", "inappropriate", "cheating", "other",
        "fake_visit", "inappropriate_photo", "wrong_location", "copyright",
        "not_landmark", "offensive", "hate_speech"
    ]
    if report_data.reason not in valid_reasons:
        raise HTTPException(status_code=400, detail="Invalid report reason")
    
    # Check if user has already reported this item
    existing_report = await db.reports.find_one({
        "reporter_id": current_user.user_id,
        "target_id": report_data.target_id,
        "status": {"$in": ["pending", "reviewed"]}
    })
    if existing_report:
        raise HTTPException(status_code=400, detail="You have already reported this item")
    
    # Prevent self-reporting
    if report_data.report_type == "user" and report_data.target_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot report yourself")
    
    # Create the report
    report = Report(
        report_id=str(uuid.uuid4()),
        reporter_id=current_user.user_id,
        report_type=report_data.report_type,
        target_id=report_data.target_id,
        target_name=report_data.target_name,
        reason=report_data.reason,
        status="pending",
        created_at=datetime.now(timezone.utc)
    )
    
    await db.reports.insert_one(report.model_dump())
    
    return {"message": "Report submitted successfully", "report_id": report.report_id}

@router.get("/reports/my-reports")
async def get_my_reports(current_user: User = Depends(get_current_user)):
    """Get reports submitted by the current user."""
    reports = await db.reports.find(
        {"reporter_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"reports": reports}

@router.post("/bug-reports")
async def submit_bug_report(body: dict, current_user: User = Depends(get_current_user)):
    """Submit a bug report — delivered to the main admin"""
    description = body.get("description", "").strip()
    screenshots = body.get("screenshots", [])
    
    if not description:
        raise HTTPException(status_code=400, detail="Please describe the issue")

    # Server-side defense-in-depth: reject >5MB, auto-resize 2-5MB
    screenshots = normalize_photos(screenshots[:5]) or []

    report = {
        "report_id": f"bug_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "description": description,
        "screenshots": screenshots,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.bug_reports.insert_one(report)
    return {"message": "Bug report submitted. Thank you!", "report_id": report["report_id"]}


# ============= END REPORT/MODERATION ENDPOINTS =============

