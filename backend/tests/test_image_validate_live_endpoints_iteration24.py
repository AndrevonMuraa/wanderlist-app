"""Live E2E coverage for server-side image compression defense-in-depth.

Verifies the hybrid strategy (<2MB pass-through, 2-5MB auto-resize, >5MB → 413)
across every upload endpoint wired through `utils.image_validate.normalize_photo(s)`:

  - PUT  /api/auth/profile            picture + banner_image
  - POST /api/visits                  photos[] (and photo_base64)
  - POST /api/country-visits          photos[]
  - POST /api/user-created-visits     photos[]  (Pro)
  - POST /api/messages                image_base64 (Pro + accepted friend)
  - POST /api/bug-reports             screenshots[]

Plus: invalid base64 (400).

Generates huge/medium/small images once per session (PIL + random pixels)
and tears down every inserted DB row at the end.
"""
import base64
import io
import os
import random
import uuid
from pathlib import Path

import pymongo
import pytest
import requests
from dotenv import load_dotenv
from PIL import Image

# Load backend/.env
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or os.environ.get("BASE_URL") or "http://localhost:8001"
BASE_URL = BASE_URL.rstrip("/")

ADMIN_EMAIL = "test@wandermark.app"
ADMIN_PASSWORD = "Test1234!"
PRO_EMAIL = "testpro@wandermark.app"
PRO_PASSWORD = "Test1234!"
ADMIN_ID = "user_dd46a314f120"
PRO_ID = "user_6ef7ed0c470a"

HARD_LIMIT = 5 * 1024 * 1024
RESIZE_THRESHOLD = 2 * 1024 * 1024


# ------------------------------------------------------------------------
# Image generators (session-scoped so we only pay the cost once)
# ------------------------------------------------------------------------

def _make_random_jpeg(size_px: int, quality: int = 95) -> bytes:
    img = Image.new("RGB", (size_px, size_px))
    pix = img.load()
    rnd = random.Random(size_px)  # deterministic for faster CI reproducibility
    for x in range(size_px):
        for y in range(size_px):
            pix[x, y] = (rnd.randint(0, 255),) * 3
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return buf.getvalue()


def _to_data_url(raw: bytes, mime: str = "image/jpeg") -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def _decoded_size(value: str) -> int:
    if not value:
        return 0
    _, _, payload = value.partition("base64,")
    return len(base64.b64decode(payload))


@pytest.fixture(scope="session")
def huge_image():
    """> 5 MB (hard-limit rejection). 2800px random @ q95 reliably exceeds."""
    raw = _make_random_jpeg(2800, quality=95)
    assert len(raw) > HARD_LIMIT, f"Need >5 MB huge fixture, got {len(raw)}"
    return _to_data_url(raw)


@pytest.fixture(scope="session")
def medium_image():
    """2–5 MB (auto-resize window)."""
    raw = _make_random_jpeg(2000, quality=95)
    assert RESIZE_THRESHOLD < len(raw) <= HARD_LIMIT, (
        f"Need 2-5 MB medium fixture, got {len(raw)}"
    )
    return _to_data_url(raw), len(raw)


@pytest.fixture(scope="session")
def small_image():
    """~ a few KB (fast-path pass-through)."""
    raw = _make_random_jpeg(100, quality=80)
    assert len(raw) < RESIZE_THRESHOLD
    return _to_data_url(raw)


# ------------------------------------------------------------------------
# Auth + DB fixtures
# ------------------------------------------------------------------------

def _mongo():
    return pymongo.MongoClient(os.environ["MONGO_URL"])[os.environ.get("DB_NAME", "wandermark")]


def _login(email: str, password: str):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code} {r.text[:200]}")
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def pro_token():
    return _login(PRO_EMAIL, PRO_PASSWORD)


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def pro_headers(pro_token):
    return {"Authorization": f"Bearer {pro_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def db():
    return _mongo()


# Track everything we insert to clean up at session end
_INSERTED = {"visits": [], "country_visits": [], "user_created_visits": [], "messages": [], "bug_reports": [], "friends": []}


@pytest.fixture(scope="session", autouse=True)
def _cleanup(db):
    yield
    for coll_name, ids in _INSERTED.items():
        if not ids:
            continue
        id_field = {
            "visits": "visit_id",
            "country_visits": "country_visit_id",
            "user_created_visits": "user_created_visit_id",
            "messages": "message_id",
            "bug_reports": "report_id",
            "friends": "friendship_id",
        }[coll_name]
        db[coll_name].delete_many({id_field: {"$in": ids}})


@pytest.fixture(scope="session")
def pro_friendship(db):
    """Ensure testpro has an accepted friendship with admin so messages work."""
    existing = db.friends.find_one({
        "status": "accepted",
        "$or": [
            {"user_id": PRO_ID, "friend_id": ADMIN_ID},
            {"user_id": ADMIN_ID, "friend_id": PRO_ID},
        ],
    })
    if existing:
        return existing["friendship_id"]
    from datetime import datetime, timezone
    fid = f"friend_test_{uuid.uuid4().hex[:10]}"
    db.friends.insert_one({
        "friendship_id": fid,
        "user_id": PRO_ID,
        "friend_id": ADMIN_ID,
        "status": "accepted",
        "created_at": datetime.now(timezone.utc),
    })
    _INSERTED["friends"].append(fid)
    return fid


def _pick_unvisited_landmark(db, user_id: str) -> str:
    visited = {v["landmark_id"] for v in db.visits.find({"user_id": user_id}, {"_id": 0, "landmark_id": 1})}
    lm = db.landmarks.find_one({"landmark_id": {"$nin": list(visited)}}, {"_id": 0, "landmark_id": 1})
    assert lm and lm.get("landmark_id"), "No unvisited landmarks found"
    return lm["landmark_id"]


def _pick_unvisited_country(db, user_id: str) -> str:
    visited = {cv["country_id"] for cv in db.country_visits.find({"user_id": user_id}, {"_id": 0, "country_id": 1})}
    c = db.countries.find_one({"country_id": {"$nin": list(visited)}}, {"_id": 0, "country_id": 1})
    assert c and c.get("country_id"), "No unvisited countries found"
    return c["country_id"]


# ------------------------------------------------------------------------
# 1) PUT /api/auth/profile  (picture + banner_image)
# ------------------------------------------------------------------------

class TestAuthProfileImages:
    def _put(self, headers, field, value):
        return requests.put(f"{BASE_URL}/api/auth/profile", headers=headers, json={field: value}, timeout=60)

    def _restore_profile(self, headers):
        # Reset both fields to empty to avoid polluting later test runs / DB with huge image
        requests.put(f"{BASE_URL}/api/auth/profile", headers=headers,
                     json={"picture": "", "banner_image": ""}, timeout=30)

    def test_banner_huge_returns_413(self, admin_headers, huge_image):
        r = self._put(admin_headers, "banner_image", huge_image)
        assert r.status_code == 413, f"Expected 413, got {r.status_code}: {r.text[:300]}"
        assert "too large" in r.text.lower()

    def test_banner_medium_is_auto_resized(self, admin_headers, medium_image):
        data_url, orig_size = medium_image
        try:
            r = self._put(admin_headers, "banner_image", data_url)
            assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
            me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=30).json()
            stored = me.get("banner_image")
            assert stored, "banner_image not persisted"
            assert _decoded_size(stored) < orig_size, (
                f"Server did not shrink medium image (orig={orig_size}, stored={_decoded_size(stored)})"
            )
            assert stored.startswith("data:image/jpeg"), "Auto-resized should be JPEG"
        finally:
            self._restore_profile(admin_headers)

    def test_banner_small_passes_through(self, admin_headers, small_image):
        try:
            r = self._put(admin_headers, "banner_image", small_image)
            assert r.status_code == 200
            me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=30).json()
            assert me.get("banner_image") == small_image, "Small image must be stored byte-for-byte"
        finally:
            self._restore_profile(admin_headers)

    def test_picture_huge_returns_413(self, admin_headers, huge_image):
        r = self._put(admin_headers, "picture", huge_image)
        assert r.status_code == 413, f"Expected 413, got {r.status_code}: {r.text[:300]}"

    def test_picture_medium_is_auto_resized(self, admin_headers, medium_image):
        data_url, orig_size = medium_image
        try:
            r = self._put(admin_headers, "picture", data_url)
            assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
            me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=30).json()
            stored = me.get("picture")
            assert stored and _decoded_size(stored) < orig_size
        finally:
            self._restore_profile(admin_headers)

    def test_picture_small_passes_through(self, admin_headers, small_image):
        try:
            r = self._put(admin_headers, "picture", small_image)
            assert r.status_code == 200
            me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=30).json()
            assert me.get("picture") == small_image
        finally:
            self._restore_profile(admin_headers)

    def test_picture_invalid_base64_returns_400(self, admin_headers):
        r = self._put(admin_headers, "picture", "!!!not-base64$$$")
        assert r.status_code == 400, f"{r.status_code}: {r.text[:300]}"
        assert "invalid image" in r.text.lower()


# ------------------------------------------------------------------------
# 2) POST /api/visits — photos[]
# ------------------------------------------------------------------------

class TestVisitPhotos:
    def _post(self, headers, db, image_value):
        lm_id = _pick_unvisited_landmark(db, ADMIN_ID)
        return requests.post(
            f"{BASE_URL}/api/visits",
            headers=headers,
            json={"landmark_id": lm_id, "photos": [image_value], "diary_notes": "iteration24 test"},
            timeout=60,
        )

    def _track(self, r):
        try:
            vid = r.json().get("visit_id")
            if vid:
                _INSERTED["visits"].append(vid)
        except Exception:
            pass

    def test_visit_huge_returns_413(self, admin_headers, db, huge_image):
        r = self._post(admin_headers, db, huge_image)
        self._track(r)
        assert r.status_code == 413, f"Expected 413, got {r.status_code}: {r.text[:300]}"

    def test_visit_medium_is_auto_resized(self, admin_headers, db, medium_image):
        data_url, orig_size = medium_image
        r = self._post(admin_headers, db, data_url)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        stored = (r.json().get("photos") or [None])[0]
        assert stored and _decoded_size(stored) < orig_size
        assert stored.startswith("data:image/jpeg")

    def test_visit_small_passes_through(self, admin_headers, db, small_image):
        r = self._post(admin_headers, db, small_image)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        stored = (r.json().get("photos") or [None])[0]
        assert stored == small_image


# ------------------------------------------------------------------------
# 3) POST /api/country-visits — photos[]
# ------------------------------------------------------------------------

class TestCountryVisitPhotos:
    def _post(self, headers, db, image_value, country_id=None):
        if country_id is None:
            country_id = _pick_unvisited_country(db, ADMIN_ID)
        return requests.post(
            f"{BASE_URL}/api/country-visits",
            headers=headers,
            json={"country_id": country_id, "photos": [image_value]},
            timeout=60,
        )

    def _track(self, r):
        try:
            cvid = r.json().get("country_visit_id") or r.json().get("visit", {}).get("country_visit_id")
            if cvid:
                _INSERTED["country_visits"].append(cvid)
        except Exception:
            pass

    def test_country_huge_returns_413(self, admin_headers, db, huge_image):
        r = self._post(admin_headers, db, huge_image)
        self._track(r)
        assert r.status_code == 413, f"{r.status_code}: {r.text[:300]}"

    def test_country_medium_is_auto_resized(self, admin_headers, db, medium_image):
        data_url, orig_size = medium_image
        r = self._post(admin_headers, db, data_url)
        self._track(r)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:300]}"
        # Response shape: look it up in DB to compare sizes
        j = r.json()
        stored = None
        if "photos" in j:
            stored = (j.get("photos") or [None])[0]
        if not stored:
            cvid = j.get("country_visit_id")
            if cvid:
                cv = db.country_visits.find_one({"country_visit_id": cvid}, {"_id": 0, "photos": 1})
                stored = (cv.get("photos") or [None])[0] if cv else None
        assert stored and _decoded_size(stored) < orig_size

    def test_country_small_passes_through(self, admin_headers, db, small_image):
        r = self._post(admin_headers, db, small_image)
        self._track(r)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:300]}"
        j = r.json()
        stored = (j.get("photos") or [None])[0] if "photos" in j else None
        if not stored:
            cvid = j.get("country_visit_id")
            if cvid:
                cv = db.country_visits.find_one({"country_visit_id": cvid}, {"_id": 0, "photos": 1})
                stored = (cv.get("photos") or [None])[0] if cv else None
        assert stored == small_image


# ------------------------------------------------------------------------
# 4) POST /api/user-created-visits — photos[] (Pro required)
# ------------------------------------------------------------------------

class TestUserCreatedVisitPhotos:
    def _post(self, headers, image_value):
        return requests.post(
            f"{BASE_URL}/api/user-created-visits",
            headers=headers,
            json={
                "country_name": f"TESTLand_{uuid.uuid4().hex[:6]}",
                "photos": [image_value],
                "landmarks": [],
                "diary_notes": "iteration24",
            },
            timeout=60,
        )

    def _track(self, r):
        try:
            vid = r.json().get("user_created_visit_id") or r.json().get("visit", {}).get("user_created_visit_id")
            if vid:
                _INSERTED["user_created_visits"].append(vid)
        except Exception:
            pass

    def test_ucv_huge_returns_413(self, admin_headers, huge_image):
        r = self._post(admin_headers, huge_image)
        self._track(r)
        assert r.status_code == 413, f"{r.status_code}: {r.text[:300]}"

    def test_ucv_medium_is_auto_resized(self, admin_headers, db, medium_image):
        data_url, orig_size = medium_image
        r = self._post(admin_headers, data_url)
        self._track(r)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:300]}"
        j = r.json()
        stored = (j.get("photos") or [None])[0] if "photos" in j else None
        if not stored:
            vid = j.get("user_created_visit_id")
            if vid:
                d = db.user_created_visits.find_one({"user_created_visit_id": vid}, {"_id": 0, "photos": 1})
                stored = (d.get("photos") or [None])[0] if d else None
        assert stored and _decoded_size(stored) < orig_size

    def test_ucv_small_passes_through(self, admin_headers, db, small_image):
        r = self._post(admin_headers, small_image)
        self._track(r)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:300]}"
        j = r.json()
        stored = (j.get("photos") or [None])[0] if "photos" in j else None
        if not stored:
            vid = j.get("user_created_visit_id")
            if vid:
                d = db.user_created_visits.find_one({"user_created_visit_id": vid}, {"_id": 0, "photos": 1})
                stored = (d.get("photos") or [None])[0] if d else None
        assert stored == small_image


# ------------------------------------------------------------------------
# 5) POST /api/messages — image_base64 (Pro + friend)
# ------------------------------------------------------------------------

class TestMessageImage:
    SOCIAL_TESTER_ID = "user_ff9a3f370f6b"

    def _post(self, headers, image_value):
        return requests.post(
            f"{BASE_URL}/api/messages",
            headers=headers,
            json={"receiver_id": self.SOCIAL_TESTER_ID, "content": "iteration24", "image_base64": image_value},
            timeout=60,
        )

    def _track(self, r):
        try:
            mid = r.json().get("message_id")
            if mid:
                _INSERTED["messages"].append(mid)
        except Exception:
            pass

    def test_message_huge_returns_413(self, admin_headers, huge_image):
        r = self._post(admin_headers, huge_image)
        self._track(r)
        assert r.status_code == 413, f"{r.status_code}: {r.text[:300]}"

    def test_message_medium_is_auto_resized(self, admin_headers, db, medium_image):
        data_url, orig_size = medium_image
        r = self._post(admin_headers, data_url)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        stored = r.json().get("image_base64")
        assert stored and _decoded_size(stored) < orig_size
        assert stored.startswith("data:image/jpeg")

    def test_message_small_passes_through(self, admin_headers, small_image):
        r = self._post(admin_headers, small_image)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        stored = r.json().get("image_base64")
        assert stored == small_image


# ------------------------------------------------------------------------
# 6) POST /api/bug-reports — screenshots[]
# ------------------------------------------------------------------------

class TestBugReportScreenshots:
    def _post(self, headers, image_value):
        return requests.post(
            f"{BASE_URL}/api/bug-reports",
            headers=headers,
            json={"description": "iteration24 screenshot test", "screenshots": [image_value]},
            timeout=60,
        )

    def _track(self, r):
        try:
            rid = r.json().get("report_id")
            if rid:
                _INSERTED["bug_reports"].append(rid)
        except Exception:
            pass

    def test_bug_report_huge_returns_413(self, admin_headers, huge_image):
        r = self._post(admin_headers, huge_image)
        self._track(r)
        assert r.status_code == 413, f"{r.status_code}: {r.text[:300]}"

    def test_bug_report_medium_is_auto_resized(self, admin_headers, db, medium_image):
        data_url, orig_size = medium_image
        r = self._post(admin_headers, data_url)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        rid = r.json().get("report_id")
        assert rid
        doc = db.bug_reports.find_one({"report_id": rid}, {"_id": 0, "screenshots": 1})
        stored = (doc.get("screenshots") or [None])[0]
        assert stored and _decoded_size(stored) < orig_size

    def test_bug_report_small_passes_through(self, admin_headers, db, small_image):
        r = self._post(admin_headers, small_image)
        self._track(r)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        rid = r.json().get("report_id")
        doc = db.bug_reports.find_one({"report_id": rid}, {"_id": 0, "screenshots": 1})
        stored = (doc.get("screenshots") or [None])[0]
        assert stored == small_image

    def test_bug_report_invalid_base64_returns_400(self, admin_headers):
        r = self._post(admin_headers, "!!!not-base64$$$")
        assert r.status_code == 400
