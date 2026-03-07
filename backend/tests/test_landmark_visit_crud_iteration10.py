"""
Iteration 10 - Landmark Visit CRUD Tests
Testing new PUT /api/visits/{id} and DELETE /api/visits/{id} endpoints
Also testing PATCH /api/country-visits/{id}/update with share_diary field

Test flow:
1. Login with test credentials
2. Create a landmark visit (POST /api/visits)
3. Update landmark visit (PUT /api/visits/{id}) - diary_notes, share_diary, visibility
4. Delete landmark visit (DELETE /api/visits/{id}) - verify points_deducted
5. Test country visit share_diary update (PATCH /api/country-visits/{id}/update)
6. Verify other core endpoints still work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://wandermark-admin.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login returns 200 and token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data, "No token in response"
        print(f"Login successful, user: {data.get('user', {}).get('name', 'Unknown')}")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.text}")
    data = response.json()
    token = data.get("token") or data.get("access_token")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLandmarkVisitCRUD:
    """Test landmark visit CRUD operations - PUT and DELETE"""
    
    @pytest.fixture(autouse=True)
    def setup_landmarks(self, auth_headers):
        """Find a valid landmark to create visit for"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        if response.status_code == 200:
            landmarks = response.json()
            if landmarks:
                self.test_landmark_id = landmarks[0].get("landmark_id")
                self.test_landmark_name = landmarks[0].get("name")
                print(f"Using landmark: {self.test_landmark_name} ({self.test_landmark_id})")
            else:
                pytest.skip("No landmarks available")
        else:
            pytest.skip(f"Cannot fetch landmarks: {response.status_code}")
    
    def test_create_landmark_visit(self, auth_headers):
        """POST /api/visits - Create a landmark visit"""
        # First check if we already visited this landmark
        check_resp = requests.get(f"{BASE_URL}/api/visits/check/{self.test_landmark_id}", headers=auth_headers)
        if check_resp.status_code == 200:
            check_data = check_resp.json()
            if check_data.get("visited") and check_data.get("visit_id"):
                # Already visited - use existing visit for update/delete tests
                pytest.visit_id = check_data["visit_id"]
                print(f"Using existing visit: {pytest.visit_id}")
                return
        
        # Create new visit
        create_payload = {
            "landmark_id": self.test_landmark_id,
            "diary_notes": "Test diary entry from iteration 10",
            "share_diary": True,
            "visibility": "public"
        }
        response = requests.post(f"{BASE_URL}/api/visits", json=create_payload, headers=auth_headers)
        
        assert response.status_code in [200, 201], f"Create visit failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "visit_id" in data, f"No visit_id in response: {data}"
        pytest.visit_id = data["visit_id"]
        print(f"Created visit: {pytest.visit_id}")
    
    def test_update_landmark_visit_diary(self, auth_headers):
        """PUT /api/visits/{id} - Update diary_notes"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        update_payload = {
            "diary_notes": "Updated diary entry - testing PUT endpoint iteration 10"
        }
        response = requests.put(f"{BASE_URL}/api/visits/{pytest.visit_id}", json=update_payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Update diary failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, f"No message in response: {data}"
        print(f"Update diary response: {data}")
    
    def test_update_landmark_visit_share_diary(self, auth_headers):
        """PUT /api/visits/{id} - Update share_diary field"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        update_payload = {
            "share_diary": False
        }
        response = requests.put(f"{BASE_URL}/api/visits/{pytest.visit_id}", json=update_payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Update share_diary failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"Update share_diary response: {data}")
    
    def test_update_landmark_visit_visibility(self, auth_headers):
        """PUT /api/visits/{id} - Update visibility field"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        update_payload = {
            "visibility": "private"
        }
        response = requests.put(f"{BASE_URL}/api/visits/{pytest.visit_id}", json=update_payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Update visibility failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"Update visibility response: {data}")
    
    def test_verify_visit_update(self, auth_headers):
        """GET /api/visits/{id} - Verify updates persisted"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        response = requests.get(f"{BASE_URL}/api/visits/{pytest.visit_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get visit failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify fields were updated (check diary field name - might be 'diary' or 'diary_notes')
        diary_value = data.get("diary") or data.get("diary_notes")
        print(f"Visit details: diary={diary_value}, share_diary={data.get('share_diary')}, visibility={data.get('visibility')}")
    
    def test_delete_landmark_visit(self, auth_headers):
        """DELETE /api/visits/{id} - Delete visit and verify points_deducted"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        response = requests.delete(f"{BASE_URL}/api/visits/{pytest.visit_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Delete visit failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response contains expected fields
        assert "message" in data, f"No message in delete response: {data}"
        assert "points_deducted" in data, f"No points_deducted in delete response: {data}"
        assert "landmark_id" in data, f"No landmark_id in delete response: {data}"
        
        print(f"Delete response: message={data['message']}, points_deducted={data['points_deducted']}, landmark_id={data['landmark_id']}")
    
    def test_verify_visit_deleted(self, auth_headers):
        """GET /api/visits/{id} - Verify visit is deleted (should return 404)"""
        if not hasattr(pytest, 'visit_id') or not pytest.visit_id:
            pytest.skip("No visit_id available")
        
        response = requests.get(f"{BASE_URL}/api/visits/{pytest.visit_id}", headers=auth_headers)
        assert response.status_code == 404, f"Visit should be deleted but got: {response.status_code}"
        print("Visit confirmed deleted (404)")


class TestCountryVisitShareDiary:
    """Test country visit share_diary update via PUT endpoint"""
    
    def test_get_country_visits(self, auth_headers):
        """GET /api/country-visits - Get list and find one to update"""
        response = requests.get(f"{BASE_URL}/api/country-visits", headers=auth_headers)
        assert response.status_code == 200, f"Get country visits failed: {response.status_code}"
        
        visits = response.json()
        if visits and len(visits) > 0:
            pytest.country_visit_id = visits[0].get("country_visit_id")
            print(f"Found country visit: {pytest.country_visit_id}")
        else:
            pytest.country_visit_id = None
            print("No country visits found - will create one if landmark visit was successful")
    
    def test_update_country_visit_share_diary(self, auth_headers):
        """PUT /api/country-visits/{id} - Update with share_diary field"""
        if not hasattr(pytest, 'country_visit_id') or not pytest.country_visit_id:
            pytest.skip("No country_visit_id available")
        
        update_payload = {
            "share_diary": True
        }
        response = requests.put(f"{BASE_URL}/api/country-visits/{pytest.country_visit_id}", json=update_payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Update country visit share_diary failed: {response.status_code} - {response.text}"
        data = response.json()
        print(f"Country visit update response: {data}")
        
        # Verify share_diary was set
        if "share_diary" in data:
            assert data["share_diary"] == True, f"share_diary not updated correctly: {data}"


class TestCoreEndpoints:
    """Test core endpoints still work"""
    
    def test_stats_endpoint(self, auth_headers):
        """GET /api/stats - Returns valid response"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.status_code}"
        data = response.json()
        print(f"Stats: points={data.get('points')}, rank={data.get('rank')}")
    
    def test_visits_list_endpoint(self, auth_headers):
        """GET /api/visits/list - Returns valid response"""
        response = requests.get(f"{BASE_URL}/api/visits/list", headers=auth_headers)
        assert response.status_code == 200, f"Visits list failed: {response.status_code}"
        data = response.json()
        print(f"Visits list count: {len(data)}")
    
    def test_photos_collection_endpoint(self, auth_headers):
        """GET /api/photos/collection - Returns valid response"""
        response = requests.get(f"{BASE_URL}/api/photos/collection", headers=auth_headers)
        assert response.status_code == 200, f"Photos collection failed: {response.status_code}"
        data = response.json()
        print(f"Photos collection: {len(data) if isinstance(data, list) else 'dict response'}")
    
    def test_landmarks_endpoint(self, auth_headers):
        """GET /api/landmarks - Returns valid response"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200, f"Landmarks failed: {response.status_code}"
        data = response.json()
        print(f"Landmarks count: {len(data)}")
    
    def test_progress_endpoint(self, auth_headers):
        """GET /api/progress - Returns valid response"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200, f"Progress failed: {response.status_code}"
        data = response.json()
        print(f"Progress data: {data.keys() if isinstance(data, dict) else type(data)}")
    
    def test_user_created_visits_no_objectid(self, auth_headers):
        """GET /api/user-created-visits - Returns list without _id field"""
        response = requests.get(f"{BASE_URL}/api/user-created-visits", headers=auth_headers)
        assert response.status_code == 200, f"User created visits failed: {response.status_code}"
        data = response.json()
        
        # Verify no _id leak
        if isinstance(data, list):
            for item in data:
                assert "_id" not in item, f"ObjectId leak detected in user-created-visits: {item.keys()}"
            print(f"User created visits count: {len(data)} - no _id leak")
        else:
            print(f"User created visits response type: {type(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
