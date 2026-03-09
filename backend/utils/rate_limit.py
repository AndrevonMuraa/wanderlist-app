"""Simple in-memory rate limiter middleware."""
import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit by IP address. Limits auth endpoints more strictly."""
    
    def __init__(self, app, default_rpm: int = 120, auth_rpm: int = 20):
        super().__init__(app)
        self.default_rpm = default_rpm
        self.auth_rpm = auth_rpm
        self.requests: dict = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        now = time.time()
        
        # Determine rate limit
        is_auth = "/api/auth/login" in path or "/api/auth/register" in path
        rpm = self.auth_rpm if is_auth else self.default_rpm
        
        # Clean old entries and count recent
        key = f"{client_ip}:{path}" if is_auth else client_ip
        self.requests[key] = [t for t in self.requests[key] if now - t < 60]
        
        if len(self.requests[key]) >= rpm:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        
        self.requests[key].append(now)
        
        # Periodic cleanup (every 1000 requests)
        if sum(len(v) for v in self.requests.values()) > 10000:
            cutoff = now - 60
            self.requests = defaultdict(list, {
                k: [t for t in v if t > cutoff] 
                for k, v in self.requests.items() if v
            })
        
        return await call_next(request)
