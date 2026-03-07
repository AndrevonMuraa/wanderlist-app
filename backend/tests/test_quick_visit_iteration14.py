"""
Test Quick Visit Feature - Iteration 14
Tests for the new Quick Visit camera-first visit recording feature.

Features tested:
- POST /api/visits creates a visit with photos, diary_notes, share_diary, visibility fields
- GET /api/landmarks returns landmarks list with landmark_id, name, is_locked fields
- POST /api/auth/login works and returns access_token
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wandermark-admin.preview.emergentagent.com").rstrip("/")

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication endpoint tests"""

    def test_login_returns_access_token(self):
        """POST /api/auth/login returns access_token field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token field"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLandmarksEndpoint:
    """GET /api/landmarks endpoint tests"""

    def test_get_landmarks_returns_list(self, auth_headers):
        """GET /api/landmarks returns a list of landmarks"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get landmarks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one landmark"

    def test_landmarks_have_required_fields(self, auth_headers):
        """Landmarks have landmark_id, name, is_locked fields"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        landmarks = response.json()
        
        for landmark in landmarks:
            assert "landmark_id" in landmark, f"Missing landmark_id: {landmark}"
            assert "name" in landmark, f"Missing name: {landmark}"
            # is_locked is computed by backend based on subscription
            assert "is_locked" in landmark, f"Missing is_locked field: {landmark}"

    def test_get_landmarks_by_country(self, auth_headers):
        """GET /api/landmarks with country_id filter works"""
        # First get countries to find a valid country_id
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        countries = response.json()
        assert len(countries) > 0, "Should have countries"
        
        # Get landmarks for first country
        country_id = countries[0]["country_id"]
        response = requests.get(
            f"{BASE_URL}/api/landmarks?country_id={country_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get landmarks by country failed: {response.text}"
        landmarks = response.json()
        # All returned landmarks should be from this country
        for lm in landmarks:
            assert lm.get("country_id") == country_id or "country" in lm.get("country_name", "").lower()


class TestVisitsEndpoint:
    """POST /api/visits endpoint tests for Quick Visit"""

    def test_create_visit_with_photo(self, auth_headers):
        """POST /api/visits creates a visit with photo"""
        # First get an unvisited landmark
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=false&limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        landmarks = response.json()
        
        if not landmarks:
            pytest.skip("No unvisited landmarks available for testing")
        
        # Find an unlocked landmark
        test_landmark = None
        for lm in landmarks:
            if not lm.get("is_locked"):
                test_landmark = lm
                break
        
        if not test_landmark:
            pytest.skip("No unlocked unvisited landmarks available")
        
        landmark_id = test_landmark["landmark_id"]
        
        # Create a visit with photo (using minimal base64 placeholder)
        # In real Quick Visit, this would be camera photo
        test_photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="  # Minimal valid-ish base64
        
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            json={
                "landmark_id": landmark_id,
                "photos": [test_photo],
                "diary_notes": "Quick visit test - iteration 14",
                "share_diary": True,
                "visibility": "public"
            }
        )
        
        # Accept 201 or 200 for create
        assert response.status_code in [200, 201], f"Create visit failed: {response.text}"
        data = response.json()
        
        # Verify response has expected fields
        assert "visit_id" in data, "Missing visit_id in response"
        assert data.get("landmark_id") == landmark_id
        assert data.get("points_earned") is not None
        
        # Cleanup - delete the test visit
        visit_id = data["visit_id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Delete visit failed: {delete_response.text}"

    def test_create_visit_accepts_share_diary_field(self, auth_headers):
        """POST /api/visits accepts share_diary field"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=false&limit=5",
            headers=auth_headers
        )
        landmarks = response.json()
        
        unlocked = [lm for lm in landmarks if not lm.get("is_locked")]
        if not unlocked:
            pytest.skip("No unlocked unvisited landmarks")
        
        landmark_id = unlocked[0]["landmark_id"]
        
        # Create visit with share_diary=False
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            json={
                "landmark_id": landmark_id,
                "photos": [],
                "diary_notes": "Private diary test",
                "share_diary": False,  # Key field being tested
                "visibility": "private"
            }
        )
        
        assert response.status_code in [200, 201], f"Create visit failed: {response.text}"
        data = response.json()
        visit_id = data["visit_id"]
        
        # Verify share_diary was saved
        get_response = requests.get(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        visit_data = get_response.json()
        assert visit_data.get("share_diary") == False, "share_diary should be False"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/visits/{visit_id}", headers=auth_headers)

    def test_create_visit_accepts_visibility_field(self, auth_headers):
        """POST /api/visits accepts visibility field (public/friends/private)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=false&limit=5",
            headers=auth_headers
        )
        landmarks = response.json()
        
        unlocked = [lm for lm in landmarks if not lm.get("is_locked")]
        if not unlocked:
            pytest.skip("No unlocked unvisited landmarks")
        
        landmark_id = unlocked[0]["landmark_id"]
        
        # Test with 'friends' visibility
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            json={
                "landmark_id": landmark_id,
                "photos": [],
                "diary_notes": "",
                "share_diary": True,
                "visibility": "friends"  # Testing visibility field
            }
        )
        
        assert response.status_code in [200, 201], f"Create visit failed: {response.text}"
        data = response.json()
        visit_id = data["visit_id"]
        
        # Verify visibility was saved
        get_response = requests.get(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        visit_data = get_response.json()
        assert visit_data.get("visibility") == "friends", "visibility should be 'friends'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/visits/{visit_id}", headers=auth_headers)


class TestVisitsList:
    """GET /api/visits/list endpoint tests"""

    def test_visits_list_works(self, auth_headers):
        """GET /api/visits/list returns list without _id"""
        response = requests.get(
            f"{BASE_URL}/api/visits/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get visits list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Check no _id leaks
        for visit in data:
            assert "_id" not in visit, f"MongoDB _id leaked in visits list: {visit}"


class TestIntegrationQuickVisitFlow:
    """End-to-end Quick Visit flow test"""

    def test_quick_visit_full_flow(self, auth_headers):
        """
        Simulates the Quick Visit flow:
        1. Get landmarks for a country
        2. Create visit with photo
        3. Verify visit is recorded
        4. Cleanup
        """
        # Step 1: Get landmarks (simulating what QuickVisitButton does)
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        landmarks = response.json()
        
        # Filter to unlocked, unvisited
        available = [lm for lm in landmarks if not lm.get("is_locked") and not lm.get("is_visited")]
        
        if not available:
            pytest.skip("No available landmarks for Quick Visit test")
        
        target_landmark = available[0]
        landmark_id = target_landmark["landmark_id"]
        landmark_name = target_landmark["name"]
        
        # Step 2: Create visit (simulating QuickVisitButton.submitVisit)
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            json={
                "landmark_id": landmark_id,
                "photos": ["data:image/jpeg;base64,/9j/4AAQSkZJRg=="],  # Simulated camera photo
                "diary_notes": "",  # Quick Visit has no diary by default
                "share_diary": True,
                "visibility": "public"  # Uses user's default
            }
        )
        
        assert response.status_code in [200, 201], f"Quick visit create failed: {response.text}"
        data = response.json()
        visit_id = data["visit_id"]
        points_earned = data.get("points_earned", 0)
        
        # Step 3: Verify visit is in list
        response = requests.get(
            f"{BASE_URL}/api/visits/check/{landmark_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        check_data = response.json()
        assert check_data.get("visited") == True, "Landmark should be marked as visited"
        
        # Step 4: Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        print(f"✓ Quick Visit flow completed for '{landmark_name}' (+{points_earned} pts)")
