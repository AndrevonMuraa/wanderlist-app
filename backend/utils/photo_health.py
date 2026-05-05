"""
Photo URL Health utilities.

Used by:
  - /api/admin/photos/healthcheck       — scan + report broken URLs
  - /api/admin/photos/healthcheck/repair — pull broken URLs out of all collections
  - scripts/cleanup_broken_photos.py     — manual one-shot run

Design:
  - HEAD-checks URLs in parallel with a per-host concurrency limit so we
    don't hammer Unsplash and trigger rate-limits.
  - Anything that doesn't respond 200 OK within 8 seconds is considered broken.
  - Repair is *non-destructive* for base64 photos and never touches live URLs.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Iterable, Set
from urllib.parse import urlparse

import aiohttp

logger = logging.getLogger(__name__)

# Aggressively short timeout — a real CDN responds to HEAD in < 1s
PROBE_TIMEOUT_SECONDS = 8
# Cap concurrent requests to the same host to avoid 429 rate limits
PER_HOST_CONCURRENCY = 6
# Total concurrent probes across all hosts
GLOBAL_CONCURRENCY = 30


def _is_external_http_url(value: object) -> bool:
    """Only http(s) URLs need a healthcheck. Skip base64, file:, empty, etc."""
    if not isinstance(value, str) or not value:
        return False
    if value.startswith("data:") or value.startswith("file:"):
        return False
    return value.startswith("http://") or value.startswith("https://")


async def _probe(session: aiohttp.ClientSession, url: str) -> bool:
    """Return True if the URL responds 200 OK to a HEAD (or fallback GET)."""
    try:
        async with session.head(
            url,
            allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=PROBE_TIMEOUT_SECONDS),
        ) as r:
            if r.status == 200:
                return True
            # Some CDNs don't support HEAD — retry with GET range
            if r.status in (403, 405):
                async with session.get(
                    url,
                    headers={"Range": "bytes=0-0"},
                    allow_redirects=True,
                    timeout=aiohttp.ClientTimeout(total=PROBE_TIMEOUT_SECONDS),
                ) as g:
                    return g.status in (200, 206)
            return False
    except Exception as exc:
        logger.debug("Photo probe failed for %s: %s", url, exc)
        return False


async def check_urls(urls: Iterable[str]) -> Set[str]:
    """
    Probe every URL once. Returns the set of broken (non-200) URLs.

    Empty/non-http inputs are silently dropped.
    """
    candidates = sorted({u for u in urls if _is_external_http_url(u)})
    if not candidates:
        return set()

    global_sem = asyncio.Semaphore(GLOBAL_CONCURRENCY)
    host_locks: dict[str, asyncio.Semaphore] = {}

    def host_sem(url: str) -> asyncio.Semaphore:
        host = urlparse(url).netloc.lower()
        if host not in host_locks:
            host_locks[host] = asyncio.Semaphore(PER_HOST_CONCURRENCY)
        return host_locks[host]

    broken: Set[str] = set()

    connector = aiohttp.TCPConnector(limit=GLOBAL_CONCURRENCY * 2)
    async with aiohttp.ClientSession(connector=connector) as session:

        async def guarded(u: str):
            async with global_sem:
                async with host_sem(u):
                    ok = await _probe(session, u)
                    if not ok:
                        broken.add(u)

        await asyncio.gather(*(guarded(u) for u in candidates))

    return broken
