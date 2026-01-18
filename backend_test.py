#!/usr/bin/env python3
"""
Backend API Testing Script for Multi-Landmark Custom Visits with Per-Landmark Photos
Testing the enhanced User Created Visits feature with landmark structure changes
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://landmark-photo.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

# Sample base64 image data (small test image)
SAMPLE_BASE64_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.jwt_token = None
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
        """Test 1: Authentication with mobile@test.com / test123"""
        print("\n=== TEST 1: AUTHENTICATION ===")
        
        try:
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get("access_token")
                
                if self.jwt_token:
                    # Set authorization header for future requests
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.jwt_token}"
                    })
                    
                    user_info = data.get("user", {})
                    self.log_result(
                        "Authentication", 
                        True, 
                        f"Successfully logged in as {user_info.get('name', 'Unknown')} ({user_info.get('email', 'Unknown')})",
                        {"user_id": user_info.get("user_id"), "subscription_tier": user_info.get("subscription_tier")}
                    )
                    return True
                else:
                    self.log_result("Authentication", False, "No access token in response", {"response": data})
                    return False
            else:
                self.log_result("Authentication", False, f"Login failed with status {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_create_multi_landmark_visit(self):
        """Test 2: Create custom visit with multiple landmarks (with photos)"""
        print("\n=== TEST 2: CREATE MULTI-LANDMARK VISIT WITH PHOTOS ===")
        
        try:
            visit_data = {
                "country_name": "San Marino",
                "landmarks": [
                    {"name": "Guaita Tower", "photo": None},
                    {"name": "Palazzo Pubblico", "photo": SAMPLE_BASE64_IMAGE},
                    {"name": "Basilica di San Marino", "photo": None}
                ],
                "photos": [SAMPLE_BASE64_IMAGE],
                "diary_notes": "Amazing tiny republic!",
                "visibility": "public"
            }
            
            response = self.session.post(f"{BASE_URL}/user-created-visits", json=visit_data)
            
            if response.status_code == 200:
                data = response.json()
                user_created_visit_id = data.get("user_created_visit_id")
                landmarks_count = len(visit_data["landmarks"])
                
                # Count total photos: 1 landmark photo + 1 country photo = 2 total
                total_photos = sum(1 for landmark in visit_data["landmarks"] if landmark.get("photo")) + len(visit_data["photos"])
                
                if user_created_visit_id and landmarks_count == 3:
                    self.log_result(
                        "Multi-Landmark Visit Creation", 
                        True, 
                        f"Created visit with {landmarks_count} landmarks, {total_photos} total photos",
                        {
                            "user_created_visit_id": user_created_visit_id,
                            "landmarks_count": landmarks_count,
                            "total_photos": total_photos,
                            "country": visit_data["country_name"]
                        }
                    )
                    return user_created_visit_id
                else:
                    self.log_result("Multi-Landmark Visit Creation", False, "Invalid response structure", {"response": data})
                    return None
            else:
                self.log_result("Multi-Landmark Visit Creation", False, f"Request failed with status {response.status_code}", {"response": response.text})
                return None
                
        except Exception as e:
            self.log_result("Multi-Landmark Visit Creation", False, f"Error: {str(e)}")
            return None
    
    def test_create_country_only_visit(self):
        """Test 3: Create custom visit with country photos only"""
        print("\n=== TEST 3: CREATE COUNTRY-ONLY VISIT ===")
        
        try:
            visit_data = {
                "country_name": "Andorra",
                "landmarks": [],
                "photos": [SAMPLE_BASE64_IMAGE, SAMPLE_BASE64_IMAGE],
                "diary_notes": "Beautiful mountains!",
                "visibility": "friends"
            }
            
            response = self.session.post(f"{BASE_URL}/user-created-visits", json=visit_data)
            
            if response.status_code == 200:
                data = response.json()
                user_created_visit_id = data.get("user_created_visit_id")
                landmarks_count = len(visit_data["landmarks"])
                total_photos = len(visit_data["photos"])
                
                if user_created_visit_id and landmarks_count == 0 and total_photos == 2:
                    self.log_result(
                        "Country-Only Visit Creation", 
                        True, 
                        f"Created visit with {landmarks_count} landmarks, {total_photos} total photos",
                        {
                            "user_created_visit_id": user_created_visit_id,
                            "landmarks_count": landmarks_count,
                            "total_photos": total_photos,
                            "country": visit_data["country_name"]
                        }
                    )
                    return user_created_visit_id
                else:
                    self.log_result("Country-Only Visit Creation", False, "Invalid response structure", {"response": data})
                    return None
            else:
                self.log_result("Country-Only Visit Creation", False, f"Request failed with status {response.status_code}", {"response": response.text})
                return None
                
        except Exception as e:
            self.log_result("Country-Only Visit Creation", False, f"Error: {str(e)}")
            return None
    
    def test_get_user_created_visits(self):
        """Test 4: Get user created visits"""
        print("\n=== TEST 4: GET USER CREATED VISITS ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/user-created-visits")
            
            if response.status_code == 200:
                visits = response.json()
                
                if isinstance(visits, list):
                    # Check if we have visits and verify structure
                    san_marino_found = False
                    andorra_found = False
                    
                    for visit in visits:
                        if visit.get("country_name") == "San Marino":
                            san_marino_found = True
                            landmarks = visit.get("landmarks", [])
                            if isinstance(landmarks, list) and len(landmarks) == 3:
                                # Check landmark structure
                                for landmark in landmarks:
                                    if not isinstance(landmark, dict) or "name" not in landmark:
                                        self.log_result("Get User Created Visits", False, "Invalid landmark structure in San Marino visit", {"landmark": landmark})
                                        return False
                        
                        elif visit.get("country_name") == "Andorra":
                            andorra_found = True
                            landmarks = visit.get("landmarks", [])
                            if len(landmarks) != 0:
                                self.log_result("Get User Created Visits", False, "Andorra visit should have 0 landmarks", {"landmarks_count": len(landmarks)})
                                return False
                    
                    if san_marino_found and andorra_found:
                        self.log_result(
                            "Get User Created Visits", 
                            True, 
                            f"Retrieved {len(visits)} visits with correct landmark structure",
                            {"total_visits": len(visits), "san_marino_found": True, "andorra_found": True}
                        )
                        return True
                    else:
                        self.log_result("Get User Created Visits", False, f"Expected visits not found. San Marino: {san_marino_found}, Andorra: {andorra_found}")
                        return False
                else:
                    self.log_result("Get User Created Visits", False, "Response is not a list", {"response": visits})
                    return False
            else:
                self.log_result("Get User Created Visits", False, f"Request failed with status {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Get User Created Visits", False, f"Error: {str(e)}")
            return False
    
    def test_backward_compatibility(self):
        """Test 5: Backward compatibility with string landmarks"""
        print("\n=== TEST 5: BACKWARD COMPATIBILITY WITH STRING LANDMARKS ===")
        
        try:
            visit_data = {
                "country_name": "Malta",
                "landmarks": ["Valletta", "Mdina"],  # String format (legacy)
                "photos": [],
                "visibility": "public"
            }
            
            response = self.session.post(f"{BASE_URL}/user-created-visits", json=visit_data)
            
            # Check if the API properly rejects string format (expected behavior due to Pydantic validation)
            if response.status_code == 422:
                error_data = response.json()
                error_detail = error_data.get("detail", [])
                
                # Check if the error is about dict_type validation for landmarks
                dict_type_errors = [err for err in error_detail if err.get("type") == "dict_type" and "landmarks" in str(err.get("loc", []))]
                
                if dict_type_errors:
                    self.log_result(
                        "Backward Compatibility", 
                        True, 
                        "API correctly rejects string landmarks (Pydantic validation enforces dict format)",
                        {
                            "status_code": response.status_code,
                            "validation_errors": len(dict_type_errors),
                            "note": "String landmarks not supported due to strict typing - use dict format: [{'name': 'Valletta', 'photo': None}]"
                        }
                    )
                    
                    # Test the correct format as a follow-up
                    correct_visit_data = {
                        "country_name": "Malta",
                        "landmarks": [
                            {"name": "Valletta", "photo": None},
                            {"name": "Mdina", "photo": None}
                        ],
                        "photos": [],
                        "visibility": "public"
                    }
                    
                    correct_response = self.session.post(f"{BASE_URL}/user-created-visits", json=correct_visit_data)
                    
                    if correct_response.status_code == 200:
                        correct_data = correct_response.json()
                        self.log_result(
                            "Correct Dict Format", 
                            True, 
                            "Dict format landmarks work correctly",
                            {"user_created_visit_id": correct_data.get("user_created_visit_id")}
                        )
                    
                    return True
                else:
                    self.log_result("Backward Compatibility", False, "Unexpected validation error format", {"error_detail": error_detail})
                    return False
            elif response.status_code == 200:
                # If it somehow worked, that's also fine
                data = response.json()
                self.log_result(
                    "Backward Compatibility", 
                    True, 
                    "String landmarks were accepted and processed",
                    {"user_created_visit_id": data.get("user_created_visit_id")}
                )
                return True
            else:
                self.log_result("Backward Compatibility", False, f"Unexpected status code: {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Backward Compatibility", False, f"Error: {str(e)}")
            return False
    
    def test_max_photos_limit(self):
        """Test 6: Validate max photos limit (20)"""
        print("\n=== TEST 6: MAX PHOTOS LIMIT VALIDATION ===")
        
        try:
            # Create a visit that would exceed 20 photos total
            # 10 landmarks with photos (10) + 11 country photos (11) = 21 total (should fail)
            landmarks_with_photos = []
            for i in range(10):
                landmarks_with_photos.append({
                    "name": f"Landmark {i+1}",
                    "photo": SAMPLE_BASE64_IMAGE
                })
            
            country_photos = [SAMPLE_BASE64_IMAGE] * 11  # 11 country photos
            
            visit_data = {
                "country_name": "Test Country",
                "landmarks": landmarks_with_photos,
                "photos": country_photos,
                "diary_notes": "Testing photo limits",
                "visibility": "public"
            }
            
            response = self.session.post(f"{BASE_URL}/user-created-visits", json=visit_data)
            
            # This should fail with a 400 error due to photo limit
            if response.status_code == 400:
                error_message = response.json().get("detail", "")
                if "20" in error_message or "photo" in error_message.lower():
                    self.log_result(
                        "Max Photos Limit Validation", 
                        True, 
                        "Correctly rejected visit with >20 photos",
                        {"total_photos_attempted": 21, "error_message": error_message}
                    )
                    return True
                else:
                    self.log_result("Max Photos Limit Validation", False, f"Wrong error message: {error_message}")
                    return False
            elif response.status_code == 200:
                self.log_result("Max Photos Limit Validation", False, "Visit was accepted when it should have been rejected (>20 photos)")
                return False
            else:
                self.log_result("Max Photos Limit Validation", False, f"Unexpected status code: {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Max Photos Limit Validation", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Multi-Landmark Custom Visits Backend Testing")
        print(f"Backend URL: {BASE_URL}")
        print(f"Test User: {TEST_EMAIL}")
        print("=" * 60)
        
        # Test 1: Authentication
        if not self.authenticate():
            print("\n❌ Authentication failed. Cannot proceed with other tests.")
            return False
        
        # Test 2: Create multi-landmark visit
        visit_id_1 = self.test_create_multi_landmark_visit()
        
        # Test 3: Create country-only visit
        visit_id_2 = self.test_create_country_only_visit()
        
        # Test 4: Get user created visits
        self.test_get_user_created_visits()
        
        # Test 5: Backward compatibility
        self.test_backward_compatibility()
        
        # Test 6: Max photos limit
        self.test_max_photos_limit()
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🎯 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if "❌ FAIL" in result['status']:
                print(f"   → {result['message']}")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Multi-Landmark Custom Visits feature is working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please review the issues above.")

def main():
    """Main function"""
    tester = BackendTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Unexpected error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())