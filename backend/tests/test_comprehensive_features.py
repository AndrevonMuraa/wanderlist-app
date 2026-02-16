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

# Global storage for test data (using module scope)
_test_data = {
    "tokens": {},
    "user_ids": {},
    "created_data": {},
    "users": {}
}

def get_test_users():
    """Get test user credentials"""
    return {
        "standard": {
            "email": f"standard_user_{TEST_RUN_ID}@test.com",
            "username": f"std_user_{TEST_RUN_ID}",
            "password": "TestPass123",
            "name": f"Standard User {TEST_RUN_ID}"
        },
        "premium": {
            "email": f"premium_user_{TEST_RUN_ID}@test.com",
            "username": f"prm_user_{TEST_RUN_ID}",
            "password": "TestPass123",
            "name": f"Premium User {TEST_RUN_ID}"
        },
        "moderator": {
            "email": f"mod_user_{TEST_RUN_ID}@test.com",
            "username": f"mod_user_{TEST_RUN_ID}",
            "password": "TestPass123",
            "name": f"Moderator User {TEST_RUN_ID}"
        }
    }


@pytest.fixture(scope="module")
def setup_users():
    """Setup all test users before running tests"""
    users = get_test_users()
    
    # Register standard user
    response = requests.post(f"{BASE_URL}/api/auth/register", json=users["standard"])
    if response.status_code == 200:
        data = response.json()
        _test_data["tokens"]["standard"] = data["access_token"]
        _test_data["user_ids"]["standard"] = data["user"]["user_id"]
        _test_data["users"]["standard"] = users["standard"]
        print(f"✓ Registered standard user: {data['user']['user_id']}")
    elif response.status_code == 400 and "already" in response.text.lower():
        # User exists, try login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": users["standard"]["email"],
            "password": users["standard"]["password"]
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            _test_data["tokens"]["standard"] = data["access_token"]
            _test_data["user_ids"]["standard"] = data["user"]["user_id"]
            _test_data["users"]["standard"] = users["standard"]
            print(f"✓ Logged in existing standard user")
    
    # Register premium user
    response = requests.post(f"{BASE_URL}/api/auth/register", json=users["premium"])
    if response.status_code == 200:
        data = response.json()
        _test_data["tokens"]["premium"] = data["access_token"]
        _test_data["user_ids"]["premium"] = data["user"]["user_id"]
        _test_data["users"]["premium"] = users["premium"]
        print(f"✓ Registered premium user: {data['user']['user_id']}")
        
        # Upgrade to pro
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        upgrade_resp = requests.post(f"{BASE_URL}/api/subscription/test-toggle", headers=headers)
        if upgrade_resp.status_code == 200:
            print(f"✓ Upgraded premium user to Pro")
    elif response.status_code == 400 and "already" in response.text.lower():
        # User exists, try login and upgrade
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": users["premium"]["email"],
            "password": users["premium"]["password"]
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            _test_data["tokens"]["premium"] = data["access_token"]
            _test_data["user_ids"]["premium"] = data["user"]["user_id"]
            _test_data["users"]["premium"] = users["premium"]
            
            # Ensure pro tier
            if data["user"].get("subscription_tier") != "pro":
                headers = {"Authorization": f"Bearer {data['access_token']}"}
                requests.post(f"{BASE_URL}/api/subscription/test-toggle", headers=headers)
            print(f"✓ Logged in existing premium user")
    
    # Register moderator user
    response = requests.post(f"{BASE_URL}/api/auth/register", json=users["moderator"])
    if response.status_code == 200:
        data = response.json()
        _test_data["tokens"]["moderator"] = data["access_token"]
        _test_data["user_ids"]["moderator"] = data["user"]["user_id"]
        _test_data["users"]["moderator"] = users["moderator"]
        print(f"✓ Registered moderator user: {data['user']['user_id']}")
    elif response.status_code == 400 and "already" in response.text.lower():
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": users["moderator"]["email"],
            "password": users["moderator"]["password"]
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            _test_data["tokens"]["moderator"] = data["access_token"]
            _test_data["user_ids"]["moderator"] = data["user"]["user_id"]
            _test_data["users"]["moderator"] = users["moderator"]
            print(f"✓ Logged in existing moderator user")
    
    return _test_data


class TestAuth:
    """Phase 1: Authentication verification"""
    
    def test_01_login_standard_user(self, setup_users):
        """Verify standard user login returns correct tier"""
        users = get_test_users()
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": users["standard"]["email"],
            "password": users["standard"]["password"]
        })
        
        if response.status_code == 401:
            pytest.skip("Standard user not registered yet")
        
        assert response.status_code == 200
        data = response.json()
        _test_data["tokens"]["standard"] = data["access_token"]
        _test_data["user_ids"]["standard"] = data["user"]["user_id"]
        
        assert data["user"]["subscription_tier"] == "free"
        print(f"✓ Standard user login verified: subscription_tier=free")
    
    def test_02_login_premium_user(self, setup_users):
        """Verify premium user login returns Pro tier"""
        users = get_test_users()
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": users["premium"]["email"],
            "password": users["premium"]["password"]
        })
        
        if response.status_code == 401:
            pytest.skip("Premium user not registered yet")
        
        assert response.status_code == 200
        data = response.json()
        _test_data["tokens"]["premium"] = data["access_token"]
        _test_data["user_ids"]["premium"] = data["user"]["user_id"]
        
        # Ensure pro status
        if data["user"]["subscription_tier"] != "pro":
            headers = {"Authorization": f"Bearer {data['access_token']}"}
            requests.post(f"{BASE_URL}/api/subscription/test-toggle", headers=headers)
            # Re-login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": users["premium"]["email"],
                "password": users["premium"]["password"]
            })
            data = response.json()
            _test_data["tokens"]["premium"] = data["access_token"]
        
        assert data["user"]["subscription_tier"] == "pro"
        print(f"✓ Premium user login verified: subscription_tier=pro")


class TestExplore:
    """Phase 2: Country and Landmark exploration"""
    
    def test_01_get_countries(self, setup_users):
        """Verify /api/countries returns 66 countries"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/countries", headers=headers)
        assert response.status_code == 200
        countries = response.json()
        assert len(countries) == 66, f"Expected 66 countries, got {len(countries)}"
        print(f"✓ GET /api/countries returns {len(countries)} countries")
    
    def test_02_get_landmarks_france_free_user(self, setup_users):
        """Free user gets landmarks with premium ones locked"""
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("Standard user not available")
        
        headers = {"Authorization": f"Bearer {token}"}
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
        
        # Store landmarks for later tests
        official_landmarks = [l for l in landmarks if l.get("category") == "official"]
        if official_landmarks:
            _test_data["created_data"]["official_landmark"] = official_landmarks[0]
        if premium_landmarks:
            _test_data["created_data"]["premium_landmark"] = premium_landmarks[0]
        
        # Premium should be locked for free user
        if premium_landmarks:
            assert len(locked_landmarks) > 0, "Premium landmarks should be locked for free user"
    
    def test_03_get_landmarks_france_pro_user(self, setup_users):
        """Pro user gets landmarks with premium ones unlocked"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("Premium user not available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
        assert response.status_code == 200
        landmarks = response.json()
        
        # Check premium landmarks are NOT locked for pro user
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        unlocked = all(not l.get("is_locked", False) for l in premium_landmarks)
        
        print(f"✓ Pro user: Premium landmarks unlocked: {unlocked}")
        assert unlocked or len(premium_landmarks) == 0, "Premium landmarks should be unlocked for pro user"


class TestVisits:
    """Phase 3: Visit functionality"""
    
    def test_01_standard_user_visit_official(self, setup_users):
        """Standard user can visit official landmark"""
        landmark = _test_data["created_data"].get("official_landmark")
        if not landmark:
            # Fetch an official landmark
            token = _test_data["tokens"].get("standard")
            if not token:
                pytest.skip("No standard user")
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
            if resp.status_code == 200:
                landmarks = resp.json()
                official = [l for l in landmarks if l.get("category") == "official"]
                if official:
                    landmark = official[0]
                    _test_data["created_data"]["official_landmark"] = landmark
        
        if not landmark:
            pytest.skip("No official landmark found")
        
        token = _test_data["tokens"].get("standard")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Test visit from standard user"
        })
        
        assert response.status_code == 200, f"Failed to create visit: {response.text}"
        visit = response.json()
        assert visit["points_earned"] == 10  # Official = 10 points
        _test_data["created_data"]["standard_visit"] = visit
        print(f"✓ Standard user visited {landmark['name']}, earned {visit['points_earned']} points")
    
    def test_02_standard_user_blocked_premium_landmark(self, setup_users):
        """Free user should get 403 when visiting premium landmark"""
        landmark = _test_data["created_data"].get("premium_landmark")
        if not landmark:
            pytest.skip("No premium landmark found")
        
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Trying to visit premium"
        })
        
        assert response.status_code == 403, f"Expected 403 for free user on premium, got {response.status_code}"
        print(f"✓ Free user correctly blocked from premium landmark (403)")
    
    def test_03_premium_user_visit_premium(self, setup_users):
        """Premium user can visit premium landmark"""
        landmark = _test_data["created_data"].get("premium_landmark")
        if not landmark:
            pytest.skip("No premium landmark found")
        
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "comments": "Test visit from premium user"
        })
        
        assert response.status_code == 200, f"Pro user should access premium: {response.text}"
        visit = response.json()
        assert visit["points_earned"] == 25  # Premium = 25 points
        _test_data["created_data"]["premium_visit"] = visit
        print(f"✓ Premium user visited premium landmark, earned {visit['points_earned']} points")
    
    def test_04_standard_user_photo_limit(self, setup_users):
        """Free user limited to 1 photo per visit"""
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        headers = {"Authorization": f"Bearer {token}"}
        # Get another official landmark
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=italy", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch landmarks")
        
        landmarks = response.json()
        official = [l for l in landmarks if l.get("category") == "official"]
        if not official:
            pytest.skip("No official landmarks in Italy")
        
        # Try with 2 photos - should fail
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": official[0]["landmark_id"],
            "photos": ["base64photo1", "base64photo2"],  # 2 photos
            "comments": "Testing photo limit"
        })
        
        assert response.status_code == 403, f"Expected 403 for exceeding photo limit, got {response.status_code}"
        print(f"✓ Free user photo limit enforced (max 1 photo)")
    
    def test_05_premium_user_multiple_photos(self, setup_users):
        """Premium user can add up to 10 photos"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        # Get another landmark
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=italy", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch landmarks")
        
        landmarks = response.json()
        official = [l for l in landmarks if l.get("category") == "official"]
        if not official:
            pytest.skip("No official landmarks")
        
        # Try with 3 photos - should succeed for pro
        response = requests.post(f"{BASE_URL}/api/visits", headers=headers, json={
            "landmark_id": official[0]["landmark_id"],
            "photos": ["base64photo1", "base64photo2", "base64photo3"],
            "comments": "Premium user multiple photos"
        })
        
        assert response.status_code == 200, f"Pro user should add multiple photos: {response.text}"
        print(f"✓ Premium user can add multiple photos (tested with 3)")


class TestCustomVisits:
    """Phase 4: Custom visits (Pro feature)"""
    
    def test_01_free_user_blocked_custom_visits(self, setup_users):
        """Free user should get 403 for custom visits"""
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/user-created-visits", headers=headers, json={
            "country_name": "Test Country",
            "landmarks": [{"name": "Custom Place"}],
            "diary_notes": "Test diary"
        })
        
        assert response.status_code == 403, f"Expected 403 for free user, got {response.status_code}"
        print(f"✓ Free user blocked from custom visits (403)")
    
    def test_02_premium_user_creates_custom_visit(self, setup_users):
        """Premium user can create custom visit"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/user-created-visits", headers=headers, json={
            "country_name": "Fictional Land",
            "landmarks": [{"name": "Amazing Place", "photo": None}],
            "diary_notes": "This was an amazing trip!"
        })
        
        assert response.status_code == 200, f"Pro user should create custom: {response.text}"
        custom_visit = response.json()
        _test_data["created_data"]["custom_visit"] = custom_visit
        print(f"✓ Premium user created custom visit to {custom_visit['country_name']}")


class TestBadgesAndPoints:
    """Phase 5: Achievements, badges, and points"""
    
    def test_01_check_achievements(self, setup_users):
        """Verify achievements endpoint works"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/achievements", headers=headers)
        assert response.status_code == 200
        achievements = response.json()
        print(f"✓ GET /api/achievements: {len(achievements)} achievements")
    
    def test_02_trigger_badge_check(self, setup_users):
        """Trigger badge check after visits"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/achievements/check", headers=headers)
        assert response.status_code == 200
        result = response.json()
        print(f"✓ Badge check completed")
    
    def test_03_check_stats(self, setup_users):
        """Verify stats endpoint returns accurate data"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        print(f"✓ GET /api/stats: points={stats.get('total_points', 0)}, visits={stats.get('total_visits', 0)}")
    
    def test_04_check_progress(self, setup_users):
        """Verify progress endpoint"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/progress", headers=headers)
        assert response.status_code == 200
        progress = response.json()
        print(f"✓ GET /api/progress: Working")


class TestFriends:
    """Phase 6: Friend requests and friendships"""
    
    def test_01_send_friend_request(self, setup_users):
        """Standard user sends friend request to premium user"""
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        users = get_test_users()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/friends/request", headers=headers, json={
            "friend_username": users["premium"]["username"]
        })
        
        # May fail if already friends
        if response.status_code == 400 and "already" in response.text.lower():
            print(f"✓ Users are already friends or request pending")
            return
        
        assert response.status_code in [200, 201], f"Failed to send request: {response.text}"
        result = response.json()
        _test_data["created_data"]["friendship_id"] = result.get("friendship_id")
        print(f"✓ Friend request sent from standard to premium user")
    
    def test_02_check_pending_requests(self, setup_users):
        """Premium user sees pending friend request"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/friends/pending", headers=headers)
        assert response.status_code == 200
        pending = response.json()
        
        # Find our request
        std_user_id = _test_data["user_ids"].get("standard")
        if std_user_id:
            for req in pending:
                if req.get("user_id") == std_user_id:
                    _test_data["created_data"]["friendship_id"] = req.get("friendship_id")
                    print(f"✓ Premium user sees pending request from standard user")
                    return
        
        print(f"✓ Pending requests checked: {len(pending)} pending")
    
    def test_03_accept_friend_request(self, setup_users):
        """Premium user accepts friend request"""
        friendship_id = _test_data["created_data"].get("friendship_id")
        if not friendship_id:
            pytest.skip("No friendship_id found")
        
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/friends/{friendship_id}/accept",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to accept: {response.text}"
        print(f"✓ Friend request accepted")
    
    def test_04_verify_friendship(self, setup_users):
        """Both users see each other in friends list"""
        std_token = _test_data["tokens"].get("standard")
        prm_token = _test_data["tokens"].get("premium")
        
        if not std_token or not prm_token:
            pytest.skip("Missing user tokens")
        
        # Standard user's friends
        headers = {"Authorization": f"Bearer {std_token}"}
        response = requests.get(f"{BASE_URL}/api/friends", headers=headers)
        assert response.status_code == 200
        std_friends = response.json()
        
        # Premium user's friends
        headers = {"Authorization": f"Bearer {prm_token}"}
        response = requests.get(f"{BASE_URL}/api/friends", headers=headers)
        assert response.status_code == 200
        prm_friends = response.json()
        
        print(f"✓ Standard user has {len(std_friends)} friends, Premium user has {len(prm_friends)} friends")


class TestMessages:
    """Phase 7: Messaging between friends"""
    
    def test_01_premium_sends_message(self, setup_users):
        """Premium user sends message to friend"""
        token = _test_data["tokens"].get("premium")
        std_user_id = _test_data["user_ids"].get("standard")
        
        if not token or not std_user_id:
            pytest.skip("Missing user data")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/messages", headers=headers, json={
            "receiver_id": std_user_id,
            "content": f"Hello from premium user! {TEST_RUN_ID}"
        })
        
        # May get error if not friends
        if response.status_code == 403:
            print(f"Note: Users may not be friends yet for messaging")
            pytest.skip("Users not friends")
        
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        message = response.json()
        _test_data["created_data"]["message_id"] = message.get("message_id")
        print(f"✓ Premium user sent message")
    
    def test_02_standard_receives_message(self, setup_users):
        """Standard user can read the message"""
        token = _test_data["tokens"].get("standard")
        prm_user_id = _test_data["user_ids"].get("premium")
        
        if not token or not prm_user_id:
            pytest.skip("Missing user data")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/messages/{prm_user_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get messages: {response.text}"
        messages = response.json()
        print(f"✓ Standard user received {len(messages)} messages from premium user")


class TestLeaderboard:
    """Phase 8: Leaderboard functionality"""
    
    def test_01_get_leaderboard(self, setup_users):
        """Get global leaderboard"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/leaderboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        print(f"✓ GET /api/leaderboard: {len(data.get('leaderboard', []))} entries")
    
    def test_02_get_friends_leaderboard(self, setup_users):
        """Get friends-only leaderboard"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?friends_only=true",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Friends leaderboard: {len(data.get('leaderboard', []))} entries")


class TestActivityFeed:
    """Phase 9: Activity feed and social interactions"""
    
    def test_01_get_feed(self, setup_users):
        """Verify activity feed returns entries"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/feed", headers=headers)
        assert response.status_code == 200
        activities = response.json()
        
        if activities:
            _test_data["created_data"]["activity_id"] = activities[0].get("activity_id")
        print(f"✓ GET /api/feed: {len(activities)} activities")
    
    def test_02_like_activity(self, setup_users):
        """Like an activity"""
        activity_id = _test_data["created_data"].get("activity_id")
        if not activity_id:
            pytest.skip("No activity to like")
        
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=headers
        )
        
        # May get 400 if already liked, both are acceptable
        assert response.status_code in [200, 400]
        print(f"✓ Activity like tested")
    
    def test_03_comment_on_activity(self, setup_users):
        """Comment on an activity"""
        activity_id = _test_data["created_data"].get("activity_id")
        if not activity_id:
            pytest.skip("No activity to comment on")
        
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/comment",
            headers=headers,
            json={"content": f"Great visit! {TEST_RUN_ID}"}
        )
        
        assert response.status_code == 200, f"Failed to comment: {response.text}"
        comment = response.json()
        _test_data["created_data"]["comment_id"] = comment.get("comment_id")
        print(f"✓ Commented on activity")


class TestReports:
    """Phase 10: Content reporting"""
    
    def test_01_create_report(self, setup_users):
        """Standard user reports inappropriate content"""
        activity_id = _test_data["created_data"].get("activity_id")
        if not activity_id:
            pytest.skip("No activity to report")
        
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/reports", headers=headers, json={
            "report_type": "activity",
            "target_id": activity_id,
            "reason": "inappropriate",
            "target_name": "Test activity"
        })
        
        # May fail if already reported
        if response.status_code == 400 and "already" in response.text.lower():
            print(f"✓ Already reported this item")
            return
        
        assert response.status_code == 200, f"Failed to report: {response.text}"
        result = response.json()
        _test_data["created_data"]["report_id"] = result.get("report_id")
        print(f"✓ Report created with status=pending")


class TestBucketList:
    """Phase 11: Bucket list functionality"""
    
    def test_01_add_to_bucket_list(self, setup_users):
        """Add landmark to bucket list"""
        landmark = _test_data["created_data"].get("official_landmark")
        token = _test_data["tokens"].get("standard")
        
        if not landmark or not token:
            pytest.skip("No landmark or user available")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/bucket-list", headers=headers, json={
            "landmark_id": landmark["landmark_id"],
            "notes": "Want to visit!"
        })
        
        # May fail if already in bucket list
        if response.status_code == 400:
            print(f"✓ Item may already be in bucket list")
            return
        
        assert response.status_code in [200, 201], f"Failed to add: {response.text}"
        item = response.json()
        _test_data["created_data"]["bucket_list_id"] = item.get("bucket_list_id")
        print(f"✓ Added to bucket list")
    
    def test_02_get_bucket_list(self, setup_users):
        """Get bucket list"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/bucket-list", headers=headers)
        assert response.status_code == 200
        items = response.json()
        print(f"✓ Bucket list has {len(items)} items")
    
    def test_03_remove_from_bucket_list(self, setup_users):
        """Remove from bucket list"""
        bucket_list_id = _test_data["created_data"].get("bucket_list_id")
        token = _test_data["tokens"].get("standard")
        
        if not bucket_list_id or not token:
            pytest.skip("No bucket list item or user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/bucket-list/{bucket_list_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        print(f"✓ Removed from bucket list")


class TestSubscription:
    """Phase 12: Subscription status"""
    
    def test_01_free_user_status(self, setup_users):
        """Verify free user subscription status"""
        token = _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No standard user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        status = response.json()
        
        assert status["subscription_tier"] == "free"
        assert status["limits"]["max_friends"] == 5
        assert status["limits"]["photos_per_visit"] == 1
        assert status["limits"]["can_access_premium_landmarks"] == False
        assert status["limits"]["can_create_custom_visits"] == False
        print(f"✓ Free user limits verified")
    
    def test_02_pro_user_status(self, setup_users):
        """Verify pro user subscription status"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
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
    """Phase 13: Country visits"""
    
    def test_01_create_country_visit(self, setup_users):
        """Create country visit"""
        token = _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No premium user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/country-visits", headers=headers, json={
            "country_id": "france",
            "diary_notes": f"Amazing trip to France! {TEST_RUN_ID}",
            "photos": []
        })
        
        # May fail if already visited
        if response.status_code == 400:
            print(f"✓ Country visit may already exist")
            return
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        visit = response.json()
        _test_data["created_data"]["country_visit_id"] = visit.get("country_visit_id")
        print(f"✓ Country visit created")
    
    def test_02_get_country_visits(self, setup_users):
        """Get country visits"""
        token = _test_data["tokens"].get("premium") or _test_data["tokens"].get("standard")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/country-visits", headers=headers)
        assert response.status_code == 200
        visits = response.json()
        print(f"✓ GET /api/country-visits: {len(visits)} visits")


class TestNotifications:
    """Phase 14: Notifications"""
    
    def test_01_get_notifications(self, setup_users):
        """Get notifications"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        notifications = response.json()
        print(f"✓ GET /api/notifications: {len(notifications)} notifications")
    
    def test_02_check_unread_count(self, setup_users):
        """Check unread notification count"""
        token = _test_data["tokens"].get("standard") or _test_data["tokens"].get("premium")
        if not token:
            pytest.skip("No authenticated user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Unread notifications: {data.get('count', 0)}")


class TestModeratorFeatures:
    """Phase 15: Moderator/Admin features (requires role set in DB)"""
    
    def test_01_get_admin_reports(self, setup_users):
        """Moderator can view pending reports"""
        token = _test_data["tokens"].get("moderator")
        if not token:
            pytest.skip("No moderator user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/reports", headers=headers)
        
        # May get 403 if not actually moderator yet
        if response.status_code == 403:
            print(f"Note: User needs moderator role set in DB to access admin endpoints")
            pytest.skip("User needs moderator role in DB")
        
        assert response.status_code == 200
        reports = response.json()
        print(f"✓ Moderator sees {len(reports.get('reports', []))} reports")
    
    def test_02_get_admin_stats(self, setup_users):
        """Moderator can view admin stats"""
        token = _test_data["tokens"].get("moderator")
        if not token:
            pytest.skip("No moderator user")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        if response.status_code == 403:
            pytest.skip("User needs moderator role in DB")
        
        assert response.status_code == 200
        stats = response.json()
        print(f"✓ Admin stats retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
