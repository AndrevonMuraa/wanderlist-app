"""Backend tests for /api/admin/widget/summary."""
import os
import time

import pytest
import requests

BASE = os.environ.get("BASE_URL", "http://localhost:8001")


def _login(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


def test_widget_summary_requires_auth():
    r = requests.get(f"{BASE}/api/admin/widget/summary")
    assert r.status_code in (401, 403)


def test_widget_summary_blocks_user():
    # Free / regular accounts shouldn't see admin payload.
    token = _login("testfree@wandermark.app", "Test1234!")
    r = requests.get(
        f"{BASE}/api/admin/widget/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_widget_summary_allows_admin_and_caches():
    token = _login("test@wandermark.app", "Test1234!")
    r1 = requests.get(
        f"{BASE}/api/admin/widget/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 200, r1.text
    body = r1.json()
    for key in ("pending_reports", "open_tickets", "recent_actions", "generated_at"):
        assert key in body
    assert isinstance(body["pending_reports"], int)
    assert isinstance(body["open_tickets"], int)
    assert isinstance(body["recent_actions"], list)
    assert len(body["recent_actions"]) <= 3
    for row in body["recent_actions"]:
        assert {"actor", "action", "created_at"} <= row.keys()

    # Cache returns the same generated_at within TTL.
    time.sleep(0.5)
    r2 = requests.get(
        f"{BASE}/api/admin/widget/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.json()["generated_at"] == body["generated_at"]


def test_widget_summary_allows_moderator():
    # Mods should see the same payload (read-only — they need it on their lock screen too)
    token = _login("mod@wandermark.app", "Test1234!")
    r = requests.get(
        f"{BASE}/api/admin/widget/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    assert "pending_reports" in r.json()
