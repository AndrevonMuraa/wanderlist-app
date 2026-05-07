from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
import os

from utils.sentry import init_sentry  # MUST be imported + called before FastAPI is created
init_sentry()

from utils.db import db, client, create_indexes
from utils.rate_limit import RateLimitMiddleware
from routes import (
    auth, content, community, community_highlights, visits, admin,
    leaderboard, friends, messages, stats, feed,
    collections, notifications, country_visits, photos,
    achievements, subscription, reports, push, legal, promo, shares,
    compare, leaderboards, moderation, support, trust, year_in_travel,
    two_factor, lockdown, security_dashboard,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI()

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: 120 req/min general, 20 req/min for auth.
# Configurable via env for test environments (set to very high values to disable).
_default_rpm = int(os.environ.get("RATE_LIMIT_DEFAULT_RPM", "120"))
_auth_rpm = int(os.environ.get("RATE_LIMIT_AUTH_RPM", "20"))
app.add_middleware(RateLimitMiddleware, default_rpm=_default_rpm, auth_rpm=_auth_rpm)

# Create the /api prefix router and include all sub-routers
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(content.router)
api_router.include_router(community.router)
api_router.include_router(community_highlights.router)
api_router.include_router(visits.router)
api_router.include_router(admin.router)
api_router.include_router(leaderboard.router)
api_router.include_router(friends.router)
api_router.include_router(messages.router)
api_router.include_router(stats.router)
api_router.include_router(feed.router)
api_router.include_router(notifications.router)
api_router.include_router(country_visits.router)
api_router.include_router(photos.router)
api_router.include_router(achievements.router)
api_router.include_router(subscription.router)
api_router.include_router(reports.router)
api_router.include_router(push.router)
api_router.include_router(legal.router)
api_router.include_router(promo.router)
api_router.include_router(shares.router)
api_router.include_router(compare.router)
api_router.include_router(leaderboards.router)
api_router.include_router(moderation.router)
api_router.include_router(support.router)
api_router.include_router(trust.router)
api_router.include_router(year_in_travel.router)
api_router.include_router(two_factor.router)
api_router.include_router(lockdown.router)
api_router.include_router(security_dashboard.router)
from routes import photo_health  # noqa: E402
api_router.include_router(photo_health.router)
from routes import store_readiness  # noqa: E402
api_router.include_router(store_readiness.router)
from routes import e2e_status  # noqa: E402
api_router.include_router(e2e_status.router)

app.include_router(api_router)


@app.on_event("startup")
async def startup_db_indexes():
    await create_indexes()
    from utils.photo_health_scheduler import start_scheduler
    start_scheduler()
    from utils.store_readiness_scheduler import start_scheduler as start_readiness_scheduler
    start_readiness_scheduler()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
