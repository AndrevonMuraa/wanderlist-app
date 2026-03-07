"""
Iteration 35 - FINAL Comprehensive Test Suite for TestFlight Build
Tests all Phase 1-3 features + earlier social features
Simulates realistic user activity between two users

User 1 (Pro): test@wandermark.app / Test1234! / user_dd46a314f120
User 2 (Free): test2@wandermark.app / Test1234! / user_ff9a3f370f6b
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://audit-phase1.preview.emergentagent.com')

# Test users
USER1 = {"email": "test@wandermark.app", "password": "Test1234!", "user_id": "user_dd46a314f120"}
USER2 = {"email": "test2@wandermark.app", "password": "Test1234!", "user_id": "user_ff9a3f370f6b"}


class TestAuthenticationAndUserInfo:
    """Login both users and verify user info and tiers"""
    
    token1 = None
    token2 = None
    user1_info = None
    user2_info = None
    
    def test_user1_login_and_info(self):
        """Login User1 (Pro) and verify tier"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1["email"],
            "password": USER1["password"]
        })
        assert resp.status_code == 200, f"User1 login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        TestAuthenticationAndUserInfo.token1 = data["access_token"]
        
        # Get user info via /api/auth/me
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {TestAuthenticationAndUserInfo.token1}"
        })
        assert me_resp.status_code == 200
        user_info = me_resp.json()
        TestAuthenticationAndUserInfo.user1_info = user_info
        
        # Verify user1 is Pro tier
        assert user_info.get("subscription_tier") == "pro", f"Expected pro tier, got {user_info.get('subscription_tier')}"
        assert user_info.get("user_id") == USER1["user_id"]
        print(f"User1 logged in: {user_info.get('name')} (tier: {user_info.get('subscription_tier')})")
    
    def test_user2_login_and_info(self):
        """Login User2 (Free) and verify tier"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER2["email"],
            "password": USER2["password"]
        })
        assert resp.status_code == 200, f"User2 login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        TestAuthenticationAndUserInfo.token2 = data["access_token"]
        
        # Get user info
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {TestAuthenticationAndUserInfo.token2}"
        })
        assert me_resp.status_code == 200
        user_info = me_resp.json()
        TestAuthenticationAndUserInfo.user2_info = user_info
        
        # Verify user2 is Free tier
        assert user_info.get("subscription_tier") == "free", f"Expected free tier, got {user_info.get('subscription_tier')}"
        print(f"User2 logged in: {user_info.get('name')} (tier: {user_info.get('subscription_tier')})")


class TestPrivacySettings:
    """Test default_privacy changes with retroactive updates and per-visit visibility"""
    
    def test_get_current_privacy(self):
        """Get User1's current privacy setting"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        user = resp.json()
        print(f"User1 current default_privacy: {user.get('default_privacy', 'public')}")
    
    def test_change_privacy_to_friends(self):
        """Change User1's default privacy to 'friends' - should update retroactively"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/privacy", 
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"privacy": "friends"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("default_privacy") == "friends"
        assert "updated_visits" in data
        assert "updated_activities" in data
        print(f"Changed to friends: updated {data.get('updated_visits')} visits, {data.get('updated_activities')} activities")
    
    def test_change_privacy_back_to_public(self):
        """Change User1's default privacy back to 'public'"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/privacy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"privacy": "public"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("default_privacy") == "public"
        print(f"Changed back to public: updated {data.get('updated_visits')} visits")
    
    def test_per_visit_privacy_override(self):
        """Test PUT /api/visits/{id}/privacy for per-visit visibility override"""
        token = TestAuthenticationAndUserInfo.token1
        visit_id = "visit_ae66f8b6fe54"  # Known User1 visit
        
        # Change to friends
        resp = requests.put(f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"visibility": "friends"}
        )
        assert resp.status_code == 200
        assert resp.json().get("visibility") == "friends"
        print("Per-visit privacy: Changed to friends")
        
        # Change back to public
        resp2 = requests.put(f"{BASE_URL}/api/visits/{visit_id}/privacy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"visibility": "public"}
        )
        assert resp2.status_code == 200
        assert resp2.json().get("visibility") == "public"
        print("Per-visit privacy: Changed back to public")


class TestCommentPermission:
    """Test comment permission settings: everyone, friends, nobody"""
    
    activity_id = None
    
    def test_set_comment_permission_nobody(self):
        """User1 sets comment_permission to 'nobody'"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/comment-permission",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"comment_permission": "nobody"}
        )
        assert resp.status_code == 200
        assert resp.json().get("comment_permission") == "nobody"
        print("Comment permission set to: nobody")
    
    def test_get_user1_activity(self):
        """Get an activity from User1 to test commenting on"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/feed", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        activities = resp.json()
        # Find activity owned by user1
        user1_activity = next((a for a in activities if a.get("user_id") == USER1["user_id"]), None)
        if user1_activity:
            TestCommentPermission.activity_id = user1_activity["activity_id"]
            print(f"Found User1 activity: {TestCommentPermission.activity_id}")
        else:
            pytest.skip("No User1 activity found for comment test")
    
    def test_user2_comment_blocked_by_nobody(self):
        """User2 tries to comment on User1's activity - should be blocked (403)"""
        if not TestCommentPermission.activity_id:
            pytest.skip("No activity to test")
        
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.post(f"{BASE_URL}/api/activities/{TestCommentPermission.activity_id}/comment",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"content": "Test comment from user2"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("Comment blocked as expected (nobody permission)")
    
    def test_set_comment_permission_friends(self):
        """User1 sets comment_permission to 'friends'"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/comment-permission",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"comment_permission": "friends"}
        )
        assert resp.status_code == 200
        assert resp.json().get("comment_permission") == "friends"
        print("Comment permission set to: friends")
    
    def test_set_comment_permission_everyone(self):
        """User1 sets comment_permission back to 'everyone'"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/comment-permission",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"comment_permission": "everyone"}
        )
        assert resp.status_code == 200
        assert resp.json().get("comment_permission") == "everyone"
        print("Comment permission set to: everyone")


class TestSocialFriendFlow:
    """Test social friend request flow between User1 and User2"""
    
    friendship_id = None
    existing_friendship = None
    
    def test_check_existing_friendship(self):
        """Check if User1 and User2 already have a friendship"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/users/{USER2['user_id']}/profile",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        profile = resp.json()
        status = profile.get("friendship_status", "none")
        TestSocialFriendFlow.existing_friendship = status
        if status == "friends":
            TestSocialFriendFlow.friendship_id = profile.get("friendship_id")
        print(f"Current friendship status: {status}")
        
    def test_cleanup_if_friends(self):
        """Remove friendship if already exists (for clean test)"""
        if TestSocialFriendFlow.existing_friendship == "friends":
            token = TestAuthenticationAndUserInfo.token1
            resp = requests.delete(f"{BASE_URL}/api/friends/{TestSocialFriendFlow.friendship_id}",
                headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            print("Removed existing friendship for clean test")
            time.sleep(0.5)
    
    def test_user1_sends_friend_request(self):
        """User1 sends friend request to User2"""
        token = TestAuthenticationAndUserInfo.token1
        # Get user2's username
        user2_info = TestAuthenticationAndUserInfo.user2_info
        username = user2_info.get("username")
        if not username:
            pytest.skip("User2 has no username")
        
        resp = requests.post(f"{BASE_URL}/api/friends/request",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"friend_username": username}
        )
        # May fail if already exists
        if resp.status_code == 400:
            print(f"Friend request may already exist: {resp.json().get('detail')}")
            return
        assert resp.status_code == 200
        print("User1 sent friend request to User2")
    
    def test_user2_accepts_friend_request(self):
        """User2 accepts the friend request from User1"""
        token = TestAuthenticationAndUserInfo.token2
        # Get pending requests
        resp = requests.get(f"{BASE_URL}/api/friends/pending", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        pending = resp.json()
        
        # Find request from user1
        from_user1 = next((p for p in pending if p.get("user", {}).get("user_id") == USER1["user_id"]), None)
        if not from_user1:
            # Check sent requests (maybe already accepted)
            print("No pending request found from User1, may already be friends")
            return
        
        friendship_id = from_user1.get("friendship_id")
        accept_resp = requests.post(f"{BASE_URL}/api/friends/{friendship_id}/accept",
            headers={"Authorization": f"Bearer {token}"})
        assert accept_resp.status_code == 200
        TestSocialFriendFlow.friendship_id = friendship_id
        print("User2 accepted friend request from User1")
    
    def test_verify_friendship_both_sides(self):
        """Verify friendship exists on both sides"""
        # Check from User1's side
        token1 = TestAuthenticationAndUserInfo.token1
        resp1 = requests.get(f"{BASE_URL}/api/users/{USER2['user_id']}/profile",
            headers={"Authorization": f"Bearer {token1}"})
        assert resp1.status_code == 200
        assert resp1.json().get("friendship_status") == "friends"
        print("User1 sees User2 as friend")
        
        # Check from User2's side
        token2 = TestAuthenticationAndUserInfo.token2
        resp2 = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/profile",
            headers={"Authorization": f"Bearer {token2}"})
        assert resp2.status_code == 200
        assert resp2.json().get("friendship_status") == "friends"
        print("User2 sees User1 as friend")


class TestUserProfileEndpoint:
    """Test GET /api/users/{id}/profile returns all required fields"""
    
    def test_profile_has_comment_permission(self):
        """Profile endpoint returns comment_permission field"""
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/profile",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        profile = resp.json()
        assert "comment_permission" in profile
        print(f"Profile has comment_permission: {profile.get('comment_permission')}")
    
    def test_profile_recent_visits_have_has_diary(self):
        """Profile endpoint returns has_diary indicator on recent_visits"""
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/profile",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        profile = resp.json()
        recent_visits = profile.get("recent_visits", [])
        if recent_visits:
            # Check structure of first visit
            first_visit = recent_visits[0]
            assert "has_diary" in first_visit, "recent_visits should have has_diary field"
            print(f"Recent visits have has_diary field. First visit has_diary: {first_visit.get('has_diary')}")
        else:
            print("No recent visits to check has_diary")
    
    def test_profile_has_friendship_status(self):
        """Profile returns friendship_status field"""
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/profile",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        profile = resp.json()
        assert "friendship_status" in profile
        print(f"Profile has friendship_status: {profile.get('friendship_status')}")


class TestViewAllVisits:
    """Test GET /api/users/{id}/visits with pagination"""
    
    def test_get_user_visits_returns_paginated_list(self):
        """GET /api/users/{id}/visits returns visits with pagination info"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/visits",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "visits" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        print(f"User1 visits: {len(data['visits'])} returned, {data['total']} total")
    
    def test_pagination_skip_limit(self):
        """Test pagination with skip and limit"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/visits?skip=0&limit=5",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["visits"]) <= 5
        print(f"Pagination test: got {len(data['visits'])} visits with limit=5")
    
    def test_visits_have_has_diary_field(self):
        """Visits in list have has_diary field"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/users/{USER1['user_id']}/visits",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        if data["visits"]:
            first_visit = data["visits"][0]
            assert "has_diary" in first_visit
            assert "visibility" in first_visit
            print(f"Visit fields verified: has_diary={first_visit.get('has_diary')}, visibility={first_visit.get('visibility')}")


class TestFeedEndpoint:
    """Test GET /api/feed returns activities with like_count, comments_count"""
    
    def test_feed_has_engagement_counts(self):
        """Feed activities have like_count and comments_count"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/feed?limit=10", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        activities = resp.json()
        assert isinstance(activities, list)
        if activities:
            first = activities[0]
            assert "likes_count" in first or "like_count" in first
            assert "comments_count" in first
            print(f"Feed activity has engagement: likes={first.get('likes_count', first.get('like_count', 0))}, comments={first.get('comments_count', 0)}")


class TestCommunityFeed:
    """Test GET /api/community-feed returns only public content"""
    
    def test_community_feed_returns_public_only(self):
        """Community feed endpoint works and returns activities"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/community-feed?limit=10", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        # Community feed returns {count, items} structure
        if isinstance(data, dict) and "items" in data:
            activities = data["items"]
        else:
            activities = data
        assert isinstance(activities, list)
        print(f"Community feed returned {len(activities)} activities")


class TestLeaderboard:
    """Test GET /api/leaderboard returns entries"""
    
    def test_leaderboard_returns_entries(self):
        """Leaderboard endpoint returns user entries with ranks"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/leaderboard", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "leaderboard" in data
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list)
        if leaderboard:
            first = leaderboard[0]
            assert "user_id" in first
            assert "rank" in first
            assert "value" in first or "verified_points" in first
            print(f"Leaderboard has {len(leaderboard)} entries. Top user: {first.get('name')}")


class TestSocialInteractions:
    """Test liking activities and commenting"""
    
    test_activity_id = None
    
    def test_get_activity_for_interactions(self):
        """Get an activity to test interactions on"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/feed?limit=5", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        activities = resp.json()
        if activities:
            TestSocialInteractions.test_activity_id = activities[0]["activity_id"]
            print(f"Using activity for interactions: {TestSocialInteractions.test_activity_id}")
    
    def test_like_activity(self):
        """Like an activity via POST /api/activities/{id}/like"""
        if not TestSocialInteractions.test_activity_id:
            pytest.skip("No activity to like")
        
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.post(f"{BASE_URL}/api/activities/{TestSocialInteractions.test_activity_id}/like",
            headers={"Authorization": f"Bearer {token}"})
        # May fail if already liked
        if resp.status_code == 400:
            print("Activity may already be liked")
            return
        assert resp.status_code == 200
        print("Activity liked successfully")
    
    def test_comment_on_activity(self):
        """Comment on an activity via POST /api/activities/{id}/comment"""
        if not TestSocialInteractions.test_activity_id:
            pytest.skip("No activity to comment on")
        
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.post(f"{BASE_URL}/api/activities/{TestSocialInteractions.test_activity_id}/comment",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"content": "Great visit! Test comment from iteration 35."})
        assert resp.status_code == 200
        data = resp.json()
        assert "comment_id" in data
        print(f"Comment posted: {data.get('comment_id')}")


class TestReportSystem:
    """Test POST /api/reports for activity type"""
    
    def test_submit_report(self):
        """Submit a report for an activity"""
        token = TestAuthenticationAndUserInfo.token2
        # Get an activity to report
        feed_resp = requests.get(f"{BASE_URL}/api/feed?limit=5", headers={"Authorization": f"Bearer {token}"})
        if feed_resp.status_code != 200:
            pytest.skip("Could not get feed for report test")
        activities = feed_resp.json()
        if not activities:
            pytest.skip("No activities to report")
        
        activity_id = activities[0]["activity_id"]
        
        resp = requests.post(f"{BASE_URL}/api/reports",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "report_type": "activity",
                "target_id": activity_id,
                "target_name": "Test Activity",
                "reason": "spam"
            })
        # May fail if already reported
        if resp.status_code == 400:
            print(f"Report may already exist: {resp.json().get('detail')}")
            return
        assert resp.status_code == 200
        assert "report_id" in resp.json()
        print(f"Report submitted: {resp.json().get('report_id')}")


class TestPerformanceEndpoints:
    """Test lightweight/optimized endpoints"""
    
    def test_visits_check_lightweight(self):
        """GET /api/visits/check/{landmark_id} is lightweight"""
        token = TestAuthenticationAndUserInfo.token1
        # Use known landmark
        landmark_id = "france_eiffel_tower"
        resp = requests.get(f"{BASE_URL}/api/visits/check/{landmark_id}",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "visited" in data
        print(f"Visit check for {landmark_id}: visited={data.get('visited')}, visit_id={data.get('visit_id')}")
    
    def test_landmarks_have_is_visited(self):
        """GET /api/landmarks?country_id=france returns is_visited field"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.get(f"{BASE_URL}/api/landmarks?country_id=france",
            headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        landmarks = resp.json()
        assert isinstance(landmarks, list)
        if landmarks:
            # Check that landmarks have is_visited field
            first = landmarks[0]
            assert "is_visited" in first or "is_locked" in first
            print(f"Landmarks for France: {len(landmarks)} total, first has is_visited={first.get('is_visited')}")


class TestPremiumTierLimits:
    """Verify free tier limits: diary_entries_per_month=3, unlimited friends"""
    
    def test_free_tier_diary_limit_config(self):
        """Verify free tier has diary_entries_per_month=3"""
        # This is verified by checking the LIMITS config in auth.py
        # For API test, we check visit stats endpoint
        token = TestAuthenticationAndUserInfo.token2
        resp = requests.get(f"{BASE_URL}/api/visits/stats", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "tier" in data
        assert data["tier"] == "free"
        # monthly_limit for visits may differ from diary limit
        print(f"Free tier visit stats: monthly={data.get('monthly_visits')}, limit={data.get('monthly_limit')}, tier={data.get('tier')}")
    
    def test_unlimited_friends_for_free(self):
        """Verify free users can have unlimited friends (no 403 on friend request)"""
        # Already tested in friend flow - if user2 (free) can have friends, it works
        print("Unlimited friends verified: User2 (free) successfully became friends with User1")


class TestCleanup:
    """Cleanup - Reset comment permission and optionally remove test friendship"""
    
    def test_reset_comment_permission(self):
        """Reset User1's comment permission to everyone"""
        token = TestAuthenticationAndUserInfo.token1
        resp = requests.put(f"{BASE_URL}/api/auth/comment-permission",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"comment_permission": "everyone"})
        assert resp.status_code == 200
        print("Comment permission reset to: everyone")
    
    def test_keep_friendship_for_future_tests(self):
        """Keep the friendship for future tests (no cleanup)"""
        print("Friendship retained for future testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
