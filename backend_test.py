#!/usr/bin/env python3
"""
Enhanced Leaderboard API Testing - v4.16
Comprehensive testing of the enhanced /api/leaderboard endpoint with all filter combinations
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://leaderboard-dev.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class LeaderboardTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate and get JWT token"""
        print("🔐 Authenticating...")
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.log_test("Authentication", True, f"User ID: {self.user_id}")
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
    
    def test_time_period_filters(self):
        """Test all time period filter combinations"""
        print("\n🕒 Testing Time Period Filters...")
        
        time_periods = ["all_time", "monthly", "weekly"]
        
        for period in time_periods:
            try:
                response = requests.get(
                    f"{BASE_URL}/leaderboard",
                    params={"time_period": period, "category": "points"},
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = ["leaderboard", "user_rank", "total_users"]
                    if all(field in data for field in required_fields):
                        self.log_test(f"Time Period Filter: {period}", True, 
                                    f"Users: {data['total_users']}, User Rank: {data['user_rank']}")
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Time Period Filter: {period}", False, 
                                    f"Missing fields: {missing}")
                else:
                    self.log_test(f"Time Period Filter: {period}", False, 
                                f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Time Period Filter: {period}", False, f"Exception: {str(e)}")
    
    def test_category_filters(self):
        """Test all category filter combinations"""
        print("\n📊 Testing Category Filters...")
        
        categories = ["points", "visits", "countries", "streaks"]
        
        for category in categories:
            try:
                response = requests.get(
                    f"{BASE_URL}/leaderboard",
                    params={"category": category, "time_period": "all_time"},
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    if "leaderboard" in data and len(data["leaderboard"]) > 0:
                        entry = data["leaderboard"][0]
                        
                        # Check required fields for leaderboard entry
                        required_entry_fields = ["user_id", "name", "value", "rank"]
                        if all(field in entry for field in required_entry_fields):
                            # Check category-specific fields
                            if category in ["points", "streaks"]:
                                if "current_streak" in entry and "longest_streak" in entry:
                                    self.log_test(f"Category Filter: {category}", True, 
                                                f"Top value: {entry['value']}, Extra fields present")
                                else:
                                    self.log_test(f"Category Filter: {category}", False, 
                                                "Missing streak fields for points/streaks category")
                            else:
                                self.log_test(f"Category Filter: {category}", True, 
                                            f"Top value: {entry['value']}")
                        else:
                            missing = [f for f in required_entry_fields if f not in entry]
                            self.log_test(f"Category Filter: {category}", False, 
                                        f"Missing entry fields: {missing}")
                    else:
                        self.log_test(f"Category Filter: {category}", True, 
                                    "Empty leaderboard (no data)")
                else:
                    self.log_test(f"Category Filter: {category}", False, 
                                f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Category Filter: {category}", False, f"Exception: {str(e)}")
    
    def test_friends_filter(self):
        """Test friends_only filter"""
        print("\n👥 Testing Friends Filter...")
        
        # Test global leaderboard (friends_only=false)
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"friends_only": False},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                global_data = response.json()
                global_count = global_data["total_users"]
                self.log_test("Friends Filter: Global (friends_only=false)", True, 
                            f"Global users: {global_count}")
            else:
                self.log_test("Friends Filter: Global (friends_only=false)", False, 
                            f"Status: {response.status_code}")
                global_count = 0
                
        except Exception as e:
            self.log_test("Friends Filter: Global (friends_only=false)", False, f"Exception: {str(e)}")
            global_count = 0
        
        # Test friends-only leaderboard (friends_only=true)
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"friends_only": True},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                friends_data = response.json()
                friends_count = friends_data["total_users"]
                
                # Friends-only should include current user + accepted friends
                # So it should be <= global count
                if friends_count <= global_count:
                    self.log_test("Friends Filter: Friends-only (friends_only=true)", True, 
                                f"Friends users: {friends_count} (≤ global: {global_count})")
                else:
                    self.log_test("Friends Filter: Friends-only (friends_only=true)", False, 
                                f"Friends count ({friends_count}) > global count ({global_count})")
            else:
                self.log_test("Friends Filter: Friends-only (friends_only=true)", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Friends Filter: Friends-only (friends_only=true)", False, f"Exception: {str(e)}")
    
    def test_combination_filters(self):
        """Test combination of multiple filters"""
        print("\n🔄 Testing Filter Combinations...")
        
        test_combinations = [
            {"time_period": "weekly", "category": "countries", "friends_only": True},
            {"time_period": "monthly", "category": "visits", "friends_only": False},
            {"time_period": "all_time", "category": "streaks", "friends_only": True},
        ]
        
        for i, params in enumerate(test_combinations, 1):
            try:
                response = requests.get(
                    f"{BASE_URL}/leaderboard",
                    params=params,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    if all(field in data for field in ["leaderboard", "user_rank", "total_users"]):
                        self.log_test(f"Combination Test {i}", True, 
                                    f"Params: {params}, Users: {data['total_users']}")
                    else:
                        self.log_test(f"Combination Test {i}", False, 
                                    f"Invalid response structure")
                else:
                    self.log_test(f"Combination Test {i}", False, 
                                f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Combination Test {i}", False, f"Exception: {str(e)}")
    
    def test_response_structure(self):
        """Test detailed response structure validation"""
        print("\n🏗️ Testing Response Structure...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"category": "points", "limit": 5},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Test top-level structure
                required_top_fields = ["leaderboard", "user_rank", "total_users"]
                missing_top = [f for f in required_top_fields if f not in data]
                
                if not missing_top:
                    self.log_test("Response Structure: Top Level", True, 
                                "All required top-level fields present")
                else:
                    self.log_test("Response Structure: Top Level", False, 
                                f"Missing fields: {missing_top}")
                    return
                
                # Test leaderboard entry structure
                if data["leaderboard"]:
                    entry = data["leaderboard"][0]
                    required_entry_fields = ["user_id", "name", "value", "rank"]
                    optional_entry_fields = ["picture", "username", "current_streak", "longest_streak"]
                    
                    missing_entry = [f for f in required_entry_fields if f not in entry]
                    
                    if not missing_entry:
                        present_optional = [f for f in optional_entry_fields if f in entry]
                        self.log_test("Response Structure: Leaderboard Entry", True, 
                                    f"Required fields present, Optional fields: {present_optional}")
                    else:
                        self.log_test("Response Structure: Leaderboard Entry", False, 
                                    f"Missing required fields: {missing_entry}")
                else:
                    self.log_test("Response Structure: Leaderboard Entry", True, 
                                "Empty leaderboard (no entries to validate)")
                
                # Test data types
                if isinstance(data["total_users"], int) and (data["user_rank"] is None or isinstance(data["user_rank"], int)):
                    self.log_test("Response Structure: Data Types", True, 
                                f"total_users: {type(data['total_users'])}, user_rank: {type(data['user_rank'])}")
                else:
                    self.log_test("Response Structure: Data Types", False, 
                                f"Invalid data types")
                    
            else:
                self.log_test("Response Structure", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Response Structure", False, f"Exception: {str(e)}")
    
    def test_ranking_verification(self):
        """Test ranking accuracy and sorting"""
        print("\n🏆 Testing Ranking Verification...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"category": "points", "limit": 10},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                leaderboard = data["leaderboard"]
                
                if len(leaderboard) > 1:
                    # Test rank sequence (should be 1, 2, 3, ...)
                    ranks_correct = all(
                        entry["rank"] == idx + 1 
                        for idx, entry in enumerate(leaderboard)
                    )
                    
                    if ranks_correct:
                        self.log_test("Ranking: Rank Sequence", True, 
                                    f"Ranks 1-{len(leaderboard)} correctly assigned")
                    else:
                        self.log_test("Ranking: Rank Sequence", False, 
                                    "Rank sequence is incorrect")
                    
                    # Test sorting (values should be in descending order)
                    values_sorted = all(
                        leaderboard[i]["value"] >= leaderboard[i+1]["value"]
                        for i in range(len(leaderboard)-1)
                    )
                    
                    if values_sorted:
                        self.log_test("Ranking: Value Sorting", True, 
                                    f"Values properly sorted (desc): {[e['value'] for e in leaderboard[:3]]}")
                    else:
                        self.log_test("Ranking: Value Sorting", False, 
                                    "Values not properly sorted in descending order")
                else:
                    self.log_test("Ranking Verification", True, 
                                f"Only {len(leaderboard)} entries - cannot verify sorting")
                    
            else:
                self.log_test("Ranking Verification", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Ranking Verification", False, f"Exception: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and limits"""
        print("\n🔍 Testing Edge Cases...")
        
        # Test with limit parameter
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"limit": 5},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                actual_count = len(data["leaderboard"])
                
                if actual_count <= 5:
                    self.log_test("Edge Case: Limit Parameter", True, 
                                f"Returned {actual_count} entries (≤ limit of 5)")
                else:
                    self.log_test("Edge Case: Limit Parameter", False, 
                                f"Returned {actual_count} entries (> limit of 5)")
            else:
                self.log_test("Edge Case: Limit Parameter", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Edge Case: Limit Parameter", False, f"Exception: {str(e)}")
        
        # Test invalid parameters
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"category": "invalid_category"},
                headers=self.get_headers()
            )
            
            # Should either return 400 error or default to valid category
            if response.status_code in [200, 400]:
                self.log_test("Edge Case: Invalid Category", True, 
                            f"Handled invalid category appropriately (status: {response.status_code})")
            else:
                self.log_test("Edge Case: Invalid Category", False, 
                            f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Edge Case: Invalid Category", False, f"Exception: {str(e)}")
    
    def test_user_rank_accuracy(self):
        """Test user_rank calculation accuracy"""
        print("\n🎯 Testing User Rank Accuracy...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/leaderboard",
                params={"category": "points"},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                user_rank = data["user_rank"]
                leaderboard = data["leaderboard"]
                
                if user_rank is not None:
                    # Find current user in leaderboard
                    user_entry = None
                    for entry in leaderboard:
                        if entry["user_id"] == self.user_id:
                            user_entry = entry
                            break
                    
                    if user_entry:
                        if user_entry["rank"] == user_rank:
                            self.log_test("User Rank Accuracy", True, 
                                        f"User rank {user_rank} matches leaderboard position")
                        else:
                            self.log_test("User Rank Accuracy", False, 
                                        f"User rank {user_rank} != leaderboard rank {user_entry['rank']}")
                    else:
                        # User not in current page but has rank - this is valid
                        self.log_test("User Rank Accuracy", True, 
                                    f"User rank {user_rank} (not in current page)")
                else:
                    self.log_test("User Rank Accuracy", True, 
                                "User rank is null (user not in leaderboard)")
                    
            else:
                self.log_test("User Rank Accuracy", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("User Rank Accuracy", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all leaderboard tests"""
        print("🎯 ENHANCED LEADERBOARD API TESTING - v4.16")
        print("=" * 60)
        
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_time_period_filters()
        self.test_category_filters()
        self.test_friends_filter()
        self.test_combination_filters()
        self.test_response_structure()
        self.test_ranking_verification()
        self.test_edge_cases()
        self.test_user_rank_accuracy()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = LeaderboardTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)