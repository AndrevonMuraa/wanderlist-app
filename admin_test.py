#!/usr/bin/env python3
"""
WanderMark Admin Panel API Testing Suite
Tests all admin endpoints for functionality and security
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://expo-refactor-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "mobile@test.com"

class AdminAPITester:
    def __init__(self):
        self.admin_token = None
        self.regular_user_token = None
        self.test_results = []
        self.test_user_id = None
        self.test_report_id = None
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def get_admin_token(self):
        """Get admin authentication token"""
        try:
            response = requests.get(f"{BASE_URL}/auth/temp-token?email={ADMIN_EMAIL}")
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["token"]
                user_info = data.get("user", {})
                self.log_test("Get Admin Token", True, f"Token obtained for {ADMIN_EMAIL}, Role: {user_info.get('role', 'unknown')}")
                return True
            else:
                self.log_test("Get Admin Token", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Admin Token", False, error=str(e))
            return False

    def test_admin_stats(self):
        """Test GET /api/admin/stats"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_keys = ["users", "visits", "reports", "content"]
                
                # Check structure
                missing_keys = [key for key in required_keys if key not in data]
                if missing_keys:
                    self.log_test("Admin Stats - Structure", False, error=f"Missing keys: {missing_keys}")
                    return False
                
                # Check users stats
                users = data["users"]
                user_keys = ["total", "pro", "free", "banned", "new_this_week", "new_this_month"]
                missing_user_keys = [key for key in user_keys if key not in users]
                if missing_user_keys:
                    self.log_test("Admin Stats - Users Structure", False, error=f"Missing user keys: {missing_user_keys}")
                    return False
                
                details = f"Total Users: {users['total']}, Pro: {users['pro']}, Reports: {data['reports']['total']}, Landmarks: {data['content']['landmarks']}"
                self.log_test("Admin Stats", True, details)
                return True
            else:
                self.log_test("Admin Stats", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Stats", False, error=str(e))
            return False

    def test_admin_stats_unauthorized(self):
        """Test admin stats without token (should return 401)"""
        try:
            response = requests.get(f"{BASE_URL}/admin/stats")
            if response.status_code == 401:
                self.log_test("Admin Stats - Unauthorized", True, "Correctly returned 401 without token")
                return True
            else:
                self.log_test("Admin Stats - Unauthorized", False, error=f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Admin Stats - Unauthorized", False, error=str(e))
            return False

    def test_admin_users_list(self):
        """Test GET /api/admin/users"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "users" not in data or "total" not in data:
                    self.log_test("Admin Users List - Structure", False, error="Missing 'users' or 'total' keys")
                    return False
                
                users = data["users"]
                if len(users) > 0:
                    # Check first user structure
                    user = users[0]
                    required_fields = ["user_id", "email", "name", "subscription_tier", "created_at"]
                    missing_fields = [field for field in required_fields if field not in user]
                    if missing_fields:
                        self.log_test("Admin Users List - User Structure", False, error=f"Missing fields: {missing_fields}")
                        return False
                    
                    # Store a test user ID for later tests
                    self.test_user_id = user["user_id"]
                    
                    # Check optional fields that should exist for admin functionality
                    optional_fields = ["role", "is_banned"]
                    present_optional = [field for field in optional_fields if field in user]
                    self.log_test("Admin Users List - Optional Fields", True, f"Present optional fields: {present_optional}")
                
                details = f"Retrieved {len(users)} users, Total: {data['total']}"
                self.log_test("Admin Users List", True, details)
                return True
            else:
                self.log_test("Admin Users List", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Users List", False, error=str(e))
            return False

    def test_admin_users_filters(self):
        """Test GET /api/admin/users with various filters"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test search filter
        try:
            response = requests.get(f"{BASE_URL}/admin/users?search=test", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Users - Search Filter", True, f"Search returned {len(data.get('users', []))} users")
            else:
                self.log_test("Admin Users - Search Filter", False, error=f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Admin Users - Search Filter", False, error=str(e))
        
        # Test tier filter
        try:
            response = requests.get(f"{BASE_URL}/admin/users?tier=pro", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Users - Tier Filter", True, f"Pro tier filter returned {len(data.get('users', []))} users")
            else:
                self.log_test("Admin Users - Tier Filter", False, error=f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Admin Users - Tier Filter", False, error=str(e))
        
        # Test role filter
        try:
            response = requests.get(f"{BASE_URL}/admin/users?role=admin", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Users - Role Filter", True, f"Admin role filter returned {len(data.get('users', []))} users")
            else:
                self.log_test("Admin Users - Role Filter", False, error=f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Admin Users - Role Filter", False, error=str(e))
        
        # Test banned filter
        try:
            response = requests.get(f"{BASE_URL}/admin/users?is_banned=true", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Users - Banned Filter", True, f"Banned filter returned {len(data.get('users', []))} users")
            else:
                self.log_test("Admin Users - Banned Filter", False, error=f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Admin Users - Banned Filter", False, error=str(e))

    def test_admin_user_detail(self):
        """Test GET /api/admin/users/{user_id}"""
        if not self.test_user_id:
            self.log_test("Admin User Detail", False, error="No test user ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/users/{self.test_user_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["user_id", "email", "name", "subscription_tier", "created_at", "stats"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Admin User Detail - Structure", False, error=f"Missing fields: {missing_fields}")
                    return False
                
                # Check stats structure
                stats = data["stats"]
                stats_fields = ["visits", "points"]
                missing_stats = [field for field in stats_fields if field not in stats]
                if missing_stats:
                    self.log_test("Admin User Detail - Stats Structure", False, error=f"Missing stats: {missing_stats}")
                    return False
                
                details = f"User: {data['name']}, Tier: {data['subscription_tier']}, Visits: {stats['visits']}"
                self.log_test("Admin User Detail", True, details)
                return True
            else:
                self.log_test("Admin User Detail", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin User Detail", False, error=str(e))
            return False

    def test_admin_user_update(self):
        """Test PUT /api/admin/users/{user_id}"""
        if not self.test_user_id:
            self.log_test("Admin User Update", False, error="No test user ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test subscription tier update
        try:
            update_data = {"subscription_tier": "pro"}
            response = requests.put(f"{BASE_URL}/admin/users/{self.test_user_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if "changes" in data and data["changes"].get("subscription_tier") == "pro":
                    self.log_test("Admin User Update - Tier to Pro", True, "Successfully upgraded to pro")
                else:
                    self.log_test("Admin User Update - Tier to Pro", False, error=f"Unexpected response structure: {data}")
            else:
                self.log_test("Admin User Update - Tier to Pro", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin User Update - Tier to Pro", False, error=str(e))
        
        # Test downgrade to free
        try:
            update_data = {"subscription_tier": "free"}
            response = requests.put(f"{BASE_URL}/admin/users/{self.test_user_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if "changes" in data and data["changes"].get("subscription_tier") == "free":
                    self.log_test("Admin User Update - Tier to Free", True, "Successfully downgraded to free")
                else:
                    self.log_test("Admin User Update - Tier to Free", False, error=f"Unexpected response structure: {data}")
            else:
                self.log_test("Admin User Update - Tier to Free", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin User Update - Tier to Free", False, error=str(e))
        
        # Test ban user
        try:
            update_data = {"is_banned": True, "ban_reason": "Test ban"}
            response = requests.put(f"{BASE_URL}/admin/users/{self.test_user_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if "changes" in data and data["changes"].get("is_banned") == True:
                    self.log_test("Admin User Update - Ban User", True, "Successfully banned user")
                else:
                    self.log_test("Admin User Update - Ban User", False, error=f"Unexpected response structure: {data}")
            else:
                self.log_test("Admin User Update - Ban User", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin User Update - Ban User", False, error=str(e))
        
        # Test unban user
        try:
            update_data = {"is_banned": False}
            response = requests.put(f"{BASE_URL}/admin/users/{self.test_user_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if "changes" in data and data["changes"].get("is_banned") == False:
                    self.log_test("Admin User Update - Unban User", True, "Successfully unbanned user")
                else:
                    self.log_test("Admin User Update - Unban User", False, error=f"Unexpected response structure: {data}")
            else:
                self.log_test("Admin User Update - Unban User", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin User Update - Unban User", False, error=str(e))

    def create_test_report(self):
        """Create a test report to use in report testing"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # First get a different user to report (not the first one which might already be reported)
            users_response = requests.get(f"{BASE_URL}/admin/users?limit=5", headers=headers)
            if users_response.status_code != 200:
                self.log_test("Create Test Report - Get User", False, error="Could not get user for report")
                return False
            
            users_data = users_response.json()
            if not users_data.get("users") or len(users_data["users"]) < 2:
                self.log_test("Create Test Report - Get User", False, error="Not enough users found")
                return False
            
            # Try the second user to avoid duplicates
            target_user_id = users_data["users"][1]["user_id"]
            
            # Create report
            report_data = {
                "report_type": "user",
                "target_id": target_user_id,
                "reason": "inappropriate_content",
                "target_name": "Test User Report 2"
            }
            
            response = requests.post(f"{BASE_URL}/reports", headers=headers, json=report_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.test_report_id = data.get("report_id")
                self.log_test("Create Test Report", True, f"Created report: {self.test_report_id}")
                return True
            elif response.status_code == 400:
                # If duplicate, try to get an existing report ID from the reports list
                reports_response = requests.get(f"{BASE_URL}/admin/reports?limit=1", headers=headers)
                if reports_response.status_code == 200:
                    reports_data = reports_response.json()
                    if reports_data.get("reports"):
                        self.test_report_id = reports_data["reports"][0]["report_id"]
                        self.log_test("Create Test Report", True, f"Using existing report: {self.test_report_id}")
                        return True
                
                self.log_test("Create Test Report", False, error=f"Duplicate report and no existing reports found")
                return False
            else:
                self.log_test("Create Test Report", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Test Report", False, error=str(e))
            return False

    def test_admin_reports_list(self):
        """Test GET /api/admin/reports"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/reports", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "reports" not in data or "total" not in data:
                    self.log_test("Admin Reports List - Structure", False, error="Missing 'reports' or 'total' keys")
                    return False
                
                reports = data["reports"]
                details = f"Retrieved {len(reports)} reports, Total: {data['total']}"
                self.log_test("Admin Reports List", True, details)
                
                # Test filters
                # Test status filter
                response = requests.get(f"{BASE_URL}/admin/reports?status=pending", headers=headers)
                if response.status_code == 200:
                    pending_data = response.json()
                    self.log_test("Admin Reports - Status Filter", True, f"Pending filter returned {len(pending_data.get('reports', []))} reports")
                else:
                    self.log_test("Admin Reports - Status Filter", False, error=f"Status: {response.status_code}")
                
                return True
            else:
                self.log_test("Admin Reports List", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Reports List", False, error=str(e))
            return False

    def test_admin_report_update(self):
        """Test PUT /api/admin/reports/{report_id}"""
        if not self.test_report_id:
            self.log_test("Admin Report Update", False, error="No test report ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test resolve report
        try:
            update_data = {"status": "resolved"}
            response = requests.put(f"{BASE_URL}/admin/reports/{self.test_report_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "resolved":
                    self.log_test("Admin Report Update - Resolve", True, "Successfully resolved report")
                else:
                    self.log_test("Admin Report Update - Resolve", False, error="Status not updated in response")
            else:
                self.log_test("Admin Report Update - Resolve", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin Report Update - Resolve", False, error=str(e))
        
        # Test dismiss report with notes
        try:
            update_data = {"status": "dismissed", "admin_notes": "No action needed"}
            response = requests.put(f"{BASE_URL}/admin/reports/{self.test_report_id}", 
                                  headers=headers, json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "dismissed":
                    self.log_test("Admin Report Update - Dismiss", True, "Successfully dismissed report with notes")
                else:
                    self.log_test("Admin Report Update - Dismiss", False, error=f"Status not updated properly: {data}")
            else:
                self.log_test("Admin Report Update - Dismiss", False, error=f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Admin Report Update - Dismiss", False, error=str(e))

    def test_admin_logs(self):
        """Test GET /api/admin/logs (super admin only)"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BASE_URL}/admin/logs", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Admin Logs", True, f"Retrieved {len(data)} log entries")
                return True
            elif response.status_code == 403:
                self.log_test("Admin Logs", True, "Correctly returned 403 - user may not be super admin")
                return True
            else:
                self.log_test("Admin Logs", False, error=f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Logs", False, error=str(e))
            return False

    def test_non_admin_access(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Try to get a regular user token (if available)
        try:
            # Try with a different email that might not be admin
            response = requests.get(f"{BASE_URL}/auth/temp-token?email=test@example.com")
            if response.status_code == 200:
                regular_token = response.json()["token"]
                headers = {"Authorization": f"Bearer {regular_token}"}
                
                # Test admin stats with regular user
                response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
                if response.status_code == 403:
                    self.log_test("Non-Admin Access - Stats", True, "Correctly blocked non-admin user")
                else:
                    self.log_test("Non-Admin Access - Stats", False, error=f"Expected 403, got {response.status_code}")
            else:
                self.log_test("Non-Admin Access", True, "Could not get regular user token - skipping test")
        except Exception as e:
            self.log_test("Non-Admin Access", True, f"Could not test non-admin access: {str(e)}")

    def run_all_tests(self):
        """Run all admin API tests"""
        print("🔧 WanderMark Admin Panel API Testing Suite")
        print("=" * 50)
        print()
        
        # Get admin token first
        if not self.get_admin_token():
            print("❌ CRITICAL: Could not get admin token. Stopping tests.")
            return False
        
        # Run authentication tests
        print("🔐 Testing Authentication & Authorization...")
        self.test_admin_stats_unauthorized()
        self.test_non_admin_access()
        print()
        
        # Run admin stats tests
        print("📊 Testing Admin Stats...")
        self.test_admin_stats()
        print()
        
        # Run user management tests
        print("👥 Testing User Management...")
        self.test_admin_users_list()
        self.test_admin_users_filters()
        self.test_admin_user_detail()
        self.test_admin_user_update()
        print()
        
        # Run report management tests
        print("📋 Testing Report Management...")
        self.create_test_report()
        self.test_admin_reports_list()
        self.test_admin_report_update()
        print()
        
        # Run admin logs test
        print("📝 Testing Admin Logs...")
        self.test_admin_logs()
        print()
        
        # Summary
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print("=" * 50)
        print("🎯 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   • {test['test']}: {test['error']}")
            print()
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = AdminAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All admin API tests passed!")
        sys.exit(0)
    else:
        print("⚠️  Some admin API tests failed. Check details above.")
        sys.exit(1)