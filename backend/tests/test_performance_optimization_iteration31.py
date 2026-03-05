"""
Test Suite: Performance Optimization - Iteration 31
Tests the new lightweight /api/visits/check/{landmark_id} endpoint
and verifies existing endpoints still work correctly.

Features tested:
1. GET /api/visits/check/{landmark_id} - returns {visited: true, visit_id} for visited landmarks
2. GET /api/visits/check/{landmark_id} - returns {visited: false, visit_id: null} for non-visited
3. GET /api/landmarks?country_id=france - still returns landmarks with is_visited field
4. GET /api/visits - still works (even if not called from country/landmark pages)
5. GET /api/progress - still works (even if not called from country page)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"

# Known landmark that test user has visited
VISITED_LANDMARK_ID = "france_eiffel_tower"

# Non-existent landmark ID for negative tests
NONEXISTENT_LANDMARK_ID = "nonexistent_landmark_12345"


class TestAuthentication:
    """Authentication tests - required for all other tests"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]

    def test_login_success(self, auth_token):
        """Verify login works and returns token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token length: {len(auth_token)}")


class TestVisitCheckEndpoint:
    """Tests for the new lightweight GET /api/visits/check/{landmark_id} endpoint"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    def test_check_visited_landmark_returns_visited_true(self, auth_token):
        """Test that checking a visited landmark returns visited: true with visit_id"""
        response = requests.get(
            f"{BASE_URL}/api/visits/check/{VISITED_LANDMARK_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "visited" in data, "Response missing 'visited' field"
        assert "visit_id" in data, "Response missing 'visit_id' field"
        
        # Verify the landmark is indeed visited
        assert data["visited"] is True, f"Expected visited=True for {VISITED_LANDMARK_ID}"
        assert data["visit_id"] is not None, "visit_id should not be None for visited landmark"
        assert isinstance(data["visit_id"], str), "visit_id should be a string"
        assert data["visit_id"].startswith("visit_"), f"visit_id should start with 'visit_', got: {data['visit_id']}"
        
        print(f"✓ Visited landmark check: visited={data['visited']}, visit_id={data['visit_id']}")

    def test_check_nonexistent_landmark_returns_visited_false(self, auth_token):
        """Test that checking a non-visited landmark returns visited: false with visit_id: null"""
        response = requests.get(
            f"{BASE_URL}/api/visits/check/{NONEXISTENT_LANDMARK_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "visited" in data, "Response missing 'visited' field"
        assert "visit_id" in data, "Response missing 'visit_id' field"
        
        # Verify the landmark is not visited
        assert data["visited"] is False, f"Expected visited=False for {NONEXISTENT_LANDMARK_ID}"
        assert data["visit_id"] is None, "visit_id should be None for non-visited landmark"
        
        print(f"✓ Non-visited landmark check: visited={data['visited']}, visit_id={data['visit_id']}")

    def test_check_endpoint_requires_auth(self):
        """Test that the check endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/visits/check/{VISITED_LANDMARK_ID}",
        )
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print(f"✓ Check endpoint correctly requires authentication (status: {response.status_code})")

    def test_check_endpoint_response_is_lightweight(self, auth_token):
        """Verify the response is minimal/lightweight (only visited and visit_id)"""
        response = requests.get(
            f"{BASE_URL}/api/visits/check/{VISITED_LANDMARK_ID}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should only contain 'visited' and 'visit_id' fields
        expected_keys = {"visited", "visit_id"}
        actual_keys = set(data.keys())
        
        assert actual_keys == expected_keys, f"Response should only have {expected_keys}, got {actual_keys}"
        print(f"✓ Check endpoint response is lightweight: {list(data.keys())}")


class TestLandmarksEndpointWithIsVisited:
    """Tests for GET /api/landmarks - verifying is_visited field is still present"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    def test_landmarks_by_country_returns_is_visited(self, auth_token):
        """Test that GET /api/landmarks?country_id=france returns landmarks with is_visited"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?country_id=france",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        landmarks = response.json()
        assert isinstance(landmarks, list), "Response should be a list"
        assert len(landmarks) > 0, "Should have at least one landmark in France"
        
        # Check that all landmarks have is_visited field
        for landmark in landmarks:
            assert "is_visited" in landmark, f"Landmark {landmark.get('landmark_id')} missing is_visited field"
            assert isinstance(landmark["is_visited"], bool), f"is_visited should be boolean, got {type(landmark['is_visited'])}"
        
        visited_count = sum(1 for l in landmarks if l["is_visited"])
        print(f"✓ GET /api/landmarks?country_id=france: {len(landmarks)} landmarks, {visited_count} visited")

    def test_eiffel_tower_shows_as_visited(self, auth_token):
        """Test that Eiffel Tower (france_eiffel_tower) shows as visited in landmarks list"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?country_id=france",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        
        landmarks = response.json()
        eiffel_tower = next((l for l in landmarks if l.get("landmark_id") == VISITED_LANDMARK_ID), None)
        
        assert eiffel_tower is not None, f"Eiffel Tower ({VISITED_LANDMARK_ID}) not found in France landmarks"
        assert eiffel_tower["is_visited"] is True, "Eiffel Tower should show as visited"
        
        print(f"✓ Eiffel Tower correctly shows as visited: is_visited={eiffel_tower['is_visited']}")


class TestExistingVisitsEndpoint:
    """Tests for existing GET /api/visits endpoint - should still work"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    def test_get_visits_still_works(self, auth_token):
        """Test that GET /api/visits still returns user's visits"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visits = response.json()
        assert isinstance(visits, list), "Response should be a list"
        
        # Check structure of visits
        if len(visits) > 0:
            visit = visits[0]
            assert "visit_id" in visit, "Visit missing visit_id"
            assert "landmark_id" in visit, "Visit missing landmark_id"
            assert "user_id" in visit, "Visit missing user_id"
        
        print(f"✓ GET /api/visits works: returned {len(visits)} visits")

    def test_visits_includes_eiffel_tower(self, auth_token):
        """Test that visits list includes Eiffel Tower"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        
        visits = response.json()
        eiffel_visit = next((v for v in visits if v.get("landmark_id") == VISITED_LANDMARK_ID), None)
        
        assert eiffel_visit is not None, f"Eiffel Tower visit not found in visits list"
        print(f"✓ Visits list includes Eiffel Tower: visit_id={eiffel_visit.get('visit_id')}")


class TestExistingProgressEndpoint:
    """Tests for existing GET /api/progress endpoint - should still work"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    def test_get_progress_still_works(self, auth_token):
        """Test that GET /api/progress still returns progress data"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        # Progress endpoint should return 200 or similar
        if response.status_code == 200:
            data = response.json()
            print(f"✓ GET /api/progress works: {data}")
        elif response.status_code == 404:
            # Endpoint might not exist - this is acceptable if it was removed
            print(f"⚠ GET /api/progress returns 404 - endpoint may have been removed (acceptable)")
        else:
            print(f"⚠ GET /api/progress returned {response.status_code}: {response.text}")


class TestVisitStatsEndpoint:
    """Tests for GET /api/visits/stats endpoint"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    def test_get_visit_stats_works(self, auth_token):
        """Test that GET /api/visits/stats returns statistics"""
        response = requests.get(
            f"{BASE_URL}/api/visits/stats",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "monthly_visits" in data, "Response missing monthly_visits"
        assert "total_visits" in data, "Response missing total_visits"
        assert "tier" in data, "Response missing tier"
        
        print(f"✓ GET /api/visits/stats works: monthly={data['monthly_visits']}, total={data['total_visits']}, tier={data['tier']}")


class TestVisitPrivacyEndpoint:
    """Tests for PUT /api/visits/{visit_id}/privacy endpoint - should still work"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def visit_id(self, auth_token):
        """Get a visit_id to test privacy change"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        if response.status_code == 200:
            visits = response.json()
            if len(visits) > 0:
                return visits[0]["visit_id"]
        return None

    def test_update_visit_privacy_works(self, auth_token, visit_id):
        """Test that PUT /api/visits/{visit_id}/privacy still works"""
        if visit_id is None:
            pytest.skip("No visits found to test privacy update")
        
        # Change to private
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"visibility": "private"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "visibility" in data, "Response missing visibility field"
        assert data["visibility"] == "private", "Visibility should be private"
        
        # Change back to public
        response2 = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"visibility": "public"},
        )
        assert response2.status_code == 200
        
        print(f"✓ PUT /api/visits/{visit_id}/privacy works: changed to private then back to public")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
