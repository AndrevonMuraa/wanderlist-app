from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
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
        await db.users.create_index("username")
        
        # Visit lookups
        await db.visits.create_index("user_id")
        await db.visits.create_index("landmark_id")
        await db.visits.create_index("visit_id", unique=True)
        await db.visits.create_index([("user_id", 1), ("landmark_id", 1)], unique=True)
        await db.visits.create_index("visibility")
        await db.visits.create_index([("visibility", 1), ("visited_at", -1)])
        
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
        await db.landmarks.create_index("continent")
        await db.landmarks.create_index([("country_id", 1), ("category", 1)])
        
        # Social - FIXED: use db.friends (matches route code), not db.friendships
        await db.friends.create_index("user_id")
        await db.friends.create_index("friend_id")
        await db.friends.create_index([("user_id", 1), ("status", 1)])
        await db.friends.create_index([("friend_id", 1), ("status", 1)])
        
        # Likes & comments
        await db.likes.create_index("activity_id")
        await db.likes.create_index([("activity_id", 1), ("user_id", 1)])
        await db.comments.create_index("activity_id")
        
        # Photo upvotes (was completely missing!)
        await db.photo_upvotes.create_index("photo_id")
        await db.photo_upvotes.create_index([("photo_id", 1), ("user_id", 1)])
        
        # User-created visits (was completely missing!)
        await db.user_created_visits.create_index("user_id")
        await db.user_created_visits.create_index([("visibility", 1), ("visited_at", -1)])
        
        # Notifications
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Index creation warning: {e}")
