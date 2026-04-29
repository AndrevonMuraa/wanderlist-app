"""Tests for Year-in-Travel ("Your Year on WanderMark") backend endpoints."""
import os
import sys
import uuid
from datetime import datetime, timezone

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


@pytest.fixture(scope="module")
def headers():
    token = _login("testpro@wandermark.app", "Test1234!")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def db():
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def test_year_in_travel_default_year(headers):
    r = requests.get(f"{API_URL}/api/me/year-in-travel", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    expected_year = datetime.now(timezone.utc).year
    assert data["year"] == expected_year
    assert "memories_added" in data
    assert "photos_uploaded" in data
    assert "countries_count" in data
    assert "new_countries" in data
    assert "top_landmarks" in data


def test_year_in_travel_specific_year(headers):
    r = requests.get(f"{API_URL}/api/me/year-in-travel?year=2025", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["year"] == 2025


def test_year_in_travel_with_seeded_data(headers):
    r = requests.get(f"{API_URL}/api/me/year-in-travel?year=2025", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    # Seed script (seed_year_recap_test.py) should have inserted 14 visits
    assert data["memories_added"] >= 14
    assert data["countries_count"] >= 1
    assert data["new_countries"], "expected at least one new country"
    assert data["top_continent"] is not None
    assert data["busiest_month"] is not None
    assert data["oldest_memory"] is not None
    assert data["oldest_memory"]["years_ago"] >= 1
    assert len(data["top_landmarks"]) >= 1
    assert data["hero_photo"] is not None


def test_dispatch_notification_idempotent(headers):
    # Clean any prior notifications first via direct DB
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient

    async def _clean():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        user = await db.users.find_one(
            {"email": "testpro@wandermark.app"}, {"_id": 0, "user_id": 1}
        )
        await db.notifications.delete_many(
            {"user_id": user["user_id"], "type": "year_recap_ready"}
        )

    asyncio.run(_clean())

    r1 = requests.post(
        f"{API_URL}/api/me/year-in-travel/dispatch-notification",
        headers=headers,
        timeout=10,
    )
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["dispatched"] is True
    assert body1["year"] == datetime.now(timezone.utc).year - 1

    r2 = requests.post(
        f"{API_URL}/api/me/year-in-travel/dispatch-notification",
        headers=headers,
        timeout=10,
    )
    assert r2.status_code == 200
    assert r2.json()["dispatched"] is False
    assert r2.json()["reason"] == "already_sent"


def test_dispatch_notification_no_memories(headers):
    """For a year with no visits, dispatch should not fire."""
    r = requests.post(
        f"{API_URL}/api/me/year-in-travel/dispatch-notification?year=1990",
        headers=headers,
        timeout=10,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["dispatched"] is False
    assert body["reason"] == "no_memories"


def test_year_in_travel_unauthenticated():
    r = requests.get(f"{API_URL}/api/me/year-in-travel", timeout=10)
    assert r.status_code in (401, 403)


def test_year_recap_enabled_in_push_settings(headers):
    r = requests.get(f"{API_URL}/api/push-settings", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    # Default for users with no settings doc OR fresh field default = True
    assert data.get("year_recap_enabled", True) is True


def test_year_recap_setting_can_be_toggled(headers):
    # Disable
    r1 = requests.put(
        f"{API_URL}/api/push-settings",
        json={"year_recap_enabled": False},
        headers=headers,
        timeout=10,
    )
    assert r1.status_code == 200
    r2 = requests.get(f"{API_URL}/api/push-settings", headers=headers, timeout=10)
    assert r2.json().get("year_recap_enabled") is False

    # Re-enable to keep test idempotent for next runs
    r3 = requests.put(
        f"{API_URL}/api/push-settings",
        json={"year_recap_enabled": True},
        headers=headers,
        timeout=10,
    )
    assert r3.status_code == 200
    r4 = requests.get(f"{API_URL}/api/push-settings", headers=headers, timeout=10)
    assert r4.json().get("year_recap_enabled") is True
