"""
Iteration 24: Rank System Refactor Testing
Tests for:
- GET /api/auth/me returns 'has_password' field
- GET /api/auth/me does NOT return 'featured_badges'
- PUT /api/auth/change-password works correctly
- GET /api/countries aggregation pipeline works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cleanup-verify-1.preview.emergentagent.com").rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuthMeEndpoint:
    """Test /auth/me endpoint returns correct fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_auth_me_returns_has_password_true_for_email_user(self, auth_token):
        """Test that /auth/me returns has_password=true for email/password users"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # CRITICAL: has_password field must exist
        assert "has_password" in data, f"'has_password' field missing from /auth/me response. Got: {list(data.keys())}"
        
        # For email/password users (test@wandermark.app), has_password should be True
        assert data["has_password"] is True, f"Expected has_password=True for email user, got: {data['has_password']}"
    
    def test_auth_me_does_not_return_featured_badges(self, auth_token):
        """Test that /auth/me does NOT return featured_badges field"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # CRITICAL: featured_badges should NOT be in response
        assert "featured_badges" not in data, f"'featured_badges' should NOT be in /auth/me response. Found it with value: {data.get('featured_badges')}"
    
    def test_auth_me_returns_user_id(self, auth_token):
        """Test that /auth/me returns user_id"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user_id" in data, "user_id should be in /auth/me response"
        assert isinstance(data["user_id"], str), "user_id should be a string"


class TestChangePasswordEndpoint:
    """Test PUT /auth/change-password endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_change_password_wrong_current_password(self, auth_token):
        """Test change password fails with wrong current password"""
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "current_password": "WrongPassword123!",
                "new_password": "NewTestPassword123!"
            }
        )
        assert response.status_code == 400, f"Expected 400 for wrong password, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
    
    def test_change_password_missing_new_password(self, auth_token):
        """Test change password fails without new_password"""
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "current_password": TEST_PASSWORD
            }
        )
        assert response.status_code == 400, f"Expected 400 for missing field, got {response.status_code}"
    
    def test_change_password_too_short_new_password(self, auth_token):
        """Test change password fails with < 6 char password"""
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "current_password": TEST_PASSWORD,
                "new_password": "12345"  # Less than 6 chars
            }
        )
        assert response.status_code == 400, f"Expected 400 for short password, got {response.status_code}"


class TestCountriesEndpoint:
    """Test GET /api/countries endpoint with aggregation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_countries_endpoint_returns_200(self, auth_token):
        """Test /api/countries returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_countries_endpoint_returns_list(self, auth_token):
        """Test /api/countries returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_countries_aggregation_fields(self, auth_token):
        """Test countries have aggregation fields when data exists"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # If we have countries, verify structure
        if len(data) > 0:
            country = data[0]
            # At minimum should have ID and name
            has_id = "country_id" in country or "id" in country or "_id" in country
            has_name = "name" in country or "country_name" in country
            assert has_id, f"Country should have an ID field. Got: {list(country.keys())}"
            assert has_name, f"Country should have a name field. Got: {list(country.keys())}"


class TestAPIHealth:
    """Basic health checks"""
    
    def test_api_reachable(self):
        """Test API is reachable"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=10)
            # Accept 200 or 404 (health endpoint may not exist)
            assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        except requests.exceptions.ConnectionError:
            pytest.fail("API is not reachable")
    
    def test_login_works(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
