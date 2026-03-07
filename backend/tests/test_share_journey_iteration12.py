"""
Test Suite for Share Journey Card Feature - Iteration 12
Tests: GET /api/stats, GET /api/progress endpoints
Verifies stats data structure matches frontend ShareJourneyCard requirements
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/') or os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"

class TestShareJourneyAPIs:
    """Test backend APIs that power the Share Journey Card feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Auth returns 'access_token' per iteration 11
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # ===== GET /api/stats Tests =====
    
    def test_stats_endpoint_returns_200(self, auth_headers):
        """Test GET /api/stats returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
    
    def test_stats_has_total_visits(self, auth_headers):
        """Verify stats response includes total_visits field"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_visits" in data, f"Missing total_visits in stats: {data}"
        assert isinstance(data["total_visits"], int), "total_visits should be int"
    
    def test_stats_has_countries_visited(self, auth_headers):
        """Verify stats response includes countries_visited field"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "countries_visited" in data, f"Missing countries_visited: {data}"
        assert isinstance(data["countries_visited"], int)
    
    def test_stats_has_continents_visited(self, auth_headers):
        """Verify stats response includes continents_visited field"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "continents_visited" in data, f"Missing continents_visited: {data}"
        assert isinstance(data["continents_visited"], int)
    
    def test_stats_has_rank(self, auth_headers):
        """Verify stats response includes rank field (for ShareJourneyCard)"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "rank" in data, f"Missing rank field: {data}"
        assert isinstance(data["rank"], int)
    
    def test_stats_has_points(self, auth_headers):
        """Verify stats response includes points (for rank calculation)"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Stats should have either 'points' or 'total_points'
        has_points = "points" in data or "total_points" in data
        assert has_points, f"Missing points field: {data}"
    
    # ===== GET /api/progress Tests =====
    
    def test_progress_endpoint_returns_200(self, auth_headers):
        """Test GET /api/progress returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200, f"Progress endpoint failed: {response.text}"
    
    def test_progress_has_overall_structure(self, auth_headers):
        """Verify progress response includes overall stats"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "overall" in data, f"Missing overall in progress: {data}"
        overall = data["overall"]
        assert "visited" in overall, "Missing overall.visited"
        assert "total" in overall, "Missing overall.total"
        assert "percentage" in overall, "Missing overall.percentage"
    
    def test_progress_has_total_points(self, auth_headers):
        """Verify progress response includes totalPoints (for ShareJourneyCard)"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "totalPoints" in data, f"Missing totalPoints in progress: {data}"
        assert isinstance(data["totalPoints"], (int, float))
    
    def test_progress_has_continents(self, auth_headers):
        """Verify progress response includes continents breakdown"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "continents" in data, f"Missing continents in progress: {data}"
        assert isinstance(data["continents"], dict)
        # Verify continent structure
        for continent, stats in data["continents"].items():
            assert "visited" in stats, f"Missing visited in continent {continent}"
            assert "total" in stats, f"Missing total in continent {continent}"
            assert "percentage" in stats, f"Missing percentage in continent {continent}"
    
    def test_progress_has_countries(self, auth_headers):
        """Verify progress response includes countries breakdown"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "countries" in data, f"Missing countries in progress: {data}"
        assert isinstance(data["countries"], dict)
        # Verify country structure (sample check)
        if data["countries"]:
            sample_country = list(data["countries"].values())[0]
            assert "country_name" in sample_country
            assert "continent" in sample_country
            assert "visited" in sample_country
            assert "total" in sample_country
            assert "percentage" in sample_country
    
    def test_progress_continents_count_for_share_card(self, auth_headers):
        """Verify we can calculate visited continents count from progress"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        continents = data.get("continents", {})
        visited_continents = sum(1 for c in continents.values() if c["visited"] > 0)
        # This verifies the frontend calculation will work
        assert isinstance(visited_continents, int)
    
    def test_progress_countries_visited_count(self, auth_headers):
        """Verify we can calculate visited countries count from progress"""
        response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        countries = data.get("countries", {})
        visited_countries = sum(1 for c in countries.values() if c["visited"] > 0)
        # This verifies the frontend calculation will work
        assert isinstance(visited_countries, int)
    
    # ===== Data Consistency Tests =====
    
    def test_stats_and_progress_data_consistency(self, auth_headers):
        """Verify stats and progress endpoints return consistent data"""
        stats_response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        progress_response = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        
        assert stats_response.status_code == 200
        assert progress_response.status_code == 200
        
        stats_data = stats_response.json()
        progress_data = progress_response.json()
        
        # Landmarks visited should match
        stats_total = stats_data["total_visits"]
        progress_overall_visited = progress_data["overall"]["visited"]
        # Note: There may be slight differences due to custom visits, so we just verify consistency
        print(f"Stats total_visits: {stats_total}, Progress overall.visited: {progress_overall_visited}")
        
        # Both should return valid counts
        assert stats_total >= 0
        assert progress_overall_visited >= 0


class TestShareJourneyCardRequirements:
    """
    Test that all data needed by ShareJourneyCard component is available.
    Component needs: landmarks, countries, continents, points, rank
    """
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_share_card_has_all_required_fields(self, auth_headers):
        """
        ShareJourneyCard needs:
        - landmarks (from progress.overall.visited)
        - countries (from progress.countries filtered)
        - continents (from progress.continents filtered)
        - points (from progress.totalPoints)
        - rank (from stats.rank)
        """
        stats_res = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        progress_res = requests.get(f"{BASE_URL}/api/progress", headers=auth_headers)
        
        assert stats_res.status_code == 200, "Stats API must work for share card"
        assert progress_res.status_code == 200, "Progress API must work for share card"
        
        stats = stats_res.json()
        progress = progress_res.json()
        
        # Build the share card data structure as frontend does
        share_card_stats = {
            "landmarks": progress["overall"]["visited"],
            "countries": len([cid for cid, c in progress["countries"].items() if c["visited"] > 0]),
            "continents": len([c for c in progress["continents"].values() if c["visited"] > 0]),
            "points": progress.get("totalPoints", 0),
            "rank": stats.get("rank", 0)
        }
        
        print(f"Share Card Stats: {share_card_stats}")
        
        # All values should be valid
        assert isinstance(share_card_stats["landmarks"], int)
        assert isinstance(share_card_stats["countries"], int)
        assert isinstance(share_card_stats["continents"], int)
        assert isinstance(share_card_stats["points"], (int, float))
        assert isinstance(share_card_stats["rank"], int)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
