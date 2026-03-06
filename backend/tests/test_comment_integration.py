"""
Backend Test Suite for WanderMark Comment Integration Feature
Tests the comment CRUD operations and permission system.

Features tested:
- GET /api/visits/{visit_id} returns activity_id and comments_count
- GET /api/activities/{activity_id}/comments - list comments
- POST /api/activities/{activity_id}/comment - create comment/reply
- DELETE /api/comments/{comment_id} - delete own comment
- POST /api/comments/{comment_id}/like - like a comment  
- DELETE /api/comments/{comment_id}/like - unlike a comment
- Comment permission system (everyone/friends/nobody)
"""

import pytest
import requests
import os

# Use public URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://log-removal-pass.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"
TEST_EMAIL_2 = "test2@wandermark.app"
TEST_PASSWORD_2 = "Test1234!"

# Known test data
KNOWN_VISIT_ID = "visit_f1f27ea02b40"
KNOWN_ACTIVITY_ID = "activity_a16d5c11270c"


@pytest.fixture(scope="module")
def user1_session():
    """Session for test user 1"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✓ User 1 logged in successfully")
    else:
        pytest.skip(f"Could not authenticate user 1: {login_response.text}")
    
    return session


@pytest.fixture(scope="module")
def user2_session():
    """Session for test user 2"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL_2,
        "password": TEST_PASSWORD_2
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✓ User 2 logged in successfully")
    else:
        pytest.skip(f"Could not authenticate user 2: {login_response.text}")
    
    return session


class TestVisitDetailsWithActivityId:
    """Tests that GET /api/visits/{visit_id} returns activity_id and comments_count"""
    
    def test_visit_details_returns_activity_id(self, user1_session):
        """GET /api/visits/{visit_id} - verify activity_id field returned"""
        response = user1_session.get(f"{BASE_URL}/api/visits/{KNOWN_VISIT_ID}")
        
        assert response.status_code == 200, f"Get visit details failed: {response.text}"
        data = response.json()
        
        # Verify activity_id is in response
        assert "activity_id" in data, "activity_id field missing from visit details response"
        print(f"✓ Visit details returned activity_id: {data.get('activity_id')}")
        
    def test_visit_details_returns_comments_count(self, user1_session):
        """GET /api/visits/{visit_id} - verify comments_count field returned"""
        response = user1_session.get(f"{BASE_URL}/api/visits/{KNOWN_VISIT_ID}")
        
        assert response.status_code == 200, f"Get visit details failed: {response.text}"
        data = response.json()
        
        # Verify comments_count is in response  
        assert "comments_count" in data, "comments_count field missing from visit details response"
        assert isinstance(data["comments_count"], int), "comments_count should be an integer"
        print(f"✓ Visit details returned comments_count: {data.get('comments_count')}")
        
    def test_visit_details_has_required_fields(self, user1_session):
        """GET /api/visits/{visit_id} - verify all required fields present"""
        response = user1_session.get(f"{BASE_URL}/api/visits/{KNOWN_VISIT_ID}")
        
        assert response.status_code == 200, f"Get visit details failed: {response.text}"
        data = response.json()
        
        # Core visit fields
        assert "visit_id" in data, "visit_id missing"
        assert "user_id" in data, "user_id missing"
        assert "landmark_id" in data, "landmark_id missing"
        
        # Additional fields from lookup
        assert "landmark_name" in data or data.get("landmark_name") is None, "landmark_name check"
        assert "user_name" in data or data.get("user_name") is None, "user_name check"
        
        # New activity-related fields
        assert "activity_id" in data, "activity_id missing"
        assert "comments_count" in data, "comments_count missing"
        
        print(f"✓ Visit details has all required fields including activity_id and comments_count")


class TestGetActivityComments:
    """Tests for GET /api/activities/{activity_id}/comments"""
    
    def test_get_comments_returns_list(self, user1_session):
        """GET /api/activities/{activity_id}/comments - returns list of comments"""
        response = user1_session.get(f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comments")
        
        assert response.status_code == 200, f"Get comments failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Comments response should be a list"
        print(f"✓ GET comments returned {len(data)} comments for activity")
        
    def test_get_comments_for_nonexistent_activity(self, user1_session):
        """GET /api/activities/{activity_id}/comments - nonexistent activity returns empty list"""
        response = user1_session.get(f"{BASE_URL}/api/activities/nonexistent_activity_id/comments")
        
        # Should return 200 with empty list (no activity check in this endpoint)
        # or 404 if activity validation is added
        assert response.status_code in [200, 404], f"Unexpected status: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Should return list"
            print(f"✓ Nonexistent activity returns empty comments list")
        else:
            print(f"✓ Nonexistent activity returns 404")


class TestAddComment:
    """Tests for POST /api/activities/{activity_id}/comment"""
    
    def test_add_comment(self, user1_session):
        """POST /api/activities/{activity_id}/comment - create new comment"""
        response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_integration_test_message"}
        )
        
        assert response.status_code == 200, f"Add comment failed: {response.text}"
        data = response.json()
        
        # Verify comment response structure
        assert "comment_id" in data, "comment_id missing from response"
        assert "content" in data, "content missing from response"
        assert data["content"] == "TEST_comment_integration_test_message"
        assert "user_id" in data, "user_id missing"
        assert "created_at" in data, "created_at missing"
        
        print(f"✓ Created comment: {data['comment_id']}")
        
        # Store for cleanup and further tests
        return data["comment_id"]
        
    def test_add_comment_to_nonexistent_activity(self, user1_session):
        """POST /api/activities/{activity_id}/comment - fails for nonexistent activity"""
        response = user1_session.post(
            f"{BASE_URL}/api/activities/nonexistent_activity/comment",
            json={"content": "Test message"}
        )
        
        assert response.status_code == 404, f"Expected 404 for nonexistent activity: {response.text}"
        print(f"✓ Adding comment to nonexistent activity correctly returns 404")


class TestAddReply:
    """Tests for POST /api/activities/{activity_id}/comment with parent_comment_id"""
    
    def test_add_reply_to_comment(self, user1_session):
        """POST /api/activities/{activity_id}/comment - create reply to existing comment"""
        # First create a parent comment
        parent_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_parent_comment_for_reply"}
        )
        
        assert parent_response.status_code == 200, f"Create parent comment failed: {parent_response.text}"
        parent_comment_id = parent_response.json()["comment_id"]
        print(f"✓ Created parent comment: {parent_comment_id}")
        
        # Now create a reply
        reply_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={
                "content": "TEST_reply_to_parent_comment",
                "parent_comment_id": parent_comment_id
            }
        )
        
        assert reply_response.status_code == 200, f"Create reply failed: {reply_response.text}"
        reply_data = reply_response.json()
        
        assert "comment_id" in reply_data
        assert "parent_comment_id" in reply_data
        assert reply_data["parent_comment_id"] == parent_comment_id
        
        print(f"✓ Created reply: {reply_data['comment_id']} -> parent: {parent_comment_id}")
        
        # Cleanup - delete both comments
        user1_session.delete(f"{BASE_URL}/api/comments/{reply_data['comment_id']}")
        user1_session.delete(f"{BASE_URL}/api/comments/{parent_comment_id}")


class TestDeleteComment:
    """Tests for DELETE /api/comments/{comment_id}"""
    
    def test_delete_own_comment(self, user1_session):
        """DELETE /api/comments/{comment_id} - can delete own comment"""
        # Create a comment to delete
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_to_be_deleted"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        print(f"✓ Created comment to delete: {comment_id}")
        
        # Delete it
        delete_response = user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
        assert delete_response.status_code == 200, f"Delete comment failed: {delete_response.text}"
        print(f"✓ Successfully deleted own comment")
        
    def test_cannot_delete_others_comment(self, user1_session, user2_session):
        """DELETE /api/comments/{comment_id} - cannot delete other user's comment"""
        # User 1 creates a comment
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_user1_comment_cannot_delete"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        print(f"✓ User 1 created comment: {comment_id}")
        
        # User 2 tries to delete it
        delete_response = user2_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
        assert delete_response.status_code == 403, f"Expected 403 when deleting other's comment: {delete_response.text}"
        print(f"✓ User 2 correctly cannot delete User 1's comment (403)")
        
        # Cleanup - User 1 deletes it
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
    def test_delete_nonexistent_comment(self, user1_session):
        """DELETE /api/comments/{comment_id} - returns 404 for nonexistent comment"""
        response = user1_session.delete(f"{BASE_URL}/api/comments/nonexistent_comment_id")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent comment: {response.text}"
        print(f"✓ Delete nonexistent comment correctly returns 404")


class TestLikeComment:
    """Tests for POST /api/comments/{comment_id}/like"""
    
    def test_like_comment(self, user1_session):
        """POST /api/comments/{comment_id}/like - like a comment"""
        # Create a comment to like
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_to_like"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        print(f"✓ Created comment to like: {comment_id}")
        
        # Like it
        like_response = user1_session.post(f"{BASE_URL}/api/comments/{comment_id}/like")
        
        assert like_response.status_code == 200, f"Like comment failed: {like_response.text}"
        print(f"✓ Successfully liked comment")
        
        # Cleanup - unlike and delete
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}/like")
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
    def test_like_comment_twice_fails(self, user1_session):
        """POST /api/comments/{comment_id}/like - cannot like same comment twice"""
        # Create a comment
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_double_like"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        
        # Like it first time
        user1_session.post(f"{BASE_URL}/api/comments/{comment_id}/like")
        
        # Try to like again
        second_like = user1_session.post(f"{BASE_URL}/api/comments/{comment_id}/like")
        
        assert second_like.status_code == 400, f"Expected 400 for double like: {second_like.text}"
        print(f"✓ Double like correctly returns 400")
        
        # Cleanup
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}/like")
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
    def test_like_nonexistent_comment(self, user1_session):
        """POST /api/comments/{comment_id}/like - returns 404 for nonexistent comment"""
        response = user1_session.post(f"{BASE_URL}/api/comments/nonexistent_comment/like")
        
        assert response.status_code == 404, f"Expected 404: {response.text}"
        print(f"✓ Like nonexistent comment correctly returns 404")


class TestUnlikeComment:
    """Tests for DELETE /api/comments/{comment_id}/like"""
    
    def test_unlike_comment(self, user1_session):
        """DELETE /api/comments/{comment_id}/like - unlike a liked comment"""
        # Create and like a comment
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_to_unlike"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        
        user1_session.post(f"{BASE_URL}/api/comments/{comment_id}/like")
        print(f"✓ Liked comment: {comment_id}")
        
        # Unlike it
        unlike_response = user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}/like")
        
        assert unlike_response.status_code == 200, f"Unlike failed: {unlike_response.text}"
        print(f"✓ Successfully unliked comment")
        
        # Cleanup
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        
    def test_unlike_not_liked_comment(self, user1_session):
        """DELETE /api/comments/{comment_id}/like - returns 404 if not liked"""
        # Create a comment (don't like it)
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_comment_not_liked"}
        )
        
        assert create_response.status_code == 200
        comment_id = create_response.json()["comment_id"]
        
        # Try to unlike without liking first
        unlike_response = user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}/like")
        
        assert unlike_response.status_code == 404, f"Expected 404: {unlike_response.text}"
        print(f"✓ Unlike non-liked comment correctly returns 404")
        
        # Cleanup
        user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")


class TestCommentPermissions:
    """Tests for comment permission system (everyone/friends/nobody)"""
    
    def test_check_user_profile_has_comment_permission(self, user1_session):
        """Verify user profile returns comment_permission field"""
        # Get user profile
        response = user1_session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        
        # comment_permission may not be in /auth/me but should be in profile
        # Let's get the user_id and check profile
        user_id = data.get("user_id")
        if user_id:
            profile_response = user1_session.get(f"{BASE_URL}/api/users/{user_id}/profile")
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                assert "comment_permission" in profile_data, "comment_permission missing from profile"
                print(f"✓ User profile has comment_permission: {profile_data.get('comment_permission')}")
            else:
                print(f"⚠ Could not get profile to check comment_permission")


class TestCommentFullFlow:
    """End-to-end test of complete comment workflow"""
    
    def test_complete_comment_flow(self, user1_session, user2_session):
        """Full workflow: create comment -> like -> reply -> get comments -> delete"""
        
        # Step 1: User 1 creates a comment
        create_response = user1_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={"content": "TEST_e2e_comment_flow_main"}
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        comment_id = create_response.json()["comment_id"]
        print(f"✓ Step 1: User 1 created comment: {comment_id}")
        
        # Step 2: User 2 likes the comment
        like_response = user2_session.post(f"{BASE_URL}/api/comments/{comment_id}/like")
        assert like_response.status_code == 200, f"Like failed: {like_response.text}"
        print(f"✓ Step 2: User 2 liked the comment")
        
        # Step 3: User 2 replies to the comment
        reply_response = user2_session.post(
            f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comment",
            json={
                "content": "TEST_e2e_reply_to_main",
                "parent_comment_id": comment_id
            }
        )
        assert reply_response.status_code == 200, f"Reply failed: {reply_response.text}"
        reply_id = reply_response.json()["comment_id"]
        print(f"✓ Step 3: User 2 replied with comment: {reply_id}")
        
        # Step 4: Get all comments for the activity
        get_response = user1_session.get(f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comments")
        assert get_response.status_code == 200, f"Get comments failed: {get_response.text}"
        comments = get_response.json()
        
        # Find our comments
        our_comment_ids = {comment_id, reply_id}
        found_comments = [c for c in comments if c["comment_id"] in our_comment_ids]
        assert len(found_comments) >= 2, "Should find both created comments"
        print(f"✓ Step 4: Retrieved {len(comments)} comments, found our 2 test comments")
        
        # Verify the main comment has likes_count
        main_comment = next((c for c in comments if c["comment_id"] == comment_id), None)
        if main_comment:
            assert main_comment.get("likes_count", 0) >= 1, "Main comment should have at least 1 like"
            print(f"✓ Main comment has {main_comment.get('likes_count')} likes")
        
        # Step 5: User 2 unlikes
        unlike_response = user2_session.delete(f"{BASE_URL}/api/comments/{comment_id}/like")
        assert unlike_response.status_code == 200, f"Unlike failed: {unlike_response.text}"
        print(f"✓ Step 5: User 2 unliked the comment")
        
        # Step 6: Cleanup - delete both comments (by their owners)
        # User 2 deletes their reply
        delete_reply = user2_session.delete(f"{BASE_URL}/api/comments/{reply_id}")
        assert delete_reply.status_code == 200, f"Delete reply failed: {delete_reply.text}"
        print(f"✓ Step 6a: User 2 deleted their reply")
        
        # User 1 deletes their comment
        delete_main = user1_session.delete(f"{BASE_URL}/api/comments/{comment_id}")
        assert delete_main.status_code == 200, f"Delete main failed: {delete_main.text}"
        print(f"✓ Step 6b: User 1 deleted their comment")
        
        print(f"✓ Complete comment flow test passed!")


class TestCleanup:
    """Cleanup any remaining TEST_ prefixed comments"""
    
    def test_cleanup_test_comments(self, user1_session):
        """Remove any TEST_ prefixed comments created during testing"""
        # Get all comments for the activity
        response = user1_session.get(f"{BASE_URL}/api/activities/{KNOWN_ACTIVITY_ID}/comments")
        
        if response.status_code == 200:
            comments = response.json()
            test_comments = [c for c in comments if c.get("content", "").startswith("TEST_")]
            
            for comment in test_comments:
                delete_response = user1_session.delete(f"{BASE_URL}/api/comments/{comment['comment_id']}")
                if delete_response.status_code == 200:
                    print(f"✓ Cleaned up test comment: {comment['comment_id']}")
                # 403 means it belongs to another user, skip
                
            print(f"✓ Cleanup complete - removed {len([c for c in test_comments])} test comments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
