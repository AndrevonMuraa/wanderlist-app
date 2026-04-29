"""Tests for TOTP 2FA enrollment, login challenge, backup codes, and
super-admin grace-period enforcement.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

import pyotp
import pytest
import requests
from pymongo import MongoClient

API_URL = os.environ.get("API_BASE", "http://localhost:8001")


def _login(email: str, password: str, totp_code: str | None = None) -> requests.Response:
    body = {"email": email, "password": password}
    if totp_code is not None:
        body["totp_code"] = totp_code
    return requests.post(f"{API_URL}/api/auth/login", json=body, timeout=10)


def _login_token(email: str, password: str, totp_code: str | None = None) -> str:
    r = _login(email, password, totp_code)
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def db():
    client = MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


@pytest.fixture(autouse=True)
def reset_user_2fa(db):
    """Wipe 2FA state on test users before each test to keep tests isolated."""
    unset = {
        "totp_enabled": "",
        "totp_secret": "",
        "totp_pending_secret": "",
        "totp_backup_codes": "",
        "totp_enabled_at": "",
        "totp_grace_started_at": "",
    }
    db.users.update_one({"email": "testpro@wandermark.app"}, {"$unset": unset})
    db.users.update_one({"email": "test@wandermark.app"}, {"$unset": unset})


@pytest.fixture
def headers():
    return {"Authorization": f"Bearer {_login_token('testpro@wandermark.app', 'Test1234!')}"}


# ---------------------------------------------------------------------------
# Setup → Confirm
# ---------------------------------------------------------------------------

def test_setup_returns_qr_and_secret(headers):
    r = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data["secret"]) >= 16
    assert data["otpauth_uri"].startswith("otpauth://totp/")
    assert data["qr_code_data_url"].startswith("data:image/png;base64,")
    assert data["issuer"] == "WanderMark"


def test_confirm_with_invalid_code_rejected(headers):
    requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10)
    r = requests.post(
        f"{API_URL}/api/2fa/confirm", headers=headers,
        json={"code": "000000"}, timeout=10,
    )
    assert r.status_code == 400


def test_confirm_with_valid_code_enables_and_returns_backup_codes(headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    code = pyotp.TOTP(setup["secret"]).now()
    r = requests.post(
        f"{API_URL}/api/2fa/confirm", headers=headers,
        json={"code": code}, timeout=10,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is True
    assert len(body["backup_codes"]) == 10
    # All backup codes are 8 hex chars + dash
    for c in body["backup_codes"]:
        assert len(c) == 9 and c[4] == "-"


def test_status_reflects_enabled(headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    code = pyotp.TOTP(setup["secret"]).now()
    requests.post(f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": code}, timeout=10)
    r = requests.get(f"{API_URL}/api/2fa/status", headers=headers, timeout=10)
    body = r.json()
    assert body["enabled"] is True
    assert body["backup_codes_remaining"] == 10


# ---------------------------------------------------------------------------
# Login challenge
# ---------------------------------------------------------------------------

def test_login_without_totp_when_enabled_returns_challenge(headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    code = pyotp.TOTP(setup["secret"]).now()
    requests.post(f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": code}, timeout=10)

    r = _login("testpro@wandermark.app", "Test1234!")
    assert r.status_code == 401
    detail = r.json()["detail"]
    assert isinstance(detail, dict) and detail["requires_2fa"] is True


def test_login_with_valid_totp_succeeds(headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    secret = setup["secret"]
    code = pyotp.TOTP(secret).now()
    requests.post(f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": code}, timeout=10)

    # Generate a fresh code (might be the same window)
    fresh_code = pyotp.TOTP(secret).now()
    r = _login("testpro@wandermark.app", "Test1234!", totp_code=fresh_code)
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_with_backup_code_succeeds_and_consumes_it(db, headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    secret = setup["secret"]
    code = pyotp.TOTP(secret).now()
    confirm = requests.post(
        f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": code}, timeout=10
    ).json()

    backup = confirm["backup_codes"][0]
    r = _login("testpro@wandermark.app", "Test1234!", totp_code=backup)
    assert r.status_code == 200
    # Backup consumption is async on the backend — give it a beat to finish
    import time
    time.sleep(0.5)

    # Reusing the same backup code should fail
    r2 = _login("testpro@wandermark.app", "Test1234!", totp_code=backup)
    assert r2.status_code == 401


# ---------------------------------------------------------------------------
# Disable
# ---------------------------------------------------------------------------

def test_disable_requires_valid_code(headers):
    setup = requests.post(f"{API_URL}/api/2fa/setup", headers=headers, timeout=10).json()
    code = pyotp.TOTP(setup["secret"]).now()
    requests.post(f"{API_URL}/api/2fa/confirm", headers=headers, json={"code": code}, timeout=10)

    r = requests.post(
        f"{API_URL}/api/2fa/disable", headers=headers, json={"code": "000000"}, timeout=10,
    )
    assert r.status_code == 401

    fresh = pyotp.TOTP(setup["secret"]).now()
    r2 = requests.post(
        f"{API_URL}/api/2fa/disable", headers=headers, json={"code": fresh}, timeout=10,
    )
    assert r2.status_code == 200


# ---------------------------------------------------------------------------
# Super-admin grace period
# ---------------------------------------------------------------------------

def test_super_admin_first_login_starts_grace(db):
    # No 2FA, no grace_started → login succeeds and grace is recorded
    r = _login("test@wandermark.app", "Test1234!")
    assert r.status_code == 200
    user = db.users.find_one(
        {"email": "test@wandermark.app"}, {"_id": 0, "totp_grace_started_at": 1}
    )
    assert user.get("totp_grace_started_at") is not None


def test_super_admin_grace_expired_blocks_login(db):
    # Force grace_started_at to 30 days ago
    far_past = datetime.now(timezone.utc) - timedelta(days=30)
    db.users.update_one(
        {"email": "test@wandermark.app"},
        {"$set": {"totp_grace_started_at": far_past}},
    )
    r = _login("test@wandermark.app", "Test1234!")
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert isinstance(detail, dict) and detail["requires_2fa_setup"] is True


def test_non_admin_user_no_grace_enforcement(db):
    # Regular pro user shouldn't be touched by the grace logic
    far_past = datetime.now(timezone.utc) - timedelta(days=30)
    db.users.update_one(
        {"email": "testpro@wandermark.app"},
        {"$set": {"totp_grace_started_at": far_past}},
    )
    r = _login("testpro@wandermark.app", "Test1234!")
    assert r.status_code == 200
