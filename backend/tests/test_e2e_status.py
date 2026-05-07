"""Tests for the E2E seed data status + wipe endpoints."""
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


def test_status_requires_auth():
    r = requests.get(f"{API_URL}/api/admin/e2e-status", timeout=10)
    assert r.status_code in (401, 403)


def test_status_blocks_moderator():
    mod_token = _login("mod@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/e2e-status",
        headers={"Authorization": f"Bearer {mod_token}"},
        timeout=10,
    )
    assert r.status_code == 403


def test_status_returns_shape_for_super_admin():
    token = _login("test@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/e2e-status",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["tag"] == "e2e"
    assert isinstance(body["total"], int)
    assert isinstance(body["counts"], list) and len(body["counts"]) >= 1
    assert {"collection", "label", "count"}.issubset(body["counts"][0].keys())
    assert "personas" in body and "personas_count" in body
    assert "hidden_visits" in body
    assert "generated_at" in body


def test_wipe_blocks_moderator():
    mod_token = _login("mod@wandermark.app", "Test1234!")
    r = requests.post(
        f"{API_URL}/api/admin/e2e-status/wipe",
        headers={"Authorization": f"Bearer {mod_token}"},
        timeout=10,
    )
    assert r.status_code == 403


def test_wipe_then_status_clean(tmp_path):
    """End-to-end: wipe must remove e2e artefacts but keep users."""
    token = _login("test@wandermark.app", "Test1234!")
    headers = {"Authorization": f"Bearer {token}"}

    # Capture user count before
    pre = requests.get(f"{API_URL}/api/admin/e2e-status", headers=headers, timeout=10).json()
    pre_users = next((c["count"] for c in pre["counts"] if c["collection"] == "users"), 0)

    # Wipe
    r = requests.post(f"{API_URL}/api/admin/e2e-status/wipe", headers=headers, timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["users_preserved"] is True
    assert isinstance(body["deleted_total"], int)

    # After wipe: users still there, content collections at 0
    post = requests.get(f"{API_URL}/api/admin/e2e-status", headers=headers, timeout=10).json()
    post_users = next((c["count"] for c in post["counts"] if c["collection"] == "users"), 0)
    assert post_users == pre_users, "wipe must NOT delete user logins"

    for c in post["counts"]:
        if c["collection"] == "users":
            continue
        assert c["count"] == 0, f"{c['collection']} should be 0 after wipe but was {c['count']}"
