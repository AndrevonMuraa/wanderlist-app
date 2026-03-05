"""
Iteration 28: Social Features Testing

Tests new social endpoints:
- GET /api/users/{user_id}/profile - public profile with friendship_status, stats, recent_visits
- GET /api/users/search?q=test - user search (excludes self)
- GET /api/friends/sent - sent friend requests
- POST /api/friends/{id}/reject - reject friend request
- DELETE /api/friends/{id} - remove friend
- GET /api/messages/conversations - conversations with last_message, unread_count
- PUT /api/visits/{visit_id}/privacy - change visibility on existing visit
- Verify existing endpoints still work: /api/feed, /api/community-feed, /api/leaderboard, /api/friends, /api/friends/pending
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"
TEST_USER_ID = "user_dd46a314f120"
TEST_VISIT_ID = "visit_4f32a4eaf670"


class TestAuthentication:
    """Authentication setup for all tests"""
    
    def test_login_success(self, api_client):
        """Test login and get token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"Login successful, token received")


class TestUserProfile:
    """Test GET /api/users/{user_id}/profile endpoint"""
    
    def test_get_own_profile(self, authenticated_client):
        """Test viewing own profile returns is_own_profile=true"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/profile")
        assert response.status_code == 200, f"Profile fetch failed: {response.text}"
        data = response.json()
        
        # Check is_own_profile flag
        assert "is_own_profile" in data, "Missing is_own_profile field"
        assert data["is_own_profile"] == True, "is_own_profile should be True for own profile"
        print(f"Own profile check passed - is_own_profile={data['is_own_profile']}")
    
    def test_profile_response_structure(self, authenticated_client):
        """Test profile has required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/profile")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "user_id", "name", "friendship_status", "is_own_profile", "stats", "recent_visits"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"Profile structure check passed - all required fields present")
    
    def test_profile_stats_structure(self, authenticated_client):
        """Test profile stats has required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/profile")
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data
        stats = data["stats"]
        stats_fields = ["total_visits", "countries_visited", "continents_visited", "friends_count"]
        for field in stats_fields:
            assert field in stats, f"Missing stats field: {field}"
        print(f"Profile stats: visits={stats['total_visits']}, countries={stats['countries_visited']}, friends={stats['friends_count']}")
    
    def test_profile_friendship_status_values(self, authenticated_client):
        """Test friendship_status is one of valid values"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/profile")
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["none", "friends", "pending_sent", "pending_received"]
        assert data["friendship_status"] in valid_statuses, f"Invalid friendship_status: {data['friendship_status']}"
        print(f"Friendship status: {data['friendship_status']}")
    
    def test_profile_recent_visits_is_list(self, authenticated_client):
        """Test recent_visits is a list"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/{TEST_USER_ID}/profile")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["recent_visits"], list), "recent_visits should be a list"
        print(f"Recent visits count: {len(data['recent_visits'])}")
    
    def test_profile_not_found(self, authenticated_client):
        """Test 404 for non-existent user"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/nonexistent_user_123/profile")
        assert response.status_code == 404
        print("Non-existent user profile correctly returns 404")


class TestUserSearch:
    """Test GET /api/users/search endpoint"""
    
    def test_search_returns_200(self, authenticated_client):
        """Test search endpoint returns 200"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/search?q=test")
        assert response.status_code == 200, f"Search failed: {response.text}"
        print("Search endpoint returns 200")
    
    def test_search_returns_list(self, authenticated_client):
        """Test search returns a list"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/search?q=test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Search should return a list"
        print(f"Search returned {len(data)} users")
    
    def test_search_excludes_self(self, authenticated_client):
        """Test search excludes current user"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/search?q=test")
        assert response.status_code == 200
        data = response.json()
        
        user_ids = [u.get("user_id") for u in data]
        assert TEST_USER_ID not in user_ids, "Search should exclude current user"
        print("Search correctly excludes self")
    
    def test_search_result_structure(self, authenticated_client):
        """Test search result has required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/search?q=test")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            user = data[0]
            expected_fields = ["user_id", "name"]
            for field in expected_fields:
                assert field in user, f"Missing field in search result: {field}"
            print(f"Search result structure valid - first user: {user.get('name')}")
        else:
            print("No users found in search - skipping structure check")
    
    def test_search_short_query_returns_empty(self, authenticated_client):
        """Test search with <2 chars returns empty"""
        response = authenticated_client.get(f"{BASE_URL}/api/users/search?q=a")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Short query should return empty list"
        print("Short query correctly returns empty list")


class TestSentFriendRequests:
    """Test GET /api/friends/sent endpoint"""
    
    def test_sent_requests_returns_200(self, authenticated_client):
        """Test sent requests endpoint returns 200"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends/sent")
        assert response.status_code == 200, f"Sent requests failed: {response.text}"
        print("Sent requests endpoint returns 200")
    
    def test_sent_requests_returns_list(self, authenticated_client):
        """Test sent requests returns a list"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends/sent")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Sent requests should return a list"
        print(f"Sent requests count: {len(data)}")
    
    def test_sent_request_structure(self, authenticated_client):
        """Test sent request item has required fields if any"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends/sent")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            request = data[0]
            assert "friendship_id" in request, "Missing friendship_id in sent request"
            assert "user" in request, "Missing user info in sent request"
            print(f"Sent request structure valid - friendship_id: {request.get('friendship_id')}")
        else:
            print("No sent requests - structure check skipped")


class TestRejectFriendRequest:
    """Test POST /api/friends/{id}/reject endpoint"""
    
    def test_reject_invalid_friendship_returns_404(self, authenticated_client):
        """Test rejecting non-existent request returns 404"""
        response = authenticated_client.post(f"{BASE_URL}/api/friends/invalid_friendship_123/reject")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Reject invalid friendship correctly returns 404")


class TestRemoveFriend:
    """Test DELETE /api/friends/{id} endpoint"""
    
    def test_remove_invalid_friendship_returns_404(self, authenticated_client):
        """Test removing non-existent friendship returns 404"""
        response = authenticated_client.delete(f"{BASE_URL}/api/friends/invalid_friendship_123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Remove invalid friendship correctly returns 404")


class TestConversations:
    """Test GET /api/messages/conversations endpoint (premium feature)"""
    
    def test_conversations_returns_200(self, authenticated_client):
        """Test conversations endpoint returns 200 (user is premium basic tier)"""
        response = authenticated_client.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200, f"Conversations failed: {response.text}"
        print("Conversations endpoint returns 200")
    
    def test_conversations_returns_list(self, authenticated_client):
        """Test conversations returns a list"""
        response = authenticated_client.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Conversations should return a list"
        print(f"Conversations count: {len(data)}")
    
    def test_conversation_structure(self, authenticated_client):
        """Test conversation item has required fields if any"""
        response = authenticated_client.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            convo = data[0]
            expected_fields = ["friend", "last_message", "unread_count"]
            for field in expected_fields:
                assert field in convo, f"Missing field in conversation: {field}"
            print(f"Conversation structure valid - friend: {convo.get('friend', {}).get('name')}, unread: {convo.get('unread_count')}")
        else:
            print("No conversations - structure check skipped")


class TestVisitPrivacy:
    """Test PUT /api/visits/{visit_id}/privacy endpoint"""
    
    def test_update_visit_privacy_invalid_visibility(self, authenticated_client):
        """Test invalid visibility value returns 400"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/visits/{TEST_VISIT_ID}/privacy",
            json={"visibility": "invalid_value"}
        )
        # Should be 400 for invalid visibility or 404 if visit not found
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        print(f"Invalid visibility returns {response.status_code}")
    
    def test_update_visit_privacy_not_found(self, authenticated_client):
        """Test non-existent visit returns 404"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/visits/invalid_visit_123/privacy",
            json={"visibility": "public"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent visit privacy update returns 404")
    
    def test_update_visit_privacy_valid(self, authenticated_client):
        """Test updating visit privacy with valid value"""
        # First get user's visits to find a valid visit_id
        visits_response = authenticated_client.get(f"{BASE_URL}/api/visits")
        if visits_response.status_code != 200:
            pytest.skip("Could not get visits")
        
        visits = visits_response.json()
        if len(visits) == 0:
            pytest.skip("No visits to test privacy update")
        
        visit_id = visits[0].get("visit_id")
        
        # Update privacy to friends
        response = authenticated_client.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            json={"visibility": "friends"}
        )
        assert response.status_code == 200, f"Privacy update failed: {response.text}"
        
        data = response.json()
        assert "visibility" in data, "Response should contain visibility"
        assert data["visibility"] == "friends", "Visibility should be 'friends'"
        print(f"Visit privacy updated to 'friends' for visit: {visit_id}")
        
        # Restore to public
        restore_response = authenticated_client.put(
            f"{BASE_URL}/api/visits/{visit_id}/privacy",
            json={"visibility": "public"}
        )
        assert restore_response.status_code == 200
        print("Visit privacy restored to 'public'")


class TestExistingEndpoints:
    """Verify existing endpoints still work after social features addition"""
    
    def test_feed_returns_200(self, authenticated_client):
        """Test feed endpoint still works"""
        response = authenticated_client.get(f"{BASE_URL}/api/feed")
        assert response.status_code == 200, f"Feed failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Feed should return a list"
        print(f"Feed returns {len(data)} activities")
    
    def test_community_feed_returns_200(self, authenticated_client):
        """Test community feed endpoint still works"""
        response = authenticated_client.get(f"{BASE_URL}/api/community-feed")
        assert response.status_code == 200, f"Community feed failed: {response.text}"
        print("Community feed endpoint returns 200")
    
    def test_leaderboard_returns_200(self, authenticated_client):
        """Test leaderboard endpoint still works"""
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        data = response.json()
        assert "leaderboard" in data, "Leaderboard should have leaderboard field"
        print(f"Leaderboard returns {len(data.get('leaderboard', []))} entries")
    
    def test_friends_returns_200(self, authenticated_client):
        """Test friends endpoint still works"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200, f"Friends failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Friends should return a list"
        print(f"Friends returns {len(data)} friends")
    
    def test_friends_pending_returns_200(self, authenticated_client):
        """Test pending requests endpoint still works with $lookup"""
        response = authenticated_client.get(f"{BASE_URL}/api/friends/pending")
        assert response.status_code == 200, f"Pending requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Pending should return a list"
        print(f"Pending requests returns {len(data)} pending")


class TestLeaderboardProfile:
    """Test leaderboard with profile navigation info"""
    
    def test_leaderboard_entries_have_user_id(self, authenticated_client):
        """Test leaderboard entries have user_id for profile navigation"""
        response = authenticated_client.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        leaderboard = data.get("leaderboard", [])
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            assert "user_id" in entry, "Leaderboard entry should have user_id"
            assert "name" in entry, "Leaderboard entry should have name"
            print(f"Leaderboard entry has user_id: {entry.get('user_id')}")
        else:
            print("No leaderboard entries to check")


class TestStatsEndpoint:
    """Test stats endpoint still works"""
    
    def test_stats_returns_200(self, authenticated_client):
        """Test stats endpoint returns 200"""
        response = authenticated_client.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        required_fields = ["total_visits", "countries_visited", "friends_count", "points"]
        for field in required_fields:
            assert field in data, f"Missing stats field: {field}"
        print(f"Stats: visits={data['total_visits']}, countries={data['countries_visited']}, points={data['points']}")


# ============= FIXTURES =============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client
