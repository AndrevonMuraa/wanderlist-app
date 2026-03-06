"""
Backend Regression Test Suite for WanderMark - Post-Cleanup Verification
Tests all major API endpoints to verify import cleanup didn't break functionality.

Routes cleaned:
- auth.py: cleaned HTMLResponse, List imports  
- notifications.py: cleaned Request, Response, Cookie, Body, HTMLResponse, List, Optional, os, logging, uuid, datetime, create_notification
- admin.py: cleaned Cookie, Body, HTMLResponse, List, get_current_user, is_user_pro
- collections.py: cleaned Body, logging, is_user_pro
- community.py: cleaned logging, uuid, is_user_pro
- content.py: added back Optional to fix NameError, cleaned logging
- country_visits.py: cleaned logging, check_and_award_badges
- photos.py: cleaned logging, uuid, datetime, timezone
- push.py: cleaned logging, uuid
- reports.py: cleaned logging
- social.py: cleaned Optional, is_user_pro
- achievements.py: added back List to fix NameError, cleaned logging, uuid, datetime
- promo.py: cleaned List, Optional
- utils/db.py: cleaned ssl
"""

import pytest
import requests
import os

# Use public URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://log-removal-pass.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"
TEST_EMAIL_2 = "test2@wandermark.app"
TEST_PASSWORD_2 = "Test1234!"


class TestAuthEndpoints:
    """Tests for auth routes - auth.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """POST /api/auth/login - authentication still works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        # Note: UserPublic model doesn't include email for privacy
        assert "user_id" in data["user"], "No user_id in user response"
        assert "name" in data["user"], "No name in user response"
        print(f"✓ Login successful, user_id: {data['user']['user_id']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - invalid credentials returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "fake@email.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("✓ Invalid login correctly rejected")
    
    def test_get_me_authenticated(self):
        """GET /api/auth/me - returns user profile"""
        # First login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Then get profile
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        # Note: UserPublic model doesn't include email for privacy
        assert "user_id" in data, "No user_id in response"
        assert "name" in data, "No name in response"
        print(f"✓ GET /api/auth/me returned user: {data.get('name', 'Unknown')}")
    
    def test_get_me_unauthenticated(self):
        """GET /api/auth/me - requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401 or response.status_code == 403
        print("✓ GET /api/auth/me correctly requires authentication")


class TestNotificationEndpoints:
    """Tests for notification routes - notifications.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for notification tests")
    
    def test_get_notifications(self):
        """GET /api/notifications - returns notifications list"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected notifications list"
        print(f"✓ GET /api/notifications returned {len(data)} notifications")
    
    def test_get_unread_count(self):
        """GET /api/notifications/unread-count - returns unread count"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread-count")
        
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ GET /api/notifications/unread-count returned {data['unread_count']} unread")


class TestAchievementsEndpoints:
    """Tests for achievements routes - achievements.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for achievements tests")
    
    def test_get_achievements(self):
        """GET /api/achievements - returns achievements list"""
        response = self.session.get(f"{BASE_URL}/api/achievements")
        
        assert response.status_code == 200, f"Get achievements failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected achievements list"
        print(f"✓ GET /api/achievements returned {len(data)} achievements")


class TestFeedEndpoints:
    """Tests for social feed routes - social.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for feed tests")
    
    def test_get_feed(self):
        """GET /api/feed - returns activity feed"""
        response = self.session.get(f"{BASE_URL}/api/feed")
        
        assert response.status_code == 200, f"Get feed failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected feed list"
        print(f"✓ GET /api/feed returned {len(data)} activities")
    
    def test_get_leaderboard(self):
        """GET /api/leaderboard - returns leaderboard (tests timedelta import fix)"""
        response = self.session.get(f"{BASE_URL}/api/leaderboard")
        
        assert response.status_code == 200, f"Get leaderboard failed: {response.text}"
        data = response.json()
        assert "leaderboard" in data
        print(f"✓ GET /api/leaderboard returned {len(data.get('leaderboard', []))} entries")
    
    def test_get_leaderboard_weekly(self):
        """GET /api/leaderboard?time_period=weekly - tests timedelta usage"""
        response = self.session.get(f"{BASE_URL}/api/leaderboard?time_period=weekly")
        
        assert response.status_code == 200, f"Get weekly leaderboard failed: {response.text}"
        data = response.json()
        assert "leaderboard" in data
        print(f"✓ GET /api/leaderboard (weekly) working - tests timedelta import")


class TestContentEndpoints:
    """Tests for content routes - content.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for content tests")
    
    def test_get_countries(self):
        """GET /api/countries - returns countries list (requires auth)"""
        response = self.session.get(f"{BASE_URL}/api/countries")
        
        assert response.status_code == 200, f"Get countries failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected countries list"
        assert len(data) > 0, "Expected at least one country"
        print(f"✓ GET /api/countries returned {len(data)} countries")
    
    def test_get_landmarks(self):
        """GET /api/landmarks - returns landmarks list (requires auth)"""
        response = self.session.get(f"{BASE_URL}/api/landmarks")
        
        assert response.status_code == 200, f"Get landmarks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected landmarks list"
        print(f"✓ GET /api/landmarks returned {len(data)} landmarks")
    
    def test_landmarks_with_filters(self):
        """GET /api/landmarks with filter params - tests Optional import"""
        response = self.session.get(f"{BASE_URL}/api/landmarks?category=official&limit=10")
        
        assert response.status_code == 200, f"Get filtered landmarks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/landmarks (filtered) working - tests Optional import")


class TestCommunityEndpoints:
    """Tests for community routes - community.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for community tests")
    
    def test_get_community_feed(self):
        """GET /api/community-feed - community feed accessible"""
        response = self.session.get(f"{BASE_URL}/api/community-feed")
        
        assert response.status_code == 200, f"Get community feed failed: {response.text}"
        data = response.json()
        assert "items" in data or "count" in data
        print(f"✓ GET /api/community-feed returned {data.get('count', 'N/A')} items")
    
    def test_get_photo_of_the_week(self):
        """GET /api/community-photos/photo-of-the-week - tests timedelta fix in community.py"""
        response = self.session.get(f"{BASE_URL}/api/community-photos/photo-of-the-week")
        
        assert response.status_code == 200, f"Get photo of the week failed: {response.text}"
        data = response.json()
        assert "photo" in data
        print(f"✓ GET /api/community-photos/photo-of-the-week working - tests timedelta import")


class TestReportEndpoints:
    """Tests for report routes - reports.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for report tests")
    
    def test_reports_endpoint_accessible(self):
        """POST /api/reports - report endpoint accessible (validation error expected without proper data)"""
        response = self.session.post(f"{BASE_URL}/api/reports", json={})
        
        # 422 = validation error (endpoint works but needs proper data)
        # 400 = bad request 
        # Both indicate the endpoint is accessible
        assert response.status_code in [400, 422], f"Reports endpoint error: {response.text}"
        print(f"✓ POST /api/reports endpoint accessible (got expected validation error)")


class TestSubscriptionEndpoints:
    """Tests for subscription routes - subscription.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for subscription tests")
    
    def test_subscription_status(self):
        """GET /api/subscription/status - get subscription status"""
        response = self.session.get(f"{BASE_URL}/api/subscription/status")
        
        assert response.status_code == 200, f"Get subscription status failed: {response.text}"
        data = response.json()
        assert "subscription_tier" in data
        assert "is_pro" in data
        print(f"✓ GET /api/subscription/status returned tier: {data.get('subscription_tier')}")


class TestStatsEndpoints:
    """Tests for stats routes - social.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for stats tests")
    
    def test_get_stats(self):
        """GET /api/stats - returns user stats"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert "total_visits" in data
        assert "countries_visited" in data
        print(f"✓ GET /api/stats returned {data.get('total_visits')} visits")
    
    def test_get_progress(self):
        """GET /api/progress - returns progress stats"""
        response = self.session.get(f"{BASE_URL}/api/progress")
        
        assert response.status_code == 200, f"Get progress failed: {response.text}"
        data = response.json()
        assert "overall" in data
        assert "continents" in data
        print(f"✓ GET /api/progress returned overall: {data.get('overall', {}).get('percentage')}%")


class TestVisitsEndpoints:
    """Tests for visits routes - visits.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for visits tests")
    
    def test_get_visits(self):
        """GET /api/visits - returns user visits"""
        response = self.session.get(f"{BASE_URL}/api/visits")
        
        assert response.status_code == 200, f"Get visits failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/visits returned {len(data)} visits")
    
    def test_get_visits_stats(self):
        """GET /api/visits/stats - returns visit stats"""
        response = self.session.get(f"{BASE_URL}/api/visits/stats")
        
        assert response.status_code == 200, f"Get visits stats failed: {response.text}"
        data = response.json()
        assert "monthly_visits" in data
        assert "total_visits" in data
        print(f"✓ GET /api/visits/stats returned {data.get('total_visits')} total visits")


class TestPrivacySettings:
    """Tests for privacy settings route - subscription.py uses these patterns"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for privacy tests")
    
    def test_privacy_endpoint_exists(self):
        """PUT /api/auth/privacy - privacy settings accessible"""
        response = self.session.put(f"{BASE_URL}/api/auth/privacy", json={"privacy": "public"})
        
        # 200 = success, 400/422 = validation error (but endpoint works)
        assert response.status_code in [200, 400, 422], f"Privacy endpoint error: {response.text}"
        print(f"✓ PUT /api/auth/privacy endpoint accessible")


class TestFriendsEndpoints:
    """Tests for friends routes - social.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for friends tests")
    
    def test_get_friends(self):
        """GET /api/friends - returns friends list"""
        response = self.session.get(f"{BASE_URL}/api/friends")
        
        assert response.status_code == 200, f"Get friends failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/friends returned {len(data)} friends")
    
    def test_get_pending_requests(self):
        """GET /api/friends/pending - returns pending requests"""
        response = self.session.get(f"{BASE_URL}/api/friends/pending")
        
        assert response.status_code == 200, f"Get pending requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/friends/pending returned {len(data)} pending requests")


class TestPromoEndpoints:
    """Tests for promo routes - promo.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate for promo tests")
    
    def test_redeem_invalid_code(self):
        """POST /api/promo/redeem - endpoint accessible"""
        response = self.session.post(f"{BASE_URL}/api/promo/redeem", json={"code": "INVALIDCODE123"})
        
        # 404 = code not found (expected)
        # 400 = code invalid
        # Both indicate the endpoint is working
        assert response.status_code in [400, 404], f"Promo redeem endpoint error: {response.text}"
        print(f"✓ POST /api/promo/redeem endpoint accessible (invalid code rejected correctly)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
