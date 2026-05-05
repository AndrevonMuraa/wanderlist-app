"""
Admin-only photo health & repair endpoints.

Endpoints
---------
GET  /api/admin/photos/healthcheck
    Scan every photo URL in the database and return a report of broken ones,
    grouped by collection. Read-only.

POST /api/admin/photos/healthcheck/repair
    Run the same scan, then *remove* broken URLs from all collections.
    For visits that lose their last valid photo (and have no `photo_base64`),
    flip `verified` to False and trigger a points recalculation so the
    leaderboard stays accurate.

Both are gated to super-admins only — destructive enough to require it.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends

from models.all import User
from utils.auth import get_super_admin_user
from utils.db import db
from utils.helpers import recalculate_user_points
from utils.photo_health import check_urls
from utils.photo_health_scheduler import run_once as scheduler_run_once

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers — pull out every photo URL we know about, grouped by collection
# ---------------------------------------------------------------------------
async def _collect_all_urls() -> dict[str, set[str]]:
    """Returns { collection_name: {url, ...} }. Excludes base64 + empty values."""
    found: dict[str, set[str]] = {
        "visits": set(),
        "user_created_visits": set(),
        "country_visits": set(),
        "landmarks": set(),
        "users": set(),
    }

    # Visits — photos[] (array of strings)
    async for v in db.visits.find({"photos": {"$exists": True, "$ne": []}}, {"photos": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["visits"].add(p)

    # Custom visits — photos[] + photo_url
    async for v in db.user_created_visits.find({}, {"photos": 1, "photo_url": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["user_created_visits"].add(p)
        if isinstance(v.get("photo_url"), str) and v["photo_url"].startswith("http"):
            found["user_created_visits"].add(v["photo_url"])

    # Country visits — photos[]
    async for v in db.country_visits.find({"photos": {"$exists": True, "$ne": []}}, {"photos": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["country_visits"].add(p)

    # Landmarks — image_url (canonical landmark cover)
    async for lm in db.landmarks.find({"image_url": {"$regex": "^http"}}, {"image_url": 1, "_id": 0}):
        if isinstance(lm.get("image_url"), str):
            found["landmarks"].add(lm["image_url"])

    # Users — profile photo_url
    async for u in db.users.find({"photo_url": {"$regex": "^http"}}, {"photo_url": 1, "_id": 0}):
        if isinstance(u.get("photo_url"), str):
            found["users"].add(u["photo_url"])

    return found


# ---------------------------------------------------------------------------
# GET /api/admin/photos/healthcheck — scan only, no writes
# ---------------------------------------------------------------------------
@router.get("/admin/photos/healthcheck")
async def photo_healthcheck(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    by_collection = await _collect_all_urls()
    all_urls = set().union(*by_collection.values()) if by_collection else set()

    broken = await check_urls(all_urls)

    broken_by_collection: dict[str, list[str]] = {
        col: sorted(urls & broken) for col, urls in by_collection.items()
    }

    return {
        "scanned": len(all_urls),
        "broken_count": len(broken),
        "broken_urls": sorted(broken),
        "broken_by_collection": broken_by_collection,
    }


# ---------------------------------------------------------------------------
# POST /api/admin/photos/healthcheck/repair — scan + delete broken URLs
# ---------------------------------------------------------------------------
@router.post("/admin/photos/healthcheck/repair")
async def photo_healthcheck_repair(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    by_collection = await _collect_all_urls()
    all_urls = set().union(*by_collection.values()) if by_collection else set()
    broken = await check_urls(all_urls)

    if not broken:
        return {
            "scanned": len(all_urls),
            "broken_count": 0,
            "removed": {"visits": 0, "user_created_visits": 0, "country_visits": 0,
                        "landmarks": 0, "users": 0},
            "verified_revoked": 0,
            "users_recomputed": 0,
        }

    removed = {"visits": 0, "user_created_visits": 0, "country_visits": 0,
               "landmarks": 0, "users": 0}
    affected_user_ids: set[str] = set()
    verified_revoked = 0

    # ---- visits.photos ---------------------------------------------------
    affected_visits = await db.visits.find(
        {"photos": {"$in": list(broken)}},
        {"_id": 0, "visit_id": 1, "user_id": 1, "photos": 1, "photo_base64": 1, "verified": 1},
    ).to_list(None)

    for v in affected_visits:
        clean_photos = [p for p in (v.get("photos") or []) if p not in broken]
        update: dict[str, Any] = {"photos": clean_photos}
        # Revoke verified if visit now has no proof at all
        had_base64 = bool(v.get("photo_base64"))
        if not clean_photos and not had_base64 and v.get("verified"):
            update["verified"] = False
            verified_revoked += 1
        await db.visits.update_one({"visit_id": v["visit_id"]}, {"$set": update})
        removed["visits"] += len(v.get("photos") or []) - len(clean_photos)
        if v.get("user_id"):
            affected_user_ids.add(v["user_id"])

    # ---- user_created_visits.photos --------------------------------------
    custom_affected = await db.user_created_visits.find(
        {"$or": [
            {"photos": {"$in": list(broken)}},
            {"photo_url": {"$in": list(broken)}},
        ]},
        {"_id": 0, "user_created_visit_id": 1, "user_id": 1, "photos": 1, "photo_url": 1},
    ).to_list(None)

    for v in custom_affected:
        update: dict[str, Any] = {}
        if v.get("photos"):
            clean = [p for p in v["photos"] if p not in broken]
            if len(clean) != len(v["photos"]):
                update["photos"] = clean
                removed["user_created_visits"] += len(v["photos"]) - len(clean)
        if v.get("photo_url") in broken:
            update["photo_url"] = None
            removed["user_created_visits"] += 1
        if update:
            await db.user_created_visits.update_one(
                {"user_created_visit_id": v["user_created_visit_id"]}, {"$set": update}
            )
            if v.get("user_id"):
                affected_user_ids.add(v["user_id"])

    # ---- country_visits.photos -------------------------------------------
    country_affected = await db.country_visits.find(
        {"photos": {"$in": list(broken)}},
        {"_id": 0, "country_visit_id": 1, "user_id": 1, "photos": 1},
    ).to_list(None)

    for v in country_affected:
        clean = [p for p in (v.get("photos") or []) if p not in broken]
        if len(clean) != len(v.get("photos") or []):
            await db.country_visits.update_one(
                {"country_visit_id": v["country_visit_id"]}, {"$set": {"photos": clean}}
            )
            removed["country_visits"] += len(v["photos"]) - len(clean)
            if v.get("user_id"):
                affected_user_ids.add(v["user_id"])

    # ---- landmarks.image_url ---------------------------------------------
    lm_res = await db.landmarks.update_many(
        {"image_url": {"$in": list(broken)}},
        {"$set": {"image_url": ""}},
    )
    removed["landmarks"] = lm_res.modified_count

    # ---- users.photo_url -------------------------------------------------
    u_res = await db.users.update_many(
        {"photo_url": {"$in": list(broken)}},
        {"$set": {"photo_url": ""}},
    )
    removed["users"] = u_res.modified_count

    # Recompute points for every user whose visit verification changed
    for uid in affected_user_ids:
        try:
            await recalculate_user_points(uid)
        except Exception as exc:
            logger.warning("recalculate_user_points(%s) failed: %s", uid, exc)

    return {
        "scanned": len(all_urls),
        "broken_count": len(broken),
        "broken_urls": sorted(broken),
        "removed": removed,
        "verified_revoked": verified_revoked,
        "users_recomputed": len(affected_user_ids),
    }


# ---------------------------------------------------------------------------
# GET /api/admin/photos/healthcheck/last-run — latest scheduler run summary
# ---------------------------------------------------------------------------
@router.get("/admin/photos/healthcheck/last-run")
async def photo_healthcheck_last_run(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    doc = await db.photo_health_runs.find_one(
        {},
        sort=[("finished_at", -1)],
        projection={"_id": 0},
    )
    if not doc:
        return {"has_run": False}
    # Serialize datetimes to ISO strings so JSON is clean
    for k in ("started_at", "finished_at"):
        if doc.get(k):
            doc[k] = doc[k].isoformat()
    return {"has_run": True, **doc}


# ---------------------------------------------------------------------------
# POST /api/admin/photos/healthcheck/run-now — manually trigger scheduler cycle
# ---------------------------------------------------------------------------
@router.post("/admin/photos/healthcheck/run-now")
async def photo_healthcheck_run_now(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    run_doc = await scheduler_run_once()
    for k in ("started_at", "finished_at"):
        if run_doc.get(k):
            run_doc[k] = run_doc[k].isoformat()
    return run_doc
