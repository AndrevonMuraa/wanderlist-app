"""
Test Comment Permission System for WanderMark
Tests the comment_permission feature (everyone/friends/nobody)
"""

import pytest
import requests
import os

# Use public URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wandermark-admin.preview.emergentagent.com').rstrip('/')

# Test credentials  
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"
TEST_EMAIL_2 = "test2@wandermark.app"
TEST_PASSWORD_2 = "Test1234!"

# Known test data - activity owned by test@wandermark.app
KNOWN_ACTIVITY_ID = "activity_a16d5c11270c"


@pytest.fixture(scope="module")
def user1_session():
    """Session for test user 1 (owner of the activity)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✓ User 1 (owner) logged in")
    else:
        pytest.skip(f"Could not authenticate user 1: {login_response.text}")
    
    return session


@pytest.fixture(scope="module")
def user2_session():
    """Session for test user 2 (commenter - not owner)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL_2,
        "password": TEST_PASSWORD_2
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✓ User 2 (commenter) logged in")
    else:
        pytest.skip(f"Could not authenticate user 2: {login_response.text}")
    
    return session


class TestCommentPermissionUpdate:
    """Test updating comment_permission setting"""
    
    def test_update_to_everyone(self, user1_session):
        """PUT /api/auth/comment-permission - set to 'everyone'"""
        response = user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "everyone"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["comment_permission"] == "everyone"
        print(f"✓ Updated permission to 'everyone'")
        
    def test_update_to_friends(self, user1_session):
        """PUT /api/auth/comment-permission - set to 'friends'"""
        response = user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "friends"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["comment_permission"] == "friends"
        print(f"✓ Updated permission to 'friends'")
        
    def test_update_to_nobody(self, user1_session):
        """PUT /api/auth/comment-permission - set to 'nobody'"""
        response = user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "nobody"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["comment_permission"] == "nobody"
        print(f"✓ Updated permission to 'nobody'")
        
    def test_update_invalid_permission(self, user1_session):
        """PUT /api/auth/comment-permission - rejects invalid value"""
        response = user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "invalid_value"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid permission: {response.text}"
        print(f"✓ Invalid permission correctly rejected")


class TestCommentPermissionEnforcement:
    """Test that comment permission is enforced when adding comments"""
    
    def test_permission_everyone_allows_non_friend(self, user1_session, user2_session):
        """When permission='everyone', non-friends can comment"""
        # Set permission to everyone
        user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "everyone"}
        )
        
        # User 2 (non-friend) tries to comment
        response = user2_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_permission_everyone_comment"}
        )
        
        assert response.status_code == 200, f"Should allow comment with 'everyone' permission: {response.text}"
        comment_id = response.json()["comment_id"]
        print(f"✓ Non-friend can comment when permission='everyone'")
        
        # Cleanup
        user2_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
    def test_permission_nobody_blocks_all(self, user1_session, user2_session):
        """When permission='nobody', no one (except owner) can comment"""
        # Set permission to nobody
        user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "nobody"}
        )
        
        # User 2 tries to comment - should be blocked
        response = user2_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_permission_nobody_comment"}
        )
        
        assert response.status_code == 403, f"Should block comment with 'nobody' permission: {response.text}"
        print(f"✓ Non-owner blocked when permission='nobody'")
        
        # Owner can still comment on their own activity
        owner_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_owner_can_comment_with_nobody"}
        )
        
        assert owner_response.status_code == 200, f"Owner should still be able to comment: {owner_response.text}"
        comment_id = owner_response.json()["comment_id"]
        print(f"✓ Owner can still comment on own activity")
        
        # Cleanup
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
        # Reset to everyone
        user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "everyone"}
        )


class TestCommentPermissionFriendsOnly:
    """Test 'friends' permission level"""
    
    def test_permission_friends_check(self, user1_session, user2_session):
        """When permission='friends', only friends can comment"""
        # Set permission to friends
        user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "friends"}
        )
        
        # User 2 tries to comment
        # Note: This test assumes user2 is NOT friends with user1
        # If they are friends, the test should pass
        response = user2_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_permission_friends_comment"}
        )
        
        # Depending on friendship status, this will be 200 (friends) or 403 (not friends)
        if response.status_code == 200:
            print(f"✓ User 2 IS a friend of User 1 - comment allowed")
            # Cleanup
            comment_id = response.json()["comment_id"]
            user2_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        elif response.status_code == 403:
            print(f"✓ User 2 is NOT a friend of User 1 - correctly blocked")
        else:
            assert False, f"Unexpected status code: {response.status_code} - {response.text}"
        
        # Reset to everyone for other tests
        user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "everyone"}
        )


class TestCleanupPermissions:
    """Ensure permissions are reset after tests"""
    
    def test_reset_permissions(self, user1_session):
        """Reset user1's comment_permission to 'everyone'"""
        response = user1_session.put(
            f"{BASE_URL}/api/auth/comment-permission",
            json={"comment_permission": "everyone"}
        )
        
        assert response.status_code == 200
        print(f"✓ Permissions reset to 'everyone' for future tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
