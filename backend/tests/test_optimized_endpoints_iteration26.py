"""
Test suite for backend performance optimization - Iteration 26
Tests the newly optimized endpoints:
- /api/landmarks (batch visited check instead of correlated $lookup)
- /api/continent-stats (aggregation pipeline with $lookup instead of Python loops)
- /api/community-feed (batch upvote counting instead of N+1)

Also verifies previously optimized endpoints still work:
- /api/feed
- /api/visits
- /api/progress
- /api/countries
- /api/country-visits/check/{country_id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://query-boost-2.preview.emergentagent.com")

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuthentication:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test that login works and returns token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token length: {len(auth_token)}")


class TestLandmarksEndpoint:
    """Tests for /api/landmarks - optimized with batch visited check"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_landmarks_all_returns_200(self, auth_headers):
        """Test GET /api/landmarks returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/landmarks returned {response.status_code}")
    
    def test_landmarks_returns_list(self, auth_headers):
        """Test /api/landmarks returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"GET /api/landmarks returned {len(data)} landmarks")
    
    def test_landmarks_have_is_visited_field(self, auth_headers):
        """Test that landmarks include is_visited field (batch optimized)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Expected at least 1 landmark"
        
        # Check first landmark has is_visited field
        first_landmark = data[0]
        assert "is_visited" in first_landmark, f"Missing is_visited field: {first_landmark.keys()}"
        assert isinstance(first_landmark["is_visited"], bool), f"is_visited should be bool, got {type(first_landmark['is_visited'])}"
        print(f"First landmark is_visited: {first_landmark['is_visited']}")
    
    def test_landmarks_have_is_locked_field(self, auth_headers):
        """Test that landmarks include is_locked field"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        
        first_landmark = data[0]
        assert "is_locked" in first_landmark, f"Missing is_locked field: {first_landmark.keys()}"
        assert isinstance(first_landmark["is_locked"], bool)
        print(f"First landmark is_locked: {first_landmark['is_locked']}")
    
    def test_landmarks_by_country_france(self, auth_headers):
        """Test GET /api/landmarks?country_id=france"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?country_id=france",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all landmarks are from France
        for lm in data:
            assert lm.get("country_id") == "france" or lm.get("country_name", "").lower() == "france", \
                f"Unexpected country: {lm.get('country_id')} / {lm.get('country_name')}"
            assert "is_visited" in lm, f"Missing is_visited in landmark: {lm.get('name')}"
        
        print(f"GET /api/landmarks?country_id=france returned {len(data)} landmarks")
    
    def test_landmarks_filter_visited_true(self, auth_headers):
        """Test GET /api/landmarks?visited=true"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=true",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned landmarks should be visited
        for lm in data:
            assert lm.get("is_visited") == True, f"Expected is_visited=True, got {lm.get('is_visited')}"
        
        print(f"GET /api/landmarks?visited=true returned {len(data)} visited landmarks")
    
    def test_landmarks_filter_visited_false(self, auth_headers):
        """Test GET /api/landmarks?visited=false"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=false&limit=20",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned landmarks should NOT be visited
        for lm in data:
            assert lm.get("is_visited") == False, f"Expected is_visited=False, got {lm.get('is_visited')}"
        
        print(f"GET /api/landmarks?visited=false returned {len(data)} unvisited landmarks")
    
    def test_landmarks_response_structure(self, auth_headers):
        """Test landmarks have required Pydantic model fields"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=5",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        
        required_fields = [
            "landmark_id", "name", "country_id", "country_name", 
            "continent", "description", "category", "points",
            "is_visited", "is_locked"
        ]
        
        first_landmark = data[0]
        for field in required_fields:
            assert field in first_landmark, f"Missing required field '{field}': {first_landmark.keys()}"
        
        print(f"Landmark structure validated with {len(required_fields)} required fields")


class TestContinentStatsEndpoint:
    """Tests for /api/continent-stats - optimized with aggregation pipeline"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_continent_stats_returns_200(self, auth_headers):
        """Test GET /api/continent-stats returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/continent-stats returned {response.status_code}")
    
    def test_continent_stats_has_continents_array(self, auth_headers):
        """Test response contains continents array"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "continents" in data, f"Missing 'continents' key: {data.keys()}"
        assert isinstance(data["continents"], list), f"'continents' should be list: {type(data['continents'])}"
        print(f"Continent stats has {len(data['continents'])} continents")
    
    def test_continent_stats_has_grand_total(self, auth_headers):
        """Test response contains grand_total object"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "grand_total" in data, f"Missing 'grand_total' key: {data.keys()}"
        grand_total = data["grand_total"]
        assert "landmarks" in grand_total
        assert "points" in grand_total
        assert "countries" in grand_total
        print(f"Grand total: {grand_total}")
    
    def test_continent_stats_structure(self, auth_headers):
        """Test each continent has required structure"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "continent", "total_landmarks", "visited_landmarks",
            "countries", "progress_percent"
        ]
        
        for continent in data["continents"]:
            for field in required_fields:
                assert field in continent, f"Missing '{field}' in continent: {continent}"
            
            # Validate data types
            assert isinstance(continent["total_landmarks"], int)
            assert isinstance(continent["visited_landmarks"], int)
            assert isinstance(continent["countries"], int)
            assert isinstance(continent["progress_percent"], (int, float))
        
        print(f"All {len(data['continents'])} continents have correct structure")
    
    def test_continent_stats_count(self, auth_headers):
        """Test that we have expected number of continents (5 merged: Americas, Europe, Asia, Africa, Oceania)"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Based on CONTINENT_MAP merging North/South America into Americas
        # Expected: Americas, Europe, Asia, Africa, Oceania (5 total)
        continent_names = [c["continent"] for c in data["continents"]]
        print(f"Continents found: {continent_names}")
        
        # Should have at least 3 continents (may vary based on data)
        assert len(data["continents"]) >= 3, f"Expected at least 3 continents, got {len(data['continents'])}"


class TestCommunityFeedEndpoint:
    """Tests for /api/community-feed - optimized with batch upvote counting"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_community_feed_returns_200(self, auth_headers):
        """Test GET /api/community-feed returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/community-feed returned {response.status_code}")
    
    def test_community_feed_response_structure(self, auth_headers):
        """Test response has items array and count"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data, f"Missing 'items' key: {data.keys()}"
        assert "count" in data, f"Missing 'count' key: {data.keys()}"
        assert isinstance(data["items"], list)
        assert isinstance(data["count"], int)
        print(f"Community feed has {data['count']} items")
    
    def test_community_feed_items_have_upvotes(self, auth_headers):
        """Test that feed items have upvotes field (batch loaded)"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=10",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 0:
            for item in data["items"]:
                assert "upvotes" in item, f"Missing 'upvotes' field: {item.keys()}"
                assert isinstance(item["upvotes"], int), f"upvotes should be int: {type(item['upvotes'])}"
            print(f"All {len(data['items'])} items have upvotes field")
        else:
            print("No community feed items found (empty feed)")
    
    def test_community_feed_item_structure(self, auth_headers):
        """Test feed items have required structure"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=10",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 0:
            required_fields = [
                "visit_id", "type", "source", "user_name",
                "landmark_name", "upvotes", "visited_at"
            ]
            
            first_item = data["items"][0]
            for field in required_fields:
                assert field in first_item, f"Missing '{field}' in feed item: {first_item.keys()}"
            
            print(f"Feed item structure validated: {first_item.get('type')} - {first_item.get('landmark_name')}")
        else:
            print("No community feed items to validate structure")


class TestPreviouslyOptimizedEndpoints:
    """Verify previously optimized endpoints still work"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_feed_returns_200(self, auth_headers):
        """Test GET /api/feed returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/feed returned {len(data)} activities")
    
    def test_visits_returns_200(self, auth_headers):
        """Test GET /api/visits returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/visits returned {len(data)} visits")
    
    def test_progress_returns_200(self, auth_headers):
        """Test GET /api/progress returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "overall" in data
        assert "totalPoints" in data
        assert "continents" in data
        assert "countries" in data
        print(f"GET /api/progress - overall: {data['overall']}")
    
    def test_countries_returns_200(self, auth_headers):
        """Test GET /api/countries returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"GET /api/countries returned {len(data)} countries")
    
    def test_country_visits_check_france(self, auth_headers):
        """Test GET /api/country-visits/check/france returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/country-visits/check/france",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "visited" in data, f"Missing 'visited' key: {data.keys()}"
        assert isinstance(data["visited"], bool)
        print(f"France visit status: {data}")


class TestPerformanceBasic:
    """Basic performance tests - ensure endpoints respond within reasonable time"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=30
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get authenticated headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_landmarks_responds_within_timeout(self, auth_headers):
        """Test /api/landmarks responds within 60s timeout"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=100",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        print(f"Landmarks endpoint responded successfully")
    
    def test_continent_stats_responds_within_timeout(self, auth_headers):
        """Test /api/continent-stats responds within 60s timeout"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        print(f"Continent stats endpoint responded successfully")
    
    def test_community_feed_responds_within_timeout(self, auth_headers):
        """Test /api/community-feed responds within 60s timeout"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed?limit=20",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        print(f"Community feed endpoint responded successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
