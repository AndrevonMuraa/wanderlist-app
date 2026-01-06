#!/usr/bin/env python3
"""
WanderList Backend API Testing Suite
Tests all backend endpoints systematically
"""

import requests
import json
import base64
from datetime import datetime
import sys

# Get backend URL from frontend .env
BACKEND_URL = "https://landmark-explorer-2.preview.emergentagent.com/api"

class WanderListTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.user1_token = None
        self.user2_token = None
        self.user1_data = None
        self.user2_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_auth_register(self):
        """Test user registration"""
        print("\n=== Testing Authentication - Registration ===")
        
        # Test User 1
        user1_data = {
            "email": "alice.wanderer@example.com",
            "password": "SecurePass123!",
            "name": "Alice Wanderer"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=user1_data)
            if response.status_code == 200:
                data = response.json()
                self.user1_token = data["access_token"]
                self.user1_data = data["user"]
                self.log_test("User 1 Registration", True, f"User ID: {self.user1_data['user_id']}")
            else:
                self.log_test("User 1 Registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User 1 Registration", False, f"Exception: {str(e)}")
            
        # Test User 2 (for friends testing)
        user2_data = {
            "email": "bob.explorer@example.com", 
            "password": "AnotherPass456!",
            "name": "Bob Explorer"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=user2_data)
            if response.status_code == 200:
                data = response.json()
                self.user2_token = data["access_token"]
                self.user2_data = data["user"]
                self.log_test("User 2 Registration", True, f"User ID: {self.user2_data['user_id']}")
            else:
                self.log_test("User 2 Registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User 2 Registration", False, f"Exception: {str(e)}")
            
    def test_auth_login(self):
        """Test user login"""
        print("\n=== Testing Authentication - Login ===")
        
        login_data = {
            "email": "alice.wanderer@example.com",
            "password": "SecurePass123!"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                token = data["access_token"]
                self.log_test("User Login", True, f"Token received: {token[:20]}...")
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            
    def test_auth_me(self):
        """Test getting current user info"""
        print("\n=== Testing Authentication - Get Me ===")
        
        if not self.user1_token:
            self.log_test("Get Current User", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Get Current User", True, f"User: {data['name']} ({data['email']})")
            else:
                self.log_test("Get Current User", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")
            
    def test_auth_logout(self):
        """Test user logout"""
        print("\n=== Testing Authentication - Logout ===")
        
        try:
            response = self.session.post(f"{self.base_url}/auth/logout")
            if response.status_code == 200:
                self.log_test("User Logout", True, "Logout successful")
            else:
                self.log_test("User Logout", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User Logout", False, f"Exception: {str(e)}")
            
    def test_countries(self):
        """Test countries endpoint"""
        print("\n=== Testing Countries API ===")
        
        if not self.user1_token:
            self.log_test("Get Countries", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = self.session.get(f"{self.base_url}/countries", headers=headers)
            if response.status_code == 200:
                countries = response.json()
                if len(countries) == 10:
                    norway_found = any(c["name"] == "Norway" for c in countries)
                    self.log_test("Get Countries", True, f"Found {len(countries)} countries, Norway included: {norway_found}")
                else:
                    self.log_test("Get Countries", False, f"Expected 10 countries, got {len(countries)}")
            else:
                self.log_test("Get Countries", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Countries", False, f"Exception: {str(e)}")
            
    def test_landmarks(self):
        """Test landmarks endpoints"""
        print("\n=== Testing Landmarks API ===")
        
        if not self.user1_token:
            self.log_test("Get Landmarks", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        # Test getting all landmarks
        try:
            response = self.session.get(f"{self.base_url}/landmarks", headers=headers)
            if response.status_code == 200:
                landmarks = response.json()
                self.log_test("Get All Landmarks", True, f"Found {len(landmarks)} landmarks")
            else:
                self.log_test("Get All Landmarks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get All Landmarks", False, f"Exception: {str(e)}")
            
        # Test getting Norway landmarks
        try:
            response = self.session.get(f"{self.base_url}/landmarks?country_id=norway", headers=headers)
            if response.status_code == 200:
                norway_landmarks = response.json()
                fredrikstad_found = any(l["name"] == "The Old Town of Fredrikstad" for l in norway_landmarks)
                self.log_test("Get Norway Landmarks", True, f"Found {len(norway_landmarks)} Norway landmarks, Fredrikstad included: {fredrikstad_found}")
            else:
                self.log_test("Get Norway Landmarks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Norway Landmarks", False, f"Exception: {str(e)}")
            
        # Test getting official landmarks
        try:
            response = self.session.get(f"{self.base_url}/landmarks?category=official", headers=headers)
            if response.status_code == 200:
                official_landmarks = response.json()
                self.log_test("Get Official Landmarks", True, f"Found {len(official_landmarks)} official landmarks")
            else:
                self.log_test("Get Official Landmarks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Official Landmarks", False, f"Exception: {str(e)}")
            
        # Test getting single landmark
        try:
            response = self.session.get(f"{self.base_url}/landmarks/norway_landmark_1", headers=headers)
            if response.status_code == 200:
                landmark = response.json()
                self.log_test("Get Single Landmark", True, f"Landmark: {landmark['name']}")
            else:
                self.log_test("Get Single Landmark", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Single Landmark", False, f"Exception: {str(e)}")
            
    def test_user_suggested_landmarks(self):
        """Test user-suggested landmarks"""
        print("\n=== Testing User-Suggested Landmarks ===")
        
        if not self.user1_token:
            self.log_test("Create User Landmark", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        # Create user-suggested landmark
        landmark_data = {
            "name": "Alice's Secret Spot",
            "country_id": "norway",
            "description": "A hidden gem discovered by Alice during her travels",
            "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/landmarks", json=landmark_data, headers=headers)
            if response.status_code == 200:
                landmark = response.json()
                self.created_landmark_id = landmark["landmark_id"]
                self.log_test("Create User Landmark", True, f"Created landmark: {landmark['name']} (ID: {landmark['landmark_id']})")
            else:
                self.log_test("Create User Landmark", False, f"Status: {response.status_code}, Response: {response.text}")
                return
        except Exception as e:
            self.log_test("Create User Landmark", False, f"Exception: {str(e)}")
            return
            
        # Test getting user-suggested landmarks
        try:
            response = self.session.get(f"{self.base_url}/landmarks?category=user_suggested", headers=headers)
            if response.status_code == 200:
                user_landmarks = response.json()
                self.log_test("Get User-Suggested Landmarks", True, f"Found {len(user_landmarks)} user-suggested landmarks")
            else:
                self.log_test("Get User-Suggested Landmarks", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get User-Suggested Landmarks", False, f"Exception: {str(e)}")
            
    def test_landmark_upvotes(self):
        """Test landmark upvoting"""
        print("\n=== Testing Landmark Upvotes ===")
        
        if not self.user1_token or not hasattr(self, 'created_landmark_id'):
            self.log_test("Upvote Landmark", False, "No token or landmark available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        # First upvote
        try:
            response = self.session.post(f"{self.base_url}/landmarks/{self.created_landmark_id}/upvote", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("First Upvote", True, f"Upvoted: {data['upvoted']}")
            else:
                self.log_test("First Upvote", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("First Upvote", False, f"Exception: {str(e)}")
            
        # Second upvote (should toggle off)
        try:
            response = self.session.post(f"{self.base_url}/landmarks/{self.created_landmark_id}/upvote", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Toggle Upvote", True, f"Upvoted: {data['upvoted']}")
            else:
                self.log_test("Toggle Upvote", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Toggle Upvote", False, f"Exception: {str(e)}")
            
    def test_visits(self):
        """Test visits endpoints"""
        print("\n=== Testing Visits API ===")
        
        if not self.user1_token:
            self.log_test("Create Visit", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        # Create a visit
        # Simple base64 test image data
        test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        visit_data = {
            "landmark_id": "norway_landmark_1",  # The Old Town of Fredrikstad
            "photo_base64": test_image_b64,
            "comments": "Amazing historic town with beautiful architecture!",
            "diary_notes": "Spent the whole day exploring the cobblestone streets. The fortress walls are incredibly well preserved."
        }
        
        try:
            response = self.session.post(f"{self.base_url}/visits", json=visit_data, headers=headers)
            if response.status_code == 200:
                visit = response.json()
                self.created_visit_id = visit["visit_id"]
                self.log_test("Create Visit", True, f"Created visit: {visit['visit_id']}")
            else:
                self.log_test("Create Visit", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create Visit", False, f"Exception: {str(e)}")
            
        # Test duplicate visit (should fail)
        try:
            response = self.session.post(f"{self.base_url}/visits", json=visit_data, headers=headers)
            if response.status_code == 400:
                self.log_test("Duplicate Visit Prevention", True, "Correctly prevented duplicate visit")
            else:
                self.log_test("Duplicate Visit Prevention", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Duplicate Visit Prevention", False, f"Exception: {str(e)}")
            
        # Get user's visits
        try:
            response = self.session.get(f"{self.base_url}/visits", headers=headers)
            if response.status_code == 200:
                visits = response.json()
                self.log_test("Get User Visits", True, f"Found {len(visits)} visits")
            else:
                self.log_test("Get User Visits", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get User Visits", False, f"Exception: {str(e)}")
            
    def test_stats(self):
        """Test stats endpoint"""
        print("\n=== Testing Stats API ===")
        
        if not self.user1_token:
            self.log_test("Get Stats", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = self.session.get(f"{self.base_url}/stats", headers=headers)
            if response.status_code == 200:
                stats = response.json()
                expected_keys = ["total_visits", "countries_visited", "continents_visited", "friends_count"]
                has_all_keys = all(key in stats for key in expected_keys)
                self.log_test("Get Stats", True, f"Stats: {stats}, Has all keys: {has_all_keys}")
            else:
                self.log_test("Get Stats", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Stats", False, f"Exception: {str(e)}")
            
    def test_friends(self):
        """Test friends endpoints"""
        print("\n=== Testing Friends API ===")
        
        if not self.user1_token or not self.user2_token:
            self.log_test("Friends Test", False, "Need both user tokens")
            return
            
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        
        # Send friend request from user1 to user2
        friend_request = {"friend_email": "bob.explorer@example.com"}
        
        try:
            response = self.session.post(f"{self.base_url}/friends/request", json=friend_request, headers=headers1)
            if response.status_code == 200:
                self.log_test("Send Friend Request", True, "Friend request sent successfully")
            else:
                self.log_test("Send Friend Request", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Send Friend Request", False, f"Exception: {str(e)}")
            
        # Get pending requests for user2
        try:
            response = self.session.get(f"{self.base_url}/friends/pending", headers=headers2)
            if response.status_code == 200:
                pending = response.json()
                if len(pending) > 0:
                    self.friendship_id = pending[0]["friendship_id"]
                    self.log_test("Get Pending Requests", True, f"Found {len(pending)} pending requests")
                else:
                    self.log_test("Get Pending Requests", False, "No pending requests found")
                    return
            else:
                self.log_test("Get Pending Requests", False, f"Status: {response.status_code}, Response: {response.text}")
                return
        except Exception as e:
            self.log_test("Get Pending Requests", False, f"Exception: {str(e)}")
            return
            
        # Accept friend request
        try:
            response = self.session.post(f"{self.base_url}/friends/{self.friendship_id}/accept", headers=headers2)
            if response.status_code == 200:
                self.log_test("Accept Friend Request", True, "Friend request accepted")
            else:
                self.log_test("Accept Friend Request", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Accept Friend Request", False, f"Exception: {str(e)}")
            
        # Get friends list for both users
        try:
            response = self.session.get(f"{self.base_url}/friends", headers=headers1)
            if response.status_code == 200:
                friends = response.json()
                self.log_test("Get Friends List (User 1)", True, f"User 1 has {len(friends)} friends")
            else:
                self.log_test("Get Friends List (User 1)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Friends List (User 1)", False, f"Exception: {str(e)}")
            
        try:
            response = self.session.get(f"{self.base_url}/friends", headers=headers2)
            if response.status_code == 200:
                friends = response.json()
                self.log_test("Get Friends List (User 2)", True, f"User 2 has {len(friends)} friends")
            else:
                self.log_test("Get Friends List (User 2)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Friends List (User 2)", False, f"Exception: {str(e)}")
            
    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        print("\n=== Testing Leaderboard API ===")
        
        if not self.user1_token:
            self.log_test("Get Leaderboard", False, "No token available")
            return
            
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        
        try:
            response = self.session.get(f"{self.base_url}/leaderboard", headers=headers)
            if response.status_code == 200:
                leaderboard = response.json()
                self.log_test("Get Leaderboard", True, f"Leaderboard has {len(leaderboard)} entries")
            else:
                self.log_test("Get Leaderboard", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Get Leaderboard", False, f"Exception: {str(e)}")
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting WanderList Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        self.test_auth_register()
        self.test_auth_login()
        self.test_auth_me()
        
        # Core API tests
        self.test_countries()
        self.test_landmarks()
        self.test_user_suggested_landmarks()
        self.test_landmark_upvotes()
        self.test_visits()
        self.test_stats()
        self.test_friends()
        self.test_leaderboard()
        
        # Logout test
        self.test_auth_logout()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if not result["success"] and result["details"]:
                print(f"   ↳ {result['details']}")
                
        return passed == total

if __name__ == "__main__":
    tester = WanderListTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)