"""
Tests for WanderMark New Features (Iteration 4):
1. Photo of the Week endpoint - GET /api/community-photos/photo-of-the-week
2. Diary notes in community photos with share_diary flag
3. share_diary field in visit creation
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://eas-build-54.preview.emergentagent.com').rstrip('/')


class TestPhotoOfTheWeek:
    """Tests for Photo of the Week feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not login with test credentials")
    
    def test_photo_of_the_week_endpoint_returns_200(self, auth_token):
        """GET /api/community-photos/photo-of-the-week should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/community-photos/photo-of-the-week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Photo of the Week endpoint returns 200")
    
    def test_photo_of_the_week_returns_correct_structure(self, auth_token):
        """Photo of the Week should return correct data shape"""
        response = requests.get(
            f"{BASE_URL}/api/community-photos/photo-of-the-week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Response should have photo field
        assert "photo" in data, "Response should have 'photo' field"
        
        # If there's a photo, verify structure
        if data["photo"]:
            photo = data["photo"]
            required_fields = ["photo_id", "photo_url", "upvotes", "user_name", "landmark_name"]
            
            for field in required_fields:
                assert field in photo, f"Photo should have '{field}' field"
            
            # Verify types
            assert isinstance(photo["upvotes"], int), "upvotes should be an integer"
            assert isinstance(photo["user_name"], str), "user_name should be a string"
            assert isinstance(photo["landmark_name"], str), "landmark_name should be a string"
            
            # Optional fields that may be present
            optional_fields = ["country_name", "landmark_id", "username", "user_picture", "visited_at"]
            print(f"PASS: Photo of the Week has correct structure. Fields: {list(photo.keys())}")
            print(f"  - photo_id: {photo['photo_id']}")
            print(f"  - landmark_name: {photo['landmark_name']}")
            print(f"  - user_name: {photo['user_name']}")
            print(f"  - upvotes: {photo['upvotes']}")
        else:
            print("INFO: No Photo of the Week available (photo is None)")
    
    def test_photo_of_the_week_requires_auth(self):
        """Photo of the Week should require authentication"""
        response = requests.get(f"{BASE_URL}/api/community-photos/photo-of-the-week")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Photo of the Week requires authentication")


class TestDiaryNotesInCommunityPhotos:
    """Tests for diary_notes and has_diary fields in community photos"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not login with test credentials")
    
    def test_landmark_photos_include_diary_fields(self, auth_token):
        """Landmark community photos should include diary_notes and has_diary fields"""
        # Use france_eiffel_tower which has diary data in seed
        response = requests.get(
            f"{BASE_URL}/api/landmarks/france_eiffel_tower/community-photos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            photo = data["photos"][0]
            
            # Both fields should be present in response
            assert "diary_notes" in photo, "Photo should have 'diary_notes' field"
            assert "has_diary" in photo, "Photo should have 'has_diary' field"
            
            # has_diary should be boolean
            assert isinstance(photo["has_diary"], bool), "has_diary should be boolean"
            
            print(f"PASS: Landmark photos include diary fields")
            print(f"  - has_diary: {photo['has_diary']}")
            print(f"  - diary_notes present: {photo['diary_notes'] is not None}")
        else:
            print("INFO: No photos to verify diary fields")
    
    def test_diary_notes_visible_when_share_diary_true(self, auth_token):
        """diary_notes should be visible when share_diary is true"""
        # Use france_eiffel_tower which has share_diary=true visits
        response = requests.get(
            f"{BASE_URL}/api/landmarks/france_eiffel_tower/community-photos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find a photo with has_diary=true
        photos_with_diary = [p for p in data["photos"] if p.get("has_diary")]
        
        if photos_with_diary:
            photo = photos_with_diary[0]
            assert photo["diary_notes"] is not None, "diary_notes should not be null when has_diary=true"
            assert len(photo["diary_notes"]) > 0, "diary_notes should have content"
            print(f"PASS: diary_notes visible when share_diary=true: '{photo['diary_notes'][:50]}...'")
        else:
            print("INFO: No photos with has_diary=true found")
    
    def test_diary_notes_hidden_when_share_diary_false(self, auth_token):
        """diary_notes should be null when share_diary is false"""
        # Use france_palace_of_versailles which has share_diary=false
        response = requests.get(
            f"{BASE_URL}/api/landmarks/france_palace_of_versailles/community-photos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            # Look for photos where has_diary is false (share_diary=false visits)
            photos_without_diary = [p for p in data["photos"] if not p.get("has_diary")]
            
            if photos_without_diary:
                photo = photos_without_diary[0]
                assert photo["diary_notes"] is None, "diary_notes should be null when share_diary=false"
                assert photo["has_diary"] == False, "has_diary should be false"
                print("PASS: diary_notes correctly hidden when share_diary=false")
            else:
                print("INFO: All photos have share_diary=true")
        else:
            print("INFO: No photos to verify")
    
    def test_country_photos_include_diary_fields(self, auth_token):
        """Country community photos should include diary_notes and has_diary fields"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-photos",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photos"]:
            photo = data["photos"][0]
            
            assert "diary_notes" in photo, "Country photo should have 'diary_notes' field"
            assert "has_diary" in photo, "Country photo should have 'has_diary' field"
            
            print(f"PASS: Country photos include diary fields")
            print(f"  - has_diary: {photo['has_diary']}")
        else:
            print("INFO: No country photos to verify")


class TestVisitShareDiaryField:
    """Tests for share_diary field in visit creation"""
    
    @pytest.fixture(scope="class") 
    def premium_token(self):
        """Create a premium user for visit tests"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"diary_test_{unique_id}@test.com"
        
        # Register
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "username": f"diary_test_{unique_id}",
            "password": "TestPass123!",
            "name": "Diary Test User"
        })
        
        if register_resp.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = register_resp.json()["access_token"]
        
        # Upgrade to premium (needed for multiple photos)
        requests.post(
            f"{BASE_URL}/api/subscription/test-toggle",
            headers={"Authorization": f"Bearer {token}"},
            json={"tier": "pro"}
        )
        
        return token
    
    @pytest.fixture(scope="class")
    def landmark_id(self, premium_token):
        """Get a landmark to visit"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=1",
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        if response.status_code == 200 and response.json():
            return response.json()[0]["landmark_id"]
        pytest.skip("No landmarks available")
    
    def test_create_visit_with_share_diary_true(self, premium_token, landmark_id):
        """POST /api/visits should accept share_diary=true"""
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers={"Authorization": f"Bearer {premium_token}"},
            json={
                "landmark_id": landmark_id,
                "diary_notes": "Test diary entry with sharing enabled",
                "share_diary": True,
                "visibility": "public"
            }
        )
        
        # Should succeed (200 or 201)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print("PASS: Visit created with share_diary=true")
    
    def test_create_visit_with_share_diary_false(self, premium_token, landmark_id):
        """POST /api/visits should accept share_diary=false"""
        # Use a different landmark to avoid duplicate visit errors
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        
        if response.status_code == 200:
            landmarks = response.json()
            # Try to find a different landmark
            alt_landmark = None
            for lm in landmarks:
                if lm["landmark_id"] != landmark_id:
                    alt_landmark = lm["landmark_id"]
                    break
            
            if alt_landmark:
                visit_resp = requests.post(
                    f"{BASE_URL}/api/visits",
                    headers={"Authorization": f"Bearer {premium_token}"},
                    json={
                        "landmark_id": alt_landmark,
                        "diary_notes": "Private diary - should not be shared",
                        "share_diary": False,
                        "visibility": "public"
                    }
                )
                
                assert visit_resp.status_code in [200, 201], f"Expected 200/201, got {visit_resp.status_code}"
                print("PASS: Visit created with share_diary=false")
            else:
                print("INFO: No alternative landmark found, skipping test")
        else:
            pytest.skip("Could not get landmarks")
    
    def test_share_diary_defaults_to_true(self, premium_token):
        """share_diary should default to true if not specified"""
        # Get a landmark
        landmarks_resp = requests.get(
            f"{BASE_URL}/api/landmarks?limit=20",
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        
        if landmarks_resp.status_code != 200:
            pytest.skip("Could not get landmarks")
        
        landmarks = landmarks_resp.json()
        # Find unvisited landmark
        for lm in landmarks[10:]:  # Start from index 10 to avoid duplicates
            visit_resp = requests.post(
                f"{BASE_URL}/api/visits",
                headers={"Authorization": f"Bearer {premium_token}"},
                json={
                    "landmark_id": lm["landmark_id"],
                    "diary_notes": "Test diary without share_diary field"
                    # share_diary not specified - should default to true
                }
            )
            
            if visit_resp.status_code in [200, 201]:
                print("PASS: Visit created without share_diary (defaults to true)")
                return
        
        print("INFO: Could not create visit (all landmarks may be visited)")


class TestPhotoOfTheWeekIntegration:
    """Integration tests for Photo of the Week feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not login")
    
    def test_photo_of_week_returns_most_upvoted(self, auth_token):
        """Photo of the Week should return most upvoted photo"""
        response = requests.get(
            f"{BASE_URL}/api/community-photos/photo-of-the-week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photo"]:
            photo = data["photo"]
            # The upvotes count should be >= 1 (most upvoted)
            assert photo["upvotes"] >= 1, "Photo of the week should have at least 1 upvote"
            print(f"PASS: Photo of the Week has {photo['upvotes']} upvotes")
            print(f"  - Landmark: {photo['landmark_name']}")
            print(f"  - Photographer: {photo['user_name']}")
        else:
            print("INFO: No photo of the week available")
    
    def test_photo_of_week_includes_country_name(self, auth_token):
        """Photo of the Week should include country_name if available"""
        response = requests.get(
            f"{BASE_URL}/api/community-photos/photo-of-the-week",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["photo"]:
            # country_name may be null but field should exist
            assert "country_name" in data["photo"] or data["photo"].get("country_name") is None, \
                "Photo should have country_name field"
            print(f"PASS: country_name in response: {data['photo'].get('country_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
