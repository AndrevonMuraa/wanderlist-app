from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
import uuid
import io
import csv
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, get_admin_user
from models.all import User, PromoCodeCreate, PromoCodeUpdate, PromoRedeemRequest, PromoBatchCreate, PromoEmailSend, EmailTemplateUpdate

router = APIRouter()


@router.post("/promo/redeem")
async def redeem_promo_code(request: PromoRedeemRequest, current_user: User = Depends(get_current_user)):
    code_str = request.code.strip().upper()

    promo = await db.promo_codes.find_one({"code": code_str}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")

    if not promo.get("is_active", False):
        raise HTTPException(status_code=400, detail="This code has been deactivated")

    if promo.get("expires_at") and promo["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This code has expired")

    if promo.get("max_uses", 1) > 0 and promo.get("current_uses", 0) >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="This code has reached its usage limit")

    existing_redemption = await db.promo_redemptions.find_one({
        "user_id": current_user.user_id,
        "code_id": promo["code_id"]
    })
    if existing_redemption:
        raise HTTPException(status_code=400, detail="You have already redeemed this code")

    promo_type = promo.get("type", "lifetime_premium")
    duration_days = promo.get("duration_days")

    update_fields = {"subscription_tier": "pro"}
    if promo_type == "lifetime_premium" or not duration_days:
        update_fields["subscription_expires_at"] = None
        expires_description = "lifetime"
    else:
        new_expiry = datetime.now(timezone.utc) + timedelta(days=duration_days)
        current_expiry = current_user.subscription_expires_at
        if current_expiry and current_expiry > datetime.now(timezone.utc):
            new_expiry = current_expiry + timedelta(days=duration_days)
        update_fields["subscription_expires_at"] = new_expiry
        expires_description = f"{duration_days} days"

    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": update_fields}
    )

    await db.promo_codes.update_one(
        {"code_id": promo["code_id"]},
        {"$inc": {"current_uses": 1}}
    )

    await db.promo_redemptions.insert_one({
        "redemption_id": f"redeem_{uuid.uuid4().hex[:12]}",
        "code_id": promo["code_id"],
        "code": code_str,
        "user_id": current_user.user_id,
        "user_email": current_user.email,
        "user_name": current_user.name,
        "redeemed_at": datetime.now(timezone.utc),
        "type": promo_type,
        "duration_days": duration_days,
    })

    return {
        "success": True,
        "message": f"Code activated! You now have Pro access ({expires_description})",
        "type": promo_type,
        "duration_days": duration_days,
    }


# ============= ADMIN PROMO CODE ENDPOINTS =============

@router.get("/admin/promo-codes")
async def get_promo_codes(admin_user: User = Depends(get_admin_user)):
    codes = await db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for code in codes:
        redemptions = await db.promo_redemptions.find(
            {"code_id": code["code_id"]}, {"_id": 0}
        ).to_list(500)
        code["redemptions"] = redemptions
    return codes


@router.post("/admin/promo-codes")
async def create_promo_code(request: PromoCodeCreate, admin_user: User = Depends(get_admin_user)):
    code_str = request.code.strip().upper()

    existing = await db.promo_codes.find_one({"code": code_str})
    if existing:
        raise HTTPException(status_code=400, detail="This code already exists")

    expires_at = None
    if request.expires_at:
        expires_at = datetime.fromisoformat(request.expires_at.replace("Z", "+00:00"))

    promo = {
        "code_id": f"promo_{uuid.uuid4().hex[:12]}",
        "code": code_str,
        "description": request.description,
        "type": request.type,
        "duration_days": request.duration_days if request.type == "timed_premium" else None,
        "max_uses": request.max_uses,
        "current_uses": 0,
        "is_active": True,
        "created_by": admin_user.user_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    }
    await db.promo_codes.insert_one(promo)
    del promo["_id"]
    return promo


@router.put("/admin/promo-codes/{code_id}")
async def update_promo_code(code_id: str, request: PromoCodeUpdate, admin_user: User = Depends(get_admin_user)):
    promo = await db.promo_codes.find_one({"code_id": code_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Code not found")

    update_fields = {}
    if request.is_active is not None:
        update_fields["is_active"] = request.is_active
    if request.description is not None:
        update_fields["description"] = request.description
    if request.max_uses is not None:
        update_fields["max_uses"] = request.max_uses

    if update_fields:
        await db.promo_codes.update_one({"code_id": code_id}, {"$set": update_fields})

    updated = await db.promo_codes.find_one({"code_id": code_id}, {"_id": 0})
    return updated


@router.delete("/admin/promo-codes/{code_id}")
async def delete_promo_code(code_id: str, admin_user: User = Depends(get_admin_user)):
    promo = await db.promo_codes.find_one({"code_id": code_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Code not found")

    await db.promo_codes.delete_one({"code_id": code_id})
    await db.promo_redemptions.delete_many({"code_id": code_id})
    return {"success": True, "message": "Code deleted"}


@router.post("/admin/promo-codes/batch")
async def batch_create_promo_codes(request: PromoBatchCreate, admin_user: User = Depends(get_admin_user)):
    prefix = request.prefix.strip().upper()
    count = min(request.count, 500)

    if count < 1:
        raise HTTPException(status_code=400, detail="Count must be at least 1")

    created_codes = []
    skipped = 0
    for i in range(1, count + 1):
        code_str = f"{prefix}-{i:03d}"

        existing = await db.promo_codes.find_one({"code": code_str})
        if existing:
            skipped += 1
            continue

        promo = {
            "code_id": f"promo_{uuid.uuid4().hex[:12]}",
            "code": code_str,
            "description": request.description,
            "type": request.type,
            "duration_days": request.duration_days if request.type == "timed_premium" else None,
            "max_uses": request.max_uses,
            "current_uses": 0,
            "is_active": True,
            "created_by": admin_user.user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": None,
        }
        await db.promo_codes.insert_one(promo)
        del promo["_id"]
        created_codes.append(promo)

    return {
        "success": True,
        "created": len(created_codes),
        "skipped": skipped,
        "codes": [c["code"] for c in created_codes],
    }


@router.get("/admin/promo-codes/export-csv")
async def export_promo_codes_csv(admin_user: User = Depends(get_admin_user)):
    codes = await db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Code", "Type", "Duration (days)", "Description", "Max Uses", "Used", "Active", "Created"])

    for code in codes:
        writer.writerow([
            code["code"],
            "Lifetime Premium" if code.get("type") == "lifetime_premium" else f"Timed ({code.get('duration_days', '?')}d)",
            code.get("duration_days", ""),
            code.get("description", ""),
            code.get("max_uses", 1),
            code.get("current_uses", 0),
            "Yes" if code.get("is_active") else "No",
            code.get("created_at", "").isoformat() if hasattr(code.get("created_at", ""), "isoformat") else str(code.get("created_at", "")),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wandermark_promo_codes.csv"},
    )



DEFAULT_EMAIL_TEMPLATE = {
    "subject": "You've received exclusive WanderMark Premium access!",
    "heading": "You're invited!",
    "subheading": "Explore the world. Collect memories.",
    "body_text": "We're giving you <strong>{access_desc}</strong> to WanderMark Premium. Unlock all premium landmarks, unlimited photos, advanced travel diaries and much more.",
    "code_label": "Your promo code",
    "steps_title": "How to use your code:",
    "steps": [
        "Download WanderMark from the App Store",
        "Create an account or log in",
        "Go to Profile → Upgrade to Premium",
        "Enter the code above",
    ],
    "footer_text": "WanderMark © 2026 — Explore. Experience. Share.",
    "support_text": "Have questions? Contact us at <a href=\"mailto:support@wandermark.app\" style=\"color: #f59e0b;\">support@wandermark.app</a>",
}


async def get_email_template_data():
    template = await db.email_templates.find_one({"template_id": "promo_email"}, {"_id": 0})
    if not template:
        return dict(DEFAULT_EMAIL_TEMPLATE)
    merged = dict(DEFAULT_EMAIL_TEMPLATE)
    for key in merged:
        if key in template and template[key] is not None:
            merged[key] = template[key]
    return merged


def build_email_html(template, code_str, access_desc, personal_html):
    body_text = template["body_text"].replace("{access_desc}", access_desc)
    steps_html = "".join(f"<li>{s}</li>" for s in template["steps"])

    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 24px 24px;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 800;">WanderMark</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">{template["subheading"]}</p>
        </div>
        <div style="padding: 32px 30px;">
            <h2 style="color: #1a1a2e; font-size: 22px; margin: 0 0 16px 0;">{template["heading"]}</h2>
            {personal_html}
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">{body_text}</p>
            <div style="background: linear-gradient(135deg, #f59e0b20, #d9770620); border: 2px dashed #f59e0b; border-radius: 16px; padding: 24px; text-align: center; margin: 28px 0;">
                <p style="color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-weight: 600;">{template["code_label"]}</p>
                <p style="font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: 3px; margin: 0; font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;">{code_str}</p>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #374151; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">{template["steps_title"]}</p>
                <ol style="color: #6b7280; font-size: 14px; padding-left: 20px; margin: 0; line-height: 1.8;">{steps_html}</ol>
            </div>
            <p style="color: #9ca3af; font-size: 13px; text-align: center;">{template["support_text"]}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">{template["footer_text"]}</p>
        </div>
    </div>
    """


@router.get("/admin/email-template")
async def get_email_template(admin_user: User = Depends(get_admin_user)):
    return await get_email_template_data()


@router.put("/admin/email-template")
async def update_email_template(request: EmailTemplateUpdate, admin_user: User = Depends(get_admin_user)):
    update_fields = {k: v for k, v in request.dict().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.now(timezone.utc)
    update_fields["updated_by"] = admin_user.user_id

    await db.email_templates.update_one(
        {"template_id": "promo_email"},
        {"$set": update_fields},
        upsert=True,
    )

    return await get_email_template_data()


@router.delete("/admin/email-template")
async def reset_email_template(admin_user: User = Depends(get_admin_user)):
    await db.email_templates.delete_one({"template_id": "promo_email"})
    return dict(DEFAULT_EMAIL_TEMPLATE)


@router.post("/admin/promo-codes/send-email")
async def send_promo_emails(request: PromoEmailSend, admin_user: User = Depends(get_admin_user)):
    import asyncio
    import resend
    import os

    resend.api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service is not configured")

    emails = [e.strip().lower() for e in request.emails if e.strip()]
    code_ids = request.code_ids

    if not emails:
        raise HTTPException(status_code=400, detail="At least one email address is required")
    if not code_ids:
        raise HTTPException(status_code=400, detail="At least one promo code is required")

    codes = []
    for cid in code_ids:
        code_doc = await db.promo_codes.find_one({"code_id": cid, "is_active": True}, {"_id": 0})
        if code_doc:
            codes.append(code_doc)

    if not codes:
        raise HTTPException(status_code=400, detail="No active codes found")

    template = await get_email_template_data()
    personal_msg = request.personal_message or ""
    personal_html = f'<p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">{personal_msg}</p>' if personal_msg else ""

    subject = request.subject or template["subject"]

    sent = 0
    failed = 0
    results = []

    for i, email in enumerate(emails):
        code = codes[i % len(codes)]
        code_str = code["code"]
        code_type = code.get("type", "lifetime_premium")
        duration = code.get("duration_days")

        if code_type == "lifetime_premium":
            access_desc = "lifetime Premium access"
        else:
            access_desc = f"{duration} days of free Premium access"

        html_content = build_email_html(template, code_str, access_desc, personal_html)

        try:
            params = {
                "from": f"WanderMark <{sender_email}>",
                "to": [email],
                "subject": subject,
                "html": html_content,
            }
            await asyncio.to_thread(resend.Emails.send, params)
            sent += 1
            results.append({"email": email, "code": code_str, "status": "sent"})
        except Exception as e:
            failed += 1
            results.append({"email": email, "code": code_str, "status": "failed", "error": str(e)})

    await db.promo_email_logs.insert_one({
        "log_id": f"emaillog_{uuid.uuid4().hex[:12]}",
        "sent_by": admin_user.user_id,
        "code_ids": code_ids,
        "total_emails": len(emails),
        "sent": sent,
        "failed": failed,
        "subject": subject,
        "personal_message": personal_msg,
        "results": results,
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "success": True,
        "sent": sent,
        "failed": failed,
        "results": results,
    }


@router.get("/admin/promo-codes/email-history")
async def get_email_history(admin_user: User = Depends(get_admin_user)):
    logs = await db.promo_email_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    for log in logs:
        sender = await db.users.find_one({"user_id": log.get("sent_by")}, {"_id": 0, "name": 1, "email": 1})
        log["sender_name"] = sender.get("name", "Unknown") if sender else "Unknown"
        log["sender_email"] = sender.get("email", "") if sender else ""

        code_names = []
        for cid in log.get("code_ids", []):
            code_doc = await db.promo_codes.find_one({"code_id": cid}, {"_id": 0, "code": 1})
            if code_doc:
                code_names.append(code_doc["code"])
        log["code_names"] = code_names

    return logs
