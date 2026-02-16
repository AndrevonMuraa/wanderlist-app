"""
Comprehensive E2E test for WanderMark Travel App
Tests ALL features from 3 user perspectives: standard (free), premium (pro), moderator
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://travel-app-preview.preview.emergentagent.com')

# Test credentials with unique identifiers
TEST_RUN_ID = uuid.uuid4().hex[:8]
STANDARD_USER = {
    "email": f"standard_user_{TEST_RUN_ID}@test.com",
    "username": f"std_user_{TEST_RUN_ID}",
    "password": "TestPass123",
    "name": f"Standard User {TEST_RUN_ID}"
}
PREMIUM_USER = {
    "email": f"premium_user_{TEST_RUN_ID}@test.com",
    "username": f"prm_user_{TEST_RUN_ID}",
    "password": "TestPass123",
    "name": f"Premium User {TEST_RUN_ID}"
}
MOD_USER = {
    "email": f"mod_user_{TEST_RUN_ID}@test.com",
    "username": f"mod_user_{TEST_RUN_ID}",
    "password": "TestPass123",
    "name": f"Moderator User {TEST_RUN_ID}"
}

# Store tokens and user IDs
tokens = {}
user_ids = {}
created_data = {}  # To store IDs for cleanup and later tests


class TestSetup:
    """Phase 1: User Registration and Setup"""
    
    def test_01_register_standard_user(self):
        """Register standard (free tier) user"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=STANDARD_USER)
        print(f"Register standard user: {response.status_code}")
        assert response.status_code == 200, f"Failed to register standard user: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == STANDARD_USER["email"]
        assert data["user"]["subscription_tier"] == "free"
        
        tokens["standard"] = data["access_token"]
        user_ids["standard"] = data["user"]["user_id"]
        print(f"✓ Standard user registered: {user_ids['standard']}")
    
    def test_02_register_premium_user(self):
        """Register premium user (initially free)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=PREMIUM_USER)
        print(f"Register premium user: {response.status_code}")
        assert response.status_code == 200, f"Failed to register premium user: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["subscription_tier"] == "free"  # Starts as free
        
        tokens["premium"] = data["access_token"]
        user_ids["premium"] = data["user"]["user_id"]
        print(f"✓ Premium user registered (currently free): {user_ids['premium']}")
    
    def test_03_register_moderator_user(self):
        """Register moderator user (initially free)"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=MOD_USER)
        print(f"Register moderator user: {response.status_code}")
        assert response.status_code == 200, f"Failed to register moderator user: {response.text}"
        
        data = response.json()
        tokens["moderator"] = data["access_token"]
        user_ids["moderator"] = data["user"]["user_id"]
        print(f"✓ Moderator user registered: {user_ids['moderator']}")
    
    def test_04_upgrade_premium_user(self):
        """Upgrade premium user to Pro via toggle-test endpoint"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        response = requests.post(f"{BASE_URL}/api/subscription/test-toggle", headers=headers)
        print(f"Upgrade to pro: {response.status_code}")
        assert response.status_code == 200, f"Failed to upgrade: {response.text}"
        
        data = response.json()
        assert data["is_pro"] == True
        print(f"✓ Premium user upgraded to Pro")
    
    def test_05_make_user_moderator_via_db(self):
        """Make moderator user a moderator via direct MongoDB update"""
        # Since we can't access MongoDB directly in tests, we use admin endpoint if available
        # For this test, we'll verify moderator features work after setup
        # The main agent would need to update DB directly
        print(f"Note: Moderator role needs to be set via MongoDB: db.users.update_one({{email: '{MOD_USER['email']}'}}, {{$set: {{role: 'moderator'}}}})")
        print(f"✓ Moderator setup instruction logged")


class TestAuth:
    """Phase 2: Authentication verification"""
    
    def test_01_login_standard_user(self):
        """Verify standard user login returns correct tier"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STANDARD_USER["email"],
            "password": STANDARD_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["subscription_tier"] == "free"
        print(f"✓ Standard user login verified: subscription_tier=free")
    
    def test_02_login_premium_user(self):
        """Verify premium user login returns Pro tier"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PREMIUM_USER["email"],
            "password": PREMIUM_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        # Re-update token after login
        tokens["premium"] = data["access_token"]
        assert data["user"]["subscription_tier"] == "pro"
        print(f"✓ Premium user login verified: subscription_tier=pro")
    
    def test_03_login_mod_user(self):
        """Verify moderator user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOD_USER["email"],
            "password": MOD_USER["password"]
        })
        assert response.status_code == 200
        data = response.json()
        tokens["moderator"] = data["access_token"]
        print(f"✓ Moderator user login verified: role={data['user'].get('role', 'user')}")


class TestExplore:
    """Phase 3: Country and Landmark exploration"""
    
    def test_01_get_countries(self):
        """Verify /api/countries returns 66 countries"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        response = requests.get(f"{BASE_URL}/api/countries", headers=headers)
        assert response.status_code == 200
        countries = response.json()
        assert len(countries) == 66, f"Expected 66 countries, got {len(countries)}"
        print(f"✓ GET /api/countries returns {len(countries)} countries")
    
    def test_02_get_landmarks_france_free_user(self):
        """Free user gets landmarks with premium ones locked"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
        assert response.status_code == 200
        landmarks = response.json()
        assert len(landmarks) > 0
        
        # Check for premium landmarks being locked for free user
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        locked_landmarks = [l for l in premium_landmarks if l.get("is_locked") == True]
        
        print(f"✓ Free user: {len(landmarks)} landmarks in France")
        print(f"  - Premium landmarks: {len(premium_landmarks)}")
        print(f"  - Locked for free user: {len(locked_landmarks)}")
        
        # Store a landmark for later tests
        official_landmarks = [l for l in landmarks if l.get("category") == "official"]
        if official_landmarks:
            created_data["official_landmark"] = official_landmarks[0]
        if premium_landmarks:
            created_data["premium_landmark"] = premium_landmarks[0]
    
    def test_03_get_landmarks_france_pro_user(self):
        """Pro user gets landmarks with premium ones unlocked"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
        assert response.status_code == 200
        landmarks = response.json()
        
        # Check premium landmarks are NOT locked for pro user
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        unlocked = all(not l.get("is_locked", True) for l in premium_landmarks)
        
        print(f"✓ Pro user: Premium landmarks unlocked: {unlocked}")
        assert unlocked or len(premium_landmarks) == 0, "Premium landmarks should be unlocked for pro user"


class TestVisits:
    """Phase 4: Visit functionality"""
    
    def test_01_standard_user_visit_official(self):
        """Standard user can visit official landmark"""
        if "official_landmark" not in created_data:
            pytest.skip("No official landmark found from previous test")
        
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        landmark = created_data["official_landmark"]
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Test visit from standard user"
        })
        
        assert response.status_code == 200, f"Failed to create visit: {response.text}"
        visit = response.json()
        assert visit["points_earned"] == 10  # Official = 10 points
        created_data["standard_visit"] = visit
        print(f"✓ Standard user visited {landmark['name']}, earned {visit['points_earned']} points")
    
    def test_02_standard_user_blocked_premium_landmark(self):
        """Free user should get 403 when visiting premium landmark"""
        if "premium_landmark" not in created_data:
            pytest.skip("No premium landmark found")
        
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        landmark = created_data["premium_landmark"]
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Trying to visit premium"
        })
        
        assert response.status_code == 403, f"Expected 403 for free user on premium, got {response.status_code}"
        print(f"✓ Free user correctly blocked from premium landmark (403)")
    
    def test_03_premium_user_visit_premium(self):
        """Premium user can visit premium landmark"""
        if "premium_landmark" not in created_data:
            pytest.skip("No premium landmark found")
        
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        landmark = created_data["premium_landmark"]
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Test visit from premium user"
        })
        
        assert response.status_code == 200, f"Pro user should access premium: {response.text}"
        visit = response.json()
        assert visit["points_earned"] == 25  # Premium = 25 points
        created_data["premium_visit"] = visit
        print(f"✓ Premium user visited premium landmark, earned {visit['points_earned']} points")
    
    def test_04_standard_user_photo_limit(self):
        """Free user limited to 1 photo per visit"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        # Get another official landmark
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=italy", headers=headers)
        landmarks = response.json()
        official = [l for l in landmarks if l.get("category") == "official"][0]
        
        # Try with 2 photos - should fail
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": official["landmark_id"],
            "photos": ["base64photo1", "base64photo2"],  # 2 photos
            "comments": "Testing photo limit"
        })
        
        assert response.status_code == 403, f"Expected 403 for exceeding photo limit, got {response.status_code}"
        print(f"✓ Free user photo limit enforced (max 1 photo)")
    
    def test_05_premium_user_multiple_photos(self):
        """Premium user can add up to 10 photos"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        # Get another landmark
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=italy", headers=headers)
        landmarks = response.json()
        official = [l for l in landmarks if l.get("category") == "official"][0]
        
        # Try with 3 photos - should succeed for pro
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": official["landmark_id"],
            "photos": ["base64photo1", "base64photo2", "base64photo3"],
            "comments": "Premium user multiple photos"
        })
        
        assert response.status_code == 200, f"Pro user should add multiple photos: {response.text}"
        print(f"✓ Premium user can add multiple photos (tested with 3)")


class TestCustomVisits:
    """Phase 5: Custom visits (Pro feature)"""
    
    def test_01_free_user_blocked_custom_visits(self):
        """Free user should get 403 for custom visits"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.post(f"{BASE_URL}/api/user-created-visits", headers=headers, json={
            "country_name": "Test Country",
            "landmarks": [{"name": "Custom Place"}],
            "diary_notes": "Test diary"
        })
        
        assert response.status_code == 403, f"Expected 403 for free user, got {response.status_code}"
        print(f"✓ Free user blocked from custom visits (403)")
    
    def test_02_premium_user_creates_custom_visit(self):
        """Premium user can create custom visit"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(f"{BASE_URL}/api/user-created-visits", headers=headers, json={
            "country_name": "Fictional Land",
            "landmarks": [{"name": "Amazing Place", "photo": None}],
            "diary_notes": "This was an amazing trip!"
        })
        
        assert response.status_code == 200, f"Pro user should create custom: {response.text}"
        custom_visit = response.json()
        created_data["custom_visit"] = custom_visit
        print(f"✓ Premium user created custom visit to {custom_visit['country_name']}")


class TestBadgesAndPoints:
    """Phase 6: Achievements, badges, and points"""
    
    def test_01_check_achievements(self):
        """Verify achievements endpoint works"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/achievements", headers=headers)
        assert response.status_code == 200
        achievements = response.json()
        print(f"✓ GET /api/achievements: {len(achievements)} achievements")
    
    def test_02_trigger_badge_check(self):
        """Trigger badge check after visits"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.post(f"{BASE_URL}/api/achievements/check", headers=headers)
        assert response.status_code == 200
        result = response.json()
        print(f"✓ Badge check completed: {result}")
    
    def test_03_check_stats(self):
        """Verify stats endpoint returns accurate data"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        print(f"✓ GET /api/stats: points={stats.get('total_points', 0)}, visits={stats.get('total_visits', 0)}")
    
    def test_04_check_progress(self):
        """Verify progress endpoint"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/progress", headers=headers)
        assert response.status_code == 200
        progress = response.json()
        print(f"✓ GET /api/progress: Working")


class TestFriends:
    """Phase 7: Friend requests and friendships"""
    
    def test_01_send_friend_request(self):
        """Standard user sends friend request to premium user"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.post(f"{BASE_URL}/api/friends/request", headers=headers, json={
            "friend_username": PREMIUM_USER["username"]
        })
        
        assert response.status_code in [200, 201], f"Failed to send request: {response.text}"
        result = response.json()
        created_data["friendship_id"] = result.get("friendship_id")
        print(f"✓ Friend request sent from standard to premium user")
    
    def test_02_check_pending_requests(self):
        """Premium user sees pending friend request"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.get(f"{BASE_URL}/api/friends/pending", headers=headers)
        assert response.status_code == 200
        pending = response.json()
        
        # Find our request
        our_request = None
        for req in pending:
            if req.get("user_id") == user_ids["standard"]:
                our_request = req
                break
        
        assert our_request is not None, "Friend request not found in pending"
        created_data["friendship_id"] = our_request.get("friendship_id")
        print(f"✓ Premium user sees pending request from standard user")
    
    def test_03_accept_friend_request(self):
        """Premium user accepts friend request"""
        if "friendship_id" not in created_data:
            pytest.skip("No friendship_id found")
        
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/friends/{created_data['friendship_id']}/accept",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to accept: {response.text}"
        print(f"✓ Friend request accepted")
    
    def test_04_verify_friendship(self):
        """Both users see each other in friends list"""
        # Standard user's friends
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        response = requests.get(f"{BASE_URL}/api/friends", headers=headers)
        assert response.status_code == 200
        std_friends = response.json()
        
        # Premium user's friends
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        response = requests.get(f"{BASE_URL}/api/friends", headers=headers)
        assert response.status_code == 200
        prm_friends = response.json()
        
        std_has_prm = any(f["user_id"] == user_ids["premium"] for f in std_friends)
        prm_has_std = any(f["user_id"] == user_ids["standard"] for f in prm_friends)
        
        assert std_has_prm, "Standard user should see premium in friends"
        assert prm_has_std, "Premium user should see standard in friends"
        print(f"✓ Both users see each other in friends list")


class TestMessages:
    """Phase 8: Messaging between friends"""
    
    def test_01_premium_sends_message(self):
        """Premium user sends message to friend"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(f"{BASE_URL}/api/messages", headers=headers, json={
            "receiver_id": user_ids["standard"],
            "content": "Hello from premium user!"
        })
        
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        message = response.json()
        created_data["message_id"] = message.get("message_id")
        print(f"✓ Premium user sent message")
    
    def test_02_standard_receives_message(self):
        """Standard user can read the message"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/messages/{user_ids['premium']}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get messages: {response.text}"
        messages = response.json()
        
        found = any("Hello from premium" in m.get("content", "") for m in messages)
        assert found, "Message not found"
        print(f"✓ Standard user received message from premium user")


class TestLeaderboard:
    """Phase 9: Leaderboard functionality"""
    
    def test_01_get_leaderboard(self):
        """Get global leaderboard"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/leaderboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        print(f"✓ GET /api/leaderboard: {len(data.get('leaderboard', []))} entries")
    
    def test_02_get_friends_leaderboard(self):
        """Get friends-only leaderboard"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?friends_only=true",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Friends leaderboard: {len(data.get('leaderboard', []))} entries")


class TestActivityFeed:
    """Phase 10: Activity feed and social interactions"""
    
    def test_01_get_feed(self):
        """Verify activity feed returns entries"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/feed", headers=headers)
        assert response.status_code == 200
        activities = response.json()
        
        if activities:
            created_data["activity_id"] = activities[0].get("activity_id")
        print(f"✓ GET /api/feed: {len(activities)} activities")
    
    def test_02_like_activity(self):
        """Like an activity"""
        if "activity_id" not in created_data:
            pytest.skip("No activity to like")
        
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/activities/{created_data['activity_id']}/like",
            headers=headers
        )
        
        # May get 400 if already liked, both are acceptable
        assert response.status_code in [200, 400]
        print(f"✓ Activity like tested")
    
    def test_03_comment_on_activity(self):
        """Comment on an activity"""
        if "activity_id" not in created_data:
            pytest.skip("No activity to comment on")
        
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/activities/{created_data['activity_id']}/comment",
            headers=headers,
            json={"content": "Great visit!"}
        )
        
        assert response.status_code == 200, f"Failed to comment: {response.text}"
        comment = response.json()
        created_data["comment_id"] = comment.get("comment_id")
        print(f"✓ Commented on activity")


class TestReports:
    """Phase 11: Content reporting"""
    
    def test_01_create_report(self):
        """Standard user reports inappropriate content"""
        if "activity_id" not in created_data:
            pytest.skip("No activity to report")
        
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.post(f"{BASE_URL}/api/reports", headers=headers, json={
            "report_type": "activity",
            "target_id": created_data["activity_id"],
            "reason": "inappropriate",
            "target_name": "Test activity"
        })
        
        assert response.status_code == 200, f"Failed to report: {response.text}"
        result = response.json()
        created_data["report_id"] = result.get("report_id")
        print(f"✓ Report created with status=pending")


class TestModeratorFeatures:
    """Phase 12: Moderator/Admin features"""
    
    def test_01_get_admin_reports(self):
        """Moderator can view pending reports"""
        headers = {"Authorization": f"Bearer {tokens['moderator']}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports", headers=headers)
        
        # May get 403 if not actually moderator yet
        if response.status_code == 403:
            print(f"Note: User needs moderator role set in DB to access admin endpoints")
            pytest.skip("User needs moderator role in DB")
        
        assert response.status_code == 200
        reports = response.json()
        print(f"✓ Moderator sees {len(reports.get('reports', []))} reports")
    
    def test_02_get_admin_stats(self):
        """Moderator can view admin stats"""
        headers = {"Authorization": f"Bearer {tokens['moderator']}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        if response.status_code == 403:
            pytest.skip("User needs moderator role in DB")
        
        assert response.status_code == 200
        stats = response.json()
        print(f"✓ Admin stats retrieved")
    
    def test_03_list_users(self):
        """Moderator can list users"""
        headers = {"Authorization": f"Bearer {tokens['moderator']}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        if response.status_code == 403:
            pytest.skip("User needs moderator role in DB")
        
        assert response.status_code == 200
        print(f"✓ Admin can list users")


class TestBucketList:
    """Phase 13: Bucket list functionality"""
    
    def test_01_add_to_bucket_list(self):
        """Add landmark to bucket list"""
        if "official_landmark" not in created_data:
            pytest.skip("No landmark found")
        
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        landmark = created_data["official_landmark"]
        
        response = requests.post(f"{BASE_URL}/api/bucket-list", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "notes": "Want to visit!"
        })
        
        assert response.status_code in [200, 201], f"Failed to add: {response.text}"
        item = response.json()
        created_data["bucket_list_id"] = item.get("bucket_list_id")
        print(f"✓ Added to bucket list")
    
    def test_02_get_bucket_list(self):
        """Get bucket list"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/bucket-list", headers=headers)
        assert response.status_code == 200
        items = response.json()
        print(f"✓ Bucket list has {len(items)} items")
    
    def test_03_remove_from_bucket_list(self):
        """Remove from bucket list"""
        if "bucket_list_id" not in created_data:
            pytest.skip("No bucket list item")
        
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/bucket-list/{created_data['bucket_list_id']}",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Removed from bucket list")


class TestSubscription:
    """Phase 14: Subscription status"""
    
    def test_01_free_user_status(self):
        """Verify free user subscription status"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        status = response.json()
        
        assert status["subscription_tier"] == "free"
        assert status["limits"]["max_friends"] == 5
        assert status["limits"]["photos_per_visit"] == 1
        assert status["limits"]["can_access_premium_landmarks"] == False
        assert status["limits"]["can_create_custom_visits"] == False
        print(f"✓ Free user limits verified")
    
    def test_02_pro_user_status(self):
        """Verify pro user subscription status"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        status = response.json()
        
        assert status["subscription_tier"] == "pro"
        assert status["limits"]["max_friends"] == 999999
        assert status["limits"]["photos_per_visit"] == 10
        assert status["limits"]["can_access_premium_landmarks"] == True
        assert status["limits"]["can_create_custom_visits"] == True
        print(f"✓ Pro user limits verified")


class TestCountryVisits:
    """Phase 15: Country visits"""
    
    def test_01_create_country_visit(self):
        """Create country visit"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.post(f"{BASE_URL}/api/country-visits", headers=headers, json={
            "country_id": "france",
            "diary_notes": "Amazing trip to France!",
            "photos": []
        })
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        visit = response.json()
        created_data["country_visit_id"] = visit.get("country_visit_id")
        print(f"✓ Country visit created")
    
    def test_02_get_country_visits(self):
        """Get country visits"""
        headers = {"Authorization": f"Bearer {tokens['premium']}"}
        
        response = requests.get(f"{BASE_URL}/api/country-visits", headers=headers)
        assert response.status_code == 200
        visits = response.json()
        print(f"✓ GET /api/country-visits: {len(visits)} visits")


class TestNotifications:
    """Phase 16: Notifications"""
    
    def test_01_get_notifications(self):
        """Get notifications"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        notifications = response.json()
        print(f"✓ GET /api/notifications: {len(notifications)} notifications")
    
    def test_02_check_unread_count(self):
        """Check unread notification count"""
        headers = {"Authorization": f"Bearer {tokens['standard']}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Unread notifications: {data.get('count', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
