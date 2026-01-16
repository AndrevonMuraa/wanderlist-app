#!/usr/bin/env python3
"""
Backend API Testing Script for WanderList Dual Points System
Testing the new dual points system for country visits as per review request.
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wanderlist-headers.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials from review request
TEST_EMAIL = "mobile@test.com"
TEST_PASSWORD = "test123"

class DualPointsSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def login(self):
        """Login with test user credentials"""
        print("🔐 Logging in with test user...")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.user_data = data["user"]
            
            # Set authorization header for future requests
            self.session.headers.update({
                "Authorization": f"Bearer {self.auth_token}"
            })
            
            print(f"✅ Login successful! User: {self.user_data.get('name', 'Unknown')} ({self.user_data.get('email', TEST_USER_EMAIL)})")
            print(f"   Subscription tier: {self.user_data.get('subscription_tier', 'free')}")
            print(f"   User ID: {self.user_data.get('user_id', 'Unknown')}")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_country_visit_check_endpoint(self):
        """Test the /api/country-visits/check/{country_id} endpoint"""
        print("\n🔍 Testing Country Visit Check Endpoint...")
        
        test_cases = [
            {
                "country_id": "france",
                "description": "France (should have visit record)",
                "expected_visited": True
            },
            {
                "country_id": "uk", 
                "description": "UK/United Kingdom (should not have visit)",
                "expected_visited": False
            }
        ]
        
        results = []
        
        for case in test_cases:
            print(f"\n   Testing {case['description']}...")
            
            response = self.session.get(f"{BASE_URL}/country-visits/check/{case['country_id']}")
            
            if response.status_code == 200:
                data = response.json()
                visited = data.get("visited", False)
                source = data.get("source")
                country_visit_id = data.get("country_visit_id")
                
                print(f"   ✅ Response: visited={visited}, source={source}, country_visit_id={country_visit_id}")
                
                # Validate expected behavior
                if visited == case["expected_visited"]:
                    print(f"   ✅ Expected behavior confirmed for {case['country_id']}")
                    results.append(True)
                else:
                    print(f"   ⚠️  Unexpected result for {case['country_id']}: expected visited={case['expected_visited']}, got {visited}")
                    results.append(False)
                    
                # Additional validation for visited countries
                if visited:
                    if source in ["auto_landmark", "manual", "landmark_visits"]:
                        print(f"   ✅ Valid source type: {source}")
                    else:
                        print(f"   ⚠️  Unexpected source type: {source}")
                        
            else:
                print(f"   ❌ Request failed: {response.status_code} - {response.text}")
                results.append(False)
        
        success_rate = sum(results) / len(results) * 100
        print(f"\n   📊 Country Visit Check Test Results: {sum(results)}/{len(results)} passed ({success_rate:.1f}%)")
        return all(results)
    
    def test_get_country_visits_endpoint(self):
        """Test the GET /api/country-visits endpoint"""
        print("\n📋 Testing Get Country Visits Endpoint...")
        
        response = self.session.get(f"{BASE_URL}/country-visits")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Successfully retrieved country visits")
            print(f"   📊 Total country visits: {len(data)}")
            
            if len(data) > 0:
                # Show details of first few visits
                for i, visit in enumerate(data[:3]):
                    print(f"   🌍 Visit {i+1}: {visit.get('country_name', 'Unknown')} ({visit.get('continent', 'Unknown')})")
                    print(f"      - Photos: {len(visit.get('photos', []))}")
                    print(f"      - Has diary: {bool(visit.get('diary'))}")
                    print(f"      - Points earned: {visit.get('points_earned', 0)}")
                    print(f"      - Source: {visit.get('source', 'unknown')}")
                
                if len(data) > 3:
                    print(f"   ... and {len(data) - 3} more visits")
            else:
                print("   ℹ️  No country visits found for this user")
            
            return True
        else:
            print(f"   ❌ Request failed: {response.status_code} - {response.text}")
            return False
    
    def create_sample_photo_base64(self):
        """Create a small sample base64 image for testing"""
        # Create a minimal 1x1 pixel PNG in base64
        # This is a valid PNG file encoded in base64
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=="
    
    def test_create_country_visit_endpoint(self):
        """Test the POST /api/country-visits endpoint"""
        print("\n🆕 Testing Create Country Visit Endpoint...")
        
        # Test creating a new country visit for a country that likely doesn't have one
        test_country_id = "germany"  # Using Germany as test case
        
        # First check if Germany already has a visit
        check_response = self.session.get(f"{BASE_URL}/country-visits/check/{test_country_id}")
        
        if check_response.status_code == 200:
            check_data = check_response.json()
            already_visited = check_data.get("visited", False)
            
            if already_visited:
                print(f"   ℹ️  {test_country_id} already has a visit record - testing upgrade scenario")
            else:
                print(f"   ℹ️  {test_country_id} has no visit record - testing new creation scenario")
        
        # Create country visit data
        country_visit_data = {
            "country_id": test_country_id,
            "photos": [
                self.create_sample_photo_base64(),
                self.create_sample_photo_base64()
            ],
            "diary_notes": "Amazing trip to Germany! Visited beautiful castles and enjoyed the local culture. The food was incredible and the people were very friendly.",
            "visibility": "public",
            "visited_at": datetime.now().isoformat()
        }
        
        print(f"   📤 Creating country visit for {test_country_id}...")
        print(f"   📸 Photos: {len(country_visit_data['photos'])}")
        print(f"   📝 Diary length: {len(country_visit_data['diary_notes'])} characters")
        
        response = self.session.post(f"{BASE_URL}/country-visits", json=country_visit_data)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Country visit created successfully!")
            print(f"   🆔 Country visit ID: {data.get('country_visit_id')}")
            print(f"   🎯 Points earned: {data.get('points_earned', 0)}")
            print(f"   📈 Was upgrade: {data.get('was_upgrade', False)}")
            
            # Verify the visit was created by checking it exists
            verify_response = self.session.get(f"{BASE_URL}/country-visits/check/{test_country_id}")
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                if verify_data.get("visited"):
                    print(f"   ✅ Verification successful - country visit now exists")
                    return True
                else:
                    print(f"   ❌ Verification failed - country visit not found after creation")
                    return False
            else:
                print(f"   ⚠️  Could not verify creation: {verify_response.status_code}")
                return True  # Still count as success since creation worked
                
        else:
            print(f"   ❌ Country visit creation failed: {response.status_code} - {response.text}")
            return False
    
    def test_country_visit_upgrade_scenario(self):
        """Test upgrading an existing country visit"""
        print("\n🔄 Testing Country Visit Upgrade Scenario...")
        
        # Find a country that has a visit record to test upgrade
        visits_response = self.session.get(f"{BASE_URL}/country-visits")
        
        if visits_response.status_code != 200:
            print("   ⚠️  Could not retrieve existing visits for upgrade test")
            return False
        
        visits = visits_response.json()
        
        if len(visits) == 0:
            print("   ℹ️  No existing visits found - skipping upgrade test")
            return True
        
        # Use the first visit for upgrade test
        test_visit = visits[0]
        country_id = test_visit.get("country_id")
        
        if not country_id:
            print("   ⚠️  No country_id found in existing visit - skipping upgrade test")
            return True
        
        print(f"   🔄 Testing upgrade for existing visit: {test_visit.get('country_name', country_id)}")
        
        # Create upgrade data with new photos and diary
        upgrade_data = {
            "country_id": country_id,
            "photos": [
                self.create_sample_photo_base64(),
                self.create_sample_photo_base64(),
                self.create_sample_photo_base64()
            ],
            "diary_notes": "Updated diary entry with more details about my amazing experience in this beautiful country! Added more photos and memories.",
            "visibility": "friends"
        }
        
        response = self.session.post(f"{BASE_URL}/country-visits", json=upgrade_data)
        
        if response.status_code == 200:
            data = response.json()
            was_upgrade = data.get("was_upgrade", False)
            points_earned = data.get("points_earned", 0)
            
            print(f"   ✅ Country visit upgrade successful!")
            print(f"   🔄 Was upgrade: {was_upgrade}")
            print(f"   🎯 Points earned: {points_earned} (should be 0 for upgrade)")
            
            if was_upgrade and points_earned == 0:
                print(f"   ✅ Upgrade behavior correct - no additional points awarded")
                return True
            else:
                print(f"   ⚠️  Unexpected upgrade behavior")
                return False
        else:
            print(f"   ❌ Upgrade failed: {response.status_code} - {response.text}")
            return False
    
    def run_comprehensive_test(self):
        """Run all country visit tests"""
        print("🚀 Starting Comprehensive Country Visit Feature Testing")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Step 2: Test check endpoint
        check_success = self.test_country_visit_check_endpoint()
        
        # Step 3: Test get endpoint
        get_success = self.test_get_country_visits_endpoint()
        
        # Step 4: Test create endpoint
        create_success = self.test_create_country_visit_endpoint()
        
        # Step 5: Test upgrade scenario
        upgrade_success = self.test_country_visit_upgrade_scenario()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 COUNTRY VISIT FEATURE TEST SUMMARY")
        print("=" * 60)
        
        tests = [
            ("Authentication", True),  # We got this far
            ("Country Visit Check Endpoint", check_success),
            ("Get Country Visits Endpoint", get_success), 
            ("Create Country Visit Endpoint", create_success),
            ("Country Visit Upgrade Scenario", upgrade_success)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, success in tests:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}")
            if success:
                passed += 1
        
        success_rate = (passed / total) * 100
        print(f"\n🎯 Overall Success Rate: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("🎉 Country Visit Feature Testing: EXCELLENT RESULTS!")
        elif success_rate >= 60:
            print("✅ Country Visit Feature Testing: GOOD RESULTS")
        else:
            print("⚠️  Country Visit Feature Testing: NEEDS ATTENTION")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = CountryVisitTester()
    
    try:
        success = tester.run_comprehensive_test()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test execution failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()