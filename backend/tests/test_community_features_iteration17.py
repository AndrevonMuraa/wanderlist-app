"""
Iteration 17: Community Features Testing
Tests for:
- GET /api/community-highlights (global trending landmarks)
- GET /api/community-photos/photo-of-the-week (POTW with fallback)
- GET /api/landmarks/{landmark_id}/community-photos (all photos, diary_locked field)
- GET /api/countries/{country_id}/community-photos (all photos, diary_locked field)
- POST /api/community-photos/{photo_id}/upvote (toggle upvote)
- GET /api/community-feed (community feed items)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test@wandermark.app"
TEST_USER_PASSWORD = "Test1234!"

# Known landmark/country IDs from the request
LANDMARK_IDS = [
    "france_eiffel_tower",
    "france_mont_saint-michel",
    "france_sacré-cœur_basilica"
]
COUNTRY_ID = "france"


class TestAuth:
    """Authentication tests - prerequisite for other tests"""
    
    def test_login_returns_access_token(self):
        """Verify login returns access_token field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"Missing access_token in response: {data}"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestGlobalCommunityHighlights:
    """Tests for GET /api/community-highlights - global trending landmarks"""
    
    def test_community_highlights_returns_200(self, auth_headers):
        """Verify endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/community-highlights", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_community_highlights_structure(self, auth_headers):
        """Verify response has correct structure with highlights array"""
        response = requests.get(f"{BASE_URL}/api/community-highlights", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "highlights" in data, f"Missing 'highlights' key in response: {data}"
        assert isinstance(data["highlights"], list), "highlights should be a list"
    
    def test_community_highlights_fields(self, auth_headers):
        """Verify each highlight has required fields: landmark_name, country_name, sample_photo, visitor_count, total_photos, upvotes"""
        response = requests.get(f"{BASE_URL}/api/community-highlights", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        highlights = data.get("highlights", [])
        if len(highlights) == 0:
            pytest.skip("No highlights available to test field structure")
        
        required_fields = ["landmark_name", "country_name", "sample_photo", "visitor_count", "total_photos", "upvotes"]
        for highlight in highlights:
            for field in required_fields:
                assert field in highlight, f"Missing field '{field}' in highlight: {highlight}"
    
    def test_community_highlights_max_5(self, auth_headers):
        """Verify endpoint returns at most 5 trending landmarks"""
        response = requests.get(f"{BASE_URL}/api/community-highlights", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        highlights = data.get("highlights", [])
        assert len(highlights) <= 5, f"Expected max 5 highlights, got {len(highlights)}"


class TestPhotoOfTheWeek:
    """Tests for GET /api/community-photos/photo-of-the-week"""
    
    def test_potw_returns_200(self, auth_headers):
        """Verify POTW endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_potw_structure(self, auth_headers):
        """Verify POTW response has photo, week, year fields"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "photo" in data, f"Missing 'photo' key in response: {data}"
        assert "week" in data, f"Missing 'week' key in response: {data}"
        assert "year" in data, f"Missing 'year' key in response: {data}"
    
    def test_potw_photo_fields(self, auth_headers):
        """Verify photo object has required fields when present"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        photo = data.get("photo")
        if photo is None:
            pytest.skip("No photo of the week available")
        
        required_fields = ["photo_id", "photo_url", "upvotes", "user_name"]
        for field in required_fields:
            assert field in photo, f"Missing field '{field}' in photo: {photo}"
    
    def test_potw_fallback_works(self, auth_headers):
        """Verify POTW returns something (fallback chain should work)"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Either photo is present or it's null (both are valid)
        assert "photo" in data
        # week and year should always be present
        assert isinstance(data.get("week"), int)
        assert isinstance(data.get("year"), int)


class TestLandmarkCommunityPhotos:
    """Tests for GET /api/landmarks/{landmark_id}/community-photos"""
    
    def test_landmark_photos_returns_200(self, auth_headers):
        """Verify endpoint returns 200 for valid landmark"""
        landmark_id = LANDMARK_IDS[0]  # france_eiffel_tower
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_landmark_photos_structure(self, auth_headers):
        """Verify response has photos array, total_count, is_preview, diary_locked, landmark_id"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["photos", "total_count", "is_preview", "diary_locked", "landmark_id"]
        for field in required_fields:
            assert field in data, f"Missing field '{field}' in response: {data}"
    
    def test_landmark_photos_diary_locked_field(self, auth_headers):
        """Verify diary_locked field is present and boolean"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "diary_locked" in data, f"Missing 'diary_locked' field: {data}"
        assert isinstance(data["diary_locked"], bool), f"diary_locked should be boolean, got {type(data['diary_locked'])}"
    
    def test_landmark_photos_pro_user_diary_unlocked(self, auth_headers):
        """Verify pro user (test@wandermark.app) has diary_locked=false"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Test user has tier 'pro' so diary_locked should be false
        assert data.get("diary_locked") == False, f"Pro user should have diary_locked=false, got {data.get('diary_locked')}"
    
    def test_landmark_photos_is_preview_false(self, auth_headers):
        """Verify is_preview is false (all photos returned, not limited to 3)"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("is_preview") == False, f"is_preview should be false, got {data.get('is_preview')}"
    
    def test_landmark_photos_no_limit(self, auth_headers):
        """Verify photos array length equals total_count (no 3-photo limit)"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        photos = data.get("photos", [])
        total_count = data.get("total_count", 0)
        
        assert len(photos) == total_count, f"Photos length ({len(photos)}) should equal total_count ({total_count})"
    
    def test_landmark_photos_sort_popular(self, auth_headers):
        """Verify sort=popular works"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos?sort=popular", headers=auth_headers)
        assert response.status_code == 200
    
    def test_landmark_photos_sort_newest(self, auth_headers):
        """Verify sort=newest works"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos?sort=newest", headers=auth_headers)
        assert response.status_code == 200
    
    def test_landmark_photos_photo_fields(self, auth_headers):
        """Verify each photo has required fields"""
        landmark_id = LANDMARK_IDS[0]
        response = requests.get(f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        photos = data.get("photos", [])
        if len(photos) == 0:
            pytest.skip("No photos available for this landmark")
        
        required_fields = ["photo_id", "photo_url", "visit_id", "user_id", "user_name", "upvotes", "user_upvoted"]
        for photo in photos[:3]:  # Check first 3
            for field in required_fields:
                assert field in photo, f"Missing field '{field}' in photo: {photo}"


class TestCountryCommunityPhotos:
    """Tests for GET /api/countries/{country_id}/community-photos"""
    
    def test_country_photos_returns_200(self, auth_headers):
        """Verify endpoint returns 200 for valid country"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_country_photos_structure(self, auth_headers):
        """Verify response has photos array, total_count, is_preview, diary_locked, country_id, country_name"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["photos", "total_count", "is_preview", "diary_locked", "country_id", "country_name"]
        for field in required_fields:
            assert field in data, f"Missing field '{field}' in response: {data}"
    
    def test_country_photos_diary_locked_field(self, auth_headers):
        """Verify diary_locked field is present and boolean"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "diary_locked" in data, f"Missing 'diary_locked' field: {data}"
        assert isinstance(data["diary_locked"], bool), f"diary_locked should be boolean, got {type(data['diary_locked'])}"
    
    def test_country_photos_pro_user_diary_unlocked(self, auth_headers):
        """Verify pro user has diary_locked=false"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("diary_locked") == False, f"Pro user should have diary_locked=false, got {data.get('diary_locked')}"
    
    def test_country_photos_is_preview_false(self, auth_headers):
        """Verify is_preview is false (all photos returned)"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("is_preview") == False, f"is_preview should be false, got {data.get('is_preview')}"
    
    def test_country_photos_no_limit(self, auth_headers):
        """Verify photos array length equals total_count (no 3-photo limit)"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        photos = data.get("photos", [])
        total_count = data.get("total_count", 0)
        
        assert len(photos) == total_count, f"Photos length ({len(photos)}) should equal total_count ({total_count})"
    
    def test_country_photos_sort_popular(self, auth_headers):
        """Verify sort=popular works"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos?sort=popular", headers=auth_headers)
        assert response.status_code == 200
    
    def test_country_photos_sort_newest(self, auth_headers):
        """Verify sort=newest works"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos?sort=newest", headers=auth_headers)
        assert response.status_code == 200


class TestUpvoteToggle:
    """Tests for POST /api/community-photos/{photo_id}/upvote"""
    
    def test_upvote_returns_200(self, auth_headers):
        """Verify upvote endpoint returns 200"""
        # Use a test photo_id
        photo_id = "test_visit_0"
        response = requests.post(f"{BASE_URL}/api/community-photos/{photo_id}/upvote", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_upvote_response_structure(self, auth_headers):
        """Verify upvote response has upvoted and upvotes fields"""
        photo_id = "test_upvote_photo_0"
        response = requests.post(f"{BASE_URL}/api/community-photos/{photo_id}/upvote", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "upvoted" in data, f"Missing 'upvoted' field: {data}"
        assert "upvotes" in data, f"Missing 'upvotes' field: {data}"
        assert isinstance(data["upvoted"], bool), f"upvoted should be boolean"
        assert isinstance(data["upvotes"], int), f"upvotes should be integer"
    
    def test_upvote_toggle(self, auth_headers):
        """Verify upvote toggles on/off"""
        photo_id = "test_toggle_photo_0"
        
        # First upvote
        response1 = requests.post(f"{BASE_URL}/api/community-photos/{photo_id}/upvote", headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        first_state = data1.get("upvoted")
        
        # Second upvote (toggle)
        response2 = requests.post(f"{BASE_URL}/api/community-photos/{photo_id}/upvote", headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        second_state = data2.get("upvoted")
        
        # States should be opposite
        assert first_state != second_state, f"Upvote should toggle: first={first_state}, second={second_state}"


class TestCommunityFeed:
    """Tests for GET /api/community-feed"""
    
    def test_community_feed_returns_200(self, auth_headers):
        """Verify community feed returns 200"""
        response = requests.get(f"{BASE_URL}/api/community-feed", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_community_feed_structure(self, auth_headers):
        """Verify response has items array and count"""
        response = requests.get(f"{BASE_URL}/api/community-feed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data, f"Missing 'items' key: {data}"
        assert "count" in data, f"Missing 'count' key: {data}"
        assert isinstance(data["items"], list), "items should be a list"
    
    def test_community_feed_item_fields(self, auth_headers):
        """Verify feed items have required fields"""
        response = requests.get(f"{BASE_URL}/api/community-feed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        items = data.get("items", [])
        if len(items) == 0:
            pytest.skip("No feed items available")
        
        required_fields = ["visit_id", "type", "source", "user_name", "landmark_name"]
        for item in items[:3]:  # Check first 3
            for field in required_fields:
                assert field in item, f"Missing field '{field}' in feed item: {item}"
    
    def test_community_feed_limit_param(self, auth_headers):
        """Verify limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/community-feed?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        items = data.get("items", [])
        assert len(items) <= 5, f"Expected max 5 items with limit=5, got {len(items)}"


class TestAuthRequired:
    """Verify endpoints require authentication"""
    
    def test_community_highlights_requires_auth(self):
        """Verify community-highlights requires auth"""
        response = requests.get(f"{BASE_URL}/api/community-highlights")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_potw_requires_auth(self):
        """Verify photo-of-the-week requires auth"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_landmark_photos_requires_auth(self):
        """Verify landmark community photos requires auth"""
        response = requests.get(f"{BASE_URL}/api/landmarks/{LANDMARK_IDS[0]}/community-photos")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_country_photos_requires_auth(self):
        """Verify country community photos requires auth"""
        response = requests.get(f"{BASE_URL}/api/countries/{COUNTRY_ID}/community-photos")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_upvote_requires_auth(self):
        """Verify upvote requires auth"""
        response = requests.post(f"{BASE_URL}/api/community-photos/test_0/upvote")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_community_feed_requires_auth(self):
        """Verify community feed requires auth"""
        response = requests.get(f"{BASE_URL}/api/community-feed")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
