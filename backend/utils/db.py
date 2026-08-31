from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import certifi
import logging

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']

# Use certifi CA bundle + relaxed SSL for MongoDB Atlas on cloud platforms (Render, etc.)
if 'mongodb+srv' in mongo_url or 'mongodb.net' in mongo_url:
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=True,
        connectTimeoutMS=30000,
        socketTimeoutMS=30000,
    )
else:
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ.get('DB_NAME', 'wandermark')]

async def create_indexes():
    """Create database indexes for better query performance.

    Each index is created inside its own try/except so a single conflict
    (e.g. an existing index with different options) does not skip the rest.
    """
    index_specs = [
        # User lookups
        ("users", "user_id", {"unique": True}),
        ("users", "default_privacy", {}),
        ("users", [("leaderboard_points", -1)], {}),
        ("users", [("points", -1)], {}),
        ("users", "username", {}),
        # Visit lookups
        ("visits", "user_id", {}),
        ("visits", "landmark_id", {}),
        ("visits", "visit_id", {"unique": True}),
        ("visits", [("user_id", 1), ("landmark_id", 1)], {"unique": True}),
        ("visits", "visibility", {}),
        ("visits", [("visibility", 1), ("visited_at", -1)], {}),
        # Country visits
        ("country_visits", "user_id", {}),
        ("country_visits", "country_visit_id", {"unique": True}),
        ("country_visits", [("user_id", 1), ("country_id", 1)], {}),
        # Activities / feed
        ("activities", [("created_at", -1)], {}),
        ("activities", "user_id", {}),
        ("activities", "activity_id", {}),
        ("activities", [("user_id", 1), ("created_at", -1)], {}),
        ("activities", "visit_id", {}),
        # Landmarks
        ("landmarks", "landmark_id", {}),
        ("landmarks", "country_id", {}),
        ("landmarks", "continent", {}),
        ("landmarks", [("country_id", 1), ("category", 1)], {}),
        # Social — db.friends (matches route code), not db.friendships
        ("friends", "user_id", {}),
        ("friends", "friend_id", {}),
        ("friends", [("user_id", 1), ("status", 1)], {}),
        ("friends", [("friend_id", 1), ("status", 1)], {}),
        # Likes & comments
        ("likes", "activity_id", {}),
        ("likes", [("activity_id", 1), ("user_id", 1)], {}),
        ("comments", "activity_id", {}),
        ("comments", "comment_id", {"unique": True}),
        # Photo upvotes
        ("photo_upvotes", "photo_id", {}),
        ("photo_upvotes", [("photo_id", 1), ("user_id", 1)], {}),
        # User-created visits
        ("user_created_visits", "user_id", {}),
        ("user_created_visits", [("visibility", 1), ("visited_at", -1)], {}),
        # Notifications
        ("notifications", [("user_id", 1), ("created_at", -1)], {}),
        # Admin & security audit collections
        ("users", "email", {"unique": True, "sparse": True}),
        ("users", "locked_until", {"sparse": True}),
        ("users", "role", {"sparse": True}),
        ("admin_logs", [("created_at", -1)], {}),
        ("admin_logs", [("admin_id", 1), ("created_at", -1)], {}),
        ("admin_logs", [("action", 1), ("created_at", -1)], {}),
        ("tier_quota", [("admin_id", 1), ("date", 1)], {"unique": True}),
        ("support_tickets", "ticket_id", {"unique": True, "sparse": True}),
        ("support_tickets", [("user_id", 1), ("updated_at", -1)], {}),
        ("support_tickets", [("status", 1), ("updated_at", -1)], {}),
    ]

    created = 0
    skipped = 0
    for collection, keys, options in index_specs:
        try:
            await db[collection].create_index(keys, **options)
            created += 1
        except Exception as e:
            # Index conflict, name clash, or offline collection — never fail startup.
            skipped += 1
            logger.warning(f"Skipped index on {collection}({keys}): {e}")

    logger.info(f"Database indexes: {created} created, {skipped} skipped")
