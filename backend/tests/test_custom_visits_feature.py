"""
Test Suite: Custom Visits Feature Improvements (P1, P2, P3)
- P1: Community feed includes custom visits with source='custom'
- P2: PATCH visibility endpoint for custom visits 
- P3: Dedicated GET /api/community/custom-visits browsing endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# ============= FIXTURES =============

@pytest.fixture(scope="module")
def api_session():
    """Create requests session with JSON headers"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_session):
    """Get authentication token using test credentials"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@wandermark.app",
        "password": "Test1234!"
    })
    if response.status_code == 200:
        data = response.json()
        # Login returns access_token (not token)
        return data.get("access_token")
    pytest.skip(f"Authentication failed with status {response.status_code}: {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with authorization token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


# ============= P1: COMMUNITY FEED INCLUDES CUSTOM VISITS =============

class TestCommunityFeedCustomVisits:
    """P1: Test that GET /api/community-feed includes custom visits with source='custom'"""

    def test_community_feed_returns_items(self, api_session, auth_headers):
        """Test community feed returns items array"""
        response = api_session.get(f"{BASE_URL}/api/community-feed", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items' array"
        assert "count" in data, "Response should contain 'count'"
        assert isinstance(data["items"], list), "items should be a list"
    
    def test_community_feed_items_have_source_field(self, api_session, auth_headers):
        """Test all items in community feed have 'source' field"""
        response = api_session.get(f"{BASE_URL}/api/community-feed?limit=20", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert "source" in item, f"Item missing 'source' field: {item}"
            assert item["source"] in ["landmark", "custom"], f"Invalid source value: {item['source']}"
    
    def test_community_feed_landmark_visits_have_correct_source(self, api_session, auth_headers):
        """Test landmark visits in feed have source='landmark'"""
        response = api_session.get(f"{BASE_URL}/api/community-feed?limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        landmark_visits = [item for item in data["items"] if item.get("type") in ["photo", "diary"]]
        
        for visit in landmark_visits:
            assert visit["source"] == "landmark", f"Landmark visit should have source='landmark': {visit}"
    
    def test_community_feed_custom_visits_have_correct_source(self, api_session, auth_headers):
        """Test custom visits in feed have source='custom' and type='custom_visit'"""
        response = api_session.get(f"{BASE_URL}/api/community-feed?limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        custom_visits = [item for item in data["items"] if item.get("source") == "custom"]
        
        for visit in custom_visits:
            assert visit["type"] == "custom_visit", f"Custom visit should have type='custom_visit': {visit}"
    
    def test_community_feed_custom_visit_fields(self, api_session, auth_headers):
        """Test custom visits in feed have required fields"""
        response = api_session.get(f"{BASE_URL}/api/community-feed?limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        custom_visits = [item for item in data["items"] if item.get("source") == "custom"]
        
        required_fields = ["visit_id", "type", "source", "user_name", "country_name"]
        optional_fields = ["photo_url", "landmark_name", "diary_snippet"]
        
        for visit in custom_visits:
            for field in required_fields:
                assert field in visit, f"Custom visit missing required field '{field}': {visit}"
            # Validate specific values
            assert visit["source"] == "custom"
            assert visit["type"] == "custom_visit"


# ============= P2: PATCH VISIBILITY ENDPOINT =============

class TestCustomVisitVisibilityPatch:
    """P2: Test PATCH /api/user-created-visits/{visit_id}/visibility endpoint"""

    def test_visibility_patch_nonexistent_visit_returns_404(self, api_session, auth_headers):
        """Test PATCH with non-existent visit_id returns 404"""
        fake_visit_id = "ucv_nonexistent123"
        response = api_session.patch(
            f"{BASE_URL}/api/user-created-visits/{fake_visit_id}/visibility",
            headers=auth_headers,
            json={"visibility": "private"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent visit, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data or "message" in data, "Response should contain error message"
    
    def test_visibility_patch_invalid_visibility_returns_400(self, api_session, auth_headers):
        """Test PATCH with invalid visibility value returns 400"""
        # First get a real visit ID (if user has any)
        visits_response = api_session.get(f"{BASE_URL}/api/user-created-visits", headers=auth_headers)
        
        if visits_response.status_code == 200:
            visits = visits_response.json()
            if visits and len(visits) > 0:
                visit_id = visits[0].get("user_created_visit_id")
                if visit_id:
                    # Test with invalid visibility
                    response = api_session.patch(
                        f"{BASE_URL}/api/user-created-visits/{visit_id}/visibility",
                        headers=auth_headers,
                        json={"visibility": "invalid_value"}
                    )
                    assert response.status_code == 400, f"Expected 400 for invalid visibility, got {response.status_code}: {response.text}"
                    return
        
        # If no visits exist, test with fake ID - should still validate body first or return 404
        response = api_session.patch(
            f"{BASE_URL}/api/user-created-visits/ucv_test123/visibility",
            headers=auth_headers,
            json={"visibility": "invalid_value"}
        )
        # Either 400 (validation error) or 404 (not found) is acceptable
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
    
    def test_visibility_patch_valid_values(self, api_session, auth_headers):
        """Test PATCH accepts valid visibility values: public, friends, private"""
        valid_values = ["public", "friends", "private"]
        
        # Get user's visits
        visits_response = api_session.get(f"{BASE_URL}/api/user-created-visits", headers=auth_headers)
        if visits_response.status_code != 200:
            pytest.skip("Could not fetch user-created visits")
        
        visits = visits_response.json()
        if not visits:
            pytest.skip("User has no custom visits to test visibility update")
        
        visit_id = visits[0].get("user_created_visit_id")
        if not visit_id:
            pytest.skip("Visit does not have user_created_visit_id")
        
        # Test updating to each valid value
        for visibility in valid_values:
            response = api_session.patch(
                f"{BASE_URL}/api/user-created-visits/{visit_id}/visibility",
                headers=auth_headers,
                json={"visibility": visibility}
            )
            assert response.status_code == 200, f"Expected 200 for visibility='{visibility}', got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data.get("visibility") == visibility, f"Response should confirm visibility was set to '{visibility}'"
    
    def test_visibility_patch_requires_auth(self, api_session):
        """Test PATCH visibility endpoint requires authentication"""
        response = api_session.patch(
            f"{BASE_URL}/api/user-created-visits/ucv_test123/visibility",
            json={"visibility": "private"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


# ============= P3: COMMUNITY CUSTOM VISITS ENDPOINT =============

class TestCommunityCustomVisitsBrowsing:
    """P3: Test GET /api/community/custom-visits dedicated browsing endpoint"""

    def test_community_custom_visits_returns_paginated_response(self, api_session, auth_headers):
        """Test endpoint returns paginated response with items, total, offset, limit"""
        response = api_session.get(f"{BASE_URL}/api/community/custom-visits", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "total" in data, "Response should contain 'total'"
        assert "offset" in data, "Response should contain 'offset'"
        assert "limit" in data, "Response should contain 'limit'"
        
        assert isinstance(data["items"], list), "items should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["offset"], int), "offset should be an integer"
        assert isinstance(data["limit"], int), "limit should be an integer"
    
    def test_community_custom_visits_respects_limit(self, api_session, auth_headers):
        """Test endpoint respects limit parameter"""
        # Test with small limit
        response = api_session.get(f"{BASE_URL}/api/community/custom-visits?limit=5", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["limit"] == 5, f"limit should be 5, got {data['limit']}"
        assert len(data["items"]) <= 5, f"Should return at most 5 items, got {len(data['items'])}"
    
    def test_community_custom_visits_respects_offset(self, api_session, auth_headers):
        """Test endpoint respects offset parameter"""
        # Get total first
        response1 = api_session.get(f"{BASE_URL}/api/community/custom-visits?limit=100", headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total"] <= 1:
            pytest.skip("Not enough custom visits to test offset")
        
        # Get with offset
        response2 = api_session.get(f"{BASE_URL}/api/community/custom-visits?limit=5&offset=1", headers=auth_headers)
        assert response2.status_code == 200
        
        data2 = response2.json()
        assert data2["offset"] == 1, f"offset should be 1, got {data2['offset']}"
    
    def test_community_custom_visits_default_pagination(self, api_session, auth_headers):
        """Test default pagination values"""
        response = api_session.get(f"{BASE_URL}/api/community/custom-visits", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["offset"] == 0, f"Default offset should be 0, got {data['offset']}"
        assert data["limit"] == 20, f"Default limit should be 20, got {data['limit']}"
    
    def test_community_custom_visits_item_structure(self, api_session, auth_headers):
        """Test items have expected structure"""
        response = api_session.get(f"{BASE_URL}/api/community/custom-visits?limit=10", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        if not data["items"]:
            pytest.skip("No custom visits in community to verify structure")
        
        expected_fields = [
            "user_created_visit_id", "user_id", "country_name", "landmarks",
            "landmarks_count", "photo_url", "photo_count", "has_diary",
            "user_name", "visited_at"
        ]
        
        for item in data["items"]:
            for field in expected_fields:
                assert field in item, f"Item missing expected field '{field}': {item}"
    
    def test_community_custom_visits_requires_auth(self, api_session):
        """Test endpoint requires authentication"""
        response = api_session.get(f"{BASE_URL}/api/community/custom-visits")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


# ============= REGRESSION TESTS =============

class TestRegressions:
    """Regression tests for existing functionality"""

    def test_community_feed_still_returns_landmark_visits(self, api_session, auth_headers):
        """Regression: Community feed should still return landmark visits"""
        response = api_session.get(f"{BASE_URL}/api/community-feed?limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        landmark_visits = [item for item in data["items"] if item.get("source") == "landmark"]
        
        # Should have at least some landmark visits in the feed (if database has data)
        # This is just verifying the endpoint still works with landmarks
        print(f"Found {len(landmark_visits)} landmark visits and {len(data['items']) - len(landmark_visits)} custom visits")
    
    def test_user_created_visits_returns_own_visits(self, api_session, auth_headers):
        """Regression: GET /api/user-created-visits returns user's own custom visits"""
        response = api_session.get(f"{BASE_URL}/api/user-created-visits", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of visits"
    
    def test_create_custom_visit_requires_pro(self, api_session, auth_headers):
        """Regression: POST /api/user-created-visits requires Pro subscription"""
        response = api_session.post(
            f"{BASE_URL}/api/user-created-visits",
            headers=auth_headers,
            json={
                "country_name": "Test Country Regression",
                "landmarks": [{"name": "Test Landmark Regression"}],
                "photos": [],
                "diary_notes": "Test diary for regression",
                "visibility": "public"
            }
        )
        # Expect either 200/201 (if user is Pro) or 403 (if not Pro)
        # API returns 200 for successful creation
        assert response.status_code in [200, 201, 403], f"Expected 200, 201 or 403, got {response.status_code}: {response.text}"
        
        if response.status_code == 403:
            data = response.json()
            assert "Pro" in data.get("detail", ""), "403 error should mention Pro subscription"
            print("Test user is not Pro - correctly returns 403")
        else:
            data = response.json()
            assert "user_created_visit_id" in data, "Successful creation should return visit ID"
            print(f"Test user is Pro - visit created successfully: {data.get('user_created_visit_id')}")
    
    def test_delete_nonexistent_custom_visit_returns_404(self, api_session, auth_headers):
        """Regression: DELETE /api/user-created-visits/{visit_id} returns 404 for non-existent visit"""
        fake_visit_id = "ucv_doesnotexist999"
        response = api_session.delete(
            f"{BASE_URL}/api/user-created-visits/{fake_visit_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent visit, got {response.status_code}: {response.text}"


# ============= AUTH TESTS =============

class TestAuthRequired:
    """Verify all endpoints require authentication"""

    def test_community_feed_requires_auth(self, api_session):
        """Community feed requires auth"""
        response = api_session.get(f"{BASE_URL}/api/community-feed")
        assert response.status_code == 401
    
    def test_user_created_visits_requires_auth(self, api_session):
        """User created visits requires auth"""
        response = api_session.get(f"{BASE_URL}/api/user-created-visits")
        assert response.status_code == 401
