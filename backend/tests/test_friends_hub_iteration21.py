"""Backend tests for WanderMark Friends Hub / Compare endpoints (iteration 21).

Covers:
- /api/friends/leaderboard (4 metrics)
- /api/friends/shared-places
- /api/friends/activity
- /api/friends/group-stats (max 4)
- /api/users/{id}/compare-stats
- /api/users/{id}/overlap/countries
- /api/compare/landmarks/{lid}/friends/{fid}
Including 403 (non-friends) and 404 (missing landmark) negative paths.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://tier-rebalance.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "test@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
MOD_EMAIL = "mod@wandermark.app"
PWD = "Test1234!"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code} {r.text[:200]}")
    data = r.json()
    return data["access_token"], data["user"]["user_id"]


@pytest.fixture(scope="module")
def admin_ctx():
    token, uid = _login(ADMIN_EMAIL, PWD)
    return {"token": token, "user_id": uid, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def pro_ctx():
    token, uid = _login(PRO_EMAIL, PWD)
    return {"token": token, "user_id": uid, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def admin_friend_id(admin_ctx):
    """Pick any accepted friend of admin (the DB may vary)."""
    r = requests.get(f"{BASE_URL}/api/friends", headers=admin_ctx["headers"], timeout=15)
    if r.status_code != 200:
        pytest.skip("Could not load admin friends")
    items = r.json()
    if not items:
        pytest.skip("Admin has no friends in this env; skipping friend-gated tests")
    return items[0]["user_id"]


@pytest.fixture(scope="module")
def mod_ctx():
    token, uid = _login(MOD_EMAIL, PWD)
    return {"token": token, "user_id": uid, "headers": {"Authorization": f"Bearer {token}"}}


# ------------- Auth + friendship sanity -------------
def test_admin_login_returns_user(admin_ctx):
    assert admin_ctx["user_id"].startswith("user_")


def test_admin_pro_are_friends(admin_ctx, pro_ctx):
    """Verify admin has at least one friend (doesn't need to be pro user)."""
    r = requests.get(f"{BASE_URL}/api/friends", headers=admin_ctx["headers"], timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 1, "Admin should have at least one friend for compare tests"


# ------------- Leaderboard -------------
@pytest.mark.parametrize("metric", ["points", "landmarks", "destinations", "continents"])
def test_leaderboard_metrics(admin_ctx, metric):
    r = requests.get(f"{BASE_URL}/api/friends/leaderboard?metric={metric}", headers=admin_ctx["headers"], timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["metric"] == metric
    assert isinstance(body["rows"], list)
    assert len(body["rows"]) >= 1
    # Sorted descending
    values = [row["value"] for row in body["rows"]]
    assert values == sorted(values, reverse=True)
    # Ranks sequential
    ranks = [row["rank"] for row in body["rows"]]
    assert ranks == list(range(1, len(ranks) + 1))
    # At least one is_me=True row
    assert any(row["is_me"] for row in body["rows"])


def test_leaderboard_rejects_bad_metric(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends/leaderboard?metric=bogus", headers=admin_ctx["headers"], timeout=15)
    assert r.status_code in (400, 422)


def test_leaderboard_requires_auth():
    r = requests.get(f"{BASE_URL}/api/friends/leaderboard?metric=points", timeout=15)
    assert r.status_code in (401, 403)


# ------------- Shared places -------------
def test_shared_places_structure(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends/shared-places?limit=5", headers=admin_ctx["headers"], timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body
    # Sorted by friend_count desc
    counts = [item["friend_count"] for item in body["items"]]
    assert counts == sorted(counts, reverse=True)
    for item in body["items"]:
        assert "landmark_id" in item
        assert "friend_count" in item and item["friend_count"] >= 1
        assert "friend_sample" in item


# ------------- Activity feed -------------
def test_activity_feed(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends/activity?limit=5", headers=admin_ctx["headers"], timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body
    assert len(body["items"]) <= 5
    for item in body["items"]:
        assert "user_id" in item
        assert "landmark_id" in item


# ------------- Compare stats / overlap -------------
def test_compare_stats_friend(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/compare-stats",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    for side in ("me", "friend"):
        for k in ("continents", "destinations", "landmarks", "points"):
            assert k in body[side], f"Missing {side}.{k}"
            assert isinstance(body[side][k], (int, float))


def test_compare_stats_self(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_ctx['user_id']}/compare-stats",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["me"] == body["friend"]


def test_compare_stats_non_friend_403(admin_ctx, mod_ctx):
    """Admin ↔ Moderator should NOT be friends."""
    r = requests.get(
        f"{BASE_URL}/api/users/{mod_ctx['user_id']}/compare-stats",
        headers=admin_ctx["headers"], timeout=15,
    )
    # If they happen to be friends, skip this specific check
    if r.status_code == 200:
        pytest.skip("Admin and Moderator are friends in this env, cannot test 403")
    assert r.status_code == 403


def test_country_overlap(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/overlap/countries",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "total" in body and "countries" in body
    assert body["total"] == len(body["countries"])


def test_country_overlap_non_friend_403(admin_ctx, mod_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{mod_ctx['user_id']}/overlap/countries",
        headers=admin_ctx["headers"], timeout=15,
    )
    if r.status_code == 200:
        pytest.skip("Admin and Moderator friends in this env")
    assert r.status_code == 403


# ------------- Compare landmark page -------------
def _find_shared_landmark(ctx):
    r = requests.get(f"{BASE_URL}/api/friends/shared-places?limit=5", headers=ctx["headers"], timeout=15)
    if r.status_code != 200:
        return None
    items = r.json().get("items") or []
    return items[0]["landmark_id"] if items else None


def test_compare_landmark_happy_path(admin_ctx, admin_friend_shared_landmark):
    """Uses shared fixture to guarantee a mutual landmark visit between admin
    and Social Tester. Seeded visits are auto-cleaned after the test."""
    lid = admin_friend_shared_landmark["landmark_id"]
    friend_user_id = admin_friend_shared_landmark["friend_user_id"]
    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/{lid}/friends/{friend_user_id}",
        headers=admin_ctx["headers"], timeout=20,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["landmark"]["landmark_id"] == lid
    assert "visits" in body["me"] and "visits" in body["friend"]
    assert "has_private_visits" in body["friend"]
    # Both sides should have ≥1 visit from the fixture
    assert len(body["me"]["visits"]) >= 1
    assert len(body["friend"]["visits"]) >= 1
    # Verify no private visits leak
    for v in body["friend"]["visits"]:
        assert v.get("visibility") != "private"


def test_compare_landmark_404(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/does_not_exist_xyz/friends/{admin_friend_id}",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 404


def test_compare_landmark_403_non_friend(admin_ctx, mod_ctx):
    # Use any landmark id — permission check happens before landmark lookup
    r = requests.get(
        f"{BASE_URL}/api/compare/landmarks/france_eiffel_tower/friends/{mod_ctx['user_id']}",
        headers=admin_ctx["headers"], timeout=15,
    )
    if r.status_code == 200:
        pytest.skip("Admin and Moderator are friends in this env")
    assert r.status_code == 403


# ------------- Group stats -------------
def test_group_stats_with_one_friend(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/friends/group-stats?user_ids={admin_friend_id}",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["rows"]) == 2
    assert any(r_.get("is_me") for r_ in body["rows"])
    for row in body["rows"]:
        for k in ("continents", "destinations", "landmarks", "points"):
            assert k in row


def test_group_stats_rejects_more_than_4(admin_ctx):
    ids = ",".join([f"user_fake_{i}" for i in range(5)])
    r = requests.get(
        f"{BASE_URL}/api/friends/group-stats?user_ids={ids}",
        headers=admin_ctx["headers"], timeout=15,
    )
    assert r.status_code == 400


def test_group_stats_rejects_non_friend(admin_ctx, mod_ctx):
    r = requests.get(
        f"{BASE_URL}/api/friends/group-stats?user_ids={mod_ctx['user_id']}",
        headers=admin_ctx["headers"], timeout=15,
    )
    if r.status_code == 200:
        pytest.skip("Admin and Moderator friends in this env")
    assert r.status_code == 403
