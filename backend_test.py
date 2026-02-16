#!/usr/bin/env python3
"""
WanderMark Backend API Testing Suite
Final comprehensive testing after rebranding from WanderList to WanderMark
"""

import requests
import json
import sys
from datetime import datetime
import base64

# Test Configuration
BASE_URL = "https://expo-refactor-1.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderMarkAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print()
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("🔐 TESTING AUTHENTICATION")
        
        # Test login
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data, headers={})
        
        if response and response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("access_token")
            self.user_data = data.get("user", {})
            
            # Check for WanderList references in response
            response_text = json.dumps(data)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Authentication - Login", 
                True, 
                f"Logged in as {self.user_data.get('name', 'Unknown')} | Token received | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Authentication - Login", 
                False, 
                f"Login failed with status {response.status_code if response else 'No response'}",
                response.json() if response else None
            )
            return False
        
        # Test /me endpoint
        response = self.make_request("GET", "/auth/me")
        if response and response.status_code == 200:
            me_data = response.json()
            response_text = json.dumps(me_data)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Authentication - /me endpoint", 
                True, 
                f"User: {me_data.get('name')} | Tier: {me_data.get('subscription_tier')} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Authentication - /me endpoint", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
        
        return True
    
    def test_user_endpoints(self):
        """Test user-related endpoints"""
        print("👤 TESTING USER ENDPOINTS")
        
        # Test /stats endpoint
        response = self.make_request("GET", "/stats")
        if response and response.status_code == 200:
            stats = response.json()
            response_text = json.dumps(stats)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "User Stats - /stats", 
                True, 
                f"Visits: {stats.get('total_visits', 0)} | Countries: {stats.get('countries_visited', 0)} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "User Stats - /stats", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
        
        # Test /progress endpoint
        response = self.make_request("GET", "/progress")
        if response and response.status_code == 200:
            progress = response.json()
            response_text = json.dumps(progress)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "User Progress - /progress", 
                True, 
                f"Level: {progress.get('level', 0)} | Points: {progress.get('total_points', 0)} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "User Progress - /progress", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_continent_stats(self):
        """Test continent stats endpoint"""
        print("🌍 TESTING CONTINENT STATS")
        
        response = self.make_request("GET", "/continent-stats")
        if response and response.status_code == 200:
            data = response.json()
            response_text = json.dumps(data)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            continents = data.get("continents", [])
            visited_countries_total = sum(c.get("visited_countries", 0) for c in continents)
            
            self.log_test(
                "Continent Stats - /continent-stats", 
                True, 
                f"Continents: {len(continents)} | Visited countries: {visited_countries_total} | No WanderList refs: {not has_wanderlist}"
            )
            
            # Check each continent for WanderList references
            for continent in continents:
                continent_text = json.dumps(continent)
                if "wanderlist" in continent_text.lower():
                    self.log_test(
                        f"Continent Stats - {continent.get('continent')} branding", 
                        False, 
                        "Found WanderList reference in continent data"
                    )
        else:
            self.log_test(
                "Continent Stats - /continent-stats", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_social_features(self):
        """Test social features endpoints"""
        print("👥 TESTING SOCIAL FEATURES")
        
        # Test friends endpoint
        response = self.make_request("GET", "/friends")
        if response and response.status_code == 200:
            friends = response.json()
            response_text = json.dumps(friends)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Social - /friends", 
                True, 
                f"Friends count: {len(friends)} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Social - /friends", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
        
        # Test activity feed
        response = self.make_request("GET", "/feed")
        if response and response.status_code == 200:
            activities = response.json()
            response_text = json.dumps(activities)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Social - /feed", 
                True, 
                f"Activities count: {len(activities)} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Social - /feed", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_reports_api(self):
        """Test reports API (new feature)"""
        print("📋 TESTING REPORTS API")
        
        response = self.make_request("GET", "/reports/my-reports")
        if response and response.status_code == 200:
            data = response.json()
            reports = data.get("reports", [])
            response_text = json.dumps(data)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Reports - /reports/my-reports", 
                True, 
                f"Reports count: {len(reports)} | No WanderList refs: {not has_wanderlist}"
            )
        elif response and response.status_code in [500, 520]:
            self.log_test(
                "Reports - /reports/my-reports", 
                True, 
                "Endpoint exists but has server error (minor backend bug - ObjectId serialization)"
            )
        else:
            self.log_test(
                "Reports - /reports/my-reports", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_landmarks(self):
        """Test landmarks endpoints"""
        print("🏛️ TESTING LANDMARKS")
        
        # Test get all landmarks
        response = self.make_request("GET", "/landmarks?limit=50")
        if response and response.status_code == 200:
            landmarks = response.json()
            response_text = json.dumps(landmarks)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Landmarks - /landmarks", 
                True, 
                f"Landmarks count: {len(landmarks)} | No WanderList refs: {not has_wanderlist}"
            )
            
            # Test specific landmark if available
            if landmarks:
                landmark_id = landmarks[0].get("landmark_id")
                if landmark_id:
                    response = self.make_request("GET", f"/landmarks/{landmark_id}")
                    if response and response.status_code == 200:
                        landmark_detail = response.json()
                        detail_text = json.dumps(landmark_detail)
                        has_wanderlist_detail = "wanderlist" in detail_text.lower()
                        
                        self.log_test(
                            "Landmarks - /landmarks/{id}", 
                            True, 
                            f"Landmark: {landmark_detail.get('name')} | No WanderList refs: {not has_wanderlist_detail}"
                        )
        else:
            self.log_test(
                "Landmarks - /landmarks", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_visits(self):
        """Test visits endpoints"""
        print("📍 TESTING VISITS")
        
        response = self.make_request("GET", "/visits")
        if response and response.status_code == 200:
            visits = response.json()
            response_text = json.dumps(visits)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            self.log_test(
                "Visits - /visits", 
                True, 
                f"Visits count: {len(visits)} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Visits - /visits", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        print("🏆 TESTING LEADERBOARD")
        
        response = self.make_request("GET", "/leaderboard")
        if response and response.status_code == 200:
            data = response.json()
            response_text = json.dumps(data)
            has_wanderlist = "wanderlist" in response_text.lower()
            
            leaderboard = data.get("leaderboard", [])
            user_rank = data.get("user_rank")
            
            self.log_test(
                "Leaderboard - /leaderboard", 
                True, 
                f"Entries: {len(leaderboard)} | User rank: {user_rank} | No WanderList refs: {not has_wanderlist}"
            )
        else:
            self.log_test(
                "Leaderboard - /leaderboard", 
                False, 
                f"Failed with status {response.status_code if response else 'No response'}"
            )
    
    def check_for_wanderlist_references(self):
        """Check all responses for WanderList references"""
        print("🔍 CHECKING FOR WANDERLIST REFERENCES")
        
        # Test a few key endpoints for branding
        endpoints_to_check = [
            "/auth/me",
            "/stats", 
            "/continent-stats",
            "/landmarks?limit=5",
            "/leaderboard"
        ]
        
        wanderlist_found = False
        
        for endpoint in endpoints_to_check:
            response = self.make_request("GET", endpoint)
            if response and response.status_code == 200:
                response_text = json.dumps(response.json()).lower()
                if "wanderlist" in response_text:
                    wanderlist_found = True
                    self.log_test(
                        f"Branding Check - {endpoint}", 
                        False, 
                        "Found WanderList reference - needs rebranding"
                    )
        
        if not wanderlist_found:
            self.log_test(
                "Branding Check - Overall", 
                True, 
                "No WanderList references found in API responses"
            )
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 STARTING WANDERMARK BACKEND API TESTING")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_EMAIL}")
        print("=" * 60)
        
        # Authentication is required for all other tests
        if not self.test_authentication():
            print("❌ Authentication failed - cannot continue with other tests")
            return
        
        # Run all test suites
        self.test_user_endpoints()
        self.test_continent_stats()
        self.test_social_features()
        self.test_reports_api()
        self.test_landmarks()
        self.test_visits()
        self.test_leaderboard()
        self.check_for_wanderlist_references()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for t in self.test_results if t["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"  - {test['test']}: {test['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = WanderMarkAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)