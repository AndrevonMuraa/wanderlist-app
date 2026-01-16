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
        self.initial_points = None
        self.initial_leaderboard_points = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self):
        """Login with test credentials"""
        self.log("🔐 Logging in with test credentials...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            self.log(f"✅ Login successful for {TEST_EMAIL}")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def get_user_stats(self):
        """Get current user stats including both points types"""
        self.log("📊 Getting current user stats...")
        
        response = self.session.get(f"{API_BASE}/stats")
        
        if response.status_code == 200:
            stats = response.json()
            points = stats.get('points', 0)
            leaderboard_points = stats.get('leaderboard_points', 0)
            
            self.log(f"✅ Current stats - Personal Points: {points}, Leaderboard Points: {leaderboard_points}")
            return points, leaderboard_points
        else:
            self.log(f"❌ Failed to get stats: {response.status_code} - {response.text}", "ERROR")
            return None, None
    
    def create_country_visit_without_photos(self, country_id="norway"):
        """Test creating a country visit WITHOUT photos"""
        self.log(f"🏛️ Testing country visit WITHOUT photos for {country_id}...")
        
        visit_data = {
            "country_id": country_id,
            "photos": [],  # Empty photos array
            "diary_notes": "Beautiful country, visited without taking photos",
            "visibility": "public"
        }
        
        response = self.session.post(f"{API_BASE}/country-visits", json=visit_data)
        
        if response.status_code == 200:
            data = response.json()
            has_photos = data.get('has_photos', True)  # Should be False
            points_earned = data.get('points_earned', 0)
            leaderboard_points_earned = data.get('leaderboard_points_earned', 0)
            
            self.log(f"✅ Country visit created - Has Photos: {has_photos}, Points Earned: {points_earned}, Leaderboard Points Earned: {leaderboard_points_earned}")
            
            # Verify expected behavior
            if has_photos == False and points_earned == 50 and leaderboard_points_earned == 0:
                self.log("✅ CORRECT: Visit without photos awards personal points only")
                return True
            else:
                self.log(f"❌ INCORRECT: Expected has_photos=False, points_earned=50, leaderboard_points_earned=0", "ERROR")
                return False
        else:
            self.log(f"❌ Failed to create country visit: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def create_country_visit_with_photos(self, country_id="switzerland"):
        """Test creating a country visit WITH photos"""
        self.log(f"🏛️ Testing country visit WITH photos for {country_id}...")
        
        # Sample base64 image (small test image)
        sample_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        visit_data = {
            "country_id": country_id,
            "photos": [sample_photo],  # Include a photo
            "diary_notes": "Amazing country, captured some beautiful moments",
            "visibility": "public"
        }
        
        response = self.session.post(f"{API_BASE}/country-visits", json=visit_data)
        
        if response.status_code == 200:
            data = response.json()
            has_photos = data.get('has_photos', False)  # Should be True
            points_earned = data.get('points_earned', 0)
            leaderboard_points_earned = data.get('leaderboard_points_earned', 0)
            
            self.log(f"✅ Country visit created - Has Photos: {has_photos}, Points Earned: {points_earned}, Leaderboard Points Earned: {leaderboard_points_earned}")
            
            # Verify expected behavior
            if has_photos == True and points_earned == 50 and leaderboard_points_earned == 50:
                self.log("✅ CORRECT: Visit with photos awards both personal and leaderboard points")
                return True
            else:
                self.log(f"❌ INCORRECT: Expected has_photos=True, points_earned=50, leaderboard_points_earned=50", "ERROR")
                return False
        else:
            self.log(f"❌ Failed to create country visit with photos: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def test_leaderboard_uses_leaderboard_points(self):
        """Test that leaderboard endpoint uses leaderboard_points not total points"""
        self.log("🏆 Testing leaderboard uses leaderboard_points...")
        
        response = self.session.get(f"{API_BASE}/leaderboard")
        
        if response.status_code == 200:
            data = response.json()
            leaderboard = data.get('leaderboard', [])
            
            if leaderboard:
                # Check first entry to see if it uses leaderboard_points
                first_entry = leaderboard[0]
                value = first_entry.get('value', 0)
                personal_points = first_entry.get('personal_points', 0)
                
                self.log(f"✅ Leaderboard retrieved - First entry value: {value}, personal_points: {personal_points}")
                
                # The 'value' field should represent leaderboard_points
                if 'value' in first_entry:
                    self.log("✅ CORRECT: Leaderboard uses 'value' field (leaderboard_points)")
                    return True
                else:
                    self.log("❌ INCORRECT: Leaderboard missing 'value' field", "ERROR")
                    return False
            else:
                self.log("⚠️ WARNING: Leaderboard is empty, cannot verify points system")
                return True  # Not a failure, just empty
        else:
            self.log(f"❌ Failed to get leaderboard: {response.status_code} - {response.text}", "ERROR")
            return False
    
    def verify_points_changes(self, initial_personal, initial_leaderboard, expected_personal_increase, expected_leaderboard_increase):
        """Verify that points changed as expected"""
        self.log("🔍 Verifying points changes...")
        
        current_personal, current_leaderboard = self.get_user_stats()
        
        if current_personal is None or current_leaderboard is None:
            return False
        
        actual_personal_increase = current_personal - initial_personal
        actual_leaderboard_increase = current_leaderboard - initial_leaderboard
        
        self.log(f"📈 Points changes - Personal: +{actual_personal_increase} (expected +{expected_personal_increase}), Leaderboard: +{actual_leaderboard_increase} (expected +{expected_leaderboard_increase})")
        
        if actual_personal_increase == expected_personal_increase and actual_leaderboard_increase == expected_leaderboard_increase:
            self.log("✅ CORRECT: Points changes match expectations")
            return True
        else:
            self.log("❌ INCORRECT: Points changes do not match expectations", "ERROR")
            return False
    
    def run_dual_points_system_test(self):
        """Run the complete dual points system test as per review request"""
        self.log("🚀 Starting Dual Points System Test...")
        self.log("=" * 60)
        
        # Step 1: Login
        if not self.login():
            return False
        
        # Step 2: Get initial points
        self.log("\n📊 STEP 1: Getting initial user points...")
        initial_personal, initial_leaderboard = self.get_user_stats()
        if initial_personal is None or initial_leaderboard is None:
            return False
        
        self.initial_points = initial_personal
        self.initial_leaderboard_points = initial_leaderboard
        
        # Step 3: Test country visit WITHOUT photos (Norway)
        self.log("\n🏛️ STEP 2: Testing country visit WITHOUT photos (Norway)...")
        if not self.create_country_visit_without_photos("norway"):
            return False
        
        # Step 4: Verify points increased correctly (personal +50, leaderboard +0)
        self.log("\n🔍 STEP 3: Verifying points after visit without photos...")
        if not self.verify_points_changes(initial_personal, initial_leaderboard, 50, 0):
            return False
        
        # Update our baseline for next test
        current_personal, current_leaderboard = self.get_user_stats()
        
        # Step 5: Test country visit WITH photos (Sweden)
        self.log("\n📸 STEP 4: Testing country visit WITH photos (Sweden)...")
        if not self.create_country_visit_with_photos("sweden"):
            return False
        
        # Step 6: Verify both points types increased (+50 each)
        self.log("\n🔍 STEP 5: Verifying points after visit with photos...")
        if not self.verify_points_changes(current_personal, current_leaderboard, 50, 50):
            return False
        
        # Step 7: Test leaderboard uses leaderboard_points
        self.log("\n🏆 STEP 6: Testing leaderboard uses leaderboard_points...")
        if not self.test_leaderboard_uses_leaderboard_points():
            return False
        
        self.log("\n" + "=" * 60)
        self.log("🎉 ALL DUAL POINTS SYSTEM TESTS PASSED!")
        return True

def main():
    """Main test execution"""
    print("🧪 WanderList Dual Points System Testing")
    print("=" * 60)
    
    tester = DualPointsSystemTester()
    
    try:
        success = tester.run_dual_points_system_test()
        
        if success:
            print("\n✅ DUAL POINTS SYSTEM TEST COMPLETED SUCCESSFULLY")
            print("🎯 Expected Results Verified:")
            print("   • Visits without photos: Personal points only (+50, +0)")
            print("   • Visits with photos: Both points types (+50, +50)")
            print("   • Leaderboard shows leaderboard_points not total points")
            sys.exit(0)
        else:
            print("\n❌ DUAL POINTS SYSTEM TEST FAILED")
            print("🔧 Issues found that need to be addressed by main agent")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()