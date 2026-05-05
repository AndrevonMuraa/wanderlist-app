"""
Daily background scan for broken photo URLs.

Runs every PHOTO_HEALTH_INTERVAL_HOURS (default 24h). Each run:
  1. Walks every photo URL across visits, custom visits, country visits,
     landmarks and user profiles.
  2. HEAD-checks them via utils.photo_health.check_urls.
  3. Persists the result to the `photo_health_runs` collection so the admin
     dashboard can show "last scanned X ago".
  4. If broken_count >= PHOTO_HEALTH_ALERT_THRESHOLD (default 10), pings every
     super-admin with an in-app notification + Expo push.

Repair is never automatic — destructive actions stay one-tap-away in the
admin UI so a human reviews the per-collection breakdown first.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone

from utils.db import db
from utils.helpers import create_notification, send_push_notification
from utils.photo_health import check_urls
from utils.sentry import track_photo_health_alert, track_photo_health_run

logger = logging.getLogger(__name__)

INTERVAL_HOURS = float(os.environ.get("PHOTO_HEALTH_INTERVAL_HOURS", "24"))
ALERT_THRESHOLD = int(os.environ.get("PHOTO_HEALTH_ALERT_THRESHOLD", "10"))


async def _collect_all_urls() -> dict[str, set[str]]:
    """Same shape as routes/photo_health._collect_all_urls — kept here to avoid a circular import."""
    found: dict[str, set[str]] = {
        "visits": set(),
        "user_created_visits": set(),
        "country_visits": set(),
        "landmarks": set(),
        "users": set(),
    }
    async for v in db.visits.find({"photos": {"$exists": True, "$ne": []}}, {"photos": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["visits"].add(p)

    async for v in db.user_created_visits.find({}, {"photos": 1, "photo_url": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["user_created_visits"].add(p)
        if isinstance(v.get("photo_url"), str) and v["photo_url"].startswith("http"):
            found["user_created_visits"].add(v["photo_url"])

    async for v in db.country_visits.find({"photos": {"$exists": True, "$ne": []}}, {"photos": 1, "_id": 0}):
        for p in v.get("photos") or []:
            if isinstance(p, str) and p.startswith("http"):
                found["country_visits"].add(p)

    async for lm in db.landmarks.find({"image_url": {"$regex": "^http"}}, {"image_url": 1, "_id": 0}):
        if isinstance(lm.get("image_url"), str):
            found["landmarks"].add(lm["image_url"])

    async for u in db.users.find({"photo_url": {"$regex": "^http"}}, {"photo_url": 1, "_id": 0}):
        if isinstance(u.get("photo_url"), str):
            found["users"].add(u["photo_url"])

    return found


async def _alert_super_admins(broken_count: int, by_collection: dict[str, list[str]]) -> int:
    """Send in-app notification + push to every super-admin. Returns count of admins notified."""
    title = "Photo health alert"
    biggest_bucket = max(by_collection.items(), key=lambda kv: len(kv[1])) if by_collection else ("", [])
    bucket_label, bucket_urls = biggest_bucket
    msg = (
        f"{broken_count} broken photo URL{'s' if broken_count != 1 else ''} detected"
        + (f" — most ({len(bucket_urls)}) in {bucket_label}." if bucket_urls else ".")
    )
    notified = 0
    async for admin in db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}):
        uid = admin.get("user_id")
        if not uid:
            continue
        try:
            await create_notification(
                user_id=uid,
                notif_type="photo_health_alert",
                title=title,
                message=msg,
            )
            await send_push_notification(
                user_id=uid,
                title=title,
                body=msg,
                data={"type": "photo_health_alert", "broken_count": broken_count},
            )
            notified += 1
        except Exception as exc:
            logger.warning("photo_health_alert delivery failed for %s: %s", uid, exc)
    return notified


async def run_once() -> dict:
    """Execute one scan + persist + alert cycle. Returns the persisted run document."""
    started = datetime.now(timezone.utc)
    by_collection = await _collect_all_urls()
    all_urls = set().union(*by_collection.values()) if by_collection else set()
    broken = await check_urls(all_urls)
    broken_by_collection: dict[str, list[str]] = {
        col: sorted(urls & broken) for col, urls in by_collection.items()
    }
    broken_counts = {k: len(v) for k, v in broken_by_collection.items()}

    # Sentry breadcrumb on every run — long-term trend data
    track_photo_health_run(
        scanned=len(all_urls),
        broken=len(broken),
        by_collection=broken_counts,
        trigger="scheduler",
    )

    notified = 0
    if len(broken) >= ALERT_THRESHOLD:
        notified = await _alert_super_admins(len(broken), broken_by_collection)
        # High-signal Sentry issue when threshold is breached
        track_photo_health_alert(
            broken=len(broken),
            threshold=ALERT_THRESHOLD,
            by_collection=broken_counts,
            alerted_admins=notified,
        )

    run_doc = {
        "run_id": f"phr_{uuid.uuid4().hex[:12]}",
        "scanned": len(all_urls),
        "broken_count": len(broken),
        "broken_by_collection": broken_counts,
        "alerted_admins": notified,
        "threshold": ALERT_THRESHOLD,
        "started_at": started,
        "finished_at": datetime.now(timezone.utc),
        "trigger": "scheduler",
    }
    await db.photo_health_runs.insert_one(dict(run_doc))  # copy so caller's dict stays clean
    logger.info(
        "photo_health scheduler: scanned=%d broken=%d alerted_admins=%d",
        run_doc["scanned"], run_doc["broken_count"], notified,
    )
    return run_doc


async def _loop() -> None:
    sleep_seconds = max(60, int(INTERVAL_HOURS * 3600))
    # Wait one interval before the first run so we don't hammer DB during a deploy storm
    await asyncio.sleep(sleep_seconds)
    while True:
        try:
            await run_once()
        except Exception as exc:
            logger.exception("photo_health scheduler crashed: %s", exc)
        await asyncio.sleep(sleep_seconds)


_task: asyncio.Task | None = None


def start_scheduler() -> None:
    """Idempotent: kicks off the daily scanner exactly once per process."""
    global _task
    if os.environ.get("PHOTO_HEALTH_SCHEDULER_DISABLED") == "1":
        logger.info("photo_health scheduler disabled via env")
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_loop(), name="photo_health_scheduler")
    logger.info(
        "photo_health scheduler started (interval=%sh, alert_threshold=%d)",
        INTERVAL_HOURS, ALERT_THRESHOLD,
    )
