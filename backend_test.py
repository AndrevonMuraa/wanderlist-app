#!/usr/bin/env python3
"""
Backend Testing for WanderList Country & Continent Completion Bonus System
Testing the enhanced POST /api/visits endpoint and activity feed features
"""

import requests
import json
import sys
from datetime import datetime
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://travelfeed.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderListTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def login(self):
        """Login and get auth token"""
        print("🔐 AUTHENTICATION TEST")
        print("=" * 50)
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("User Authentication", True, f"Logged in as {TEST_EMAIL}")
                return True
            else:
                self.log_test("User Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Authentication", False, f"Exception: {str(e)}")
            return False
    
    def get_user_stats(self):
        """Get current user stats for baseline"""
        try:
            response = self.session.get(f"{API_BASE}/stats")
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None
    
    def get_user_points(self):
        """Get user's current points from visits"""
        try:
            visits_response = self.session.get(f"{API_BASE}/visits")
            if visits_response.status_code == 200:
                visits = visits_response.json()
                total_points = sum(visit.get("points_earned", 10) for visit in visits)
                return total_points, len(visits)
            return 0, 0
        except:
            return 0, 0
    
    def find_country_with_few_landmarks(self):
        """Find a country with manageable number of landmarks for testing"""
        try:
            response = self.session.get(f"{API_BASE}/countries")
            if response.status_code == 200:
                countries = response.json()
                # Look for countries with 10 or fewer landmarks
                for country in countries:
                    if country.get("landmark_count", 0) <= 10:
                        return country
                # If no small country found, return first one
                return countries[0] if countries else None
            return None
        except:
            return None
    
    def get_landmarks_for_country(self, country_id):
        """Get all landmarks for a specific country"""
        try:
            response = self.session.get(f"{API_BASE}/landmarks?country_id={country_id}")
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []
    
    def get_user_visits_for_country(self, country_id):
        """Get user's visits for landmarks in a specific country"""
        try:
            # Get all user visits
            visits_response = self.session.get(f"{API_BASE}/visits")
            if visits_response.status_code != 200:
                return []
            
            visits = visits_response.json()
            
            # Get landmarks for this country
            landmarks = self.get_landmarks_for_country(country_id)
            country_landmark_ids = {lm["landmark_id"] for lm in landmarks}
            
            # Filter visits for this country
            country_visits = [v for v in visits if v["landmark_id"] in country_landmark_ids]
            return country_visits
            
        except:
            return []
    
    def create_visit(self, landmark_id, with_rich_content=False):
        """Create a visit with optional rich content"""
        visit_data = {
            "landmark_id": landmark_id
        }
        
        if with_rich_content:
            visit_data.update({
                "photos": [
                    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==",
                    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==",
                    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
                ],
                "diary_notes": "This is a test diary entry with travel notes about this amazing landmark. The experience was incredible and I learned so much about the local culture and history.",
                "travel_tips": [
                    "Visit early in the morning to avoid crowds",
                    "Bring comfortable walking shoes",
                    "Don't forget your camera for amazing photos"
                ]
            })
        
        try:
            response = self.session.post(f"{API_BASE}/visits", json=visit_data)
            return response
        except Exception as e:
            print(f"Error creating visit: {e}")
            return None
    
    def test_regular_landmark_visit(self):
        """Test Case 1: Regular Landmark Visit"""
        print("🎯 TEST CASE 1: REGULAR LANDMARK VISIT")
        print("=" * 50)
        
        try:
            # Get initial stats
            initial_points, initial_visits = self.get_user_points()
            
            # Find a landmark to visit
            countries_response = self.session.get(f"{API_BASE}/countries")
            if countries_response.status_code != 200:
                self.log_test("Get Countries for Regular Visit", False, "Could not fetch countries")
                return
            
            countries = countries_response.json()
            if not countries:
                self.log_test("Get Countries for Regular Visit", False, "No countries found")
                return
            
            # Get landmarks from first country
            landmarks = self.get_landmarks_for_country(countries[0]["country_id"])
            if not landmarks:
                self.log_test("Get Landmarks for Regular Visit", False, "No landmarks found")
                return
            
            # Find an unvisited landmark
            visits_response = self.session.get(f"{API_BASE}/visits")
            visited_landmark_ids = set()
            if visits_response.status_code == 200:
                visits = visits_response.json()
                visited_landmark_ids = {v["landmark_id"] for v in visits}
            
            unvisited_landmark = None
            for landmark in landmarks:
                if landmark["landmark_id"] not in visited_landmark_ids:
                    unvisited_landmark = landmark
                    break
            
            if not unvisited_landmark:
                self.log_test("Find Unvisited Landmark", False, "All landmarks already visited")
                return
            
            # Create visit
            visit_response = self.create_visit(unvisited_landmark["landmark_id"])
            
            if visit_response and visit_response.status_code == 200:
                visit_data = visit_response.json()
                
                # Verify points increased
                new_points, new_visits = self.get_user_points()
                expected_points = unvisited_landmark.get("points", 10)
                
                if new_points > initial_points:
                    points_gained = new_points - initial_points
                    self.log_test("Regular Visit Points Award", True, 
                                f"Points increased by {points_gained} (expected {expected_points})")
                else:
                    self.log_test("Regular Visit Points Award", False, 
                                f"Points did not increase. Before: {initial_points}, After: {new_points}")
                
                # Verify activity created
                feed_response = self.session.get(f"{API_BASE}/feed")
                if feed_response.status_code == 200:
                    activities = feed_response.json()
                    visit_activity = None
                    for activity in activities:
                        if (activity.get("activity_type") == "visit" and 
                            activity.get("landmark_id") == unvisited_landmark["landmark_id"]):
                            visit_activity = activity
                            break
                    
                    if visit_activity:
                        # Check activity fields
                        required_fields = ["visit_id", "has_diary", "has_tips", "has_photos"]
                        missing_fields = [field for field in required_fields if field not in visit_activity]
                        
                        if not missing_fields:
                            self.log_test("Visit Activity Creation", True, 
                                        f"Activity created with all required fields: {required_fields}")
                        else:
                            self.log_test("Visit Activity Creation", False, 
                                        f"Activity missing fields: {missing_fields}")
                    else:
                        self.log_test("Visit Activity Creation", False, "No visit activity found in feed")
                else:
                    self.log_test("Visit Activity Creation", False, f"Could not fetch feed: {feed_response.status_code}")
                
            else:
                error_msg = visit_response.text if visit_response else "No response"
                self.log_test("Regular Visit Creation", False, f"Visit creation failed: {error_msg}")
                
        except Exception as e:
            self.log_test("Regular Landmark Visit Test", False, f"Exception: {str(e)}")
    
    def test_country_completion_bonus(self):
        """Test Case 2: Country Completion Bonus"""
        print("🏁 TEST CASE 2: COUNTRY COMPLETION BONUS")
        print("=" * 50)
        
        try:
            # Find a country with manageable landmarks
            target_country = self.find_country_with_few_landmarks()
            if not target_country:
                self.log_test("Find Target Country", False, "No suitable country found")
                return
            
            country_id = target_country["country_id"]
            country_name = target_country["name"]
            
            self.log_test("Target Country Selected", True, 
                        f"Testing with {country_name} ({target_country.get('landmark_count', 'unknown')} landmarks)")
            
            # Get all landmarks in this country
            landmarks = self.get_landmarks_for_country(country_id)
            if not landmarks:
                self.log_test("Get Country Landmarks", False, f"No landmarks found for {country_name}")
                return
            
            total_landmarks = len(landmarks)
            self.log_test("Country Landmarks Retrieved", True, f"Found {total_landmarks} landmarks in {country_name}")
            
            # Get current visits for this country
            current_visits = self.get_user_visits_for_country(country_id)
            visited_landmark_ids = {v["landmark_id"] for v in current_visits}
            
            # Find unvisited landmarks
            unvisited_landmarks = [lm for lm in landmarks if lm["landmark_id"] not in visited_landmark_ids]
            
            if len(current_visits) >= total_landmarks:
                self.log_test("Country Already Complete", True, 
                            f"{country_name} already completed ({len(current_visits)}/{total_landmarks})")
                return
            
            if not unvisited_landmarks:
                self.log_test("Find Unvisited Landmarks", False, "No unvisited landmarks found")
                return
            
            # Visit remaining landmarks one by one
            for i, landmark in enumerate(unvisited_landmarks):
                is_last_landmark = (i == len(unvisited_landmarks) - 1)
                
                # Get points before visit
                points_before, _ = self.get_user_points()
                
                # Create visit
                visit_response = self.create_visit(landmark["landmark_id"])
                
                if visit_response and visit_response.status_code == 200:
                    # Get points after visit
                    points_after, _ = self.get_user_points()
                    points_gained = points_after - points_before
                    
                    landmark_points = landmark.get("points", 10)
                    
                    if is_last_landmark:
                        # This should trigger country completion bonus
                        expected_total_points = landmark_points + 50  # 50 bonus for country completion
                        
                        if points_gained >= expected_total_points:
                            self.log_test("Country Completion Bonus", True, 
                                        f"Last landmark visit awarded {points_gained} points (landmark: {landmark_points} + bonus: 50)")
                            
                            # Check for country completion activity
                            feed_response = self.session.get(f"{API_BASE}/feed")
                            if feed_response.status_code == 200:
                                activities = feed_response.json()
                                country_activity = None
                                for activity in activities:
                                    if (activity.get("activity_type") == "country_complete" and 
                                        activity.get("country_name") == country_name):
                                        country_activity = activity
                                        break
                                
                                if country_activity:
                                    required_fields = ["country_name", "landmarks_count", "points_earned", "continent"]
                                    missing_fields = [field for field in required_fields if field not in country_activity]
                                    
                                    if not missing_fields:
                                        self.log_test("Country Completion Activity", True, 
                                                    f"Country completion activity created with: {country_activity}")
                                    else:
                                        self.log_test("Country Completion Activity", False, 
                                                    f"Activity missing fields: {missing_fields}")
                                else:
                                    self.log_test("Country Completion Activity", False, 
                                                "No country completion activity found")
                            else:
                                self.log_test("Country Completion Activity Check", False, 
                                            f"Could not fetch feed: {feed_response.status_code}")
                        else:
                            self.log_test("Country Completion Bonus", False, 
                                        f"Expected {expected_total_points} points, got {points_gained}")
                    else:
                        # Regular landmark visit
                        if points_gained >= landmark_points:
                            self.log_test(f"Landmark Visit {i+1}/{len(unvisited_landmarks)}", True, 
                                        f"Awarded {points_gained} points for {landmark['name']}")
                        else:
                            self.log_test(f"Landmark Visit {i+1}/{len(unvisited_landmarks)}", False, 
                                        f"Expected {landmark_points} points, got {points_gained}")
                else:
                    error_msg = visit_response.text if visit_response else "No response"
                    self.log_test(f"Landmark Visit {i+1}", False, f"Visit failed: {error_msg}")
                    break
                    
        except Exception as e:
            self.log_test("Country Completion Test", False, f"Exception: {str(e)}")
    
    def test_activity_feed_display(self):
        """Test Case 4: Activity Feed Display"""
        print("📱 TEST CASE 4: ACTIVITY FEED DISPLAY")
        print("=" * 50)
        
        try:
            response = self.session.get(f"{API_BASE}/feed")
            
            if response.status_code == 200:
                activities = response.json()
                
                if activities:
                    self.log_test("Activity Feed Retrieval", True, f"Retrieved {len(activities)} activities")
                    
                    # Check for different activity types
                    activity_types = set(activity.get("activity_type") for activity in activities)
                    expected_types = ["visit", "country_complete", "continent_complete"]
                    
                    found_types = [t for t in expected_types if t in activity_types]
                    self.log_test("Activity Types Present", True, f"Found activity types: {found_types}")
                    
                    # Check visit activities for rich content fields
                    visit_activities = [a for a in activities if a.get("activity_type") == "visit"]
                    if visit_activities:
                        sample_visit = visit_activities[0]
                        rich_content_fields = ["has_diary", "has_tips", "has_photos", "photo_count"]
                        present_fields = [field for field in rich_content_fields if field in sample_visit]
                        
                        if len(present_fields) == len(rich_content_fields):
                            self.log_test("Visit Activity Rich Content Fields", True, 
                                        f"All rich content fields present: {present_fields}")
                        else:
                            missing_fields = [field for field in rich_content_fields if field not in sample_visit]
                            self.log_test("Visit Activity Rich Content Fields", False, 
                                        f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Visit Activities Check", False, "No visit activities found")
                    
                    # Check country completion activities
                    country_activities = [a for a in activities if a.get("activity_type") == "country_complete"]
                    if country_activities:
                        sample_country = country_activities[0]
                        country_fields = ["country_name", "landmarks_count", "points_earned"]
                        present_fields = [field for field in country_fields if field in sample_country]
                        
                        if len(present_fields) == len(country_fields):
                            self.log_test("Country Completion Activity Fields", True, 
                                        f"All required fields present: {present_fields}")
                        else:
                            missing_fields = [field for field in country_fields if field not in sample_country]
                            self.log_test("Country Completion Activity Fields", False, 
                                        f"Missing fields: {missing_fields}")
                    
                else:
                    self.log_test("Activity Feed Content", False, "No activities found in feed")
            else:
                self.log_test("Activity Feed Retrieval", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Activity Feed Test", False, f"Exception: {str(e)}")
    
    def test_visit_details_with_rich_content(self):
        """Test Case 5: Visit Details with Rich Content"""
        print("📝 TEST CASE 5: VISIT DETAILS WITH RICH CONTENT")
        print("=" * 50)
        
        try:
            # Find a landmark to create a rich visit
            countries_response = self.session.get(f"{API_BASE}/countries")
            if countries_response.status_code != 200:
                self.log_test("Get Countries for Rich Visit", False, "Could not fetch countries")
                return
            
            countries = countries_response.json()
            if not countries:
                self.log_test("Get Countries for Rich Visit", False, "No countries found")
                return
            
            landmarks = self.get_landmarks_for_country(countries[0]["country_id"])
            if not landmarks:
                self.log_test("Get Landmarks for Rich Visit", False, "No landmarks found")
                return
            
            # Find an unvisited landmark
            visits_response = self.session.get(f"{API_BASE}/visits")
            visited_landmark_ids = set()
            if visits_response.status_code == 200:
                visits = visits_response.json()
                visited_landmark_ids = {v["landmark_id"] for v in visits}
            
            unvisited_landmark = None
            for landmark in landmarks:
                if landmark["landmark_id"] not in visited_landmark_ids:
                    unvisited_landmark = landmark
                    break
            
            if not unvisited_landmark:
                # Use first landmark anyway for testing
                unvisited_landmark = landmarks[0]
            
            # Create visit with rich content
            visit_response = self.create_visit(unvisited_landmark["landmark_id"], with_rich_content=True)
            
            if visit_response and visit_response.status_code == 200:
                visit_data = visit_response.json()
                visit_id = visit_data.get("visit_id")
                
                self.log_test("Rich Content Visit Creation", True, f"Created visit with ID: {visit_id}")
                
                # Get visit details
                details_response = self.session.get(f"{API_BASE}/visits/{visit_id}")
                
                if details_response.status_code == 200:
                    details = details_response.json()
                    
                    # Check for rich content fields
                    rich_fields = ["photos", "diary_notes", "travel_tips"]
                    present_fields = []
                    
                    for field in rich_fields:
                        if field in details and details[field]:
                            present_fields.append(field)
                    
                    if len(present_fields) == len(rich_fields):
                        self.log_test("Rich Content Fields Verification", True, 
                                    f"All rich content fields present: {present_fields}")
                        
                        # Verify content
                        photos_count = len(details.get("photos", []))
                        tips_count = len(details.get("travel_tips", []))
                        has_diary = bool(details.get("diary_notes"))
                        
                        self.log_test("Rich Content Details", True, 
                                    f"Photos: {photos_count}, Tips: {tips_count}, Diary: {has_diary}")
                    else:
                        missing_fields = [field for field in rich_fields if field not in present_fields]
                        self.log_test("Rich Content Fields Verification", False, 
                                    f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Visit Details Retrieval", False, 
                                f"Status: {details_response.status_code}")
            else:
                error_msg = visit_response.text if visit_response else "No response"
                self.log_test("Rich Content Visit Creation", False, f"Visit creation failed: {error_msg}")
                
        except Exception as e:
            self.log_test("Rich Content Visit Test", False, f"Exception: {str(e)}")
    
    def test_points_system_verification(self):
        """Test Case 6: Points System Verification"""
        print("💰 TEST CASE 6: POINTS SYSTEM VERIFICATION")
        print("=" * 50)
        
        try:
            # Get current points
            current_points, current_visits = self.get_user_points()
            
            # Get all visits to verify points calculation
            visits_response = self.session.get(f"{API_BASE}/visits")
            if visits_response.status_code == 200:
                visits = visits_response.json()
                
                # Calculate expected points
                calculated_points = 0
                official_visits = 0
                premium_visits = 0
                
                for visit in visits:
                    points = visit.get("points_earned", 10)
                    calculated_points += points
                    
                    # Try to determine if it's premium or official
                    if points == 25:
                        premium_visits += 1
                    elif points == 10:
                        official_visits += 1
                
                self.log_test("Points Calculation Verification", True, 
                            f"Total points: {calculated_points}, Official visits: {official_visits}, Premium visits: {premium_visits}")
                
                # Verify points match
                if current_points == calculated_points:
                    self.log_test("Points System Accuracy", True, 
                                f"Points match: {current_points} = {calculated_points}")
                else:
                    self.log_test("Points System Accuracy", False, 
                                f"Points mismatch: Current {current_points} vs Calculated {calculated_points}")
                
                # Check for bonus activities in feed
                feed_response = self.session.get(f"{API_BASE}/feed")
                if feed_response.status_code == 200:
                    activities = feed_response.json()
                    
                    country_bonuses = [a for a in activities if a.get("activity_type") == "country_complete"]
                    continent_bonuses = [a for a in activities if a.get("activity_type") == "continent_complete"]
                    
                    total_country_bonus = sum(a.get("points_earned", 0) for a in country_bonuses)
                    total_continent_bonus = sum(a.get("points_earned", 0) for a in continent_bonuses)
                    
                    self.log_test("Bonus Points Summary", True, 
                                f"Country bonuses: {len(country_bonuses)} ({total_country_bonus} pts), "
                                f"Continent bonuses: {len(continent_bonuses)} ({total_continent_bonus} pts)")
                else:
                    self.log_test("Bonus Points Check", False, "Could not fetch activity feed")
            else:
                self.log_test("Points System Verification", False, f"Could not fetch visits: {visits_response.status_code}")
                
        except Exception as e:
            self.log_test("Points System Test", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 WANDERLIST COUNTRY & CONTINENT COMPLETION BONUS TESTING")
        print("=" * 70)
        print(f"Backend URL: {API_BASE}")
        print(f"Test User: {TEST_EMAIL}")
        print("=" * 70)
        print()
        
        # Login first
        if not self.login():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Get initial stats
        initial_stats = self.get_user_stats()
        if initial_stats:
            print(f"📊 Initial Stats: {initial_stats}")
            print()
        
        # Run test cases
        self.test_regular_landmark_visit()
        self.test_country_completion_bonus()
        self.test_activity_feed_display()
        self.test_visit_details_with_rich_content()
        self.test_points_system_verification()
        
        # Print summary
        print("📋 TEST SUMMARY")
        print("=" * 50)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = WanderListTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)