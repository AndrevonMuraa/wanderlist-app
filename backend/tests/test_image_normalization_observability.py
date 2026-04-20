"""Test the image normalization observability layer (Sentry counters + admin stats endpoint).

Covers: 
- IMAGE_NORM_COUNTERS increments on auto_resized + rejected branches
- /api/admin/image-normalization-stats endpoint exposes counters
- Sentry helpers are noop-safe even when DSN is not set (safe mode)
"""
import base64
import io
import os
import random

import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path
from PIL import Image
from fastapi import HTTPException

# Load backend/.env
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from utils.image_validate import normalize_photo, HARD_LIMIT_BYTES, AUTO_RESIZE_THRESHOLD_BYTES
from utils.sentry import IMAGE_NORM_COUNTERS


BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")


def _make_jpeg(w, h, q=95):
    img = Image.new("RGB", (w, h))
    pix = img.load()
    for x in range(w):
        for y in range(h):
            pix[x, y] = (random.randint(0, 255),) * 3
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=q)
    return buf.getvalue()


def _to_data_url(raw, mime="image/jpeg"):
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


# ===== Counter increments ==========================================

def test_auto_resized_counter_increments():
    before = IMAGE_NORM_COUNTERS["auto_resized"]
    raw = _make_jpeg(1800, 1800, q=95)
    assert AUTO_RESIZE_THRESHOLD_BYTES < len(raw) <= HARD_LIMIT_BYTES
    normalize_photo(_to_data_url(raw))
    assert IMAGE_NORM_COUNTERS["auto_resized"] == before + 1


def test_rejected_counter_increments():
    before = IMAGE_NORM_COUNTERS["rejected"]
    raw = _make_jpeg(2800, 2800, q=95)
    assert len(raw) > HARD_LIMIT_BYTES
    with pytest.raises(HTTPException) as exc:
        normalize_photo(_to_data_url(raw))
    assert exc.value.status_code == 413
    assert IMAGE_NORM_COUNTERS["rejected"] == before + 1


def test_small_image_does_not_increment_counters():
    before = dict(IMAGE_NORM_COUNTERS)
    raw = _make_jpeg(100, 100)
    normalize_photo(_to_data_url(raw))
    assert IMAGE_NORM_COUNTERS == before, "Fast-path must not touch counters"


# ===== Admin endpoint =============================================

def _login(email="test@wandermark.app", password="Test1234!"):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def test_admin_stats_endpoint_returns_counters_and_thresholds():
    token = _login()
    r = requests.get(
        f"{BASE_URL}/api/admin/image-normalization-stats",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "counters" in body
    assert "auto_resized" in body["counters"]
    assert "rejected" in body["counters"]
    assert isinstance(body["counters"]["auto_resized"], int)
    assert isinstance(body["counters"]["rejected"], int)
    # Thresholds block
    assert body["thresholds"]["auto_resize_above_mb"] == 2
    assert body["thresholds"]["reject_above_mb"] == 5
    assert body["thresholds"]["target_dimension_px"] == 1600


def test_admin_stats_endpoint_requires_admin():
    """Non-admin tokens get 403 (same as other /api/admin/* endpoints)."""
    token = _login(email="testpro@wandermark.app", password="Test1234!")
    r = requests.get(
        f"{BASE_URL}/api/admin/image-normalization-stats",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code in (401, 403)


def test_admin_stats_endpoint_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/image-normalization-stats", timeout=10)
    assert r.status_code in (401, 403)
