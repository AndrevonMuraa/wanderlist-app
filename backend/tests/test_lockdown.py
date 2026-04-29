"""Tests for the Emergency Lockdown break-glass kill switch."""
import os
import time

import pyotp
import pytest
import requests
from pymongo import MongoClient

API_URL = os.environ.get("API_BASE", "http://localhost:8001")


def _login(email: str, password: str, totp_code: str | None = None) -> str:
    body = {"email": email, "password": password}
    if totp_code is not None:
        body["totp_code"] = totp_code
    r = requests.post(f"{API_URL}/api/auth/login", json=body, timeout=10)
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(autouse=True)
def reset_state(db):
    """Lockdown is global — wipe before AND after every test for isolation."""
    def _wipe():
        db.system_flags.delete_many({})
        # Wipe 2FA state on the super admin so each test can re-set it
        db.users.update_one(
            {"email": "test@wandermark.app"},
            {"$unset": {
                "totp_enabled": "", "totp_secret": "", "totp_pending_secret": "",
                "totp_backup_codes": "", "totp_grace_started_at": "",
            }},
        )
    _wipe()
    yield
    _wipe()


@pytest.fixture
def admin_headers():
    return {"Authorization": f"Bearer {_login('test@wandermark.app', 'Test1234!')}"}


@pytest.fixture
def mod_headers():
    return {"Authorization": f"Bearer {_login('mod@wandermark.app', 'Test1234!')}"}


# ---------------------------------------------------------------------------
# Status / enable / disable
# ---------------------------------------------------------------------------

def test_status_requires_super_admin(mod_headers):
    r = requests.get(f"{API_URL}/api/admin/lockdown/status", headers=mod_headers, timeout=10)
    assert r.status_code == 403


def test_enable_requires_super_admin(mod_headers):
    r = requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=mod_headers, json={}, timeout=10,
    )
    assert r.status_code == 403


def test_status_initially_off(admin_headers):
    r = requests.get(f"{API_URL}/api/admin/lockdown/status", headers=admin_headers, timeout=10)
    assert r.status_code == 200
    assert r.json().get("admin_lockdown", False) is False


def test_enable_then_status_reflects_on(admin_headers):
    r1 = requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=admin_headers, json={}, timeout=10,
    )
    assert r1.status_code == 200
    assert r1.json()["admin_lockdown"] is True

    r2 = requests.get(f"{API_URL}/api/admin/lockdown/status", headers=admin_headers, timeout=10)
    assert r2.json()["admin_lockdown"] is True


# ---------------------------------------------------------------------------
# Lockdown blocks write endpoints
# ---------------------------------------------------------------------------

def test_lockdown_blocks_warn_endpoint(admin_headers):
    requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=admin_headers, json={}, timeout=10,
    )
    target = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": "testpro@wandermark.app", "password": "Test1234!"}, timeout=10,
    ).json()["user"]["user_id"]

    r = requests.post(
        f"{API_URL}/api/admin/users/{target}/warn",
        headers=admin_headers,
        json={"reason": "test", "message": "blocked"},
        timeout=10,
    )
    assert r.status_code == 503
    detail = r.json()["detail"]
    assert isinstance(detail, dict) and detail["admin_lockdown"] is True


def test_lockdown_blocks_tier_change(admin_headers):
    requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=admin_headers, json={}, timeout=10,
    )
    target = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": "testpro@wandermark.app", "password": "Test1234!"}, timeout=10,
    ).json()["user"]["user_id"]

    r = requests.put(
        f"{API_URL}/api/admin/users/{target}/tier",
        headers=admin_headers, json={"tier": "free"}, timeout=10,
    )
    assert r.status_code == 503


def test_lockdown_does_not_block_reads(admin_headers):
    """Reads should remain open so the operator can audit during lockdown."""
    requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=admin_headers, json={}, timeout=10,
    )
    r = requests.get(f"{API_URL}/api/admin/users?limit=5", headers=admin_headers, timeout=10)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Disable requires 2FA
# ---------------------------------------------------------------------------

def test_disable_without_2fa_setup_rejected(admin_headers):
    requests.post(
        f"{API_URL}/api/admin/lockdown/enable",
        headers=admin_headers, json={}, timeout=10,
    )
    r = requests.post(
        f"{API_URL}/api/admin/lockdown/disable",
        headers=admin_headers, json={}, timeout=10,
    )
    assert r.status_code == 403
    assert "2FA" in r.json()["detail"]


def test_disable_with_valid_totp_succeeds(db):
    # Enroll the super-admin in 2FA first
    admin_token = _login("test@wandermark.app", "Test1234!")
    headers = {"Authorization": f"Bearer {admin_token}"}
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    secret = setup["secret"]
    confirm_code = pyotp.TOTP(secret).now()
    requests.post(f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": confirm_code}, timeout=10)

    # Now login again with 2FA to get a fresh token
    fresh_code = pyotp.TOTP(secret).now()
    admin_token = _login("test@wandermark.app", "Test1234!", totp_code=fresh_code)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Enable lockdown
    requests.post(f"{API_URL}/api/admin/lockdown/enable", headers=headers, json={}, timeout=10)

    # Disable with wrong code → 401
    r_bad = requests.post(
        f"{API_URL}/api/admin/lockdown/disable",
        headers=headers, json={"code": "000000"}, timeout=10,
    )
    assert r_bad.status_code == 401

    # Sleep until we're well into the next 30s window, ensuring a fresh totp
    time.sleep(0.5)
    disable_code = pyotp.TOTP(secret).now()
    r_good = requests.post(
        f"{API_URL}/api/admin/lockdown/disable",
        headers=headers, json={"code": disable_code}, timeout=10,
    )
    assert r_good.status_code == 200
    assert r_good.json()["admin_lockdown"] is False
