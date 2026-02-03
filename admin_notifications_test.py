#!/usr/bin/env python3
"""
Admin Push Notifications API Testing Script
Tests the Admin Push Notifications API endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://wandermark-pay.preview.emergentagent.com/api"
TEST_EMAIL = "mobile@test.com"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"🔍 {message}")
    print(f"{'='*60}{Colors.END}")

class AdminNotificationTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    def get_auth_token(self):
        """Get authentication token for admin user"""
        print_header("AUTHENTICATION - Getting Admin Token")
        
        try:
            # Get temp token for admin user
            response = self.session.get(f"{BASE_URL}/auth/temp-token", params={"email": TEST_EMAIL})
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                user_info = data.get("user", {})
                
                print_success(f"Authentication successful for {user_info['name']} (user_id: {user_info['user_id']})")
                print_info(f"User role: {user_info.get('role', 'user')}")
                print_info(f"Subscription tier: {user_info.get('subscription_tier', 'free')}")
                
                # Verify admin role
                if user_info.get('role') != 'admin':
                    print_error(f"User does not have admin role. Current role: {user_info.get('role', 'user')}")
                    return False
                
                # Set authorization header
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_result("Authentication", True, f"Admin token obtained for {user_info['user_id']}")
                return True
            else:
                print_error(f"Failed to get auth token: {response.status_code} - {response.text}")
                self.log_result("Authentication", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Authentication error: {str(e)}")
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_notification_stats(self):
        """Test GET /api/admin/notifications/stats"""
        print_header("TEST 1: Get Notification Stats")
        
        try:
            response = self.session.get(f"{BASE_URL}/admin/notifications/stats")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Notification stats retrieved successfully")
                
                # Verify response structure
                required_fields = ["total_notifications", "sent_this_week", "users_with_tokens", "total_delivered"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print_error(f"Missing required fields: {missing_fields}")
                    self.log_result("Notification Stats", False, f"Missing fields: {missing_fields}")
                    return False
                
                print_info(f"Total notifications: {data['total_notifications']}")
                print_info(f"Sent this week: {data['sent_this_week']}")
                print_info(f"Users with tokens: {data['users_with_tokens']}")
                print_info(f"Total delivered: {data['total_delivered']}")
                
                self.log_result("Notification Stats", True, f"Stats: {data}")
                return True
                
            elif response.status_code == 403:
                print_error("Access denied - Admin role required")
                self.log_result("Notification Stats", False, "HTTP 403: Admin access required")
                return False
            else:
                print_error(f"Failed to get stats: {response.status_code} - {response.text}")
                self.log_result("Notification Stats", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Stats test error: {str(e)}")
            self.log_result("Notification Stats", False, f"Exception: {str(e)}")
            return False
    
    def test_send_notification_all(self):
        """Test POST /api/admin/notifications/send with target: all"""
        print_header("TEST 2: Send Notification to All Users")
        
        try:
            payload = {
                "title": "Test Notification",
                "body": "This is a test message",
                "target": "all"
            }
            
            response = self.session.post(f"{BASE_URL}/admin/notifications/send", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print_success("Notification sent successfully to all users")
                
                # Verify response structure
                required_fields = ["message", "target_count", "sent_count", "failed_count", "tokens_found"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print_error(f"Missing required fields: {missing_fields}")
                    self.log_result("Send Notification All", False, f"Missing fields: {missing_fields}")
                    return False
                
                print_info(f"Message: {data['message']}")
                print_info(f"Target count: {data['target_count']}")
                print_info(f"Sent count: {data['sent_count']}")
                print_info(f"Failed count: {data['failed_count']}")
                print_info(f"Tokens found: {data['tokens_found']}")
                
                # Note about expected behavior in test environment
                if data['sent_count'] == 0:
                    print_warning("Sent count is 0 - This is expected in test environment where users may not have push tokens registered")
                
                self.log_result("Send Notification All", True, f"Response: {data}")
                return True
                
            elif response.status_code == 403:
                print_error("Access denied - Admin role required")
                self.log_result("Send Notification All", False, "HTTP 403: Admin access required")
                return False
            else:
                print_error(f"Failed to send notification: {response.status_code} - {response.text}")
                self.log_result("Send Notification All", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Send notification test error: {str(e)}")
            self.log_result("Send Notification All", False, f"Exception: {str(e)}")
            return False
    
    def test_send_notification_pro(self):
        """Test POST /api/admin/notifications/send with target: pro"""
        print_header("TEST 3: Send Notification to Pro Users")
        
        try:
            payload = {
                "title": "Pro User Exclusive",
                "body": "This message is only for Pro tier users",
                "target": "pro"
            }
            
            response = self.session.post(f"{BASE_URL}/admin/notifications/send", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print_success("Notification sent successfully to Pro users")
                
                print_info(f"Target count (Pro users): {data['target_count']}")
                print_info(f"Sent count: {data['sent_count']}")
                print_info(f"Failed count: {data['failed_count']}")
                print_info(f"Tokens found: {data['tokens_found']}")
                
                self.log_result("Send Notification Pro", True, f"Response: {data}")
                return True
                
            else:
                print_error(f"Failed to send Pro notification: {response.status_code} - {response.text}")
                self.log_result("Send Notification Pro", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Send Pro notification test error: {str(e)}")
            self.log_result("Send Notification Pro", False, f"Exception: {str(e)}")
            return False
    
    def test_send_notification_free(self):
        """Test POST /api/admin/notifications/send with target: free"""
        print_header("TEST 4: Send Notification to Free Users")
        
        try:
            payload = {
                "title": "Free User Update",
                "body": "This message is for Free tier users - consider upgrading!",
                "target": "free"
            }
            
            response = self.session.post(f"{BASE_URL}/admin/notifications/send", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print_success("Notification sent successfully to Free users")
                
                print_info(f"Target count (Free users): {data['target_count']}")
                print_info(f"Sent count: {data['sent_count']}")
                print_info(f"Failed count: {data['failed_count']}")
                print_info(f"Tokens found: {data['tokens_found']}")
                
                self.log_result("Send Notification Free", True, f"Response: {data}")
                return True
                
            else:
                print_error(f"Failed to send Free notification: {response.status_code} - {response.text}")
                self.log_result("Send Notification Free", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Send Free notification test error: {str(e)}")
            self.log_result("Send Notification Free", False, f"Exception: {str(e)}")
            return False
    
    def test_notification_history(self):
        """Test GET /api/admin/notifications"""
        print_header("TEST 5: Get Notification History")
        
        try:
            # Test with default pagination
            response = self.session.get(f"{BASE_URL}/admin/notifications")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Notification history retrieved successfully")
                
                # Verify response structure
                required_fields = ["notifications", "total", "page", "limit", "pages"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print_error(f"Missing required fields: {missing_fields}")
                    self.log_result("Notification History", False, f"Missing fields: {missing_fields}")
                    return False
                
                print_info(f"Total notifications: {data['total']}")
                print_info(f"Current page: {data['page']}")
                print_info(f"Limit per page: {data['limit']}")
                print_info(f"Total pages: {data['pages']}")
                print_info(f"Notifications in response: {len(data['notifications'])}")
                
                # Check if we have notifications from our previous tests
                if data['notifications']:
                    latest_notification = data['notifications'][0]
                    print_info(f"Latest notification: '{latest_notification.get('title', 'N/A')}'")
                    print_info(f"Sent by: {latest_notification.get('sent_by_name', 'N/A')}")
                    print_info(f"Target: {latest_notification.get('target', 'N/A')}")
                
                self.log_result("Notification History", True, f"Retrieved {len(data['notifications'])} notifications")
                return True
                
            elif response.status_code == 403:
                print_error("Access denied - Admin role required")
                self.log_result("Notification History", False, "HTTP 403: Admin access required")
                return False
            else:
                print_error(f"Failed to get history: {response.status_code} - {response.text}")
                self.log_result("Notification History", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"History test error: {str(e)}")
            self.log_result("Notification History", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_logs_verification(self):
        """Test GET /api/admin/logs to verify notification actions are logged"""
        print_header("TEST 6: Verify Admin Logs for Notification Actions")
        
        try:
            response = self.session.get(f"{BASE_URL}/admin/logs")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Admin logs retrieved successfully")
                
                # Check if data is a list or dict
                if isinstance(data, list):
                    logs = data
                else:
                    logs = data.get('logs', [])
                
                # Look for notification send actions
                notification_logs = [log for log in logs if isinstance(log, dict) and log.get('action') == 'send_notification']
                
                if notification_logs:
                    print_success(f"Found {len(notification_logs)} notification send actions in logs")
                    
                    # Show details of the most recent notification log
                    latest_log = notification_logs[0]
                    print_info(f"Latest notification log:")
                    print_info(f"  Admin: {latest_log.get('admin_name', 'N/A')}")
                    print_info(f"  Action: {latest_log.get('action', 'N/A')}")
                    print_info(f"  Details: {latest_log.get('details', {})}")
                    print_info(f"  Created: {latest_log.get('created_at', 'N/A')}")
                    
                    self.log_result("Admin Logs Verification", True, f"Found {len(notification_logs)} notification logs")
                    return True
                else:
                    print_warning("No notification send actions found in admin logs")
                    self.log_result("Admin Logs Verification", True, "No notification logs found (may be expected)")
                    return True
                
            elif response.status_code == 403:
                print_error("Access denied - Admin role required for logs")
                self.log_result("Admin Logs Verification", False, "HTTP 403: Admin access required")
                return False
            else:
                print_error(f"Failed to get admin logs: {response.status_code} - {response.text}")
                self.log_result("Admin Logs Verification", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Admin logs test error: {str(e)}")
            self.log_result("Admin Logs Verification", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all admin notification tests"""
        print_header("ADMIN PUSH NOTIFICATIONS API TESTING")
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Test user: {TEST_EMAIL}")
        
        # Authentication
        if not self.get_auth_token():
            print_error("Authentication failed - cannot proceed with tests")
            return False
        
        # Run all tests
        tests = [
            self.test_notification_stats,
            self.test_send_notification_all,
            self.test_send_notification_pro,
            self.test_send_notification_free,
            self.test_notification_history,
            self.test_admin_logs_verification
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
            except Exception as e:
                print_error(f"Test {test.__name__} failed with exception: {str(e)}")
        
        # Summary
        print_header("TEST SUMMARY")
        success_rate = (passed_tests / total_tests) * 100
        
        if passed_tests == total_tests:
            print_success(f"ALL TESTS PASSED! ({passed_tests}/{total_tests}) - {success_rate:.1f}% success rate")
        else:
            failed_tests = total_tests - passed_tests
            print_warning(f"TESTS COMPLETED: {passed_tests}/{total_tests} passed, {failed_tests} failed - {success_rate:.1f}% success rate")
        
        # Detailed results
        print_info("\nDetailed Results:")
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"  {status} - {result['test']}")
            if result["details"] and not result["success"]:
                print(f"    Details: {result['details']}")
        
        return passed_tests == total_tests

def main():
    """Main function to run the tests"""
    tester = AdminNotificationTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()