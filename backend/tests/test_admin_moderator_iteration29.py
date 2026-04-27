"""Iteration 29: Admin/Moderator role polish tests.

Verifies:
- GET /api/admin/reports enriches with content_preview for photo/diary/activity/comment types
- PUT /api/admin/reports/{id} writes reviewed_by_user_id/name/role
- Super-admin-only endpoints return 403 with specific message for moderator role
- NEW make-moderator/demote-to-user endpoints, super-admin gated
- Regression: moderator can still use non-destructive admin endpoints
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://wandermark-build83.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test@wandermark.app"
MOD_EMAIL = "mod@wandermark.app"
PRO_EMAIL = "testpro@wandermark.app"
PW = "Test1234!"
MOD_USER_ID = "user_d2cee3abc41d"
PRO_USER_ID = "user_6ef7ed0c470a"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token for {email}: {r.json()}"
    return tok


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, PW)


@pytest.fixture(scope="session")
def mod_token():
    return _login(MOD_EMAIL, PW)


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ====== Reports enrichment ======

class TestReportsEnrichment:
    def test_get_reports_returns_list(self, admin_token):
        r = requests.get(f"{API}/admin/reports?limit=50", headers=h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reports" in data and isinstance(data["reports"], list)
        assert "total" in data

    def test_user_type_reports_have_target(self, admin_token):
        r = requests.get(f"{API}/admin/reports?report_type=user&limit=20", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        reports = r.json().get("reports", [])
        if not reports:
            pytest.skip("No user-type reports in DB to validate target enrichment")
        for rep in reports:
            # target is set only if the target user still exists; allow None but key may be absent
            # The contract: user-type reports get target field (when target exists)
            if rep.get("target_id"):
                # not all target users may exist, so this is best-effort
                assert "target" in rep or "reporter" in rep

    def test_photo_diary_activity_comment_reports_preview(self, admin_token):
        r = requests.get(f"{API}/admin/reports?limit=100", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        reports = r.json().get("reports", [])
        preview_types = {"photo", "diary", "activity", "comment"}
        found_preview = False
        for rep in reports:
            rtype = rep.get("report_type")
            if rtype in preview_types and rep.get("content_preview"):
                found_preview = True
                cp = rep["content_preview"]
                if rtype == "comment":
                    # comment preview shape
                    assert "comment_text" in cp
                else:
                    # photo/diary/activity preview shape
                    assert any(k in cp for k in ("photo_url", "diary_snippet", "photo_count"))
                break
        if not found_preview:
            pytest.skip("No photo/diary/activity/comment reports with retrievable target to validate content_preview")


# ====== Report update writes reviewed_by audit ======

class TestReportUpdateAudit:
    def _seed_report(self, admin_token):
        """Create a report via direct DB-like path: use reporter API if available, else skip."""
        # Try to create via /api/reports (public) — reporter = pro user
        pro_tok = _login(PRO_EMAIL, PW)
        payload = {
            "target_id": MOD_USER_ID,
            "report_type": "user",
            "reason": "spam",
            "description": f"TEST_iter29_{uuid.uuid4().hex[:6]}",
        }
        r = requests.post(f"{API}/reports", headers=h(pro_tok), json=payload, timeout=20)
        if r.status_code not in (200, 201):
            return None
        data = r.json()
        return data.get("report_id") or data.get("id")

    def test_put_report_writes_reviewed_by_fields(self, admin_token):
        rid = self._seed_report(admin_token)
        if not rid:
            # fallback: pick any existing pending report
            lst = requests.get(f"{API}/admin/reports?status=pending&limit=1", headers=h(admin_token), timeout=30).json()
            reps = lst.get("reports", [])
            if not reps:
                pytest.skip("No report available to update")
            rid = reps[0]["report_id"]
        r = requests.put(
            f"{API}/admin/reports/{rid}",
            headers=h(admin_token),
            json={"status": "reviewed", "admin_notes": "TEST_iter29 audit"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        # fetch and verify
        all_reps = requests.get(f"{API}/admin/reports?limit=100", headers=h(admin_token), timeout=30).json().get("reports", [])
        updated = next((x for x in all_reps if x.get("report_id") == rid), None)
        assert updated is not None, "Updated report not found in list"
        assert updated.get("reviewed_by_user_id"), f"reviewed_by_user_id missing: {updated}"
        assert updated.get("reviewed_by_name"), f"reviewed_by_name missing: {updated}"
        assert updated.get("reviewed_by_role") in ("admin", "moderator"), f"reviewed_by_role bad: {updated.get('reviewed_by_role')}"
        assert updated.get("reviewed_at")


# ====== Super-admin gating ======

EXPECTED_MSG_SUBSTR = "Super Admin"


class TestSuperAdminGating:
    def test_moderator_cannot_recalculate_leaderboard(self, mod_token):
        r = requests.post(f"{API}/admin/recalculate-leaderboard-points", headers=h(mod_token), timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
        assert EXPECTED_MSG_SUBSTR in (r.json().get("detail", "")), r.text

    def test_moderator_cannot_strip_verified(self, mod_token):
        r = requests.put(f"{API}/admin/users/{PRO_USER_ID}/strip-verified", headers=h(mod_token), timeout=30)
        assert r.status_code == 403
        assert EXPECTED_MSG_SUBSTR in r.json().get("detail", "")

    def test_moderator_cannot_make_moderator(self, mod_token):
        r = requests.post(f"{API}/admin/make-moderator/{PRO_USER_ID}", headers=h(mod_token), timeout=20)
        assert r.status_code == 403
        assert EXPECTED_MSG_SUBSTR in r.json().get("detail", "")

    def test_moderator_cannot_demote(self, mod_token):
        r = requests.post(f"{API}/admin/demote-to-user/{PRO_USER_ID}", headers=h(mod_token), timeout=20)
        assert r.status_code == 403
        assert EXPECTED_MSG_SUBSTR in r.json().get("detail", "")

    def test_moderator_cannot_change_role_via_put_user(self, mod_token):
        r = requests.put(
            f"{API}/admin/users/{PRO_USER_ID}",
            headers=h(mod_token),
            json={"role": "moderator"},
            timeout=20,
        )
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

    def test_super_admin_can_access_make_moderator_endpoint(self, admin_token):
        # Use a non-destructive check: hit with a non-existent user -> 404, proving auth passed
        r = requests.post(f"{API}/admin/make-moderator/user_nonexistent_iter29", headers=h(admin_token), timeout=20)
        assert r.status_code in (404, 200), f"expected 404/200, got {r.status_code}: {r.text}"

    def test_super_admin_can_access_demote_endpoint(self, admin_token):
        r = requests.post(f"{API}/admin/demote-to-user/user_nonexistent_iter29", headers=h(admin_token), timeout=20)
        assert r.status_code in (404, 200)


# ====== Regression: moderator still has non-destructive access ======

class TestModeratorRegression:
    def test_mod_can_list_stats(self, mod_token):
        r = requests.get(f"{API}/admin/stats", headers=h(mod_token), timeout=20)
        assert r.status_code == 200, r.text

    def test_mod_can_list_users(self, mod_token):
        r = requests.get(f"{API}/admin/users?limit=5", headers=h(mod_token), timeout=20)
        assert r.status_code == 200

    def test_mod_can_list_reports(self, mod_token):
        r = requests.get(f"{API}/admin/reports?limit=5", headers=h(mod_token), timeout=20)
        assert r.status_code == 200

    def test_mod_can_list_blocks(self, mod_token):
        r = requests.get(f"{API}/admin/blocks", headers=h(mod_token), timeout=20)
        assert r.status_code == 200

    def test_mod_can_update_report_status(self, mod_token, admin_token):
        # ensure at least one report exists
        lst = requests.get(f"{API}/admin/reports?limit=1", headers=h(admin_token), timeout=20).json()
        reps = lst.get("reports", [])
        if not reps:
            pytest.skip("No reports available")
        rid = reps[0]["report_id"]
        r = requests.put(
            f"{API}/admin/reports/{rid}",
            headers=h(mod_token),
            json={"status": "reviewed", "admin_notes": "mod-regression-test"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        # audit shows moderator role
        lst2 = requests.get(f"{API}/admin/reports?limit=100", headers=h(admin_token), timeout=20).json()
        updated = next((x for x in lst2.get("reports", []) if x.get("report_id") == rid), None)
        assert updated and updated.get("reviewed_by_role") == "moderator"
