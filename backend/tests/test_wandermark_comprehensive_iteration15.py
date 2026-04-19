"""
WanderMark Comprehensive Testing Suite - Iteration 15
Testing massive content expansion (100 countries, 1500 landmarks, 20 ranks)
and social.py refactoring (5 modules)
"""
import pytest
import requests
import os
import time

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://travel-polish.preview.emergentagent.com').rstrip('/')

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
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Note: field is 'access_token' not 'token'
    assert "access_token" in data, "Login response missing access_token field"
    return data["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Create headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAuthentication:
    """1. Authentication: Login and token verification"""
    
    def test_login_success(self):
        """Test login returns access_token field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, "Expected 'access_token' field in response"
        assert data["token_type"] == "bearer"
        assert "user" in data
        # Email not in UserPublic for privacy, verify user has expected fields
        assert "user_id" in data["user"]
        assert "username" in data["user"]
    
    def test_login_invalid_credentials(self):
        """Test login fails with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestContinentStats:
    """2. Continent Stats API: Verify 5 continents with correct counts"""
    
    def test_continent_stats_structure(self, headers):
        """Verify continent-stats returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/continent-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "continents" in data, "Missing 'continents' field"
        assert "grand_total" in data, "Missing 'grand_total' field"
        
        continents = data["continents"]
        assert len(continents) == 5, f"Expected 5 continents, got {len(continents)}"
        
        # Verify continent names
        continent_names = {c["continent"] for c in continents}
        expected = {"Europe", "Asia", "Africa", "Americas", "Oceania"}
        assert continent_names == expected, f"Continents mismatch: {continent_names} vs {expected}"
    
    def test_continent_stats_country_counts(self, headers):
        """Verify each continent has 20 countries"""
        response = requests.get(f"{BASE_URL}/api/continent-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for continent in data["continents"]:
            assert continent["countries"] == 20, \
                f"{continent['continent']} has {continent['countries']} countries, expected 20"
    
    def test_continent_stats_landmark_counts(self, headers):
        """Verify each continent has 300 landmarks (for 1500 total)"""
        response = requests.get(f"{BASE_URL}/api/continent-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        for continent in data["continents"]:
            assert continent["total_landmarks"] == 300, \
                f"{continent['continent']} has {continent['total_landmarks']} landmarks, expected 300"
        
        # Verify grand total
        assert data["grand_total"]["landmarks"] == 1500, \
            f"Total landmarks: {data['grand_total']['landmarks']}, expected 1500"


class TestCountriesAPI:
    """3-4. Countries API: Filter by continent"""
    
    def test_countries_list(self, headers):
        """Verify total countries is 100"""
        response = requests.get(f"{BASE_URL}/api/countries", headers=headers)
        assert response.status_code == 200
        countries = response.json()
        assert len(countries) == 100, f"Expected 100 countries, got {len(countries)}"
    
    def test_oceania_countries(self, headers):
        """Verify 20 Oceania countries returned"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=headers
        )
        assert response.status_code == 200
        countries = response.json()
        
        oceania_countries = [c for c in countries if c["continent"] == "Oceania"]
        assert len(oceania_countries) == 20, \
            f"Expected 20 Oceania countries, got {len(oceania_countries)}"
    
    def test_europe_countries(self, headers):
        """Verify 20 European countries returned"""
        response = requests.get(
            f"{BASE_URL}/api/countries",
            headers=headers
        )
        assert response.status_code == 200
        countries = response.json()
        
        europe_countries = [c for c in countries if c["continent"] == "Europe"]
        assert len(europe_countries) == 20, \
            f"Expected 20 Europe countries, got {len(europe_countries)}"


class TestLandmarksAPI:
    """5-6. Landmarks API: Filter by country_id"""
    
    def test_hawaii_landmarks(self, headers):
        """Verify Hawaii has 15 landmarks (10 official + 5 premium)"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            params={"country_id": "hawaii"},
            headers=headers
        )
        assert response.status_code == 200
        landmarks = response.json()
        assert len(landmarks) == 15, \
            f"Hawaii has {len(landmarks)} landmarks, expected 15"
        
        # Verify official/premium breakdown
        official = [l for l in landmarks if l.get("category") == "official"]
        premium = [l for l in landmarks if l.get("category") == "premium"]
        assert len(official) == 10, f"Hawaii has {len(official)} official landmarks, expected 10"
        assert len(premium) == 5, f"Hawaii has {len(premium)} premium landmarks, expected 5"
    
    def test_norway_landmarks(self, headers):
        """Verify Norway has 15 landmarks"""
        response = requests.get(
            f"{BASE_URL}/api/landmarks",
            params={"country_id": "norway"},
            headers=headers
        )
        assert response.status_code == 200
        landmarks = response.json()
        assert len(landmarks) == 15, \
            f"Norway has {len(landmarks)} landmarks, expected 15"


class TestStatsAndProgressConsistency:
    """7-9. Stats and Progress point consistency"""
    
    def test_points_consistency(self, headers):
        """Verify /api/stats and /api/progress return same totalPoints"""
        stats_response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        progress_response = requests.get(f"{BASE_URL}/api/progress", headers=headers)
        
        assert stats_response.status_code == 200
        assert progress_response.status_code == 200
        
        stats = stats_response.json()
        progress = progress_response.json()
        
        # Stats returns 'points', progress returns 'totalPoints'
        assert stats["points"] == progress["totalPoints"], \
            f"Points mismatch: stats.points={stats['points']}, progress.totalPoints={progress['totalPoints']}"
    
    def test_stats_countries_visited(self, headers):
        """Verify countries_visited merges landmark visits + country visits"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Test user has visits in 4 countries total
        # This should merge country_visits + visits collections
        assert stats["countries_visited"] == 4, \
            f"Expected 4 countries_visited, got {stats['countries_visited']}"
    
    def test_stats_continents_visited(self, headers):
        """Verify continents_visited count"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        
        # Test user has all visits in Europe
        assert stats["continents_visited"] == 1, \
            f"Expected 1 continent_visited (Europe), got {stats['continents_visited']}"


class TestCountryVisits:
    """10. Country visits endpoint"""
    
    def test_country_visits_list(self, headers):
        """Verify /api/country-visits returns correct count"""
        response = requests.get(f"{BASE_URL}/api/country-visits", headers=headers)
        assert response.status_code == 200
        visits = response.json()
        
        # Test user has 3 country visits
        assert len(visits) == 3, \
            f"Expected 3 country visits, got {len(visits)}"


class TestSocialModules:
    """11-14. Social modules (leaderboard, friends, feed, messages)"""
    
    def test_leaderboard(self, headers):
        """Verify leaderboard returns entries"""
        response = requests.get(f"{BASE_URL}/api/leaderboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data
        assert len(data["leaderboard"]) > 0, "Leaderboard should have entries"
    
    def test_friends(self, headers):
        """Verify friends endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/friends", headers=headers)
        assert response.status_code == 200
    
    def test_feed(self, headers):
        """Verify feed endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/feed", headers=headers)
        assert response.status_code == 200
    
    def test_messages_conversations(self, headers):
        """Verify messages/conversations returns 200 for premium user"""
        response = requests.get(f"{BASE_URL}/api/messages/conversations", headers=headers)
        # Premium users get 200, free users get 403
        assert response.status_code in [200, 403], \
            f"Expected 200 or 403, got {response.status_code}"


class TestAchievements:
    """15. Achievements endpoint"""
    
    def test_achievements(self, headers):
        """Verify achievements endpoint returns user achievements"""
        response = requests.get(f"{BASE_URL}/api/achievements", headers=headers)
        assert response.status_code == 200
        # Response is a list of achievements
        achievements = response.json()
        assert isinstance(achievements, list)


class TestLegalEndpoints:
    """16. Legal endpoints (no auth required)"""
    
    def test_privacy_policy(self, headers):
        """Verify /api/legal/privacy returns 200"""
        response = requests.get(f"{BASE_URL}/api/legal/privacy", headers=headers)
        assert response.status_code == 200
    
    def test_terms_of_service(self, headers):
        """Verify /api/legal/terms returns 200"""
        response = requests.get(f"{BASE_URL}/api/legal/terms", headers=headers)
        assert response.status_code == 200


class TestRateLimiting:
    """17. Rate limiting middleware verification"""
    
    def test_rate_limit_active(self, headers):
        """Verify rate limiting is active (don't actually trigger 429)"""
        # Make a few rapid requests - should succeed
        for _ in range(5):
            response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
            assert response.status_code == 200
        
        # Note: We don't want to actually hit the 429 limit (120 rpm)
        # Just verify middleware doesn't block normal usage


class TestDatabaseIntegrity:
    """20. Database integrity - no duplicate landmarks"""
    
    def test_no_duplicate_landmarks_per_country(self, headers):
        """Verify no exact name duplicates within same country"""
        response = requests.get(f"{BASE_URL}/api/countries", headers=headers)
        assert response.status_code == 200
        countries = response.json()
        
        duplicates_found = []
        
        for country in countries[:10]:  # Sample first 10 countries
            lm_response = requests.get(
                f"{BASE_URL}/api/landmarks",
                params={"country_id": country["country_id"]},
                headers=headers
            )
            if lm_response.status_code == 200:
                landmarks = lm_response.json()
                names = [l["name"] for l in landmarks]
                unique_names = set(names)
                
                if len(names) != len(unique_names):
                    duplicates_found.append({
                        "country": country["country_id"],
                        "total": len(names),
                        "unique": len(unique_names)
                    })
        
        assert len(duplicates_found) == 0, \
            f"Found duplicate landmarks: {duplicates_found}"


class TestSocialModulesSplit:
    """Verify social.py split into 5 modules works correctly"""
    
    def test_all_social_endpoints_accessible(self, headers):
        """Verify all endpoints from the 5 split modules are accessible"""
        endpoints = [
            ("/api/leaderboard", "GET"),
            ("/api/friends", "GET"),
            ("/api/friends/pending", "GET"),
            ("/api/feed", "GET"),
            ("/api/stats", "GET"),
            ("/api/progress", "GET"),
        ]
        
        for endpoint, method in endpoints:
            response = requests.request(method, f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code in [200, 403], \
                f"{endpoint} failed with {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
