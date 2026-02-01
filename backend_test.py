#!/usr/bin/env python3
"""
WanderList Backend API Testing Suite
Comprehensive testing for all backend endpoints with focus on new features
"""

import requests
import json
import base64
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://wanderlist-brand.preview.emergentagent.com/api"

# Test credentials
MAIN_USER = {"email": "mobile@test.com", "password": "test123"}
FRIEND_USER = {"email": "friend@test.com", "password": "test123"}

class WanderListTester:
    def __init__(self):
        self.main_token = None
        self.friend_token = None
        self.main_user_id = None
        self.friend_user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")
        
    def authenticate_users(self):
        """Authenticate both test users"""
        print("\n🔐 AUTHENTICATION TESTING")
        print("=" * 50)
        
        # Login main user
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=MAIN_USER)
            if response.status_code == 200:
                data = response.json()
                self.main_token = data["access_token"]
                self.main_user_id = data["user"]["user_id"]
                self.log_result("Main user login", True, f"Token obtained for {MAIN_USER['email']}")
            else:
                self.log_result("Main user login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Main user login", False, f"Exception: {str(e)}")
            return False
            
        # Login friend user
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=FRIEND_USER)
            if response.status_code == 200:
                data = response.json()
                self.friend_token = data["access_token"]
                self.friend_user_id = data["user"]["user_id"]
                self.log_result("Friend user login", True, f"Token obtained for {FRIEND_USER['email']}")
            else:
                self.log_result("Friend user login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Friend user login", False, f"Exception: {str(e)}")
            return False
            
        return True
        
    def get_headers(self, use_friend=False):
        """Get authorization headers"""
        token = self.friend_token if use_friend else self.main_token
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
    def test_new_report_api(self):
        """Test the new Report API functionality"""
        print("\n📋 NEW FEATURE: REPORT API TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        # Test 1: Create valid report
        try:
            # Use unique target_id to avoid duplicate issues
            unique_id = f"test_activity_{uuid.uuid4().hex[:8]}"
            report_data = {
                "report_type": "activity",
                "target_id": unique_id,
                "reason": "spam"
            }
            response = requests.post(f"{BASE_URL}/reports", json=report_data, headers=headers)
            if response.status_code == 200:
                report_id = response.json().get("report_id")
                self.log_result("Create valid report", True, f"Report created with ID: {report_id}")
            else:
                self.log_result("Create valid report", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create valid report", False, f"Exception: {str(e)}")
            
        # Test 2: Test duplicate report prevention
        try:
            response = requests.post(f"{BASE_URL}/reports", json=report_data, headers=headers)
            if response.status_code == 400:
                self.log_result("Duplicate report prevention", True, "Duplicate report correctly rejected")
            else:
                self.log_result("Duplicate report prevention", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Duplicate report prevention", False, f"Exception: {str(e)}")
            
        # Test 3: Test self-report prevention (user type)
        try:
            self_report_data = {
                "report_type": "user",
                "target_id": self.main_user_id,
                "reason": "spam"
            }
            response = requests.post(f"{BASE_URL}/reports", json=self_report_data, headers=headers)
            if response.status_code == 400:
                self.log_result("Self-report prevention", True, "Self-report correctly rejected")
            else:
                self.log_result("Self-report prevention", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Self-report prevention", False, f"Exception: {str(e)}")
            
        # Test 4: Test invalid report_type rejection
        try:
            invalid_report = {
                "report_type": "invalid_type",
                "target_id": "test_123",
                "reason": "spam"
            }
            response = requests.post(f"{BASE_URL}/reports", json=invalid_report, headers=headers)
            if response.status_code == 400:
                self.log_result("Invalid report_type rejection", True, "Invalid report_type correctly rejected")
            else:
                self.log_result("Invalid report_type rejection", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid report_type rejection", False, f"Exception: {str(e)}")
            
        # Test 5: Test invalid reason rejection
        try:
            invalid_reason = {
                "report_type": "activity",
                "target_id": "test_123",
                "reason": "invalid_reason"
            }
            response = requests.post(f"{BASE_URL}/reports", json=invalid_reason, headers=headers)
            if response.status_code == 400:
                self.log_result("Invalid reason rejection", True, "Invalid reason correctly rejected")
            else:
                self.log_result("Invalid reason rejection", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid reason rejection", False, f"Exception: {str(e)}")
            
    def test_new_continent_stats_api(self):
        """Test the new Continent Stats API functionality"""
        print("\n🌍 NEW FEATURE: CONTINENT STATS API TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        try:
            response = requests.get(f"{BASE_URL}/continent-stats", headers=headers)
            if response.status_code == 200:
                data = response.json()
                
                # Test 1: Verify response includes visited_countries field
                if "continents" in data:
                    continents = data["continents"]
                    has_visited_countries = all("visited_countries" in continent for continent in continents)
                    self.log_result("Response includes visited_countries field", has_visited_countries, 
                                  f"Found {len(continents)} continents with visited_countries field")
                    
                    # Test 2: Verify visited count never exceeds countries count
                    valid_counts = True
                    for continent in continents:
                        visited = continent.get("visited_countries", 0)
                        total = continent.get("countries", 0)
                        if visited > total:
                            valid_counts = False
                            break
                    self.log_result("Visited count validation", valid_counts, 
                                  "Visited countries never exceeds total countries")
                    
                    # Test 3: Verify progress_percent calculation
                    valid_progress = True
                    for continent in continents:
                        visited = continent.get("visited_countries", 0)
                        total = continent.get("countries", 0)
                        progress = continent.get("progress_percent", 0)
                        expected = round((visited / total) * 100, 1) if total > 0 else 0
                        if abs(progress - expected) > 0.1:  # Allow small floating point differences
                            valid_progress = False
                            break
                    self.log_result("Progress percent calculation", valid_progress, 
                                  "Progress percentages calculated correctly")
                else:
                    self.log_result("Continent stats structure", False, "Missing continents field in response")
            else:
                self.log_result("Continent stats API", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Continent stats API", False, f"Exception: {str(e)}")
            
    def test_core_authentication(self):
        """Test core authentication functionality"""
        print("\n🔐 CORE: AUTHENTICATION TESTING")
        print("=" * 50)
        
        # Test token validation with /me endpoint
        try:
            headers = self.get_headers()
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                self.log_result("Token validation (/me)", True, f"User: {user_data.get('name', 'Unknown')}")
            else:
                self.log_result("Token validation (/me)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Token validation (/me)", False, f"Exception: {str(e)}")
            
    def test_user_data_apis(self):
        """Test user data endpoints"""
        print("\n👤 CORE: USER DATA TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        # Test GET /api/stats
        try:
            response = requests.get(f"{BASE_URL}/stats", headers=headers)
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_visits", "countries_visited", "continents_visited", "friends_count"]
                has_all_fields = all(field in stats for field in required_fields)
                self.log_result("User stats API", has_all_fields, 
                              f"Stats: {stats.get('total_visits', 0)} visits, {stats.get('countries_visited', 0)} countries")
            else:
                self.log_result("User stats API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("User stats API", False, f"Exception: {str(e)}")
            
        # Test GET /api/progress
        try:
            response = requests.get(f"{BASE_URL}/progress", headers=headers)
            if response.status_code == 200:
                self.log_result("User progress API", True, "Progress data retrieved successfully")
            else:
                self.log_result("User progress API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("User progress API", False, f"Exception: {str(e)}")
            
    def test_social_features(self):
        """Test social features"""
        print("\n👥 CORE: SOCIAL FEATURES TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        # Test GET /api/friends
        try:
            response = requests.get(f"{BASE_URL}/friends", headers=headers)
            if response.status_code == 200:
                friends = response.json()
                self.log_result("Friends list API", True, f"Retrieved {len(friends)} friends")
            else:
                self.log_result("Friends list API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Friends list API", False, f"Exception: {str(e)}")
            
        # Test GET /api/feed
        try:
            response = requests.get(f"{BASE_URL}/feed", headers=headers)
            if response.status_code == 200:
                activities = response.json()
                self.log_result("Activity feed API", True, f"Retrieved {len(activities)} activities")
            else:
                self.log_result("Activity feed API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Activity feed API", False, f"Exception: {str(e)}")
            
        # Test activity like functionality (need an activity ID first)
        try:
            # Get activities first
            response = requests.get(f"{BASE_URL}/feed", headers=headers)
            if response.status_code == 200:
                activities = response.json()
                if activities:
                    activity_id = activities[0].get("activity_id")
                    if activity_id:
                        # Test like
                        like_response = requests.post(f"{BASE_URL}/activities/{activity_id}/like", headers=headers)
                        if like_response.status_code == 200:
                            self.log_result("Activity like API", True, f"Successfully liked activity {activity_id}")
                        else:
                            self.log_result("Activity like API", False, f"Status: {like_response.status_code}")
                    else:
                        self.log_result("Activity like API", False, "No activity ID found")
                else:
                    self.log_result("Activity like API", False, "No activities found to test")
            else:
                self.log_result("Activity like API", False, "Could not retrieve activities for testing")
        except Exception as e:
            self.log_result("Activity like API", False, f"Exception: {str(e)}")
            
    def test_landmarks_and_visits(self):
        """Test landmarks and visits functionality"""
        print("\n🏛️ CORE: LANDMARKS & VISITS TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        # Test GET /api/landmarks
        try:
            response = requests.get(f"{BASE_URL}/landmarks", headers=headers)
            if response.status_code == 200:
                landmarks = response.json()
                self.log_result("Landmarks list API", True, f"Retrieved {len(landmarks)} landmarks")
                
                # Store a landmark for visit testing
                self.test_landmark = landmarks[0] if landmarks else None
            else:
                self.log_result("Landmarks list API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Landmarks list API", False, f"Exception: {str(e)}")
            
        # Test GET /api/visits
        try:
            response = requests.get(f"{BASE_URL}/visits", headers=headers)
            if response.status_code == 200:
                visits = response.json()
                self.log_result("Visits list API", True, f"Retrieved {len(visits)} visits")
            else:
                self.log_result("Visits list API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Visits list API", False, f"Exception: {str(e)}")
            
        # Test visit data integrity (check if visits have proper structure)
        try:
            response = requests.get(f"{BASE_URL}/visits", headers=headers)
            if response.status_code == 200:
                visits = response.json()
                if visits:
                    visit = visits[0]
                    required_fields = ["visit_id", "user_id", "landmark_id", "points_earned", "visited_at"]
                    has_required_fields = all(field in visit for field in required_fields)
                    self.log_result("Visit data integrity", has_required_fields, 
                                  f"Visit structure validation: {len(required_fields)} required fields")
                else:
                    self.log_result("Visit data integrity", True, "No visits to validate (empty list)")
            else:
                self.log_result("Visit data integrity", False, f"Could not retrieve visits for validation")
        except Exception as e:
            self.log_result("Visit data integrity", False, f"Exception: {str(e)}")
            
    def test_leaderboard(self):
        """Test leaderboard functionality"""
        print("\n🏆 CORE: LEADERBOARD TESTING")
        print("=" * 50)
        
        headers = self.get_headers()
        
        try:
            response = requests.get(f"{BASE_URL}/leaderboard", headers=headers)
            if response.status_code == 200:
                leaderboard_data = response.json()
                
                # Check if response has expected structure
                required_fields = ["leaderboard", "user_rank", "total_users"]
                has_structure = all(field in leaderboard_data for field in required_fields)
                
                if has_structure:
                    leaderboard = leaderboard_data["leaderboard"]
                    user_rank = leaderboard_data["user_rank"]
                    total_users = leaderboard_data["total_users"]
                    
                    self.log_result("Leaderboard API", True, 
                                  f"Retrieved {len(leaderboard)} entries, user rank: {user_rank}, total: {total_users}")
                else:
                    self.log_result("Leaderboard API", False, "Missing required fields in response")
            else:
                self.log_result("Leaderboard API", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Leaderboard API", False, f"Exception: {str(e)}")
            
    def run_comprehensive_test(self):
        """Run all tests"""
        print("🚀 WANDERLIST BACKEND COMPREHENSIVE TESTING")
        print("=" * 60)
        print(f"Backend URL: {BASE_URL}")
        print(f"Test Users: {MAIN_USER['email']} & {FRIEND_USER['email']}")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.authenticate_users():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with other tests.")
            return
            
        # Step 2: Test new features (highest priority)
        self.test_new_report_api()
        self.test_new_continent_stats_api()
        
        # Step 3: Test core functionality
        self.test_core_authentication()
        self.test_user_data_apis()
        self.test_social_features()
        self.test_landmarks_and_visits()
        self.test_leaderboard()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result:
                    print(f"  {result}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
            
        return passed, failed, total

if __name__ == "__main__":
    tester = WanderListTester()
    tester.run_comprehensive_test()