#!/usr/bin/env python3
"""
WanderList Backend API Testing Suite
Focus: Global Content Expansion - 48 countries, 480 landmarks
Testing the massive database expansion across all continents
"""

import requests
import json
import base64
from datetime import datetime
import sys
import uuid

# Get backend URL from frontend .env
BACKEND_URL = "https://wandersync.preview.emergentagent.com/api"

# Test account credentials from review request
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderListTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method, endpoint, data=None, headers=None, expect_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        
        if self.auth_token:
            req_headers["Authorization"] = f"Bearer {self.auth_token}"
            
        if headers:
            req_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.Timeout:
            print(f"Request timeout for {method} {url}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error for {method} {url}: {e}")
            return None
        except Exception as e:
            print(f"Request failed for {method} {url}: {e}")
            return None
            
    def test_authentication_p0(self):
        """P0: Test authentication endpoints"""
        print("\n🔐 TESTING AUTHENTICATION")
        
        # Login with test account
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("access_token")
            self.user_data = data.get("user")
            tier = self.user_data.get('subscription_tier', 'unknown')
            self.log_test("POST /api/auth/login", True, f"Token received, user tier: {tier}")
        else:
            self.log_test("POST /api/auth/login", False, f"Status: {response.status_code if response else 'No response'}")
            return False
            
        # Verify token with /auth/me
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            user_data = response.json()
            self.log_test("GET /api/auth/me", True, f"User: {user_data.get('name')}, Tier: {user_data.get('subscription_tier')}")
        else:
            self.log_test("GET /api/auth/me", False, f"Status: {response.status_code if response else 'No response'}")
            
        return True
        
    def test_countries_endpoint_expansion(self):
        """Test GET /api/countries - should return 48 countries with proper distribution"""
        print("\n🌍 TESTING COUNTRIES ENDPOINT - GLOBAL EXPANSION")
        
        response = self.make_request("GET", "/countries")
        if not response or response.status_code != 200:
            self.log_test("GET /api/countries", False, f"Status: {response.status_code if response else 'No response'}")
            return False
            
        countries = response.json()
        total_countries = len(countries)
        
        # Test 1: Total count should be 48
        if total_countries == 48:
            self.log_test("Countries Total Count", True, f"Found {total_countries} countries as expected")
        else:
            self.log_test("Countries Total Count", False, f"Expected 48 countries, got {total_countries}")
            
        # Test 2: Continent distribution
        continent_counts = {}
        countries_with_images = 0
        
        for country in countries:
            continent = country.get("continent", "Unknown")
            continent_counts[continent] = continent_counts.get(continent, 0) + 1
            
            # Check for image_url field
            if country.get("image_url"):
                countries_with_images += 1
                
            # Verify required fields
            required_fields = ["country_id", "name", "continent", "landmark_count"]
            for field in required_fields:
                if field not in country:
                    self.log_test("Countries Data Integrity", False, f"Missing field '{field}' in country {country.get('name', 'Unknown')}")
                    return False
        
        print(f"\n📊 Continent Distribution:")
        for continent, count in continent_counts.items():
            print(f"   {continent}: {count} countries")
        
        # Test 3: Expected continent distribution
        expected_distribution = {
            "Europe": 10,
            "Asia": 10, 
            "Africa": 10,
            "Americas": 10,  # Could be split into North/South America
            "Oceania": 8
        }
        
        # Check if distribution matches (allowing for continent name variations)
        distribution_correct = True
        if "Americas" in continent_counts:
            americas_count = continent_counts["Americas"]
        else:
            americas_count = continent_counts.get("North America", 0) + continent_counts.get("South America", 0)
        
        expected_checks = [
            ("Europe", continent_counts.get("Europe", 0), 10),
            ("Asia", continent_counts.get("Asia", 0), 10),
            ("Africa", continent_counts.get("Africa", 0), 10),
            ("Americas", americas_count, 10),
            ("Oceania", continent_counts.get("Oceania", 0), 8)
        ]
        
        for continent, actual, expected in expected_checks:
            if actual == expected:
                self.log_test(f"{continent} Count", True, f"{actual} countries")
            else:
                self.log_test(f"{continent} Count", False, f"Expected {expected}, got {actual}")
                distribution_correct = False
        
        # Test 4: Image URLs present
        image_coverage = (countries_with_images / total_countries) * 100
        if image_coverage >= 90:  # At least 90% should have images
            self.log_test("Countries Image Coverage", True, f"{countries_with_images}/{total_countries} countries have images ({image_coverage:.1f}%)")
        else:
            self.log_test("Countries Image Coverage", False, f"Only {image_coverage:.1f}% coverage")
            
        return distribution_correct
        
    def test_landmarks_endpoint_expansion(self):
        """Test GET /api/landmarks - should return 480 landmarks total"""
        print("\n🏛️ TESTING LANDMARKS ENDPOINT - GLOBAL EXPANSION")
        
        response = self.make_request("GET", "/landmarks")
        if not response or response.status_code != 200:
            self.log_test("GET /api/landmarks", False, f"Status: {response.status_code if response else 'No response'}")
            return False
            
        landmarks = response.json()
        total_landmarks = len(landmarks)
        
        # Test 1: Total count should be 480
        if total_landmarks == 480:
            self.log_test("Landmarks Total Count", True, f"Found {total_landmarks} landmarks as expected")
        else:
            self.log_test("Landmarks Total Count", False, f"Expected 480 landmarks, got {total_landmarks}")
            
        # Test 2: Category distribution analysis
        category_counts = {"official": 0, "premium": 0, "user_suggested": 0}
        countries_landmark_count = {}
        continents_represented = set()
        
        for landmark in landmarks:
            category = landmark.get("category", "unknown")
            if category in category_counts:
                category_counts[category] += 1
            
            country_id = landmark.get("country_id", "unknown")
            countries_landmark_count[country_id] = countries_landmark_count.get(country_id, 0) + 1
            
            continent = landmark.get("continent")
            if continent:
                continents_represented.add(continent)
                
            # Verify required fields for data integrity
            required_fields = ["name", "description", "images", "difficulty", "category"]
            for field in required_fields:
                if field not in landmark:
                    self.log_test("Landmarks Data Integrity", False, f"Missing field '{field}' in landmark {landmark.get('name', 'Unknown')}")
                    return False
        
        print(f"\n📊 Landmark Categories:")
        for category, count in category_counts.items():
            print(f"   {category}: {count} landmarks")
        
        # Test 3: Premium vs Free distribution (336 free + 144 premium = 480 total)
        expected_free = 336  # 7 per country × 48 countries
        expected_premium = 144  # 3 per country × 48 countries
        
        actual_free = category_counts["official"]
        actual_premium = category_counts["premium"]
        
        if actual_free == expected_free:
            self.log_test("Free Landmarks Count", True, f"Found {actual_free} free landmarks (7 per country)")
        else:
            self.log_test("Free Landmarks Count", False, f"Expected {expected_free}, got {actual_free}")
        
        if actual_premium == expected_premium:
            self.log_test("Premium Landmarks Count", True, f"Found {actual_premium} premium landmarks (3 per country)")
        else:
            self.log_test("Premium Landmarks Count", False, f"Expected {expected_premium}, got {actual_premium}")
            
        # Test 4: Total should equal free + premium
        expected_total = expected_free + expected_premium
        if total_landmarks == expected_total:
            self.log_test("Total Landmarks Math", True, f"{actual_free} + {actual_premium} = {total_landmarks}")
        else:
            self.log_test("Total Landmarks Math", False, f"Math doesn't add up: {actual_free} + {actual_premium} ≠ {total_landmarks}")
        
        # Test 5: Each country should have exactly 10 landmarks
        print(f"\n📊 Landmarks per Country Distribution:")
        countries_with_10_landmarks = 0
        sample_countries = list(countries_landmark_count.keys())[:10]  # Show first 10
        
        for country_id in sample_countries:
            count = countries_landmark_count[country_id]
            print(f"   {country_id}: {count} landmarks")
            
        for country_id, count in countries_landmark_count.items():
            if count == 10:
                countries_with_10_landmarks += 1
                
        total_countries_with_landmarks = len(countries_landmark_count)
        if countries_with_10_landmarks == total_countries_with_landmarks:
            self.log_test("Landmarks per Country", True, f"All {total_countries_with_landmarks} countries have exactly 10 landmarks")
        else:
            self.log_test("Landmarks per Country", False, f"Only {countries_with_10_landmarks}/{total_countries_with_landmarks} countries have 10 landmarks")
        
        # Test 6: Continental representation
        print(f"\n📊 Continents Represented: {len(continents_represented)}")
        for continent in sorted(continents_represented):
            print(f"   {continent}")
            
        if len(continents_represented) >= 5:  # Should have all major continents
            self.log_test("Continental Coverage", True, f"{len(continents_represented)} continents represented")
        else:
            self.log_test("Continental Coverage", False, f"Only {len(continents_represented)} continents found")
            
        return True
        
    def test_landmarks_by_country_samples(self):
        """Test GET /api/landmarks?country_id={country_id} for sample countries"""
        print("\n🔍 TESTING LANDMARKS BY COUNTRY - SAMPLE VERIFICATION")
        
        # Test specific countries mentioned in review request
        test_countries = ["france", "japan", "brazil", "australia", "kenya"]
        
        for country_id in test_countries:
            response = self.make_request("GET", f"/landmarks?country_id={country_id}")
            
            if not response or response.status_code != 200:
                self.log_test(f"Landmarks for {country_id}", False, f"Status: {response.status_code if response else 'No response'}")
                continue
                
            landmarks = response.json()
            landmark_count = len(landmarks)
            
            # Test 1: Should have exactly 10 landmarks
            if landmark_count == 10:
                self.log_test(f"Landmarks for {country_id}", True, f"Found {landmark_count} landmarks")
            else:
                self.log_test(f"Landmarks for {country_id}", False, f"Expected 10, got {landmark_count}")
                continue
            
            # Test 2: Category distribution (7 official + 3 premium)
            official_count = sum(1 for l in landmarks if l.get("category") == "official")
            premium_count = sum(1 for l in landmarks if l.get("category") == "premium")
            
            if official_count == 7 and premium_count == 3:
                self.log_test(f"{country_id} Category Distribution", True, f"7 official + 3 premium")
            else:
                self.log_test(f"{country_id} Category Distribution", False, f"Got {official_count} official + {premium_count} premium")
            
            # Test 3: Verify landmark quality for this country
            quality_issues = 0
            for landmark in landmarks:
                if not landmark.get("name") or not landmark.get("description"):
                    quality_issues += 1
                    
            if quality_issues == 0:
                self.log_test(f"{country_id} Data Quality", True, "All landmarks have name and description")
            else:
                self.log_test(f"{country_id} Data Quality", False, f"{quality_issues} landmarks missing data")
                
        return True
        
    def test_data_integrity_expansion(self):
        """Test data integrity across the expanded dataset"""
        print("\n🔧 TESTING DATA INTEGRITY - EXPANSION VERIFICATION")
        
        # Test 1: Get sample landmarks from different continents
        response = self.make_request("GET", "/landmarks")
        if not response or response.status_code != 200:
            self.log_test("Data Integrity Setup", False, "Could not retrieve landmarks")
            return False
            
        landmarks = response.json()
        
        # Sample landmarks from different continents for quality check
        continents_sampled = {}
        for landmark in landmarks:
            continent = landmark.get("continent")
            if continent and continent not in continents_sampled:
                continents_sampled[continent] = landmark
                if len(continents_sampled) >= 5:  # Sample from 5 continents
                    break
        
        print(f"\n📊 Data Quality Sample ({len(continents_sampled)} continents):")
        
        # Test 2: Verify required fields across continents
        quality_passed = True
        for continent, landmark in continents_sampled.items():
            issues = []
            
            # Check all required fields
            required_fields = {
                "name": landmark.get("name"),
                "description": landmark.get("description"),
                "images": landmark.get("images"),
                "difficulty": landmark.get("difficulty"),
                "category": landmark.get("category")
            }
            
            for field, value in required_fields.items():
                if not value:
                    issues.append(f"missing {field}")
                elif field == "images" and not isinstance(value, list):
                    issues.append(f"invalid {field} format")
                elif field == "category" and value not in ["official", "premium", "user_suggested"]:
                    issues.append(f"invalid {field} value")
            
            if issues:
                quality_passed = False
                print(f"   ❌ {continent} ({landmark.get('name', 'Unknown')}): {', '.join(issues)}")
            else:
                print(f"   ✅ {continent} ({landmark.get('name', 'Unknown')}): All fields valid")
        
        self.log_test("Cross-Continental Data Quality", quality_passed, "Sample landmarks from different continents")
        
        # Test 3: Verify countries have proper data
        response = self.make_request("GET", "/countries")
        if response and response.status_code == 200:
            countries = response.json()
            countries_with_issues = 0
            
            for country in countries:
                if not all([country.get("country_id"), country.get("name"), country.get("continent")]):
                    countries_with_issues += 1
            
            if countries_with_issues == 0:
                self.log_test("Countries Data Integrity", True, f"All {len(countries)} countries have required fields")
            else:
                self.log_test("Countries Data Integrity", False, f"{countries_with_issues} countries missing required fields")
        else:
            self.log_test("Countries Data Integrity", False, "Could not verify countries data")
            
        return quality_passed

    def run_all_tests(self):
        """Run all test suites for global content expansion"""
        print("🚀 STARTING WANDERLIST GLOBAL CONTENT EXPANSION TESTING")
        print("Testing: 48 countries, 480 landmarks across all continents")
        print(f"Backend URL: {self.base_url}")
        print(f"Test account: {TEST_EMAIL}")
        print("="*80)
        
        # Authentication (required for all API calls)
        if not self.test_authentication_p0():
            print("❌ Authentication failed - stopping tests")
            return False
            
        # Core expansion tests
        print("\n🌍 TESTING GLOBAL CONTENT EXPANSION")
        self.test_countries_endpoint_expansion()
        self.test_landmarks_endpoint_expansion()
        self.test_landmarks_by_country_samples()
        self.test_data_integrity_expansion()
        
        # Summary
        print("\n" + "="*80)
        print("📋 GLOBAL EXPANSION TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("\n🎉 ALL EXPANSION TESTS PASSED!")
            
        # Show expansion status summary
        print("\n🌍 GLOBAL EXPANSION STATUS:")
        
        # Check key expansion metrics
        countries_tests = [r for r in self.test_results if "countries" in r["test"].lower()]
        landmarks_tests = [r for r in self.test_results if "landmarks" in r["test"].lower()]
        data_tests = [r for r in self.test_results if "data" in r["test"].lower() or "integrity" in r["test"].lower()]
        
        countries_passed = all(t["success"] for t in countries_tests)
        landmarks_passed = all(t["success"] for t in landmarks_tests)
        data_passed = all(t["success"] for t in data_tests)
        
        print(f"  Countries (48 expected): {'✅ VERIFIED' if countries_passed else '❌ ISSUES'}")
        print(f"  Landmarks (480 expected): {'✅ VERIFIED' if landmarks_passed else '❌ ISSUES'}")
        print(f"  Data Integrity: {'✅ VERIFIED' if data_passed else '❌ ISSUES'}")
        
        # Overall expansion status
        expansion_success = countries_passed and landmarks_passed and data_passed
        print(f"\n🎯 EXPANSION STATUS: {'✅ SUCCESS - Ready for production!' if expansion_success else '❌ ISSUES FOUND - Needs attention'}")
            
        return passed == total

if __name__ == "__main__":
    tester = WanderListTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)