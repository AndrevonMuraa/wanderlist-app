from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging

from utils.db import db, client
from routes import (
    auth, content, community, visits, admin, social,
    collections, notifications, country_visits, photos,
    achievements, subscription, reports, push, legal, promo,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the /api prefix router and include all sub-routers
api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(content.router)
api_router.include_router(community.router)
api_router.include_router(visits.router)
api_router.include_router(admin.router)
api_router.include_router(social.router)
api_router.include_router(collections.router)
api_router.include_router(notifications.router)
api_router.include_router(country_visits.router)
api_router.include_router(photos.router)
api_router.include_router(achievements.router)
api_router.include_router(subscription.router)
api_router.include_router(reports.router)
api_router.include_router(push.router)
api_router.include_router(legal.router)
api_router.include_router(promo.router)

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
