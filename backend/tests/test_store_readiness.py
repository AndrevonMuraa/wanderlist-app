"""Tests for the Store Readiness checklist endpoint."""
import os
import pytest
import requests

API_URL = os.environ.get("API_BASE", "http://localhost:8001")


def _login(email: str, password: str) -> str:
    r = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def test_readiness_requires_auth():
    r = requests.get(f"{API_URL}/api/admin/store-readiness", timeout=10)
    assert r.status_code in (401, 403)


def test_readiness_blocks_moderator():
    mod_token = _login("mod@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/store-readiness",
        headers={"Authorization": f"Bearer {mod_token}"},
        timeout=10,
    )
    assert r.status_code == 403


def test_readiness_returns_expected_shape():
    admin_token = _login("test@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/store-readiness",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()

    # Top-level keys
    assert "checks" in data
    assert "summary" in data
    assert "generated_at" in data

    # Summary shape
    s = data["summary"]
    for key in ("total", "passed", "warnings", "failures", "ready_to_submit"):
        assert key in s
    assert s["total"] == s["passed"] + s["warnings"] + s["failures"]
    assert isinstance(s["ready_to_submit"], bool)
    assert s["ready_to_submit"] == (s["failures"] == 0)

    # Each check has the expected fields and a valid status
    valid_statuses = {"ok", "warn", "fail"}
    ids = set()
    for c in data["checks"]:
        assert {"id", "label", "status"} <= set(c.keys())
        assert c["status"] in valid_statuses
        ids.add(c["id"])

    # Core checks must be present
    expected_ids = {
        "legal-privacy",
        "legal-terms",
        "legal-cdn",
        "auth-reviewer-account",
        "auth-super-admin",
        "moderation-queue",
        "photo-health-fresh",
        "sentry-backend",
        "subscription-pro-tier",
    }
    assert expected_ids <= ids
