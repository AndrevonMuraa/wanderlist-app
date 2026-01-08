#!/usr/bin/env python3
"""
Simple test script to verify the badge system functionality
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# Import the badge checking function
from server import check_and_award_badges, BADGE_DEFINITIONS

async def test_badge_system():
    """Test the badge system with a mock user"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'landmark_app')]
    
    print("🧪 Testing Badge System...")
    print("=" * 50)
    
    # Create a test user
    test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
    print(f"📝 Created test user: {test_user_id}")
    
    # Test 1: First visit badge
    print("\n🎯 Test 1: First visit badge")
    
    # Create a test visit
    visit = {
        "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
        "user_id": test_user_id,
        "landmark_id": "test_landmark",
        "points_earned": 10,
        "visited_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    await db.visits.insert_one(visit)
    
    # Check for badges
    newly_awarded = await check_and_award_badges(test_user_id)
    print(f"✅ Newly awarded badges: {newly_awarded}")
    
    # Verify first visit badge was awarded
    achievements = await db.achievements.find({"user_id": test_user_id}).to_list(100)
    print(f"📊 Total achievements: {len(achievements)}")
    
    for achievement in achievements:
        badge_def = BADGE_DEFINITIONS.get(achievement["badge_type"], {})
        print(f"🏆 {achievement['badge_name']} ({achievement['badge_icon']}) - {achievement['badge_description']}")
    
    # Test 2: Points badge
    print("\n⭐ Test 2: Points badge (100 points)")
    
    # Add more visits to reach 100 points
    for i in range(9):  # 9 more visits (10 points each) = 90 + 10 = 100 points
        visit = {
            "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
            "user_id": test_user_id,
            "landmark_id": f"test_landmark_{i}",
            "points_earned": 10,
            "visited_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        await db.visits.insert_one(visit)
    
    # Check for badges again
    newly_awarded = await check_and_award_badges(test_user_id)
    print(f"✅ Newly awarded badges: {newly_awarded}")
    
    # Show all achievements
    achievements = await db.achievements.find({"user_id": test_user_id}).to_list(100)
    print(f"📊 Total achievements: {len(achievements)}")
    
    for achievement in achievements:
        print(f"🏆 {achievement['badge_name']} ({achievement['badge_icon']}) - {achievement['badge_description']}")
    
    # Test 3: Milestone badge (10 visits)
    print("\n🗺️ Test 3: Milestone badge (10 visits)")
    
    # We already have 10 visits, so this should trigger the milestone badge
    newly_awarded = await check_and_award_badges(test_user_id)
    print(f"✅ Newly awarded badges: {newly_awarded}")
    
    # Show final achievements
    achievements = await db.achievements.find({"user_id": test_user_id}).to_list(100)
    print(f"\n🎉 Final Results - Total achievements: {len(achievements)}")
    
    for achievement in achievements:
        print(f"🏆 {achievement['badge_name']} ({achievement['badge_icon']}) - {achievement['badge_description']}")
    
    # Cleanup - remove test data
    print(f"\n🧹 Cleaning up test data...")
    await db.visits.delete_many({"user_id": test_user_id})
    await db.achievements.delete_many({"user_id": test_user_id})
    
    client.close()
    print("✅ Badge system test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_badge_system())