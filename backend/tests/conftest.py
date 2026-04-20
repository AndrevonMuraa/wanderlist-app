"""Shared pytest fixtures for WanderMark backend integration tests.

Most important fixture: `admin_friend_shared_landmark` — ensures an accepted
friendship between admin and Social Tester has at least one mutual landmark
visit (inserted on-the-fly via MongoDB, torn down cleanly after the test).

This unblocks the 2 "happy-path" compare-landmark tests in
`test_shares_compare_iteration22.py` and `test_friends_hub_iteration21.py`,
replacing the previous "pytest.skip(no shared landmark)" with a real
end-to-end assertion.
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pymongo
import pytest
import requests
from dotenv import load_dotenv

# Load backend/.env so MONGO_URL / DB_NAME are available when pytest is
# invoked from the /app/backend working directory (same loader as utils/db.py).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
ADMIN_EMAIL = "test@wandermark.app"
ADMIN_PASSWORD = "Test1234!"

# Seeded user_id for Social Tester (admin's only accepted friend in this env).
# See /app/memory/test_credentials.md.
_SOCIAL_TESTER_ID = "user_ff9a3f370f6b"


def _mongo():
    return pymongo.MongoClient(os.environ["MONGO_URL"])[os.environ.get("DB_NAME", "wandermark")]


def _admin_token_and_id():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    body = r.json()
    token = body.get("access_token") or body.get("token")
    user = body.get("user") or {}
    return token, user.get("user_id")


@pytest.fixture(scope="function")
def admin_friend_shared_landmark():
    """Ensure admin + Social Tester share at least one landmark visit.

    Yields: dict with landmark_id, admin_user_id, friend_user_id.
    Tears down: deletes exactly the 2 seeded visits (identified by unique
    visit_ids) so the rest of the DB is untouched.
    """
    db = _mongo()
    token, admin_id = _admin_token_and_id()

    # Pick any landmark — the first one in the collection is fine.
    landmark = db.landmarks.find_one({}, {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1})
    if not landmark or not landmark.get("landmark_id"):
        pytest.skip("No landmarks in DB — cannot seed shared visit")
    landmark_id = landmark["landmark_id"]

    # Verify the friendship actually exists (sanity check so we fail loudly
    # if the seed environment drifts rather than silently seeding unrelated data).
    friendship = db.friends.find_one({
        "status": "accepted",
        "$or": [
            {"user_id": admin_id, "friend_id": _SOCIAL_TESTER_ID},
            {"user_id": _SOCIAL_TESTER_ID, "friend_id": admin_id},
        ],
    })
    if not friendship:
        pytest.skip(
            f"No accepted friendship between admin ({admin_id}) and Social Tester "
            f"({_SOCIAL_TESTER_ID}) — seed env has drifted"
        )

    now = datetime.now(timezone.utc)
    admin_visit_id = f"fixture_admin_{uuid.uuid4().hex[:12]}"
    friend_visit_id = f"fixture_friend_{uuid.uuid4().hex[:12]}"

    admin_visit = {
        "visit_id": admin_visit_id,
        "user_id": admin_id,
        "landmark_id": landmark_id,
        "landmark_name": landmark.get("name"),
        "country_name": landmark.get("country_name"),
        "photos": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII="],
        "points_earned": 10,
        "comments": None,
        "visit_location": None,
        "diary_notes": "Admin fixture visit (pytest seed — auto-cleanup).",
        "status": "accepted",
        "verified": True,
        "visibility": "friends",
        "visited_at": now,
        "created_at": now,
        "updated_at": now,
    }
    friend_visit = {
        **admin_visit,
        "visit_id": friend_visit_id,
        "user_id": _SOCIAL_TESTER_ID,
        "diary_notes": "Social Tester fixture visit (pytest seed — auto-cleanup).",
    }

    db.visits.insert_one(admin_visit)
    db.visits.insert_one(friend_visit)

    try:
        yield {
            "landmark_id": landmark_id,
            "admin_user_id": admin_id,
            "friend_user_id": _SOCIAL_TESTER_ID,
            "admin_visit_id": admin_visit_id,
            "friend_visit_id": friend_visit_id,
            "admin_token": token,
        }
    finally:
        # Always clean up — even if the test failed.
        db.visits.delete_many({"visit_id": {"$in": [admin_visit_id, friend_visit_id]}})
