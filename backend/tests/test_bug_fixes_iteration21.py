"""
Backend Tests for Bug Fixes Iteration 21
Testing:
1. /api/countries endpoint - optimized with aggregation pipeline (no N+1 queries)
2. /api/progress endpoint - correct continent data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://audit-phase1.preview.emergentagent.com')

class TestSession:
    """Shared test session with authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@wandermark.app",
                "password": "Test1234!"
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestCountriesEndpoint(TestSession):
    """Tests for /api/countries endpoint optimization"""
    
    def test_countries_returns_200(self, auth_headers):
        """Test that /api/countries returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: /api/countries returns 200")
    
    def test_countries_returns_list(self, auth_headers):
        """Test that /api/countries returns a list of countries"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one country"
        print(f"PASS: /api/countries returns list with {len(data)} countries")
    
    def test_countries_have_landmark_count(self, auth_headers):
        """Test that each country has landmark_count field from aggregation"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check first 5 countries
        for i, country in enumerate(data[:5]):
            assert "landmark_count" in country, f"Country {country.get('name', 'unknown')} missing landmark_count"
            assert isinstance(country["landmark_count"], int), f"landmark_count should be int"
            print(f"  Country: {country.get('name')} - landmark_count: {country['landmark_count']}")
        
        print(f"PASS: Countries have landmark_count field from aggregation")
    
    def test_countries_have_total_points(self, auth_headers):
        """Test that each country has total_points field from aggregation"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check first 5 countries
        for i, country in enumerate(data[:5]):
            assert "total_points" in country, f"Country {country.get('name', 'unknown')} missing total_points"
            assert isinstance(country["total_points"], int), f"total_points should be int"
            print(f"  Country: {country.get('name')} - total_points: {country['total_points']}")
        
        print(f"PASS: Countries have total_points field from aggregation")
    
    def test_countries_structure(self, auth_headers):
        """Test that countries have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check first country has all expected fields
        country = data[0]
        required_fields = ["country_id", "name", "continent", "landmark_count", "total_points"]
        for field in required_fields:
            assert field in country, f"Missing field: {field}"
        
        print(f"PASS: Countries have all required fields: {required_fields}")
    
    def test_countries_landmark_count_is_positive_or_zero(self, auth_headers):
        """Test that landmark_count is >= 0 for all countries"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for country in data:
            assert country.get("landmark_count", -1) >= 0, f"Invalid landmark_count for {country.get('name')}"
        
        print(f"PASS: All {len(data)} countries have valid landmark_count >= 0")


class TestProgressEndpoint(TestSession):
    """Tests for /api/progress endpoint"""
    
    def test_progress_returns_200(self, auth_headers):
        """Test that /api/progress returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: /api/progress returns 200")
    
    def test_progress_has_overall_stats(self, auth_headers):
        """Test that progress has overall statistics"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "overall" in data, "Missing overall stats"
        assert "visited" in data["overall"], "Missing visited count"
        assert "total" in data["overall"], "Missing total count"
        assert "percentage" in data["overall"], "Missing percentage"
        
        print(f"PASS: Progress has overall stats - visited: {data['overall']['visited']}, total: {data['overall']['total']}, percentage: {data['overall']['percentage']}%")
    
    def test_progress_has_continents(self, auth_headers):
        """Test that progress has continent data"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "continents" in data, "Missing continents data"
        continents = data["continents"]
        assert isinstance(continents, dict), "Continents should be a dictionary"
        
        # Should have at least one continent
        assert len(continents) > 0, "Should have at least one continent"
        
        print(f"PASS: Progress has {len(continents)} continents:")
        for continent_name, continent_data in continents.items():
            print(f"  {continent_name}: visited {continent_data['visited']}/{continent_data['total']} ({continent_data['percentage']}%)")
    
    def test_progress_continent_structure(self, auth_headers):
        """Test that each continent has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        continents = data["continents"]
        required_fields = ["visited", "total", "percentage"]
        
        for continent_name, continent_data in continents.items():
            for field in required_fields:
                assert field in continent_data, f"Continent {continent_name} missing field: {field}"
        
        print(f"PASS: All continents have required fields: {required_fields}")
    
    def test_progress_has_countries(self, auth_headers):
        """Test that progress has country data"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "countries" in data, "Missing countries data"
        countries = data["countries"]
        assert isinstance(countries, dict), "Countries should be a dictionary"
        assert len(countries) > 0, "Should have at least one country"
        
        print(f"PASS: Progress has {len(countries)} countries")
    
    def test_progress_country_structure(self, auth_headers):
        """Test that each country has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        countries = data["countries"]
        required_fields = ["country_name", "continent", "visited", "total", "percentage"]
        
        # Check first 3 countries
        country_ids = list(countries.keys())[:3]
        for country_id in country_ids:
            country_data = countries[country_id]
            for field in required_fields:
                assert field in country_data, f"Country {country_id} missing field: {field}"
            print(f"  {country_data['country_name']} ({country_data['continent']}): {country_data['visited']}/{country_data['total']} ({country_data['percentage']}%)")
        
        print(f"PASS: Countries have required fields: {required_fields}")
    
    def test_progress_has_total_points(self, auth_headers):
        """Test that progress has totalPoints field"""
        response = requests.get(
            f"{BASE_URL}/api/progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "totalPoints" in data, "Missing totalPoints field"
        assert isinstance(data["totalPoints"], int), "totalPoints should be an integer"
        
        print(f"PASS: Progress has totalPoints: {data['totalPoints']}")


class TestAuthRequired(TestSession):
    """Tests for authentication requirements"""
    
    def test_countries_requires_auth(self):
        """Test that /api/countries requires authentication"""
        response = requests.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 401 or response.status_code == 403, "Should require auth"
        print(f"PASS: /api/countries requires authentication")
    
    def test_progress_requires_auth(self):
        """Test that /api/progress requires authentication"""
        response = requests.get(f"{BASE_URL}/api/progress")
        assert response.status_code == 401 or response.status_code == 403, "Should require auth"
        print(f"PASS: /api/progress requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
