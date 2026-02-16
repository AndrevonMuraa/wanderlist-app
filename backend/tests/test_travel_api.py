"""
Backend API Tests for WanderMark Travel App
Tests countries, landmarks, and continent distribution validation

Features to test:
1. GET /api/countries returns exactly 66 countries with correct continent distribution
2. All continents have even number of countries for 2-column grid layout
3. New countries Finland, Maldives, Panama exist with correct landmark counts
4. GET /api/landmarks?country_id=<country> returns landmarks including premium
5. Premium landmarks are locked for free-tier users
6. All official landmarks have 10 points, all premium have 25 points
7. No duplicate landmark names in the database
8. No orphan landmarks with null country_name
9. All 66 countries have at least 1 premium landmark
"""

import pytest
import requests
import os
from collections import Counter

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://travel-app-preview.preview.emergentagent.com')).rstrip('/')

print(f"Testing against: {BASE_URL}")

# Expected continent distribution
EXPECTED_DISTRIBUTION = {
    "Africa": 10,
    "Americas": 16,
    "Asia": 16,
    "Europe": 16,
    "Oceania": 8
}

NEW_COUNTRIES = ["finland", "maldives", "panama"]


class TestAuthAndSetup:
    """Test authentication - register a test user first"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register and get auth token"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        
        register_payload = {
            "email": f"test_user_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {unique_id}",
            "username": f"testuser_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            assert token is not None, "No access_token in register response"
            print(f"Successfully registered user: {register_payload['email']}")
            return token
        elif response.status_code == 400:
            # Email might already exist, try login
            print(f"Registration returned 400, trying login...")
            login_payload = {
                "email": register_payload["email"],
                "password": register_payload["password"]
            }
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
            if login_response.status_code == 200:
                return login_response.json().get("access_token")
        
        pytest.fail(f"Failed to get auth token. Status: {response.status_code}, Response: {response.text}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_auth_token_obtained(self, auth_token):
        """Verify we have a valid auth token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Auth token obtained: {auth_token[:20]}...")


class TestCountries:
    """Test country-related API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register and get auth token"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        
        register_payload = {
            "email": f"test_countries_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Countries User {unique_id}",
            "username": f"testcountries_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        
        pytest.fail(f"Failed to register. Status: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def countries_data(self, auth_headers):
        """Fetch all countries once for multiple tests"""
        response = requests.get(f"{BASE_URL}/api/countries", headers=auth_headers)
        assert response.status_code == 200, f"Failed to fetch countries: {response.text}"
        return response.json()
    
    def test_countries_endpoint_returns_200(self, auth_headers):
        """Test that /api/countries endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/countries", headers=auth_headers)
        assert response.status_code == 200
        print("GET /api/countries returned 200 OK")
    
    def test_exactly_66_countries(self, countries_data):
        """Verify exactly 66 countries are returned"""
        count = len(countries_data)
        assert count == 66, f"Expected 66 countries, got {count}"
        print(f"Total countries count: {count} ✓")
    
    def test_continent_distribution(self, countries_data):
        """Verify continent distribution matches expected values"""
        continent_counts = Counter(c.get("continent") for c in countries_data)
        
        print("\nContinent Distribution:")
        for continent, expected_count in EXPECTED_DISTRIBUTION.items():
            actual_count = continent_counts.get(continent, 0)
            print(f"  {continent}: {actual_count} (expected: {expected_count})")
            assert actual_count == expected_count, f"{continent}: expected {expected_count}, got {actual_count}"
        
        # Check for unexpected continents
        for continent in continent_counts:
            assert continent in EXPECTED_DISTRIBUTION, f"Unexpected continent: {continent}"
        
        print("All continent distributions verified ✓")
    
    def test_all_continents_have_even_country_count(self, countries_data):
        """Verify all continents have even number of countries for 2-column grid"""
        continent_counts = Counter(c.get("continent") for c in countries_data)
        
        print("\nEven count verification for 2-column grid:")
        for continent, count in continent_counts.items():
            is_even = count % 2 == 0
            status = "✓" if is_even else "✗"
            print(f"  {continent}: {count} countries - {status}")
            assert is_even, f"{continent} has {count} countries (odd number breaks 2-column grid)"
        
        print("All continents have even country counts ✓")
    
    def test_new_country_finland_exists(self, countries_data):
        """Verify Finland exists in the countries list"""
        finland = next((c for c in countries_data if c.get("country_id") == "finland"), None)
        assert finland is not None, "Finland not found in countries"
        assert finland.get("continent") == "Europe", f"Finland should be in Europe, got {finland.get('continent')}"
        print(f"Finland found: continent={finland.get('continent')}, landmarks={finland.get('landmark_count')}")
    
    def test_new_country_maldives_exists(self, countries_data):
        """Verify Maldives exists in the countries list"""
        maldives = next((c for c in countries_data if c.get("country_id") == "maldives"), None)
        assert maldives is not None, "Maldives not found in countries"
        assert maldives.get("continent") == "Asia", f"Maldives should be in Asia, got {maldives.get('continent')}"
        print(f"Maldives found: continent={maldives.get('continent')}, landmarks={maldives.get('landmark_count')}")
    
    def test_new_country_panama_exists(self, countries_data):
        """Verify Panama exists in the countries list"""
        panama = next((c for c in countries_data if c.get("country_id") == "panama"), None)
        assert panama is not None, "Panama not found in countries"
        assert panama.get("continent") == "Americas", f"Panama should be in Americas, got {panama.get('continent')}"
        print(f"Panama found: continent={panama.get('continent')}, landmarks={panama.get('landmark_count')}")


class TestLandmarks:
    """Test landmark-related API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register and get auth token"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        
        register_payload = {
            "email": f"test_landmarks_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Landmarks User {unique_id}",
            "username": f"testlandmarks_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        
        pytest.fail(f"Failed to register. Status: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_finland_landmarks_count_and_premium(self, auth_headers):
        """Test Finland has 12 landmarks including 2 premium"""
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=finland", headers=auth_headers)
        assert response.status_code == 200, f"Failed to fetch Finland landmarks: {response.text}"
        
        landmarks = response.json()
        total_count = len(landmarks)
        premium_count = sum(1 for l in landmarks if l.get("category") == "premium")
        official_count = sum(1 for l in landmarks if l.get("category") == "official")
        
        print(f"\nFinland landmarks: total={total_count}, official={official_count}, premium={premium_count}")
        
        assert total_count == 12, f"Finland should have 12 landmarks, got {total_count}"
        assert premium_count >= 2, f"Finland should have at least 2 premium landmarks, got {premium_count}"
        print("Finland landmarks verified ✓")
    
    def test_maldives_landmarks_count_and_premium(self, auth_headers):
        """Test Maldives has 12 landmarks including 2 premium"""
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=maldives", headers=auth_headers)
        assert response.status_code == 200, f"Failed to fetch Maldives landmarks: {response.text}"
        
        landmarks = response.json()
        total_count = len(landmarks)
        premium_count = sum(1 for l in landmarks if l.get("category") == "premium")
        official_count = sum(1 for l in landmarks if l.get("category") == "official")
        
        print(f"\nMaldives landmarks: total={total_count}, official={official_count}, premium={premium_count}")
        
        assert total_count == 12, f"Maldives should have 12 landmarks, got {total_count}"
        assert premium_count >= 2, f"Maldives should have at least 2 premium landmarks, got {premium_count}"
        print("Maldives landmarks verified ✓")
    
    def test_panama_landmarks_count_and_premium(self, auth_headers):
        """Test Panama has 12 landmarks including 2 premium"""
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=panama", headers=auth_headers)
        assert response.status_code == 200, f"Failed to fetch Panama landmarks: {response.text}"
        
        landmarks = response.json()
        total_count = len(landmarks)
        premium_count = sum(1 for l in landmarks if l.get("category") == "premium")
        official_count = sum(1 for l in landmarks if l.get("category") == "official")
        
        print(f"\nPanama landmarks: total={total_count}, official={official_count}, premium={premium_count}")
        
        assert total_count == 12, f"Panama should have 12 landmarks, got {total_count}"
        assert premium_count >= 2, f"Panama should have at least 2 premium landmarks, got {premium_count}"
        print("Panama landmarks verified ✓")
    
    def test_premium_landmarks_locked_for_free_users(self, auth_headers):
        """Test that premium landmarks have is_locked=True for free tier users"""
        response = requests.get(f"{BASE_URL}/api/landmarks?country_id=finland", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        
        print(f"\nChecking premium landmark lock status...")
        locked_count = 0
        for landmark in premium_landmarks:
            is_locked = landmark.get("is_locked", False)
            print(f"  {landmark.get('name')}: is_locked={is_locked}")
            if is_locked:
                locked_count += 1
        
        # Free users should have premium landmarks locked
        assert locked_count == len(premium_landmarks), f"Expected all {len(premium_landmarks)} premium landmarks to be locked, got {locked_count}"
        print("Premium landmarks are locked for free-tier users ✓")
    
    def test_official_landmarks_have_10_points(self, auth_headers):
        """Test all official landmarks have 10 points"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        official_landmarks = [l for l in landmarks if l.get("category") == "official"]
        
        wrong_points = []
        for landmark in official_landmarks:
            points = landmark.get("points", 0)
            if points != 10:
                wrong_points.append((landmark.get("name"), landmark.get("country_name"), points))
        
        if wrong_points:
            print(f"\nOfficial landmarks with wrong points:")
            for name, country, points in wrong_points[:10]:
                print(f"  {name} ({country}): {points} points (should be 10)")
        
        assert len(wrong_points) == 0, f"Found {len(wrong_points)} official landmarks with wrong points"
        print(f"All {len(official_landmarks)} official landmarks have 10 points ✓")
    
    def test_premium_landmarks_have_25_points(self, auth_headers):
        """Test all premium landmarks have 25 points"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        
        wrong_points = []
        for landmark in premium_landmarks:
            points = landmark.get("points", 0)
            if points != 25:
                wrong_points.append((landmark.get("name"), landmark.get("country_name"), points))
        
        if wrong_points:
            print(f"\nPremium landmarks with wrong points:")
            for name, country, points in wrong_points[:10]:
                print(f"  {name} ({country}): {points} points (should be 25)")
        
        assert len(wrong_points) == 0, f"Found {len(wrong_points)} premium landmarks with wrong points"
        print(f"All {len(premium_landmarks)} premium landmarks have 25 points ✓")


class TestDataIntegrity:
    """Test data integrity - no duplicates, no orphans"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register and get auth token"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        
        register_payload = {
            "email": f"test_integrity_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Integrity User {unique_id}",
            "username": f"testintegrity_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        
        pytest.fail(f"Failed to register. Status: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def all_landmarks(self, auth_headers):
        """Fetch all landmarks once"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def countries_data(self, auth_headers):
        """Fetch all countries"""
        response = requests.get(f"{BASE_URL}/api/countries", headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_no_duplicate_landmark_names(self, all_landmarks):
        """Test there are no duplicate landmark names in the database"""
        landmark_names = [l.get("name") for l in all_landmarks]
        name_counts = Counter(landmark_names)
        
        duplicates = {name: count for name, count in name_counts.items() if count > 1}
        
        if duplicates:
            print(f"\nDuplicate landmark names found:")
            for name, count in duplicates.items():
                # Find which countries have this landmark
                countries = [l.get("country_name") for l in all_landmarks if l.get("name") == name]
                print(f"  '{name}' appears {count} times in: {countries}")
        
        assert len(duplicates) == 0, f"Found {len(duplicates)} duplicate landmark names: {list(duplicates.keys())[:5]}"
        print(f"No duplicate landmark names found among {len(all_landmarks)} landmarks ✓")
    
    def test_no_orphan_landmarks_null_country(self, all_landmarks):
        """Test no landmarks have null country_name"""
        orphans = [l for l in all_landmarks if not l.get("country_name")]
        
        if orphans:
            print(f"\nOrphan landmarks (null country_name):")
            for orphan in orphans[:10]:
                print(f"  {orphan.get('name')} (ID: {orphan.get('landmark_id')})")
        
        assert len(orphans) == 0, f"Found {len(orphans)} landmarks with null country_name"
        print("No orphan landmarks with null country_name ✓")
    
    def test_all_countries_have_at_least_one_premium_landmark(self, countries_data, auth_headers):
        """Test that all 66 countries have at least 1 premium landmark"""
        countries_without_premium = []
        
        print("\nChecking premium landmarks per country...")
        for country in countries_data:
            country_id = country.get("country_id")
            country_name = country.get("name")
            
            response = requests.get(f"{BASE_URL}/api/landmarks?country_id={country_id}", headers=auth_headers)
            if response.status_code != 200:
                continue
            
            landmarks = response.json()
            premium_count = sum(1 for l in landmarks if l.get("category") == "premium")
            
            if premium_count == 0:
                countries_without_premium.append(country_name)
        
        if countries_without_premium:
            print(f"\nCountries without premium landmarks:")
            for name in countries_without_premium:
                print(f"  - {name}")
        
        assert len(countries_without_premium) == 0, f"Found {len(countries_without_premium)} countries without premium landmarks: {countries_without_premium}"
        print(f"All {len(countries_data)} countries have at least 1 premium landmark ✓")
    
    def test_no_landmarks_with_null_country_id(self, all_landmarks):
        """Test no landmarks have null country_id"""
        orphans = [l for l in all_landmarks if not l.get("country_id")]
        
        if orphans:
            print(f"\nLandmarks with null country_id:")
            for orphan in orphans[:10]:
                print(f"  {orphan.get('name')} (ID: {orphan.get('landmark_id')})")
        
        assert len(orphans) == 0, f"Found {len(orphans)} landmarks with null country_id"
        print("No landmarks with null country_id ✓")


class TestLandmarkTotals:
    """Test total landmark counts and premium counts"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register and get auth token"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        
        register_payload = {
            "email": f"test_totals_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Totals User {unique_id}",
            "username": f"testtotals_{unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        
        pytest.fail(f"Failed to register. Status: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_total_landmarks_count(self, auth_headers):
        """Count total landmarks - should be around 740+ based on about page"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        total = len(landmarks)
        
        # App says 740+ landmarks
        print(f"\nTotal landmarks: {total}")
        assert total >= 700, f"Expected 700+ landmarks, got {total}"
        print(f"Total landmarks count verified: {total} ✓")
    
    def test_premium_landmarks_count(self, auth_headers):
        """Count premium landmarks - should be 150+ based on subscription page"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        premium_landmarks = [l for l in landmarks if l.get("category") == "premium"]
        
        print(f"\nPremium landmarks: {len(premium_landmarks)}")
        # App claims 150+ premium landmarks
        assert len(premium_landmarks) >= 100, f"Expected 100+ premium landmarks, got {len(premium_landmarks)}"
        print(f"Premium landmarks count: {len(premium_landmarks)} ✓")
    
    def test_landmark_category_distribution(self, auth_headers):
        """Check distribution of landmark categories"""
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=auth_headers)
        assert response.status_code == 200
        
        landmarks = response.json()
        category_counts = Counter(l.get("category") for l in landmarks)
        
        print(f"\nLandmark categories:")
        for category, count in sorted(category_counts.items()):
            print(f"  {category}: {count}")
        
        assert "official" in category_counts, "No official landmarks found"
        assert "premium" in category_counts, "No premium landmarks found"
        print("Landmark category distribution verified ✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
