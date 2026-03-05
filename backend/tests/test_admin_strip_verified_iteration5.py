"""
Iteration 5: Admin Strip-Verified Endpoint & Regression Tests
Tests for:
- PUT /api/admin/users/{user_id}/strip-verified (new endpoint)
- Auth/permissions: admin required, 401 without auth, 403 for non-admin
- 404 for non-existent user
- Message when user has no verified visits
- Regression tests for existing endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@wandermark.app"
ADMIN_PASSWORD = "Test1234!"
REGULAR_EMAIL = "test2@wandermark.app"
REGULAR_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication tests for getting tokens"""
    
    def test_admin_login(self):
        """Test admin user can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Admin login successful")
        return data["access_token"]
    
    def test_regular_user_login(self):
        """Test regular user can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_EMAIL,
            "password": REGULAR_PASSWORD
        })
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Regular user login successful")
        return data["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def regular_user_token():
    """Get regular user auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": REGULAR_EMAIL,
        "password": REGULAR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Regular user login failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def regular_headers(regular_user_token):
    """Headers with regular user auth"""
    return {"Authorization": f"Bearer {regular_user_token}"}


@pytest.fixture(scope="module")
def target_user_id(admin_headers):
    """Get target user (test2) user_id for strip-verified tests"""
    response = requests.get(
        f"{BASE_URL}/api/admin/users",
        params={"search": REGULAR_EMAIL},
        headers=admin_headers
    )
    if response.status_code != 200:
        pytest.skip(f"Could not get user list: {response.text}")
    data = response.json()
    users = data.get("users", [])
    for user in users:
        if user.get("email") == REGULAR_EMAIL:
            return user.get("user_id")
    pytest.skip("Regular user not found in admin users list")


# ============= ADMIN STRIP-VERIFIED ENDPOINT TESTS =============

class TestAdminStripVerifiedAuth:
    """Test auth/permissions for strip-verified endpoint"""
    
    def test_strip_verified_requires_auth(self):
        """Test 401 returned when no auth token provided"""
        response = requests.put(f"{BASE_URL}/api/admin/users/some_user_id/strip-verified")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Strip-verified returns 401 without auth")
    
    def test_strip_verified_requires_admin(self, regular_headers, target_user_id):
        """Test 403 returned for non-admin user"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user_id}/strip-verified",
            headers=regular_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Strip-verified returns 403 for non-admin")


class TestAdminStripVerifiedFunctionality:
    """Test strip-verified endpoint functionality"""
    
    def test_strip_verified_404_nonexistent_user(self, admin_headers):
        """Test 404 returned for non-existent user"""
        fake_user_id = "nonexistent_user_12345"
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{fake_user_id}/strip-verified",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower() or "User not found" in data.get("detail", "")
        print("✓ Strip-verified returns 404 for non-existent user")
    
    def test_strip_verified_message_no_verified_visits(self, admin_headers, target_user_id):
        """Test returns message when user has no verified visits"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user_id}/strip-verified",
            headers=admin_headers
        )
        # Should return 200 with message about no verified visits OR strip successfully
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "No message field in response"
        # Either "no verified visits" or "stripped X visits"
        message_lower = data["message"].lower()
        assert "no verified" in message_lower or "stripped" in message_lower, f"Unexpected message: {data['message']}"
        print(f"✓ Strip-verified response: {data['message']}")
    
    def test_strip_verified_response_structure(self, admin_headers, target_user_id):
        """Test response has correct structure"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user_id}/strip-verified",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Response should have message and visits_stripped
        assert "message" in data
        assert "visits_stripped" in data
        assert isinstance(data["visits_stripped"], int)
        print(f"✓ Strip-verified response structure valid: visits_stripped={data['visits_stripped']}")


# ============= REGRESSION TESTS =============

class TestRegressionStats:
    """Regression tests for /api/stats endpoint"""
    
    def test_stats_returns_rank(self, admin_headers):
        """Test stats endpoint still returns rank field"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=admin_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        # Check rank field exists
        assert "rank" in data, f"No rank field in stats response: {data.keys()}"
        assert isinstance(data["rank"], int) or data["rank"] is None, f"Invalid rank type: {type(data['rank'])}"
        print(f"✓ /api/stats returns rank: {data['rank']}")
    
    def test_stats_structure(self, admin_headers):
        """Test stats returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        expected_fields = ["rank", "total_visits", "countries_visited", "continents_visited", "points"]
        for field in expected_fields:
            assert field in data, f"Missing field {field} in stats"
        print(f"✓ /api/stats returns all expected fields")


class TestRegressionProgress:
    """Regression tests for /api/progress endpoint"""
    
    def test_progress_structure(self, admin_headers):
        """Test progress returns overall/continents/countries"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=admin_headers)
        assert response.status_code == 200, f"Progress failed: {response.text}"
        data = response.json()
        # Check required fields
        assert "overall" in data, f"No overall field in progress: {data.keys()}"
        assert "continents" in data, f"No continents field in progress: {data.keys()}"
        assert "countries" in data, f"No countries field in progress: {data.keys()}"
        print(f"✓ /api/progress returns overall, continents, countries")


class TestRegressionPhotosCollection:
    """Regression tests for /api/photos/collection endpoint"""
    
    def test_photos_collection_structure(self, admin_headers):
        """Test photos collection returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/photos/collection", headers=admin_headers)
        assert response.status_code == 200, f"Photos collection failed: {response.text}"
        data = response.json()
        # Check expected fields
        assert "photos" in data, f"No photos field: {data.keys()}"
        assert "total_count" in data, f"No total_count field: {data.keys()}"
        assert isinstance(data["photos"], list), "photos should be a list"
        assert isinstance(data["total_count"], int), "total_count should be int"
        print(f"✓ /api/photos/collection structure valid, total_count={data['total_count']}")


class TestRegressionVisits:
    """Regression tests for /api/visits endpoint"""
    
    def test_visits_returns_list(self, admin_headers):
        """Test visits returns list"""
        response = requests.get(f"{BASE_URL}/api/visits", headers=admin_headers)
        assert response.status_code == 200, f"Visits failed: {response.text}"
        data = response.json()
        # API returns list directly or wrapped in object
        if isinstance(data, list):
            visits = data
        else:
            visits = data.get("visits", data)
        assert isinstance(visits, list), "visits should be a list"
        print(f"✓ /api/visits returns list with {len(visits)} visits")


class TestRegressionFeed:
    """Regression tests for /api/feed endpoint"""
    
    def test_feed_returns_activities(self, admin_headers):
        """Test feed returns activities list"""
        response = requests.get(f"{BASE_URL}/api/feed", headers=admin_headers)
        assert response.status_code == 200, f"Feed failed: {response.text}"
        data = response.json()
        # API returns list directly or wrapped in object
        if isinstance(data, list):
            activities = data
        else:
            activities = data.get("activities", data)
        assert isinstance(activities, list), "activities should be a list"
        print(f"✓ /api/feed returns list with {len(activities)} activities")


# ============= RUN TESTS =============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
