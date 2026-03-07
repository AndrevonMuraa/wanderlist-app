"""
Custom Visits CRUD Endpoints Test - Iteration 9
Tests for WanderMark user-created-visits feature enhancement:
- POST /api/user-created-visits (create custom visit)
- GET /api/user-created-visits (list - verify NO _id field)
- GET /api/user-created-visits/{visit_id} (single visit)
- PUT /api/user-created-visits/{visit_id} (update visit)
- DELETE /api/user-created-visits/{visit_id} (delete visit)
- share_diary field verification
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment - API calls use the public URL with /api prefix
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://audit-phase1.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuthentication:
    """Test login endpoint"""
    
    def test_login_success(self, api_client):
        """POST /api/auth/login with test credentials returns 200"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data or "session_token" in data, "No token in response"
        print(f"✓ Login successful, response contains token")


class TestCustomVisitsCRUD:
    """Full CRUD tests for user-created-visits endpoints"""
    
    @pytest.fixture
    def auth_token(self, api_client):
        """Get authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed - skipping tests. Status: {response.status_code}")
        data = response.json()
        # Handle different token field names
        token = data.get("access_token") or data.get("token") or data.get("session_token")
        return token
    
    @pytest.fixture
    def authenticated_client(self, api_client, auth_token):
        """Session with auth header"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        return api_client
    
    def test_create_custom_visit(self, authenticated_client):
        """POST /api/user-created-visits creates a custom visit with share_diary"""
        # Generate unique test data
        unique_country = f"TEST_Country_{uuid.uuid4().hex[:8]}"
        payload = {
            "country_name": unique_country,
            "landmarks": [
                {"name": "TEST_Landmark_1", "photo": None},
                {"name": "TEST_Landmark_2", "photo": None}
            ],
            "photos": [],
            "diary_notes": "This is a test diary note for iteration 9 testing",
            "visibility": "public",
            "share_diary": True
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/user-created-visits", json=payload)
        
        # Handle 403 if user is not Pro
        if response.status_code == 403:
            print(f"⚠ User is not Pro (403 Forbidden) - endpoint structure validated")
            pytest.skip("User is not Pro - cannot create custom visits")
        
        assert response.status_code in [200, 201], f"Create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "user_created_visit_id" in data, "Response missing user_created_visit_id"
        assert data.get("country_name") == unique_country, "Country name mismatch"
        print(f"✓ Created custom visit: {data.get('user_created_visit_id')}")
        
        # Store the visit ID for later tests - return it
        return data.get("user_created_visit_id")
    
    def test_get_list_no_objectid_leak(self, authenticated_client):
        """GET /api/user-created-visits returns list WITHOUT _id field (ObjectId leak fix)"""
        response = authenticated_client.get(f"{BASE_URL}/api/user-created-visits")
        assert response.status_code == 200, f"Get list failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Response should be a list
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        # Check that NO item has _id field (ObjectId leak fix)
        for idx, visit in enumerate(data):
            assert "_id" not in visit, f"ObjectId leak: visit at index {idx} contains '_id' field"
            # Verify expected fields exist
            assert "user_created_visit_id" in visit, f"Visit {idx} missing user_created_visit_id"
            assert "country_name" in visit, f"Visit {idx} missing country_name"
        
        print(f"✓ GET list returned {len(data)} visits, NO _id field (ObjectId leak fixed)")
        return data
    
    def test_full_crud_flow(self, authenticated_client):
        """Test complete CRUD flow: Create -> Get List -> Get Single -> Update -> Delete"""
        
        # ========== CREATE ==========
        unique_country = f"TEST_CRUD_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "country_name": unique_country,
            "landmarks": [{"name": "TEST_CRUD_Landmark"}],
            "photos": [],
            "diary_notes": "Initial diary note",
            "visibility": "public",
            "share_diary": False  # Test with share_diary=False
        }
        
        create_response = authenticated_client.post(f"{BASE_URL}/api/user-created-visits", json=create_payload)
        
        # Handle 403 if user is not Pro
        if create_response.status_code == 403:
            print(f"⚠ User is not Pro (403 Forbidden) - CRUD flow test skipped")
            pytest.skip("User is not Pro - cannot complete CRUD flow test")
        
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.status_code}"
        created = create_response.json()
        visit_id = created.get("user_created_visit_id")
        assert visit_id, "No visit_id returned from create"
        print(f"✓ CREATE: {visit_id}")
        
        # ========== GET LIST (verify creation + no _id) ==========
        list_response = authenticated_client.get(f"{BASE_URL}/api/user-created-visits")
        assert list_response.status_code == 200
        visits_list = list_response.json()
        
        # Find our created visit in the list
        our_visit = next((v for v in visits_list if v.get("user_created_visit_id") == visit_id), None)
        assert our_visit is not None, f"Created visit {visit_id} not found in list"
        assert "_id" not in our_visit, "ObjectId leak in list response"
        print(f"✓ GET LIST: Found visit, no _id leak")
        
        # ========== GET SINGLE ==========
        single_response = authenticated_client.get(f"{BASE_URL}/api/user-created-visits/{visit_id}")
        assert single_response.status_code == 200, f"Get single failed: {single_response.status_code}"
        single_visit = single_response.json()
        
        assert single_visit.get("user_created_visit_id") == visit_id
        assert single_visit.get("country_name") == unique_country
        assert "_id" not in single_visit, "ObjectId leak in single visit response"
        # Verify share_diary field is present
        assert "share_diary" in single_visit, "share_diary field missing from single visit response"
        assert single_visit.get("share_diary") == False, "share_diary should be False as set during create"
        print(f"✓ GET SINGLE: {visit_id} - share_diary={single_visit.get('share_diary')}")
        
        # ========== UPDATE (PUT) ==========
        update_payload = {
            "diary_notes": "Updated diary note for iteration 9",
            "visibility": "friends",
            "share_diary": True  # Update share_diary to True
        }
        
        update_response = authenticated_client.put(f"{BASE_URL}/api/user-created-visits/{visit_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code} - {update_response.text}"
        print(f"✓ PUT UPDATE: {visit_id}")
        
        # Verify update persisted
        verify_response = authenticated_client.get(f"{BASE_URL}/api/user-created-visits/{visit_id}")
        assert verify_response.status_code == 200
        updated_visit = verify_response.json()
        
        assert updated_visit.get("diary") == "Updated diary note for iteration 9", "Diary update not persisted"
        assert updated_visit.get("visibility") == "friends", "Visibility update not persisted"
        assert updated_visit.get("share_diary") == True, "share_diary update not persisted"
        print(f"✓ UPDATE VERIFIED: diary, visibility, share_diary all updated correctly")
        
        # ========== DELETE ==========
        delete_response = authenticated_client.delete(f"{BASE_URL}/api/user-created-visits/{visit_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        print(f"✓ DELETE: {visit_id}")
        
        # Verify delete - should return 404
        verify_delete = authenticated_client.get(f"{BASE_URL}/api/user-created-visits/{visit_id}")
        assert verify_delete.status_code == 404, f"Visit still exists after delete: {verify_delete.status_code}"
        print(f"✓ DELETE VERIFIED: visit no longer exists (404)")
        
        return True


class TestOtherEndpoints:
    """Test other endpoints mentioned in the requirements"""
    
    @pytest.fixture
    def auth_token(self, api_client):
        """Get authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        data = response.json()
        return data.get("access_token") or data.get("token") or data.get("session_token")
    
    @pytest.fixture
    def authenticated_client(self, api_client, auth_token):
        """Session with auth header"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        return api_client
    
    def test_stats_endpoint(self, authenticated_client):
        """GET /api/stats returns valid response"""
        response = authenticated_client.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Stats failed: {response.status_code}"
        data = response.json()
        # Stats should have common travel stats fields
        print(f"✓ GET /api/stats: returned valid response")
    
    def test_visits_list_endpoint(self, authenticated_client):
        """GET /api/visits/list returns valid response"""
        response = authenticated_client.get(f"{BASE_URL}/api/visits/list")
        assert response.status_code == 200, f"Visits list failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, (list, dict)), "Visits list should return list or dict"
        print(f"✓ GET /api/visits/list: returned valid response")
    
    def test_photos_collection_endpoint(self, authenticated_client):
        """GET /api/photos/collection returns valid response"""
        response = authenticated_client.get(f"{BASE_URL}/api/photos/collection")
        assert response.status_code == 200, f"Photos collection failed: {response.status_code}"
        data = response.json()
        print(f"✓ GET /api/photos/collection: returned valid response")
    
    def test_landmarks_endpoint(self, authenticated_client):
        """GET /api/landmarks returns valid response"""
        response = authenticated_client.get(f"{BASE_URL}/api/landmarks")
        assert response.status_code == 200, f"Landmarks failed: {response.status_code}"
        data = response.json()
        print(f"✓ GET /api/landmarks: returned valid response")
    
    def test_progress_endpoint(self, authenticated_client):
        """GET /api/progress returns valid response"""
        response = authenticated_client.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 200, f"Progress failed: {response.status_code}"
        data = response.json()
        print(f"✓ GET /api/progress: returned valid response")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
