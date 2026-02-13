#!/usr/bin/env python3
"""
Simple test to debug country completion bonus system
"""

import requests
import json
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sign-in-bridge.preview.emergentagent.com')
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

def debug_country_completion():
    """Debug country completion logic"""
    session = login()
    if not session:
        return
    
    print("\n🔍 DEBUGGING COUNTRY COMPLETION LOGIC")
    print("=" * 50)
    
    # Get countries
    countries_response = session.get(f"{API_BASE}/countries")
    if countries_response.status_code != 200:
        print("❌ Could not fetch countries")
        return
    
    countries = countries_response.json()
    print(f"📍 Found {len(countries)} countries")
    
    # Look for a small country to test with
    for country in countries:
        country_id = country["country_id"]
        country_name = country["name"]
        
        # Get landmarks for this country
        landmarks_response = session.get(f"{API_BASE}/landmarks?country_id={country_id}")
        if landmarks_response.status_code != 200:
            continue
            
        landmarks = landmarks_response.json()
        total_landmarks = len(landmarks)
        
        if total_landmarks <= 12:  # Find a manageable country
            print(f"\n🎯 Testing with {country_name} ({total_landmarks} landmarks)")
            
            # Get user's current visits for this country
            visits_response = session.get(f"{API_BASE}/visits")
            if visits_response.status_code != 200:
                print("❌ Could not fetch visits")
                continue
                
            visits = visits_response.json()
            country_landmark_ids = {lm["landmark_id"] for lm in landmarks}
            country_visits = [v for v in visits if v["landmark_id"] in country_landmark_ids]
            
            print(f"📊 Current visits in {country_name}: {len(country_visits)}/{total_landmarks}")
            
            # Show landmark details
            print(f"\n📋 Landmarks in {country_name}:")
            for i, landmark in enumerate(landmarks, 1):
                is_visited = landmark["landmark_id"] in {v["landmark_id"] for v in country_visits}
                status = "✅ VISITED" if is_visited else "⭕ NOT VISITED"
                category = landmark.get("category", "unknown")
                points = landmark.get("points", 10)
                print(f"  {i:2d}. {landmark['name']} ({category}, {points} pts) - {status}")
            
            # If not complete, show what would happen
            if len(country_visits) < total_landmarks:
                remaining = total_landmarks - len(country_visits)
                print(f"\n💡 Need {remaining} more visits to complete {country_name}")
                print(f"   Last visit should award landmark points + 50 bonus = {landmarks[-1].get('points', 10) + 50} total points")
            else:
                print(f"\n🎉 {country_name} is already complete!")
                
                # Check if there's a country completion activity
                feed_response = session.get(f"{API_BASE}/feed")
                if feed_response.status_code == 200:
                    activities = feed_response.json()
                    country_activities = [a for a in activities if 
                                        a.get("activity_type") == "country_complete" and 
                                        a.get("country_name") == country_name]
                    
                    if country_activities:
                        activity = country_activities[0]
                        print(f"✅ Found country completion activity: {activity}")
                    else:
                        print("❌ No country completion activity found")
            
            break
    
    print("\n🔍 CHECKING ACTIVITY FEED")
    print("=" * 30)
    
    feed_response = session.get(f"{API_BASE}/feed")
    if feed_response.status_code == 200:
        activities = feed_response.json()
        
        # Show recent activities
        print(f"📱 Total activities in feed: {len(activities)}")
        
        # Group by type
        activity_types = {}
        for activity in activities:
            activity_type = activity.get("activity_type", "unknown")
            if activity_type not in activity_types:
                activity_types[activity_type] = []
            activity_types[activity_type].append(activity)
        
        for activity_type, type_activities in activity_types.items():
            print(f"  {activity_type}: {len(type_activities)} activities")
            
            if activity_type == "country_complete":
                for activity in type_activities:
                    country_name = activity.get("country_name", "Unknown")
                    points = activity.get("points_earned", 0)
                    landmarks_count = activity.get("landmarks_count", 0)
                    print(f"    - {country_name}: {landmarks_count} landmarks, {points} bonus points")

if __name__ == "__main__":
    debug_country_completion()