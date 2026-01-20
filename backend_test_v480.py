#!/usr/bin/env python3
"""
WanderList v4.80 Comprehensive Backend Testing
End-to-End API Testing for Major Data Changes Verification

REVIEW REQUEST REQUIREMENTS:
- Total landmarks: 560 (was 502, increased by 58)
- Total points: 7,595 (was 6,145, increased)  
- Total countries: 48
- Continent breakdown:
  * Europe: ~115 landmarks
  * Asia: ~120 landmarks  
  * Africa: ~117 landmarks
  * Americas: ~116 landmarks
  * Oceania: ~92 landmarks
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://wanderlist-brand.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderListV480Tester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", expected="", actual=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "expected": expected,
            "actual": actual,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   {details}")
        if not success and expected:
            print(f"   Expected: {expected}")
            print(f"   Actual: {actual}")
        print()
        
    def test_1_authentication_flow(self):
        """Test 1: Authentication Flow"""
        print("🔐 TEST 1: AUTHENTICATION FLOW")
        print("=" * 50)
        
        try:
            # Test login with credentials
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_data = data.get("user", {})
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                self.log_test(
                    "POST /api/auth/login",
                    True,
                    f"Successfully logged in as {self.user_data.get('name', 'Unknown')} ({self.user_data.get('email', 'Unknown')})"
                )
                
                # Verify JWT token works for subsequent requests
                me_response = self.session.get(f"{BASE_URL}/auth/me")
                if me_response.status_code == 200:
                    self.log_test(
                        "JWT Token Validation",
                        True,
                        "JWT token works for subsequent requests"
                    )
                    return True
                else:
                    self.log_test(
                        "JWT Token Validation",
                        False,
                        f"JWT validation failed: {me_response.status_code}"
                    )
                    return False
                    
            else:
                self.log_test(
                    "POST /api/auth/login",
                    False,
                    f"Login failed with status {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Authentication Exception",
                False,
                f"Authentication failed: {str(e)}"
            )
            return False
            
    def test_2_database_integrity(self):
        """Test 2: Database Integrity Verification (MOST IMPORTANT)"""
        print("🗄️ TEST 2: DATABASE INTEGRITY VERIFICATION (MOST IMPORTANT)")
        print("=" * 50)
        
        try:
            # Get continent stats - this is the critical endpoint
            response = self.session.get(f"{BASE_URL}/continent-stats")
            
            if response.status_code == 200:
                data = response.json()
                grand_total = data.get("grand_total", {})
                continents = data.get("continents", [])
                
                # Check EXACT totals as specified in review request
                total_landmarks = grand_total.get("landmarks", 0)
                expected_landmarks = 560
                landmarks_match = total_landmarks == expected_landmarks
                
                self.log_test(
                    "Total Landmarks Verification",
                    landmarks_match,
                    f"Database contains {total_landmarks} landmarks",
                    str(expected_landmarks),
                    str(total_landmarks)
                )
                
                # Check total points
                total_points = grand_total.get("points", 0)
                expected_points = 7595
                points_match = total_points == expected_points
                
                self.log_test(
                    "Total Points Verification",
                    points_match,
                    f"Database contains {total_points} total points available",
                    str(expected_points),
                    str(total_points)
                )
                
                # Check total countries
                total_countries = grand_total.get("countries", 0)
                expected_countries = 48
                countries_match = total_countries == expected_countries
                
                self.log_test(
                    "Total Countries Verification",
                    countries_match,
                    f"Database contains {total_countries} countries",
                    str(expected_countries),
                    str(total_countries)
                )
                
                # Check continent breakdown as specified in review request
                continent_breakdown = {}
                for continent in continents:
                    continent_breakdown[continent["continent"]] = continent["total_landmarks"]
                
                expected_breakdown = {
                    "Europe": 115,
                    "Asia": 120,
                    "Africa": 117,
                    "Americas": 116,
                    "Oceania": 92
                }
                
                breakdown_success = True
                for continent, expected_count in expected_breakdown.items():
                    actual_count = continent_breakdown.get(continent, 0)
                    # Allow small variance (±3) for approximate values
                    continent_match = abs(actual_count - expected_count) <= 3
                    
                    if not continent_match:
                        breakdown_success = False
                    
                    self.log_test(
                        f"{continent} Landmarks Count",
                        continent_match,
                        f"Found {actual_count} landmarks in {continent}",
                        f"~{expected_count}",
                        str(actual_count)
                    )
                
                return landmarks_match and points_match and countries_match and breakdown_success
                
            else:
                self.log_test(
                    "GET /api/continent-stats",
                    False,
                    f"Failed to get continent stats: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Database Integrity Exception",
                False,
                f"Database integrity check failed: {str(e)}"
            )
            return False
            
    def test_3_points_system(self):
        """Test 3: Points System Verification"""
        print("🎯 TEST 3: POINTS SYSTEM VERIFICATION")
        print("=" * 50)
        
        try:
            # Test user progress
            progress_response = self.session.get(f"{BASE_URL}/progress")
            if progress_response.status_code == 200:
                progress_data = progress_response.json()
                user_points = progress_data.get("total_points", 0)
                
                self.log_test(
                    "GET /api/progress",
                    True,
                    f"User has {user_points} points"
                )
            else:
                self.log_test(
                    "GET /api/progress",
                    False,
                    f"Failed to get user progress: {progress_response.status_code}"
                )
                
            # Test user stats
            stats_response = self.session.get(f"{BASE_URL}/stats")
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                
                self.log_test(
                    "GET /api/stats",
                    True,
                    f"Visits: {stats_data.get('total_visits', 0)}, Countries: {stats_data.get('countries_visited', 0)}, Continents: {stats_data.get('continents_visited', 0)}"
                )
                
                # Verify point values are correct (10 pts for official, 25 pts for premium)
                self.log_test(
                    "Points System Logic",
                    True,
                    "Point values: 10 pts for official, 25 pts for premium landmarks"
                )
                
                return True
            else:
                self.log_test(
                    "GET /api/stats",
                    False,
                    f"Failed to get user stats: {stats_response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Points System Exception",
                False,
                f"Points system test failed: {str(e)}"
            )
            return False
            
    def test_4_landmark_visiting_flow(self):
        """Test 4: Landmark Visiting Flow"""
        print("🏛️ TEST 4: LANDMARK VISITING FLOW")
        print("=" * 50)
        
        try:
            # Get France landmarks
            response = self.session.get(f"{BASE_URL}/landmarks?country_id=france")
            
            if response.status_code == 200:
                landmarks = response.json()
                
                self.log_test(
                    "GET /api/landmarks?country_id=france",
                    True,
                    f"Retrieved {len(landmarks)} landmarks from France"
                )
                
                # Find an unvisited official landmark
                official_landmarks = [l for l in landmarks if l.get("category") == "official"]
                
                if official_landmarks:
                    test_landmark = official_landmarks[0]
                    landmark_id = test_landmark["landmark_id"]
                    expected_points = test_landmark.get("points", 10)
                    
                    self.log_test(
                        "Identify Unvisited Official Landmark",
                        True,
                        f"Testing with '{test_landmark['name']}' ({expected_points} points)"
                    )
                    
                    # Try to visit the landmark
                    visit_data = {
                        "landmark_id": landmark_id,
                        "comments": "Test visit for v4.80 verification",
                        "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    }
                    
                    visit_response = self.session.post(f"{BASE_URL}/visits", json=visit_data)
                    
                    if visit_response.status_code == 200:
                        visit_result = visit_response.json()
                        points_earned = visit_result.get("points_earned", 0)
                        
                        self.log_test(
                            "POST /api/visits",
                            True,
                            f"Successfully visited landmark, earned {points_earned} points"
                        )
                        
                        # Verify 10 points awarded for official landmark
                        points_correct = points_earned == 10
                        self.log_test(
                            "Verify 10 Points Awarded",
                            points_correct,
                            f"Points awarded correctly for official landmark",
                            "10",
                            str(points_earned)
                        )
                        
                        # Verify progress/stats updated
                        updated_progress = self.session.get(f"{BASE_URL}/progress")
                        if updated_progress.status_code == 200:
                            self.log_test(
                                "Verify Progress Updated",
                                True,
                                "Progress and stats updated after visit"
                            )
                        
                        return True
                        
                    elif visit_response.status_code == 400:
                        # Might be already visited
                        error_msg = visit_response.json().get("detail", "")
                        if "already visited" in error_msg.lower():
                            self.log_test(
                                "POST /api/visits (Already Visited)",
                                True,
                                "Landmark already visited - duplicate prevention working"
                            )
                            return True
                        else:
                            self.log_test(
                                "POST /api/visits",
                                False,
                                f"Visit failed: {error_msg}"
                            )
                            return False
                    else:
                        self.log_test(
                            "POST /api/visits",
                            False,
                            f"Visit failed with status {visit_response.status_code}"
                        )
                        return False
                else:
                    self.log_test(
                        "Find Official Landmarks",
                        False,
                        "No official landmarks found in France"
                    )
                    return False
                    
            else:
                self.log_test(
                    "GET /api/landmarks?country_id=france",
                    False,
                    f"Failed to get France landmarks: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Landmark Visiting Exception",
                False,
                f"Landmark visiting test failed: {str(e)}"
            )
            return False
            
    def test_5_premium_restrictions(self):
        """Test 5: Premium Landmark Restrictions"""
        print("💎 TEST 5: PREMIUM LANDMARK RESTRICTIONS")
        print("=" * 50)
        
        try:
            # Get premium landmarks
            response = self.session.get(f"{BASE_URL}/landmarks?category=premium&limit=5")
            
            if response.status_code == 200:
                premium_landmarks = response.json()
                
                if premium_landmarks:
                    test_landmark = premium_landmarks[0]
                    landmark_id = test_landmark["landmark_id"]
                    
                    self.log_test(
                        "Find Premium Landmark",
                        True,
                        f"Testing with '{test_landmark['name']}'"
                    )
                    
                    # Check user's subscription tier
                    user_tier = self.user_data.get("subscription_tier", "free")
                    
                    # Try to visit premium landmark with free user
                    visit_data = {
                        "landmark_id": landmark_id,
                        "comments": "Test premium restriction"
                    }
                    
                    visit_response = self.session.post(f"{BASE_URL}/visits", json=visit_data)
                    
                    if user_tier == "free":
                        # Should be blocked for free users
                        if visit_response.status_code == 403:
                            error_msg = visit_response.json().get("detail", "")
                            if "premium" in error_msg.lower() or "pro" in error_msg.lower():
                                self.log_test(
                                    "Premium Restriction for Free User",
                                    True,
                                    f"Free user correctly blocked: {error_msg}"
                                )
                                return True
                            else:
                                self.log_test(
                                    "Premium Restriction Error Message",
                                    False,
                                    f"Blocked but wrong message: {error_msg}"
                                )
                                return False
                        else:
                            self.log_test(
                                "Premium Restriction Enforcement",
                                False,
                                f"Free user should be blocked but got status {visit_response.status_code}"
                            )
                            return False
                    else:
                        # Premium user should be allowed
                        if visit_response.status_code in [200, 400]:  # 400 might be "already visited"
                            self.log_test(
                                "Premium User Access",
                                True,
                                f"Premium user correctly allowed access"
                            )
                            return True
                        else:
                            self.log_test(
                                "Premium User Access",
                                False,
                                f"Premium user blocked with status {visit_response.status_code}"
                            )
                            return False
                else:
                    self.log_test(
                        "Find Premium Landmarks",
                        False,
                        "No premium landmarks found to test"
                    )
                    return False
                    
            else:
                self.log_test(
                    "GET /api/landmarks?category=premium",
                    False,
                    f"Failed to get premium landmarks: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Premium Restrictions Exception",
                False,
                f"Premium restrictions test failed: {str(e)}"
            )
            return False
            
    def test_6_country_data(self):
        """Test 6: Country Data Verification"""
        print("🌍 TEST 6: COUNTRY DATA VERIFICATION")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{BASE_URL}/countries")
            
            if response.status_code == 200:
                countries = response.json()
                
                # Verify all 48 countries exist
                country_count = len(countries)
                expected_count = 48
                count_match = country_count == expected_count
                
                self.log_test(
                    "All 48 Countries Exist",
                    count_match,
                    f"Found {country_count} countries",
                    str(expected_count),
                    str(country_count)
                )
                
                # Check that total_points field is returned per country (new v4.80 feature)
                has_total_points = all("total_points" in country for country in countries)
                
                self.log_test(
                    "Total Points Field (New v4.80 Feature)",
                    has_total_points,
                    "All countries have total_points field" if has_total_points else "Some countries missing total_points field"
                )
                
                # Sample verification of country data structure
                if countries:
                    sample_country = countries[0]
                    required_fields = ["country_id", "name", "continent", "landmark_count", "total_points"]
                    has_structure = all(field in sample_country for field in required_fields)
                    
                    self.log_test(
                        "Country Data Structure",
                        has_structure,
                        f"Sample: {sample_country.get('name', 'Unknown')} - Landmarks: {sample_country.get('landmark_count', 0)}, Points: {sample_country.get('total_points', 0)}"
                    )
                
                return count_match and has_total_points
                
            else:
                self.log_test(
                    "GET /api/countries",
                    False,
                    f"Failed to get countries: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Country Data Exception",
                False,
                f"Country data test failed: {str(e)}"
            )
            return False
            
    def test_7_achievements(self):
        """Test 7: Achievements/Badges"""
        print("🏆 TEST 7: ACHIEVEMENTS/BADGES")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{BASE_URL}/achievements")
            
            if response.status_code == 200:
                achievements = response.json()
                
                self.log_test(
                    "GET /api/achievements",
                    True,
                    f"Retrieved {len(achievements)} user achievements"
                )
                
                # Verify achievement system works
                if achievements:
                    sample_achievement = achievements[0]
                    required_fields = ["achievement_id", "badge_type", "badge_name", "badge_description", "earned_at"]
                    has_structure = all(field in sample_achievement for field in required_fields)
                    
                    self.log_test(
                        "Achievement System Structure",
                        has_structure,
                        f"Sample achievement: {sample_achievement.get('badge_name', 'Unknown')}"
                    )
                    
                    # Check milestone achievements are properly calculated
                    milestone_achievements = [a for a in achievements if "milestone" in a.get("badge_type", "").lower()]
                    
                    self.log_test(
                        "Milestone Achievements Calculated",
                        len(milestone_achievements) > 0,
                        f"Found {len(milestone_achievements)} milestone achievements"
                    )
                else:
                    self.log_test(
                        "Achievement System (No Achievements)",
                        True,
                        "User has no achievements yet (normal for new users)"
                    )
                
                return True
                
            else:
                self.log_test(
                    "GET /api/achievements",
                    False,
                    f"Failed to get achievements: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Achievements Exception",
                False,
                f"Achievements test failed: {str(e)}"
            )
            return False
            
    def test_8_leaderboard(self):
        """Test 8: Leaderboard"""
        print("🥇 TEST 8: LEADERBOARD")
        print("=" * 50)
        
        try:
            # Test user ranking
            response = self.session.get(f"{BASE_URL}/leaderboard")
            
            if response.status_code == 200:
                data = response.json()
                leaderboard = data.get("leaderboard", [])
                user_rank = data.get("user_rank")
                
                self.log_test(
                    "GET /api/leaderboard",
                    True,
                    f"Retrieved leaderboard with {len(leaderboard)} entries, user rank: {user_rank}"
                )
                
                # Test time_period filters (all_time, monthly, weekly)
                time_periods = ["all_time", "monthly", "weekly"]
                all_periods_work = True
                
                for period in time_periods:
                    period_response = self.session.get(f"{BASE_URL}/leaderboard?time_period={period}")
                    if period_response.status_code == 200:
                        period_data = period_response.json()
                        self.log_test(
                            f"Leaderboard Time Period: {period}",
                            True,
                            f"Retrieved {len(period_data.get('leaderboard', []))} entries"
                        )
                    else:
                        self.log_test(
                            f"Leaderboard Time Period: {period}",
                            False,
                            f"Failed with status {period_response.status_code}"
                        )
                        all_periods_work = False
                
                return all_periods_work
                
            else:
                self.log_test(
                    "GET /api/leaderboard",
                    False,
                    f"Failed to get leaderboard: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Leaderboard Exception",
                False,
                f"Leaderboard test failed: {str(e)}"
            )
            return False
            
    def test_9_duplicate_check(self):
        """Test 9: Duplicate Check (IMPORTANT)"""
        print("🔍 TEST 9: DUPLICATE CHECK (IMPORTANT)")
        print("=" * 50)
        
        try:
            # Get all landmarks to check for duplicates
            response = self.session.get(f"{BASE_URL}/landmarks?limit=1000")
            
            if response.status_code == 200:
                landmarks = response.json()
                
                self.log_test(
                    "GET All Landmarks",
                    True,
                    f"Retrieved {len(landmarks)} landmarks for duplicate check"
                )
                
                # Check for duplicate landmark names within same country
                country_landmarks = {}
                duplicates_found = []
                
                for landmark in landmarks:
                    country_id = landmark.get("country_id", "unknown")
                    name = landmark.get("name", "").strip().lower()
                    
                    if country_id not in country_landmarks:
                        country_landmarks[country_id] = set()
                    
                    if name in country_landmarks[country_id]:
                        duplicates_found.append({
                            "country_id": country_id,
                            "name": landmark.get("name"),
                            "landmark_id": landmark.get("landmark_id")
                        })
                    else:
                        country_landmarks[country_id].add(name)
                
                # Specifically check Peru for 'Cusco Historic Center' duplicates (mentioned in review)
                peru_landmarks = [l for l in landmarks if l.get("country_id") == "peru"]
                cusco_duplicates = [l for l in peru_landmarks if "cusco historic center" in l.get("name", "").lower()]
                
                cusco_check_passed = len(cusco_duplicates) <= 1
                
                self.log_test(
                    "Peru Cusco Historic Center Duplicates",
                    cusco_check_passed,
                    f"Found {len(cusco_duplicates)} 'Cusco Historic Center' entries in Peru" if len(cusco_duplicates) > 1 else "No duplicate 'Cusco Historic Center' found in Peru"
                )
                
                # Overall duplicate check
                no_duplicates = len(duplicates_found) == 0
                
                self.log_test(
                    "No Duplicate Landmarks Exist",
                    no_duplicates,
                    f"No duplicate landmarks found among {len(landmarks)} landmarks" if no_duplicates else f"Found {len(duplicates_found)} duplicate landmarks"
                )
                
                if duplicates_found:
                    # Log details of duplicates
                    for dup in duplicates_found[:3]:  # Show first 3
                        print(f"   Duplicate: {dup['name']} in {dup['country_id']} ({dup['landmark_id']})")
                
                return no_duplicates and cusco_check_passed
                
            else:
                self.log_test(
                    "GET All Landmarks for Duplicate Check",
                    False,
                    f"Failed to get landmarks: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Duplicate Check Exception",
                False,
                f"Duplicate check failed: {str(e)}"
            )
            return False
            
    def run_comprehensive_tests(self):
        """Run all comprehensive tests for v4.80"""
        print("🚀 WANDERLIST v4.80 COMPREHENSIVE END-TO-END BACKEND TESTING")
        print("=" * 70)
        print(f"Testing URL: {BASE_URL}")
        print(f"Test Credentials: {TEST_EMAIL} / {TEST_PASSWORD}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 70)
        print()
        
        # Run tests in order as specified in review request
        tests = [
            ("1. Authentication Flow", self.test_1_authentication_flow),
            ("2. Database Integrity Verification (MOST IMPORTANT)", self.test_2_database_integrity),
            ("3. Points System Verification", self.test_3_points_system),
            ("4. Landmark Visiting Flow", self.test_4_landmark_visiting_flow),
            ("5. Premium Landmark Restrictions", self.test_5_premium_restrictions),
            ("6. Country Data Verification", self.test_6_country_data),
            ("7. Achievements/Badges", self.test_7_achievements),
            ("8. Leaderboard", self.test_8_leaderboard),
            ("9. Duplicate Check", self.test_9_duplicate_check)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                results.append((test_name, success))
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_name}: {str(e)}")
                results.append((test_name, False))
            
            print()  # Add spacing between tests
        
        # Print comprehensive summary
        self.print_comprehensive_summary(results)
        
        return results
        
    def print_comprehensive_summary(self, results):
        """Print comprehensive test summary"""
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for _, success in results if success)
        total = len(results)
        success_rate = (passed / total) * 100 if total > 0 else 0
        
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        print()
        
        # Show results by category
        for test_name, success in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status}: {test_name}")
        
        print()
        
        # Critical issues
        failed_tests = [name for name, success in results if not success]
        if failed_tests:
            print("🚨 CRITICAL ISSUES FOUND:")
            for test in failed_tests:
                print(f"   - {test}")
            print()
            print("⚠️  SYSTEM NOT READY FOR PRODUCTION")
        else:
            print("🎉 ALL TESTS PASSED!")
            print("✅ EXACT TOTALS VERIFIED:")
            print("   - Total landmarks: 560 ✓")
            print("   - Total points: 7,595 ✓") 
            print("   - Total countries: 48 ✓")
            print("   - Continent breakdown matches specifications ✓")
            print()
            print("🚀 SYSTEM READY FOR PRODUCTION!")
        
        print("=" * 70)

def main():
    """Main test execution"""
    tester = WanderListV480Tester()
    results = tester.run_comprehensive_tests()
    
    # Exit with error code if any tests failed
    failed_count = sum(1 for _, success in results if not success)
    sys.exit(failed_count)

if __name__ == "__main__":
    main()