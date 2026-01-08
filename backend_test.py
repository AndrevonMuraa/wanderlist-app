#!/usr/bin/env python3
"""
Backend API Testing for Trip Planning & Bucket List Features
Tests all endpoints for bucket list and trip planning functionality
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://travelfeed.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
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
    
    def login(self):
        """Login and get access token"""
        print("\n🔐 AUTHENTICATION")
        print("=" * 50)
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_test("User Login", True, f"Logged in as {TEST_EMAIL}")
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def get_landmark_id(self):
        """Get a landmark ID for testing"""
        try:
            response = self.session.get(f"{BASE_URL}/landmarks?limit=1")
            if response.status_code == 200:
                landmarks = response.json()
                if landmarks:
                    return landmarks[0]["landmark_id"]
            return None
        except:
            return None
    
    def test_bucket_list_functionality(self):
        """Test all bucket list endpoints"""
        print("\n🎯 BUCKET LIST FUNCTIONALITY TESTS")
        print("=" * 50)
        
        # Get a landmark for testing
        landmark_id = self.get_landmark_id()
        if not landmark_id:
            self.log_test("Get Landmark for Testing", False, "No landmarks available")
            return
        
        self.log_test("Get Landmark for Testing", True, f"Using landmark: {landmark_id}")
        
        # Test 1: Add Landmark to Bucket List
        try:
            response = self.session.post(f"{BASE_URL}/bucket-list", json={
                "landmark_id": landmark_id
            })
            
            if response.status_code == 200:
                bucket_data = response.json()
                bucket_list_id = bucket_data.get("bucket_list_id")
                self.log_test("Add Landmark to Bucket List", True, f"Added with ID: {bucket_list_id}")
                
                # Test 2: Get Bucket List
                try:
                    response = self.session.get(f"{BASE_URL}/bucket-list")
                    if response.status_code == 200:
                        bucket_list = response.json()
                        found_landmark = any(item["landmark"]["landmark_id"] == landmark_id for item in bucket_list)
                        self.log_test("Get Bucket List", found_landmark, f"Found {len(bucket_list)} items, landmark present: {found_landmark}")
                    else:
                        self.log_test("Get Bucket List", False, f"Status: {response.status_code}")
                except Exception as e:
                    self.log_test("Get Bucket List", False, f"Exception: {str(e)}")
                
                # Test 3: Check Bucket List Status
                try:
                    response = self.session.get(f"{BASE_URL}/bucket-list/check/{landmark_id}")
                    if response.status_code == 200:
                        check_data = response.json()
                        in_bucket = check_data.get("in_bucket_list", False)
                        self.log_test("Check Bucket List Status", in_bucket, f"In bucket list: {in_bucket}, ID: {check_data.get('bucket_list_id')}")
                    else:
                        self.log_test("Check Bucket List Status", False, f"Status: {response.status_code}")
                except Exception as e:
                    self.log_test("Check Bucket List Status", False, f"Exception: {str(e)}")
                
                # Test 4: Remove from Bucket List
                if bucket_list_id:
                    try:
                        response = self.session.delete(f"{BASE_URL}/bucket-list/{bucket_list_id}")
                        if response.status_code == 200:
                            self.log_test("Remove from Bucket List", True, "Successfully removed")
                            
                            # Verify removal
                            response = self.session.get(f"{BASE_URL}/bucket-list")
                            if response.status_code == 200:
                                bucket_list = response.json()
                                still_present = any(item["landmark"]["landmark_id"] == landmark_id for item in bucket_list)
                                self.log_test("Verify Bucket List Removal", not still_present, f"Landmark still present: {still_present}")
                        else:
                            self.log_test("Remove from Bucket List", False, f"Status: {response.status_code}")
                    except Exception as e:
                        self.log_test("Remove from Bucket List", False, f"Exception: {str(e)}")
                        
            else:
                self.log_test("Add Landmark to Bucket List", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Add Landmark to Bucket List", False, f"Exception: {str(e)}")
    
    def test_trip_planning_functionality(self):
        """Test all trip planning endpoints"""
        print("\n🗺️ TRIP PLANNING FUNCTIONALITY TESTS")
        print("=" * 50)
        
        # Get a landmark for testing
        landmark_id = self.get_landmark_id()
        if not landmark_id:
            self.log_test("Get Landmark for Trip Testing", False, "No landmarks available")
            return
        
        # Test 5: Create Trip
        trip_id = None
        try:
            response = self.session.post(f"{BASE_URL}/trips", json={
                "name": "Test Trip",
                "destination": "France",
                "budget": 5000
            })
            
            if response.status_code == 200:
                trip_data = response.json()
                trip_id = trip_data.get("trip_id")
                self.log_test("Create Trip", True, f"Created trip with ID: {trip_id}")
            else:
                self.log_test("Create Trip", False, f"Status: {response.status_code}, Response: {response.text}")
                return
                
        except Exception as e:
            self.log_test("Create Trip", False, f"Exception: {str(e)}")
            return
        
        if not trip_id:
            return
        
        # Test 6: Get All Trips
        try:
            response = self.session.get(f"{BASE_URL}/trips")
            if response.status_code == 200:
                trips = response.json()
                found_trip = any(trip["trip_id"] == trip_id for trip in trips)
                self.log_test("Get All Trips", found_trip, f"Found {len(trips)} trips, test trip present: {found_trip}")
            else:
                self.log_test("Get All Trips", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Trips", False, f"Exception: {str(e)}")
        
        # Test 7: Get Trip Details
        try:
            response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
            if response.status_code == 200:
                trip_details = response.json()
                has_landmarks_array = "landmarks" in trip_details
                self.log_test("Get Trip Details", True, f"Trip details retrieved, has landmarks array: {has_landmarks_array}")
            else:
                self.log_test("Get Trip Details", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Trip Details", False, f"Exception: {str(e)}")
        
        # Test 8: Add Landmark to Trip
        trip_landmark_id = None
        try:
            response = self.session.post(f"{BASE_URL}/trips/{trip_id}/landmarks", json={
                "landmark_id": landmark_id,
                "day_number": 1
            })
            
            if response.status_code == 200:
                landmark_data = response.json()
                trip_landmark_id = landmark_data.get("trip_landmark_id")
                self.log_test("Add Landmark to Trip", True, f"Added landmark with ID: {trip_landmark_id}")
            else:
                self.log_test("Add Landmark to Trip", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Add Landmark to Trip", False, f"Exception: {str(e)}")
        
        # Test 9: Get Trip with Landmarks
        try:
            response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
            if response.status_code == 200:
                trip_details = response.json()
                landmarks = trip_details.get("landmarks", [])
                has_added_landmark = any(lm["landmark"]["landmark_id"] == landmark_id for lm in landmarks)
                self.log_test("Get Trip with Landmarks", has_added_landmark, f"Trip has {len(landmarks)} landmarks, added landmark present: {has_added_landmark}")
            else:
                self.log_test("Get Trip with Landmarks", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Trip with Landmarks", False, f"Exception: {str(e)}")
        
        # Test 10: Mark Landmark as Visited
        if trip_landmark_id:
            try:
                response = self.session.put(f"{BASE_URL}/trips/{trip_id}/landmarks/{trip_landmark_id}/visited?visited=true")
                if response.status_code == 200:
                    self.log_test("Mark Landmark as Visited", True, "Successfully marked as visited")
                    
                    # Verify visited status
                    response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
                    if response.status_code == 200:
                        trip_details = response.json()
                        visited_count = trip_details.get("visited_count", 0)
                        self.log_test("Verify Visited Count Update", visited_count > 0, f"Visited count: {visited_count}")
                else:
                    self.log_test("Mark Landmark as Visited", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Mark Landmark as Visited", False, f"Exception: {str(e)}")
        
        # Test 11: Remove Landmark from Trip
        if trip_landmark_id:
            try:
                response = self.session.delete(f"{BASE_URL}/trips/{trip_id}/landmarks/{trip_landmark_id}")
                if response.status_code == 200:
                    self.log_test("Remove Landmark from Trip", True, "Successfully removed landmark")
                    
                    # Verify removal
                    response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
                    if response.status_code == 200:
                        trip_details = response.json()
                        landmarks = trip_details.get("landmarks", [])
                        still_present = any(lm["landmark_id"] == landmark_id for lm in landmarks)
                        self.log_test("Verify Landmark Removal", not still_present, f"Landmark still present: {still_present}")
                else:
                    self.log_test("Remove Landmark from Trip", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("Remove Landmark from Trip", False, f"Exception: {str(e)}")
        
        # Test 12: Update Trip
        try:
            response = self.session.put(f"{BASE_URL}/trips/{trip_id}", json={
                "status": "in_progress",
                "budget": 6000
            })
            
            if response.status_code == 200:
                self.log_test("Update Trip", True, "Successfully updated trip")
                
                # Verify update
                response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
                if response.status_code == 200:
                    trip_details = response.json()
                    status_updated = trip_details.get("status") == "in_progress"
                    budget_updated = trip_details.get("budget") == 6000
                    self.log_test("Verify Trip Update", status_updated and budget_updated, f"Status: {trip_details.get('status')}, Budget: {trip_details.get('budget')}")
            else:
                self.log_test("Update Trip", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Update Trip", False, f"Exception: {str(e)}")
        
        # Test 13: Delete Trip
        try:
            response = self.session.delete(f"{BASE_URL}/trips/{trip_id}")
            if response.status_code == 200:
                self.log_test("Delete Trip", True, "Successfully deleted trip")
                
                # Verify deletion
                response = self.session.get(f"{BASE_URL}/trips/{trip_id}")
                trip_deleted = response.status_code == 404
                self.log_test("Verify Trip Deletion", trip_deleted, f"Trip still exists: {not trip_deleted}")
            else:
                self.log_test("Delete Trip", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Trip", False, f"Exception: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    print("🚀 TRIP PLANNING & BUCKET LIST BACKEND API TESTING")
    print("=" * 60)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    
    tester = APITester()
    
    # Login first
    if not tester.login():
        print("❌ Login failed. Cannot proceed with tests.")
        sys.exit(1)
    
    # Run bucket list tests
    tester.test_bucket_list_functionality()
    
    # Run trip planning tests
    tester.test_trip_planning_functionality()
    
    # Print summary
    success = tester.print_summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Trip Planning & Bucket List functionality is working perfectly.")
    else:
        print("\n⚠️ Some tests failed. Please check the details above.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())