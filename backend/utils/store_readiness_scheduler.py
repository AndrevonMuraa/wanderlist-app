"""
Store Readiness watchdog — fires a Sentry warning + super-admin push when the
App Store readiness checklist has had a red blocker for longer than the grace
window (default 24h).

State machine (one document in `store_readiness_state`, _id="global"):
- failures == 0   → reset: failing_since = None, alerted = False
- failures > 0    → first time: stamp failing_since = now, alerted = False
                    repeat: keep failing_since, check elapsed
- elapsed >= GRACE_HOURS and not alerted:
                    fire Sentry + push, set alerted = True
                    (so we don't re-page every interval — one alert per incident)
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone

from utils.db import db
from utils.helpers import create_notification, send_push_notification
from utils.sentry import track_store_readiness_alert

logger = logging.getLogger(__name__)

INTERVAL_HOURS = float(os.environ.get("STORE_READINESS_INTERVAL_HOURS", "6"))
GRACE_HOURS = float(os.environ.get("STORE_READINESS_ALERT_AFTER_HOURS", "24"))
STATE_ID = "global"


def _ensure_utc(dt: datetime) -> datetime:
    """Mongo strips tz info on read — re-attach UTC if naive."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _alert_super_admins(failures: int, failed_ids: list, hours: float) -> int:
    """In-app + push for every super-admin. Returns count notified."""
    title = "Store Readiness alert"
    msg = (
        f"{failures} App Store blocker{'s' if failures != 1 else ''} failing for "
        f"{hours:.1f}h: {', '.join(failed_ids[:3]) or 'unknown'}"
        + (f" (+{len(failed_ids) - 3} more)" if len(failed_ids) > 3 else "")
    )
    notified = 0
    async for admin in db.users.find({"role": "admin"}, {"_id": 0, "user_id": 1}):
        uid = admin.get("user_id")
        if not uid:
            continue
        try:
            await create_notification(
                user_id=uid,
                notif_type="store_readiness_alert",
                title=title,
                message=msg,
            )
            await send_push_notification(
                user_id=uid,
                title=title,
                body=msg,
                data={"type": "store_readiness_alert", "failures": failures},
            )
            notified += 1
        except Exception as exc:
            logger.warning("store_readiness alert delivery failed for %s: %s", uid, exc)
    return notified


async def evaluate_once() -> dict:
    """Run one watchdog cycle. Returns the new state document for tests/observability."""
    # Imported here to avoid circular import (routes/store_readiness imports utils.auth)
    from routes.store_readiness import compute_readiness

    report = await compute_readiness()
    summary = report.get("summary", {})
    failures = int(summary.get("failures", 0))
    warnings = int(summary.get("warnings", 0))
    failed_ids = [c["id"] for c in report.get("checks", []) if c.get("status") == "fail"]
    now = datetime.now(timezone.utc)

    state = await db.store_readiness_state.find_one({"_id": STATE_ID}) or {}
    failing_since = state.get("failing_since")
    alerted = bool(state.get("alerted"))

    new_state: dict = {
        "_id": STATE_ID,
        "last_check_at": now,
        "last_failures": failures,
        "last_warnings": warnings,
        "last_failed_ids": failed_ids,
    }

    if failures == 0:
        # Healthy → fully reset
        new_state["failing_since"] = None
        new_state["alerted"] = False
    else:
        if failing_since is None:
            new_state["failing_since"] = now
            new_state["alerted"] = False
        else:
            new_state["failing_since"] = _ensure_utc(failing_since)
            elapsed_hours = (now - new_state["failing_since"]).total_seconds() / 3600
            if not alerted and elapsed_hours >= GRACE_HOURS:
                track_store_readiness_alert(
                    failures=failures,
                    warnings=warnings,
                    failed_check_ids=failed_ids,
                    failing_since_iso=new_state["failing_since"].isoformat(),
                    hours_failing=elapsed_hours,
                )
                notified = await _alert_super_admins(failures, failed_ids, elapsed_hours)
                new_state["alerted"] = True
                new_state["alerted_at"] = now
                new_state["alerted_admin_count"] = notified
                logger.warning(
                    "store_readiness watchdog: paged %d admin(s) — %d failures for %.1fh",
                    notified, failures, elapsed_hours,
                )
            else:
                new_state["alerted"] = alerted

    await db.store_readiness_state.update_one(
        {"_id": STATE_ID}, {"$set": new_state}, upsert=True,
    )
    return new_state


async def _loop() -> None:
    sleep_seconds = max(60, int(INTERVAL_HOURS * 3600))
    # First check after one interval, never on boot — gives the app time to settle
    await asyncio.sleep(sleep_seconds)
    while True:
        try:
            await evaluate_once()
        except Exception as exc:
            logger.exception("store_readiness watchdog crashed: %s", exc)
        await asyncio.sleep(sleep_seconds)


_task: asyncio.Task | None = None


def start_scheduler() -> None:
    """Idempotent: kicks off the watchdog exactly once per process."""
    global _task
    if os.environ.get("STORE_READINESS_SCHEDULER_DISABLED") == "1":
        logger.info("store_readiness watchdog disabled via env")
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_loop(), name="store_readiness_watchdog")
    logger.info(
        "store_readiness watchdog started (interval=%sh, grace=%sh)",
        INTERVAL_HOURS, GRACE_HOURS,
    )
