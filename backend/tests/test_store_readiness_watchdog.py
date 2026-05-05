"""Tests for the Store Readiness watchdog scheduler."""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock

import pytest

# Ensure the watchdog itself doesn't auto-start during the test
os.environ["STORE_READINESS_SCHEDULER_DISABLED"] = "1"

from utils.db import db  # noqa: E402
from utils.store_readiness_scheduler import evaluate_once  # noqa: E402

# compute_readiness is imported *inside* evaluate_once to avoid a circular
# import. The mock target must therefore be the source module.
COMPUTE_PATH = "routes.store_readiness.compute_readiness"


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(autouse=True)
def _reset_state():
    _run(db.store_readiness_state.delete_many({}))
    yield
    _run(db.store_readiness_state.delete_many({}))


def _fake_report(failures: int, warnings: int = 0):
    failed = [{"id": f"check-{i}", "label": "x", "status": "fail"} for i in range(failures)]
    warned = [{"id": f"warn-{i}", "label": "x", "status": "warn"} for i in range(warnings)]
    return {
        "checks": failed + warned,
        "summary": {
            "total": failures + warnings,
            "passed": 0,
            "warnings": warnings,
            "failures": failures,
            "ready_to_submit": failures == 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def test_no_failures_resets_state():
    """When everything passes, state is fully clean."""
    # Pre-seed a stale failing state to confirm reset
    _run(db.store_readiness_state.update_one(
        {"_id": "global"},
        {"$set": {
            "failing_since": datetime.now(timezone.utc) - timedelta(hours=48),
            "alerted": True,
        }},
        upsert=True,
    ))
    with patch(COMPUTE_PATH, new=AsyncMock(return_value=_fake_report(0, 1))):
        state = _run(evaluate_once())

    assert state["last_failures"] == 0
    assert state["failing_since"] is None
    assert state["alerted"] is False


def test_first_failure_stamps_failing_since_no_alert():
    """First red blocker → start the clock, but don't page yet."""
    fake_alert = patch("utils.store_readiness_scheduler.track_store_readiness_alert").start()
    try:
        with patch(COMPUTE_PATH, new=AsyncMock(return_value=_fake_report(2))):
            state = _run(evaluate_once())
        assert state["last_failures"] == 2
        assert state["failing_since"] is not None
        assert state["alerted"] is False
        fake_alert.assert_not_called()
    finally:
        patch.stopall()


def test_failure_within_grace_does_not_alert():
    """Sustained failure shorter than grace window → no Sentry, no push."""
    short_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    _run(db.store_readiness_state.update_one(
        {"_id": "global"},
        {"$set": {"failing_since": short_ago, "alerted": False}},
        upsert=True,
    ))
    fake_alert = patch("utils.store_readiness_scheduler.track_store_readiness_alert").start()
    try:
        with patch(COMPUTE_PATH, new=AsyncMock(return_value=_fake_report(1))):
            state = _run(evaluate_once())
        assert state["alerted"] is False
        fake_alert.assert_not_called()
    finally:
        patch.stopall()


def test_failure_past_grace_pages_once():
    """Sustained failure beyond grace → fire Sentry + flip alerted=True. Second
    cycle in the same incident must NOT re-page."""
    long_ago = datetime.now(timezone.utc) - timedelta(hours=30)
    _run(db.store_readiness_state.update_one(
        {"_id": "global"},
        {"$set": {"failing_since": long_ago, "alerted": False}},
        upsert=True,
    ))

    fake_alert = patch("utils.store_readiness_scheduler.track_store_readiness_alert").start()
    fake_admins = patch(
        "utils.store_readiness_scheduler._alert_super_admins",
        new=AsyncMock(return_value=2),
    ).start()
    try:
        with patch(COMPUTE_PATH, new=AsyncMock(return_value=_fake_report(1))):
            first = _run(evaluate_once())
        assert first["alerted"] is True
        fake_alert.assert_called_once()
        kwargs = fake_alert.call_args.kwargs
        assert kwargs["failures"] == 1
        assert kwargs["hours_failing"] >= 24

        # Second cycle while still failing → still alerted=True, but no second page
        with patch(COMPUTE_PATH, new=AsyncMock(return_value=_fake_report(1))):
            second = _run(evaluate_once())
        assert second["alerted"] is True
        assert fake_alert.call_count == 1  # NOT incremented
        assert fake_admins.call_count == 1
    finally:
        patch.stopall()
