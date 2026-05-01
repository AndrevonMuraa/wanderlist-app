"""Tests for per-user brute-force lockout."""
import os
import time
import pytest
import requests
from pymongo import MongoClient

API_URL = os.environ.get("API_BASE", "http://localhost:8001")

# Use a non-shared account for brute-force testing so we don't lock admin accounts
TEST_EMAIL = "brute_force_test@wandermark.app"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(autouse=True)
def create_and_cleanup_user(db):
    # Remove any prior user with the test email
    db.users.delete_many({"email": TEST_EMAIL})
    # Register fresh via the API
    r = requests.post(
        f"{API_URL}/api/auth/register",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Brute Test",
            "username": "brute_test_acct",
        },
        timeout=10,
    )
    assert r.status_code in (200, 201), r.text
    yield
    db.users.delete_many({"email": TEST_EMAIL})


def _try_login(password: str):
    return requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": password},
        timeout=10,
    )


def test_three_failures_trigger_lockout():
    # 3 bad attempts → 60s lockout
    for _ in range(3):
        r = _try_login("wrong")
        assert r.status_code in (401, 429)

    # Next login — even correct password — should be blocked
    r = _try_login(TEST_PASSWORD)
    assert r.status_code == 429
    assert "locked" in r.json()["detail"].lower()


def test_successful_login_clears_lockout_counter(db):
    # Fail twice (below threshold)
    _try_login("wrong")
    _try_login("wrong")
    # Correct login should succeed and clear the counter
    r = _try_login(TEST_PASSWORD)
    assert r.status_code == 200

    user = db.users.find_one(
        {"email": TEST_EMAIL}, {"_id": 0, "failed_login_attempts": 1, "locked_until": 1}
    )
    assert user.get("failed_login_attempts") in (None, 0)
    assert user.get("locked_until") is None
