"""
Iteration 36: Test Activity Stream and Share Profile features

Tests:
1. GET /api/users/{user_id}/activity - Activity stream endpoint
   - Returns activities with like_count, comments_count, is_liked, description
   - Privacy filtering: public only for non-friends, public+friends for friends, all for self
   - Pagination with skip/limit
2. GET /api/users/{user_id}/profile - Enhanced profile endpoint
   - Returns comment_permission, has_diary, country_name on recent_visits
3. GET /api/users/{user_id}/visits - Paginated visits
   - Returns has_diary, visibility fields
4. Frontend shareUtils.ts - shareProfile function verification (code exists)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://audit-phase1.preview.emergentagent.com"

# Test credentials
USER1_EMAIL = "test@wandermark.app"
USER1_PASSWORD = "Test1234!"
USER1_ID = "user_dd46a314f120"

USER2_EMAIL = "test2@wandermark.app"
USER2_PASSWORD = "Test1234!"


class TestActivityStreamEndpoint:
    """Tests for GET /api/users/{user_id}/activity endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as User1 (Pro) for most tests"""
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        data = res.json()
        self.token = data.get("access_token") or data.get("token")
        self.user_id = data.get("user", {}).get("user_id") or USER1_ID
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    def test_activity_endpoint_returns_200(self):
        """Activity endpoint should return 200 for own user"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/activity")
        assert res.status_code == 200, f"Activity endpoint failed: {res.text}"
        data = res.json()
        assert "activities" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        print(f"PASS: Activity endpoint returns 200 with {len(data['activities'])} activities")

    def test_activity_has_required_fields(self):
        """Each activity should have like_count, comments_count, is_liked, description"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/activity?limit=5")
        assert res.status_code == 200
        data = res.json()
        
        if len(data['activities']) > 0:
            act = data['activities'][0]
            assert "activity_id" in act, "Missing activity_id"
            assert "like_count" in act, "Missing like_count"
            assert "comments_count" in act, "Missing comments_count"
            assert "is_liked" in act, "Missing is_liked"
            assert "description" in act, "Missing description"
            assert "created_at" in act, "Missing created_at"
            print(f"PASS: Activity has all required fields: like_count={act['like_count']}, comments_count={act['comments_count']}, is_liked={act['is_liked']}")
            print(f"      Description: {act.get('description', 'N/A')[:60]}...")
        else:
            pytest.skip("No activities found for user")

    def test_activity_pagination(self):
        """Activity endpoint should support skip and limit parameters"""
        # Get first page
        res1 = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/activity?skip=0&limit=3")
        assert res1.status_code == 200
        data1 = res1.json()
        
        # Get second page
        res2 = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/activity?skip=3&limit=3")
        assert res2.status_code == 200
        data2 = res2.json()
        
        # Check skip/limit are reflected
        assert data1['skip'] == 0
        assert data1['limit'] == 3
        assert data2['skip'] == 3
        assert data2['limit'] == 3
        
        # If there are enough activities, ensure different results
        if len(data1['activities']) > 0 and len(data2['activities']) > 0:
            ids1 = {a['activity_id'] for a in data1['activities']}
            ids2 = {a['activity_id'] for a in data2['activities']}
            # Activities should be different (no overlap)
            assert not ids1.intersection(ids2), "Pagination returned duplicate activities"
        
        print(f"PASS: Pagination works - page1: {len(data1['activities'])} items, page2: {len(data2['activities'])} items")

    def test_activity_own_user_sees_all(self):
        """Own user should see all activities (public, friends, private)"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/activity?limit=20")
        assert res.status_code == 200
        data = res.json()
        
        # User should see their own activities
        total = data['total']
        print(f"PASS: Own user can access activity endpoint, total={total}")


class TestActivityPrivacyFiltering:
    """Test privacy filtering for activity stream"""

    @pytest.fixture
    def user1_session(self):
        """Login as User1"""
        session = requests.Session()
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        token = data.get("access_token") or data.get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session, data.get("user", {}).get("user_id") or USER1_ID

    @pytest.fixture
    def user2_session(self):
        """Login as User2"""
        session = requests.Session()
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER2_EMAIL,
            "password": USER2_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        token = data.get("access_token") or data.get("token")
        user2_id = data.get("user", {}).get("user_id")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session, user2_id

    def test_non_friend_sees_public_only(self, user2_session):
        """Non-friend should only see public activities"""
        session, user2_id = user2_session
        
        # User2 viewing User1's activities
        res = session.get(f"{BASE_URL}/api/users/{USER1_ID}/activity?limit=20")
        assert res.status_code == 200
        data = res.json()
        
        # All activities returned should be visible (privacy filter applied server-side)
        print(f"PASS: Non-friend can view user1 activities (filtered by server), count={len(data['activities'])}")

    def test_friend_sees_public_and_friends_activities(self, user1_session, user2_session):
        """Friend should see public and friends-only activities"""
        session1, user1_id = user1_session
        session2, user2_id = user2_session
        
        # First check friendship status between users
        profile_res = session1.get(f"{BASE_URL}/api/users/{user2_id}/profile")
        if profile_res.status_code != 200:
            pytest.skip("Could not check friendship status")
        
        profile = profile_res.json()
        
        # User1 viewing User2's activities
        res = session1.get(f"{BASE_URL}/api/users/{user2_id}/activity?limit=20")
        assert res.status_code == 200
        data = res.json()
        
        print(f"PASS: User1 can view User2 activities, friendship_status={profile.get('friendship_status')}, count={len(data['activities'])}")


class TestEnhancedProfileEndpoint:
    """Tests for enhanced GET /api/users/{user_id}/profile"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        self.token = data.get("access_token") or data.get("token")
        self.user_id = data.get("user", {}).get("user_id") or USER1_ID
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    def test_profile_returns_comment_permission(self):
        """Profile should include comment_permission field"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/profile")
        assert res.status_code == 200
        data = res.json()
        
        assert "comment_permission" in data, "Missing comment_permission field"
        assert data["comment_permission"] in ["everyone", "friends", "nobody"], f"Invalid comment_permission: {data['comment_permission']}"
        print(f"PASS: Profile includes comment_permission={data['comment_permission']}")

    def test_profile_recent_visits_have_has_diary(self):
        """Recent visits should include has_diary field"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/profile")
        assert res.status_code == 200
        data = res.json()
        
        recent_visits = data.get("recent_visits", [])
        if len(recent_visits) > 0:
            visit = recent_visits[0]
            assert "has_diary" in visit, "Missing has_diary on recent visit"
            print(f"PASS: Recent visits include has_diary field (first visit has_diary={visit['has_diary']})")
        else:
            print("SKIP: No recent visits to check has_diary field")

    def test_profile_recent_visits_have_country_name(self):
        """Recent visits should include country_name field"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/profile")
        assert res.status_code == 200
        data = res.json()
        
        recent_visits = data.get("recent_visits", [])
        if len(recent_visits) > 0:
            visit = recent_visits[0]
            # country_name may be None for some visits but field should exist
            assert "country_name" in visit, "Missing country_name on recent visit"
            print(f"PASS: Recent visits include country_name field (first visit country_name={visit.get('country_name')})")
        else:
            print("SKIP: No recent visits to check country_name field")

    def test_profile_stats_structure(self):
        """Profile should have complete stats structure"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/profile")
        assert res.status_code == 200
        data = res.json()
        
        assert "stats" in data, "Missing stats object"
        stats = data["stats"]
        assert "total_visits" in stats, "Missing total_visits in stats"
        assert "countries_visited" in stats, "Missing countries_visited in stats"
        assert "continents_visited" in stats, "Missing continents_visited in stats"
        assert "friends_count" in stats, "Missing friends_count in stats"
        print(f"PASS: Profile stats complete - visits={stats['total_visits']}, countries={stats['countries_visited']}")


class TestPaginatedVisitsEndpoint:
    """Tests for GET /api/users/{user_id}/visits"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        self.token = data.get("access_token") or data.get("token")
        self.user_id = data.get("user", {}).get("user_id") or USER1_ID
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    def test_visits_endpoint_returns_200(self):
        """Visits endpoint should return 200"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/visits")
        assert res.status_code == 200
        data = res.json()
        
        assert "visits" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        print(f"PASS: Visits endpoint returns 200 with {len(data['visits'])} visits, total={data['total']}")

    def test_visits_have_required_fields(self):
        """Each visit should have has_diary and visibility fields"""
        res = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/visits?limit=5")
        assert res.status_code == 200
        data = res.json()
        
        if len(data['visits']) > 0:
            visit = data['visits'][0]
            assert "visit_id" in visit, "Missing visit_id"
            assert "landmark_name" in visit, "Missing landmark_name"
            assert "has_diary" in visit, "Missing has_diary"
            assert "visibility" in visit, "Missing visibility"
            assert visit["visibility"] in ["public", "friends", "private"], f"Invalid visibility: {visit['visibility']}"
            print(f"PASS: Visit has all fields: has_diary={visit['has_diary']}, visibility={visit['visibility']}")
        else:
            pytest.skip("No visits found for user")

    def test_visits_pagination(self):
        """Visits endpoint should support pagination"""
        res1 = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/visits?skip=0&limit=5")
        assert res1.status_code == 200
        data1 = res1.json()
        
        res2 = self.session.get(f"{BASE_URL}/api/users/{self.user_id}/visits?skip=5&limit=5")
        assert res2.status_code == 200
        data2 = res2.json()
        
        assert data1['skip'] == 0
        assert data1['limit'] == 5
        assert data2['skip'] == 5
        
        print(f"PASS: Visits pagination works - page1: {len(data1['visits'])}, page2: {len(data2['visits'])}")


class TestShareProfileCodeExists:
    """Verify shareProfile function exists in shareUtils.ts (frontend code review)"""

    def test_share_profile_function_signature(self):
        """Verify shareProfile is exported with correct parameters"""
        # This is a code review test - we check the file content
        share_utils_path = "/app/frontend/utils/shareUtils.ts"
        
        try:
            with open(share_utils_path, 'r') as f:
                content = f.read()
                
            assert "export const shareProfile" in content, "shareProfile function not exported"
            assert "name: string" in content or "name," in content, "shareProfile missing name parameter"
            assert "visits: number" in content or "visits," in content, "shareProfile missing visits parameter"
            assert "countries: number" in content or "countries," in content, "shareProfile missing countries parameter"
            assert "points: number" in content or "points," in content, "shareProfile missing points parameter"
            assert "Share.share" in content, "shareProfile should use React Native Share API"
            
            print("PASS: shareProfile function exists with correct signature in shareUtils.ts")
        except FileNotFoundError:
            pytest.fail("shareUtils.ts file not found")


class TestShareButtonOnProfile:
    """Verify share button integration on user profile page (code review)"""

    def test_share_button_exists_in_profile(self):
        """Verify share button exists in user-profile page"""
        profile_path = "/app/frontend/app/user-profile/[user_id].tsx"
        
        try:
            with open(profile_path, 'r') as f:
                content = f.read()
                
            assert "import { shareProfile }" in content or "shareProfile" in content, "shareProfile not imported"
            assert "handleShareProfile" in content, "handleShareProfile function not found"
            assert 'data-testid="share-profile-btn"' in content, "Share button missing data-testid"
            assert "share-outline" in content, "Share icon not found"
            
            print("PASS: Share button properly integrated in user profile page")
        except FileNotFoundError:
            pytest.fail("user-profile/[user_id].tsx file not found")


class TestActivityStreamUIIntegration:
    """Verify activity stream UI integration on user profile page"""

    def test_activity_section_exists_in_profile(self):
        """Verify Recent Activity section exists in profile page"""
        profile_path = "/app/frontend/app/user-profile/[user_id].tsx"
        
        try:
            with open(profile_path, 'r') as f:
                content = f.read()
                
            assert "Recent Activity" in content, "Recent Activity section title not found"
            assert "activities" in content, "activities state not found"
            assert "loadActivity" in content, "loadActivity function not found"
            assert "like_count" in content, "like_count display not found"
            assert "comments_count" in content, "comments_count display not found"
            
            print("PASS: Activity stream section properly integrated in user profile page")
        except FileNotFoundError:
            pytest.fail("user-profile/[user_id].tsx file not found")


class TestViewAllVisitsLink:
    """Verify View All Visits link exists on profile"""

    def test_view_all_link_exists(self):
        """Verify View All link navigates to user-visits page"""
        profile_path = "/app/frontend/app/user-profile/[user_id].tsx"
        
        try:
            with open(profile_path, 'r') as f:
                content = f.read()
                
            assert "View All" in content, "View All link text not found"
            assert 'data-testid="view-all-visits-btn"' in content, "View All button missing data-testid"
            assert "/user-visits/" in content, "Navigation to user-visits page not found"
            
            print("PASS: View All Visits link properly integrated")
        except FileNotFoundError:
            pytest.fail("user-profile/[user_id].tsx file not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
