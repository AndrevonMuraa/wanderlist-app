"""Helper for computing "hotness" scores and building candidate pools of public
visits for community-highlight features.

Exports:
- compute_hotness(likes_count, visited_at)  → float
- build_candidate_pool(current_user, include_custom=True) → list[dict]
"""
from datetime import datetime, timezone
from typing import Optional

from utils.db import db
from models.all import User
from utils.auto_flag import get_flagged_target_ids


FRESHNESS_DECAY_DAYS = 30.0
FRESHNESS_FLOOR = 0.3


def compute_hotness(likes_count: int, visited_at: Optional[datetime]) -> float:
    """Community-highlight hotness score.

    hotness = (likes + 1) * freshness
    freshness = max(FRESHNESS_FLOOR, 1 - age_days / FRESHNESS_DECAY_DAYS)

    Newer content gets the full boost; content older than FRESHNESS_DECAY_DAYS
    drops to FRESHNESS_FLOOR, ensuring fresh uploads still rotate in even with
    fewer likes.
    """
    now = datetime.now(timezone.utc)
    if not visited_at:
        visited_at = now
    if isinstance(visited_at, datetime) and visited_at.tzinfo is None:
        visited_at = visited_at.replace(tzinfo=timezone.utc)
    age_days = max(0.0, (now - visited_at).total_seconds() / 86400.0)
    freshness = max(FRESHNESS_FLOOR, 1.0 - (age_days / FRESHNESS_DECAY_DAYS))
    return (likes_count + 1) * freshness


async def build_candidate_pool(current_user: User, include_custom: bool = True) -> list:
    """Return list of public visits (landmark + custom) with photos, each enriched
    with activity_id, likes_count, user info, and a precomputed 'hotness' value.

    Callers should filter out entries without a usable photo_url (already done here).
    Auto-flagged content (3+ pending reports) is excluded from the pool.
    """
    flagged_ids = await get_flagged_target_ids()

    visits = await db.visits.find(
        {"visibility": "public", "photos": {"$exists": True, "$ne": []},
         "visit_id": {"$nin": list(flagged_ids)}},
        {"_id": 0, "visit_id": 1, "user_id": 1, "landmark_id": 1,
         "photos": 1, "diary_notes": 1, "visited_at": 1}
    ).sort("visited_at", -1).limit(200).to_list(200)

    custom_visits = []
    if include_custom:
        custom_visits = await db.user_created_visits.find(
            {
                "visibility": "public",
                "user_created_visit_id": {"$nin": list(flagged_ids)},
                "$or": [
                    {"photos": {"$exists": True, "$ne": []}},
                    {"landmarks.photo": {"$exists": True, "$ne": None}},
                ],
            },
            {"_id": 0, "user_created_visit_id": 1, "user_id": 1, "country_name": 1,
             "photos": 1, "landmarks": 1, "diary": 1, "visited_at": 1}
        ).sort("visited_at", -1).limit(100).to_list(100)

    # Lookups: landmarks → name/country; activities → activity_id;
    # likes collection → aggregated likes per activity; users → name/picture.
    landmark_ids = list({v.get("landmark_id") for v in visits if v.get("landmark_id")})
    lm_map = {}
    if landmark_ids:
        lms = await db.landmarks.find(
            {"landmark_id": {"$in": landmark_ids}},
            {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1, "country_id": 1, "continent": 1}
        ).to_list(len(landmark_ids))
        lm_map = {lm["landmark_id"]: lm for lm in lms}

    # Lookup continent for custom-visit countries (lookup by country_name since custom visits
    # store country_name but not country_id)
    custom_country_names = list({cv.get("country_name") for cv in custom_visits if cv.get("country_name")})
    country_continent_map = {}
    if custom_country_names:
        country_docs = await db.countries.find(
            {"name": {"$in": custom_country_names}},
            {"_id": 0, "name": 1, "continent": 1}
        ).to_list(len(custom_country_names))
        country_continent_map = {c["name"]: c["continent"] for c in country_docs}

    visit_ids = [v["visit_id"] for v in visits]
    ucv_ids = [cv["user_created_visit_id"] for cv in custom_visits]

    act_by_visit = {}
    act_by_ucv = {}
    if visit_ids:
        for a in await db.activities.find(
            {"visit_id": {"$in": visit_ids}},
            {"_id": 0, "activity_id": 1, "visit_id": 1}
        ).to_list(len(visit_ids)):
            act_by_visit[a["visit_id"]] = a["activity_id"]
    if ucv_ids:
        for a in await db.activities.find(
            {"user_created_visit_id": {"$in": ucv_ids}},
            {"_id": 0, "activity_id": 1, "user_created_visit_id": 1}
        ).to_list(len(ucv_ids)):
            act_by_ucv[a["user_created_visit_id"]] = a["activity_id"]

    all_activity_ids = list(act_by_visit.values()) + list(act_by_ucv.values())
    likes_map = {}
    if all_activity_ids:
        likes_agg = await db.likes.aggregate([
            {"$match": {"activity_id": {"$in": all_activity_ids}}},
            {"$group": {"_id": "$activity_id", "count": {"$sum": 1}}}
        ]).to_list(len(all_activity_ids))
        likes_map = {r["_id"]: r["count"] for r in likes_agg}

    user_ids = list({v.get("user_id") for v in (visits + custom_visits) if v.get("user_id")})
    user_map = {}
    if user_ids:
        users = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "username": 1}
        ).to_list(len(user_ids))
        user_map = {u["user_id"]: u for u in users}

    candidates = []
    for v in visits:
        aid = act_by_visit.get(v["visit_id"])
        likes = likes_map.get(aid, 0) if aid else 0
        visited_at = v.get("visited_at")
        u = user_map.get(v.get("user_id"), {})
        lm = lm_map.get(v.get("landmark_id"), {})
        candidates.append({
            "source": "landmark",
            "visit_id": v["visit_id"],
            "user_id": v.get("user_id"),
            "user_name": u.get("name", "Anonymous"),
            "user_picture": u.get("picture"),
            "username": u.get("username"),
            "activity_id": aid,
            "photo_url": v["photos"][0] if v.get("photos") else None,
            "landmark_id": v.get("landmark_id"),
            "landmark_name": lm.get("name"),
            "country_name": lm.get("country_name"),
            "country_id": lm.get("country_id"),
            "continent": lm.get("continent"),
            "has_diary": bool(v.get("diary_notes")),
            "likes_count": likes,
            "visited_at": visited_at.isoformat() if isinstance(visited_at, datetime) else None,
            "hotness": compute_hotness(likes, visited_at),
        })

    for cv in custom_visits:
        aid = act_by_ucv.get(cv["user_created_visit_id"])
        likes = likes_map.get(aid, 0) if aid else 0
        visited_at = cv.get("visited_at")
        u = user_map.get(cv.get("user_id"), {})
        photo_url = cv["photos"][0] if cv.get("photos") else None
        if not photo_url and cv.get("landmarks"):
            for lm in cv["landmarks"]:
                if lm.get("photo"):
                    photo_url = lm["photo"]
                    break
        landmark_names = [lm.get("name") for lm in (cv.get("landmarks") or []) if lm.get("name")]
        label = ", ".join(landmark_names[:2]) if landmark_names else cv.get("country_name", "Custom trip")
        candidates.append({
            "source": "custom",
            "visit_id": cv["user_created_visit_id"],
            "user_id": cv.get("user_id"),
            "user_name": u.get("name", "Anonymous"),
            "user_picture": u.get("picture"),
            "username": u.get("username"),
            "activity_id": aid,
            "photo_url": photo_url,
            "landmark_id": None,
            "landmark_name": label,
            "country_name": cv.get("country_name"),
            "country_id": None,
            "continent": country_continent_map.get(cv.get("country_name")),
            "has_diary": bool(cv.get("diary")),
            "likes_count": likes,
            "visited_at": visited_at.isoformat() if isinstance(visited_at, datetime) else None,
            "hotness": compute_hotness(likes, visited_at),
        })

    return [c for c in candidates if c.get("photo_url")]
