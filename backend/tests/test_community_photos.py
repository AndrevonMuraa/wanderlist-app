"""
Tests for WanderMark Community Photo Gallery features:
1. GET /api/landmarks/{landmark_id}/community-photos - Landmark community photos with freemium logic
2. GET /api/countries/{country_id}/community-photos - Country community photos with freemium logic  
3. POST /api/community-photos/{photo_id}/upvote - Premium-only upvoting
4. Verify old POST /api/landmarks/{landmark_id}/upvote endpoint is removed (should return 404)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://audit-phase1.preview.emergentagent.com').rstrip('/')


class TestCommunityPhotosEndpoints:
    """Test community photo gallery endpoints"""
    
    @pytest.fixture(scope="class")
    def free_user_token(self):
        """Create and login a free tier user"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"free_test_{unique_id}@test.com"
        password = "TestPass123!"
        
        # Register
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": f"free_user_{unique_id}",
            "password": password,
            "name": "Free Test User"
        })
        
        if register_resp.status_code == 200:
            return register_resp.json()["access_token"]
        
        # If registration fails, try login (user might exist)
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if login_resp.status_code == 200:
            return login_resp.json()["access_token"]
        
        pytest.skip("Could not create or login free user")

    @pytest.fixture(scope="class")
    def premium_user_token(self):
        """Create a user and upgrade to premium"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"premium_test_{unique_id}@test.com"
        password = "TestPass123!"
        
        # Register
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": f"premium_user_{unique_id}",
            "password": password,
            "name": "Premium Test User"
        })
        
        if register_resp.status_code != 200:
            pytest.skip("Could not create premium user")
        
        token = register_resp.json()["access_token"]
        
        # Upgrade to premium via test toggle endpoint
        upgrade_resp = requests.post(
            f"{BASE_URL}/api/subscription/test-toggle",
            headers={"Authorization": f"Bearer {token}"},
            json={"tier": "pro"}
        )
        
        if upgrade_resp.status_code not in [200, 201]:
            print(f"Warning: Could not upgrade to premium - {upgrade_resp.status_code}")
        
        return token

    @pytest.fixture(scope="class")
    def landmark_id(self, free_user_token):
        """Get a valid landmark ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=1",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        if response.status_code == 200:
            landmarks = response.json()
            if landmarks:
                return landmarks[0]["landmark_id"]
        pytest.skip("No landmarks available")

    @pytest.fixture(scope="class")
    def country_id(self, free_user_token):
        """Get a valid country ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        if response.status_code == 200:
            countries = response.json()
            if countries:
                return countries[0]["country_id"]
        pytest.skip("No countries available")

    # ============== LANDMARK COMMUNITY PHOTOS ==============
    
    def test_landmark_community_photos_free_user(self, free_user_token, landmark_id):
        """Free users should get preview mode with max 3 photos"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "photos" in data, "Response should have 'photos' field"
        assert "total_count" in data, "Response should have 'total_count' field"
        assert "is_preview" in data, "Response should have 'is_preview' field"
        assert "landmark_id" in data, "Response should have 'landmark_id' field"
        
        # Free user should see preview mode
        assert data["is_preview"] == True, "Free user should see preview mode (is_preview=True)"
        
        # Free user should see max 3 photos even if more exist
        assert len(data["photos"]) <= 3, f"Free user should see max 3 photos, got {len(data['photos'])}"
        
        print(f"PASS: Free user gets preview mode with {len(data['photos'])} photos (total: {data['total_count']})")

    def test_landmark_community_photos_premium_user(self, premium_user_token, landmark_id):
        """Premium users should get full access with all photos"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos",
            headers={"Authorization": f"Bearer {premium_user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "photos" in data
        assert "total_count" in data
        assert "is_preview" in data
        
        # Premium user should not see preview mode (unless there are fewer than 3 photos)
        # is_preview should be False for premium users
        assert data["is_preview"] == False, f"Premium user should NOT see preview mode, got is_preview={data['is_preview']}"
        
        print(f"PASS: Premium user gets full access with {len(data['photos'])} photos (is_preview={data['is_preview']})")

    def test_landmark_community_photos_photo_structure(self, free_user_token, landmark_id):
        """Verify photo objects have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are photos, check their structure
        if data["photos"]:
            photo = data["photos"][0]
            expected_fields = ["photo_id", "photo_url", "user_id", "user_name", "upvotes"]
            
            for field in expected_fields:
                assert field in photo, f"Photo should have '{field}' field"
            
            print(f"PASS: Photo structure is correct with fields: {list(photo.keys())}")
        else:
            print("INFO: No photos to verify structure (empty gallery)")

    # ============== COUNTRY COMMUNITY PHOTOS ==============
    
    def test_country_community_photos_free_user(self, free_user_token, country_id):
        """Free users should get preview mode with max 3 photos for country gallery"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{country_id}/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "photos" in data, "Response should have 'photos' field"
        assert "total_count" in data, "Response should have 'total_count' field"
        assert "is_preview" in data, "Response should have 'is_preview' field"
        assert "country_id" in data, "Response should have 'country_id' field"
        assert "country_name" in data, "Response should have 'country_name' field"
        
        # Free user should see preview mode
        assert data["is_preview"] == True, "Free user should see preview mode"
        
        # Free user should see max 3 photos
        assert len(data["photos"]) <= 3, f"Free user should see max 3 photos, got {len(data['photos'])}"
        
        print(f"PASS: Country photos - Free user gets preview with {len(data['photos'])} photos (total: {data['total_count']})")

    def test_country_community_photos_premium_user(self, premium_user_token, country_id):
        """Premium users should get full access to country photos"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{country_id}/community-photos",
            headers={"Authorization": f"Bearer {premium_user_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert data["is_preview"] == False, "Premium user should NOT see preview mode"
        
        print(f"PASS: Country photos - Premium user gets full access (is_preview={data['is_preview']})")

    def test_country_community_photos_structure(self, free_user_token, country_id):
        """Country photos should include landmark_name for each photo"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{country_id}/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            photo = data["photos"][0]
            # Country photos should include landmark name
            assert "landmark_name" in photo, "Country photo should have 'landmark_name' field"
            print(f"PASS: Country photo structure includes landmark_name: {photo.get('landmark_name')}")
        else:
            print("INFO: No country photos to verify structure")

    # ============== PHOTO UPVOTING ==============
    
    def test_upvote_rejected_for_free_user(self, free_user_token):
        """Free users should get 403 when trying to upvote photos"""
        # Using a fake photo_id is fine - we just need to test the auth gate
        response = requests.post(
            f"{BASE_URL}/api/community-photos/test_photo_123/upvote",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for free user upvote, got {response.status_code}: {response.text}"
        
        # Verify error message
        data = response.json()
        assert "Premium" in data.get("detail", "") or "premium" in data.get("detail", "").lower(), \
            f"Error should mention premium requirement, got: {data.get('detail')}"
        
        print(f"PASS: Free user correctly rejected (403) when trying to upvote: {data.get('detail')}")

    def test_upvote_allowed_for_premium_user(self, premium_user_token):
        """Premium users should be able to upvote (test with fake photo_id - will either succeed or give different error)"""
        # Using a fake photo_id - this tests that premium users pass the auth gate
        response = requests.post(
            f"{BASE_URL}/api/community-photos/fake_photo_id_for_testing/upvote",
            headers={"Authorization": f"Bearer {premium_user_token}"}
        )
        
        # Premium users should NOT get 403 (auth gate passed)
        # They might get 200 (toggle works) or other codes, but NOT 403
        assert response.status_code != 403, f"Premium user should NOT get 403, got {response.status_code}: {response.text}"
        
        # Typically will be 200 since the endpoint creates/toggles upvotes
        if response.status_code == 200:
            data = response.json()
            assert "upvoted" in data, "Response should have 'upvoted' field"
            assert "upvotes" in data, "Response should have 'upvotes' field"
            print(f"PASS: Premium user can upvote. upvoted={data['upvoted']}, count={data['upvotes']}")
        else:
            print(f"INFO: Premium user passed auth gate but got {response.status_code}")

    # ============== OLD UPVOTE ENDPOINT REMOVED ==============
    
    def test_old_landmark_upvote_endpoint_removed(self, free_user_token, landmark_id):
        """The old POST /api/landmarks/{id}/upvote endpoint should no longer exist (404)"""
        response = requests.post(
            f"{BASE_URL}/api/landmarks/{landmark_id}/upvote",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        # Should return 404 or 405 (Method Not Allowed) since endpoint was removed
        assert response.status_code in [404, 405], \
            f"Old upvote endpoint should return 404/405, got {response.status_code}: {response.text}"
        
        print(f"PASS: Old landmark upvote endpoint correctly returns {response.status_code}")

    # ============== INVALID INPUTS ==============
    
    def test_landmark_photos_invalid_landmark_id(self, free_user_token):
        """Invalid landmark ID should return 200 with empty photos (or 404)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/invalid_landmark_id_12345/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        # Either 200 with empty photos or 404
        assert response.status_code in [200, 404], f"Unexpected status {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data["total_count"] == 0, "Invalid landmark should have 0 photos"
            print(f"PASS: Invalid landmark returns empty gallery")
        else:
            print(f"PASS: Invalid landmark returns 404")

    def test_country_photos_invalid_country_id(self, free_user_token):
        """Invalid country ID should handle gracefully"""
        response = requests.get(
            f"{BASE_URL}/api/countries/invalid_country_id_xyz/community-photos",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        
        # Either 200 with empty photos or 404
        assert response.status_code in [200, 404], f"Unexpected status {response.status_code}"
        
        print(f"PASS: Invalid country ID handled gracefully with status {response.status_code}")

    # ============== AUTH REQUIRED ==============
    
    def test_landmark_photos_requires_auth(self, landmark_id):
        """Community photos endpoints should require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos"
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PASS: Landmark community photos requires authentication")

    def test_country_photos_requires_auth(self, country_id):
        """Country community photos should require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/countries/{country_id}/community-photos"
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PASS: Country community photos requires authentication")

    def test_upvote_requires_auth(self):
        """Upvote endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/community-photos/any_photo_id/upvote"
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PASS: Upvote endpoint requires authentication")


class TestFreemiumLogic:
    """Additional tests for freemium feature gating"""
    
    @pytest.fixture(scope="class")
    def test_credentials(self):
        """Create test users for freemium testing"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create free user
        free_email = f"freemium_free_{unique_id}@test.com"
        free_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": free_email,
            "username": f"freemium_free_{unique_id}",
            "password": "TestPass123!",
            "name": "Freemium Free User"
        })
        
        if free_resp.status_code != 200:
            pytest.skip("Could not create free user")
        
        free_token = free_resp.json()["access_token"]
        
        # Create premium user
        pro_email = f"freemium_pro_{unique_id}@test.com"
        pro_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": pro_email,
            "username": f"freemium_pro_{unique_id}",
            "password": "TestPass123!",
            "name": "Freemium Pro User"
        })
        
        if pro_resp.status_code != 200:
            pytest.skip("Could not create premium user")
        
        pro_token = pro_resp.json()["access_token"]
        
        # Upgrade to pro
        requests.post(
            f"{BASE_URL}/api/subscription/test-toggle",
            headers={"Authorization": f"Bearer {pro_token}"},
            json={"tier": "pro"}
        )
        
        return {"free_token": free_token, "pro_token": pro_token}

    def test_freemium_difference(self, test_credentials):
        """Verify free vs premium users get different preview status"""
        free_token = test_credentials["free_token"]
        pro_token = test_credentials["pro_token"]
        
        # Get any landmark
        landmarks_resp = requests.get(
            f"{BASE_URL}/api/landmarks?limit=1",
            headers={"Authorization": f"Bearer {free_token}"}
        )
        
        if landmarks_resp.status_code != 200 or not landmarks_resp.json():
            pytest.skip("No landmarks available")
        
        landmark_id = landmarks_resp.json()[0]["landmark_id"]
        
        # Free user request
        free_resp = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos",
            headers={"Authorization": f"Bearer {free_token}"}
        )
        
        # Pro user request
        pro_resp = requests.get(
            f"{BASE_URL}/api/landmarks/{landmark_id}/community-photos",
            headers={"Authorization": f"Bearer {pro_token}"}
        )
        
        assert free_resp.status_code == 200
        assert pro_resp.status_code == 200
        
        free_data = free_resp.json()
        pro_data = pro_resp.json()
        
        # Free should be preview, pro should not be
        assert free_data["is_preview"] == True, "Free user should see preview"
        assert pro_data["is_preview"] == False, "Pro user should NOT see preview"
        
        print(f"PASS: Freemium logic working correctly - Free: is_preview={free_data['is_preview']}, Pro: is_preview={pro_data['is_preview']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
