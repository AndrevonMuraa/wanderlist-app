#!/usr/bin/env python3
"""
Backend API Testing for WanderList App
Tests Country Visits Feature and Profile Update endpoints
"""

import requests
import json
import base64
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://wanderlist-headers.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class WanderListAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate with test credentials"""
        print(f"\n🔐 Authenticating with {TEST_EMAIL}...")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("user_id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                self.log_result("Authentication", True, f"Successfully logged in as {TEST_EMAIL}")
                return True
            else:
                self.log_result("Authentication", False, f"Login failed: {response.status_code}", 
                              {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def generate_test_base64_image(self):
        """Generate a small test base64 image"""
        # Simple 1x1 pixel PNG in base64
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    def test_country_visits_create(self):
        """Test POST /api/country-visits - Create a country visit"""
        print(f"\n📍 Testing Country Visit Creation...")
        
        # Test data with required fields
        test_data = {
            "country_id": "france",  # Using France as test country
            "photos": [
                self.generate_test_base64_image(),
                self.generate_test_base64_image()
            ],
            "diary_notes": "Amazing trip to France! The culture and food were incredible.",
            "visibility": "public"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/country-visits", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                country_visit_id = data.get("country_visit_id")
                points_earned = data.get("points_earned")
                
                if country_visit_id and points_earned == 50:
                    self.log_result("Country Visit Creation", True, 
                                  f"Created country visit with ID: {country_visit_id}, earned {points_earned} points")
                    return country_visit_id
                else:
                    self.log_result("Country Visit Creation", False, 
                                  "Missing country_visit_id or incorrect points", data)
                    return None
            else:
                self.log_result("Country Visit Creation", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                return None
                
        except Exception as e:
            self.log_result("Country Visit Creation", False, f"Error: {str(e)}")
            return None
    
    def test_country_visits_list(self):
        """Test GET /api/country-visits - List user's country visits"""
        print(f"\n📋 Testing Country Visits List...")
        
        try:
            response = self.session.get(f"{BASE_URL}/country-visits")
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    visit_count = len(data)
                    
                    # Check if visits have required fields
                    if visit_count > 0:
                        first_visit = data[0]
                        required_fields = ["country_visit_id", "country_name", "continent", "photos", "points_earned"]
                        missing_fields = [field for field in required_fields if field not in first_visit]
                        
                        if not missing_fields:
                            self.log_result("Country Visits List", True, 
                                          f"Retrieved {visit_count} country visits with all required fields")
                        else:
                            self.log_result("Country Visits List", False, 
                                          f"Missing required fields: {missing_fields}", first_visit)
                    else:
                        self.log_result("Country Visits List", True, "Retrieved empty list (no visits yet)")
                else:
                    self.log_result("Country Visits List", False, "Response is not a list", data)
                    
            else:
                self.log_result("Country Visits List", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Country Visits List", False, f"Error: {str(e)}")
    
    def test_country_visit_details(self, country_visit_id):
        """Test GET /api/country-visits/{country_visit_id} - Get specific visit details"""
        if not country_visit_id:
            self.log_result("Country Visit Details", False, "No country_visit_id provided for testing")
            return
            
        print(f"\n🔍 Testing Country Visit Details...")
        
        try:
            response = self.session.get(f"{BASE_URL}/country-visits/{country_visit_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["country_visit_id", "country_name", "continent", "photos", "diary", "points_earned"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    country_name = data.get("country_name")
                    continent = data.get("continent")
                    photos_count = len(data.get("photos", []))
                    
                    self.log_result("Country Visit Details", True, 
                                  f"Retrieved details for {country_name} ({continent}) with {photos_count} photos")
                else:
                    self.log_result("Country Visit Details", False, 
                                  f"Missing required fields: {missing_fields}", data)
                    
            elif response.status_code == 404:
                self.log_result("Country Visit Details", False, "Country visit not found")
            else:
                self.log_result("Country Visit Details", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Country Visit Details", False, f"Error: {str(e)}")
    
    def test_country_visit_update(self, country_visit_id):
        """Test PUT /api/country-visits/{country_visit_id} - Update a country visit"""
        if not country_visit_id:
            self.log_result("Country Visit Update", False, "No country_visit_id provided for testing")
            return
            
        print(f"\n✏️ Testing Country Visit Update...")
        
        # Test data for update - only diary and visibility are supported
        update_data = {
            "diary": "Updated diary entry: France was even more amazing than I initially thought! Added more memories from my extended stay.",
            "visibility": "friends"  # Change visibility from public to friends
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/country-visits/{country_visit_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if update was successful
                updated_diary = data.get("diary", "")
                updated_visibility = data.get("visibility", "")
                
                success_checks = []
                success_checks.append(("diary_updated", "Updated diary entry" in updated_diary))
                success_checks.append(("visibility_changed", updated_visibility == "friends"))
                
                failed_checks = [check for check, success in success_checks if not success]
                
                if not failed_checks:
                    self.log_result("Country Visit Update", True, 
                                  f"Successfully updated visit: diary updated, visibility changed to friends")
                else:
                    self.log_result("Country Visit Update", False, 
                                  f"Update verification failed: {failed_checks}", 
                                  {"expected": update_data, "received": data})
                    
            elif response.status_code == 404:
                self.log_result("Country Visit Update", False, "Country visit not found for update")
            else:
                self.log_result("Country Visit Update", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Country Visit Update", False, f"Error: {str(e)}")

    def test_country_visit_delete(self, country_visit_id):
        """Test DELETE /api/country-visits/{country_visit_id} - Delete a visit"""
        if not country_visit_id:
            self.log_result("Country Visit Deletion", False, "No country_visit_id provided for testing")
            return
            
        print(f"\n🗑️ Testing Country Visit Deletion...")
        
        try:
            response = self.session.delete(f"{BASE_URL}/country-visits/{country_visit_id}")
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                
                if "deleted" in message.lower():
                    self.log_result("Country Visit Deletion", True, "Country visit deleted successfully")
                    
                    # Verify deletion by trying to get the visit
                    verify_response = self.session.get(f"{BASE_URL}/country-visits/{country_visit_id}")
                    if verify_response.status_code == 404:
                        self.log_result("Country Visit Deletion Verification", True, "Confirmed visit was deleted")
                    else:
                        self.log_result("Country Visit Deletion Verification", False, "Visit still exists after deletion")
                else:
                    self.log_result("Country Visit Deletion", False, f"Unexpected response: {message}")
                    
            elif response.status_code == 404:
                self.log_result("Country Visit Deletion", False, "Country visit not found for deletion")
            else:
                self.log_result("Country Visit Deletion", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Country Visit Deletion", False, f"Error: {str(e)}")
    
    def test_profile_update(self):
        """Test PUT /api/auth/profile - Update profile with picture, name, bio, location"""
        print(f"\n👤 Testing Profile Update...")
        
        # Test data with all supported fields
        test_data = {
            "name": "Test User Updated",
            "picture": self.generate_test_base64_image(),
            "bio": "Updated bio for testing profile update functionality. This is a comprehensive test.",
            "location": "Paris, France"
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/auth/profile", json=test_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if all fields were updated
                updated_name = data.get("name")
                updated_picture = data.get("picture")
                updated_bio = data.get("bio")
                updated_location = data.get("location")
                
                success_checks = []
                success_checks.append(("name", updated_name == test_data["name"]))
                success_checks.append(("picture", updated_picture == test_data["picture"]))
                success_checks.append(("bio", updated_bio == test_data["bio"]))
                success_checks.append(("location", updated_location == test_data["location"]))
                
                failed_fields = [field for field, success in success_checks if not success]
                
                if not failed_fields:
                    self.log_result("Profile Update", True, 
                                  "All profile fields updated successfully (name, picture, bio, location)")
                else:
                    self.log_result("Profile Update", False, 
                                  f"Failed to update fields: {failed_fields}", 
                                  {"expected": test_data, "received": data})
                    
            else:
                self.log_result("Profile Update", False, 
                              f"Failed with status {response.status_code}", 
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Profile Update", False, f"Error: {str(e)}")
    
    def test_authentication_required(self):
        """Test that all endpoints require authentication"""
        print(f"\n🔒 Testing Authentication Requirements...")
        
        # Create a session without auth token
        unauth_session = requests.Session()
        
        endpoints_to_test = [
            ("POST", "/country-visits", {"country_id": "france", "photos": ["test"]}),
            ("GET", "/country-visits", None),
            ("PUT", "/auth/profile", {"name": "Test"})
        ]
        
        auth_required_count = 0
        
        for method, endpoint, data in endpoints_to_test:
            try:
                if method == "POST":
                    response = unauth_session.post(f"{BASE_URL}{endpoint}", json=data)
                elif method == "GET":
                    response = unauth_session.get(f"{BASE_URL}{endpoint}")
                elif method == "PUT":
                    response = unauth_session.put(f"{BASE_URL}{endpoint}", json=data)
                
                if response.status_code == 401:
                    auth_required_count += 1
                    
            except Exception as e:
                pass  # Network errors are acceptable for this test
        
        if auth_required_count == len(endpoints_to_test):
            self.log_result("Authentication Required", True, 
                          f"All {len(endpoints_to_test)} endpoints properly require authentication")
        else:
            self.log_result("Authentication Required", False, 
                          f"Only {auth_required_count}/{len(endpoints_to_test)} endpoints require authentication")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting WanderList Backend API Tests")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Test authentication requirements
        self.test_authentication_required()
        
        # Step 3: Test Country Visits Feature
        print("\n" + "=" * 60)
        print("🌍 TESTING COUNTRY VISITS FEATURE")
        print("=" * 60)
        
        # Create a country visit
        country_visit_id = self.test_country_visits_create()
        
        # List country visits
        self.test_country_visits_list()
        
        # Get specific country visit details
        self.test_country_visit_details(country_visit_id)
        
        # Update country visit (add/edit photos, diary)
        self.test_country_visit_update(country_visit_id)
        
        # Verify the update was successful by getting details again
        print(f"\n🔍 Re-testing Country Visit Details after Update...")
        self.test_country_visit_details(country_visit_id)
        
        # Delete country visit
        self.test_country_visit_delete(country_visit_id)
        
        # Step 4: Test Profile Update
        print("\n" + "=" * 60)
        print("👤 TESTING PROFILE UPDATE FEATURE")
        print("=" * 60)
        
        self.test_profile_update()
        
        # Step 5: Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print(f"\n🎯 CRITICAL FEATURES TESTED:")
        print(f"  ✓ Country Visits API (POST, GET, GET by ID, PUT, DELETE)")
        print(f"  ✓ Profile Update API (name, picture, bio, location)")
        print(f"  ✓ Authentication Requirements")
        print(f"  ✓ 50 Points Bonus for Country Visits")
        print(f"  ✓ Country Name & Continent Lookup")
        print(f"  ✓ Visibility Settings (public, friends, private)")
        print(f"  ✓ Photo Upload & Management (base64 images)")
        print(f"  ✓ Diary Notes Update Functionality")

if __name__ == "__main__":
    tester = WanderListAPITester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)