"""
Test Sort/Filter functionality for community photos and Travel Diaries feature
Tests the new enhancements:
1. Sort community photos by 'popular' (upvotes) vs 'newest' (visited_at)
2. Travel Diaries endpoint with freemium model
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"

# Test data
LANDMARK_ID = "france_eiffel_tower"
COUNTRY_ID = "france"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLandmarkCommunityPhotosSorting:
    """Test sort parameter for GET /api/landmarks/{id}/community-photos"""
    
    def test_landmark_photos_sort_popular(self, auth_headers):
        """Test sorting by popular (upvotes descending)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos?sort=popular",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "photos" in data
        assert "total_count" in data
        assert "is_preview" in data
        assert "landmark_id" in data
        
        # Verify photos are sorted by upvotes descending
        photos = data["photos"]
        if len(photos) > 1:
            for i in range(len(photos) - 1):
                # Popular sort: higher upvotes first
                assert photos[i]["upvotes"] >= photos[i + 1]["upvotes"], \
                    f"Photos not sorted by upvotes descending at index {i}"
    
    def test_landmark_photos_sort_newest(self, auth_headers):
        """Test sorting by newest (visited_at descending)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos?sort=newest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        photos = data["photos"]
        if len(photos) > 1:
            for i in range(len(photos) - 1):
                date_i = photos[i].get("visited_at", "")
                date_next = photos[i + 1].get("visited_at", "")
                if date_i and date_next:
                    # Newest sort: more recent dates first
                    assert date_i >= date_next, \
                        f"Photos not sorted by date descending at index {i}: {date_i} < {date_next}"
    
    def test_landmark_photos_default_sort_is_popular(self, auth_headers):
        """Test default sort is popular"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should behave same as sort=popular
        photos = data["photos"]
        if len(photos) > 1:
            for i in range(len(photos) - 1):
                assert photos[i]["upvotes"] >= photos[i + 1]["upvotes"]
    
    def test_landmark_photos_response_fields(self, auth_headers):
        """Verify photo objects have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos?sort=popular",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            photo = data["photos"][0]
            required_fields = ["photo_id", "photo_url", "user_name", "upvotes", "user_upvoted"]
            for field in required_fields:
                assert field in photo, f"Missing field: {field}"


class TestCountryCommunityPhotosSorting:
    """Test sort parameter for GET /api/countries/{id}/community-photos"""
    
    def test_country_photos_sort_popular(self, auth_headers):
        """Test sorting by popular (upvotes descending)"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos?sort=popular",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        assert "photos" in data
        assert "total_count" in data
        assert "country_name" in data
        
        photos = data["photos"]
        if len(photos) > 1:
            for i in range(len(photos) - 1):
                assert photos[i]["upvotes"] >= photos[i + 1]["upvotes"], \
                    f"Photos not sorted by upvotes descending at index {i}"
    
    def test_country_photos_sort_newest(self, auth_headers):
        """Test sorting by newest (visited_at descending)"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos?sort=newest",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        photos = data["photos"]
        if len(photos) > 1:
            for i in range(len(photos) - 1):
                date_i = photos[i].get("visited_at", "")
                date_next = photos[i + 1].get("visited_at", "")
                if date_i and date_next:
                    assert date_i >= date_next, \
                        f"Photos not sorted by date descending at index {i}"
    
    def test_country_photos_response_includes_landmark_name(self, auth_headers):
        """Country photos should include landmark_name"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos?sort=popular",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            photo = data["photos"][0]
            assert "landmark_name" in photo, "Missing landmark_name in country photo"


class TestTravelDiariesEndpoint:
    """Test GET /api/countries/{id}/travel-diaries"""
    
    def test_travel_diaries_returns_correct_structure(self, auth_headers):
        """Test diaries response structure"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "diaries" in data
        assert "total_count" in data
        assert "is_preview" in data
        assert "country_name" in data
    
    def test_travel_diaries_entry_structure(self, auth_headers):
        """Verify diary entries have correct fields"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["diaries"]:
            diary = data["diaries"][0]
            # Required fields per requirement
            required_fields = ["visit_id", "diary_notes", "landmark_name", "user_name", "visited_at"]
            for field in required_fields:
                assert field in diary, f"Missing required field: {field}"
            
            # Optional but expected fields
            optional_fields = ["photo_url", "user_picture", "username", "landmark_id"]
            for field in optional_fields:
                assert field in diary, f"Missing optional field: {field}"
    
    def test_free_user_gets_preview_limit(self, auth_headers):
        """Free users should only get 2 diary entries (preview)"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Test user is free tier, so should be preview mode
        if data["total_count"] > 2:
            assert data["is_preview"] == True, "Free user should get is_preview=True"
            assert len(data["diaries"]) == 2, f"Free user should get max 2 diaries, got {len(data['diaries'])}"
        else:
            # If total is 2 or less, all diaries are shown
            assert len(data["diaries"]) <= 2
    
    def test_travel_diaries_only_shared_diaries(self, auth_headers):
        """Should only return diaries where share_diary=true"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned diaries should have diary_notes (non-empty)
        for diary in data["diaries"]:
            assert diary.get("diary_notes"), f"Diary should have notes: {diary}"
    
    def test_travel_diaries_requires_auth(self):
        """Endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries"
        )
        assert response.status_code == 401, "Should require authentication"


class TestPremiumUserAccessDiaries:
    """Test premium user access to full diaries - skipped if user is free tier"""
    
    def test_premium_user_gets_all_diaries(self, auth_headers):
        """Premium users should get all diaries with is_preview=False"""
        # First check current user's subscription
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        if response.status_code == 200:
            user = response.json()
            if user.get("subscription_tier") != "pro":
                pytest.skip("Test user is not premium - skipping premium test")
        
        response = requests.get(
            f"{BASE_URL}/api/countries/{COUNTRY_ID}/travel-diaries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Premium user should get is_preview=False
        assert data["is_preview"] == False, "Premium user should get is_preview=False"
        # And all diaries
        assert len(data["diaries"]) == data["total_count"]


class TestPhotoUpvotesSorting:
    """Test that sort affects photo ordering correctly"""
    
    def test_popular_sort_uses_upvotes(self, auth_headers):
        """Verify popular sort orders by upvotes"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos?sort=popular",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        photos = data["photos"]
        upvotes = [p["upvotes"] for p in photos]
        
        # Verify descending order
        assert upvotes == sorted(upvotes, reverse=True), "Upvotes should be in descending order"
    
    def test_newest_sort_uses_date(self, auth_headers):
        """Verify newest sort orders by visited_at"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{LANDMARK_ID}/community-photos?sort=newest",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        photos = data["photos"]
        dates = [p.get("visited_at", "") for p in photos if p.get("visited_at")]
        
        if dates:
            # Verify descending order (newest first)
            assert dates == sorted(dates, reverse=True), "Dates should be in descending order"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
