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
