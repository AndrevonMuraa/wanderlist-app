"""Server-side image validation + defensive re-compression.

Strategy (hybrid, from user decision Apr-2026):
- Under 2 MB decoded → pass through untouched (fast path; client already compressed)
- 2–5 MB decoded → auto-resize to 1600px / JPEG q70 (defense-in-depth)
- Over 5 MB decoded → HTTPException 413 (hard ceiling)

The client-side pipeline (`frontend/utils/image.ts`) already targets 1600px / q70,
so this only protects against: older app versions, modified clients, direct
curl POSTs, and fallback paths that bypassed compression.
"""
import base64
import io
import re
from typing import Optional

from fastapi import HTTPException
from PIL import Image, ImageOps


# ---- Tunables ----------------------------------------------------------------
HARD_LIMIT_BYTES = 5 * 1024 * 1024            # 5 MB decoded → reject
AUTO_RESIZE_THRESHOLD_BYTES = 2 * 1024 * 1024  # 2 MB decoded → re-compress
MAX_DIMENSION = 1600
JPEG_QUALITY = 70

_DATA_URL_RE = re.compile(r"^data:image/(?P<fmt>[a-zA-Z0-9+.-]+);base64,(?P<b64>.+)$", re.DOTALL)


def _split_data_url(s: str) -> tuple[Optional[str], str]:
    """Return (data_url_prefix, base64_payload). Prefix is None for raw base64."""
    m = _DATA_URL_RE.match(s)
    if m:
        return f"data:image/{m.group('fmt')};base64,", m.group("b64")
    return None, s


def _decode(b64: str) -> bytes:
    try:
        # Strip accidental whitespace / newlines
        return base64.b64decode(b64.strip(), validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image: base64 decode failed")


def _recompress(raw: bytes) -> str:
    """Open with Pillow, auto-rotate via EXIF, downscale, JPEG-encode, return data URL."""
    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # Honor camera rotation
        if img.mode in ("RGBA", "LA", "P"):
            # Flatten transparency onto white for JPEG
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1] if img.mode != "P" else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        if max(img.size) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        out_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{out_b64}"
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image: could not decode")


def normalize_photo(value: Optional[str]) -> Optional[str]:
    """Validate + defensively re-compress a single photo.

    Returns the possibly-modified base64/data-URL string.
    Raises HTTPException(413) for oversized, HTTPException(400) for invalid.
    None / empty → None (pass-through).
    """
    if value is None or value == "":
        return value
    if not isinstance(value, str):
        # Unexpected shape; be strict rather than forgiving here
        raise HTTPException(status_code=400, detail="Invalid image: expected string")

    _prefix, b64 = _split_data_url(value)
    raw = _decode(b64)
    size = len(raw)

    if size > HARD_LIMIT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large ({size // 1024} KB). Max is {HARD_LIMIT_BYTES // (1024*1024)} MB.",
        )
    if size <= AUTO_RESIZE_THRESHOLD_BYTES:
        # Fast path: client already compressed sufficiently
        return value
    # 2–5 MB: re-compress server-side
    return _recompress(raw)


def normalize_photos(values):
    """Map normalize_photo over a list (or tuple). None / empty → returned unchanged."""
    if not values:
        return values
    return [normalize_photo(v) for v in values]
