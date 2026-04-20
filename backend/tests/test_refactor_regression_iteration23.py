"""Iteration 23 refactor regression tests.

Covers the endpoints listed in the review request that were NOT already
covered by iteration_21/22 suites, after the split of friends.py into
routes/compare.py + routes/leaderboards.py + utils/social_stats.py.

Targets:
- GET /api/users/{id}/overlap              (moved to compare.py)
- GET /api/landmarks/{lid}/friends-visited (moved to compare.py)
- GET /api/users/{id}/profile              (stayed in friends.py)
- GET /api/users/{id}/visits               (stayed in friends.py)
- GET /api/users/{id}/activity             (stayed in friends.py)
- GET /api/users/search
- Basic friendship CRUD: /api/friends, /api/friends/pending, /api/friends/sent,
  POST /api/friends/request (idempotent / self-rejection), /api/friends/blocked-users
- Auth (401) + access control (403) on the moved endpoints
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://friends-hub-v2.preview.emergentagent.com",
).rstrip("/")

ADMIN_EMAIL = "test@wandermark.app"
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
    return {"token": token, "user_id": uid, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def mod_ctx():
    token, uid = _login(MOD_EMAIL, PWD)
    return {"token": token, "user_id": uid, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture(scope="module")
def admin_friend_id(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends", headers=admin_ctx["headers"], timeout=15)
    if r.status_code != 200:
        pytest.skip("Could not load admin friends")
    items = r.json()
    if not items:
        pytest.skip("Admin has no friends in this env")
    return items[0]["user_id"]


# ---------------- /api/users/{id}/overlap (moved to compare.py) ----------------
def test_user_overlap_friend_shape(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/overlap",
        headers=admin_ctx["headers"],
        timeout=20,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Shape: overlap endpoint returns shared-landmark items (list or dict with items)
    assert isinstance(body, (list, dict)), f"Unexpected body type: {type(body)}"
    if isinstance(body, dict):
        # Common shape: {items: [...]} or {landmarks: [...]} or stats dict
        assert body  # non-empty structure is fine (may still have empty items[])


def test_user_overlap_self(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_ctx['user_id']}/overlap",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text


def test_user_overlap_requires_auth(admin_friend_id):
    r = requests.get(f"{BASE_URL}/api/users/{admin_friend_id}/overlap", timeout=15)
    assert r.status_code in (401, 403)


def test_user_overlap_non_friend_403(admin_ctx, mod_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{mod_ctx['user_id']}/overlap",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    if r.status_code == 200:
        pytest.skip("Admin and Moderator are friends in this env")
    assert r.status_code == 403


# ---------------- /api/landmarks/{lid}/friends-visited ----------------
def test_landmark_friends_visited_unknown_landmark(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/landmarks/does_not_exist_xyz/friends-visited",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    # Should return 200 with empty list OR 404. Either is acceptable; must not 500.
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        body = r.json()
        # Accept {items: []}, [], or {friends: []}
        if isinstance(body, dict):
            items = body.get("items", body.get("friends", []))
        else:
            items = body
        assert isinstance(items, list)


def test_landmark_friends_visited_known_landmark(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/landmarks/france_eiffel_tower/friends-visited",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code in (200, 404), r.text


def test_landmark_friends_visited_requires_auth():
    r = requests.get(f"{BASE_URL}/api/landmarks/france_eiffel_tower/friends-visited", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- /api/users/{id}/profile (stayed in friends.py) ----------------
def test_user_profile_self(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_ctx['user_id']}/profile",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("user_id") == admin_ctx["user_id"]


def test_user_profile_friend(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/profile",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("user_id") == admin_friend_id


def test_user_profile_requires_auth(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/users/{admin_ctx['user_id']}/profile", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- /api/users/{id}/visits ----------------
def test_user_visits_self(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_ctx['user_id']}/visits",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, (list, dict))


def test_user_visits_friend(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/visits",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text


# ---------------- /api/users/{id}/activity ----------------
def test_user_activity_self(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_ctx['user_id']}/activity",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text


def test_user_activity_friend(admin_ctx, admin_friend_id):
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/activity",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text


# ---------------- /api/users/search ----------------
def test_users_search_basic(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/search?q=test",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, (list, dict))


def test_users_search_empty_query(admin_ctx):
    r = requests.get(
        f"{BASE_URL}/api/users/search?q=",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    # Either 200 with empty list or 400 validation
    assert r.status_code in (200, 400, 422), r.text


def test_users_search_requires_auth():
    r = requests.get(f"{BASE_URL}/api/users/search?q=test", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- Friendship CRUD basics ----------------
def test_friends_list(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends", headers=admin_ctx["headers"], timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_friends_pending(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends/pending", headers=admin_ctx["headers"], timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_friends_sent(admin_ctx):
    r = requests.get(f"{BASE_URL}/api/friends/sent", headers=admin_ctx["headers"], timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_friends_request_self_rejected(admin_ctx):
    r = requests.post(
        f"{BASE_URL}/api/friends/request",
        headers=admin_ctx["headers"],
        json={"user_id": admin_ctx["user_id"]},
        timeout=15,
    )
    assert r.status_code in (400, 403, 409, 422), r.text


def test_friends_request_to_existing_friend_is_handled(admin_ctx, admin_friend_id):
    """Re-requesting an already-accepted friend should not 500.
    Endpoint expects {friend_username} per friends.py schema.
    Look up the friend's username first.
    """
    prof = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/profile",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    if prof.status_code != 200 or not prof.json().get("username"):
        pytest.skip("Could not resolve friend username")
    username = prof.json()["username"]
    r = requests.post(
        f"{BASE_URL}/api/friends/request",
        headers=admin_ctx["headers"],
        json={"friend_username": username},
        timeout=15,
    )
    assert r.status_code in (200, 201, 400, 409), r.text


def test_blocked_users_list(admin_ctx):
    # Route is /api/blocked-users (registered under friends.router without /friends prefix)
    r = requests.get(
        f"{BASE_URL}/api/blocked-users",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_friends_list_requires_auth():
    r = requests.get(f"{BASE_URL}/api/friends", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- Refactor sanity: new router mounts didn't duplicate ----------------
def test_leaderboard_still_under_friends_namespace(admin_ctx):
    """Leaderboard moved to leaderboards.py but URL must remain /api/friends/leaderboard."""
    r = requests.get(
        f"{BASE_URL}/api/friends/leaderboard?metric=points",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "metric" in body and "rows" in body


def test_compare_endpoint_still_reachable(admin_ctx, admin_friend_id):
    """compare-stats moved to compare.py but URL must remain /api/users/{id}/compare-stats."""
    r = requests.get(
        f"{BASE_URL}/api/users/{admin_friend_id}/compare-stats",
        headers=admin_ctx["headers"],
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "me" in body and "friend" in body
