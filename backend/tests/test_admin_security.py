"""Security tests for moderator/super-admin tier-change lockdown + stealth.

These verify that:
  - Moderators CANNOT change subscription tier on either endpoint
  - Super admins CAN, but are rate-limited daily (and can raise the cap)
  - All tier mutations are audit-logged
  - Search and leaderboards do not expose super-admin accounts
  - Mod messages anonymize the moderator name as 'WanderMark Safety Team'
"""
import os
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

API_URL = os.environ.get("API_BASE", "http://localhost:8001")


def _login(email: str, password: str) -> str:
    r = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {_login('test@wandermark.app', 'Test1234!')}"}


@pytest.fixture(scope="module")
def mod_headers():
    return {"Authorization": f"Bearer {_login('mod@wandermark.app', 'Test1234!')}"}


@pytest.fixture(scope="module")
def pro_user_id():
    """Find user_id of testpro@wandermark.app via /api/auth/login response."""
    r = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": "testpro@wandermark.app", "password": "Test1234!"},
        timeout=10,
    )
    return r.json()["user"]["user_id"]


@pytest.fixture(autouse=True)
def reset_quota_each_test():
    """Reset the super-admin's tier quota counter between tests so cap tests
    don't bleed across runs."""
    async def _reset():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        await db.tier_quota.delete_many({})
    asyncio.run(_reset())


# ---------------------------------------------------------------------------
# Subscription tier lockdown
# ---------------------------------------------------------------------------

def test_moderator_cannot_change_tier_via_users_endpoint(mod_headers, pro_user_id):
    r = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}",
        json={"subscription_tier": "free"},
        headers=mod_headers,
        timeout=10,
    )
    assert r.status_code == 403
    assert "Super Admin" in r.json().get("detail", "")


def test_moderator_cannot_change_tier_via_tier_endpoint(mod_headers, pro_user_id):
    r = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "free"},
        headers=mod_headers,
        timeout=10,
    )
    assert r.status_code == 403


def test_super_admin_can_change_tier(admin_headers, pro_user_id):
    r = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "pro"},
        headers=admin_headers,
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json()["tier"] == "pro"


def test_super_admin_rate_limited_after_quota_exceeded(admin_headers, pro_user_id):
    # Set the limit very low and consume it
    r1 = requests.post(
        f"{API_URL}/api/admin/tier-quota/reset",
        json={"limit": 2},
        headers=admin_headers,
        timeout=10,
    )
    assert r1.status_code == 200

    # First two should pass
    for _ in range(2):
        r = requests.put(
            f"{API_URL}/api/admin/users/{pro_user_id}/tier",
            json={"tier": "pro"},
            headers=admin_headers,
            timeout=10,
        )
        assert r.status_code == 200

    # Third should hit the cap
    r3 = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "pro"},
        headers=admin_headers,
        timeout=10,
    )
    assert r3.status_code == 429
    assert "Daily tier-change limit reached" in r3.json()["detail"]


def test_super_admin_can_raise_quota_to_unblock(admin_headers, pro_user_id):
    requests.post(
        f"{API_URL}/api/admin/tier-quota/reset",
        json={"limit": 1},
        headers=admin_headers,
        timeout=10,
    )
    requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "pro"},
        headers=admin_headers,
        timeout=10,
    )
    # Hit the cap
    blocked = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "free"},
        headers=admin_headers,
        timeout=10,
    )
    assert blocked.status_code == 429

    # Bump the quota
    requests.post(
        f"{API_URL}/api/admin/tier-quota/reset",
        json={"limit": 50},
        headers=admin_headers,
        timeout=10,
    )

    unblocked = requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "free"},
        headers=admin_headers,
        timeout=10,
    )
    assert unblocked.status_code == 200


def test_tier_change_is_audit_logged(admin_headers, pro_user_id):
    requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "pro"},
        headers=admin_headers,
        timeout=10,
    )

    async def _check():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        log = await db.admin_logs.find_one(
            {"action": "tier_change", "target_id": pro_user_id},
            sort=[("created_at", -1)],
        )
        return log is not None

    assert asyncio.run(_check()) is True


def test_tier_quota_get_reflects_usage(admin_headers, pro_user_id):
    requests.put(
        f"{API_URL}/api/admin/users/{pro_user_id}/tier",
        json={"tier": "pro"},
        headers=admin_headers,
        timeout=10,
    )
    r = requests.get(
        f"{API_URL}/api/admin/tier-quota", headers=admin_headers, timeout=10
    )
    assert r.status_code == 200
    body = r.json()
    assert body["used"] >= 1
    assert body["limit"] >= 1


# ---------------------------------------------------------------------------
# Stealth — super-admin hidden from public surfaces, name anonymized
# ---------------------------------------------------------------------------

def test_super_admin_excluded_from_user_search(admin_headers):
    # Look for the admin user by username — should NOT appear
    r = requests.get(
        f"{API_URL}/api/users/search?q=test", headers=admin_headers, timeout=10
    )
    assert r.status_code == 200
    results = r.json()
    # Make sure no result has role admin
    async def _verify():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        admin_user = await db.users.find_one(
            {"role": "admin"}, {"_id": 0, "user_id": 1}
        )
        return admin_user["user_id"] if admin_user else None

    admin_id = asyncio.run(_verify())
    assert admin_id is not None
    for r_item in results:
        assert r_item["user_id"] != admin_id, "Super-admin should be hidden from search"


def test_super_admin_excluded_from_global_leaderboard(admin_headers):
    r = requests.get(
        f"{API_URL}/api/leaderboard?category=points&period=all&friends_only=false",
        headers=admin_headers,
        timeout=10,
    )
    assert r.status_code == 200
    body = r.json()

    async def _admin_id():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        u = await db.users.find_one({"role": "admin"}, {"_id": 0, "user_id": 1})
        return u["user_id"] if u else None

    admin_id = asyncio.run(_admin_id())
    for entry in body.get("leaderboard", []):
        assert entry["user_id"] != admin_id


def test_moderator_message_is_anonymized(admin_headers, pro_user_id):
    """When a super-admin sends a moderator message, the user-facing notification
    is signed 'WanderMark Safety Team' — never the real admin's name."""
    r = requests.post(
        f"{API_URL}/api/admin/users/{pro_user_id}/message",
        json={"title": "Hi", "message": "Just a friendly note."},
        headers=admin_headers,
        timeout=10,
    )
    assert r.status_code == 200

    async def _latest_notif():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        n = await db.notifications.find_one(
            {"user_id": pro_user_id, "type": "moderator_message"},
            sort=[("created_at", -1)],
        )
        return n

    notif = asyncio.run(_latest_notif())
    assert notif is not None
    assert "WanderMark Safety Team" in notif["message"]
    # Must NOT contain the real admin name
    assert "Test User" not in notif["message"]
