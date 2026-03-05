"""
WanderMark Backend API Regression Tests
Tests all endpoints after backend refactoring from monolithic to modular structure

Test User: test@wandermark.app / Test1234!
API URL: https://query-boost-2.preview.emergentagent.com
"""

import pytest
import requests
import os

BASE_URL = "https://query-boost-2.preview.emergentagent.com"


# ============= FIXTURES =============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for test user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@wandermark.app",
        "password": "Test1234!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ============= AUTH ROUTES TESTS =============

class TestAuthRoutes:
    """Tests for /api/auth/* endpoints"""
    
    def test_login_success(self, api_client):
        """POST /api/auth/login - Login with test credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "testuser"
    
    def test_login_invalid_credentials(self, api_client):
        """POST /api/auth/login - Reject invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "WrongPassword!"
        })
        assert response.status_code == 401
    
    def test_register_duplicate_email(self, api_client):
        """POST /api/auth/register - Reject duplicate email"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@wandermark.app",  # Already exists
            "username": "newuser123",
            "name": "New User",
            "password": "Test1234!"
        })
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower()
    
    def test_get_current_user(self, authenticated_client):
        """GET /api/auth/me - Get current user profile"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["username"] == "testuser"
        assert "subscription_tier" in data
    
    def test_get_me_without_auth(self, api_client):
        """GET /api/auth/me - Should fail without auth"""
        # Use a fresh session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


# ============= CONTENT ROUTES TESTS =============

class TestContentRoutes:
    """Tests for countries and landmarks endpoints"""
    
    def test_get_continent_stats(self, authenticated_client):
        """GET /api/continent-stats - Get continent statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/continent-stats")
        assert response.status_code == 200
        data = response.json()
        assert "continents" in data
        assert "grand_total" in data
        assert len(data["continents"]) > 0
        # Verify continent structure
        continent = data["continents"][0]
        assert "continent" in continent
        assert "total_landmarks" in continent
        assert "total_points" in continent
    
    def test_get_countries(self, authenticated_client):
        """GET /api/countries - Get all countries (should return 66)"""
        response = authenticated_client.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 66, f"Expected 66 countries, got {len(data)}"
        # Verify country structure
        country = data[0]
        assert "country_id" in country
        assert "name" in country
        assert "continent" in country
    
    def test_get_landmarks_by_country(self, authenticated_client):
        """GET /api/landmarks?country_id=france - Get landmarks for a country"""
        response = authenticated_client.get(f"{BASE_URL}/api/landmarks", params={"country_id": "france"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify all landmarks belong to France
        for landmark in data:
            assert landmark["country_id"] == "france"
    
    def test_get_single_landmark(self, authenticated_client):
        """GET /api/landmarks/{landmark_id} - Get single landmark"""
        # First get a landmark ID from France
        landmarks_response = authenticated_client.get(f"{BASE_URL}/api/landmarks", params={"country_id": "france"})
        landmarks = landmarks_response.json()
        landmark_id = landmarks[0]["landmark_id"]
        
        response = authenticated_client.get(f"{BASE_URL}/api/landmarks/{landmark_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["landmark_id"] == landmark_id
        assert "name" in data
        assert "country_name" in data
    
    def test_get_landmark_not_found(self, authenticated_client):
        """GET /api/landmarks/{landmark_id} - 404 for non-existent landmark"""
        response = authenticated_client.get(f"{BASE_URL}/api/landmarks/nonexistent_landmark_123")
        assert response.status_code == 404


# ============= COMMUNITY ROUTES TESTS =============

class TestCommunityRoutes:
    """Tests for community endpoints"""
    
    def test_get_community_feed(self, authenticated_client):
        """GET /api/community-feed?limit=5 - Get community feed"""
        response = authenticated_client.get(f"{BASE_URL}/api/community-feed", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "count" in data
        assert data["count"] <= 5
    
    def test_get_photo_of_the_week(self, authenticated_client):
        """GET /api/community-photos/photo-of-the-week - Get photo of the week"""
        response = authenticated_client.get(f"{BASE_URL}/api/community-photos/photo-of-the-week")
        assert response.status_code == 200
        data = response.json()
        assert "photo" in data
        # Photo can be null if no upvotes exist
    
    def test_get_landmark_community_photos(self, authenticated_client):
        """GET /api/landmarks/{landmark_id}/community-photos - Get landmark community photos"""
        # Get a landmark first
        landmarks = authenticated_client.get(f"{BASE_URL}/api/landmarks", params={"country_id": "france"}).json()
        landmark_id = landmarks[0]["landmark_id"]
        
        response = authenticated_client.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos")
        assert response.status_code == 200
        data = response.json()
        assert "photos" in data
        assert "total_count" in data
        assert "is_preview" in data
        assert "landmark_id" in data
    
    def test_get_country_community_photos(self, authenticated_client):
        """GET /api/countries/{country_id}/community-photos - Get country community photos"""
        response = authenticated_client.get(f"{BASE_URL}/api/countries/france/community-photos")
        assert response.status_code == 200
        data = response.json()
        assert "photos" in data
        assert "total_count" in data
        assert "country_id" in data
        assert data["country_id"] == "france"
    
    def test_get_travel_diaries(self, authenticated_client):
        """GET /api/countries/{country_id}/travel-diaries - Get travel diaries"""
        response = authenticated_client.get(f"{BASE_URL}/api/countries/france/travel-diaries")
        assert response.status_code == 200
        data = response.json()
        assert "diaries" in data
        assert "total_count" in data
        assert "country_name" in data
    
    def test_get_community_highlights(self, authenticated_client):
        """GET /api/countries/{country_id}/community-highlights - Get community highlights"""
        response = authenticated_client.get(f"{BASE_URL}/api/countries/france/community-highlights")
        assert response.status_code == 200
        data = response.json()
        assert "highlights" in data


# ============= VISITS ROUTES TESTS =============

class TestVisitsRoutes:
    """Tests for visits endpoints"""
    
    def test_get_visits(self, authenticated_client):
        """GET /api/visits - Get user visits"""
        response = authenticated_client.get(f"{BASE_URL}/api/visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_visit_stats(self, authenticated_client):
        """GET /api/visits/stats - Get visit statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/visits/stats")
        assert response.status_code == 200
        data = response.json()
        assert "monthly_visits" in data
        assert "total_visits" in data
        assert "tier" in data


# ============= SOCIAL ROUTES TESTS =============

class TestSocialRoutes:
    """Tests for social/leaderboard endpoints"""
    
    def test_get_leaderboard(self, authenticated_client):
        """GET /api/leaderboard?scope=global&period=all_time - Get leaderboard"""
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard", params={
            "time_period": "all_time",
            "category": "points"
        })
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
    
    def test_get_friends(self, authenticated_client):
        """GET /api/friends - Get friends list"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_stats(self, authenticated_client):
        """GET /api/stats - Get user stats"""
        response = authenticated_client.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_visits" in data
        assert "countries_visited" in data
        assert "points" in data
    
    def test_get_progress(self, authenticated_client):
        """GET /api/progress - Get progress stats"""
        response = authenticated_client.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 200
        data = response.json()
        assert "overall" in data
        assert "continents" in data
        assert "countries" in data
    
    def test_get_activity_feed(self, authenticated_client):
        """GET /api/feed - Get activity feed"""
        response = authenticated_client.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============= COLLECTIONS ROUTES TESTS =============

class TestCollectionsRoutes:
    """Tests for bucket list and collections endpoints"""
    
    def test_get_bucket_list(self, authenticated_client):
        """GET /api/bucket-list - Get bucket list"""
        response = authenticated_client.get(f"{BASE_URL}/api/bucket-list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_collections(self, authenticated_client):
        """GET /api/collections - Get collections"""
        response = authenticated_client.get(f"{BASE_URL}/api/collections")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============= NOTIFICATIONS ROUTES TESTS =============

class TestNotificationsRoutes:
    """Tests for notifications endpoints"""
    
    def test_get_notifications(self, authenticated_client):
        """GET /api/notifications - Get notifications"""
        response = authenticated_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_unread_count(self, authenticated_client):
        """GET /api/notifications/unread-count - Get unread count"""
        response = authenticated_client.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)


# ============= ACHIEVEMENTS ROUTES TESTS =============

class TestAchievementsRoutes:
    """Tests for achievements endpoints"""
    
    def test_get_achievements(self, authenticated_client):
        """GET /api/achievements - Get achievements"""
        response = authenticated_client.get(f"{BASE_URL}/api/achievements")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============= SUBSCRIPTION ROUTES TESTS =============

class TestSubscriptionRoutes:
    """Tests for subscription endpoints"""
    
    def test_get_subscription_status(self, authenticated_client):
        """GET /api/subscription/status - Get subscription status"""
        response = authenticated_client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200
        data = response.json()
        assert "subscription_tier" in data
        assert "is_pro" in data
        assert "limits" in data


# ============= REPORTS ROUTES TESTS =============

class TestReportsRoutes:
    """Tests for reports endpoints"""
    
    def test_get_my_reports(self, authenticated_client):
        """GET /api/reports/my-reports - Get user reports"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/my-reports")
        assert response.status_code == 200
        data = response.json()
        assert "reports" in data


# ============= PUSH ROUTES TESTS =============

class TestPushRoutes:
    """Tests for push notification endpoints"""
    
    def test_get_push_settings(self, authenticated_client):
        """GET /api/push-settings - Get push settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/push-settings")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "likes_enabled" in data


# ============= LEGAL ROUTES TESTS (No Auth Required) =============

class TestLegalRoutes:
    """Tests for legal pages (no auth required)"""
    
    def test_get_privacy_page(self):
        """GET /api/legal/privacy - Get privacy page (no auth needed)"""
        response = requests.get(f"{BASE_URL}/api/legal/privacy")
        assert response.status_code == 200
        assert "Privacy Policy" in response.text
    
    def test_get_terms_page(self):
        """GET /api/legal/terms - Get terms page (no auth needed)"""
        response = requests.get(f"{BASE_URL}/api/legal/terms")
        assert response.status_code == 200
        assert "Terms" in response.text


# ============= RUN INFO =============
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
