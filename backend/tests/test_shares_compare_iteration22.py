"""Backend regression + new-feature tests for iteration 22.

Scope:
- NEW: POST /api/shares accepts share_type='compare' (+ landmark_id in period)
- REGRESSION: POST /api/shares still accepts top_month/top_all/journey/rank/visit
- POST /api/shares rejects unknown share_type with 400 + lists allowed types
- POST /api/shares requires auth (401 without token)
- GET /api/admin/shares/stats returns totals_by_type + top_sharers (admin only)
- GET /api/compare/landmarks/{lid}/friends/{fid} returns landmark+me+friend payload
  (includes photo_count + visits[] on both sides) — OR gracefully skipped if no overlap
- GET /api/compare/landmarks/... returns 403 for non-friend pairs
- Sanity: Friends hub endpoints (/api/friends/leaderboard, shared-places) still 200
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://memory-recap-2026.preview.emergentagent.com",
).rstrip("/")

ADMIN_EMAIL = "test@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
MOD_EMAIL = "mod@wandermark.app"
PWD = "Test1234!"


def _login(email, password):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code} {r.text[:200]}")
    data = r.json()
    return data["access_token"], data["user"]["user_id"]


@pytest.fixture(scope="module")
def admin_ctx():
    token, uid = _login(ADMIN_EMAIL, PWD)
    return {
        "token": token,
        "user_id": uid,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture(scope="module")
def pro_ctx():
    token, uid = _login(PRO_EMAIL, PWD)
    return {
        "token": token,
        "user_id": uid,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture(scope="module")
def mod_ctx():
    token, uid = _login(MOD_EMAIL, PWD)
    return {
        "token": token,
        "user_id": uid,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture(scope="module")
def admin_friend_id(admin_ctx):
    """Pick any accepted friend of admin."""
    r = requests.get(f"{BASE_URL}/api/friends", headers=admin_ctx["headers"], timeout=15)
    if r.status_code != 200 or not r.json():
        pytest.skip("Admin has no friends in this env")
    return r.json()[0]["user_id"]


# ---------- Health ----------
def test_backend_reachable():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    # root/api may 200 or 404 depending on router — just confirm no 5xx
    assert r.status_code < 500, r.text


# ---------- POST /api/shares: auth ----------
def test_shares_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/shares",
        json={"share_type": "compare", "period": "landmark_123"},
        timeout=15,
    )
    assert r.status_code in (401, 403), (
        f"Expected 401/403 without auth, got {r.status_code}: {r.text[:200]}"
    )


# ---------- POST /api/shares: NEW compare type ----------
def test_shares_accepts_compare_type(admin_ctx):
    r = requests.post(
        f"{BASE_URL}/api/shares",
        headers=admin_ctx["headers"],
        json={"share_type": "compare", "period": "landmark_eiffel_tower"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True, data


def test_shares_accepts_compare_type_no_period(admin_ctx):
    r = requests.post(
        f"{BASE_URL}/api/shares",
        headers=admin_ctx["headers"],
        json={"share_type": "compare"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("success") is True


# ---------- POST /api/shares: existing types regression ----------
@pytest.mark.parametrize(
    "share_type",
    ["top_month", "top_all", "journey", "rank", "visit"],
)
def test_shares_regression_existing_types(admin_ctx, share_type):
    r = requests.post(
        f"{BASE_URL}/api/shares",
        headers=admin_ctx["headers"],
        json={"share_type": share_type, "period": "April 2026"},
        timeout=15,
    )
    assert r.status_code == 200, f"{share_type}: {r.text}"
    assert r.json().get("success") is True


# ---------- POST /api/shares: invalid type ----------
def test_shares_rejects_invalid_type(admin_ctx):
    r = requests.post(
        f"{BASE_URL}/api/shares",
        headers=admin_ctx["headers"],
        json={"share_type": "not_a_real_type", "period": "x"},
        timeout=15,
    )
    assert r.status_code == 400, r.text
    detail = r.json().get("detail", "")
    # Must list the allowed types for debugability
    assert "compare" in detail, f"Allowed list should include 'compare': {detail}"
    for t in ("top_month", "top_all", "journey", "rank", "visit"):
        assert t in detail, f"Allowed list missing {t}: {detail}"


# ---------- GET /api/admin/shares/stats ----------
def test_admin_shares_stats_admin_ok(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/admin/shares/stats",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "totals_by_type" in data
    assert "top_sharers" in data
    assert isinstance(data["totals_by_type"], dict)
    assert isinstance(data["top_sharers"], list)
    # Because we just POSTed a compare share, it must be visible in aggregates
    assert data["totals_by_type"].get("compare", 0) >= 1, data["totals_by_type"]
    # top_sharers shape
    if data["top_sharers"]:
        s = data["top_sharers"][0]
        for k in ("user_id", "share_count"):
            assert k in s, s


def test_admin_shares_stats_rejects_non_admin(pro_ctx):
    r = requests.get(
        f"{BASE_URL}/api/admin/shares/stats",
        headers=pro_ctx["headers"],
        timeout=15,
    )
    assert r.status_code in (401, 403), (
        f"Pro user must not access admin stats; got {r.status_code}"
    )


# ---------- GET /api/compare/landmarks/{lid}/friends/{fid} ----------
def test_compare_landmark_happy_path(admin_ctx, admin_friend_shared_landmark):
    """Fixture seeds a shared landmark between admin + Social Tester, then
    verifies payload shape end-to-end. Seeded visits are auto-cleaned."""
    landmark_id = admin_friend_shared_landmark["landmark_id"]
    friend_user_id = admin_friend_shared_landmark["friend_user_id"]

    r2 = requests.get(
        f"{BASE_URL}/api/compare/landmarks/{landmark_id}/friends/{friend_user_id}",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r2.status_code == 200, r2.text
    payload = r2.json()
    assert "landmark" in payload, payload
    assert payload["landmark"]["landmark_id"] == landmark_id
    assert "me" in payload, payload
    assert "friend" in payload, payload
    for side in ("me", "friend"):
        assert "visits" in payload[side], f"{side} missing visits: {payload[side]}"
        assert "photo_count" in payload[side], f"{side} missing photo_count: {payload[side]}"
        assert isinstance(payload[side]["visits"], list)
        assert isinstance(payload[side]["photo_count"], int)
        # Each seeded visit has 1 photo
        assert payload[side]["photo_count"] >= 1, f"{side} should have >=1 photo from fixture"
        assert len(payload[side]["visits"]) >= 1, f"{side} should have >=1 visit"
    # Friend-side should never leak 'private' visibility
    for v in payload["friend"]["visits"]:
        assert v.get("visibility") != "private"
    # has_private_visits flag exists on friend side
    assert "has_private_visits" in payload["friend"]


def test_compare_landmark_403_non_friend(admin_ctx, mod_ctx):
    """Admin + mod are NOT friends → 403 even on a synthetic landmark id."""
    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/landmark_synthetic_xyz/friends/{mod_ctx['user_id']}",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    # Must be 403 (permission leak guard) NOT 404 — confirmed in iteration_21
    assert r.status_code == 403, (
        f"Expected 403 for non-friend compare, got {r.status_code}: {r.text[:200]}"
    )


@pytest.mark.parametrize(
    "admin_friend_shared_landmark",
    [{"include_private_friend_visit": True}],
    indirect=True,
)
def test_compare_landmark_has_private_visits_flag(admin_ctx, admin_friend_shared_landmark):
    """Covers the only remaining branch of the compare-landmark endpoint:
    when the friend has a `private` visit on the same landmark, the viewer
    must NOT see that visit in `friend.visits`, but `has_private_visits`
    MUST be True so the UI can render the respectful 'X has a private visit
    here' hint. Fixture cleans up all 3 seeded visits after the test."""
    landmark_id = admin_friend_shared_landmark["landmark_id"]
    friend_user_id = admin_friend_shared_landmark["friend_user_id"]
    private_visit_id = admin_friend_shared_landmark["friend_private_visit_id"]
    assert private_visit_id, "fixture should have seeded a private visit"

    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/{landmark_id}/friends/{friend_user_id}",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r.status_code == 200, r.text
    payload = r.json()

    # Flag must flip to True when the friend has ≥1 private visit on this landmark
    assert payload["friend"]["has_private_visits"] is True, (
        f"has_private_visits should be True; got payload={payload['friend']}"
    )

    # Privacy leak guard: the private visit must NOT appear in friend.visits
    friend_visit_ids = [v.get("visit_id") for v in payload["friend"]["visits"]]
    assert private_visit_id not in friend_visit_ids, (
        f"Private visit {private_visit_id} leaked into friend.visits: {friend_visit_ids}"
    )
    for v in payload["friend"]["visits"]:
        assert v.get("visibility") != "private"


def test_compare_landmark_requires_auth():
    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/landmark_x/friends/user_y",
        timeout=10,
    )
    assert r.status_code in (401, 403)


# ---------- Friends hub sanity regressions ----------
def test_friends_leaderboard_regression(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/friends/leaderboard?metric=points",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # Endpoint returns {metric, rows:[...]}
    assert isinstance(data, dict) and "rows" in data, data
    assert isinstance(data["rows"], list)


def test_friends_shared_places_regression(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/friends/shared-places",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r.status_code == 200, r.text
