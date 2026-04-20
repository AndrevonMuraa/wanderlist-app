"""Sentry error monitoring — safe no-op if SENTRY_DSN is not set.

Keeps production config optional: the app boots fine without any Sentry env
vars, which makes local / CI / preview deployments friction-less.

Env vars
--------
- SENTRY_DSN         (required to activate)
- SENTRY_ENVIRONMENT (default: "production")
- SENTRY_RELEASE     (default: "unknown")
- SENTRY_TRACES_SAMPLE_RATE (default: 0.1)
"""
import logging
import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

logger = logging.getLogger(__name__)


def _before_send(event, hint):
    """Drop noisy events before they leave the app."""
    req = event.get("request") or {}
    url = req.get("url") or ""

    # Health-checks & docs endpoints — never useful in Sentry
    if any(p in url for p in ("/health", "/docs", "/openapi.json", "/redoc")):
        return None

    # Client-cancelled requests (HTTPException 499, ConnectionResetError, etc.)
    exc = (hint or {}).get("exc_info")
    if exc:
        exc_type, exc_value, _ = exc
        name = getattr(exc_type, "__name__", "")
        if name in {"ClientDisconnect", "ConnectionResetError"}:
            return None

    return event


def init_sentry() -> bool:
    """Initialise Sentry. Returns True if active, False if skipped."""
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        logger.info("Sentry disabled (SENTRY_DSN not set).")
        return False

    environment = os.environ.get("SENTRY_ENVIRONMENT", "production")
    release = os.environ.get("SENTRY_RELEASE", "unknown")
    traces_rate = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1"))

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_rate,
        send_default_pii=False,
        integrations=[
            StarletteIntegration(
                transaction_style="endpoint",
                failed_request_status_codes={500, 501, 502, 503, 504},
            ),
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes={500, 501, 502, 503, 504},
            ),
        ],
        before_send=_before_send,
    )
    logger.info(
        "Sentry initialised (env=%s, release=%s, traces=%.2f)",
        environment, release, traces_rate,
    )
    return True


def set_sentry_user(user_id: str, email: str | None = None, username: str | None = None) -> None:
    """Attach user context to the current Sentry scope.

    Safe no-op when Sentry is disabled (client becomes NonRecordingClient).
    """
    sentry_sdk.set_user({"id": user_id, "email": email, "username": username})


def clear_sentry_user() -> None:
    """Clear user context (e.g. on logout)."""
    sentry_sdk.set_user(None)


# ---------- Image-normalization observability ----------
# Tracks how often server-side defense-in-depth fires. A high "auto_resized"
# count means client-side compression is failing or being bypassed (potential
# UX regression). A non-zero "rejected" count means 413 responses are being
# returned — worth investigating per-user.
IMAGE_NORM_COUNTERS = {
    "auto_resized": 0,  # 2-5 MB → Pillow re-compress
    "rejected": 0,      # > 5 MB → HTTP 413
}


def track_image_auto_resized(before_bytes: int, after_bytes: int) -> None:
    """Fires when the server had to re-compress a >2MB image. Low-signal →
    Sentry breadcrumb + counter only (no capture_message)."""
    IMAGE_NORM_COUNTERS["auto_resized"] += 1
    try:
        sentry_sdk.add_breadcrumb(
            category="image.normalize",
            level="info",
            message="Server-side auto-resize triggered",
            data={
                "before_kb": before_bytes // 1024,
                "after_kb": after_bytes // 1024,
                "saved_pct": round(100 * (before_bytes - after_bytes) / max(before_bytes, 1)),
            },
        )
    except Exception:
        # Never let observability break a real request
        pass


def track_image_rejected(size_bytes: int, limit_bytes: int) -> None:
    """Fires on every 413. Higher signal → captures a warning so it surfaces
    in the Sentry issue stream (rate-limited automatically by Sentry)."""
    IMAGE_NORM_COUNTERS["rejected"] += 1
    try:
        sentry_sdk.add_breadcrumb(
            category="image.normalize",
            level="warning",
            message="Image rejected (> hard limit)",
            data={"size_kb": size_bytes // 1024, "limit_kb": limit_bytes // 1024},
        )
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("image_normalize", "rejected")
            scope.set_extra("size_kb", size_bytes // 1024)
            scope.set_extra("limit_kb", limit_bytes // 1024)
            sentry_sdk.capture_message(
                f"Oversized image rejected ({size_bytes // 1024} KB > {limit_bytes // 1024} KB)",
                level="warning",
            )
    except Exception:
        pass
