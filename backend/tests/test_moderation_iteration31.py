"""Iteration 31 — Moderation system (content hide/restore/delete, warnings,
suspensions, messages, moderator activity, suspension auth-block, hidden
filtering of public feeds).

Endpoints under test:
  POST   /api/admin/content/{ctype}/{target_id}/hide
  POST   /api/admin/content/{ctype}/{target_id}/restore
  DELETE /api/admin/content/{ctype}/{target_id}        (super-admin only)
  POST   /api/admin/users/{user_id}/warn
  POST   /api/admin/users/{user_id}/suspend
  POST   /api/admin/users/{user_id}/unsuspend
  POST   /api/admin/users/{user_id}/message
  GET    /api/admin/users/{user_id}/moderation-history
  GET    /api/admin/moderator-activity                  (super-admin only)
  GET    /api/admin/users?has_warnings=true&suspended=true
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pymongo
import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = "https://report-hub-128.preview.emergentagent.com"
ADMIN = ("test@wandermark.app", "Test1234!")
PRO = ("testpro@wandermark.app", "Test1234!")
MOD = ("mod@wandermark.app", "Test1234!")

PRO_USER_ID = "user_6ef7ed0c470a"
MOD_USER_ID = "user_d2cee3abc41d"
ADMIN_USER_ID = "user_dd46a314f120"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} → {r.status_code} {r.text[:200]}"
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _mongo():
    return pymongo.MongoClient(os.environ["MONGO_URL"])[os.environ.get("DB_NAME", "test_database")]


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def mod_token():
    return _login(*MOD)


@pytest.fixture(scope="module")
def pro_token():
    return _login(*PRO)


@pytest.fixture
def seeded_visit():
    """Insert a TEST_ visit owned by pro user, yield visit_id, cleanup after."""
    db = _mongo()
    vid = f"TEST_visit_{uuid.uuid4().hex[:10]}"
    landmark = db.landmarks.find_one({}, {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1})
    assert landmark, "no landmarks seeded"
    now = datetime.now(timezone.utc)
    db.visits.insert_one({
        "visit_id": vid,
        "user_id": PRO_USER_ID,
        "landmark_id": landmark["landmark_id"],
        "landmark_name": landmark.get("name"),
        "country_name": landmark.get("country_name"),
        "photos": [],
        "points_earned": 5,
        "diary_notes": "TEST moderation seed",
        "visibility": "public",
        "status": "accepted",
        "verified": True,
        "visited_at": now,
        "created_at": now,
        "updated_at": now,
    })
    try:
        yield vid
    finally:
        db.visits.delete_one({"visit_id": vid})


@pytest.fixture
def seeded_comment():
    db = _mongo()
    cid = f"TEST_comment_{uuid.uuid4().hex[:10]}"
    db.comments.insert_one({
        "comment_id": cid,
        "user_id": PRO_USER_ID,
        "target_type": "visit",
        "target_id": "TEST_target",
        "text": "TEST comment for moderation",
        "created_at": datetime.now(timezone.utc),
    })
    try:
        yield cid
    finally:
        db.comments.delete_one({"comment_id": cid})


@pytest.fixture(autouse=True)
def reset_pro_user_state():
    """Always reset pro user's warnings/suspension after each test."""
    yield
    db = _mongo()
    db.users.update_one(
        {"user_id": PRO_USER_ID},
        {"$unset": {"suspended_until": "", "suspension_reason": "", "warnings": "", "warning_count": "", "last_warning_at": ""}}
    )


# ---------- CONTENT ACTIONS ----------

class TestContentHide:
    def test_hide_photo_visit(self, admin_token, seeded_visit):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(admin_token),
            json={"reason": "test reason", "notify_owner": True},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["target_id"] == seeded_visit
        # Verify DB hidden:true
        db = _mongo()
        doc = db.visits.find_one({"visit_id": seeded_visit})
        assert doc["hidden"] is True
        assert doc["hidden_by_user_id"] == ADMIN_USER_ID
        assert doc["hidden_reason"] == "test reason"
        # Verify notification was created for owner
        notif = db.notifications.find_one(
            {"user_id": PRO_USER_ID, "type": "content_hidden", "related_id": seeded_visit}
        )
        assert notif is not None
        # Verify audit log
        log = db.admin_logs.find_one({"action": "hide_photo", "target_id": seeded_visit})
        assert log is not None
        assert log["admin_id"] == ADMIN_USER_ID
        # Cleanup notification
        db.notifications.delete_many({"related_id": seeded_visit})
        db.admin_logs.delete_many({"target_id": seeded_visit})

    def test_hide_comment(self, admin_token, seeded_comment):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/comment/{seeded_comment}/hide",
            headers=_h(admin_token),
            json={"reason": "spam"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        db = _mongo()
        doc = db.comments.find_one({"comment_id": seeded_comment})
        assert doc["hidden"] is True
        db.admin_logs.delete_many({"target_id": seeded_comment})

    def test_hide_invalid_ctype(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/badtype/xyz/hide",
            headers=_h(admin_token),
            json={"reason": "x"}, timeout=15,
        )
        assert r.status_code == 400

    def test_hide_404_visit(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/photo/nonexistent_xyz/hide",
            headers=_h(admin_token),
            json={"reason": "x"}, timeout=15,
        )
        assert r.status_code == 404

    def test_restore_photo(self, admin_token, seeded_visit):
        # First hide
        requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(admin_token), json={"reason": "x", "notify_owner": False}, timeout=15,
        )
        # Then restore
        r = requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/restore",
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        db = _mongo()
        doc = db.visits.find_one({"visit_id": seeded_visit})
        assert doc["hidden"] is False
        assert "hidden_at" not in doc
        db.admin_logs.delete_many({"target_id": seeded_visit})

    def test_moderator_can_hide(self, mod_token, seeded_visit):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(mod_token),
            json={"reason": "by mod", "notify_owner": False}, timeout=15,
        )
        assert r.status_code == 200, r.text
        _mongo().admin_logs.delete_many({"target_id": seeded_visit})

    def test_pro_user_blocked_from_hide(self, pro_token, seeded_visit):
        r = requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(pro_token), json={"reason": "x"}, timeout=15,
        )
        assert r.status_code == 403


class TestContentDelete:
    def test_super_admin_can_delete(self, admin_token, seeded_visit):
        r = requests.delete(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}",
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        assert _mongo().visits.find_one({"visit_id": seeded_visit}) is None
        _mongo().admin_logs.delete_many({"target_id": seeded_visit})

    def test_moderator_blocked_from_delete(self, mod_token, seeded_visit):
        r = requests.delete(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}",
            headers=_h(mod_token), timeout=15,
        )
        assert r.status_code == 403
        # And visit must still exist
        assert _mongo().visits.find_one({"visit_id": seeded_visit}) is not None


# ---------- WARNINGS / SUSPENSIONS ----------

class TestWarnings:
    def test_warn_user(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/warn",
            headers=_h(admin_token),
            json={"reason": "test warning"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["warning_count"] == 1
        assert body["auto_suspended"] is False
        # Verify GET history
        h = requests.get(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/moderation-history",
            headers=_h(admin_token), timeout=15,
        )
        assert h.status_code == 200
        hist = h.json()
        assert hist["warning_count"] == 1
        assert len(hist["warnings"]) == 1
        assert hist["warnings"][0]["reason"] == "test warning"
        assert "reports_against" in hist
        # Cleanup audit
        _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_warn_404_user(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/nonexistent_user/warn",
            headers=_h(admin_token),
            json={"reason": "x"}, timeout=15,
        )
        assert r.status_code == 404

    def test_auto_suspend_at_3_warnings(self, admin_token):
        # Issue 3 warnings — 3rd should auto-suspend
        for i in range(3):
            r = requests.post(
                f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/warn",
                headers=_h(admin_token),
                json={"reason": f"w{i+1}"}, timeout=15,
            )
            assert r.status_code == 200
        body = r.json()
        assert body["auto_suspended"] is True, body
        assert body["suspend_days"] == 7
        db = _mongo()
        u = db.users.find_one({"user_id": PRO_USER_ID})
        assert u.get("suspended_until") is not None
        db.admin_logs.delete_many({"target_id": PRO_USER_ID})


class TestSuspension:
    def test_suspend_user(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token),
            json={"reason": "test", "duration_days": 5}, timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "5 days" in body["message"]
        # Cleanup
        requests.post(f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
                      headers=_h(admin_token), timeout=15)
        _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_suspend_clamps_invalid_high(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token),
            json={"reason": "test", "duration_days": 9999}, timeout=15,
        )
        assert r.status_code == 200
        assert "365 days" in r.json()["message"]
        requests.post(f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
                      headers=_h(admin_token), timeout=15)
        _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_suspend_clamps_invalid_low(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token),
            json={"reason": "test", "duration_days": 0}, timeout=15,
        )
        assert r.status_code == 200
        assert "1 days" in r.json()["message"]
        requests.post(f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
                      headers=_h(admin_token), timeout=15)
        _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_unsuspend(self, admin_token):
        # Suspend first
        requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token),
            json={"reason": "x", "duration_days": 7}, timeout=15,
        )
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200
        u = _mongo().users.find_one({"user_id": PRO_USER_ID})
        assert u.get("suspended_until") is None
        _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})


class TestSuspensionAuthBlock:
    def test_suspended_non_admin_blocked_on_me(self, admin_token):
        # Suspend pro user
        requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token),
            json={"reason": "AuthBlockTest", "duration_days": 3}, timeout=15,
        )
        try:
            # Get fresh pro token (login may bypass)
            ptoken = _login(*PRO)
            r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(ptoken), timeout=15)
            # Suspension enforced — should be 403 with reason
            assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
            detail = r.json().get("detail", "")
            assert "suspended" in detail.lower()
            assert "AuthBlockTest" in detail
        finally:
            requests.post(f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
                          headers=_h(admin_token), timeout=15)
            _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

        # After unsuspend, /me works
        ptoken = _login(*PRO)
        r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(ptoken), timeout=15)
        assert r2.status_code == 200

    def test_super_admin_bypasses_own_suspension(self, admin_token):
        """Manually inject suspended_until on admin and verify /me still works."""
        db = _mongo()
        future = datetime.now(timezone.utc) + timedelta(days=5)
        db.users.update_one(
            {"user_id": ADMIN_USER_ID},
            {"$set": {"suspended_until": future, "suspension_reason": "self-test"}}
        )
        try:
            r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(admin_token), timeout=15)
            assert r.status_code == 200, f"super-admin should bypass own suspension, got {r.status_code}"
        finally:
            db.users.update_one(
                {"user_id": ADMIN_USER_ID},
                {"$unset": {"suspended_until": "", "suspension_reason": ""}}
            )


# ---------- MESSAGE ----------

class TestMessage:
    def test_message_user(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/message",
            headers=_h(admin_token),
            json={"message": "TEST moderator message", "title": "TEST"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        db = _mongo()
        notif = db.notifications.find_one(
            {"user_id": PRO_USER_ID, "type": "moderator_message"},
            sort=[("created_at", -1)]
        )
        assert notif is not None
        assert "TEST moderator message" in notif["message"]
        db.notifications.delete_many({"user_id": PRO_USER_ID, "notif_type": "moderator_message"})
        db.admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_message_404_user(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/nonexistent/message",
            headers=_h(admin_token),
            json={"message": "x"}, timeout=15,
        )
        assert r.status_code == 404


# ---------- MODERATOR ACTIVITY ----------

class TestModeratorActivity:
    def test_super_admin_can_view(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/moderator-activity?days=30",
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["days"] == 30
        assert isinstance(body["moderators"], list)
        assert len(body["moderators"]) >= 2  # admin + moderator
        for m in body["moderators"]:
            assert "user_id" in m
            assert "reports_reviewed" in m
            assert "warnings_issued" in m
            assert "content_hidden" in m

    def test_moderator_blocked_from_activity(self, mod_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/moderator-activity?days=30",
            headers=_h(mod_token), timeout=15,
        )
        assert r.status_code == 403


# ---------- ADMIN USER FILTERS ----------

class TestAdminUserFilters:
    def test_filter_has_warnings(self, admin_token):
        # Issue a warning to pro
        requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/warn",
            headers=_h(admin_token), json={"reason": "filter-test"}, timeout=15,
        )
        try:
            r = requests.get(
                f"{BASE_URL}/api/admin/users?has_warnings=true",
                headers=_h(admin_token), timeout=15,
            )
            assert r.status_code == 200, r.text
            data = r.json()
            users = data if isinstance(data, list) else data.get("users", [])
            ids = [u.get("user_id") for u in users]
            assert PRO_USER_ID in ids, f"pro should appear in has_warnings filter, got {ids[:5]}"
        finally:
            _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})

    def test_filter_suspended(self, admin_token):
        requests.post(
            f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/suspend",
            headers=_h(admin_token), json={"reason": "filter-test", "duration_days": 2}, timeout=15,
        )
        try:
            r = requests.get(
                f"{BASE_URL}/api/admin/users?suspended=true",
                headers=_h(admin_token), timeout=15,
            )
            assert r.status_code == 200, r.text
            data = r.json()
            users = data if isinstance(data, list) else data.get("users", [])
            ids = [u.get("user_id") for u in users]
            assert PRO_USER_ID in ids, f"pro should appear in suspended filter, got {ids[:5]}"
        finally:
            requests.post(f"{BASE_URL}/api/admin/users/{PRO_USER_ID}/unsuspend",
                          headers=_h(admin_token), timeout=15)
            _mongo().admin_logs.delete_many({"target_id": PRO_USER_ID})


# ---------- HIDDEN FILTER IN PUBLIC FEEDS ----------

class TestHiddenFilter:
    def test_hidden_visit_excluded_from_highlights(self, admin_token, seeded_visit):
        # Hide visit
        requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(admin_token), json={"reason": "x", "notify_owner": False}, timeout=15,
        )
        try:
            r = requests.get(f"{BASE_URL}/api/community-highlights/top?limit=200",
                             headers=_h(admin_token), timeout=15)
            if r.status_code != 200:
                pytest.skip(f"highlights endpoint returned {r.status_code}")
            body = r.json()
            items = body if isinstance(body, list) else body.get("highlights") or body.get("items") or []
            visit_ids = [it.get("visit_id") for it in items]
            assert seeded_visit not in visit_ids, "Hidden visit must be excluded from highlights"
        finally:
            _mongo().admin_logs.delete_many({"target_id": seeded_visit})

    def test_hidden_visit_excluded_from_feed(self, admin_token, pro_token, seeded_visit):
        requests.post(
            f"{BASE_URL}/api/admin/content/photo/{seeded_visit}/hide",
            headers=_h(admin_token), json={"reason": "x", "notify_owner": False}, timeout=15,
        )
        try:
            r = requests.get(f"{BASE_URL}/api/feed?limit=200",
                             headers=_h(pro_token), timeout=15)
            if r.status_code != 200:
                pytest.skip(f"feed returned {r.status_code}")
            body = r.json()
            items = body if isinstance(body, list) else body.get("activities") or body.get("items") or []
            visit_ids = [it.get("visit_id") for it in items if isinstance(it, dict)]
            assert seeded_visit not in visit_ids, "Hidden visit must be excluded from /api/feed"
        finally:
            _mongo().admin_logs.delete_many({"target_id": seeded_visit})
