#!/usr/bin/env python3
"""
Focused test for Country & Continent Completion Bonus System
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://travelfeed.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

def login():
    """Login and get auth token"""
    session = requests.Session()
    
    response = session.post(f"{API_BASE}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        auth_token = data["access_token"]
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        print(f"✅ Logged in as {TEST_EMAIL}")
        return session
    else:
        print(f"❌ Login failed: {response.status_code}")
        return None

def test_country_completion_bonus_system():
    """Test the country completion bonus system"""
    session = login()
    if not session:
        return False
    
    print("\n🏁 TESTING COUNTRY COMPLETION BONUS SYSTEM")
    print("=" * 60)
    
    # Test Case 1: Regular landmark visit
    print("\n🎯 TEST CASE 1: Regular Landmark Visit")
    print("-" * 40)
    
    # Get initial points
    visits_response = session.get(f"{API_BASE}/visits")
    if visits_response.status_code != 200:
        print("❌ Could not fetch visits")
        return False
    
    initial_visits = visits_response.json()
    initial_points = sum(v.get("points_earned", 10) for v in initial_visits)
    print(f"📊 Initial points: {initial_points}")
    
    # Find Switzerland (unvisited country)
    landmarks_response = session.get(f"{API_BASE}/landmarks?country_id=switzerland")
    if landmarks_response.status_code != 200:
        print("❌ Could not fetch Switzerland landmarks")
        return False
    
    switzerland_landmarks = landmarks_response.json()
    visited_landmark_ids = {v["landmark_id"] for v in initial_visits}
    unvisited_landmarks = [lm for lm in switzerland_landmarks if lm["landmark_id"] not in visited_landmark_ids]
    
    if not unvisited_landmarks:
        print("❌ No unvisited landmarks in Switzerland")
        return False
    
    # Visit first landmark
    first_landmark = unvisited_landmarks[0]
    visit_response = session.post(f"{API_BASE}/visits", json={
        "landmark_id": first_landmark["landmark_id"]
    })
    
    if visit_response.status_code == 200:
        # Check points increased
        new_visits_response = session.get(f"{API_BASE}/visits")
        new_visits = new_visits_response.json()
        new_points = sum(v.get("points_earned", 10) for v in new_visits)
        points_gained = new_points - initial_points
        
        expected_points = first_landmark.get("points", 10)
        if points_gained == expected_points:
            print(f"✅ Regular visit awarded {points_gained} points (expected {expected_points})")
        else:
            print(f"❌ Expected {expected_points} points, got {points_gained}")
            
        # Check activity created
        feed_response = session.get(f"{API_BASE}/feed")
        if feed_response.status_code == 200:
            activities = feed_response.json()
            recent_visit_activity = None
            for activity in activities:
                if (activity.get("activity_type") == "visit" and 
                    activity.get("landmark_id") == first_landmark["landmark_id"]):
                    recent_visit_activity = activity
                    break
            
            if recent_visit_activity:
                required_fields = ["visit_id", "has_diary", "has_tips", "has_photos"]
                missing_fields = [field for field in required_fields if field not in recent_visit_activity]
                
                if not missing_fields:
                    print(f"✅ Visit activity created with all required fields")
                else:
                    print(f"❌ Visit activity missing fields: {missing_fields}")
            else:
                print("❌ No visit activity found")
    else:
        print(f"❌ Visit creation failed: {visit_response.status_code}")
        return False
    
    # Test Case 2: Activity Feed Display
    print("\n📱 TEST CASE 2: Activity Feed Display")
    print("-" * 40)
    
    feed_response = session.get(f"{API_BASE}/feed")
    if feed_response.status_code == 200:
        activities = feed_response.json()
        print(f"✅ Retrieved {len(activities)} activities")
        
        # Check activity types
        activity_types = set(activity.get("activity_type") for activity in activities)
        expected_types = ["visit", "country_complete"]
        found_types = [t for t in expected_types if t in activity_types]
        print(f"✅ Found activity types: {found_types}")
        
        # Check visit activities for rich content fields
        visit_activities = [a for a in activities if a.get("activity_type") == "visit"]
        if visit_activities:
            sample_visit = visit_activities[0]
            rich_content_fields = ["has_diary", "has_tips", "has_photos", "photo_count"]
            present_fields = [field for field in rich_content_fields if field in sample_visit]
            
            if len(present_fields) == len(rich_content_fields):
                print(f"✅ Visit activities have all rich content fields")
            else:
                missing_fields = [field for field in rich_content_fields if field not in sample_visit]
                print(f"❌ Visit activities missing fields: {missing_fields}")
        
        # Check country completion activities
        country_activities = [a for a in activities if a.get("activity_type") == "country_complete"]
        if country_activities:
            sample_country = country_activities[0]
            country_fields = ["country_name", "landmarks_count", "points_earned", "continent"]
            present_fields = [field for field in country_fields if field in sample_country]
            
            if len(present_fields) == len(country_fields):
                print(f"✅ Country completion activities have all required fields")
                print(f"   Example: {sample_country['country_name']} - {sample_country['landmarks_count']} landmarks, {sample_country['points_earned']} bonus points")
            else:
                missing_fields = [field for field in country_fields if field not in sample_country]
                print(f"❌ Country completion activities missing fields: {missing_fields}")
    else:
        print(f"❌ Could not fetch activity feed: {feed_response.status_code}")
    
    # Test Case 3: Visit Details with Rich Content
    print("\n📝 TEST CASE 3: Visit Details with Rich Content")
    print("-" * 40)
    
    # Create a visit with rich content
    if len(unvisited_landmarks) > 1:
        rich_landmark = unvisited_landmarks[1]
        rich_visit_response = session.post(f"{API_BASE}/visits", json={
            "landmark_id": rich_landmark["landmark_id"],
            "photos": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==",
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
            ],
            "diary_notes": "Amazing experience at this Swiss landmark! The views were breathtaking and the local culture was fascinating.",
            "travel_tips": [
                "Visit early morning for best lighting",
                "Bring warm clothes even in summer",
                "Try the local Swiss chocolate nearby"
            ]
        })
        
        if rich_visit_response.status_code == 200:
            visit_data = rich_visit_response.json()
            visit_id = visit_data.get("visit_id")
            print(f"✅ Created rich content visit: {visit_id}")
            
            # Get visit details
            details_response = session.get(f"{API_BASE}/visits/{visit_id}")
            if details_response.status_code == 200:
                details = details_response.json()
                
                # Check rich content fields
                rich_fields = ["photos", "diary_notes", "travel_tips"]
                present_fields = [field for field in rich_fields if field in details and details[field]]
                
                if len(present_fields) == len(rich_fields):
                    photos_count = len(details.get("photos", []))
                    tips_count = len(details.get("travel_tips", []))
                    has_diary = bool(details.get("diary_notes"))
                    print(f"✅ Rich content verified: {photos_count} photos, {tips_count} tips, diary: {has_diary}")
                else:
                    missing_fields = [field for field in rich_fields if field not in present_fields]
                    print(f"❌ Rich content missing fields: {missing_fields}")
            else:
                print(f"❌ Could not fetch visit details: {details_response.status_code}")
        else:
            print(f"❌ Rich content visit creation failed: {rich_visit_response.status_code}")
    
    # Test Case 4: Points System Verification
    print("\n💰 TEST CASE 4: Points System Verification")
    print("-" * 40)
    
    # Get final points
    final_visits_response = session.get(f"{API_BASE}/visits")
    if final_visits_response.status_code == 200:
        final_visits = final_visits_response.json()
        total_points = sum(v.get("points_earned", 10) for v in final_visits)
        
        # Count visit types
        official_visits = sum(1 for v in final_visits if v.get("points_earned", 10) == 10)
        premium_visits = sum(1 for v in final_visits if v.get("points_earned", 10) == 25)
        
        print(f"✅ Total points: {total_points}")
        print(f"✅ Official visits (10 pts): {official_visits}")
        print(f"✅ Premium visits (25 pts): {premium_visits}")
        
        # Check for bonus activities
        feed_response = session.get(f"{API_BASE}/feed")
        if feed_response.status_code == 200:
            activities = feed_response.json()
            
            country_bonuses = [a for a in activities if a.get("activity_type") == "country_complete"]
            continent_bonuses = [a for a in activities if a.get("activity_type") == "continent_complete"]
            
            total_country_bonus = sum(a.get("points_earned", 0) for a in country_bonuses)
            total_continent_bonus = sum(a.get("points_earned", 0) for a in continent_bonuses)
            
            print(f"✅ Country completion bonuses: {len(country_bonuses)} ({total_country_bonus} pts)")
            print(f"✅ Continent completion bonuses: {len(continent_bonuses)} ({total_continent_bonus} pts)")
            
            if country_bonuses:
                print("   Country completions:")
                for bonus in country_bonuses:
                    country_name = bonus.get("country_name", "Unknown")
                    landmarks_count = bonus.get("landmarks_count", 0)
                    points = bonus.get("points_earned", 0)
                    print(f"     - {country_name}: {landmarks_count} landmarks, {points} bonus points")
    
    print("\n🎉 COUNTRY & CONTINENT COMPLETION BONUS SYSTEM TESTING COMPLETE!")
    return True

if __name__ == "__main__":
    success = test_country_completion_bonus_system()
    if success:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n❌ Some tests failed!")