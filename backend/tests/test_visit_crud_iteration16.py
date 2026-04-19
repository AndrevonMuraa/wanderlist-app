"""
Test Visit CRUD Endpoints - Iteration 16
Tests for visit-detail page backend APIs:
- GET /api/auth/login - returns access_token
- GET /api/visits - list of visits for authenticated user
- GET /api/visits/{visit_id} - single visit with photos, verified, points_earned, visibility
- PUT /api/visits/{visit_id} - update diary_notes, photos, share_diary
- PUT /api/visits/{visit_id}/privacy - update visibility
- DELETE /api/visits/{visit_id} - delete visit
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://travel-polish.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
STANDARD_USER = {"email": "test@wandermark.app", "password": "Test1234!"}
PREMIUM_USER = {"email": "testpro@wandermark.app", "password": "Test1234!"}


class TestAuthLogin:
    """Test authentication returns access_token"""
    
    def test_login_returns_access_token(self):
        """GET /api/auth/login returns access_token field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # Verify access_token field exists (not 'token')
        assert "access_token" in data, f"Expected 'access_token' field, got: {list(data.keys())}"
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0
        print(f"✓ Login returns access_token field correctly")
    
    def test_login_premium_user(self):
        """Premium user login also returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PREMIUM_USER)
        if response.status_code == 401:
            pytest.skip("Premium user testpro@wandermark.app not seeded in database")
        
        assert response.status_code == 200, f"Premium login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        print(f"✓ Premium user login returns access_token")


class TestVisitsList:
    """Test GET /api/visits endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_get_visits_list(self, auth_token):
        """GET /api/visits returns list of visits for authenticated user"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        
        assert response.status_code == 200, f"Failed to get visits: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of visits"
        print(f"✓ GET /api/visits returns {len(data)} visits")
        
        # If visits exist, verify structure
        if len(data) > 0:
            visit = data[0]
            # Check expected fields exist
            expected_fields = ["visit_id", "user_id", "landmark_id"]
            for field in expected_fields:
                assert field in visit, f"Missing field: {field}"
            print(f"✓ Visit structure contains required fields")
    
    def test_get_visits_list_lightweight(self, auth_token):
        """GET /api/visits/list returns lightweight visit list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits/list", headers=headers)
        
        assert response.status_code == 200, f"Failed to get visits list: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of visits"
        print(f"✓ GET /api/visits/list returns {len(data)} visits (lightweight)")


class TestVisitDetails:
    """Test GET /api/visits/{visit_id} endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def existing_visit_id(self, auth_token):
        """Get an existing visit ID from user's visits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No existing visits to test")
        return response.json()[0]["visit_id"]
    
    def test_get_visit_details(self, auth_token, existing_visit_id):
        """GET /api/visits/{visit_id} returns single visit with all fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits/{existing_visit_id}", headers=headers)
        
        assert response.status_code == 200, f"Failed to get visit details: {response.text}"
        
        data = response.json()
        
        # Verify required fields from review request
        assert "visit_id" in data, "Missing visit_id"
        assert data["visit_id"] == existing_visit_id
        
        # Check for photos field
        assert "photos" in data or "photo_base64" in data, "Missing photos field"
        
        # Check for verified field
        assert "verified" in data, "Missing verified field"
        assert isinstance(data["verified"], bool), "verified should be boolean"
        
        # Check for points_earned field
        assert "points_earned" in data, "Missing points_earned field"
        
        # Check for visibility field
        assert "visibility" in data, "Missing visibility field"
        assert data["visibility"] in ["public", "friends", "private"], f"Invalid visibility: {data['visibility']}"
        
        print(f"✓ GET /api/visits/{existing_visit_id} returns complete visit details")
        print(f"  - photos: {len(data.get('photos', []))} items")
        print(f"  - verified: {data['verified']}")
        print(f"  - points_earned: {data['points_earned']}")
        print(f"  - visibility: {data['visibility']}")
    
    def test_get_visit_not_found(self, auth_token):
        """GET /api/visits/{invalid_id} returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits/invalid_visit_id_12345", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/visits/invalid returns 404 correctly")


class TestVisitUpdate:
    """Test PUT /api/visits/{visit_id} endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def existing_visit_id(self, auth_token):
        """Get an existing visit ID from user's visits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No existing visits to test")
        return response.json()[0]["visit_id"]
    
    def test_update_diary_notes(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id} with {diary_notes: string} updates diary"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update diary notes
        test_diary = f"TEST_diary_entry_{uuid.uuid4().hex[:8]}"
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"diary_notes": test_diary}
        )
        
        assert response.status_code == 200, f"Failed to update diary: {response.text}"
        
        data = response.json()
        assert "message" in data, "Expected success message"
        print(f"✓ PUT /api/visits/{existing_visit_id} with diary_notes succeeded")
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/visits/{existing_visit_id}", headers=headers)
        assert get_response.status_code == 200
        # Note: diary_notes is stored as 'diary' in the backend
        visit_data = get_response.json()
        # The backend stores diary_notes as 'diary' field
        assert visit_data.get("diary") == test_diary or visit_data.get("diary_notes") == test_diary, \
            f"Diary not updated. Got: diary={visit_data.get('diary')}, diary_notes={visit_data.get('diary_notes')}"
        print(f"✓ Diary update verified via GET")
    
    def test_update_photos_array(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id} with {photos: []} updates photos array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current photos first
        get_response = requests.get(f"{BASE_URL}/api/visits/{existing_visit_id}", headers=headers)
        original_photos = get_response.json().get("photos", [])
        
        # Update with test photo URL
        test_photos = ["https://example.com/test_photo_1.jpg"]
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"photos": test_photos}
        )
        
        assert response.status_code == 200, f"Failed to update photos: {response.text}"
        print(f"✓ PUT /api/visits/{existing_visit_id} with photos array succeeded")
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/visits/{existing_visit_id}", headers=headers)
        assert get_response.status_code == 200
        visit_data = get_response.json()
        assert visit_data.get("photos") == test_photos, f"Photos not updated. Got: {visit_data.get('photos')}"
        print(f"✓ Photos update verified via GET")
        
        # Restore original photos
        requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"photos": original_photos}
        )
    
    def test_update_share_diary(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id} with {share_diary: bool} updates diary sharing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update share_diary to False
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"share_diary": False}
        )
        
        assert response.status_code == 200, f"Failed to update share_diary: {response.text}"
        print(f"✓ PUT /api/visits/{existing_visit_id} with share_diary=False succeeded")
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/visits/{existing_visit_id}", headers=headers)
        assert get_response.status_code == 200
        visit_data = get_response.json()
        assert visit_data.get("share_diary") == False, f"share_diary not updated. Got: {visit_data.get('share_diary')}"
        print(f"✓ share_diary update verified via GET")
        
        # Restore to True
        requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"share_diary": True}
        )
    
    def test_update_visibility_via_main_endpoint_should_work(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id} with {visibility: string} - verify behavior"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # According to the code, visibility CAN be updated via PUT /api/visits/{visit_id}
        # But the review request says it should use /api/visits/{visit_id}/privacy instead
        # Let's test both behaviors
        
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"visibility": "friends"}
        )
        
        # The code shows visibility IS handled in update_visit endpoint
        assert response.status_code == 200, f"Visibility update via main endpoint: {response.text}"
        print(f"✓ PUT /api/visits/{existing_visit_id} with visibility accepted (code supports it)")
        
        # Restore to public
        requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}",
            headers=headers,
            json={"visibility": "public"}
        )


class TestVisitPrivacy:
    """Test PUT /api/visits/{visit_id}/privacy endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def existing_visit_id(self, auth_token):
        """Get an existing visit ID from user's visits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/visits", headers=headers)
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No existing visits to test")
        return response.json()[0]["visit_id"]
    
    def test_update_privacy_to_public(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id}/privacy with {visibility: 'public'}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "public"}
        )
        
        assert response.status_code == 200, f"Failed to update privacy: {response.text}"
        
        data = response.json()
        assert data.get("visibility") == "public", f"Expected visibility=public, got: {data}"
        print(f"✓ PUT /api/visits/{existing_visit_id}/privacy to 'public' succeeded")
    
    def test_update_privacy_to_friends(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id}/privacy with {visibility: 'friends'}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "friends"}
        )
        
        assert response.status_code == 200, f"Failed to update privacy: {response.text}"
        
        data = response.json()
        assert data.get("visibility") == "friends", f"Expected visibility=friends, got: {data}"
        print(f"✓ PUT /api/visits/{existing_visit_id}/privacy to 'friends' succeeded")
        
        # Restore to public
        requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "public"}
        )
    
    def test_update_privacy_to_private(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id}/privacy with {visibility: 'private'}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "private"}
        )
        
        assert response.status_code == 200, f"Failed to update privacy: {response.text}"
        
        data = response.json()
        assert data.get("visibility") == "private", f"Expected visibility=private, got: {data}"
        print(f"✓ PUT /api/visits/{existing_visit_id}/privacy to 'private' succeeded")
        
        # Restore to public
        requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "public"}
        )
    
    def test_update_privacy_invalid_value(self, auth_token, existing_visit_id):
        """PUT /api/visits/{visit_id}/privacy with invalid visibility returns 400"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/visits/{existing_visit_id}/privacy",
            headers=headers,
            json={"visibility": "invalid_value"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid visibility, got {response.status_code}"
        print(f"✓ PUT /api/visits/{existing_visit_id}/privacy with invalid value returns 400")


class TestVisitDelete:
    """Test DELETE /api/visits/{visit_id} endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_delete_visit_not_found(self, auth_token):
        """DELETE /api/visits/{invalid_id} returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/visits/invalid_visit_id_12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE /api/visits/invalid returns 404 correctly")
    
    def test_delete_visit_flow(self, auth_token):
        """Test full delete flow: create visit, verify, delete, verify gone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First, get a landmark to create a visit for
        landmarks_response = requests.get(f"{BASE_URL}/api/landmarks?limit=5", headers=headers)
        if landmarks_response.status_code != 200:
            pytest.skip("Cannot get landmarks")
        
        landmarks = landmarks_response.json()
        if not landmarks:
            pytest.skip("No landmarks available")
        
        # Find a landmark user hasn't visited yet
        test_landmark_id = None
        for lm in landmarks:
            check_response = requests.get(
                f"{BASE_URL}/api/visits/check/{lm['landmark_id']}", 
                headers=headers
            )
            if check_response.status_code == 200 and not check_response.json().get("visited"):
                test_landmark_id = lm["landmark_id"]
                break
        
        if not test_landmark_id:
            # All landmarks visited, skip this test
            print("⚠ All test landmarks already visited, skipping delete flow test")
            pytest.skip("No unvisited landmarks for delete test")
        
        # Create a test visit
        create_response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={
                "landmark_id": test_landmark_id,
                "photos": [],
                "diary_notes": "TEST_delete_flow_visit"
            }
        )
        
        if create_response.status_code == 409:
            # Already visited
            pytest.skip("Landmark already visited")
        
        assert create_response.status_code == 200, f"Failed to create test visit: {create_response.text}"
        
        created_visit = create_response.json()
        visit_id = created_visit["visit_id"]
        print(f"✓ Created test visit: {visit_id}")
        
        # Verify visit exists
        get_response = requests.get(f"{BASE_URL}/api/visits/{visit_id}", headers=headers)
        assert get_response.status_code == 200, "Visit should exist after creation"
        print(f"✓ Verified visit exists")
        
        # Delete the visit
        delete_response = requests.delete(f"{BASE_URL}/api/visits/{visit_id}", headers=headers)
        assert delete_response.status_code == 200, f"Failed to delete visit: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data, "Expected success message"
        print(f"✓ DELETE /api/visits/{visit_id} succeeded")
        
        # Verify visit is gone
        get_after_delete = requests.get(f"{BASE_URL}/api/visits/{visit_id}", headers=headers)
        assert get_after_delete.status_code == 404, "Visit should be gone after deletion"
        print(f"✓ Verified visit no longer exists after deletion")


class TestVisitStats:
    """Test GET /api/visits/stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for standard user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=STANDARD_USER)
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json()["access_token"]
    
    def test_get_visit_stats(self, auth_token):
        """GET /api/visits/stats returns visit statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/visits/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed to get visit stats: {response.text}"
        
        data = response.json()
        assert "monthly_visits" in data, "Missing monthly_visits"
        assert "total_visits" in data, "Missing total_visits"
        assert "tier" in data, "Missing tier"
        
        print(f"✓ GET /api/visits/stats returns:")
        print(f"  - monthly_visits: {data['monthly_visits']}")
        print(f"  - total_visits: {data['total_visits']}")
        print(f"  - tier: {data['tier']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
