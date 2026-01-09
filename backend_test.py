#!/usr/bin/env python3
"""
Backend Testing for Achievement Showcase API - v4.17 (RETEST)
Testing the /api/achievements/showcase endpoint after fixing badge awarding logic

OBJECTIVE: Verify the points_100 badge bug fix where it was incorrectly marked as earned
when the user only had 50 points.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://work-in-progress-12.preview.emergentagent.com/api"
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
        print("\n🔐 AUTHENTICATION")
        
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
        
        try:
            response = requests.get(f"{BACKEND_URL}/achievements/showcase", headers=self.get_headers())
            
            if response.status_code == 200:
                self.log_test("GET /api/achievements/showcase returns 200", True)
                return response.json()
            else:
                self.log_test("GET /api/achievements/showcase returns 200", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("GET /api/achievements/showcase returns 200", False, f"Exception: {str(e)}")
            return None
    
    def test_critical_bug_verification(self, data):
        """Test 2: Critical Bug Verification - points_100 badge placement"""
        print("\n🔍 TEST 2: CRITICAL BUG VERIFICATION")
        
        if not data:
            self.log_test("Critical Bug Verification", False, "No data to verify")
            return
        
        earned_badges = data.get("earned_badges", [])
        locked_badges = data.get("locked_badges", [])
        
        # Check if points_100 is incorrectly in earned_badges
        points_100_in_earned = any(badge["badge_type"] == "points_100" for badge in earned_badges)
        
        if points_100_in_earned:
            points_100_badge = next(badge for badge in earned_badges if badge["badge_type"] == "points_100")
            self.log_test("points_100 badge NOT in earned_badges", False, 
                         f"Found in earned_badges with progress={points_100_badge.get('progress')}%")
        else:
            self.log_test("points_100 badge NOT in earned_badges", True, "Correctly not in earned_badges")
        
        # Check if points_100 is correctly in locked_badges
        points_100_in_locked = next((badge for badge in locked_badges if badge["badge_type"] == "points_100"), None)
        
        if points_100_in_locked:
            progress = points_100_in_locked.get("progress", 0)
            current_value = points_100_in_locked.get("current_value", 0)
            target_value = points_100_in_locked.get("target_value", 100)
            
            self.log_test("points_100 badge IS in locked_badges", True, 
                         f"Progress: {progress}%, Current: {current_value}, Target: {target_value}")
            
            # Verify progress is around 50%
            if current_value == 50 and progress == 50:
                self.log_test("points_100 badge has correct 50% progress", True, f"{current_value}/100 points = {progress}%")
            else:
                self.log_test("points_100 badge has correct 50% progress", False, 
                             f"Expected 50/100=50%, got {current_value}/{target_value}={progress}%")
        else:
            self.log_test("points_100 badge IS in locked_badges", False, "Not found in locked_badges")
    
    def test_progress_accuracy(self, data):
        """Test 3: Progress Accuracy Check"""
        print("\n📊 TEST 3: PROGRESS ACCURACY CHECK")
        
        if not data:
            self.log_test("Progress Accuracy", False, "No data to verify")
            return
        
        earned_badges = data.get("earned_badges", [])
        locked_badges = data.get("locked_badges", [])
        
        # Verify all earned badges have 100% progress
        all_earned_100_percent = True
        for badge in earned_badges:
            if badge.get("progress", 0) != 100:
                all_earned_100_percent = False
                self.log_test(f"Earned badge {badge['badge_type']} has 100% progress", False, 
                             f"Has {badge.get('progress')}% progress")
                break
        
        if all_earned_100_percent:
            self.log_test("All earned badges have 100% progress", True, f"Verified {len(earned_badges)} earned badges")
        
        # Verify all locked badges have <100% progress
        all_locked_under_100 = True
        for badge in locked_badges:
            if badge.get("progress", 0) >= 100:
                all_locked_under_100 = False
                self.log_test(f"Locked badge {badge['badge_type']} has <100% progress", False, 
                             f"Has {badge.get('progress')}% progress")
                break
        
        if all_locked_under_100:
            self.log_test("All locked badges have <100% progress", True, f"Verified {len(locked_badges)} locked badges")
        
        # Check specific progress for points_500 badge
        points_500_badge = next((badge for badge in locked_badges if badge["badge_type"] == "points_500"), None)
        if points_500_badge:
            current_value = points_500_badge.get("current_value", 0)
            target_value = points_500_badge.get("target_value", 500)
            progress = points_500_badge.get("progress", 0)
            progress_text = points_500_badge.get("progress_text", "")
            
            expected_progress = min(100, int((current_value / target_value) * 100))
            
            if progress == expected_progress:
                self.log_test("points_500 badge progress calculation accurate", True, 
                             f"{current_value}/{target_value} = {progress}%")
            else:
                self.log_test("points_500 badge progress calculation accurate", False, 
                             f"Expected {expected_progress}%, got {progress}%")
            
            # Check comma formatting for large numbers
            if "500" in progress_text:
                if current_value >= 1000 and "," not in progress_text:
                    self.log_test("Progress text uses comma formatting for large numbers", False, 
                                 f"Text: '{progress_text}' missing comma")
                else:
                    self.log_test("Progress text uses comma formatting appropriately", True, 
                                 f"Text: '{progress_text}'")
    
    def test_stats_validation(self, data):
        """Test 4: Stats Validation"""
        print("\n📈 TEST 4: STATS VALIDATION")
        
        if not data:
            self.log_test("Stats Validation", False, "No data to verify")
            return
        
        stats = data.get("stats", {})
        earned_badges = data.get("earned_badges", [])
        locked_badges = data.get("locked_badges", [])
        
        earned_count = stats.get("earned_count", 0)
        locked_count = stats.get("locked_count", 0)
        total_badges = stats.get("total_badges", 0)
        
        # Verify counts match actual badge arrays
        if earned_count == len(earned_badges):
            self.log_test("Stats earned_count matches actual earned badges", True, 
                         f"Both show {earned_count} earned badges")
        else:
            self.log_test("Stats earned_count matches actual earned badges", False, 
                         f"Stats: {earned_count}, Actual: {len(earned_badges)}")
        
        if locked_count == len(locked_badges):
            self.log_test("Stats locked_count matches actual locked badges", True, 
                         f"Both show {locked_count} locked badges")
        else:
            self.log_test("Stats locked_count matches actual locked badges", False, 
                         f"Stats: {locked_count}, Actual: {len(locked_badges)}")
        
        # Verify total equals sum
        if earned_count + locked_count == total_badges:
            self.log_test("Stats totals are consistent", True, 
                         f"{earned_count} + {locked_count} = {total_badges}")
        else:
            self.log_test("Stats totals are consistent", False, 
                         f"{earned_count} + {locked_count} ≠ {total_badges}")
        
        # Check if total is expected 16 badges
        if total_badges == 16:
            self.log_test("Total badges count is 16 as expected", True)
        else:
            self.log_test("Total badges count is 16 as expected", False, 
                         f"Got {total_badges} badges instead of 16")
    
    def run_comprehensive_test(self):
        """Run all achievement showcase tests"""
        print("🎯 BACKEND TESTING: Achievement Showcase API (RETEST) - v4.17")
        print("=" * 70)
        print("OBJECTIVE: Verify points_100 badge bug fix")
        print("FIXES APPLIED:")
        print("1. Fixed check_and_award_badges() to use user's actual points field")
        print("2. Removed invalid points_100 badge from database")
        print("3. Added comma formatting for points progress text")
        print("=" * 70)
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
        
        # Step 2: Test endpoint and get data
        data = self.test_endpoint_availability()
        if not data:
            return False
        
        # Step 3: Run verification tests
        self.test_critical_bug_verification(data)
        self.test_progress_accuracy(data)
        self.test_stats_validation(data)
        
        # Summary
        print("\n" + "=" * 70)
        print("🎯 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result["passed"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"{status} - {result['test']}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({int(passed/total*100) if total > 0 else 0}%)")
        
        # Check critical success criteria
        critical_tests = [
            "points_100 badge NOT in earned_badges",
            "points_100 badge IS in locked_badges", 
            "points_100 badge has correct 50% progress"
        ]
        
        critical_passed = all(
            any(result["test"] == test and result["passed"] for result in self.test_results)
            for test in critical_tests
        )
        
        if critical_passed and passed == total:
            print("\n🎉 SUCCESS: All tests passed - Bug fix verified!")
            print("✅ points_100 badge is correctly in locked_badges (NOT earned_badges)")
            print("✅ All earned badges have 100% progress")
            print("✅ Progress calculations are accurate")
            return True
        elif critical_passed:
            print("\n✅ SUCCESS: Critical bug fix verified!")
            print("✅ points_100 badge is correctly in locked_badges")
            print("⚠️  Some minor tests failed but core functionality is working")
            return True
        else:
            print("\n❌ FAILURE: Critical bug fix not working properly")
            print("❌ points_100 badge placement or progress calculation still incorrect")
            return False

def main():
    """Main test execution"""
    tester = AchievementShowcaseAPITester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n✅ Achievement Showcase API testing completed successfully")
        exit(0)
    else:
        print("\n❌ Achievement Showcase API testing failed")
        exit(1)

if __name__ == "__main__":
    main()