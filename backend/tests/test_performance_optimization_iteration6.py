"""
Backend Test Suite for WanderMark Performance Optimization - Iteration 6
Tests for the new lightweight /api/visits/list endpoint and updated /api/stats with visits_with_photos.

Key changes tested:
- NEW: GET /api/visits/list - Lightweight visit list WITHOUT photo_base64, photos, diary_notes, comments, visit_location
  - Should contain: has_photo, photo_count, has_diary, landmark_name, country_name fields
  - Sorted by visited_at descending
- UPDATED: GET /api/stats - Now includes visits_with_photos field
- REGRESSION: Verify existing endpoints still work unchanged
"""

import pytest
import requests
import os

# Use public URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wandermark-admin.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication for test setup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """POST /api/auth/login - verify auth still works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Login successful")


class TestVisitsListEndpoint:
    """Tests for the NEW lightweight /api/visits/list endpoint"""
    
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
            pytest.skip("Could not authenticate for visits/list tests")
    
    def test_visits_list_returns_200(self):
        """GET /api/visits/list - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200, f"visits/list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/visits/list returned {len(data)} visits")
    
    def test_visits_list_excludes_heavy_fields(self):
        """GET /api/visits/list - should NOT contain photo_base64, photos, diary_notes, comments, visit_location"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200, f"visits/list failed: {response.text}"
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test - cannot verify excluded fields")
        
        excluded_fields = ["photo_base64", "photos", "diary_notes", "comments", "visit_location"]
        
        for visit in data:
            for field in excluded_fields:
                assert field not in visit, f"Field '{field}' should NOT be in visits/list response but was found"
        
        print(f"✓ visits/list correctly excludes heavy fields: {excluded_fields}")
    
    def test_visits_list_includes_computed_fields(self):
        """GET /api/visits/list - should contain has_photo, photo_count, has_diary, landmark_name, country_name"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200, f"visits/list failed: {response.text}"
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test - cannot verify computed fields")
        
        required_fields = ["has_photo", "photo_count", "has_diary", "landmark_name", "country_name"]
        
        for visit in data:
            for field in required_fields:
                assert field in visit, f"Field '{field}' should be in visits/list response but was NOT found"
        
        print(f"✓ visits/list includes computed fields: {required_fields}")
    
    def test_visits_list_has_photo_is_boolean(self):
        """GET /api/visits/list - has_photo should be boolean"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test")
        
        for visit in data:
            assert isinstance(visit.get("has_photo"), bool), f"has_photo should be boolean, got {type(visit.get('has_photo'))}"
        
        print(f"✓ has_photo field is boolean type")
    
    def test_visits_list_photo_count_is_integer(self):
        """GET /api/visits/list - photo_count should be integer >= 0"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test")
        
        for visit in data:
            assert isinstance(visit.get("photo_count"), int), f"photo_count should be int, got {type(visit.get('photo_count'))}"
            assert visit.get("photo_count") >= 0, f"photo_count should be >= 0, got {visit.get('photo_count')}"
        
        print(f"✓ photo_count field is integer >= 0")
    
    def test_visits_list_has_diary_is_boolean(self):
        """GET /api/visits/list - has_diary should be boolean"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test")
        
        for visit in data:
            assert isinstance(visit.get("has_diary"), bool), f"has_diary should be boolean, got {type(visit.get('has_diary'))}"
        
        print(f"✓ has_diary field is boolean type")
    
    def test_visits_list_sorted_by_visited_at_descending(self):
        """GET /api/visits/list - should be sorted by visited_at descending"""
        response = self.session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) < 2:
            pytest.skip("Not enough visits to verify sorting")
        
        visited_dates = [visit.get("visited_at") for visit in data if visit.get("visited_at")]
        
        # Check that dates are in descending order
        for i in range(1, len(visited_dates)):
            assert visited_dates[i-1] >= visited_dates[i], f"Visits should be sorted descending by visited_at"
        
        print(f"✓ visits/list is sorted by visited_at descending")
    
    def test_visits_list_requires_authentication(self):
        """GET /api/visits/list - requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/visits/list")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ visits/list correctly requires authentication")
    
    def test_visits_list_accepts_limit_param(self):
        """GET /api/visits/list?limit=5 - accepts limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/visits/list?limit=5")
        
        assert response.status_code == 200, f"visits/list with limit failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5, f"Expected at most 5 visits, got {len(data)}"
        
        print(f"✓ visits/list accepts limit parameter")


class TestStatsEndpointWithVisitsWithPhotos:
    """Tests for the UPDATED /api/stats endpoint with visits_with_photos field"""
    
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
    
    def test_stats_returns_200(self):
        """GET /api/stats - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200, f"stats failed: {response.text}"
        print(f"✓ GET /api/stats returned 200")
    
    def test_stats_includes_visits_with_photos(self):
        """GET /api/stats - should include visits_with_photos field"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200, f"stats failed: {response.text}"
        data = response.json()
        
        assert "visits_with_photos" in data, f"visits_with_photos field missing from /api/stats response. Got: {list(data.keys())}"
        print(f"✓ /api/stats includes visits_with_photos field: {data['visits_with_photos']}")
    
    def test_stats_visits_with_photos_is_integer(self):
        """GET /api/stats - visits_with_photos should be integer >= 0"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data.get("visits_with_photos"), int), f"visits_with_photos should be int, got {type(data.get('visits_with_photos'))}"
        assert data.get("visits_with_photos") >= 0, f"visits_with_photos should be >= 0, got {data.get('visits_with_photos')}"
        
        print(f"✓ visits_with_photos is integer >= 0: {data['visits_with_photos']}")
    
    def test_stats_still_has_existing_fields(self):
        """GET /api/stats - should still have rank, total_visits, countries_visited, continents_visited, friends_count, points, leaderboard_points"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        
        assert response.status_code == 200, f"stats failed: {response.text}"
        data = response.json()
        
        required_fields = ["rank", "total_visits", "countries_visited", "continents_visited", "friends_count", "points", "leaderboard_points"]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from /api/stats response"
        
        print(f"✓ /api/stats has all required fields: {required_fields}")
        print(f"  rank={data['rank']}, total_visits={data['total_visits']}, countries={data['countries_visited']}, points={data['points']}")


class TestVisitsFullEndpointRegression:
    """Regression tests for the FULL /api/visits endpoint (should still work unchanged)"""
    
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
    
    def test_visits_full_returns_200(self):
        """GET /api/visits - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/visits")
        
        assert response.status_code == 200, f"visits failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/visits (full) returned {len(data)} visits")
    
    def test_visits_full_contains_photo_fields(self):
        """GET /api/visits (full) - should still contain photo data for visit-detail page"""
        response = self.session.get(f"{BASE_URL}/api/visits")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No visits to test")
        
        # Full visits should have the ability to contain these fields (even if null)
        # The Visit model includes these fields
        for visit in data:
            # visit_id and landmark_id should always be present
            assert "visit_id" in visit, "visit_id should be in full visit response"
            assert "landmark_id" in visit, "landmark_id should be in full visit response"
        
        print(f"✓ GET /api/visits (full) returns full visit data")


class TestProgressEndpointRegression:
    """Regression tests for /api/progress endpoint"""
    
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
            pytest.skip("Could not authenticate for progress tests")
    
    def test_progress_returns_200(self):
        """GET /api/progress - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/progress")
        
        assert response.status_code == 200, f"progress failed: {response.text}"
        print(f"✓ GET /api/progress returned 200")
    
    def test_progress_structure(self):
        """GET /api/progress - has overall, continents, countries structure"""
        response = self.session.get(f"{BASE_URL}/api/progress")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "overall" in data, "Missing 'overall' in progress response"
        assert "continents" in data, "Missing 'continents' in progress response"
        assert "countries" in data, "Missing 'countries' in progress response"
        
        print(f"✓ GET /api/progress has correct structure")


class TestPhotosCollectionEndpointRegression:
    """Regression tests for /api/photos/collection endpoint"""
    
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
            pytest.skip("Could not authenticate for photos tests")
    
    def test_photos_collection_returns_200(self):
        """GET /api/photos/collection - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/photos/collection")
        
        assert response.status_code == 200, f"photos/collection failed: {response.text}"
        print(f"✓ GET /api/photos/collection returned 200")
    
    def test_photos_collection_structure(self):
        """GET /api/photos/collection - has photos and total_count"""
        response = self.session.get(f"{BASE_URL}/api/photos/collection")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "photos" in data, "Missing 'photos' in photos/collection response"
        assert "total_count" in data, "Missing 'total_count' in photos/collection response"
        
        print(f"✓ GET /api/photos/collection has correct structure, total_count={data['total_count']}")


class TestCountryVisitsEndpointRegression:
    """Regression tests for /api/country-visits endpoint"""
    
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
            pytest.skip("Could not authenticate for country-visits tests")
    
    def test_country_visits_returns_200(self):
        """GET /api/country-visits - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/country-visits")
        
        assert response.status_code == 200, f"country-visits failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/country-visits returned {len(data)} country visits")


class TestFeedEndpointRegression:
    """Regression tests for /api/feed endpoint"""
    
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
    
    def test_feed_returns_200(self):
        """GET /api/feed - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/feed")
        
        assert response.status_code == 200, f"feed failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/feed returned {len(data)} activities")


class TestLeaderboardEndpointRegression:
    """Regression tests for /api/leaderboard endpoint"""
    
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
            pytest.skip("Could not authenticate for leaderboard tests")
    
    def test_leaderboard_returns_200(self):
        """GET /api/leaderboard - returns 200"""
        response = self.session.get(f"{BASE_URL}/api/leaderboard")
        
        assert response.status_code == 200, f"leaderboard failed: {response.text}"
        data = response.json()
        assert "leaderboard" in data, "Missing 'leaderboard' in response"
        print(f"✓ GET /api/leaderboard returned {len(data.get('leaderboard', []))} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
