"""
Year in Travel — "Your year on WanderMark" Spotify Wrapped style summary.

Important framing rule:
- All "this year" stats are based on `created_at` (when added to WanderMark),
  NOT `visited_at` (which can be from any year). Users frequently log past trips.
- A separate `trips_actually_taken` block uses visited_at for transparency.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import uuid
from collections import Counter
from motor.motor_asyncio import AsyncIOMotorClient

from models.all import User
from utils.auth import get_current_user

router = APIRouter()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


# Default recap year = last completed year (Spotify Wrapped convention).
def _default_recap_year() -> int:
    return datetime.now(timezone.utc).year - 1


def _aware(dt):
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/me/year-in-travel")
async def year_in_travel(year: Optional[int] = None, current_user: User = Depends(get_current_user)):
    if year is None:
        year = datetime.now(timezone.utc).year

    year_start = datetime(year, 1, 1, tzinfo=timezone.utc)
    year_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    # All visits ADDED in this year (created_at), regardless of visited_at
    added_visits = await db.visits.find(
        {"user_id": current_user.user_id, "created_at": {"$gte": year_start, "$lt": year_end}},
        {"_id": 0},
    ).to_list(2000)

    # Visits ACTUALLY TAKEN this year (visited_at) — for the secondary section
    taken_visits = await db.visits.find(
        {"user_id": current_user.user_id, "visited_at": {"$gte": year_start, "$lt": year_end}},
        {"_id": 0},
    ).to_list(2000)

    # Look up landmark info for added visits
    landmark_ids = list({v.get("landmark_id") for v in added_visits if v.get("landmark_id")})
    landmarks = {}
    if landmark_ids:
        async for lm in db.landmarks.find(
            {"landmark_id": {"$in": landmark_ids}},
            {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1, "continent": 1},
        ):
            landmarks[lm["landmark_id"]] = {
                "landmark_id": lm.get("landmark_id"),
                "name": lm.get("name"),
                "country": lm.get("country_name"),
                "continent": lm.get("continent"),
            }

    # Hero stats
    memories_added = len(added_visits)
    photos_uploaded = sum(len(v.get("photos") or []) for v in added_visits)

    # Countries newly on map this year (distinct)
    countries_year = {landmarks.get(v.get("landmark_id"), {}).get("country") for v in added_visits}
    countries_year.discard(None)
    countries_count = len(countries_year)

    # NEW countries — countries that have NO visit with created_at < year_start
    new_countries = []
    for c in countries_year:
        prior = await db.visits.find_one({
            "user_id": current_user.user_id,
            "created_at": {"$lt": year_start},
            "landmark_id": {"$in": [lid for lid, lm in landmarks.items() if lm.get("country") == c]},
        })
        if not prior:
            new_countries.append(c)

    # Continent breakdown
    continent_counter: Counter = Counter()
    for v in added_visits:
        cont = landmarks.get(v.get("landmark_id"), {}).get("continent")
        if cont:
            continent_counter[cont] += 1
    top_continent = continent_counter.most_common(1)
    top_continent_name = top_continent[0][0] if top_continent else None
    top_continent_count = top_continent[0][1] if top_continent else 0

    # Busiest month (by created_at)
    month_counter: Counter = Counter()
    for v in added_visits:
        c = _aware(v.get("created_at"))
        if c:
            month_counter[c.month] += 1
    busiest_month = month_counter.most_common(1)
    busiest_month_num = busiest_month[0][0] if busiest_month else None
    busiest_month_count = busiest_month[0][1] if busiest_month else 0

    # Time travel: oldest memory added this year (where visited_at is much older)
    oldest_memory = None
    for v in added_visits:
        va = _aware(v.get("visited_at"))
        if va and va < year_start:
            if oldest_memory is None or va < _aware(oldest_memory["visited_at"]):
                lm = landmarks.get(v.get("landmark_id"), {})
                oldest_memory = {
                    "visit_id": v.get("visit_id"),
                    "landmark_name": lm.get("name") or v.get("landmark_name"),
                    "country": lm.get("country"),
                    "visited_at": v.get("visited_at"),
                    "years_ago": year - va.year,
                }

    # Top 3 most-photographed landmarks added this year
    top_photos = sorted(
        [v for v in added_visits if v.get("photos")],
        key=lambda v: len(v.get("photos") or []),
        reverse=True,
    )[:3]
    top_landmarks = []
    for v in top_photos:
        lm = landmarks.get(v.get("landmark_id"), {})
        photos_list = v.get("photos") or []
        top_landmarks.append({
            "visit_id": v.get("visit_id"),
            "landmark_name": lm.get("name") or v.get("landmark_name"),
            "country": lm.get("country"),
            "photo_count": len(photos_list),
            "cover_photo": photos_list[0] if photos_list else None,
        })

    # Hero photo for share card
    hero_photo = top_landmarks[0]["cover_photo"] if top_landmarks else None

    return {
        "year": year,
        "user_name": current_user.name,
        "memories_added": memories_added,
        "photos_uploaded": photos_uploaded,
        "countries_count": countries_count,
        "new_countries": new_countries,
        "top_continent": {"name": top_continent_name, "count": top_continent_count} if top_continent_name else None,
        "busiest_month": {"month": busiest_month_num, "count": busiest_month_count} if busiest_month_num else None,
        "oldest_memory": oldest_memory,
        "top_landmarks": top_landmarks,
        "hero_photo": hero_photo,
        "trips_actually_taken": len(taken_visits),
        "show_taken_section": len(taken_visits) >= 3,
    }


@router.post("/me/year-in-travel/dispatch-notification")
async def dispatch_year_recap_notification(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Idempotently create an in-app "year_recap_ready" notification so the
    user sees a Spotify-Wrapped-style nudge in their notification tray.
    Safe to call from any client: multiple calls in the same year do not
    create duplicates.

    Only fires if the user has at least 1 memory added in that year.
    """
    if year is None:
        year = _default_recap_year()

    year_start = datetime(year, 1, 1, tzinfo=timezone.utc)
    year_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    has_memories = await db.visits.find_one(
        {
            "user_id": current_user.user_id,
            "created_at": {"$gte": year_start, "$lt": year_end},
        },
        {"_id": 1},
    )
    if not has_memories:
        return {"dispatched": False, "reason": "no_memories"}

    existing = await db.notifications.find_one(
        {
            "user_id": current_user.user_id,
            "type": "year_recap_ready",
            "related_id": str(year),
        },
        {"_id": 1},
    )
    if existing:
        return {"dispatched": False, "reason": "already_sent"}

    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "type": "year_recap_ready",
        "title": f"Your {year} recap is ready ✨",
        "message": "Tap to relive your year of memories on WanderMark.",
        "related_id": str(year),
        "related_user_id": None,
        "related_user_name": None,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    })
    return {"dispatched": True, "year": year}
