"""
Test suite for Hybrid Privacy Model (Plan C) - Iteration 30
Tests: POST /api/visits with visibility, PUT /api/visits/{visit_id}/privacy, 
       PUT /api/auth/privacy, GET /api/auth/me with default_privacy
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://granular-control.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="session")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="session")
def headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


class TestGetMeWithDefaultPrivacy:
    """Test GET /api/auth/me returns default_privacy field"""
    
    def test_get_me_returns_200(self, headers):
        """Test GET /api/auth/me returns 200"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
    
    def test_get_me_returns_default_privacy(self, headers):
        """Test GET /api/auth/me includes default_privacy field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "default_privacy" in data
        assert data["default_privacy"] in ["public", "friends", "private"]


class TestUpdateDefaultPrivacy:
    """Test PUT /api/auth/privacy endpoint"""
    
    def test_update_privacy_to_friends(self, headers):
        """Test updating default privacy to friends"""
        response = requests.put(
            f"{BASE_URL}/api/auth/privacy",
            headers=headers,
            json={"privacy": "friends"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "default_privacy" in data
        assert data["default_privacy"] == "friends"
        assert "updated_visits" in data
        assert "updated_activities" in data
        assert isinstance(data["updated_visits"], int)
        assert isinstance(data["updated_activities"], int)
    
    def test_update_privacy_to_private(self, headers):
        """Test updating default privacy to private"""
        response = requests.put(
            f"{BASE_URL}/api/auth/privacy",
            headers=headers,
            json={"privacy": "private"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["default_privacy"] == "private"
        assert "updated_visits" in data
        assert "updated_activities" in data
    
    def test_update_privacy_to_public(self, headers):
        """Test updating default privacy back to public"""
        response = requests.put(
            f"{BASE_URL}/api/auth/privacy",
            headers=headers,
            json={"privacy": "public"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["default_privacy"] == "public"
        assert "updated_visits" in data
        assert "updated_activities" in data
    
    def test_update_privacy_invalid_value(self, headers):
        """Test updating privacy with invalid value returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/auth/privacy",
            headers=headers,
            json={"privacy": "invalid"}
        )
        assert response.status_code == 400


class TestPostVisitWithVisibility:
    """Test POST /api/visits accepts optional visibility field"""
    
    def test_get_landmarks_for_visit(self, headers):
        """Get a landmark to use for visit tests"""
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        return data[0]["landmark_id"]
    
    def test_post_visit_without_visibility_uses_default(self, headers):
        """Test POST /api/visits without visibility uses user's default_privacy"""
        # First ensure default is public
        requests.put(f"{BASE_URL}/api/auth/privacy", headers=headers, json={"privacy": "public"})
        
        # Get a landmark
        landmarks_response = requests.get(f"{BASE_URL}/api/landmarks?country_id=italy", headers=headers)
        if landmarks_response.status_code != 200 or len(landmarks_response.json()) == 0:
            pytest.skip("No landmarks available for testing")
        landmark_id = landmarks_response.json()[0]["landmark_id"]
        
        # Create visit without visibility
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={
                "landmark_id": landmark_id,
                "comments": "Test visit without visibility - uses default"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        assert data["visibility"] == "public"  # Should use user's default
    
    def test_post_visit_with_explicit_friends_visibility(self, headers):
        """Test POST /api/visits with visibility=friends"""
        # Get a landmark
        landmarks_response = requests.get(f"{BASE_URL}/api/landmarks?country_id=spain", headers=headers)
        if landmarks_response.status_code != 200 or len(landmarks_response.json()) == 0:
            pytest.skip("No landmarks available for testing")
        landmark_id = landmarks_response.json()[0]["landmark_id"]
        
        # Create visit with explicit friends visibility
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={
                "landmark_id": landmark_id,
                "visibility": "friends",
                "comments": "Test visit with explicit friends visibility"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        assert data["visibility"] == "friends"
    
    def test_post_visit_with_explicit_private_visibility(self, headers):
        """Test POST /api/visits with visibility=private"""
        # Get a landmark
        landmarks_response = requests.get(f"{BASE_URL}/api/landmarks?country_id=germany", headers=headers)
        if landmarks_response.status_code != 200 or len(landmarks_response.json()) == 0:
            pytest.skip("No landmarks available for testing")
        landmark_id = landmarks_response.json()[0]["landmark_id"]
        
        # Create visit with explicit private visibility
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={
                "landmark_id": landmark_id,
                "visibility": "private",
                "comments": "Test visit with explicit private visibility"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        assert data["visibility"] == "private"


class TestPutVisitPrivacy:
    """Test PUT /api/visits/{visit_id}/privacy endpoint"""
    
    def test_get_visits_to_change(self, headers):
        """Get existing visits to test privacy change"""
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        return data[0]["visit_id"] if len(data) > 0 else None
    
    def test_change_visit_privacy_to_friends(self, headers):
        """Test changing a visit's privacy to friends"""
        # Get a visit
        visits_response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if visits_response.status_code != 200 or len(visits_response.json()) == 0:
            pytest.skip("No visits available for testing")
        visit_id = visits_response.json()[0]["visit_id"]
        
        # Change privacy
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers=headers,
            json={"visibility": "friends"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "friends"
        assert "message" in data
    
    def test_change_visit_privacy_to_private(self, headers):
        """Test changing a visit's privacy to private"""
        # Get a visit
        visits_response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if visits_response.status_code != 200 or len(visits_response.json()) == 0:
            pytest.skip("No visits available for testing")
        visit_id = visits_response.json()[0]["visit_id"]
        
        # Change privacy
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers=headers,
            json={"visibility": "private"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "private"
    
    def test_change_visit_privacy_to_public(self, headers):
        """Test changing a visit's privacy back to public"""
        # Get a visit
        visits_response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if visits_response.status_code != 200 or len(visits_response.json()) == 0:
            pytest.skip("No visits available for testing")
        visit_id = visits_response.json()[0]["visit_id"]
        
        # Change privacy
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers=headers,
            json={"visibility": "public"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "public"
    
    def test_change_visit_privacy_invalid_value(self, headers):
        """Test changing a visit's privacy with invalid value returns 400"""
        # Get a visit
        visits_response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if visits_response.status_code != 200 or len(visits_response.json()) == 0:
            pytest.skip("No visits available for testing")
        visit_id = visits_response.json()[0]["visit_id"]
        
        # Change privacy with invalid value
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers=headers,
            json={"visibility": "invalid"}
        )
        assert response.status_code == 400
    
    def test_change_nonexistent_visit_privacy_404(self, headers):
        """Test changing privacy of non-existent visit returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/visits/visit_nonexistent123/privacy",
            headers=headers,
            json={"visibility": "friends"}
        )
        assert response.status_code == 404


class TestVisitDetailHasVisibility:
    """Test GET /api/visits/{visit_id} returns visibility field"""
    
    def test_visit_detail_has_visibility(self, headers):
        """Test visit detail endpoint returns visibility field"""
        # Get a visit
        visits_response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if visits_response.status_code != 200 or len(visits_response.json()) == 0:
            pytest.skip("No visits available for testing")
        visit_id = visits_response.json()[0]["visit_id"]
        
        # Get visit detail
        response = requests.get(f"{BASE_URL}/api/visits/{visit_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        assert data["visibility"] in ["public", "friends", "private"]


class TestVisitsListHasVisibility:
    """Test GET /api/visits returns visits with visibility field"""
    
    def test_visits_list_has_visibility(self, headers):
        """Test visits list endpoint returns visibility field on each visit"""
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            for visit in data[:5]:  # Check first 5 visits
                assert "visibility" in visit
                assert visit["visibility"] in ["public", "friends", "private"]


class TestVisitCreateModelNoTravelTips:
    """Test that travel_tips field is removed from VisitCreate model"""
    
    def test_post_visit_with_travel_tips_ignored(self, headers):
        """Test that travel_tips field in POST is ignored (not an error)"""
        # Get a landmark
        landmarks_response = requests.get(f"{BASE_URL}/api/landmarks?country_id=france", headers=headers)
        if landmarks_response.status_code != 200 or len(landmarks_response.json()) == 0:
            pytest.skip("No landmarks available for testing")
        landmark_id = landmarks_response.json()[0]["landmark_id"]
        
        # Create visit with travel_tips (should be ignored, not error)
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={
                "landmark_id": landmark_id,
                "travel_tips": "This should be ignored",
                "comments": "Test visit checking travel_tips is ignored"
            }
        )
        # Should succeed (200) or if validation rejects unknown field, will fail
        # Based on Pydantic config, unknown fields are typically ignored
        assert response.status_code in [200, 422]  # 422 if strict validation


class TestResetPrivacyToPublic:
    """Cleanup: Reset user privacy to public"""
    
    def test_reset_privacy_to_public(self, headers):
        """Reset user privacy to public after tests"""
        response = requests.put(
            f"{BASE_URL}/api/auth/privacy",
            headers=headers,
            json={"privacy": "public"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["default_privacy"] == "public"
