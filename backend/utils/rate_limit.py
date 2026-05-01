"""Rate limiter middleware.

Protects auth, 2FA, password-reset, and lockdown endpoints from brute force.
Additionally, per-user login lockout is enforced in utils/auth.py via
`register_failed_login` / `clear_failed_logins` / `check_user_locked`.
"""
import time
import json
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Paths that must be limited aggressively (IP + path bucket).
_AUTH_PATHS = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/2fa/confirm",
    "/api/2fa/disable",
    "/api/2fa/regenerate-backup-codes",
    "/api/admin/lockdown/disable",
    "/api/admin/lockdown/enable",
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit by IP address. Limits auth/2FA endpoints more strictly."""

    def __init__(self, app, default_rpm: int = 120, auth_rpm: int = 10):
        super().__init__(app)
        self.default_rpm = default_rpm
        self.auth_rpm = auth_rpm
        self.requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        now = time.time()

        # Determine rate limit — aggressive for auth/2FA/lockdown endpoints
        is_auth = any(p in path for p in _AUTH_PATHS)
        rpm = self.auth_rpm if is_auth else self.default_rpm

        # Clean old entries and count recent
        key = f"{client_ip}:{path}" if is_auth else client_ip
        self.requests[key] = [t for t in self.requests[key] if now - t < 60]

        if len(self.requests[key]) >= rpm:
            # Return a response directly — raising HTTPException inside a
            # BaseHTTPMiddleware.dispatch is wrapped in an anyio ExceptionGroup
            # that Starlette collapses as 500. Direct Response avoids that.
            return Response(
                content=json.dumps({"detail": "Too many requests. Please try again later."}),
                status_code=429,
                media_type="application/json",
            )

        self.requests[key].append(now)

        # Periodic cleanup (every 1000 requests)
        if sum(len(v) for v in self.requests.values()) > 10000:
            cutoff = now - 60
            self.requests = defaultdict(list, {
                k: [t for t in v if t > cutoff]
                for k, v in self.requests.items() if v
            })

        return await call_next(request)
