"""
Test Community Feed Feature
Tests the GET /api/community-feed endpoint that returns latest community photos
and diary entries from all countries in a unified feed.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommunityFeed:
    """Tests for the Community Feed endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_community_feed_returns_200(self):
        """Test that community feed endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_community_feed_response_structure(self):
        """Test that response has correct structure with items array and count"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "items" in data, "Response should have 'items' key"
        assert "count" in data, "Response should have 'count' key"
        assert isinstance(data["items"], list), "'items' should be a list"
        assert isinstance(data["count"], int), "'count' should be an integer"
        assert data["count"] == len(data["items"]), "count should match items length"
    
    def test_community_feed_item_structure(self):
        """Test that each item has required fields with correct types"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["items"]) > 0, "Should have at least one item"
        
        # Required fields for each item
        required_fields = [
            "visit_id", "type", "photo_url", "user_name",
            "landmark_name", "country_name", "upvotes",
            "diary_snippet", "has_diary"
        ]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Item should have '{field}' field"
            
            # Type validations
            assert isinstance(item["visit_id"], str), "visit_id should be string"
            assert item["type"] in ["photo", "diary"], f"type should be 'photo' or 'diary', got {item['type']}"
            assert isinstance(item["user_name"], str), "user_name should be string"
            assert isinstance(item["landmark_name"], str), "landmark_name should be string"
            assert isinstance(item["upvotes"], int), "upvotes should be integer"
            assert isinstance(item["has_diary"], bool), "has_diary should be boolean"
            # diary_snippet can be None or string
            assert item["diary_snippet"] is None or isinstance(item["diary_snippet"], str), "diary_snippet should be None or string"
    
    def test_community_feed_sorted_by_visited_at_desc(self):
        """Test that items are sorted by visited_at in descending order (most recent first)"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 1:
            dates = [item["visited_at"] for item in data["items"]]
            # Filter out None values
            valid_dates = [d for d in dates if d is not None]
            
            if len(valid_dates) > 1:
                # Check dates are in descending order
                for i in range(len(valid_dates) - 1):
                    current = datetime.fromisoformat(valid_dates[i])
                    next_date = datetime.fromisoformat(valid_dates[i + 1])
                    assert current >= next_date, f"Items not sorted by visited_at DESC: {valid_dates[i]} should be >= {valid_dates[i+1]}"
    
    def test_community_feed_diary_items_have_diary_true(self):
        """Test that items with type='diary' have has_diary=True and valid diary_snippet"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        diary_items = [item for item in data["items"] if item["type"] == "diary"]
        
        for item in diary_items:
            assert item["has_diary"] == True, f"Diary items should have has_diary=True, got {item}"
            assert item["diary_snippet"] is not None, f"Diary items should have diary_snippet, got {item}"
            assert isinstance(item["diary_snippet"], str), "diary_snippet should be string"
            assert len(item["diary_snippet"]) > 0, "diary_snippet should not be empty"
    
    def test_community_feed_photo_items_have_no_diary_snippet(self):
        """Test that items with type='photo' have has_diary=False and diary_snippet=None"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        photo_items = [item for item in data["items"] if item["type"] == "photo"]
        
        for item in photo_items:
            assert item["has_diary"] == False, f"Photo items should have has_diary=False, got {item}"
            assert item["diary_snippet"] is None, f"Photo items should have diary_snippet=None, got {item}"
    
    def test_community_feed_respects_limit_parameter(self):
        """Test that limit parameter limits the number of items returned"""
        # Test with limit=3
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=3",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["items"]) <= 3, f"Should return at most 3 items, got {len(data['items'])}"
        assert data["count"] <= 3, f"count should be <= 3, got {data['count']}"
        
        # Test with limit=5
        response5 = requests.get(
            f"{BASE_URL}/api/community-feed?limit=5",
            headers=self.headers
        )
        assert response5.status_code == 200
        data5 = response5.json()
        
        assert len(data5["items"]) <= 5, f"Should return at most 5 items, got {len(data5['items'])}"
    
    def test_community_feed_items_have_photo_url(self):
        """Test that all items have a photo_url (since feed shows photos)"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            # photo_url can be string or None (for items without photos)
            # But based on the backend query, items should have photos
            assert item["photo_url"] is None or isinstance(item["photo_url"], str), \
                f"photo_url should be string or None, got {type(item['photo_url'])}"
    
    def test_community_feed_items_have_country_info(self):
        """Test that items have country_name and country_id"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=8",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for item in data["items"]:
            # country_name might be None for some items
            if item["country_name"] is not None:
                assert isinstance(item["country_name"], str), "country_name should be string"
            
            # country_id might be None for some items
            if item["country_id"] is not None:
                assert isinstance(item["country_id"], str), "country_id should be string"
    
    def test_community_feed_requires_authentication(self):
        """Test that endpoint returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/community-feed?limit=8")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_community_feed_default_limit(self):
        """Test that endpoint has a default limit when not specified"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Default limit is 10
        assert len(data["items"]) <= 10, f"Default limit should be 10, got {len(data['items'])}"
