"""Backend tests for like/comment parity between /api/feed (friends) and
/api/community-feed. Iteration 18.

Validates:
- /api/community-feed items include activity_id, user_id, is_liked,
  likes_count, comments_count, user_upvoted.
- POST/DELETE /api/activities/{id}/like updates community feed counts.
- POST /api/activities/{id}/comment and DELETE /api/comments/{id} update
  community feed comments_count.
- /api/feed (friends feed) still works.
- Regression on /api/community-photos/photo-of-the-week and
  /api/landmarks/{id}/community-photos.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get(
    "REACT_APP_BACKEND_URL",
    "http://localhost:8001",
)
BASE_URL = BASE_URL.rstrip("/")

ADMIN_EMAIL = "test@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
PASSWORD = "Test1234!"


def _login(email, password):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, PASSWORD)


@pytest.fixture(scope="session")
def pro_token():
    try:
        return _login(PRO_EMAIL, PASSWORD)
    except AssertionError:
        pytest.skip("pro user not available")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def pro_headers(pro_token):
    return {"Authorization": f"Bearer {pro_token}"}


# ============= Community Feed Shape =============

class TestCommunityFeedShape:
    def test_community_feed_returns_items(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=20",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "count" in data
        assert isinstance(data["items"], list)

    def test_community_feed_items_have_required_fields(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=20",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200
        items = r.json()["items"]
        if not items:
            pytest.skip("no community feed items to validate")

        required_fields = {
            "activity_id",
            "user_id",
            "is_liked",
            "likes_count",
            "comments_count",
            "user_upvoted",
            "visit_id",
            "source",
        }
        for it in items:
            missing = required_fields - set(it.keys())
            assert not missing, f"missing fields {missing} in item {it}"
            assert isinstance(it["is_liked"], bool)
            assert isinstance(it["likes_count"], int)
            assert isinstance(it["comments_count"], int)
            assert isinstance(it["user_upvoted"], bool)

    def test_community_feed_has_activity_id_for_both_sources(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200
        items = r.json()["items"]
        # Items with no matching activity will have activity_id=None; report
        # but tolerate (seed data might lack activities).
        missing_act = [
            i for i in items if i.get("activity_id") is None
        ]
        # Fail only if ALL items miss activity_id (would indicate join broken)
        if items:
            assert len(missing_act) < len(items), (
                "all community-feed items have activity_id=None — "
                "join on activities likely broken"
            )


# ============= Like Parity =============

class TestLikeParity:
    def _find_item_with_activity(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200
        for it in r.json()["items"]:
            if it.get("activity_id"):
                return it
        return None

    def test_like_then_unlike_updates_community_feed(self, admin_headers):
        item = self._find_item_with_activity(admin_headers)
        if not item:
            pytest.skip("no community feed item with activity_id")

        activity_id = item["activity_id"]
        initial_likes = item["likes_count"]
        initially_liked = item["is_liked"]

        # Ensure we start from unliked state
        if initially_liked:
            requests.delete(
                f"{BASE_URL}/api/activities/{activity_id}/like",
                headers=admin_headers,
                timeout=30,
            )
            initial_likes = max(0, initial_likes - 1)

        # POST like
        rl = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )
        assert rl.status_code in (200, 201), f"like failed: {rl.status_code} {rl.text}"

        # GET community-feed and find same item
        r2 = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        updated_items = {i.get("activity_id"): i for i in r2.json()["items"]}
        updated = updated_items.get(activity_id)
        assert updated is not None, "activity disappeared from feed after like"
        assert updated["is_liked"] is True, "is_liked should be True after POST like"
        assert updated["likes_count"] == initial_likes + 1, (
            f"likes_count expected {initial_likes + 1} got {updated['likes_count']}"
        )

        # DELETE like
        ru = requests.delete(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )
        assert ru.status_code in (200, 204)

        r3 = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        final_items = {i.get("activity_id"): i for i in r3.json()["items"]}
        final = final_items.get(activity_id)
        assert final is not None
        assert final["is_liked"] is False, "is_liked should be False after DELETE"
        assert final["likes_count"] == initial_likes, (
            f"likes_count after unlike expected {initial_likes} got {final['likes_count']}"
        )

    def test_like_same_activity_twice_returns_400(self, admin_headers):
        item = self._find_item_with_activity(admin_headers)
        if not item:
            pytest.skip("no item")
        activity_id = item["activity_id"]
        # ensure unliked
        requests.delete(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )
        r1 = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )
        assert r1.status_code == 200
        r2 = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )
        assert r2.status_code == 400
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/activities/{activity_id}/like",
            headers=admin_headers,
            timeout=30,
        )


# ============= Comment Parity =============

class TestCommentParity:
    def _find_item_with_activity(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200
        for it in r.json()["items"]:
            if it.get("activity_id"):
                return it
        return None

    def test_add_then_delete_comment_updates_community_feed(self, admin_headers):
        item = self._find_item_with_activity(admin_headers)
        if not item:
            pytest.skip("no item")
        activity_id = item["activity_id"]
        initial_count = item["comments_count"]

        rc = requests.post(
            f"{BASE_URL}/api/activities/{activity_id}/comment",
            headers=admin_headers,
            json={"content": "TEST_parity_comment"},
            timeout=30,
        )
        assert rc.status_code in (200, 201), f"comment failed: {rc.text}"
        comment_id = rc.json()["comment_id"]
        assert rc.json()["content"] == "TEST_parity_comment"

        # verify count in community feed
        r2 = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        updated = {i.get("activity_id"): i for i in r2.json()["items"]}.get(activity_id)
        assert updated is not None
        assert updated["comments_count"] == initial_count + 1, (
            f"comments_count expected {initial_count + 1} got {updated['comments_count']}"
        )

        # delete comment
        rd = requests.delete(
            f"{BASE_URL}/api/comments/{comment_id}",
            headers=admin_headers,
            timeout=30,
        )
        assert rd.status_code in (200, 204)

        r3 = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        final = {i.get("activity_id"): i for i in r3.json()["items"]}.get(activity_id)
        assert final is not None
        assert final["comments_count"] == initial_count, (
            f"comments_count after delete expected {initial_count} got {final['comments_count']}"
        )


# ============= Friends Feed Regression =============

class TestFriendsFeed:
    def test_feed_endpoint_returns_200(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/feed?limit=20", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_feed_items_have_likes_and_comments_fields(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/feed?limit=20", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        activities = r.json()
        if not activities:
            pytest.skip("no friends feed activities")
        for a in activities:
            assert "activity_id" in a
            assert "likes_count" in a
            assert "comments_count" in a
            assert "is_liked" in a


# ============= Regression: other community endpoints =============

class TestCommunityRegression:
    def test_photo_of_the_week(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/community-photos/photo-of-the-week",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "week" in data and "year" in data

    def test_landmark_community_photos(self, admin_headers):
        # find a landmark id from community feed
        r = requests.get(
            f"{BASE_URL}/api/community-feed?limit=50",
            headers=admin_headers,
            timeout=30,
        )
        lm_id = None
        for it in r.json().get("items", []):
            if it.get("landmark_id"):
                lm_id = it["landmark_id"]
                break
        if not lm_id:
            pytest.skip("no landmark_id available")
        r2 = requests.get(
            f"{BASE_URL}/api/landmarks/{lm_id}/community-photos",
            headers=admin_headers,
            timeout=30,
        )
        assert r2.status_code == 200
        data = r2.json()
        assert "photos" in data
