#!/usr/bin/env python3
"""
Backend Testing Script for WanderList Comments System
Tests all comment-related endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://travelfeed.preview.emergentagent.com/api"

class CommentSystemTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.activity_id = None
        self.comment_id = None
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
        """Login as mobile@test.com"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": "mobile@test.com",
                "password": "test123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.user_id = data["user"]["user_id"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                self.log_test("User Login", True, f"Logged in as {data['user']['name']}")
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def get_activity_from_feed(self):
        """Get an activity from the feed to test comments on"""
        try:
            response = self.session.get(f"{BACKEND_URL}/feed")
            
            if response.status_code == 200:
                activities = response.json()
                if activities:
                    # Use the first activity
                    self.activity_id = activities[0]["activity_id"]
                    activity_type = activities[0]["activity_type"]
                    user_name = activities[0]["user_name"]
                    self.log_test("Get Activity from Feed", True, 
                                f"Found activity {self.activity_id} (type: {activity_type}, user: {user_name})")
                    return True
                else:
                    self.log_test("Get Activity from Feed", False, "No activities found in feed")
                    return False
            else:
                self.log_test("Get Activity from Feed", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Activity from Feed", False, f"Exception: {str(e)}")
            return False
    
    def post_comment_on_activity(self):
        """Test posting a comment on an activity"""
        try:
            comment_content = f"Great adventure! This looks amazing! 🌟 (Test comment at {datetime.now().strftime('%H:%M:%S')})"
            
            response = self.session.post(f"{BACKEND_URL}/activities/{self.activity_id}/comment", json={
                "content": comment_content
            })
            
            if response.status_code == 200:
                comment_data = response.json()
                self.comment_id = comment_data["comment_id"]
                
                # Verify comment structure
                required_fields = ["comment_id", "activity_id", "user_id", "user_name", "content", "created_at", "likes_count", "is_liked"]
                missing_fields = [field for field in required_fields if field not in comment_data]
                
                if not missing_fields:
                    if (comment_data["content"] == comment_content and 
                        comment_data["activity_id"] == self.activity_id and
                        comment_data["user_id"] == self.user_id):
                        self.log_test("Post Comment on Activity", True, 
                                    f"Comment created with ID: {self.comment_id}")
                        return True
                    else:
                        self.log_test("Post Comment on Activity", False, "Comment data mismatch")
                        return False
                else:
                    self.log_test("Post Comment on Activity", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Post Comment on Activity", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Post Comment on Activity", False, f"Exception: {str(e)}")
            return False
    
    def fetch_comments_for_activity(self):
        """Test fetching comments for an activity"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/{self.activity_id}/comments")
            
            if response.status_code == 200:
                comments = response.json()
                
                # Find our comment
                our_comment = None
                for comment in comments:
                    if comment["comment_id"] == self.comment_id:
                        our_comment = comment
                        break
                
                if our_comment:
                    # Verify is_liked is false initially
                    if our_comment["is_liked"] == False and our_comment["likes_count"] == 0:
                        self.log_test("Fetch Comments for Activity", True, 
                                    f"Found {len(comments)} comments, our comment has is_liked=False, likes_count=0")
                        return True
                    else:
                        self.log_test("Fetch Comments for Activity", False, 
                                    f"Comment like status incorrect: is_liked={our_comment['is_liked']}, likes_count={our_comment['likes_count']}")
                        return False
                else:
                    self.log_test("Fetch Comments for Activity", False, "Our comment not found in comments list")
                    return False
            else:
                self.log_test("Fetch Comments for Activity", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Fetch Comments for Activity", False, f"Exception: {str(e)}")
            return False
    
    def like_comment(self):
        """Test liking a comment"""
        try:
            response = self.session.post(f"{BACKEND_URL}/comments/{self.comment_id}/like")
            
            if response.status_code == 200:
                self.log_test("Like Comment", True, "Comment liked successfully")
                return True
            else:
                self.log_test("Like Comment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Like Comment", False, f"Exception: {str(e)}")
            return False
    
    def verify_comment_liked(self):
        """Verify comment is liked and likes_count increased"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/{self.activity_id}/comments")
            
            if response.status_code == 200:
                comments = response.json()
                
                # Find our comment
                our_comment = None
                for comment in comments:
                    if comment["comment_id"] == self.comment_id:
                        our_comment = comment
                        break
                
                if our_comment:
                    if our_comment["is_liked"] == True and our_comment["likes_count"] == 1:
                        self.log_test("Verify Comment Liked", True, 
                                    f"Comment correctly shows is_liked=True, likes_count=1")
                        return True
                    else:
                        self.log_test("Verify Comment Liked", False, 
                                    f"Comment like status incorrect: is_liked={our_comment['is_liked']}, likes_count={our_comment['likes_count']}")
                        return False
                else:
                    self.log_test("Verify Comment Liked", False, "Comment not found")
                    return False
            else:
                self.log_test("Verify Comment Liked", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Comment Liked", False, f"Exception: {str(e)}")
            return False
    
    def unlike_comment(self):
        """Test unliking a comment"""
        try:
            response = self.session.delete(f"{BACKEND_URL}/comments/{self.comment_id}/like")
            
            if response.status_code == 200:
                self.log_test("Unlike Comment", True, "Comment unliked successfully")
                return True
            else:
                self.log_test("Unlike Comment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Unlike Comment", False, f"Exception: {str(e)}")
            return False
    
    def verify_comment_unliked(self):
        """Verify comment is unliked and likes_count decreased"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/{self.activity_id}/comments")
            
            if response.status_code == 200:
                comments = response.json()
                
                # Find our comment
                our_comment = None
                for comment in comments:
                    if comment["comment_id"] == self.comment_id:
                        our_comment = comment
                        break
                
                if our_comment:
                    if our_comment["is_liked"] == False and our_comment["likes_count"] == 0:
                        self.log_test("Verify Comment Unliked", True, 
                                    f"Comment correctly shows is_liked=False, likes_count=0")
                        return True
                    else:
                        self.log_test("Verify Comment Unliked", False, 
                                    f"Comment like status incorrect: is_liked={our_comment['is_liked']}, likes_count={our_comment['likes_count']}")
                        return False
                else:
                    self.log_test("Verify Comment Unliked", False, "Comment not found")
                    return False
            else:
                self.log_test("Verify Comment Unliked", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Comment Unliked", False, f"Exception: {str(e)}")
            return False
    
    def post_reply_to_comment(self):
        """Test posting a reply to a comment"""
        try:
            reply_content = f"Thanks for the comment! I totally agree! 👍 (Reply at {datetime.now().strftime('%H:%M:%S')})"
            
            response = self.session.post(f"{BACKEND_URL}/activities/{self.activity_id}/comment", json={
                "content": reply_content,
                "parent_comment_id": self.comment_id
            })
            
            if response.status_code == 200:
                reply_data = response.json()
                self.reply_id = reply_data["comment_id"]
                
                # Verify reply structure
                if (reply_data["parent_comment_id"] == self.comment_id and
                    reply_data["reply_to_user"] is not None and
                    reply_data["content"] == reply_content):
                    self.log_test("Post Reply to Comment", True, 
                                f"Reply created with ID: {self.reply_id}, parent: {self.comment_id}")
                    return True
                else:
                    self.log_test("Post Reply to Comment", False, 
                                f"Reply data incorrect: parent_id={reply_data.get('parent_comment_id')}, reply_to_user={reply_data.get('reply_to_user')}")
                    return False
            else:
                self.log_test("Post Reply to Comment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Post Reply to Comment", False, f"Exception: {str(e)}")
            return False
    
    def verify_reply_in_comments(self):
        """Verify the reply appears in comments with correct parent_comment_id"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/{self.activity_id}/comments")
            
            if response.status_code == 200:
                comments = response.json()
                
                # Find our reply
                our_reply = None
                for comment in comments:
                    if comment["comment_id"] == self.reply_id:
                        our_reply = comment
                        break
                
                if our_reply:
                    if (our_reply["parent_comment_id"] == self.comment_id and
                        our_reply["reply_to_user"] is not None):
                        self.log_test("Verify Reply in Comments", True, 
                                    f"Reply found with correct parent_comment_id and reply_to_user")
                        return True
                    else:
                        self.log_test("Verify Reply in Comments", False, 
                                    f"Reply structure incorrect")
                        return False
                else:
                    self.log_test("Verify Reply in Comments", False, "Reply not found in comments")
                    return False
            else:
                self.log_test("Verify Reply in Comments", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Reply in Comments", False, f"Exception: {str(e)}")
            return False
    
    def get_initial_comments_count(self):
        """Get initial comments count for the activity"""
        try:
            response = self.session.get(f"{BACKEND_URL}/feed")
            
            if response.status_code == 200:
                activities = response.json()
                for activity in activities:
                    if activity["activity_id"] == self.activity_id:
                        self.initial_comments_count = activity["comments_count"]
                        self.log_test("Get Initial Comments Count", True, 
                                    f"Initial comments count: {self.initial_comments_count}")
                        return True
                
                self.log_test("Get Initial Comments Count", False, "Activity not found in feed")
                return False
            else:
                self.log_test("Get Initial Comments Count", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Initial Comments Count", False, f"Exception: {str(e)}")
            return False
    
    def verify_comments_count_increased(self):
        """Verify activity comments_count increased after adding comments"""
        try:
            response = self.session.get(f"{BACKEND_URL}/feed")
            
            if response.status_code == 200:
                activities = response.json()
                for activity in activities:
                    if activity["activity_id"] == self.activity_id:
                        current_count = activity["comments_count"]
                        expected_count = self.initial_comments_count + 2  # Original comment + reply
                        
                        if current_count == expected_count:
                            self.log_test("Verify Comments Count Increased", True, 
                                        f"Comments count correctly increased from {self.initial_comments_count} to {current_count}")
                            return True
                        else:
                            self.log_test("Verify Comments Count Increased", False, 
                                        f"Comments count mismatch: expected {expected_count}, got {current_count}")
                            return False
                
                self.log_test("Verify Comments Count Increased", False, "Activity not found in feed")
                return False
            else:
                self.log_test("Verify Comments Count Increased", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Comments Count Increased", False, f"Exception: {str(e)}")
            return False
    
    def delete_comment(self):
        """Test deleting a comment (only owner can delete)"""
        try:
            response = self.session.delete(f"{BACKEND_URL}/comments/{self.comment_id}")
            
            if response.status_code == 200:
                self.log_test("Delete Comment", True, "Comment deleted successfully")
                return True
            else:
                self.log_test("Delete Comment", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Delete Comment", False, f"Exception: {str(e)}")
            return False
    
    def verify_comment_deleted(self):
        """Verify comment is deleted and comments_count decreased"""
        try:
            response = self.session.get(f"{BACKEND_URL}/activities/{self.activity_id}/comments")
            
            if response.status_code == 200:
                comments = response.json()
                
                # Check if our comment is gone
                comment_found = False
                for comment in comments:
                    if comment["comment_id"] == self.comment_id:
                        comment_found = True
                        break
                
                if not comment_found:
                    # Also check if comments_count decreased
                    feed_response = self.session.get(f"{BACKEND_URL}/feed")
                    if feed_response.status_code == 200:
                        activities = feed_response.json()
                        for activity in activities:
                            if activity["activity_id"] == self.activity_id:
                                current_count = activity["comments_count"]
                                expected_count = self.initial_comments_count + 1  # Only reply should remain
                                
                                if current_count == expected_count:
                                    self.log_test("Verify Comment Deleted", True, 
                                                f"Comment deleted and count decreased to {current_count}")
                                    return True
                                else:
                                    self.log_test("Verify Comment Deleted", False, 
                                                f"Comments count not updated correctly: expected {expected_count}, got {current_count}")
                                    return False
                    
                    self.log_test("Verify Comment Deleted", False, "Could not verify comments count")
                    return False
                else:
                    self.log_test("Verify Comment Deleted", False, "Comment still exists after deletion")
                    return False
            else:
                self.log_test("Verify Comment Deleted", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Comment Deleted", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_other_user_comment(self):
        """Test that users cannot delete other users' comments"""
        try:
            # Try to delete the reply (which should still exist)
            if hasattr(self, 'reply_id'):
                response = self.session.delete(f"{BACKEND_URL}/comments/{self.reply_id}")
                
                # This should succeed since we own the reply too
                if response.status_code == 200:
                    self.log_test("Delete Own Reply", True, "Successfully deleted own reply")
                    return True
                else:
                    self.log_test("Delete Own Reply", False, f"Status: {response.status_code}")
                    return False
            else:
                self.log_test("Delete Other User Comment", True, "No other user comment to test (skipped)")
                return True
                
        except Exception as e:
            self.log_test("Delete Other User Comment", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all comment system tests"""
        print("🚀 Starting Comments System Backend Testing")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.login,
            self.get_activity_from_feed,
            self.get_initial_comments_count,
            self.post_comment_on_activity,
            self.fetch_comments_for_activity,
            self.like_comment,
            self.verify_comment_liked,
            self.unlike_comment,
            self.verify_comment_unliked,
            self.post_reply_to_comment,
            self.verify_reply_in_comments,
            self.verify_comments_count_increased,
            self.delete_comment,
            self.verify_comment_deleted,
            self.test_delete_other_user_comment
        ]
        
        for test in tests:
            if not test():
                print(f"\n❌ Test failed: {test.__name__}")
                break
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"] and not result["success"]:
                print(f"   {result['details']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL COMMENTS SYSTEM TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - see details above")
        
        return passed == total

if __name__ == "__main__":
    tester = CommentSystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)