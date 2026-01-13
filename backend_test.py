#!/usr/bin/env python3
"""
Backend API Testing for WanderList Advanced Features
Testing: Messaging, Trip Planning, Enhanced Leaderboard, Bucket List
"""

import requests
import json
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://travelgram-7.preview.emergentagent.com/api"

# Test user credentials
TEST_USER = {
    "email": "mobile@test.com",
    "password": "test123"
}

FRIEND_SARAH = {
    "email": "sarah@test.com",
    "password": "test123"
}

FRIEND_MIKE = {
    "email": "mike@test.com",
    "password": "test123"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def login_user(email, password):
    """Login and return access token"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            user = data.get("user", {})
            print_success(f"Logged in as {user.get('name', email)} (Tier: {user.get('subscription_tier', 'unknown')})")
            return token
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

def get_headers(token):
    """Get authorization headers"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

# ============= MESSAGING TESTS =============

def test_messaging_system(token, friend_token):
    """Test messaging system (Basic+ tier only)"""
    print_info("\n" + "="*60)
    print_info("TESTING: MESSAGING SYSTEM (Basic+ tier only)")
    print_info("="*60)
    
    headers = get_headers(token)
    friend_headers = get_headers(friend_token)
    
    # Get current user info
    me_response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
    me_data = me_response.json()
    my_user_id = me_data.get("user_id")
    my_tier = me_data.get("subscription_tier")
    
    # Get friend info
    friend_response = requests.get(f"{BACKEND_URL}/auth/me", headers=friend_headers)
    friend_data = friend_response.json()
    friend_user_id = friend_data.get("user_id")
    friend_tier = friend_data.get("subscription_tier")
    
    print_info(f"My tier: {my_tier}, Friend tier: {friend_tier}")
    
    # Test 1: Send message to friend
    print_info("\nTest 1: Send message to friend")
    message_content = f"Hey! Testing messaging at {datetime.now().strftime('%H:%M:%S')}"
    send_response = requests.post(
        f"{BACKEND_URL}/messages",
        headers=headers,
        json={
            "receiver_id": friend_user_id,
            "content": message_content
        }
    )
    
    if send_response.status_code == 200:
        message_data = send_response.json()
        print_success(f"Message sent successfully: {message_data.get('message_id')}")
        print_info(f"Content: {message_data.get('content')}")
        
        # Verify message structure
        required_fields = ["message_id", "sender_id", "receiver_id", "content", "created_at", "read"]
        missing_fields = [f for f in required_fields if f not in message_data]
        if missing_fields:
            print_error(f"Missing fields in message: {missing_fields}")
        else:
            print_success("All required fields present in message")
    elif send_response.status_code == 403:
        print_warning(f"Messaging blocked (tier restriction): {send_response.json().get('detail')}")
    else:
        print_error(f"Failed to send message: {send_response.status_code} - {send_response.text}")
    
    # Test 2: Get conversation with friend
    print_info("\nTest 2: Get conversation with friend")
    get_response = requests.get(
        f"{BACKEND_URL}/messages/{friend_user_id}",
        headers=headers
    )
    
    if get_response.status_code == 200:
        messages = get_response.json()
        print_success(f"Retrieved {len(messages)} messages in conversation")
        if messages:
            latest = messages[-1]
            print_info(f"Latest message: {latest.get('content')[:50]}...")
            print_info(f"Sender: {latest.get('sender_id')}, Receiver: {latest.get('receiver_id')}")
    elif get_response.status_code == 403:
        print_warning(f"Conversation access blocked: {get_response.json().get('detail')}")
    else:
        print_error(f"Failed to get messages: {get_response.status_code} - {get_response.text}")
    
    # Test 3: Verify tier restrictions (if user is free tier)
    if my_tier == "free":
        print_info("\nTest 3: Verify tier restrictions for free users")
        print_warning("User is free tier - messaging should be blocked")

# ============= TRIP PLANNING TESTS =============

def test_trip_planning(token):
    """Test trip planning endpoints"""
    print_info("\n" + "="*60)
    print_info("TESTING: TRIP PLANNING")
    print_info("="*60)
    
    headers = get_headers(token)
    created_trip_id = None
    created_landmark_id = None
    
    # Test 1: Create a trip
    print_info("\nTest 1: Create a trip")
    trip_data = {
        "name": "European Adventure 2024",
        "destination": "Europe",
        "start_date": "2024-06-01",
        "end_date": "2024-06-15",
        "budget": 5000.0,
        "notes": "Visiting France and Italy"
    }
    
    create_response = requests.post(
        f"{BACKEND_URL}/trips",
        headers=headers,
        json=trip_data
    )
    
    if create_response.status_code == 200:
        trip = create_response.json()
        created_trip_id = trip.get("trip_id")
        print_success(f"Trip created: {trip.get('name')} (ID: {created_trip_id})")
        print_info(f"Destination: {trip.get('destination')}, Budget: ${trip.get('budget')}")
    else:
        print_error(f"Failed to create trip: {create_response.status_code} - {create_response.text}")
        return
    
    # Test 2: Get all trips
    print_info("\nTest 2: Get all user trips")
    list_response = requests.get(f"{BACKEND_URL}/trips", headers=headers)
    
    if list_response.status_code == 200:
        trips = list_response.json()
        print_success(f"Retrieved {len(trips)} trips")
        for trip in trips:
            print_info(f"  - {trip.get('name')}: {trip.get('landmark_count', 0)} landmarks, {trip.get('visited_count', 0)} visited")
    else:
        print_error(f"Failed to get trips: {list_response.status_code} - {list_response.text}")
    
    # Test 3: Get trip details
    if created_trip_id:
        print_info(f"\nTest 3: Get trip details for {created_trip_id}")
        detail_response = requests.get(f"{BACKEND_URL}/trips/{created_trip_id}", headers=headers)
        
        if detail_response.status_code == 200:
            trip_detail = detail_response.json()
            print_success(f"Trip details retrieved: {trip_detail.get('name')}")
            print_info(f"Status: {trip_detail.get('status')}, Landmarks: {len(trip_detail.get('landmarks', []))}")
        else:
            print_error(f"Failed to get trip details: {detail_response.status_code} - {detail_response.text}")
    
    # Test 4: Add landmarks to trip
    if created_trip_id:
        print_info("\nTest 4: Add landmarks to trip")
        # Get some landmarks first
        landmarks_response = requests.get(f"{BACKEND_URL}/landmarks?limit=5", headers=headers)
        if landmarks_response.status_code == 200:
            landmarks = landmarks_response.json()
            if landmarks:
                landmark_to_add = landmarks[0]
                add_landmark_response = requests.post(
                    f"{BACKEND_URL}/trips/{created_trip_id}/landmarks",
                    headers=headers,
                    json={
                        "landmark_id": landmark_to_add.get("landmark_id"),
                        "day_number": 1,
                        "notes": "Must visit!"
                    }
                )
                
                if add_landmark_response.status_code == 200:
                    trip_landmark = add_landmark_response.json()
                    created_landmark_id = trip_landmark.get("trip_landmark_id")
                    print_success(f"Landmark added to trip: {landmark_to_add.get('name')}")
                    print_info(f"Trip landmark ID: {created_landmark_id}")
                else:
                    print_error(f"Failed to add landmark: {add_landmark_response.status_code} - {add_landmark_response.text}")
    
    # Test 5: Mark landmark as visited in trip
    if created_trip_id and created_landmark_id:
        print_info("\nTest 5: Mark landmark as visited in trip")
        visit_response = requests.put(
            f"{BACKEND_URL}/trips/{created_trip_id}/landmarks/{created_landmark_id}/visited?visited=true",
            headers=headers
        )
        
        if visit_response.status_code == 200:
            print_success("Landmark marked as visited in trip")
        else:
            print_error(f"Failed to mark as visited: {visit_response.status_code} - {visit_response.text}")
    
    # Test 6: Delete trip
    if created_trip_id:
        print_info(f"\nTest 6: Delete trip {created_trip_id}")
        delete_response = requests.delete(f"{BACKEND_URL}/trips/{created_trip_id}", headers=headers)
        
        if delete_response.status_code == 200:
            print_success("Trip deleted successfully")
        else:
            print_error(f"Failed to delete trip: {delete_response.status_code} - {delete_response.text}")

# ============= LEADERBOARD TESTS =============

def test_enhanced_leaderboard(token):
    """Test enhanced leaderboard with filters"""
    print_info("\n" + "="*60)
    print_info("TESTING: ENHANCED LEADERBOARD WITH FILTERS")
    print_info("="*60)
    
    headers = get_headers(token)
    
    # Test 1: All time leaderboard
    print_info("\nTest 1: All time leaderboard (points)")
    response = requests.get(f"{BACKEND_URL}/leaderboard?time_period=all_time&category=points", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"All time leaderboard retrieved: {data.get('total_users')} users")
        print_info(f"Your rank: {data.get('user_rank')}")
        leaderboard = data.get('leaderboard', [])
        if leaderboard:
            top_user = leaderboard[0]
            print_info(f"Top user: {top_user.get('name')} with {top_user.get('value')} points")
    else:
        print_error(f"Failed to get leaderboard: {response.status_code} - {response.text}")
    
    # Test 2: Monthly leaderboard
    print_info("\nTest 2: Monthly leaderboard (visits)")
    response = requests.get(f"{BACKEND_URL}/leaderboard?time_period=monthly&category=visits", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Monthly leaderboard retrieved: {data.get('total_users')} users")
        print_info(f"Your rank: {data.get('user_rank')}")
    else:
        print_error(f"Failed to get monthly leaderboard: {response.status_code} - {response.text}")
    
    # Test 3: Countries category
    print_info("\nTest 3: Leaderboard by countries visited")
    response = requests.get(f"{BACKEND_URL}/leaderboard?category=countries", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Countries leaderboard retrieved: {data.get('total_users')} users")
        leaderboard = data.get('leaderboard', [])
        if leaderboard:
            top_user = leaderboard[0]
            print_info(f"Top user: {top_user.get('name')} with {top_user.get('value')} countries")
    else:
        print_error(f"Failed to get countries leaderboard: {response.status_code} - {response.text}")
    
    # Test 4: Streaks category
    print_info("\nTest 4: Leaderboard by streaks")
    response = requests.get(f"{BACKEND_URL}/leaderboard?category=streaks", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Streaks leaderboard retrieved: {data.get('total_users')} users")
        leaderboard = data.get('leaderboard', [])
        if leaderboard:
            top_user = leaderboard[0]
            print_info(f"Top user: {top_user.get('name')} with {top_user.get('value')} day streak")
            # Check for streak fields
            if 'current_streak' in top_user and 'longest_streak' in top_user:
                print_success("Streak fields present in response")
            else:
                print_warning("Streak fields missing in response")
    else:
        print_error(f"Failed to get streaks leaderboard: {response.status_code} - {response.text}")
    
    # Test 5: Friends only filter
    print_info("\nTest 5: Friends-only leaderboard")
    response = requests.get(f"{BACKEND_URL}/leaderboard?friends_only=true", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Friends-only leaderboard retrieved: {data.get('total_users')} users")
        print_info(f"Your rank among friends: {data.get('user_rank')}")
    else:
        print_error(f"Failed to get friends leaderboard: {response.status_code} - {response.text}")
    
    # Test 6: Combined filters
    print_info("\nTest 6: Combined filters (weekly + countries + friends)")
    response = requests.get(
        f"{BACKEND_URL}/leaderboard?time_period=weekly&category=countries&friends_only=true",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Combined filter leaderboard retrieved: {data.get('total_users')} users")
    else:
        print_error(f"Failed to get combined leaderboard: {response.status_code} - {response.text}")

# ============= BUCKET LIST TESTS =============

def test_bucket_list(token):
    """Test bucket list endpoints"""
    print_info("\n" + "="*60)
    print_info("TESTING: BUCKET LIST")
    print_info("="*60)
    
    headers = get_headers(token)
    created_bucket_id = None
    test_landmark_id = None
    
    # Get a landmark to add to bucket list
    landmarks_response = requests.get(f"{BACKEND_URL}/landmarks?limit=5", headers=headers)
    if landmarks_response.status_code == 200:
        landmarks = landmarks_response.json()
        if landmarks:
            test_landmark_id = landmarks[0].get("landmark_id")
            print_info(f"Using landmark: {landmarks[0].get('name')}")
    
    if not test_landmark_id:
        print_error("No landmarks available for testing")
        return
    
    # Test 1: Add to bucket list
    print_info("\nTest 1: Add landmark to bucket list")
    add_response = requests.post(
        f"{BACKEND_URL}/bucket-list",
        headers=headers,
        json={
            "landmark_id": test_landmark_id,
            "notes": "Must visit this place!"
        }
    )
    
    if add_response.status_code == 200:
        bucket_item = add_response.json()
        created_bucket_id = bucket_item.get("bucket_list_id")
        print_success(f"Added to bucket list: {created_bucket_id}")
    else:
        print_error(f"Failed to add to bucket list: {add_response.status_code} - {add_response.text}")
    
    # Test 2: Get bucket list
    print_info("\nTest 2: Get user's bucket list")
    get_response = requests.get(f"{BACKEND_URL}/bucket-list", headers=headers)
    
    if get_response.status_code == 200:
        bucket_list = get_response.json()
        print_success(f"Retrieved {len(bucket_list)} items in bucket list")
        for item in bucket_list[:3]:  # Show first 3
            landmark = item.get("landmark", {})
            print_info(f"  - {landmark.get('name', 'Unknown')} ({item.get('bucket_list_id')})")
    else:
        print_error(f"Failed to get bucket list: {get_response.status_code} - {get_response.text}")
    
    # Test 3: Check if landmark is in bucket list
    print_info(f"\nTest 3: Check if landmark {test_landmark_id} is in bucket list")
    check_response = requests.get(f"{BACKEND_URL}/bucket-list/check/{test_landmark_id}", headers=headers)
    
    if check_response.status_code == 200:
        check_data = check_response.json()
        in_bucket = check_data.get("in_bucket_list")
        print_success(f"Landmark in bucket list: {in_bucket}")
        if in_bucket:
            print_info(f"Bucket list ID: {check_data.get('bucket_list_id')}")
    else:
        print_error(f"Failed to check bucket list: {check_response.status_code} - {check_response.text}")
    
    # Test 4: Remove from bucket list
    if created_bucket_id:
        print_info(f"\nTest 4: Remove from bucket list ({created_bucket_id})")
        delete_response = requests.delete(f"{BACKEND_URL}/bucket-list/{created_bucket_id}", headers=headers)
        
        if delete_response.status_code == 200:
            print_success("Removed from bucket list successfully")
        else:
            print_error(f"Failed to remove from bucket list: {delete_response.status_code} - {delete_response.text}")

# ============= MAIN TEST RUNNER =============

def main():
    print_info("="*60)
    print_info("WanderList Backend API Testing - Advanced Features")
    print_info("="*60)
    print_info(f"Backend URL: {BACKEND_URL}")
    print_info(f"Test User: {TEST_USER['email']}")
    print_info("="*60)
    
    # Login test user
    print_info("\n🔐 Logging in test user...")
    token = login_user(TEST_USER["email"], TEST_USER["password"])
    if not token:
        print_error("Failed to login test user. Exiting.")
        return
    
    # Login friend Sarah
    print_info("\n🔐 Logging in friend Sarah...")
    sarah_token = login_user(FRIEND_SARAH["email"], FRIEND_SARAH["password"])
    
    # Run tests
    try:
        # Test 1: Messaging System
        if sarah_token:
            test_messaging_system(token, sarah_token)
        else:
            print_warning("Skipping messaging tests - friend login failed")
        
        # Test 2: Trip Planning
        test_trip_planning(token)
        
        # Test 3: Enhanced Leaderboard
        test_enhanced_leaderboard(token)
        
        # Test 4: Bucket List
        test_bucket_list(token)
        
    except Exception as e:
        print_error(f"Test execution error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print_info("\n" + "="*60)
    print_info("Testing Complete!")
    print_info("="*60)

if __name__ == "__main__":
    main()
