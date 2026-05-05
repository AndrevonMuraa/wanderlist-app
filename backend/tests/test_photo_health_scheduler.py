"""Tests for the daily photo-health scheduler."""
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils import photo_health_scheduler as sched


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def fake_collect():
    """Two URLs, one of which the scan will mark broken."""
    return {
        "visits": {"https://good.example.com/a.jpg", "https://broken.example.com/b.jpg"},
        "user_created_visits": set(),
        "country_visits": set(),
        "landmarks": set(),
        "users": set(),
    }


def test_run_once_persists_and_skips_alert_below_threshold(fake_collect, monkeypatch):
    monkeypatch.setattr(sched, "ALERT_THRESHOLD", 10)

    inserted = {}

    class _FakeColl:
        async def insert_one(self, doc):
            inserted.update(doc)

    fake_db = type("D", (), {"photo_health_runs": _FakeColl()})()

    with patch.object(sched, "_collect_all_urls", new=AsyncMock(return_value=fake_collect)), \
         patch.object(sched, "check_urls", new=AsyncMock(return_value={"https://broken.example.com/b.jpg"})), \
         patch.object(sched, "db", fake_db), \
         patch.object(sched, "_alert_super_admins", new=AsyncMock(return_value=0)) as alert_mock, \
         patch.object(sched, "track_photo_health_run") as run_track, \
         patch.object(sched, "track_photo_health_alert") as alert_track:
        run_doc = _run(sched.run_once())

    assert run_doc["scanned"] == 2
    assert run_doc["broken_count"] == 1
    assert run_doc["alerted_admins"] == 0
    assert run_doc["broken_by_collection"]["visits"] == 1
    assert inserted["run_id"] == run_doc["run_id"]
    alert_mock.assert_not_awaited()
    run_track.assert_called_once()         # breadcrumb every run
    alert_track.assert_not_called()        # no Sentry issue below threshold


def test_run_once_alerts_when_at_or_above_threshold(fake_collect, monkeypatch):
    monkeypatch.setattr(sched, "ALERT_THRESHOLD", 1)

    class _FakeColl:
        async def insert_one(self, doc):
            return None

    fake_db = type("D", (), {"photo_health_runs": _FakeColl()})()

    with patch.object(sched, "_collect_all_urls", new=AsyncMock(return_value=fake_collect)), \
         patch.object(sched, "check_urls", new=AsyncMock(return_value={"https://broken.example.com/b.jpg"})), \
         patch.object(sched, "db", fake_db), \
         patch.object(sched, "_alert_super_admins", new=AsyncMock(return_value=2)) as alert_mock, \
         patch.object(sched, "track_photo_health_run") as run_track, \
         patch.object(sched, "track_photo_health_alert") as alert_track:
        run_doc = _run(sched.run_once())

    assert run_doc["alerted_admins"] == 2
    alert_mock.assert_awaited_once()
    run_track.assert_called_once()         # breadcrumb every run
    alert_track.assert_called_once()       # Sentry issue when threshold breached


def test_alert_super_admins_calls_create_notification_and_push():
    admins = [{"user_id": "u1"}, {"user_id": "u2"}]

    class _Cursor:
        def __init__(self, docs):
            self._docs = list(docs)

        def __aiter__(self):
            return self

        async def __anext__(self):
            if not self._docs:
                raise StopAsyncIteration
            return self._docs.pop(0)

    class _Users:
        def find(self, *a, **kw):
            return _Cursor(admins)

    fake_db = type("D", (), {"users": _Users()})()

    with patch.object(sched, "db", fake_db), \
         patch.object(sched, "create_notification", new=AsyncMock(return_value="notif_x")) as cn, \
         patch.object(sched, "send_push_notification", new=AsyncMock(return_value=True)) as sp:
        notified = _run(sched._alert_super_admins(
            broken_count=12,
            by_collection={"visits": ["a", "b"], "users": []},
        ))

    assert notified == 2
    assert cn.await_count == 2
    assert sp.await_count == 2
