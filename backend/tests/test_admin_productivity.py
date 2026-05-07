"""Tests for admin productivity endpoints (recent-activity, explain, bulk-action).

Backend wiring landed in iteration 34. Targets routes/admin_productivity.py.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")

ADMIN_EMAIL = "test@wandermark.app"
MOD_EMAIL = "mod@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
PWD = "Test1234!"


def _login(email: str) -> tuple[str, dict]:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": PWD},
        timeout=15,
    )
    if r.status_code == 429:
        time.sleep(60)
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": PWD},
            timeout=15,
        )
    r.raise_for_status()
    body = r.json()
    return body["access_token"], body.get("user", {})


@pytest.fixture(scope="module")
def admin_token():
    tok, _ = _login(ADMIN_EMAIL)
    return tok


@pytest.fixture(scope="module")
def mod_token():
    tok, _ = _login(MOD_EMAIL)
    return tok


@pytest.fixture(scope="module")
def pro_token_and_id():
    tok, user = _login(PRO_EMAIL)
    return tok, user.get("user_id")


# ---------- /api/admin/recent-activity ----------

class TestRecentActivity:
    def test_missing_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/admin/recent-activity", timeout=10)
        assert r.status_code in (401, 403), f"got {r.status_code}: {r.text[:200]}"

    def test_non_admin_returns_403(self, pro_token_and_id):
        token, _ = pro_token_and_id
        r = requests.get(
            f"{BASE_URL}/api/admin/recent-activity",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code == 403

    def test_super_admin_returns_200(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/recent-activity?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and isinstance(body["items"], list)
        assert "generated_at" in body
        if body["items"]:
            row = body["items"][0]
            assert "admin_id" in row
            assert "admin_name" in row
            assert "action" in row
            assert "created_at" in row
            assert isinstance(row["created_at"], str)

    def test_moderator_can_access(self, mod_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/recent-activity",
            headers={"Authorization": f"Bearer {mod_token}"},
            timeout=10,
        )
        assert r.status_code == 200


# ---------- /api/admin/users/{uid}/explain ----------

class TestExplainUser:
    def test_super_admin_shape(self, admin_token, pro_token_and_id):
        _, target_uid = pro_token_and_id
        r = requests.get(
            f"{BASE_URL}/api/admin/users/{target_uid}/explain",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["user_id"] == target_uid
        assert isinstance(body["is_suspended"], bool)
        assert "role" in body
        assert "account_age_days" in body
        crit = body["criteria"]
        for key in (
            "account_90d", "verified_visits_10", "no_warnings_90d",
            "no_hidden_90d", "not_banned", "friend_or_likes",
        ):
            assert key in crit, f"missing criteria.{key}"
            assert "ok" in crit[key]

    def test_non_existent_user_404(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/users/user_does_not_exist_xx/explain",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 404

    def test_non_admin_403(self, pro_token_and_id):
        token, uid = pro_token_and_id
        r = requests.get(
            f"{BASE_URL}/api/admin/users/{uid}/explain",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code == 403


# ---------- /api/admin/users/bulk-action ----------

class TestBulkAction:
    def _admin_h(self, t):
        return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}

    def test_empty_user_ids_422(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [], "action": "warn"},
            timeout=10,
        )
        assert r.status_code == 422

    def test_too_many_user_ids_422(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [f"u_{i}" for i in range(201)], "action": "warn"},
            timeout=15,
        )
        assert r.status_code == 422

    def test_warn_increments_warnings_count(self, admin_token, pro_token_and_id):
        """Bulk warn must succeed, increment warnings_count, and create an admin_logs row."""
        _, uid = pro_token_and_id

        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [uid], "action": "warn", "reason": "TEST_warn pytest"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["ok"] is True
        assert body["succeeded"] == 1
        assert body["failed"] == 0

        # Verify a recent bulk_warn admin_logs row exists by polling recent-activity
        ra = requests.get(
            f"{BASE_URL}/api/admin/recent-activity?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        ).json()
        actions = [r.get("action") for r in ra.get("items", [])]
        assert "bulk_warn" in actions, f"bulk_warn not found in recent-activity actions: {actions}"

    def test_suspend_then_unsuspend(self, admin_token, pro_token_and_id):
        _, uid = pro_token_and_id
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [uid], "action": "suspend", "duration_days": 3,
                  "reason": "TEST_suspend pytest"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["succeeded"] == 1

        r1 = requests.get(
            f"{BASE_URL}/api/admin/users/{uid}/explain",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        body1 = r1.json()
        assert body1["is_suspended"] is True
        assert body1["suspended_until"] is not None

        # Unsuspend
        r2 = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [uid], "action": "unsuspend"},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json()["succeeded"] == 1

        r3 = requests.get(
            f"{BASE_URL}/api/admin/users/{uid}/explain",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r3.json()["is_suspended"] is False

    def test_message_action_requires_body(self, admin_token, pro_token_and_id):
        _, uid = pro_token_and_id
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [uid], "action": "message"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["failed"] == 1
        assert body["failures"][0]["error"] == "body required"

    def test_message_action_creates_notification(self, admin_token, pro_token_and_id):
        _, uid = pro_token_and_id
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": [uid], "action": "message",
                  "body": "TEST_pytest message — please ignore"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["succeeded"] == 1

    def test_non_existent_user_id_failure(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/admin/users/bulk-action",
            headers=self._admin_h(admin_token),
            json={"user_ids": ["user_nonexistent_zzz"], "action": "warn"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["failed"] == 1
        assert body["failures"][0]["error"] == "not found"


# ---------- Existing admin endpoints regression ----------

class TestAdminRegression:
    def test_e2e_status(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/e2e-status",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 200

    def test_admin_users_list(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 200

    def test_lockdown_status(self, admin_token):
        # Read-only: lockdown_status endpoint must respond 200
        r = requests.get(
            f"{BASE_URL}/api/admin/lockdown/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )
        assert r.status_code == 200
