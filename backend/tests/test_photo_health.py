"""Tests for the photo health utility."""
import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.photo_health import _is_external_http_url, check_urls


# ---------------------------------------------------------------------------
# Pure-function tests
# ---------------------------------------------------------------------------
def test_is_external_http_url_accepts_http_and_https():
    assert _is_external_http_url("https://example.com/x.jpg")
    assert _is_external_http_url("http://example.com/x.jpg")


def test_is_external_http_url_rejects_non_http():
    assert not _is_external_http_url("")
    assert not _is_external_http_url(None)
    assert not _is_external_http_url("data:image/png;base64,iVBORw0KGgo=")
    assert not _is_external_http_url("file:///tmp/x.jpg")
    assert not _is_external_http_url("/relative/path.jpg")
    assert not _is_external_http_url(123)


# ---------------------------------------------------------------------------
# check_urls() — patches aiohttp to avoid real network calls
# ---------------------------------------------------------------------------
class _FakeResponse:
    def __init__(self, status: int):
        self.status = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None


class _FakeSession:
    def __init__(self, status_map):
        self.status_map = status_map

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    def head(self, url, **kwargs):
        return _FakeResponse(self.status_map.get(url, 200))

    def get(self, url, **kwargs):
        return _FakeResponse(self.status_map.get(url, 200))


def _run(coro):
    return asyncio.run(coro)


def test_check_urls_returns_only_broken():
    status_map = {
        "https://good.example.com/a.jpg": 200,
        "https://broken.example.com/b.jpg": 404,
        "https://server-error.example.com/c.jpg": 503,
    }

    with patch("utils.photo_health.aiohttp.ClientSession",
               lambda *a, **kw: _FakeSession(status_map)):
        broken = _run(check_urls(status_map.keys()))

    assert broken == {
        "https://broken.example.com/b.jpg",
        "https://server-error.example.com/c.jpg",
    }


def test_check_urls_empty_input():
    broken = _run(check_urls([]))
    assert broken == set()


def test_check_urls_skips_non_http():
    status_map = {"https://good.example.com/a.jpg": 200}
    with patch("utils.photo_health.aiohttp.ClientSession",
               lambda *a, **kw: _FakeSession(status_map)):
        broken = _run(check_urls([
            "https://good.example.com/a.jpg",
            "data:image/png;base64,xxx",
            "",
        ]))
    assert broken == set()


def test_check_urls_handles_network_exceptions():
    """If a probe raises, the URL is treated as broken (defensive)."""

    class _RaisingSession(_FakeSession):
        def head(self, url, **kwargs):
            raise RuntimeError("network down")

    with patch("utils.photo_health.aiohttp.ClientSession",
               lambda *a, **kw: _RaisingSession({})):
        broken = _run(check_urls(["https://flaky.example.com/x.jpg"]))

    assert broken == {"https://flaky.example.com/x.jpg"}
