"""
Iteration 19 — Community Highlight (singular) + /community-highlights/top tests.

Endpoints under test:
- GET /api/community-highlight (hotness-based single pick; rotation)
- GET /api/community-highlights/top?limit=N (top-N by likes)
- Regression: GET /api/community-feed and GET /api/community-highlights (trending landmarks plural)
- Interaction side-effects: POST /api/activities/{activity_id}/like & /comment
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://memory-recap-2026.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
PASSWORD = "Test1234!"


# ---------- Auth helpers ----------
def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, PASSWORD)


@pytest.fixture(scope="session")
def pro_token():
    return _login(PRO_EMAIL, PASSWORD)


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def pro_headers(pro_token):
    return {"Authorization": f"Bearer {pro_token}", "Content-Type": "application/json"}


# ---------- GET /api/community-highlight ----------
class TestCommunityHighlightSingular:
    def test_returns_single_highlight_with_required_fields(self, admin_headers):
        r = requests.get(f"{API}/community-highlight", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "highlight" in data
        h = data["highlight"]
        # If empty state, accept null — the DB should have public photos though
        if h is None:
            pytest.skip("No public visits with photos in database")
        required = [
            "visit_id", "user_id", "user_name", "activity_id", "photo_url",
            "landmark_name", "country_name", "source", "likes_count",
            "comments_count", "is_liked",
        ]
        missing = [k for k in required if k not in h]
        assert not missing, f"Missing fields: {missing}. Got: {list(h.keys())}"
        assert h["source"] in ("landmark", "custom"), f"unexpected source: {h['source']}"
        assert isinstance(h["likes_count"], int)
        assert isinstance(h["comments_count"], int)
        assert isinstance(h["is_liked"], bool)
        assert h["photo_url"], "photo_url must be non-empty"

    def test_rotation_over_multiple_calls(self, admin_headers):
        """Call 15 times — expect at least 2 distinct visit_ids if pool has >1 item."""
        seen = set()
        for _ in range(15):
            r = requests.get(f"{API}/community-highlight", headers=admin_headers, timeout=30)
            assert r.status_code == 200
            h = r.json().get("highlight")
            if h:
                seen.add(h.get("visit_id"))
        # Pool ≥ 10 public landmark visits per brief, so rotation should produce ≥ 2 unique
        assert len(seen) >= 2, f"Rotation not working — only saw: {seen}"

    def test_pro_user_also_gets_highlight(self, pro_headers):
        r = requests.get(f"{API}/community-highlight", headers=pro_headers, timeout=30)
        assert r.status_code == 200
        assert "highlight" in r.json()


# ---------- GET /api/community-highlights/top ----------
class TestCommunityHighlightsTop:
    def test_returns_ranked_list_default_limit(self, admin_headers):
        r = requests.get(f"{API}/community-highlights/top", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data
        items = data["items"]
        assert isinstance(items, list)
        if not items:
            pytest.skip("No public photos available")
        assert len(items) <= 10
        # Ranks
        for i, it in enumerate(items):
            assert it.get("rank") == i + 1, f"Bad rank at idx {i}: {it.get('rank')}"
            for k in ("photo_url", "landmark_name", "country_name", "user_name",
                      "likes_count", "comments_count", "is_liked", "source"):
                assert k in it, f"missing {k}"
        # Sorted by likes DESC
        likes_seq = [it["likes_count"] for it in items]
        assert likes_seq == sorted(likes_seq, reverse=True), f"Not sorted DESC: {likes_seq}"

    def test_limit_param_5(self, admin_headers):
        r = requests.get(f"{API}/community-highlights/top?limit=5", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) <= 5
        for i, it in enumerate(items):
            assert it["rank"] == i + 1

    def test_limit_param_10(self, admin_headers):
        r = requests.get(f"{API}/community-highlights/top?limit=10", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) <= 10

    def test_custom_visits_included_with_source_custom(self, admin_headers):
        """Verify source='custom' is surfaced when data available.

        Seed limitation: The 3 public user_created_visits have empty photos=[] AND
        all landmarks[].photo are None, so none can ever appear in pool because
        the Mongo query filters on photos != [] before the fallback-to-landmark
        photo code runs. This test therefore SKIPs in current DB state and also
        highlights a code gap: query should allow landmark-photo fallback."""
        r = requests.get(f"{API}/community-highlights/top?limit=50", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        sources = {it["source"] for it in items}
        if "custom" not in sources:
            pytest.skip(
                "No source='custom' in results. Seed data has 3 public custom "
                "visits but all have empty photos=[] and null landmarks[].photo. "
                "Additionally, the mongo query filters visits where photos is "
                "empty, so even if landmarks[].photo were set, those items would "
                "be excluded. Action: either seed custom visits with photos OR "
                "loosen the query (see community.py:1025-1029) to include "
                "visits whose landmarks[].photo are set."
            )
        for it in items:
            if it["source"] == "custom":
                assert it.get("landmark_name"), "custom highlight missing landmark_name label"


# ---------- Like + comment side-effects ----------
class TestInteractionSideEffects:
    def test_like_updates_likes_count_and_is_liked(self, admin_headers):
        # Get current highlight — but for determinism, use top with likes desc and pick the top1
        r = requests.get(f"{API}/community-highlights/top?limit=20", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        if not items:
            pytest.skip("no items")
        # Find one with activity_id and not yet liked; skip ones already liked
        target = next((it for it in items if it.get("activity_id") and not it.get("is_liked")), None)
        if not target:
            # unlike first candidate with activity_id and is_liked True to reset
            reset = next((it for it in items if it.get("activity_id") and it.get("is_liked")), None)
            if reset:
                requests.delete(f"{API}/activities/{reset['activity_id']}/like", headers=admin_headers, timeout=30)
                target = reset
        assert target, "no usable target activity"
        aid = target["activity_id"]
        before_likes = target["likes_count"]

        # Like
        r = requests.post(f"{API}/activities/{aid}/like", headers=admin_headers, timeout=30)
        assert r.status_code in (200, 201), f"like failed: {r.status_code} {r.text}"

        # Re-fetch top and locate same item
        r2 = requests.get(f"{API}/community-highlights/top?limit=50", headers=admin_headers, timeout=30)
        items2 = r2.json()["items"]
        found = next((it for it in items2 if it.get("activity_id") == aid), None)
        assert found is not None, "item disappeared after like"
        assert found["likes_count"] == before_likes + 1, \
            f"likes_count did not increment: {before_likes} -> {found['likes_count']}"
        assert found["is_liked"] is True

        # Cleanup: unlike
        requests.delete(f"{API}/activities/{aid}/like", headers=admin_headers, timeout=30)

    def test_comment_updates_comments_count(self, admin_headers):
        r = requests.get(f"{API}/community-highlights/top?limit=20", headers=admin_headers, timeout=30)
        items = r.json()["items"]
        target = next((it for it in items if it.get("activity_id")), None)
        if not target:
            pytest.skip("no target")
        aid = target["activity_id"]
        before = target["comments_count"]

        r = requests.post(
            f"{API}/activities/{aid}/comment",
            headers=admin_headers,
            json={"content": "TEST_iter19_community_highlight_comment"},
            timeout=30,
        )
        assert r.status_code in (200, 201), f"comment failed: {r.status_code} {r.text}"
        comment_id = r.json().get("comment_id")

        r2 = requests.get(f"{API}/community-highlights/top?limit=50", headers=admin_headers, timeout=30)
        items2 = r2.json()["items"]
        found = next((it for it in items2 if it.get("activity_id") == aid), None)
        assert found is not None
        assert found["comments_count"] == before + 1, \
            f"comments_count did not update: {before} -> {found['comments_count']}"

        # Cleanup if possible
        if comment_id:
            requests.delete(f"{API}/activities/{aid}/comment/{comment_id}", headers=admin_headers, timeout=30)


# ---------- Regression ----------
class TestRegression:
    def test_community_feed_still_works(self, admin_headers):
        r = requests.get(f"{API}/community-feed", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        # Accept common shapes
        body = r.json()
        assert isinstance(body, (list, dict))

    def test_community_highlights_plural_trending_still_works(self, admin_headers):
        """The PLURAL endpoint /api/community-highlights (no /top) pre-dates this work
        and returns trending landmarks. It must NOT be broken."""
        r = requests.get(f"{API}/community-highlights", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        # Expect a dict with 'highlights' or similar — just ensure 2xx + json
        assert isinstance(body, dict)
        assert "highlights" in body, f"expected 'highlights' key, got: {list(body.keys())}"


# ---------- Empty state (contract assertion) ----------
class TestEmptyStateContract:
    def test_empty_state_shape_when_no_items_top(self, admin_headers):
        """We can't truly empty the DB; just assert contract: items is a list."""
        r = requests.get(f"{API}/community-highlights/top?limit=1", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json().get("items"), list)
