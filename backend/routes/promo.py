from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
import uuid
import io
import csv
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user, get_admin_user
from models.all import User, PromoCodeCreate, PromoCodeUpdate, PromoRedeemRequest, PromoBatchCreate

router = APIRouter()


@router.post("/promo/redeem")
async def redeem_promo_code(request: PromoRedeemRequest, current_user: User = Depends(get_current_user)):
    code_str = request.code.strip().upper()

    promo = await db.promo_codes.find_one({"code": code_str}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Ugyldig kampanjekode")

    if not promo.get("is_active", False):
        raise HTTPException(status_code=400, detail="Denne koden er deaktivert")

    if promo.get("expires_at") and promo["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Denne koden har utlopt")

    if promo.get("max_uses", 1) > 0 and promo.get("current_uses", 0) >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="Denne koden er allerede brukt opp")

    existing_redemption = await db.promo_redemptions.find_one({
        "user_id": current_user.user_id,
        "code_id": promo["code_id"]
    })
    if existing_redemption:
        raise HTTPException(status_code=400, detail="Du har allerede brukt denne koden")

    promo_type = promo.get("type", "lifetime_premium")
    duration_days = promo.get("duration_days")

    update_fields = {"subscription_tier": "pro"}
    if promo_type == "lifetime_premium" or not duration_days:
        update_fields["subscription_expires_at"] = None
        expires_description = "evig"
    else:
        new_expiry = datetime.now(timezone.utc) + timedelta(days=duration_days)
        current_expiry = current_user.subscription_expires_at
        if current_expiry and current_expiry > datetime.now(timezone.utc):
            new_expiry = current_expiry + timedelta(days=duration_days)
        update_fields["subscription_expires_at"] = new_expiry
        expires_description = f"{duration_days} dager"

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
        "message": f"Koden er aktivert! Du har naa Pro-tilgang ({expires_description})",
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
        raise HTTPException(status_code=400, detail="Denne koden eksisterer allerede")

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
        raise HTTPException(status_code=404, detail="Kode ikke funnet")

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
        raise HTTPException(status_code=404, detail="Kode ikke funnet")

    await db.promo_codes.delete_one({"code_id": code_id})
    await db.promo_redemptions.delete_many({"code_id": code_id})
    return {"success": True, "message": "Kode slettet"}
