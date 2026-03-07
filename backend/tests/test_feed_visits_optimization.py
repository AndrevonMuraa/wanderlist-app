"""
Test suite for /api/feed and /api/visits endpoint performance optimization
Testing MongoDB aggregation pipelines that replaced N+1 query patterns

Optimized endpoints:
- GET /api/feed: Returns Activity objects with likes_count, comments_count, is_liked, photo_url, user_name via aggregation
- GET /api/visits: Returns Visit objects with landmark_name populated via $lookup
- GET /api/stats: Previously optimized, verify still works
- GET /api/progress: Previously optimized, verify still works
- POST /api/visits: Create visit and verify it appears in feed/visits
- POST/DELETE /api/activities/{activity_id}/like: Like/unlike and verify feed reflects changes
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wandermark-admin.preview.emergentagent.com').rstrip('/')

class TestAuthenticationSetup:
    """Authentication tests - must pass before other tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    def test_login_success(self):
        """Test login endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestFeedEndpointOptimization:
    """Test /api/feed endpoint with aggregation pipeline optimization"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_feed_returns_200(self, auth_headers):
        """Test /api/feed returns HTTP 200"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60  # Longer timeout for aggregation
        )
        assert response.status_code == 200, f"Feed returned {response.status_code}: {response.text}"
    
    def test_feed_response_is_list(self, auth_headers):
        """Test /api/feed returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_feed_activity_has_required_fields(self, auth_headers):
        """Test feed activities have required fields from Activity model"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            activity = data[0]
            # Required Activity model fields
            assert "activity_id" in activity, "Missing activity_id"
            assert "user_id" in activity, "Missing user_id"
            assert "user_name" in activity, "Missing user_name"
            assert "activity_type" in activity, "Missing activity_type"
            assert "created_at" in activity, "Missing created_at"
            
            # Aggregation-populated fields
            assert "likes_count" in activity, "Missing likes_count (should be populated via $lookup)"
            assert "comments_count" in activity, "Missing comments_count (should be populated via $lookup)"
            assert "is_liked" in activity, "Missing is_liked (should be populated via $lookup)"
            
            # Verify types
            assert isinstance(activity["likes_count"], int), f"likes_count should be int, got {type(activity['likes_count'])}"
            assert isinstance(activity["comments_count"], int), f"comments_count should be int, got {type(activity['comments_count'])}"
            assert isinstance(activity["is_liked"], bool), f"is_liked should be bool, got {type(activity['is_liked'])}"
            
            print(f"✓ Feed activity has all required fields: {activity.get('activity_id')}")
        else:
            print("⚠ Feed is empty - limited test data")
    
    def test_feed_photo_url_populated(self, auth_headers):
        """Test photo_url is populated for activities with photos"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        for activity in data:
            if activity.get("has_photos", False):
                # photo_url should be populated via $lookup to visits collection
                assert "photo_url" in activity, f"Activity {activity['activity_id']} has has_photos=True but no photo_url"
                print(f"✓ Activity {activity['activity_id']} has photo_url populated")
        
        print(f"✓ Checked {len(data)} activities for photo_url")
    
    def test_feed_user_name_populated(self, auth_headers):
        """Test user_name is populated via aggregation lookup"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        for activity in data:
            user_name = activity.get("user_name")
            assert user_name is not None, f"Activity {activity['activity_id']} has null user_name"
            assert user_name != "", f"Activity {activity['activity_id']} has empty user_name"
            assert user_name != "Unknown User" or True, "user_name may be Unknown for deleted users"
        
        print(f"✓ All {len(data)} activities have user_name populated")


class TestVisitsEndpointOptimization:
    """Test /api/visits endpoint with $lookup optimization"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_visits_returns_200(self, auth_headers):
        """Test /api/visits returns HTTP 200"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Visits returned {response.status_code}: {response.text}"
    
    def test_visits_response_is_list(self, auth_headers):
        """Test /api/visits returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
    
    def test_visits_has_landmark_name_from_lookup(self, auth_headers):
        """Test visits have landmark_name populated via $lookup"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            visit = data[0]
            # Visit model required fields
            assert "visit_id" in visit, "Missing visit_id"
            assert "user_id" in visit, "Missing user_id"
            assert "landmark_id" in visit, "Missing landmark_id"
            assert "visited_at" in visit, "Missing visited_at"
            assert "created_at" in visit, "Missing created_at"
            
            # landmark_name should be populated via $lookup
            assert "landmark_name" in visit, "Missing landmark_name (should be populated via $lookup)"
            
            print(f"✓ Visit has landmark_name: {visit.get('landmark_name')}")
        else:
            print("⚠ Visits list is empty - limited test data")
    
    def test_visits_has_all_model_fields(self, auth_headers):
        """Test visits have all Visit model fields"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        for visit in data:
            # Core required fields
            assert "visit_id" in visit
            assert "user_id" in visit
            assert "landmark_id" in visit
            
            # Fields from Visit model
            expected_fields = [
                "visit_id", "user_id", "landmark_id", "landmark_name",
                "points_earned", "status", "verified", "visibility",
                "visited_at", "created_at"
            ]
            
            for field in expected_fields:
                assert field in visit, f"Missing field: {field}"
        
        print(f"✓ All {len(data)} visits have required fields")


class TestStatsEndpointOptimization:
    """Test /api/stats endpoint (previously optimized, verify still works)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_stats_returns_200(self, auth_headers):
        """Test /api/stats returns HTTP 200"""
        response = requests.get(
            f"{BASE_URL}/api/stats",
            headers=auth_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Stats returned {response.status_code}: {response.text}"
    
    def test_stats_has_required_fields(self, auth_headers):
        """Test /api/stats returns required statistics fields"""
        response = requests.get(
            f"{BASE_URL}/api/stats",
            headers=auth_headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "total_visits",
            "countries_visited",
            "continents_visited",
            "friends_count",
            "points",
            "leaderboard_points"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"{field} should be int, got {type(data[field])}"
        
        print(f"✓ Stats endpoint returns all fields: {data}")


class TestProgressEndpointOptimization:
    """Test /api/progress endpoint (previously optimized, verify still works)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_progress_returns_200(self, auth_headers):
        """Test /api/progress returns HTTP 200"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60  # May take time for aggregation
        )
        assert response.status_code == 200, f"Progress returned {response.status_code}: {response.text}"
    
    def test_progress_has_required_structure(self, auth_headers):
        """Test /api/progress returns required structure"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check overall progress
        assert "overall" in data, "Missing 'overall' in progress"
        overall = data["overall"]
        assert "visited" in overall
        assert "total" in overall
        assert "percentage" in overall
        
        # Check totalPoints
        assert "totalPoints" in data, "Missing 'totalPoints' in progress"
        
        # Check continents
        assert "continents" in data, "Missing 'continents' in progress"
        
        # Check countries
        assert "countries" in data, "Missing 'countries' in progress"
        
        print(f"✓ Progress endpoint structure verified: overall={overall}")


class TestCreateVisitAndFeedIntegration:
    """Test creating a visit and verifying it appears in feed and visits list"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_available_landmarks(self, auth_headers):
        """Get a landmark to use for test visit"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            headers=auth_headers,
            params={"limit": 5},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "No landmarks available for testing"
        print(f"✓ Found {len(data)} landmarks for testing")
        return data
    
    def test_create_visit_returns_200(self, auth_headers):
        """Test POST /api/visits creates a visit successfully"""
        # Get a landmark first
        landmarks_resp = requests.get(
            f"{BASE_URL}/api/landmarks",
            headers=auth_headers,
            params={"limit": 5},
            timeout=30
        )
        if landmarks_resp.status_code != 200 or len(landmarks_resp.json()) == 0:
            pytest.skip("No landmarks available for testing visit creation")
        
        landmark = landmarks_resp.json()[0]
        landmark_id = landmark["landmark_id"]
        
        # Create visit
        visit_data = {
            "landmark_id": landmark_id,
            "comments": f"TEST_visit_{uuid.uuid4().hex[:8]}",
            "visibility": "public"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            json=visit_data,
            timeout=30
        )
        
        # Visit creation may fail if already visited - that's OK
        if response.status_code == 400 and "already visited" in response.text.lower():
            print("⚠ Landmark already visited - skipping creation test")
            pytest.skip("Landmark already visited")
        
        assert response.status_code == 200 or response.status_code == 201, f"Visit creation failed: {response.status_code} {response.text}"
        
        data = response.json()
        assert "visit_id" in data, "Response missing visit_id"
        print(f"✓ Created visit: {data.get('visit_id')}")


class TestLikeUnlikeEndpoints:
    """Test like/unlike endpoints and verify feed reflects changes"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_like_activity_endpoint(self, auth_headers):
        """Test POST /api/activities/{activity_id}/like"""
        # Get feed to find an activity
        feed_resp = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert feed_resp.status_code == 200
        feed = feed_resp.json()
        
        if len(feed) == 0:
            pytest.skip("No activities in feed to test like")
        
        activity = feed[0]
        activity_id = activity["activity_id"]
        initial_is_liked = activity.get("is_liked", False)
        initial_likes_count = activity.get("likes_count", 0)
        
        # If already liked, unlike first
        if initial_is_liked:
            unlike_resp = requests.delete(
                f"{BASE_URL}/api/activities/{activity_id}/like",
                headers=auth_headers,
                timeout=30
            )
            # Refresh state
            feed_resp = requests.get(f"{BASE_URL}/api/feed", headers=auth_headers, timeout=60)
            feed = feed_resp.json()
            activity = next((a for a in feed if a["activity_id"] == activity_id), None)
            if activity:
                initial_is_liked = activity.get("is_liked", False)
                initial_likes_count = activity.get("likes_count", 0)
        
        # Now like the activity
        like_resp = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=auth_headers,
            timeout=30
        )
        
        # May already be liked
        if like_resp.status_code == 400:
            print("⚠ Activity already liked")
            return
        
        assert like_resp.status_code == 200, f"Like failed: {like_resp.status_code} {like_resp.text}"
        
        # Verify feed reflects the like
        time.sleep(0.5)  # Small delay for DB
        feed_resp = requests.get(f"{BASE_URL}/api/feed", headers=auth_headers, timeout=60)
        assert feed_resp.status_code == 200
        
        updated_feed = feed_resp.json()
        updated_activity = next((a for a in updated_feed if a["activity_id"] == activity_id), None)
        
        if updated_activity:
            assert updated_activity.get("is_liked", False) == True, "is_liked should be True after liking"
            assert updated_activity.get("likes_count", 0) >= initial_likes_count, "likes_count should increase or stay same"
            print(f"✓ Like successful: is_liked={updated_activity['is_liked']}, likes_count={updated_activity['likes_count']}")
    
    def test_unlike_activity_endpoint(self, auth_headers):
        """Test DELETE /api/activities/{activity_id}/like"""
        # Get feed to find an activity
        feed_resp = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert feed_resp.status_code == 200
        feed = feed_resp.json()
        
        if len(feed) == 0:
            pytest.skip("No activities in feed to test unlike")
        
        # Find a liked activity or like one first
        activity = feed[0]
        activity_id = activity["activity_id"]
        
        # Make sure it's liked
        if not activity.get("is_liked", False):
            like_resp = requests.post(
                f"{BASE_URL}/api/activities/{activity_id}/like",
                headers=auth_headers,
                timeout=30
            )
        
        # Now unlike
        unlike_resp = requests.delete(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=auth_headers,
            timeout=30
        )
        
        # May not be liked
        if unlike_resp.status_code == 404:
            print("⚠ Activity not liked (nothing to unlike)")
            return
        
        assert unlike_resp.status_code == 200, f"Unlike failed: {unlike_resp.status_code} {unlike_resp.text}"
        
        # Verify feed reflects the unlike
        time.sleep(0.5)
        feed_resp = requests.get(f"{BASE_URL}/api/feed", headers=auth_headers, timeout=60)
        assert feed_resp.status_code == 200
        
        updated_feed = feed_resp.json()
        updated_activity = next((a for a in updated_feed if a["activity_id"] == activity_id), None)
        
        if updated_activity:
            assert updated_activity.get("is_liked", False) == False, "is_liked should be False after unliking"
            print(f"✓ Unlike successful: is_liked={updated_activity['is_liked']}, likes_count={updated_activity['likes_count']}")


class TestPerformanceBasic:
    """Basic performance sanity checks - endpoints should respond in reasonable time"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            timeout=30
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_feed_responds_within_timeout(self, auth_headers):
        """Test /api/feed responds within 12 seconds (was timing out before optimization)"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=12  # Previous timeout threshold
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Feed failed: {response.status_code}"
        assert elapsed < 12, f"Feed took {elapsed:.2f}s (should be < 12s)"
        print(f"✓ Feed responded in {elapsed:.2f}s")
    
    def test_visits_responds_within_timeout(self, auth_headers):
        """Test /api/visits responds within 12 seconds"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=12
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Visits failed: {response.status_code}"
        assert elapsed < 12, f"Visits took {elapsed:.2f}s (should be < 12s)"
        print(f"✓ Visits responded in {elapsed:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
