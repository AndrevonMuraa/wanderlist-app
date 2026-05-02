"""Tests for the Security Dashboard endpoint."""
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


def test_dashboard_requires_super_admin():
    mod_token = _login("mod@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/security-dashboard",
        headers={"Authorization": f"Bearer {mod_token}"},
        timeout=10,
    )
    assert r.status_code == 403


def test_dashboard_returns_expected_shape():
    admin_token = _login("test@wandermark.app", "Test1234!")
    r = requests.get(
        f"{API_URL}/api/admin/security-dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data
    s = data["summary"]
    for key in ("active_lockouts", "staff_total", "staff_with_2fa", "staff_2fa_coverage_pct", "lockdown_active"):
        assert key in s
    assert isinstance(data["active_lockouts"], list)
    assert isinstance(data["recent_actions"], list)
    assert isinstance(data["action_counts_30d"], list)
    assert isinstance(data["staff_2fa"], list)
    assert "lockdown" in data and "state" in data["lockdown"] and "recent_events" in data["lockdown"]
    # Every staff row must expose the public-safe fields only
    for row in data["staff_2fa"]:
        assert set(row.keys()) >= {"user_id", "role", "totp_enabled", "backup_codes_remaining"}
    # Admin + Moderator accounts both present
    roles = {r["role"] for r in data["staff_2fa"]}
    assert "admin" in roles or "moderator" in roles


def test_dashboard_requires_auth():
    r = requests.get(f"{API_URL}/api/admin/security-dashboard", timeout=10)
    assert r.status_code in (401, 403)
