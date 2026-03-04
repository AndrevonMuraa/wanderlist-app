"""
Iteration 22: API Cache Implementation Testing
Tests backend API endpoints return correct data for client-side caching.
Focus: /api/countries, /api/progress, /api/continent-stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestHealthEndpoints:
    """Basic health and connectivity tests"""

    def test_api_reachable(self, api_client):
        """Test: API is reachable"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"API unreachable: {response.status_code}"
        print("PASS: API is reachable")


class TestCountriesEndpoint:
    """Tests for GET /api/countries - verify aggregation returns correct data"""

    def test_countries_returns_200(self, api_client):
        """Test: /api/countries returns 200"""
        response = api_client.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/countries returns 200")

    def test_countries_returns_list(self, api_client):
        """Test: /api/countries returns a list"""
        response = api_client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Expected non-empty list"
        print(f"PASS: /api/countries returns list with {len(data)} countries")

    def test_countries_have_landmark_count(self, api_client):
        """Test: Countries have landmark_count field"""
        response = api_client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        
        # Check first 5 countries for landmark_count
        for country in data[:5]:
            assert "landmark_count" in country, f"Missing landmark_count in {country.get('name', 'unknown')}"
            assert isinstance(country["landmark_count"], int), f"landmark_count should be int"
        
        print("PASS: Countries have landmark_count field (integer)")

    def test_countries_have_total_points(self, api_client):
        """Test: Countries have total_points field"""
        response = api_client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        
        # Check first 5 countries for total_points
        for country in data[:5]:
            assert "total_points" in country, f"Missing total_points in {country.get('name', 'unknown')}"
            assert isinstance(country["total_points"], int), f"total_points should be int"
        
        print("PASS: Countries have total_points field (integer)")

    def test_countries_have_required_fields(self, api_client):
        """Test: Countries have all required fields"""
        response = api_client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        
        required_fields = ["country_id", "name", "continent", "landmark_count", "total_points"]
        
        for country in data[:5]:
            for field in required_fields:
                assert field in country, f"Missing {field} in country"
        
        print(f"PASS: Countries have all required fields: {required_fields}")


class TestProgressEndpoint:
    """Tests for GET /api/progress - verify continent data is correct"""

    def test_progress_returns_200(self, api_client):
        """Test: /api/progress returns 200"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/progress returns 200")

    def test_progress_has_overall_stats(self, api_client):
        """Test: /api/progress has overall stats"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        data = response.json()
        
        assert "overall" in data, "Missing 'overall' in progress data"
        assert "visited" in data["overall"], "Missing 'visited' in overall"
        assert "total" in data["overall"], "Missing 'total' in overall"
        assert "percentage" in data["overall"], "Missing 'percentage' in overall"
        
        print("PASS: /api/progress has overall stats (visited, total, percentage)")

    def test_progress_has_continents(self, api_client):
        """Test: /api/progress has continents data"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        data = response.json()
        
        assert "continents" in data, "Missing 'continents' in progress data"
        assert isinstance(data["continents"], dict), "continents should be a dict"
        
        # Should have at least some continents
        assert len(data["continents"]) > 0, "No continents found"
        
        print(f"PASS: /api/progress has {len(data['continents'])} continents")

    def test_progress_continent_structure(self, api_client):
        """Test: Each continent has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        data = response.json()
        
        required_fields = ["visited", "total", "percentage"]
        
        for continent_name, continent_data in data["continents"].items():
            for field in required_fields:
                assert field in continent_data, f"Missing {field} in continent {continent_name}"
        
        print(f"PASS: Continent data has correct structure: {required_fields}")

    def test_progress_has_countries(self, api_client):
        """Test: /api/progress has countries data"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        data = response.json()
        
        assert "countries" in data, "Missing 'countries' in progress data"
        assert isinstance(data["countries"], dict), "countries should be a dict"
        
        print(f"PASS: /api/progress has {len(data['countries'])} countries")

    def test_progress_has_total_points(self, api_client):
        """Test: /api/progress has totalPoints"""
        response = api_client.get(f"{BASE_URL}/api/progress")
        data = response.json()
        
        assert "totalPoints" in data, "Missing 'totalPoints' in progress data"
        assert isinstance(data["totalPoints"], (int, float)), "totalPoints should be numeric"
        
        print(f"PASS: /api/progress has totalPoints: {data['totalPoints']}")


class TestContinentStatsEndpoint:
    """Tests for GET /api/continent-stats - verify 5 continents"""

    def test_continent_stats_returns_200(self, api_client):
        """Test: /api/continent-stats returns 200"""
        response = api_client.get(f"{BASE_URL}/api/continent-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/continent-stats returns 200")

    def test_continent_stats_has_continents_array(self, api_client):
        """Test: /api/continent-stats has continents array"""
        response = api_client.get(f"{BASE_URL}/api/continent-stats")
        data = response.json()
        
        assert "continents" in data, "Missing 'continents' key"
        assert isinstance(data["continents"], list), "continents should be a list"
        
        print("PASS: /api/continent-stats has continents array")

    def test_continent_stats_returns_5_continents(self, api_client):
        """Test: /api/continent-stats returns exactly 5 continents (Americas merged)"""
        response = api_client.get(f"{BASE_URL}/api/continent-stats")
        data = response.json()
        
        continents = data.get("continents", [])
        
        # Should have 5 continents (Europe, Asia, Africa, Americas, Oceania)
        # North/South America merged into Americas
        assert len(continents) == 5, f"Expected 5 continents, got {len(continents)}"
        
        continent_names = [c["continent"] for c in continents]
        print(f"PASS: /api/continent-stats returns 5 continents: {continent_names}")

    def test_continent_stats_has_correct_fields(self, api_client):
        """Test: Each continent has required fields"""
        response = api_client.get(f"{BASE_URL}/api/continent-stats")
        data = response.json()
        
        required_fields = ["continent", "total_landmarks", "total_points", "countries"]
        
        for continent in data.get("continents", []):
            for field in required_fields:
                assert field in continent, f"Missing {field} in continent {continent.get('continent', 'unknown')}"
        
        print(f"PASS: Continents have required fields: {required_fields}")

    def test_continent_stats_has_grand_total(self, api_client):
        """Test: /api/continent-stats has grand_total"""
        response = api_client.get(f"{BASE_URL}/api/continent-stats")
        data = response.json()
        
        assert "grand_total" in data, "Missing 'grand_total' key"
        assert "landmarks" in data["grand_total"], "Missing landmarks in grand_total"
        assert "points" in data["grand_total"], "Missing points in grand_total"
        assert "countries" in data["grand_total"], "Missing countries in grand_total"
        
        print(f"PASS: grand_total - {data['grand_total']['landmarks']} landmarks, {data['grand_total']['points']} points, {data['grand_total']['countries']} countries")


class TestVisitEndpoints:
    """Tests for visit-related endpoints (cache invalidation targets)"""

    def test_visits_endpoint_returns_200(self, api_client):
        """Test: /api/visits returns 200"""
        response = api_client.get(f"{BASE_URL}/api/visits")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/visits returns 200")

    def test_country_visits_endpoint_returns_200(self, api_client):
        """Test: /api/country-visits returns 200"""
        response = api_client.get(f"{BASE_URL}/api/country-visits")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/country-visits returns 200")

    def test_stats_endpoint_returns_200(self, api_client):
        """Test: /api/stats returns 200"""
        response = api_client.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/stats returns 200")

    def test_achievements_endpoint_returns_200(self, api_client):
        """Test: /api/achievements returns 200"""
        response = api_client.get(f"{BASE_URL}/api/achievements")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/achievements returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
