"""Unit tests for utils/image_validate.py.

Covers all 3 branches of the hybrid strategy:
  - Under 2 MB decoded → pass through untouched (fast path)
  - 2–5 MB decoded → auto-resize to 1600px / JPEG q70
  - Over 5 MB decoded → 413

Plus edge cases: None, empty string, invalid base64, wrong shape, data-URL parsing.
"""
import base64
import io

import pytest
from fastapi import HTTPException
from PIL import Image

from utils.image_validate import (
    HARD_LIMIT_BYTES,
    AUTO_RESIZE_THRESHOLD_BYTES,
    MAX_DIMENSION,
    normalize_photo,
    normalize_photos,
)


def _make_jpeg(width: int, height: int, quality: int = 95) -> bytes:
    """Generate a random-noise JPEG of the requested size (bytes depend on WxH+quality)."""
    import random
    img = Image.new("RGB", (width, height))
    # Random pixels defeat JPEG compression, giving us predictable "big" payloads
    pix = img.load()
    for x in range(width):
        for y in range(height):
            pix[x, y] = (random.randint(0, 255),) * 3
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def _to_data_url(raw: bytes, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def _decoded_size(value: str) -> int:
    _, _, payload = value.partition("base64,")
    return len(base64.b64decode(payload))


# ===== Pass-through branch (< 2 MB) =====================================

def test_none_returns_none():
    assert normalize_photo(None) is None


def test_empty_string_returns_empty():
    assert normalize_photo("") == ""


def test_small_image_passes_through_unchanged():
    """~10 KB image → returned byte-for-byte identical."""
    raw = _make_jpeg(100, 100, quality=80)
    assert len(raw) < AUTO_RESIZE_THRESHOLD_BYTES
    data_url = _to_data_url(raw)
    out = normalize_photo(data_url)
    assert out == data_url, "Fast path must not mutate small images"


def test_raw_base64_without_data_url_prefix_also_passes():
    raw = _make_jpeg(50, 50)
    b64 = base64.b64encode(raw).decode("ascii")
    assert normalize_photo(b64) == b64


# ===== Auto-resize branch (2–5 MB) =======================================

def test_medium_image_gets_auto_resized():
    """~3 MB decoded → re-compressed to 1600px JPEG q70 (much smaller)."""
    # 1800x1800 random @ q=95 → reliably > 2 MB
    raw = _make_jpeg(1800, 1800, quality=95)
    assert AUTO_RESIZE_THRESHOLD_BYTES < len(raw) <= HARD_LIMIT_BYTES, (
        f"Need a payload between 2 and 5 MB; got {len(raw)}. Try a different size."
    )
    original = _to_data_url(raw)

    out = normalize_photo(original)

    # Must have been re-encoded (not identity)
    assert out != original
    assert out.startswith("data:image/jpeg;base64,")
    # Output must be strictly smaller
    assert _decoded_size(out) < len(raw)
    # Output must be decodable and within MAX_DIMENSION bounds
    out_raw = base64.b64decode(out.partition("base64,")[2])
    img = Image.open(io.BytesIO(out_raw))
    assert max(img.size) <= MAX_DIMENSION
    # And round-tripping again is idempotent enough (new size < 2 MB → passthrough)
    assert normalize_photo(out) == out


def test_png_with_transparency_gets_flattened_to_jpeg():
    """PNGs over the resize threshold get flattened to RGB JPEG."""
    img = Image.new("RGBA", (2000, 2000), (255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()
    # Only run if actually in the auto-resize window
    if not (AUTO_RESIZE_THRESHOLD_BYTES < len(raw) <= HARD_LIMIT_BYTES):
        pytest.skip(f"PNG size {len(raw)} outside 2-5 MB window on this platform")
    data_url = _to_data_url(raw, mime="image/png")
    out = normalize_photo(data_url)
    assert out.startswith("data:image/jpeg;base64,"), "Transparency should be flattened to JPEG"


# ===== Hard-limit branch (> 5 MB) ========================================

def test_oversize_image_raises_413():
    """> 5 MB decoded → HTTP 413 Payload Too Large."""
    # 2800x2800 random @ q=95 → reliably > 5 MB
    raw = _make_jpeg(2800, 2800, quality=95)
    assert len(raw) > HARD_LIMIT_BYTES, f"Need > 5 MB; got {len(raw)}"
    data_url = _to_data_url(raw)

    with pytest.raises(HTTPException) as exc:
        normalize_photo(data_url)
    assert exc.value.status_code == 413
    assert "Max" in exc.value.detail


# ===== Error branches ====================================================

def test_invalid_base64_raises_400():
    with pytest.raises(HTTPException) as exc:
        normalize_photo("!!!not-base64$$$")
    assert exc.value.status_code == 400


def test_non_string_raises_400():
    with pytest.raises(HTTPException) as exc:
        normalize_photo(b"not a string")  # type: ignore
    assert exc.value.status_code == 400


def test_garbage_bytes_decoded_but_not_an_image_in_resize_branch():
    """Valid base64 but not a real image, sized into the resize window → 400."""
    # Create a 3 MB junk blob of valid b64 that Pillow can't decode
    raw = b"\x00" * (3 * 1024 * 1024)
    data_url = _to_data_url(raw)
    with pytest.raises(HTTPException) as exc:
        normalize_photo(data_url)
    # Pillow raises → we map to 400
    assert exc.value.status_code == 400


# ===== List helper ========================================================

def test_normalize_photos_list():
    raw_small = _make_jpeg(80, 80)
    data_url = _to_data_url(raw_small)
    out = normalize_photos([data_url, None, ""])
    assert out == [data_url, None, ""]


def test_normalize_photos_none_and_empty():
    assert normalize_photos(None) is None
    assert normalize_photos([]) == []
