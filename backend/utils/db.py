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
