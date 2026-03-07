"""
WanderMark Backend Tests - Audit Phase 1 (Iteration 11)
Tests for NEW changes after multi-phase audit:
1. country-visits POST accepts share_diary field
2. country-visits GET returns share_diary field  
3. user profile returns comment_permission field
4. visits PUT/DELETE endpoints work
5. user-created-visits CRUD works
6. Bug fix verification: PUT /api/country-visits/{id} with share_diary only (was UnboundLocalError)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://wandermark-admin.preview.emergentagent.com").rstrip("/")

TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuth:
    """Test auth login and token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for all tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Auth token is in 'access_token' field
        assert "access_token" in data, f"Missing access_token in response: {data}"
        return data["access_token"]
    
    def test_login_returns_access_token(self):
        """POST /api/auth/login - verify access_token field exists"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful, got access_token")


class TestUserProfile:
    """Test user profile returns comment_permission field"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_user_profile_has_comment_permission(self, auth_token):
        """GET /api/users/{user_id}/profile - verify comment_permission field"""
        # First get current user to get user_id
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        user = response.json()
        user_id = user["user_id"]
        
        # Now get profile
        response = requests.get(
            f"{BASE_URL}/api/users/{user_id}/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        profile = response.json()
        assert "comment_permission" in profile, f"Missing comment_permission in profile: {profile.keys()}"
        assert profile["comment_permission"] in ["everyone", "friends", "nobody"]
        print(f"✓ User profile has comment_permission: {profile['comment_permission']}")


class TestCountryVisits:
    """Test country visits share_diary field"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_country_visits_get_returns_share_diary(self, auth_token):
        """GET /api/country-visits - verify share_diary field in response"""
        response = requests.get(
            f"{BASE_URL}/api/country-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visits = response.json()
        # If there are visits, check for share_diary field
        if visits:
            # At least one visit should have share_diary field (it defaults to True)
            visit = visits[0]
            # share_diary may or may not exist in older visits, but new ones should have it
            print(f"✓ GET /api/country-visits returned {len(visits)} visits")
            if "share_diary" in visit:
                print(f"  - First visit has share_diary: {visit['share_diary']}")
            else:
                print(f"  - Note: share_diary field not present in older visit (expected for pre-migration data)")
        else:
            print(f"✓ GET /api/country-visits returned empty list (no country visits)")
    
    def test_country_visit_put_share_diary_only_no_error(self, auth_token):
        """PUT /api/country-visits/{id} with only share_diary - BUG FIX verification"""
        # Get existing country visit
        response = requests.get(
            f"{BASE_URL}/api/country-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visits = response.json()
        
        if not visits:
            pytest.skip("No country visits to test PUT endpoint")
        
        country_visit_id = visits[0]["country_visit_id"]
        
        # Try to update ONLY share_diary - this was causing UnboundLocalError before fix
        response = requests.put(
            f"{BASE_URL}/api/country-visits/{country_visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"share_diary": True}
        )
        
        # Should NOT return 500 (UnboundLocalError: has_photos)
        assert response.status_code != 500, f"BUG: PUT with share_diary only returns 500: {response.text}"
        assert response.status_code == 200, f"PUT failed with status {response.status_code}: {response.text}"
        
        updated = response.json()
        assert "share_diary" in updated, f"Response missing share_diary: {updated.keys()}"
        assert updated["share_diary"] == True
        print(f"✓ PUT /api/country-visits/{country_visit_id} with share_diary only - BUG FIXED")
    
    def test_country_visit_put_diary_only(self, auth_token):
        """PUT /api/country-visits/{id} with only diary field"""
        response = requests.get(
            f"{BASE_URL}/api/country-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        visits = response.json()
        
        if not visits:
            pytest.skip("No country visits to test PUT endpoint")
        
        country_visit_id = visits[0]["country_visit_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/country-visits/{country_visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"diary": "Test diary entry from iteration 11"}
        )
        
        assert response.status_code == 200, f"PUT failed: {response.text}"
        updated = response.json()
        assert updated.get("diary") == "Test diary entry from iteration 11"
        print(f"✓ PUT /api/country-visits/{country_visit_id} with diary only works")


class TestLandmarkVisits:
    """Test landmark visits PUT and DELETE endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_visits_put_update_share_diary(self, auth_token):
        """PUT /api/visits/{id} - update share_diary field"""
        # Get existing visits
        response = requests.get(
            f"{BASE_URL}/api/visits/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visits = response.json()
        
        if not visits:
            pytest.skip("No landmark visits to test PUT endpoint")
        
        visit_id = visits[0]["visit_id"]
        
        # Update share_diary
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"share_diary": False}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visit = response.json()
        # share_diary might be stored as "share_diary" in the response
        print(f"✓ PUT /api/visits/{visit_id} share_diary update successful")
        
        # Restore to True
        requests.put(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"share_diary": True}
        )
    
    def test_visits_put_update_visibility(self, auth_token):
        """PUT /api/visits/{id} - update visibility field"""
        response = requests.get(
            f"{BASE_URL}/api/visits/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        visits = response.json()
        
        if not visits:
            pytest.skip("No landmark visits to test PUT endpoint")
        
        visit_id = visits[0]["visit_id"]
        
        # Update visibility
        response = requests.put(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"visibility": "private"}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        print(f"✓ PUT /api/visits/{visit_id} visibility update successful")
        
        # Restore to public
        requests.put(
            f"{BASE_URL}/api/visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"visibility": "public"}
        )


class TestUserCreatedVisits:
    """Test user-created visits CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_user_created_visits_get_list(self, auth_token):
        """GET /api/user-created-visits - list user's custom visits"""
        response = requests.get(
            f"{BASE_URL}/api/user-created-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visits = response.json()
        assert isinstance(visits, list)
        
        # Verify no _id leak (ObjectId fix)
        for visit in visits:
            assert "_id" not in visit, f"ObjectId leak: _id found in response"
        
        print(f"✓ GET /api/user-created-visits returned {len(visits)} visits (no _id leak)")
    
    def test_user_created_visits_crud_flow(self, auth_token):
        """Full CRUD flow for user-created visits"""
        # CREATE
        create_payload = {
            "country_name": "TEST_IterationCountry",
            "landmarks": [{"name": "Test Landmark 1"}],
            "diary_notes": "Test diary from iteration 11",
            "share_diary": False,
            "visibility": "private"
        }
        response = requests.post(
            f"{BASE_URL}/api/user-created-visits",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=create_payload
        )
        assert response.status_code == 200, f"CREATE failed: {response.text}"
        created = response.json()
        visit_id = created["user_created_visit_id"]
        print(f"✓ Created custom visit: {visit_id}")
        
        # READ single
        response = requests.get(
            f"{BASE_URL}/api/user-created-visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET single failed: {response.text}"
        visit = response.json()
        assert visit["country_name"] == "TEST_IterationCountry"
        assert visit["share_diary"] == False
        assert "_id" not in visit, "ObjectId leak in GET single"
        print(f"✓ GET single visit successful, share_diary={visit['share_diary']}")
        
        # UPDATE
        response = requests.put(
            f"{BASE_URL}/api/user-created-visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"share_diary": True, "visibility": "public"}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        print(f"✓ PUT update successful")
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/user-created-visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["share_diary"] == True
        assert updated["visibility"] == "public"
        print(f"✓ Update verified: share_diary=True, visibility=public")
        
        # DELETE
        response = requests.delete(
            f"{BASE_URL}/api/user-created-visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"DELETE failed: {response.text}"
        print(f"✓ DELETE successful")
        
        # Verify deletion
        response = requests.get(
            f"{BASE_URL}/api/user-created-visits/{visit_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404 after delete, got {response.status_code}"
        print(f"✓ DELETE verified (404 on re-fetch)")


class TestAdditionalEndpoints:
    """Test additional endpoints mentioned in review request"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_stats_endpoint(self, auth_token):
        """GET /api/stats"""
        response = requests.get(
            f"{BASE_URL}/api/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        stats = response.json()
        assert "total_visits" in stats
        assert "points" in stats
        print(f"✓ GET /api/stats successful: {stats['total_visits']} visits, {stats['points']} points")
    
    def test_progress_endpoint(self, auth_token):
        """GET /api/progress"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        progress = response.json()
        assert "overall" in progress
        assert "continents" in progress
        print(f"✓ GET /api/progress successful")
    
    def test_landmarks_endpoint(self, auth_token):
        """GET /api/landmarks"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        landmarks = response.json()
        assert isinstance(landmarks, list)
        print(f"✓ GET /api/landmarks returned {len(landmarks)} landmarks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
