"""
App Store readiness checklist — server-side checks for "can we submit Build N?".

Each check returns {id, label, status: 'ok'|'warn'|'fail', hint, severity}.
Frontend renders these alongside its own client-side checks (env URL, build
number, etc.) so the super-admin gets a single "are we ready?" screen.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from models.all import User
from utils.auth import get_super_admin_user
from utils.db import db

router = APIRouter()

TRUST_CENTER_DIR = Path("/app/trust-center")
DEMO_REVIEWER_EMAIL = "test@wandermark.app"


def _check(id_: str, label: str, ok: bool, *, hint: str = "", warn: bool = False) -> dict[str, Any]:
    """warn=True downgrades a failure to a yellow warning instead of red."""
    if ok:
        return {"id": id_, "label": label, "status": "ok", "hint": hint}
    return {"id": id_, "label": label, "status": "warn" if warn else "fail", "hint": hint}


async def compute_readiness() -> dict[str, Any]:
    """Run all server-side readiness checks. Used by both the API endpoint and
    the background watchdog scheduler."""
    checks: list[dict[str, Any]] = []

    # ---- Legal / privacy ------------------------------------------------
    privacy = (TRUST_CENTER_DIR / "privacy.md").exists()
    terms = (TRUST_CENTER_DIR / "terms.md").exists()
    checks.append(_check(
        "legal-privacy", "Privacy Policy authored", privacy,
        hint="/app/trust-center/privacy.md",
    ))
    checks.append(_check(
        "legal-terms", "Terms of Service authored", terms,
        hint="/app/trust-center/terms.md",
    ))
    trust_center_url = os.environ.get("EXPO_PUBLIC_TRUST_CENTER_URL", "").strip()
    checks.append(_check(
        "legal-cdn", "Trust Center deployed to CDN", bool(trust_center_url),
        hint="Set EXPO_PUBLIC_TRUST_CENTER_URL in frontend/.env after deploying /app/trust-center to Vercel/Cloudflare",
        warn=True,  # bundled fallback exists, so this is warn not fail
    ))

    # ---- Auth & account -------------------------------------------------
    demo = await db.users.find_one({"email": DEMO_REVIEWER_EMAIL}, {"_id": 0, "user_id": 1, "role": 1})
    checks.append(_check(
        "auth-reviewer-account", "App Store reviewer demo account exists",
        bool(demo),
        hint=f"Add {DEMO_REVIEWER_EMAIL} / Test1234! to App Store Connect 'App Review' section",
    ))

    admin_count = await db.users.count_documents({"role": "admin"})
    checks.append(_check(
        "auth-super-admin", "At least one super-admin", admin_count > 0,
        hint=f"{admin_count} super-admin(s) seeded",
    ))

    # ---- Trust & safety -------------------------------------------------
    pending_reports = await db.reports.count_documents({"status": "pending"})
    checks.append(_check(
        "moderation-queue", "Moderation queue under control", pending_reports < 10,
        hint=f"{pending_reports} pending report(s)",
        warn=True,
    ))

    # Photo health: scheduler must have run within the last 25h
    last_run = await db.photo_health_runs.find_one({}, sort=[("finished_at", -1)], projection={"_id": 0})
    if last_run and last_run.get("finished_at"):
        finished = last_run["finished_at"]
        # Mongo strips tz info on read — re-attach UTC if naive
        if finished.tzinfo is None:
            finished = finished.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - finished
        photo_health_fresh = age < timedelta(hours=25)
        photo_hint = f"Last scan {int(age.total_seconds() / 3600)}h ago, {last_run.get('broken_count', 0)} broken"
    else:
        photo_health_fresh = False
        photo_hint = "Scheduler hasn't run yet — wait 24h or hit /run-now"
    checks.append(_check(
        "photo-health-fresh", "Photo Health scheduler active", photo_health_fresh,
        hint=photo_hint, warn=True,
    ))

    # ---- Observability --------------------------------------------------
    sentry_dsn = bool(os.environ.get("SENTRY_DSN"))
    checks.append(_check(
        "sentry-backend", "Sentry DSN configured (backend)", sentry_dsn,
        hint="SENTRY_DSN env var",
    ))

    # ---- Subscriptions --------------------------------------------------
    pro_count = await db.users.count_documents({"subscription_tier": "pro"})
    checks.append(_check(
        "subscription-pro-tier", "Pro tier has live users",
        pro_count > 0,
        hint=f"{pro_count} Pro user(s) — needed so reviewers can verify entitlements",
        warn=True,
    ))

    # ---- Summary --------------------------------------------------------
    total = len(checks)
    ok = sum(1 for c in checks if c["status"] == "ok")
    fails = sum(1 for c in checks if c["status"] == "fail")
    warns = sum(1 for c in checks if c["status"] == "warn")

    return {
        "checks": checks,
        "summary": {
            "total": total,
            "passed": ok,
            "warnings": warns,
            "failures": fails,
            "ready_to_submit": fails == 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/admin/store-readiness")
async def store_readiness(_: User = Depends(get_super_admin_user)) -> dict[str, Any]:
    return await compute_readiness()


@router.get("/admin/store-readiness/watchdog")
async def store_readiness_watchdog_state(
    _: User = Depends(get_super_admin_user),
) -> dict[str, Any]:
    """Returns the current watchdog state — `failing_since`, whether an alert
    was already paged for the active incident, etc. Surfaced on the dashboard
    so the operator knows when the next Sentry/push will fire."""
    from utils.store_readiness_scheduler import GRACE_HOURS, INTERVAL_HOURS

    state = await db.store_readiness_state.find_one(
        {"_id": "global"}, {"_id": 0},
    ) or {}
    return {
        "interval_hours": INTERVAL_HOURS,
        "grace_hours": GRACE_HOURS,
        "state": state,
    }


@router.post("/admin/store-readiness/watchdog/run-now")
async def store_readiness_watchdog_run_now(
    _: User = Depends(get_super_admin_user),
) -> dict[str, Any]:
    """Manually trigger one watchdog cycle — useful for verifying paging works
    end-to-end without waiting for the 6-hour interval."""
    from utils.store_readiness_scheduler import evaluate_once

    state = await evaluate_once()
    # Strip _id for JSON
    state.pop("_id", None)
    return {"state": state}
