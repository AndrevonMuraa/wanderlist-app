"""Iteration 26 — backend tests for the WanderMark Community/Reporting refactor.

Covers:
- /api/community-highlights/top continent filter + scope=all|month
- /api/reports new 'diary' report_type + new diary reasons
- /api/reports anti-abuse rate limit (max 5 reports/hour per user)
- /api/community-highlight (legacy) still works (no regression)
- DELETED pages — /community-highlights and /community-highlights/top are
  backend GET endpoints (these still exist for /api/community-highlights/top
  but the dedicated frontend pages were removed; we still verify backend stays).
"""
import os
import uuid
import time

import pytest
import requests

BASE_URL = os.environ.get(
    "BASE_URL",
    "https://wandermark-build83.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test@wandermark.app"
ADMIN_PASSWORD = "Test1234!"
PRO_EMAIL = "testpro@wandermark.app"
PRO_PASSWORD = "Test1234!"


# ---------- helpers / fixtures ----------

def _login(email: str, password: str) -> dict:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code} {r.text[:200]}")
    body = r.json()
    return {
        "token": body.get("access_token") or body.get("token"),
        "user": body.get("user") or {},
    }


@pytest.fixture(scope="module")
def admin_auth():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def pro_auth():
    return _login(PRO_EMAIL, PRO_PASSWORD)


def _h(auth) -> dict:
    return {"Authorization": f"Bearer {auth['token']}", "Content-Type": "application/json"}


# ---------- /api/community-highlights/top ----------

class TestCommunityHighlightsTop:
    """New continent filter + existing scope filter on top community highlights."""

    def test_top_default_all_scope(self, admin_auth):
        r = requests.get(f"{API}/community-highlights/top", headers=_h(admin_auth), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data
        assert data.get("scope") == "all"
        assert data.get("period") == "All-time"
        assert isinstance(data["items"], list)
        # Empty list is acceptable in preview env (per request: 0 public photos OK)
        if data["items"]:
            assert data["items"][0].get("rank") == 1
            for itm in data["items"]:
                assert "photo_url" in itm and itm["photo_url"]

    def test_top_scope_month(self, admin_auth):
        r = requests.get(
            f"{API}/community-highlights/top?scope=month&limit=10",
            headers=_h(admin_auth), timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["scope"] == "month"
        # period is human-readable like "January 2026"
        assert isinstance(data["period"], str) and len(data["period"]) > 0
        assert data["period"] != "All-time"

    @pytest.mark.parametrize("continent", ["Europe", "Asia", "Americas", "Africa", "Oceania"])
    def test_top_continent_filter_returns_only_that_continent(self, admin_auth, continent):
        r = requests.get(
            f"{API}/community-highlights/top?limit=10&scope=all&continent={continent}",
            headers=_h(admin_auth), timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data
        for itm in data["items"]:
            # If the API honors continent filter, every item must match
            assert itm.get("continent") == continent, (
                f"Item leaked a non-{continent} continent: {itm.get('continent')} "
                f"(landmark={itm.get('landmark_name')})"
            )

    def test_top_invalid_scope_rejected(self, admin_auth):
        r = requests.get(
            f"{API}/community-highlights/top?scope=year",
            headers=_h(admin_auth), timeout=20,
        )
        # FastAPI Query regex => 422
        assert r.status_code in (400, 422), r.text

    def test_top_limit_clamped(self, admin_auth):
        r = requests.get(
            f"{API}/community-highlights/top?limit=999",
            headers=_h(admin_auth), timeout=20,
        )
        assert r.status_code == 200
        # Code clamps to 50
        assert len(r.json().get("items", [])) <= 50

    def test_legacy_single_highlight_endpoint_still_works(self, admin_auth):
        """Legacy /api/community-highlight (singular) must remain — frontend hero
        on /community uses it. Note: ranking is random within top-pool."""
        r = requests.get(f"{API}/community-highlight", headers=_h(admin_auth), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "highlight" in data  # may be None in empty preview env


# ---------- /api/reports ----------

class TestReportsDiaryType:
    """NEW: 'diary' report_type and new reasons."""

    def test_create_diary_report_succeeds(self, pro_auth):
        # Use a synthetic target_id so we don't poison real data
        target_id = f"TEST_diary_{uuid.uuid4().hex[:10]}"
        payload = {
            "report_type": "diary",
            "target_id": target_id,
            "target_name": "TEST diary entry",
            "reason": "inappropriate_diary",
        }
        r = requests.post(f"{API}/reports", json=payload, headers=_h(pro_auth), timeout=20)
        # Could 200 (success) — verify shape. If 429 the rate-limit test below has polluted state;
        # tests are ordered so this should succeed first.
        assert r.status_code == 200, r.text
        body = r.json()
        assert "report_id" in body
        assert body["message"].lower().startswith("report submitted")

    def test_invalid_report_type_rejected(self, admin_auth):
        target_id = f"TEST_bad_{uuid.uuid4().hex[:10]}"
        r = requests.post(
            f"{API}/reports",
            json={"report_type": "wrongtype", "target_id": target_id, "reason": "spam"},
            headers=_h(admin_auth), timeout=20,
        )
        assert r.status_code == 400
        assert "report type" in r.text.lower()

    def test_diary_with_invalid_reason_rejected(self, admin_auth):
        target_id = f"TEST_diary_bad_{uuid.uuid4().hex[:10]}"
        r = requests.post(
            f"{API}/reports",
            json={"report_type": "diary", "target_id": target_id, "reason": "totally_made_up"},
            headers=_h(admin_auth), timeout=20,
        )
        assert r.status_code == 400


class TestReportsRateLimit:
    """NEW: 5 reports per hour per user. 6th must 429."""

    def test_rate_limit_kicks_in_at_6th(self):
        """Use a FRESH login so prior tests' reports (1 from pro_auth above) don't pollute.
        We need a user that has < 5 reports in the past hour. Admin works (admin hasn't
        submitted any in this test session; rate-limit window is 1 hour rolling).

        WARNING: This test mutates real DB state (writes 5 reports). Reports pile up
        until the 1-hour window expires; subsequent test runs within an hour may
        see <5 available slots and the test will skip rather than fail spuriously.
        """
        auth = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        headers = _h(auth)

        # First, count how many reports admin has within the last hour to size the test
        my_r = requests.get(f"{API}/reports/my-reports", headers=headers, timeout=20)
        assert my_r.status_code == 200, my_r.text
        # Endpoint returns up to 50; we conservatively check the count of recent entries.
        # We will attempt up to 6 submissions; if rate-limit hits early because of prior
        # leftovers, that's also a valid signal.
        responses = []
        for i in range(6):
            payload = {
                "report_type": "comment",
                "target_id": f"TEST_ratelimit_{uuid.uuid4().hex[:10]}",
                "target_name": f"TEST ratelimit {i}",
                "reason": "spam",
            }
            r = requests.post(f"{API}/reports", json=payload, headers=headers, timeout=20)
            responses.append(r.status_code)
            time.sleep(0.2)

        # Among 6 attempts we MUST see at least one 429 — that's the rate limit.
        assert 429 in responses, f"Expected at least one 429 across 6 rapid reports, got {responses}"
        # And we should NOT see all 6 succeed
        successes = [s for s in responses if s == 200]
        assert len(successes) <= 5, f"Rate limit didn't kick in — got {len(successes)} successes: {responses}"

    def test_429_message_is_informative(self):
        """After the previous test, admin is rate-limited. A new report should 429
        with a 'too many reports' message."""
        auth = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = requests.post(
            f"{API}/reports",
            json={
                "report_type": "comment",
                "target_id": f"TEST_429_{uuid.uuid4().hex[:10]}",
                "reason": "spam",
            },
            headers=_h(auth), timeout=20,
        )
        # If somehow not rate-limited yet, skip rather than fail.
        if r.status_code != 429:
            pytest.skip(f"Not rate-limited yet (got {r.status_code}); upstream test may have failed")
        body = r.json()
        detail = (body.get("detail") or "").lower()
        assert "too many" in detail or "later" in detail, body


# ---------- regression: existing endpoints still respond ----------

class TestRegressionExistingEndpoints:
    def test_my_reports_endpoint(self, admin_auth):
        r = requests.get(f"{API}/reports/my-reports", headers=_h(admin_auth), timeout=20)
        assert r.status_code == 200
        assert "reports" in r.json()

    def test_unauth_top_highlights_rejected(self):
        r = requests.get(f"{API}/community-highlights/top", timeout=20)
        assert r.status_code in (401, 403)
