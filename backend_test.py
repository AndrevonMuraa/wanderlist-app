#!/usr/bin/env python3
"""
Backend Testing for Achievement Showcase API - v4.17
Tests the /api/achievements/showcase endpoint comprehensively
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://leaderboard-dev.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class AchievementShowcaseAPITester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
    
    def authenticate(self):
        """Authenticate and get JWT token"""
        print("\n🔐 AUTHENTICATION TEST")
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.log_test("Authentication", True, f"Token obtained for user {self.user_id}")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.token}"}
    
    def test_endpoint_availability(self):
        """Test 1: Endpoint Availability"""
        print("\n🎯 TEST 1: ENDPOINT AVAILABILITY")
        
        # Test with valid token
        try:
            response = requests.get(f"{BACKEND_URL}/achievements/showcase", headers=self.get_headers())
            
            if response.status_code == 200:
                self.log_test("Endpoint returns 200 with valid token", True)
            else:
                self.log_test("Endpoint returns 200 with valid token", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Endpoint returns 200 with valid token", False, f"Exception: {str(e)}")
        
        # Test without token (should return 401)
        try:
            response = requests.get(f"{BACKEND_URL}/achievements/showcase")
            
            if response.status_code == 401:
                self.log_test("Endpoint returns 401 without token", True)
            else:
                self.log_test("Endpoint returns 401 without token", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Endpoint returns 401 without token", False, f"Exception: {str(e)}")
    
    def test_response_structure(self):
        """Test 2: Response Structure Validation"""
        print("\n📋 TEST 2: RESPONSE STRUCTURE VALIDATION")
        
        try:
            response = requests.get(f"{BACKEND_URL}/achievements/showcase", headers=self.get_headers())
            
            if response.status_code != 200:
                self.log_test("Response Structure", False, f"Failed to get response: {response.status_code}")
                return None
            
            data = response.json()
            
            # Check top-level structure
            required_fields = ["earned_badges", "locked_badges", "stats"]
            for field in required_fields:
                if field in data:
                    self.log_test(f"Response contains '{field}' field", True)
                else:
                    self.log_test(f"Response contains '{field}' field", False)
            
            # Check stats structure
            if "stats" in data:
                stats_fields = ["total_badges", "earned_count", "locked_count", "completion_percentage"]
                for field in stats_fields:
                    if field in data["stats"]:
                        self.log_test(f"Stats contains '{field}' field", True)
                    else:
                        self.log_test(f"Stats contains '{field}' field", False)
            
            return data
            
        except Exception as e:
            self.log_test("Response Structure", False, f"Exception: {str(e)}")
            return None
    
    def test_badge_data_validation(self, data):
        """Test 3: Badge Data Validation"""
        print("\n🏆 TEST 3: BADGE DATA VALIDATION")
        
        if not data:
            self.log_test("Badge Data Validation", False, "No data to validate")
            return
        
        # Required badge fields
        required_badge_fields = [
            "badge_type", "badge_name", "badge_description", "badge_icon",
            "is_earned", "progress", "current_value", "target_value", 
            "progress_text", "earned_at"
        ]
        
        # Test earned badges
        earned_badges = data.get("earned_badges", [])
        for i, badge in enumerate(earned_badges[:3]):  # Test first 3 earned badges
            for field in required_badge_fields:
                if field in badge:
                    self.log_test(f"Earned badge {i+1} has '{field}' field", True)
                else:
                    self.log_test(f"Earned badge {i+1} has '{field}' field", False)
        
        # Test locked badges
        locked_badges = data.get("locked_badges", [])
        for i, badge in enumerate(locked_badges[:3]):  # Test first 3 locked badges
            for field in required_badge_fields:
                if field in badge:
                    self.log_test(f"Locked badge {i+1} has '{field}' field", True)
                else:
                    self.log_test(f"Locked badge {i+1} has '{field}' field", False)
    
    def test_earned_badges_validation(self, data):
        """Test 4: Earned Badges Validation"""
        print("\n🎖️ TEST 4: EARNED BADGES VALIDATION")
        
        if not data:
            return
        
        earned_badges = data.get("earned_badges", [])
        
        # Test earned badges properties
        all_earned_correct = True
        for badge in earned_badges:
            if not badge.get("is_earned"):
                all_earned_correct = False
                break
            if badge.get("earned_at") is None:
                all_earned_correct = False
                break
            if badge.get("progress") != 100:
                all_earned_correct = False
                break
        
        self.log_test("All earned badges have is_earned=true", all_earned_correct)
        
        # Test earned_at dates
        valid_dates = True
        for badge in earned_badges:
            earned_at = badge.get("earned_at")
            if earned_at:
                try:
                    datetime.fromisoformat(earned_at.replace('Z', '+00:00'))
                except:
                    valid_dates = False
                    break
        
        self.log_test("All earned badges have valid ISO dates", valid_dates)
        
        # Test sorting (newest first)
        if len(earned_badges) > 1:
            sorted_correctly = True
            for i in range(len(earned_badges) - 1):
                current_date = earned_badges[i].get("earned_at", "")
                next_date = earned_badges[i + 1].get("earned_at", "")
                if current_date < next_date:  # Should be descending
                    sorted_correctly = False
                    break
            self.log_test("Earned badges sorted by date (newest first)", sorted_correctly)
    
    def test_locked_badges_validation(self, data):
        """Test 5: Locked Badges Validation"""
        print("\n🔒 TEST 5: LOCKED BADGES VALIDATION")
        
        if not data:
            return
        
        locked_badges = data.get("locked_badges", [])
        
        # Test locked badges properties
        all_locked_correct = True
        for badge in locked_badges:
            if badge.get("is_earned"):
                all_locked_correct = False
                break
            if badge.get("earned_at") is not None:
                all_locked_correct = False
                break
            if badge.get("progress") >= 100:
                all_locked_correct = False
                break
        
        self.log_test("All locked badges have is_earned=false", all_locked_correct)
        self.log_test("All locked badges have earned_at=null", all_locked_correct)
        
        # Test sorting (by progress desc)
        if len(locked_badges) > 1:
            sorted_correctly = True
            for i in range(len(locked_badges) - 1):
                current_progress = locked_badges[i].get("progress", 0)
                next_progress = locked_badges[i + 1].get("progress", 0)
                if current_progress < next_progress:  # Should be descending
                    sorted_correctly = False
                    break
            self.log_test("Locked badges sorted by progress (desc)", sorted_correctly)
    
    def test_progress_calculations(self, data):
        """Test 6: Progress Calculation Test"""
        print("\n📊 TEST 6: PROGRESS CALCULATION TEST")
        
        if not data:
            return
        
        all_badges = data.get("earned_badges", []) + data.get("locked_badges", [])
        
        # Test milestone badges
        milestone_badges = [b for b in all_badges if b.get("badge_type", "").startswith("milestone_") or b.get("badge_type") == "first_visit"]
        for badge in milestone_badges[:3]:  # Test first 3
            badge_type = badge.get("badge_type", "")
            progress_text = badge.get("progress_text", "")
            
            if "visits" in progress_text:
                self.log_test(f"Milestone badge {badge_type} has correct progress format", True, f"Progress: {progress_text}")
            else:
                self.log_test(f"Milestone badge {badge_type} has correct progress format", False, f"Progress: {progress_text}")
        
        # Test points badges
        points_badges = [b for b in all_badges if b.get("badge_type", "").startswith("points_")]
        for badge in points_badges[:2]:  # Test first 2
            badge_type = badge.get("badge_type", "")
            progress_text = badge.get("progress_text", "")
            
            if "points" in progress_text and "," in progress_text:  # Should have comma formatting
                self.log_test(f"Points badge {badge_type} has correct progress format", True, f"Progress: {progress_text}")
            else:
                self.log_test(f"Points badge {badge_type} has correct progress format", False, f"Progress: {progress_text}")
        
        # Test social badges
        social_badges = [b for b in all_badges if b.get("badge_type", "").startswith("social_")]
        for badge in social_badges[:2]:  # Test first 2
            badge_type = badge.get("badge_type", "")
            progress_text = badge.get("progress_text", "")
            
            if "friends" in progress_text:
                self.log_test(f"Social badge {badge_type} has correct progress format", True, f"Progress: {progress_text}")
            else:
                self.log_test(f"Social badge {badge_type} has correct progress format", False, f"Progress: {progress_text}")
        
        # Test streak badges
        streak_badges = [b for b in all_badges if b.get("badge_type", "").startswith("streak_")]
        for badge in streak_badges[:2]:  # Test first 2
            badge_type = badge.get("badge_type", "")
            progress_text = badge.get("progress_text", "")
            
            if "days" in progress_text:
                self.log_test(f"Streak badge {badge_type} has correct progress format", True, f"Progress: {progress_text}")
            else:
                self.log_test(f"Streak badge {badge_type} has correct progress format", False, f"Progress: {progress_text}")
        
        # Test country complete badge
        country_badges = [b for b in all_badges if b.get("badge_type") == "country_complete"]
        for badge in country_badges:
            progress_text = badge.get("progress_text", "")
            
            if "completed" in progress_text:
                self.log_test("Country complete badge has correct progress format", True, f"Progress: {progress_text}")
            else:
                self.log_test("Country complete badge has correct progress format", False, f"Progress: {progress_text}")
    
    def test_stats_validation(self, data):
        """Test 7: Stats Validation"""
        print("\n📈 TEST 7: STATS VALIDATION")
        
        if not data:
            return
        
        stats = data.get("stats", {})
        earned_badges = data.get("earned_badges", [])
        locked_badges = data.get("locked_badges", [])
        
        # Test total badges = 16
        total_badges = stats.get("total_badges", 0)
        if total_badges == 16:
            self.log_test("Total badges equals 16", True)
        else:
            self.log_test("Total badges equals 16", False, f"Got {total_badges}")
        
        # Test earned + locked = total
        earned_count = stats.get("earned_count", 0)
        locked_count = stats.get("locked_count", 0)
        
        if earned_count + locked_count == total_badges:
            self.log_test("Earned + locked count equals total", True)
        else:
            self.log_test("Earned + locked count equals total", False, f"Earned: {earned_count}, Locked: {locked_count}, Total: {total_badges}")
        
        # Test completion percentage calculation
        expected_percentage = int((earned_count / total_badges) * 100) if total_badges > 0 else 0
        actual_percentage = stats.get("completion_percentage", 0)
        
        if actual_percentage == expected_percentage:
            self.log_test("Completion percentage calculated correctly", True, f"{actual_percentage}%")
        else:
            self.log_test("Completion percentage calculated correctly", False, f"Expected: {expected_percentage}%, Got: {actual_percentage}%")
    
    def test_edge_cases(self, data):
        """Test 8: Edge Cases"""
        print("\n🔍 TEST 8: EDGE CASES")
        
        if not data:
            return
        
        all_badges = data.get("earned_badges", []) + data.get("locked_badges", [])
        
        # Test all 16 badge types are present
        expected_badge_types = {
            "first_visit", "milestone_10", "milestone_25", "milestone_50", "milestone_100", 
            "milestone_250", "milestone_500", "country_complete", "points_100", "points_500", 
            "points_1000", "points_5000", "social_5", "social_10", "social_25", 
            "streak_3", "streak_7", "streak_30"
        }
        
        actual_badge_types = {badge.get("badge_type") for badge in all_badges}
        
        if len(actual_badge_types) == 16:
            self.log_test("All 16 badge types present", True)
        else:
            missing = expected_badge_types - actual_badge_types
            self.log_test("All 16 badge types present", False, f"Missing: {missing}")
        
        # Test no duplicate badge types
        badge_types_list = [badge.get("badge_type") for badge in all_badges]
        if len(badge_types_list) == len(set(badge_types_list)):
            self.log_test("No duplicate badge types", True)
        else:
            self.log_test("No duplicate badge types", False)
    
    def test_performance(self):
        """Test 9: Performance Test"""
        print("\n⚡ TEST 9: PERFORMANCE TEST")
        
        import time
        
        try:
            start_time = time.time()
            response = requests.get(f"{BACKEND_URL}/achievements/showcase", headers=self.get_headers())
            end_time = time.time()
            
            response_time = end_time - start_time
            
            if response.status_code == 200 and response_time < 2.0:
                self.log_test("Response time < 2 seconds", True, f"{response_time:.2f}s")
            else:
                self.log_test("Response time < 2 seconds", False, f"{response_time:.2f}s")
                
        except Exception as e:
            self.log_test("Performance test", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🎯 BACKEND TESTING: Achievement Showcase API - v4.17")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all tests
        self.test_endpoint_availability()
        
        # Get data for subsequent tests
        response = requests.get(f"{BACKEND_URL}/achievements/showcase", headers=self.get_headers())
        data = response.json() if response.status_code == 200 else None
        
        if data:
            print(f"\n📊 SAMPLE DATA PREVIEW:")
            print(f"   Earned badges: {len(data.get('earned_badges', []))}")
            print(f"   Locked badges: {len(data.get('locked_badges', []))}")
            print(f"   Total badges: {data.get('stats', {}).get('total_badges', 0)}")
            print(f"   Completion: {data.get('stats', {}).get('completion_percentage', 0)}%")
        
        self.test_response_structure()
        self.test_badge_data_validation(data)
        self.test_earned_badges_validation(data)
        self.test_locked_badges_validation(data)
        self.test_progress_calculations(data)
        self.test_stats_validation(data)
        self.test_edge_cases(data)
        self.test_performance()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.test_results if result["passed"])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED - ACHIEVEMENT SHOWCASE API IS WORKING PERFECTLY!")
        else:
            print("❌ Some tests failed. See details above.")
            
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = AchievementShowcaseAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)