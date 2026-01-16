#!/usr/bin/env python3
"""
Backend API Testing for User Created Visits Feature
Tests the custom visit functionality where users can record visits to places not in the app database.
"""

import requests
import json
import base64
from datetime import datetime

# Configuration
BASE_URL = "https://wanderlist-headers.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class UserCreatedVisitsTest:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
    
    def login(self):
        """Login and get authentication token"""
        print("\n🔐 AUTHENTICATION TEST")
        print("=" * 50)
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_result("Login", True, f"Successfully logged in as {TEST_EMAIL}")
                return True
            else:
                self.log_result("Login", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Login", False, f"Login error: {str(e)}")
            return False
    
    def get_initial_stats(self):
        """Get initial user stats to verify points don't increase"""
        print("\n📊 INITIAL STATS CHECK")
        print("=" * 50)
        
        try:
            response = requests.get(f"{BASE_URL}/stats", headers=self.headers)
            
            if response.status_code == 200:
                stats = response.json()
                self.initial_points = stats.get("points", 0)
                self.initial_leaderboard_points = stats.get("leaderboard_points", 0)
                self.log_result("Initial Stats", True, 
                    f"Initial points: {self.initial_points}, Leaderboard points: {self.initial_leaderboard_points}")
                return stats
            else:
                self.log_result("Initial Stats", False, f"Failed to get stats: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_result("Initial Stats", False, f"Stats error: {str(e)}")
            return None
    
    def create_country_only_visit(self):
        """Test creating a custom visit with country only"""
        print("\n🌍 CREATE COUNTRY-ONLY VISIT TEST")
        print("=" * 50)
        
        visit_data = {
            "country_name": "Monaco",
            "photos": [],
            "diary_notes": "Beautiful tiny country!",
            "visibility": "public"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/user-created-visits", 
                                   json=visit_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.country_visit_id = data.get("user_created_visit_id")
                self.log_result("Create Country Visit", True, 
                    f"Created visit to {data.get('country_name')} with ID: {self.country_visit_id}")
                return data
            else:
                self.log_result("Create Country Visit", False, 
                    f"Failed to create visit: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Country Visit", False, f"Create visit error: {str(e)}")
            return None
    
    def create_landmark_visit(self):
        """Test creating a custom visit with landmark"""
        print("\n🏰 CREATE LANDMARK VISIT TEST")
        print("=" * 50)
        
        # Create a small test image (1x1 pixel PNG)
        test_image_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        visit_data = {
            "country_name": "Liechtenstein",
            "landmark_name": "Vaduz Castle",
            "photos": [test_image_b64],
            "diary_notes": "Amazing mountain castle!",
            "visibility": "friends"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/user-created-visits", 
                                   json=visit_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.landmark_visit_id = data.get("user_created_visit_id")
                self.log_result("Create Landmark Visit", True, 
                    f"Created visit to {data.get('landmark_name')} in {data.get('country_name')} with ID: {self.landmark_visit_id}")
                return data
            else:
                self.log_result("Create Landmark Visit", False, 
                    f"Failed to create landmark visit: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Landmark Visit", False, f"Create landmark visit error: {str(e)}")
            return None
    
    def get_user_created_visits(self):
        """Test retrieving user created visits"""
        print("\n📋 GET USER CREATED VISITS TEST")
        print("=" * 50)
        
        try:
            response = requests.get(f"{BASE_URL}/user-created-visits", headers=self.headers)
            
            if response.status_code == 200:
                visits = response.json()
                visit_count = len(visits)
                
                # Verify both visits are present
                monaco_found = any(v.get("country_name") == "Monaco" for v in visits)
                liechtenstein_found = any(v.get("country_name") == "Liechtenstein" and 
                                        v.get("landmark_name") == "Vaduz Castle" for v in visits)
                
                if monaco_found and liechtenstein_found:
                    self.log_result("Get User Visits", True, 
                        f"Retrieved {visit_count} visits - both Monaco and Liechtenstein found")
                else:
                    self.log_result("Get User Visits", False, 
                        f"Retrieved {visit_count} visits but missing expected visits. Monaco: {monaco_found}, Liechtenstein: {liechtenstein_found}")
                
                return visits
            else:
                self.log_result("Get User Visits", False, 
                    f"Failed to get visits: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Get User Visits", False, f"Get visits error: {str(e)}")
            return None
    
    def verify_no_points_awarded(self):
        """Verify that no points were awarded for custom visits"""
        print("\n🚫 VERIFY NO POINTS AWARDED TEST")
        print("=" * 50)
        
        try:
            response = requests.get(f"{BASE_URL}/stats", headers=self.headers)
            
            if response.status_code == 200:
                stats = response.json()
                current_points = stats.get("points", 0)
                current_leaderboard_points = stats.get("leaderboard_points", 0)
                
                points_unchanged = (current_points == self.initial_points)
                leaderboard_points_unchanged = (current_leaderboard_points == self.initial_leaderboard_points)
                
                if points_unchanged and leaderboard_points_unchanged:
                    self.log_result("No Points Awarded", True, 
                        f"Points correctly unchanged: {current_points} (was {self.initial_points}), Leaderboard: {current_leaderboard_points} (was {self.initial_leaderboard_points})")
                else:
                    self.log_result("No Points Awarded", False, 
                        f"Points incorrectly changed! Points: {current_points} (was {self.initial_points}), Leaderboard: {current_leaderboard_points} (was {self.initial_leaderboard_points})")
                
                return points_unchanged and leaderboard_points_unchanged
            else:
                self.log_result("No Points Awarded", False, 
                    f"Failed to get final stats: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("No Points Awarded", False, f"Stats verification error: {str(e)}")
            return False
    
    def delete_visit(self, visit_id, visit_name):
        """Test deleting a user created visit"""
        print(f"\n🗑️ DELETE VISIT TEST ({visit_name})")
        print("=" * 50)
        
        try:
            response = requests.delete(f"{BASE_URL}/user-created-visits/{visit_id}", 
                                     headers=self.headers)
            
            if response.status_code == 200:
                self.log_result(f"Delete {visit_name}", True, 
                    f"Successfully deleted visit {visit_id}")
                return True
            else:
                self.log_result(f"Delete {visit_name}", False, 
                    f"Failed to delete visit: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Delete {visit_name}", False, f"Delete error: {str(e)}")
            return False
    
    def verify_visit_deleted(self, deleted_visit_id):
        """Verify that the visit was actually deleted"""
        print("\n✅ VERIFY DELETION TEST")
        print("=" * 50)
        
        try:
            response = requests.get(f"{BASE_URL}/user-created-visits", headers=self.headers)
            
            if response.status_code == 200:
                visits = response.json()
                
                # Check if deleted visit is still present
                deleted_visit_found = any(v.get("user_created_visit_id") == deleted_visit_id for v in visits)
                
                if not deleted_visit_found:
                    self.log_result("Verify Deletion", True, 
                        f"Visit {deleted_visit_id} successfully removed from list")
                    return True
                else:
                    self.log_result("Verify Deletion", False, 
                        f"Visit {deleted_visit_id} still found in list after deletion")
                    return False
            else:
                self.log_result("Verify Deletion", False, 
                    f"Failed to get visits for verification: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Verify Deletion", False, f"Verification error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all User Created Visits tests"""
        print("🧪 USER CREATED VISITS FEATURE TESTING")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Test user: {TEST_EMAIL}")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("\n❌ CRITICAL: Login failed - cannot continue tests")
            return False
        
        # Step 2: Get initial stats
        initial_stats = self.get_initial_stats()
        if not initial_stats:
            print("\n❌ CRITICAL: Could not get initial stats")
            return False
        
        # Step 3: Create country-only visit
        country_visit = self.create_country_only_visit()
        if not country_visit:
            print("\n❌ CRITICAL: Could not create country visit")
            return False
        
        # Step 4: Create landmark visit
        landmark_visit = self.create_landmark_visit()
        if not landmark_visit:
            print("\n❌ CRITICAL: Could not create landmark visit")
            return False
        
        # Step 5: Get all visits
        all_visits = self.get_user_created_visits()
        if not all_visits:
            print("\n❌ CRITICAL: Could not retrieve visits")
            return False
        
        # Step 6: Verify no points awarded
        points_correct = self.verify_no_points_awarded()
        
        # Step 7: Delete one visit
        if hasattr(self, 'country_visit_id'):
            delete_success = self.delete_visit(self.country_visit_id, "Monaco")
            if delete_success:
                self.verify_visit_deleted(self.country_visit_id)
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        print()
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = UserCreatedVisitsTest()
    tester.run_all_tests()