"""Temporary script to seed MongoDB Atlas with WanderMark data"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import sys
import os

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from seed_data import COUNTRIES_DATA, LANDMARKS_DATA
from premium_landmarks import PREMIUM_LANDMARKS
from datetime import datetime, timezone

ATLAS_URL = 'mongodb+srv://wandermark_admin:KvaEFtaic8e9gsZC@wandermark-cluster.jacptse.mongodb.net/wandermark?appName=wandermark-cluster'

async def seed_atlas():
    client = AsyncIOMotorClient(ATLAS_URL, tls=True, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    db = client['wandermark']
    
    # Check if already seeded
    existing = await db.landmarks.count_documents({})
    if existing > 0:
        print(f"Database already has {existing} landmarks. Skipping seed.")
        return
    
    # 1. Insert countries
    print("Inserting countries...")
    country_docs = []
    for c in COUNTRIES_DATA:
        country_docs.append({
            "country_id": c["country_id"],
            "name": c["name"],
            "continent": c["continent"],
            "landmark_count": 10,
            "created_at": datetime.now(timezone.utc)
        })
    await db.countries.insert_many(country_docs)
    print(f"  Inserted {len(country_docs)} countries")
    
    # 2. Insert landmarks
    print("Inserting landmarks...")
    all_landmarks = []
    official_names_by_country = {}
    
    for country_id, landmarks in LANDMARKS_DATA.items():
        country_data = next((c for c in COUNTRIES_DATA if c["country_id"] == country_id), None)
        if not country_data:
            continue
        
        country_name = country_data["name"]
        continent = country_data["continent"]
        official_names = set()
        
        for idx, landmark in enumerate(landmarks):
            doc = {
                "landmark_id": f"{country_id}_{landmark['name'].lower().replace(' ', '_').replace(',', '').replace('(', '').replace(')', '')}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": landmark["description"],
                "category": "official",
                "image_url": landmark.get("image_url", ""),
                "images": landmark.get("images", [landmark.get("image_url", "")]),
                "facts": landmark.get("facts", []),
                "best_time_to_visit": landmark.get("best_time_to_visit", "Year-round"),
                "duration": landmark.get("duration", "Half day"),
                "difficulty": landmark.get("difficulty", "Easy"),
                "latitude": landmark.get("latitude"),
                "longitude": landmark.get("longitude"),
                "points": landmark.get("points", 10),
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            all_landmarks.append(doc)
            official_names.add(landmark["name"].lower().strip())
        
        official_names_by_country[country_id] = official_names
    
    await db.landmarks.insert_many(all_landmarks)
    print(f"  Inserted {len(all_landmarks)} official landmarks")
    
    # 3. Insert premium landmarks
    print("Inserting premium landmarks...")
    premium_docs = []
    skipped = 0
    
    for country_id, premium_landmarks in PREMIUM_LANDMARKS.items():
        country_data = next((c for c in COUNTRIES_DATA if c["country_id"] == country_id), None)
        if not country_data:
            continue
        
        country_name = country_data["name"]
        continent = country_data["continent"]
        official_names = official_names_by_country.get(country_id, set())
        
        for idx, landmark in enumerate(premium_landmarks):
            name_norm = landmark["name"].lower().strip()
            is_dup = any(name_norm == n or name_norm in n or n in name_norm for n in official_names)
            if is_dup:
                skipped += 1
                continue
            
            premium_docs.append({
                "landmark_id": f"{country_id}_premium_{idx+1}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": landmark["description"],
                "category": "premium",
                "image_url": landmark["image_url"],
                "images": [landmark["image_url"]],
                "facts": [{"text": f"Worth {landmark['points']} points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Moderate",
                "latitude": None,
                "longitude": None,
                "points": landmark["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            })
    
    if premium_docs:
        await db.landmarks.insert_many(premium_docs)
    print(f"  Inserted {len(premium_docs)} premium landmarks (skipped {skipped} duplicates)")
    
    # 4. Create indexes
    print("Creating indexes...")
    await db.landmarks.create_index("landmark_id", unique=True)
    await db.landmarks.create_index("country_id")
    await db.landmarks.create_index("continent")
    await db.countries.create_index("country_id", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.visits.create_index("user_id")
    await db.visits.create_index([("user_id", 1), ("landmark_id", 1)], unique=True)
    
    # Summary
    total_landmarks = await db.landmarks.count_documents({})
    total_countries = await db.countries.count_documents({})
    print(f"\nSeeding complete!")
    print(f"  Countries: {total_countries}")
    print(f"  Landmarks: {total_landmarks}")

if __name__ == "__main__":
    asyncio.run(seed_atlas())
