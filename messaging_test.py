#!/usr/bin/env python3
"""
Comprehensive Backend Testing for WanderList Messaging Feature
Tests messaging endpoints, friend system, and tier restrictions
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://travelmap-12.preview.emergentagent.com/api"

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
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")

class MessagingTester:
    def __init__(self):
        self.user1_token = None
        self.user2_token = None
        self.user1_id = None
        self.user2_id = None
        self.friendship_id = None
        self.test_results = []
        
    def add_result(self, test_name, success, message=""):
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
        if success:
            print_success(f"{test_name}: {message}")
        else:
            print_error(f"{test_name}: {message}")

    def setup_users(self):
        """Setup two test users for messaging tests"""
        print_header("SETTING UP TEST USERS")
        
        # User 1: mobile@test.com (existing user)
        print_info("Logging in User 1 (mobile@test.com)...")
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "email": "mobile@test.com",
            "password": "test123"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.user1_token = data["access_token"]
            self.user1_id = data["user"]["user_id"]
            print_success(f"User 1 logged in successfully. ID: {self.user1_id}")
            print_info(f"User 1 subscription tier: {data['user'].get('subscription_tier', 'unknown')}")
        else:
            print_error(f"Failed to login User 1: {response.text}")
            return False
            
        # User 2: Create or login second test user
        print_info("Setting up User 2 (travel@test.com)...")
        
        # Try to register User 2
        register_response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "email": "travel@test.com",
            "username": "traveler2",
            "password": "test123",
            "name": "Travel Buddy"
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            self.user2_token = data["access_token"]
            self.user2_id = data["user"]["user_id"]
            print_success(f"User 2 registered successfully. ID: {self.user2_id}")
        else:
            # User might already exist, try login
            login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": "travel@test.com",
                "password": "test123"
            })
            
            if login_response.status_code == 200:
                data = login_response.json()
                self.user2_token = data["access_token"]
                self.user2_id = data["user"]["user_id"]
                print_success(f"User 2 logged in successfully. ID: {self.user2_id}")
            else:
                print_error(f"Failed to setup User 2: {login_response.text}")
                return False
        
        return True

    def check_user_tiers(self):
        """Check and upgrade users to Basic tier if needed for messaging"""
        print_header("CHECKING USER SUBSCRIPTION TIERS")
        
        # Check User 1 tier
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        response1 = requests.get(f"{BACKEND_URL}/auth/me", headers=headers1)
        
        if response1.status_code == 200:
            user1_data = response1.json()
            tier1 = user1_data.get("subscription_tier", "free")
            print_info(f"User 1 current tier: {tier1}")
            
            if tier1 == "free":
                print_warning("User 1 is on free tier - messaging will be blocked")
                # Upgrade User 1 to Basic for testing
                upgrade_response = requests.put(f"{BACKEND_URL}/admin/users/{self.user1_id}/tier", 
                                              json={"tier": "basic"}, headers=headers1)
                if upgrade_response.status_code == 200:
                    print_success("User 1 upgraded to Basic tier")
                else:
                    print_warning(f"Could not upgrade User 1: {upgrade_response.text}")
        
        # Check User 2 tier
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        response2 = requests.get(f"{BACKEND_URL}/auth/me", headers=headers2)
        
        if response2.status_code == 200:
            user2_data = response2.json()
            tier2 = user2_data.get("subscription_tier", "free")
            print_info(f"User 2 current tier: {tier2}")
            
            if tier2 == "free":
                print_warning("User 2 is on free tier - messaging will be blocked")
                # Upgrade User 2 to Basic for testing
                upgrade_response = requests.put(f"{BACKEND_URL}/admin/users/{self.user2_id}/tier", 
                                              json={"tier": "basic"}, headers=headers2)
                if upgrade_response.status_code == 200:
                    print_success("User 2 upgraded to Basic tier")
                else:
                    print_warning(f"Could not upgrade User 2: {upgrade_response.text}")

    def test_friend_setup(self):
        """Test friend request and acceptance flow"""
        print_header("TESTING FRIEND SETUP")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        
        # Step 1: User 1 sends friend request to User 2
        print_info("Step 1: User 1 sending friend request to User 2...")
        response = requests.post(f"{BACKEND_URL}/friends/request", 
                               json={"friend_email": "travel@test.com"}, 
                               headers=headers1)
        
        if response.status_code == 200:
            self.add_result("Friend Request Sent", True, "User 1 successfully sent friend request to User 2")
        else:
            self.add_result("Friend Request Sent", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # Step 2: User 2 checks pending requests
        print_info("Step 2: User 2 checking pending friend requests...")
        response = requests.get(f"{BACKEND_URL}/friends/pending", headers=headers2)
        
        if response.status_code == 200:
            pending_requests = response.json()
            if pending_requests:
                self.friendship_id = pending_requests[0]["friendship_id"]
                self.add_result("Pending Requests Retrieved", True, f"Found {len(pending_requests)} pending request(s)")
            else:
                self.add_result("Pending Requests Retrieved", False, "No pending requests found")
                return False
        else:
            self.add_result("Pending Requests Retrieved", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # Step 3: User 2 accepts friend request
        print_info("Step 3: User 2 accepting friend request...")
        response = requests.post(f"{BACKEND_URL}/friends/{self.friendship_id}/accept", headers=headers2)
        
        if response.status_code == 200:
            self.add_result("Friend Request Accepted", True, "User 2 successfully accepted friend request")
        else:
            self.add_result("Friend Request Accepted", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        # Step 4: Verify friendship is established
        print_info("Step 4: Verifying friendship is established...")
        response = requests.get(f"{BACKEND_URL}/friends", headers=headers1)
        
        if response.status_code == 200:
            friends = response.json()
            friend_found = any(friend["user_id"] == self.user2_id for friend in friends)
            if friend_found:
                self.add_result("Friendship Verified", True, "Users are now friends")
                return True
            else:
                self.add_result("Friendship Verified", False, "Friendship not found in friends list")
                return False
        else:
            self.add_result("Friendship Verified", False, f"Status: {response.status_code}, Response: {response.text}")
            return False

    def test_messaging_flow(self):
        """Test the complete messaging flow"""
        print_header("TESTING MESSAGING FLOW")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        
        messages_to_send = [
            (self.user1_token, self.user2_id, "Hey! How's your travel journey going?", "User 1 → User 2"),
            (self.user2_token, self.user1_id, "Amazing! Just visited the Eiffel Tower!", "User 2 → User 1"),
            (self.user1_token, self.user2_id, "That's awesome! I'm planning to go there next month.", "User 1 → User 2")
        ]
        
        sent_messages = []
        
        # Send messages
        for i, (token, receiver_id, content, description) in enumerate(messages_to_send, 1):
            print_info(f"Sending message {i}: {description}")
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.post(f"{BACKEND_URL}/messages", 
                                   json={"receiver_id": receiver_id, "content": content}, 
                                   headers=headers)
            
            if response.status_code == 200:
                message_data = response.json()
                sent_messages.append(message_data)
                self.add_result(f"Message {i} Sent", True, f"'{content[:30]}...' sent successfully")
                
                # Verify message structure
                required_fields = ["message_id", "sender_id", "receiver_id", "content", "created_at", "read"]
                missing_fields = [field for field in required_fields if field not in message_data]
                
                if not missing_fields:
                    self.add_result(f"Message {i} Structure", True, "All required fields present")
                else:
                    self.add_result(f"Message {i} Structure", False, f"Missing fields: {missing_fields}")
                
                # Verify content and IDs
                if message_data["content"] == content:
                    self.add_result(f"Message {i} Content", True, "Content matches sent message")
                else:
                    self.add_result(f"Message {i} Content", False, f"Content mismatch: expected '{content}', got '{message_data['content']}'")
                
                if message_data["receiver_id"] == receiver_id:
                    self.add_result(f"Message {i} Receiver ID", True, "Receiver ID correct")
                else:
                    self.add_result(f"Message {i} Receiver ID", False, f"Receiver ID mismatch")
                    
            else:
                self.add_result(f"Message {i} Sent", False, f"Status: {response.status_code}, Response: {response.text}")
        
        return sent_messages

    def test_message_retrieval(self, sent_messages):
        """Test message retrieval and ordering"""
        print_header("TESTING MESSAGE RETRIEVAL")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        
        # User 1 fetches conversation with User 2
        print_info("User 1 fetching conversation with User 2...")
        response = requests.get(f"{BACKEND_URL}/messages/{self.user2_id}", headers=headers1)
        
        if response.status_code == 200:
            messages = response.json()
            self.add_result("Message Retrieval", True, f"Retrieved {len(messages)} messages")
            
            # Verify message count
            if len(messages) == 3:
                self.add_result("Message Count", True, "All 3 messages retrieved")
            else:
                self.add_result("Message Count", False, f"Expected 3 messages, got {len(messages)}")
            
            # Verify chronological order
            if len(messages) >= 2:
                timestamps = [datetime.fromisoformat(msg["created_at"].replace('Z', '+00:00')) for msg in messages]
                is_chronological = all(timestamps[i] <= timestamps[i+1] for i in range(len(timestamps)-1))
                
                if is_chronological:
                    self.add_result("Message Ordering", True, "Messages in chronological order")
                else:
                    self.add_result("Message Ordering", False, "Messages not in chronological order")
            
            # Verify message content matches
            expected_contents = [
                "Hey! How's your travel journey going?",
                "Amazing! Just visited the Eiffel Tower!",
                "That's awesome! I'm planning to go there next month."
            ]
            
            retrieved_contents = [msg["content"] for msg in messages]
            
            if retrieved_contents == expected_contents:
                self.add_result("Message Content Match", True, "All message contents match")
            else:
                self.add_result("Message Content Match", False, f"Content mismatch. Expected: {expected_contents}, Got: {retrieved_contents}")
            
            # Verify timestamps exist
            all_have_timestamps = all("created_at" in msg and msg["created_at"] for msg in messages)
            if all_have_timestamps:
                self.add_result("Message Timestamps", True, "All messages have timestamps")
            else:
                self.add_result("Message Timestamps", False, "Some messages missing timestamps")
                
        else:
            self.add_result("Message Retrieval", False, f"Status: {response.status_code}, Response: {response.text}")
        
        # User 2 also fetches conversation (should see same messages)
        print_info("User 2 fetching conversation with User 1...")
        response = requests.get(f"{BACKEND_URL}/messages/{self.user1_id}", headers=headers2)
        
        if response.status_code == 200:
            messages2 = response.json()
            if len(messages2) == len(messages):
                self.add_result("Bidirectional Retrieval", True, "Both users see same conversation")
            else:
                self.add_result("Bidirectional Retrieval", False, f"User 1 sees {len(messages)} messages, User 2 sees {len(messages2)}")
        else:
            self.add_result("Bidirectional Retrieval", False, f"User 2 retrieval failed: {response.text}")

    def test_edge_cases(self):
        """Test edge cases and error conditions"""
        print_header("TESTING EDGE CASES")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        
        # Test 1: Empty message
        print_info("Testing empty message...")
        response = requests.post(f"{BACKEND_URL}/messages", 
                               json={"receiver_id": self.user2_id, "content": ""}, 
                               headers=headers1)
        
        if response.status_code != 200:
            self.add_result("Empty Message Rejection", True, f"Empty message properly rejected (Status: {response.status_code})")
        else:
            self.add_result("Empty Message Rejection", False, "Empty message was accepted (should be rejected)")
        
        # Test 2: Very long message (500+ chars)
        print_info("Testing very long message...")
        long_message = "A" * 550  # 550 characters
        response = requests.post(f"{BACKEND_URL}/messages", 
                               json={"receiver_id": self.user2_id, "content": long_message}, 
                               headers=headers1)
        
        if response.status_code == 200:
            self.add_result("Long Message Handling", True, "Long message (550 chars) accepted")
        else:
            self.add_result("Long Message Handling", False, f"Long message rejected: {response.text}")
        
        # Test 3: Create a third user who is not a friend
        print_info("Creating third user for non-friend messaging test...")
        register_response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "email": "stranger@test.com",
            "username": "stranger",
            "password": "test123",
            "name": "Stranger User"
        })
        
        if register_response.status_code == 200:
            stranger_data = register_response.json()
            stranger_id = stranger_data["user"]["user_id"]
            
            # Test messaging non-friend
            print_info("Testing messaging non-friend...")
            response = requests.post(f"{BACKEND_URL}/messages", 
                                   json={"receiver_id": stranger_id, "content": "Hello stranger!"}, 
                                   headers=headers1)
            
            if response.status_code == 403:
                self.add_result("Non-Friend Messaging Block", True, "Non-friend messaging properly blocked with 403")
            else:
                self.add_result("Non-Friend Messaging Block", False, f"Expected 403, got {response.status_code}: {response.text}")
        else:
            print_warning("Could not create third user for non-friend test")
        
        # Test 4: Test free tier messaging restriction
        print_info("Testing free tier messaging restriction...")
        
        # Create a free tier user
        free_user_response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "email": "freeuser@test.com",
            "username": "freeuser",
            "password": "test123",
            "name": "Free User"
        })
        
        if free_user_response.status_code == 200:
            free_user_data = free_user_response.json()
            free_user_token = free_user_data["access_token"]
            free_headers = {"Authorization": f"Bearer {free_user_token}"}
            
            # Try to send message as free user
            response = requests.post(f"{BACKEND_URL}/messages", 
                                   json={"receiver_id": self.user2_id, "content": "Free user message"}, 
                                   headers=free_headers)
            
            if response.status_code == 403:
                self.add_result("Free Tier Messaging Block", True, "Free tier messaging properly blocked with 403")
            else:
                self.add_result("Free Tier Messaging Block", False, f"Expected 403, got {response.status_code}: {response.text}")
        else:
            print_warning("Could not create free user for tier restriction test")

    def print_summary(self):
        """Print test summary"""
        print_header("TEST SUMMARY")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"\n{Colors.BOLD}Total Tests: {total_tests}{Colors.END}")
        print(f"{Colors.GREEN}Passed: {passed_tests}{Colors.END}")
        print(f"{Colors.RED}Failed: {failed_tests}{Colors.END}")
        print(f"{Colors.BLUE}Success Rate: {(passed_tests/total_tests*100):.1f}%{Colors.END}")
        
        if failed_tests > 0:
            print(f"\n{Colors.RED}{Colors.BOLD}FAILED TESTS:{Colors.END}")
            for result in self.test_results:
                if not result["success"]:
                    print(f"{Colors.RED}❌ {result['test']}: {result['message']}{Colors.END}")
        
        print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
        
        return failed_tests == 0

    def run_all_tests(self):
        """Run all messaging tests"""
        print_header("WANDERLIST MESSAGING FEATURE TESTING")
        print_info(f"Backend URL: {BACKEND_URL}")
        
        # Setup users
        if not self.setup_users():
            print_error("Failed to setup users. Aborting tests.")
            return False
        
        # Check and upgrade user tiers
        self.check_user_tiers()
        
        # Test friend setup
        if not self.test_friend_setup():
            print_error("Friend setup failed. Aborting messaging tests.")
            return False
        
        # Test messaging flow
        sent_messages = self.test_messaging_flow()
        
        # Test message retrieval
        if sent_messages:
            self.test_message_retrieval(sent_messages)
        
        # Test edge cases
        self.test_edge_cases()
        
        # Print summary
        return self.print_summary()

def main():
    tester = MessagingTester()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED! Messaging feature is working correctly.{Colors.END}")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ SOME TESTS FAILED! Check the summary above for details.{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()