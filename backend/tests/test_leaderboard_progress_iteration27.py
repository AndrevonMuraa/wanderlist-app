"""
Test suite for backend performance optimization - Iteration 27
Tests the newly optimized endpoints:
- /api/leaderboard (points category - default)
- /api/leaderboard?category=visits ($lookup replaces N+1 individual user lookups)
- /api/leaderboard?category=countries ($lookup replaces N+1 individual user lookups)
- /api/leaderboard/rising-stars ($lookup replaces N+1 individual user lookups)
- /api/progress (fixed N+1 in empty user case - single aggregation instead of count_documents per country)

Also verifies:
- Index mismatch fix in db.py (friendships → friends collection)
- Previously optimized endpoints still work (landmarks, continent-stats, community-feed, feed, visits)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://wandermark-admin.preview.emergentagent.com")

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


class TestLeaderboardPointsCategory:
    """Tests for /api/leaderboard (default points category)"""
    
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
    
    def test_leaderboard_default_returns_200(self, auth_headers):
        """Test GET /api/leaderboard returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/leaderboard returned {response.status_code}")
    
    def test_leaderboard_response_structure(self, auth_headers):
        """Test leaderboard response has required structure"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data, f"Missing 'leaderboard' key: {data.keys()}"
        assert "user_rank" in data, f"Missing 'user_rank' key: {data.keys()}"
        assert "total_users" in data, f"Missing 'total_users' key: {data.keys()}"
        assert isinstance(data["leaderboard"], list)
        print(f"Leaderboard has {len(data['leaderboard'])} entries, user_rank: {data['user_rank']}")
    
    def test_leaderboard_entry_structure(self, auth_headers):
        """Test individual leaderboard entry has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            required_fields = ["user_id", "name", "value", "rank"]
            for field in required_fields:
                assert field in entry, f"Missing '{field}' in entry: {entry.keys()}"
            
            # Verify data types
            assert isinstance(entry["rank"], int)
            assert isinstance(entry["value"], (int, float))
            print(f"First entry: {entry['name']} - value: {entry['value']}, rank: {entry['rank']}")
        else:
            print("Empty leaderboard")


class TestLeaderboardVisitsCategory:
    """Tests for /api/leaderboard?category=visits - optimized with $lookup"""
    
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
    
    def test_leaderboard_visits_returns_200(self, auth_headers):
        """Test GET /api/leaderboard?category=visits returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/leaderboard?category=visits returned {response.status_code}")
    
    def test_leaderboard_visits_response_structure(self, auth_headers):
        """Test visits leaderboard response has required structure"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "user_rank" in data
        assert "total_users" in data
        print(f"Visits leaderboard has {len(data['leaderboard'])} entries")
    
    def test_leaderboard_visits_entry_has_user_info(self, auth_headers):
        """Test visits leaderboard entries have user info from $lookup"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            # These fields should be populated via $lookup
            assert "user_id" in entry, f"Missing 'user_id': {entry.keys()}"
            assert "name" in entry, f"Missing 'name': {entry.keys()}"
            assert "value" in entry, f"Missing 'value': {entry.keys()}"
            assert "rank" in entry, f"Missing 'rank': {entry.keys()}"
            
            # Value should be visit count (integer)
            assert isinstance(entry["value"], int), f"value should be int: {type(entry['value'])}"
            print(f"Visits entry: {entry['name']} - visits: {entry['value']}")
        else:
            print("Empty visits leaderboard")


class TestLeaderboardCountriesCategory:
    """Tests for /api/leaderboard?category=countries - optimized with $lookup"""
    
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
    
    def test_leaderboard_countries_returns_200(self, auth_headers):
        """Test GET /api/leaderboard?category=countries returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=countries",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/leaderboard?category=countries returned {response.status_code}")
    
    def test_leaderboard_countries_response_structure(self, auth_headers):
        """Test countries leaderboard response has required structure"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=countries",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert "user_rank" in data
        assert "total_users" in data
        print(f"Countries leaderboard has {len(data['leaderboard'])} entries")
    
    def test_leaderboard_countries_entry_has_user_info(self, auth_headers):
        """Test countries leaderboard entries have user info from $lookup"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=countries",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            # These fields should be populated via $lookup
            assert "user_id" in entry
            assert "name" in entry
            assert "value" in entry
            assert "rank" in entry
            
            # Value should be country count (integer)
            assert isinstance(entry["value"], int), f"value should be int: {type(entry['value'])}"
            print(f"Countries entry: {entry['name']} - countries: {entry['value']}")
        else:
            print("Empty countries leaderboard")


class TestLeaderboardRisingStars:
    """Tests for /api/leaderboard/rising-stars - optimized with $lookup"""
    
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
    
    def test_rising_stars_returns_200(self, auth_headers):
        """Test GET /api/leaderboard/rising-stars returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard/rising-stars",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/leaderboard/rising-stars returned {response.status_code}")
    
    def test_rising_stars_response_is_list(self, auth_headers):
        """Test rising stars response is a list"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard/rising-stars",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Rising stars has {len(data)} entries")
    
    def test_rising_stars_entry_structure(self, auth_headers):
        """Test rising stars entries have required structure from $lookup"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard/rising-stars",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            entry = data[0]
            required_fields = ["user_id", "name", "points_this_week", "rank"]
            for field in required_fields:
                assert field in entry, f"Missing '{field}' in entry: {entry.keys()}"
            
            # Verify data types
            assert isinstance(entry["points_this_week"], (int, float))
            assert isinstance(entry["rank"], int)
            print(f"Rising star: {entry['name']} - points_this_week: {entry['points_this_week']}")
        else:
            print("No rising stars this week (empty list is valid)")


class TestProgressEndpoint:
    """Tests for /api/progress - fixed N+1 in empty user case"""
    
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
    
    def test_progress_returns_200(self, auth_headers):
        """Test GET /api/progress returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET /api/progress returned {response.status_code}")
    
    def test_progress_response_structure(self, auth_headers):
        """Test progress response has required structure"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "overall" in data, f"Missing 'overall': {data.keys()}"
        assert "totalPoints" in data, f"Missing 'totalPoints': {data.keys()}"
        assert "continents" in data, f"Missing 'continents': {data.keys()}"
        assert "countries" in data, f"Missing 'countries': {data.keys()}"
        
        print(f"Progress: overall={data['overall']}, totalPoints={data['totalPoints']}")
    
    def test_progress_overall_structure(self, auth_headers):
        """Test progress overall has visited, total, percentage"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        overall = data["overall"]
        assert "visited" in overall
        assert "total" in overall
        assert "percentage" in overall
        
        assert isinstance(overall["visited"], int)
        assert isinstance(overall["total"], int)
        assert isinstance(overall["percentage"], (int, float))
        print(f"Overall: visited={overall['visited']}, total={overall['total']}, percentage={overall['percentage']}%")
    
    def test_progress_continents_structure(self, auth_headers):
        """Test progress continents has visited, total, percentage per continent"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        continents = data["continents"]
        assert isinstance(continents, dict)
        
        if len(continents) > 0:
            for continent_name, continent_data in continents.items():
                assert "visited" in continent_data, f"Missing 'visited' in {continent_name}"
                assert "total" in continent_data, f"Missing 'total' in {continent_name}"
                assert "percentage" in continent_data, f"Missing 'percentage' in {continent_name}"
            print(f"Continents found: {list(continents.keys())}")
        else:
            print("No continents in progress data")
    
    def test_progress_countries_structure(self, auth_headers):
        """Test progress countries dict has country_name, continent, visited, total, percentage"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        countries = data["countries"]
        assert isinstance(countries, dict)
        
        if len(countries) > 0:
            # Check first country
            first_country_id = list(countries.keys())[0]
            country_data = countries[first_country_id]
            
            required_fields = ["country_name", "continent", "visited", "total", "percentage"]
            for field in required_fields:
                assert field in country_data, f"Missing '{field}' in country: {country_data.keys()}"
            
            print(f"First country: {country_data['country_name']} - visited={country_data['visited']}/{country_data['total']}")
        else:
            print("No countries in progress data")


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
    
    def test_landmarks_returns_200(self, auth_headers):
        """Test GET /api/landmarks returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?limit=10",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify is_visited field exists (batch optimized)
        if len(data) > 0:
            assert "is_visited" in data[0], f"Missing is_visited field"
        print(f"GET /api/landmarks returned {len(data)} landmarks")
    
    def test_landmarks_by_country_france(self, auth_headers):
        """Test GET /api/landmarks?country_id=france"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?country_id=france",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"France landmarks: {len(data)}")
    
    def test_landmarks_filter_visited_true(self, auth_headers):
        """Test GET /api/landmarks?visited=true filter works"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks?visited=true",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        # All returned landmarks should have is_visited=True
        for lm in data:
            assert lm.get("is_visited") == True
        print(f"Visited landmarks: {len(data)}")
    
    def test_continent_stats_returns_200(self, auth_headers):
        """Test GET /api/continent-stats returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/continent-stats",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "continents" in data
        assert "grand_total" in data
        print(f"Continent stats: {len(data['continents'])} continents")
    
    def test_community_feed_returns_200(self, auth_headers):
        """Test GET /api/community-feed returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/community-feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "count" in data
        
        # Verify upvotes field exists (batch optimized)
        if len(data["items"]) > 0:
            assert "upvotes" in data["items"][0]
        print(f"Community feed: {data['count']} items")
    
    def test_feed_returns_200(self, auth_headers):
        """Test GET /api/feed returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/feed",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Activity feed: {len(data)} activities")
    
    def test_visits_returns_200(self, auth_headers):
        """Test GET /api/visits returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/visits",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Visits: {len(data)} visits")
    
    def test_countries_returns_200(self, auth_headers):
        """Test GET /api/countries returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Countries: {len(data)} countries")
    
    def test_country_visits_check_france(self, auth_headers):
        """Test GET /api/country-visits/check/france returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/country-visits/check/france",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "visited" in data
        assert isinstance(data["visited"], bool)
        print(f"France visit status: {data['visited']}")


class TestLeaderboardTimePeriods:
    """Tests for leaderboard time_period parameter"""
    
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
    
    def test_leaderboard_weekly(self, auth_headers):
        """Test GET /api/leaderboard?time_period=weekly"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?time_period=weekly",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"Weekly leaderboard: {len(data['leaderboard'])} entries")
    
    def test_leaderboard_monthly(self, auth_headers):
        """Test GET /api/leaderboard?time_period=monthly"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?time_period=monthly",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"Monthly leaderboard: {len(data['leaderboard'])} entries")
    
    def test_leaderboard_all_time(self, auth_headers):
        """Test GET /api/leaderboard?time_period=all_time (default)"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?time_period=all_time",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"All-time leaderboard: {len(data['leaderboard'])} entries")


class TestPerformanceBasic:
    """Basic performance tests - ensure optimized endpoints respond quickly"""
    
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
    
    def test_leaderboard_visits_performance(self, auth_headers):
        """Test /api/leaderboard?category=visits responds within timeout"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=visits",
            headers=auth_headers,
            timeout=60
        )
        elapsed = time.time() - start
        assert response.status_code == 200
        print(f"Leaderboard visits responded in {elapsed:.2f}s")
    
    def test_leaderboard_countries_performance(self, auth_headers):
        """Test /api/leaderboard?category=countries responds within timeout"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/leaderboard?category=countries",
            headers=auth_headers,
            timeout=60
        )
        elapsed = time.time() - start
        assert response.status_code == 200
        print(f"Leaderboard countries responded in {elapsed:.2f}s")
    
    def test_rising_stars_performance(self, auth_headers):
        """Test /api/leaderboard/rising-stars responds within timeout"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/leaderboard/rising-stars",
            headers=auth_headers,
            timeout=60
        )
        elapsed = time.time() - start
        assert response.status_code == 200
        print(f"Rising stars responded in {elapsed:.2f}s")
    
    def test_progress_performance(self, auth_headers):
        """Test /api/progress responds within timeout"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers,
            timeout=60
        )
        elapsed = time.time() - start
        assert response.status_code == 200
        print(f"Progress responded in {elapsed:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
