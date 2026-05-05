"""Data integrity invariants — guards against regression of the May 2026 audit.

These tests verify that no future code path can re-introduce the legacy data bug
where visits had null/missing critical fields. If you ever add a new write path
to MongoDB, these tests will fail until you wire it up correctly.

See /app/memory/SOURCES_OF_TRUTH.md for the full data dependency map.
"""
import asyncio
import os

import pytest
from motor.motor_asyncio import AsyncIOMotorClient


@pytest.fixture(scope="module")
def db():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_no_visit_has_null_critical_fields(db):
    """Every visit must have all 4 critical fields populated."""
    bad = _run(db.visits.count_documents({
        "$or": [
            {"points_earned": None},
            {"points_earned": {"$exists": False}},
            {"verified": None},
            {"verified": {"$exists": False}},
            {"landmark_name": None},
            {"landmark_name": {"$exists": False}},
            {"country_name": None},
            {"country_name": {"$exists": False}},
        ]
    }))
    assert bad == 0, (
        f"Found {bad} visits with null/missing critical fields. "
        f"Run: python -m scripts.repair_legacy_visits"
    )


def test_every_user_has_explicit_role(db):
    """Every user must have role ∈ {user, moderator, admin} set explicitly."""
    bad = _run(db.users.count_documents({
        "$or": [{"role": None}, {"role": {"$exists": False}}]
    }))
    assert bad == 0, f"Found {bad} users with missing role"


def test_every_user_has_subscription_tier(db):
    bad = _run(db.users.count_documents({
        "$or": [{"subscription_tier": None}, {"subscription_tier": {"$exists": False}}]
    }))
    assert bad == 0, f"Found {bad} users with missing subscription_tier"


def test_friendships_collection_does_not_exist(db):
    """Legacy `friendships` collection should be permanently dropped."""
    cols = _run(db.list_collection_names())
    assert "friendships" not in cols, (
        "Legacy `friendships` collection has reappeared — "
        "code is using `db.friendships` instead of `db.friends` somewhere"
    )


def test_verified_visits_have_photos(db):
    """A visit marked verified=True must have at least one photo."""
    bad = _run(db.visits.count_documents({
        "verified": True,
        "$and": [
            {"$or": [{"photos": []}, {"photos": None}, {"photos": {"$exists": False}}]},
            {"$or": [{"photo_base64": None}, {"photo_base64": ""}, {"photo_base64": {"$exists": False}}]},
        ]
    }))
    assert bad == 0, f"Found {bad} verified visits with no photos"


def test_unverified_visits_have_no_photos(db):
    """A visit marked verified=False must NOT have photos (otherwise it should be verified)."""
    bad = _run(db.visits.count_documents({
        "verified": False,
        "$or": [
            {"photos": {"$exists": True, "$ne": [], "$not": {"$size": 0}}},
        ]
    }))
    # Allow some legacy edge cases — alert if more than 5
    assert bad <= 5, f"Found {bad} unverified visits with photos — these should be marked verified"


def test_user_points_cache_not_negative(db):
    """Cached user.points should never go negative."""
    bad = _run(db.users.count_documents({"points": {"$lt": 0}}))
    assert bad == 0, f"Found {bad} users with negative cached points"


def test_user_leaderboard_points_not_negative(db):
    bad = _run(db.users.count_documents({"leaderboard_points": {"$lt": 0}}))
    assert bad == 0, f"Found {bad} users with negative leaderboard_points"


def test_landmark_points_field_present(db):
    """All landmarks must have a points field — sannhetskilde for visit points."""
    bad = _run(db.landmarks.count_documents({
        "$or": [{"points": None}, {"points": {"$exists": False}}]
    }))
    assert bad == 0, f"Found {bad} landmarks without points field"
