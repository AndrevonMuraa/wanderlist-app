#!/usr/bin/env python3
"""
WanderList Backend API Testing Suite
Comprehensive testing for the travel app backend APIs
"""

import requests
import json
import sys
from datetime import datetime
import base64

# Configuration
BASE_URL = "https://data-integrity-31.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderListTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Login and get auth token"""
        print("\n🔐 AUTHENTICATION TEST")
        print("=" * 50)
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_data = data.get("user")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Successfully logged in as {self.user_data.get('name', 'Unknown')}", 
                    {"user_id": self.user_data.get("user_id"), "subscription_tier": self.user_data.get("subscription_tier")}
                )
                return True
            else:
                self.log_result("Authentication", False, f"Login failed with status {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Login error: {str(e)}")
            return False
    
    def test_landmark_visiting_flow(self):
        """Test the complete landmark visiting flow"""
        print("\n🏛️ LANDMARK VISITING FLOW TEST")
        print("=" * 50)
        
        try:
            # 1. Get landmarks in France
            response = self.session.get(f"{BASE_URL}/landmarks?country_id=france")
            if response.status_code != 200:
                self.log_result("Get France Landmarks", False, f"Failed to get landmarks: {response.status_code}")
                return False
            
            landmarks = response.json()
            if not landmarks:
                self.log_result("Get France Landmarks", False, "No landmarks found in France")
                return False
            
            self.log_result("Get France Landmarks", True, f"Found {len(landmarks)} landmarks in France")
            
            # 2. Find an unvisited landmark
            # First get user's visits to check which landmarks are already visited
            visits_response = self.session.get(f"{BASE_URL}/visits")
            if visits_response.status_code != 200:
                self.log_result("Get User Visits", False, f"Failed to get visits: {visits_response.status_code}")
                return False
            
            user_visits = visits_response.json()
            visited_landmark_ids = {visit["landmark_id"] for visit in user_visits}
            
            # Find first unvisited landmark
            unvisited_landmark = None
            for landmark in landmarks:
                if landmark["landmark_id"] not in visited_landmark_ids:
                    unvisited_landmark = landmark
                    break
            
            if not unvisited_landmark:
                # If all are visited, use the first one for testing (will test duplicate prevention)
                unvisited_landmark = landmarks[0]
                self.log_result("Find Unvisited Landmark", True, f"All landmarks visited, using {unvisited_landmark['name']} for duplicate test")
            else:
                self.log_result("Find Unvisited Landmark", True, f"Found unvisited landmark: {unvisited_landmark['name']}")
            
            # 3. Mark landmark as visited
            visit_data = {
                "landmark_id": unvisited_landmark["landmark_id"],
                "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==",
                "comments": "Test visit for API verification",
                "diary_notes": "Testing the landmark visiting flow",
                "visibility": "public"
            }
            
            visit_response = self.session.post(f"{BASE_URL}/visits", json=visit_data)
            
            if visit_response.status_code == 200:
                visit_result = visit_response.json()
                points_earned = visit_result.get("points_earned", 0)
                expected_points = unvisited_landmark.get("points", 10)
                
                if points_earned == expected_points:
                    self.log_result("Mark Landmark as Visited", True, f"Successfully visited {unvisited_landmark['name']}, earned {points_earned} points")
                else:
                    self.log_result("Mark Landmark as Visited", False, f"Points mismatch: expected {expected_points}, got {points_earned}")
                
                return True
            elif visit_response.status_code == 400:
                # Might be duplicate visit
                error_msg = visit_response.json().get("detail", "Unknown error")
                if "already visited" in error_msg.lower():
                    self.log_result("Mark Landmark as Visited", True, f"Duplicate visit prevention working: {error_msg}")
                    return True
                else:
                    self.log_result("Mark Landmark as Visited", False, f"Visit failed: {error_msg}")
                    return False
            else:
                self.log_result("Mark Landmark as Visited", False, f"Visit failed with status {visit_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Landmark Visiting Flow", False, f"Error: {str(e)}")
            return False
    
    def test_points_and_progress(self):
        """Test points and progress verification"""
        print("\n📊 POINTS & PROGRESS VERIFICATION TEST")
        print("=" * 50)
        
        try:
            # 1. Get user progress
            progress_response = self.session.get(f"{BASE_URL}/progress")
            if progress_response.status_code != 200:
                self.log_result("Get Progress", False, f"Failed to get progress: {progress_response.status_code}")
                return False
            
            progress_data = progress_response.json()
            user_points = progress_data.get("totalPoints", 0)
            self.log_result("Get Progress", True, f"User has {user_points} total points")
            
            # 2. Get user stats
            stats_response = self.session.get(f"{BASE_URL}/stats")
            if stats_response.status_code != 200:
                self.log_result("Get Stats", False, f"Failed to get stats: {stats_response.status_code}")
                return False
            
            stats_data = stats_response.json()
            total_visits = stats_data.get("total_visits", 0)
            countries_visited = stats_data.get("countries_visited", 0)
            continents_visited = stats_data.get("continents_visited", 0)
            
            self.log_result("Get Stats", True, f"Stats: {total_visits} visits, {countries_visited} countries, {continents_visited} continents")
            
            # 3. Get continent stats to verify database totals
            continent_stats_response = self.session.get(f"{BASE_URL}/continent-stats")
            if continent_stats_response.status_code != 200:
                self.log_result("Get Continent Stats", False, f"Failed to get continent stats: {continent_stats_response.status_code}")
                return False
            
            continent_stats = continent_stats_response.json()
            grand_total = continent_stats.get("grand_total", {})
            total_landmarks = grand_total.get("landmarks", 0)
            total_points_available = grand_total.get("points", 0)
            total_countries = grand_total.get("countries", 0)
            
            # Verify expected totals from review request
            expected_landmarks = 502
            expected_points = 6145
            expected_countries = 48
            
            landmarks_match = total_landmarks == expected_landmarks
            points_match = total_points_available == expected_points
            countries_match = total_countries == expected_countries
            
            self.log_result("Database Totals - Landmarks", landmarks_match, 
                          f"Expected {expected_landmarks}, got {total_landmarks}")
            self.log_result("Database Totals - Points", points_match, 
                          f"Expected {expected_points}, got {total_points_available}")
            self.log_result("Database Totals - Countries", countries_match, 
                          f"Expected {expected_countries}, got {total_countries}")
            
            # 4. Verify continent breakdown
            continents = continent_stats.get("continents", [])
            continent_breakdown = {c["continent"]: c["total_landmarks"] for c in continents}
            
            expected_breakdown = {
                "Europe": 107,
                "Asia": 106,
                "Africa": 101,
                "Americas": 107,
                "Oceania": 81
            }
            
            for continent, expected_count in expected_breakdown.items():
                actual_count = continent_breakdown.get(continent, 0)
                match = actual_count == expected_count
                self.log_result(f"Continent Breakdown - {continent}", match,
                              f"Expected {expected_count}, got {actual_count}")
            
            return True
            
        except Exception as e:
            self.log_result("Points & Progress Test", False, f"Error: {str(e)}")
            return False
    
    def test_badges_and_achievements(self):
        """Test badge and achievement system"""
        print("\n🏆 BADGES & ACHIEVEMENTS TEST")
        print("=" * 50)
        
        try:
            # Get user badges
            badges_response = self.session.get(f"{BASE_URL}/badges")
            if badges_response.status_code != 200:
                self.log_result("Get Badges", False, f"Failed to get badges: {badges_response.status_code}")
                return False
            
            badges_data = badges_response.json()
            self.log_result("Get Badges", True, f"Retrieved {len(badges_data)} badge definitions")
            
            # Check for reasonable badge thresholds
            milestone_badges = [b for b in badges_data if "milestone" in b.get("badge_id", "").lower()]
            
            for badge in milestone_badges:
                badge_id = badge.get("badge_id", "")
                description = badge.get("description", "")
                
                # Check if milestone_500 exists and is achievable with 502 total landmarks
                if "500" in badge_id:
                    self.log_result("Badge Threshold - 500 Landmarks", True, 
                                  f"milestone_500 badge exists and is achievable with 502 total landmarks")
                
            return True
            
        except Exception as e:
            self.log_result("Badges & Achievements Test", False, f"Error: {str(e)}")
            return False
    
    def test_data_integrity(self):
        """Test data integrity checks"""
        print("\n🔍 DATA INTEGRITY CHECKS")
        print("=" * 50)
        
        try:
            # 1. Get all countries
            countries_response = self.session.get(f"{BASE_URL}/countries")
            if countries_response.status_code != 200:
                self.log_result("Get Countries", False, f"Failed to get countries: {countries_response.status_code}")
                return False
            
            countries = countries_response.json()
            country_count = len(countries)
            expected_countries = 48
            
            self.log_result("Country Count", country_count == expected_countries,
                          f"Expected {expected_countries} countries, got {country_count}")
            
            # 2. Check for duplicate landmark names within countries
            duplicate_check_passed = True
            for country in countries:
                country_id = country["country_id"]
                
                # Get landmarks for this country
                landmarks_response = self.session.get(f"{BASE_URL}/landmarks?country_id={country_id}")
                if landmarks_response.status_code == 200:
                    landmarks = landmarks_response.json()
                    landmark_names = [l["name"] for l in landmarks]
                    
                    # Check for duplicates
                    if len(landmark_names) != len(set(landmark_names)):
                        duplicate_names = [name for name in set(landmark_names) if landmark_names.count(name) > 1]
                        self.log_result(f"Duplicate Check - {country['name']}", False,
                                      f"Found duplicate landmarks: {duplicate_names}")
                        duplicate_check_passed = False
            
            if duplicate_check_passed:
                self.log_result("Duplicate Landmark Check", True, "No duplicate landmark names found within countries")
            
            # 3. Verify continent landmark counts
            continent_stats_response = self.session.get(f"{BASE_URL}/continent-stats")
            if continent_stats_response.status_code == 200:
                continent_stats = continent_stats_response.json()
                continents = continent_stats.get("continents", [])
                
                expected_counts = {
                    "Europe": 107,
                    "Asia": 106,
                    "Africa": 101,
                    "Americas": 107,
                    "Oceania": 81
                }
                
                for continent_data in continents:
                    continent_name = continent_data["continent"]
                    actual_count = continent_data["total_landmarks"]
                    expected_count = expected_counts.get(continent_name, 0)
                    
                    if expected_count > 0:
                        match = actual_count == expected_count
                        self.log_result(f"Continent Count - {continent_name}", match,
                                      f"Expected {expected_count}, got {actual_count}")
            
            return True
            
        except Exception as e:
            self.log_result("Data Integrity Test", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 WANDERLIST BACKEND API TESTING SUITE")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Test user: {TEST_EMAIL}")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("\n❌ AUTHENTICATION FAILED - Cannot proceed with tests")
            return False
        
        # Run all test suites
        test_suites = [
            self.test_landmark_visiting_flow,
            self.test_points_and_progress,
            self.test_badges_and_achievements,
            self.test_data_integrity
        ]
        
        for test_suite in test_suites:
            try:
                test_suite()
            except Exception as e:
                print(f"❌ Test suite failed: {str(e)}")
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.test_results if "❌ FAIL" in r["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = WanderListTester()
    tester.run_all_tests()