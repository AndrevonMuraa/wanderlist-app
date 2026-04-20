"""Friend-comparison endpoints — overlap, country overlap, compare-stats,
side-by-side landmark compare, and "friends who visited this landmark" strip.

Split out of /app/backend/routes/friends.py in Apr-2026 for maintainability.
"""
from fastapi import APIRouter, HTTPException, Depends

from utils.db import db
from utils.auth import get_current_user
from models.all import User
from utils.social_stats import assert_friends_or_self, user_stats


router = APIRouter()


# ============= OVERLAP / "WE'VE BOTH BEEN HERE" ENDPOINTS =============

@router.get("/users/{user_id}/overlap")
async def get_user_overlap(
    user_id: str,
    limit: int = 12,
    current_user: User = Depends(get_current_user),
):
    """Landmarks both the current user and `user_id` have visited.

    Returns a compact list (ordered by the OTHER user's most recent visit) plus
    a total count. Limited to accepted friends (or the user themselves).
    """
    if not await assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see overlap")

    limit = max(1, min(limit, 50))

    my_landmarks = set(await db.visits.distinct("landmark_id", {"user_id": current_user.user_id}))
    their_landmarks = set(await db.visits.distinct("landmark_id", {"user_id": user_id}))
    shared_ids = list(my_landmarks & their_landmarks)

    if not shared_ids:
        return {"total": 0, "items": []}

    their_visits = await db.visits.find(
        {"user_id": user_id, "landmark_id": {"$in": shared_ids}},
        {"_id": 0, "landmark_id": 1, "landmark_name": 1, "visited_at": 1,
         "photos": {"$slice": 1}, "country_name": 1},
    ).sort("visited_at", -1).to_list(len(shared_ids))

    my_visits_raw = await db.visits.find(
        {"user_id": current_user.user_id, "landmark_id": {"$in": shared_ids}},
        {"_id": 0, "landmark_id": 1, "visited_at": 1, "photos": {"$slice": 1}},
    ).to_list(len(shared_ids))
    my_visits = {v["landmark_id"]: v for v in my_visits_raw}

    items = []
    for v in their_visits[:limit]:
        lid = v["landmark_id"]
        mine = my_visits.get(lid, {})
        items.append({
            "landmark_id": lid,
            "landmark_name": v.get("landmark_name"),
            "country_name": v.get("country_name"),
            "their_photo_url": v["photos"][0] if v.get("photos") else None,
            "their_visited_at": v.get("visited_at"),
            "my_photo_url": mine["photos"][0] if mine.get("photos") else None,
            "my_visited_at": mine.get("visited_at"),
        })

    return {"total": len(shared_ids), "items": items}


@router.get("/landmarks/{landmark_id}/friends-visited")
async def get_friends_who_visited_landmark(
    landmark_id: str,
    limit: int = 6,
    current_user: User = Depends(get_current_user),
):
    """Friends of the current user who have also visited this landmark.

    Powers the "Anna and Ola were also here" strip on a landmark page.
    """
    limit = max(1, min(limit, 20))

    friendships = await db.friends.find({
        "status": "accepted",
        "$or": [
            {"user_id": current_user.user_id},
            {"friend_id": current_user.user_id},
        ],
    }, {"_id": 0, "user_id": 1, "friend_id": 1}).to_list(2000)

    friends = [
        (f["friend_id"] if f["user_id"] == current_user.user_id else f["user_id"])
        for f in friendships
    ]
    if not friends:
        return {"total": 0, "friends": []}

    visited = await db.visits.find(
        {"user_id": {"$in": friends}, "landmark_id": landmark_id},
        {"_id": 0, "user_id": 1, "visited_at": 1, "photos": {"$slice": 1}},
    ).sort("visited_at", -1).to_list(1000)

    # Deduplicate: most recent visit per friend
    seen = set()
    ordered = []
    for v in visited:
        if v["user_id"] in seen:
            continue
        seen.add(v["user_id"])
        ordered.append(v)

    users = {}
    if ordered:
        for u in await db.users.find(
            {"user_id": {"$in": [v["user_id"] for v in ordered]}},
            {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ).to_list(len(ordered)):
            users[u["user_id"]] = u

    friends_list = []
    for v in ordered[:limit]:
        u = users.get(v["user_id"], {})
        friends_list.append({
            "user_id": v["user_id"],
            "name": u.get("name"),
            "username": u.get("username"),
            "picture": u.get("picture"),
            "visited_at": v.get("visited_at"),
            "photo_url": v["photos"][0] if v.get("photos") else None,
        })

    return {"total": len(ordered), "friends": friends_list}


@router.get("/users/{user_id}/compare-stats")
async def get_compare_stats(
    user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Head-to-head Journey stats: continents / destinations / landmarks / points."""
    if not await assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see compare stats")
    me = await user_stats(current_user.user_id)
    friend = await user_stats(user_id)
    return {"me": me, "friend": friend}


@router.get("/users/{user_id}/overlap/countries")
async def get_country_overlap(
    user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Destinations (countries) both users have visited — powers the flag strip."""
    if not await assert_friends_or_self(current_user.user_id, user_id):
        raise HTTPException(status_code=403, detail="Only friends can see country overlap")
    mine = set(await db.country_visits.distinct("country_name", {"user_id": current_user.user_id}))
    theirs = set(await db.country_visits.distinct("country_name", {"user_id": user_id}))
    shared = sorted([c for c in (mine & theirs) if c])
    return {"total": len(shared), "countries": shared}


@router.get("/compare/landmarks/{landmark_id}/friends/{friend_user_id}")
async def compare_landmark_with_friend(
    landmark_id: str,
    friend_user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Side-by-side compare of both users' visits to this landmark.

    Friend's `private` visits are hidden but surfaced as `has_private_visits`.
    No time-delta computed — `visited_at` is registration timestamp only.
    """
    if not await assert_friends_or_self(current_user.user_id, friend_user_id):
        raise HTTPException(status_code=403, detail="Only friends can compare")

    landmark = await db.landmarks.find_one({"landmark_id": landmark_id}, {"_id": 0})
    if not landmark:
        raise HTTPException(status_code=404, detail="Landmark not found")

    async def _visits_for(uid: str, include_private: bool):
        filt = {"user_id": uid, "landmark_id": landmark_id}
        if not include_private:
            filt["visibility"] = {"$in": ["public", "friends"]}
        visits = await db.visits.find(
            filt,
            {"_id": 0, "visit_id": 1, "visited_at": 1, "updated_at": 1,
             "photos": {"$slice": 3}, "diary_notes": 1, "visibility": 1},
        ).sort("updated_at", -1).to_list(3)
        return visits

    me_visits = await _visits_for(current_user.user_id, include_private=True)
    friend_visits = await _visits_for(friend_user_id, include_private=False)

    friend_private_count = await db.visits.count_documents({
        "user_id": friend_user_id, "landmark_id": landmark_id, "visibility": "private",
    })

    async def _user_stub(uid: str):
        u = await db.users.find_one(
            {"user_id": uid}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "picture": 1},
        ) or {}
        return u

    me_user = await _user_stub(current_user.user_id)
    friend_user = await _user_stub(friend_user_id)

    return {
        "landmark": {
            "landmark_id": landmark["landmark_id"],
            "name": landmark.get("name"),
            "country_name": landmark.get("country_name"),
            "continent": landmark.get("continent"),
            "description": landmark.get("description"),
        },
        "me": {
            **me_user,
            "visits": me_visits,
            "photo_count": sum(len(v.get("photos") or []) for v in me_visits),
        },
        "friend": {
            **friend_user,
            "visits": friend_visits,
            "photo_count": sum(len(v.get("photos") or []) for v in friend_visits),
            "has_private_visits": friend_private_count > 0,
        },
    }
