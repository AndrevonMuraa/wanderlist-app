from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import ssl
import certifi

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
    """Create database indexes for better query performance."""
    try:
        # User lookups
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("default_privacy")
        await db.users.create_index([("leaderboard_points", -1)])
        await db.users.create_index([("points", -1)])
        
        # Visit lookups
        await db.visits.create_index("user_id")
        await db.visits.create_index("landmark_id")
        await db.visits.create_index("visit_id", unique=True)
        await db.visits.create_index([("user_id", 1), ("landmark_id", 1)], unique=True)
        
        # Country visits
        await db.country_visits.create_index("user_id")
        await db.country_visits.create_index("country_visit_id", unique=True)
        await db.country_visits.create_index([("user_id", 1), ("country_id", 1)])
        
        # Activities / feed
        await db.activities.create_index([("created_at", -1)])
        await db.activities.create_index("user_id")
        await db.activities.create_index("activity_id")
        await db.activities.create_index([("user_id", 1), ("created_at", -1)])
        
        # Landmarks
        await db.landmarks.create_index("landmark_id")
        await db.landmarks.create_index("country_id")
        
        # Social
        await db.friendships.create_index("user_id")
        await db.friendships.create_index("friend_id")
        await db.likes.create_index("activity_id")
        await db.comments.create_index("activity_id")
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Index creation warning: {e}")
