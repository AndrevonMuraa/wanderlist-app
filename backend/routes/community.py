from fastapi import APIRouter, Depends
import os
import random
import uuid
from datetime import datetime, timezone, timedelta

from utils.db import db
from utils.auth import get_current_user
from models.all import User


router = APIRouter()

# ============= COMMUNITY PHOTO ENDPOINTS =============

@router.get("/community-feed")
async def get_community_feed(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get a unified community feed - optimized to eliminate N+1 queries."""
    # Standard landmark visits
    pipeline = [
        {"$match": {
            "visibility": "public",
            "photos": {"$exists": True, "$ne": []}
        }},
        {"$sort": {"visited_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info",
            "pipeline": [{"$project": {"_id": 0, "name": 1, "picture": 1, "username": 1}}]
        }},
        {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "landmarks",
            "localField": "landmark_id",
            "foreignField": "landmark_id",
            "as": "landmark_info",
            "pipeline": [{"$project": {"_id": 0, "name": 1, "country_name": 1, "country_id": 1}}]
        }},
        {"$unwind": {"path": "$landmark_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "photos": {"$slice": ["$photos", 1]},
            "diary_notes": 1,
            "share_diary": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username",
            "landmark_name": {"$ifNull": ["$landmark_info.name", "Unknown"]},
            "country_name": "$landmark_info.country_name",
            "country_id": "$landmark_info.country_id",
        }}
    ]

    visits = await db.visits.aggregate(pipeline).to_list(limit)

    # Batch-fetch upvote counts for all visits in one query
    photo_ids = [f"{v['visit_id']}_0" for v in visits]
    upvote_pipeline = [
        {"$match": {"photo_id": {"$in": photo_ids}}},
        {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}}
    ]
    upvote_results = await db.photo_upvotes.aggregate(upvote_pipeline).to_list(len(photo_ids))
    upvote_map = {r["_id"]: r["count"] for r in upvote_results}

    # Check which photos the current user has upvoted
    user_upvoted_docs = await db.photo_upvotes.find(
        {"photo_id": {"$in": photo_ids}, "user_id": current_user.user_id},
        {"_id": 0, "photo_id": 1}
    ).to_list(len(photo_ids))
    user_upvoted_set = {d["photo_id"] for d in user_upvoted_docs}

    # Batch-fetch activities for these visits (for activity_id, likes, comments parity)
    visit_ids = [v["visit_id"] for v in visits]
    activity_docs = await db.activities.find(
        {"visit_id": {"$in": visit_ids}},
        {"_id": 0, "activity_id": 1, "visit_id": 1, "likes_count": 1, "comments_count": 1}
    ).to_list(len(visit_ids))
    visit_to_activity = {a["visit_id"]: a for a in activity_docs}

    # AUTO-HEAL: create missing activities for public visits (idempotent)
    # This patches legacy data where an activity doc was never created.
    missing_visit_ids = [v["visit_id"] for v in visits if v["visit_id"] not in visit_to_activity]
    if missing_visit_ids:
        new_acts = []
        for v in visits:
            if v["visit_id"] in visit_to_activity:
                continue
            new_id = f"activity_{uuid.uuid4().hex[:12]}"
            new_acts.append({
                "activity_id": new_id,
                "user_id": v.get("user_id"),
                "user_name": v.get("user_name"),
                "user_picture": v.get("user_picture"),
                "activity_type": "visit",
                "landmark_id": v.get("landmark_id"),
                "landmark_name": v.get("landmark_name"),
                "country_name": v.get("country_name"),
                "visit_id": v["visit_id"],
                "has_diary": bool(v.get("diary_notes")),
                "has_photos": bool(v.get("photos")),
                "photo_count": len(v.get("photos") or []),
                "visibility": "public",
                "created_at": v.get("visited_at") or datetime.now(timezone.utc),
                "likes_count": 0,
                "comments_count": 0,
            })
        if new_acts:
            await db.activities.insert_many(new_acts)
            for a in new_acts:
                visit_to_activity[a["visit_id"]] = {
                    "activity_id": a["activity_id"],
                    "visit_id": a["visit_id"],
                    "likes_count": 0,
                    "comments_count": 0,
                }

    activity_ids_v = [a["activity_id"] for a in visit_to_activity.values()]

    items = []
    for visit in visits:
        photo_url = visit.get("photos", [None])[0] if visit.get("photos") else None
        has_diary = bool(visit.get("diary_notes")) and visit.get("share_diary", True)
        diary_snippet = None
        if has_diary and visit.get("diary_notes"):
            text = visit["diary_notes"]
            diary_snippet = text[:100] + "..." if len(text) > 100 else text

        act = visit_to_activity.get(visit["visit_id"]) or {}
        photo_id = f"{visit['visit_id']}_0"

        items.append({
            "visit_id": visit["visit_id"],
            "user_id": visit.get("user_id"),
            "activity_id": act.get("activity_id"),
            "type": "diary" if has_diary else "photo",
            "source": "landmark",
            "photo_url": photo_url,
            "user_name": visit.get("user_name", "Anonymous"),
            "user_picture": visit.get("user_picture"),
            "username": visit.get("username"),
            "landmark_name": visit.get("landmark_name", "Unknown"),
            "landmark_id": visit.get("landmark_id"),
            "country_name": visit.get("country_name"),
            "country_id": visit.get("country_id"),
            "diary_snippet": diary_snippet,
            "has_diary": has_diary,
            "upvotes": upvote_map.get(photo_id, 0),
            "user_upvoted": photo_id in user_upvoted_set,
            "likes_count": act.get("likes_count", 0) or 0,
            "comments_count": act.get("comments_count", 0) or 0,
            "is_liked": False,  # will be filled below
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        })

    # Custom visits (user-created)
    custom_pipeline = [
        {"$match": {"visibility": "public"}},
        {"$sort": {"visited_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info",
            "pipeline": [{"$project": {"_id": 0, "name": 1, "picture": 1, "username": 1}}]
        }},
        {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "user_created_visit_id": 1,
            "user_id": 1,
            "country_name": 1,
            "landmarks": 1,
            "photos": {"$slice": ["$photos", 1]},
            "diary": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username",
        }}
    ]
    custom_visits = await db.user_created_visits.aggregate(custom_pipeline).to_list(limit)

    # Batch fetch activities for custom visits
    ucv_ids = [cv.get("user_created_visit_id") for cv in custom_visits if cv.get("user_created_visit_id")]
    ucv_activities = await db.activities.find(
        {"user_created_visit_id": {"$in": ucv_ids}},
        {"_id": 0, "activity_id": 1, "user_created_visit_id": 1, "likes_count": 1, "comments_count": 1}
    ).to_list(len(ucv_ids)) if ucv_ids else []
    ucv_to_activity = {a["user_created_visit_id"]: a for a in ucv_activities}

    # AUTO-HEAL: create missing activities for public custom visits (idempotent)
    missing_ucv = [cv for cv in custom_visits
                   if cv.get("user_created_visit_id") and cv["user_created_visit_id"] not in ucv_to_activity]
    if missing_ucv:
        new_ucv_acts = []
        for cv in missing_ucv:
            new_id = f"activity_{uuid.uuid4().hex[:12]}"
            landmark_names = [lm.get("name") for lm in (cv.get("landmarks") or []) if lm.get("name")]
            if len(landmark_names) == 1:
                desc = f"visited {landmark_names[0]} in {cv.get('country_name','')}"
            elif len(landmark_names) > 1:
                desc = f"visited {len(landmark_names)} places in {cv.get('country_name','')}"
            else:
                desc = f"visited {cv.get('country_name','')}"
            new_ucv_acts.append({
                "activity_id": new_id,
                "user_id": cv.get("user_id"),
                "user_name": cv.get("user_name"),
                "user_picture": cv.get("user_picture"),
                "activity_type": "user_created_visit",
                "user_created_visit_id": cv["user_created_visit_id"],
                "country_name": cv.get("country_name"),
                "landmarks": cv.get("landmarks") or [],
                "description": desc,
                "photos": cv.get("photos") or [],
                "diary": cv.get("diary"),
                "visibility": "public",
                "points_earned": 0,
                "created_at": cv.get("visited_at") or datetime.now(timezone.utc),
                "likes_count": 0,
                "comments_count": 0,
            })
        if new_ucv_acts:
            await db.activities.insert_many(new_ucv_acts)
            for a in new_ucv_acts:
                ucv_to_activity[a["user_created_visit_id"]] = {
                    "activity_id": a["activity_id"],
                    "user_created_visit_id": a["user_created_visit_id"],
                    "likes_count": 0,
                    "comments_count": 0,
                }

    activity_ids_v += [a["activity_id"] for a in ucv_to_activity.values()]

    for cv in custom_visits:
        photo_url = cv.get("photos", [None])[0] if cv.get("photos") else None
        if not photo_url and cv.get("landmarks"):
            for lm in cv["landmarks"]:
                if lm.get("photo"):
                    photo_url = lm["photo"]
                    break

        landmark_names = [lm["name"] for lm in (cv.get("landmarks") or []) if lm.get("name")]
        landmark_label = ", ".join(landmark_names[:2])
        if len(landmark_names) > 2:
            landmark_label += f" +{len(landmark_names) - 2} more"

        has_diary = bool(cv.get("diary"))
        diary_snippet = None
        if has_diary:
            text = cv["diary"]
            diary_snippet = text[:100] + "..." if len(text) > 100 else text

        act = ucv_to_activity.get(cv.get("user_created_visit_id")) or {}

        items.append({
            "visit_id": cv.get("user_created_visit_id"),
            "user_id": cv.get("user_id"),
            "activity_id": act.get("activity_id"),
            "type": "custom_visit",
            "source": "custom",
            "photo_url": photo_url,
            "user_name": cv.get("user_name", "Anonymous"),
            "user_picture": cv.get("user_picture"),
            "username": cv.get("username"),
            "landmark_name": landmark_label or cv.get("country_name", "Unknown"),
            "landmark_id": None,
            "country_name": cv.get("country_name"),
            "country_id": None,
            "diary_snippet": diary_snippet,
            "has_diary": has_diary,
            "upvotes": 0,
            "user_upvoted": False,
            "likes_count": act.get("likes_count", 0) or 0,
            "comments_count": act.get("comments_count", 0) or 0,
            "is_liked": False,
            "visited_at": cv.get("visited_at").isoformat() if cv.get("visited_at") else None,
        })

    # Batch fetch is_liked AND accurate likes_count + comments_count for all activities
    if activity_ids_v:
        # likes_count (grouped from likes collection — authoritative source)
        likes_count_pipeline = [
            {"$match": {"activity_id": {"$in": activity_ids_v}}},
            {"$group": {"_id": "$activity_id", "count": {"$sum": 1}}}
        ]
        likes_count_results = await db.likes.aggregate(likes_count_pipeline).to_list(len(activity_ids_v))
        likes_count_map = {r["_id"]: r["count"] for r in likes_count_results}

        # comments_count (grouped from comments collection — authoritative source)
        comments_count_pipeline = [
            {"$match": {"activity_id": {"$in": activity_ids_v}}},
            {"$group": {"_id": "$activity_id", "count": {"$sum": 1}}}
        ]
        comments_count_results = await db.comments.aggregate(comments_count_pipeline).to_list(len(activity_ids_v))
        comments_count_map = {r["_id"]: r["count"] for r in comments_count_results}

        # is_liked by current user
        user_likes = await db.likes.find(
            {"activity_id": {"$in": activity_ids_v}, "user_id": current_user.user_id},
            {"_id": 0, "activity_id": 1}
        ).to_list(len(activity_ids_v))
        liked_set = {lk["activity_id"] for lk in user_likes}

        for it in items:
            aid = it.get("activity_id")
            if not aid:
                continue
            it["is_liked"] = aid in liked_set
            it["likes_count"] = likes_count_map.get(aid, 0)
            it["comments_count"] = comments_count_map.get(aid, 0)

    # Sort combined items by visited_at descending
    items.sort(key=lambda x: x.get("visited_at") or "", reverse=True)
    items = items[:limit]

    return {"items": items, "count": len(items)}


@router.get("/community-photos/photo-of-the-week")
async def get_photo_of_the_week(current_user: User = Depends(get_current_user)):
    """Get the most upvoted community photo for the current ISO week.
    Fallback chain: current week → previous week → random upvoted photo → random popular photo.
    Also considers country_visits photos."""
    
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    
    week_start = datetime.fromisocalendar(iso_year, iso_week, 1).replace(tzinfo=timezone.utc)
    week_end = week_start + timedelta(days=7)
    prev_week_start = week_start - timedelta(days=7)
    prev_iso_year, prev_iso_week, _ = prev_week_start.isocalendar()
    
    winner = None
    display_week = iso_week
    display_year = iso_year
    
    # 1. Try current week, then previous week (upvote-based)
    for start, end, w_num, w_year in [
        (week_start, week_end, iso_week, iso_year),
        (prev_week_start, week_start, prev_iso_week, prev_iso_year),
    ]:
        pipeline = [
            {"$match": {"created_at": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        top = await db.photo_upvotes.aggregate(pipeline).to_list(1)
        if top:
            winner = top[0]
            display_week = w_num
            display_year = w_year
            break
    
    # 2. Fallback: random photo from all upvoted photos
    if not winner:
        all_upvoted = await db.photo_upvotes.aggregate([
            {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]).to_list(20)
        if all_upvoted:
            winner = random.choice(all_upvoted)
            display_week = iso_week
            display_year = iso_year
    
    # 3. Fallback: random public landmark visit with photo
    if not winner:
        public_with_photos = await db.visits.find(
            {"photos": {"$exists": True, "$ne": []}, "visibility": "public"},
            {"_id": 0, "visit_id": 1}
        ).to_list(50)
        if public_with_photos:
            chosen = random.choice(public_with_photos)
            winner = {"_id": f"{chosen['visit_id']}_0", "count": 0}
            display_week = iso_week
            display_year = iso_year
    
    # 4. Fallback: random country_visit with photo
    if not winner:
        cv_with_photos = await db.country_visits.find(
            {"photos": {"$exists": True, "$ne": []}},
            {"_id": 0, "country_visit_id": 1, "photos": {"$slice": 1}, "user_id": 1, "country_name": 1, "visited_at": 1}
        ).to_list(50)
        if cv_with_photos:
            chosen = random.choice(cv_with_photos)
            user_info = await db.users.find_one(
                {"user_id": chosen["user_id"]},
                {"_id": 0, "name": 1, "username": 1, "picture": 1}
            )
            return {
                "photo": {
                    "photo_id": f"cv_{chosen['country_visit_id']}_0",
                    "photo_url": chosen["photos"][0],
                    "upvotes": 0,
                    "user_name": user_info.get("name", "Anonymous") if user_info else "Anonymous",
                    "username": user_info.get("username") if user_info else None,
                    "user_picture": user_info.get("picture") if user_info else None,
                    "landmark_name": chosen.get("country_name", "Unknown"),
                    "landmark_id": None,
                    "country_name": chosen.get("country_name"),
                    "visited_at": chosen.get("visited_at").isoformat() if chosen.get("visited_at") else None,
                },
                "week": iso_week,
                "year": iso_year,
            }
    
    if not winner:
        return {"photo": None, "week": iso_week, "year": iso_year}
    
    photo_id = winner["_id"]
    upvote_count = winner["count"]
    
    parts = photo_id.rsplit("_", 1)
    if len(parts) != 2:
        return {"photo": None, "week": display_week, "year": display_year}
    
    visit_id_part = parts[0]
    photo_idx = int(parts[1]) if parts[1].isdigit() else 0
    
    visit = await db.visits.find_one({"visit_id": visit_id_part}, {"_id": 0})
    if not visit:
        return {"photo": None, "week": display_week, "year": display_year}
    
    photos = visit.get("photos", [])
    if photo_idx >= len(photos):
        return {"photo": None, "week": display_week, "year": display_year}
    
    user_info = await db.users.find_one(
        {"user_id": visit["user_id"]},
        {"_id": 0, "name": 1, "username": 1, "picture": 1}
    )
    
    landmark = await db.landmarks.find_one(
        {"landmark_id": visit.get("landmark_id")},
        {"_id": 0, "name": 1, "country_name": 1, "country_id": 1}
    )
    
    return {
        "photo": {
            "photo_id": photo_id,
            "photo_url": photos[photo_idx],
            "upvotes": upvote_count,
            "user_name": user_info.get("name", "Anonymous") if user_info else "Anonymous",
            "username": user_info.get("username") if user_info else None,
            "user_picture": user_info.get("picture") if user_info else None,
            "landmark_name": landmark.get("name", "Unknown") if landmark else "Unknown",
            "landmark_id": visit.get("landmark_id"),
            "country_name": landmark.get("country_name") if landmark else None,
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        },
        "week": display_week,
        "year": display_year,
    }

@router.get("/landmarks/{landmark_id}/community-photos")
async def get_landmark_community_photos(
    landmark_id: str,
    sort: str = "popular",
    current_user: User = Depends(get_current_user)
):
    """Get community photos for a specific landmark. 
    Free users: top 3 photos + total count. Premium: all photos + upvoting.
    sort: 'popular' (default) or 'newest'"""
    
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all public visits with photos for this landmark
    pipeline = [
        {"$match": {
            "landmark_id": landmark_id,
            "visibility": "public",
            "$or": [
                {"photos": {"$exists": True, "$ne": []}},
                {"photo_base64": {"$exists": True, "$ne": None}}
            ]
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "photos": 1,
            "photo_base64": 1,
            "visited_at": 1,
            "comments": 1,
            "diary_notes": 1,
            "share_diary": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(200)
    
    # Build photo list from visits
    photos = []
    all_photo_ids = []
    photo_visit_map = []
    
    for visit in visits:
        visit_photos = visit.get("photos", [])
        photo_base64 = visit.get("photo_base64")
        
        all_visit_photos = []
        if visit_photos:
            all_visit_photos.extend(visit_photos)
        if photo_base64 and photo_base64 not in all_visit_photos:
            all_visit_photos.append(photo_base64)
        
        for idx, photo in enumerate(all_visit_photos):
            photo_id = f"{visit['visit_id']}_{idx}"
            all_photo_ids.append(photo_id)
            photo_visit_map.append((photo_id, photo, visit))
    
    # Batch fetch upvote counts for ALL photos at once (fixes N+1)
    upvote_counts = {}
    user_upvotes = set()
    if all_photo_ids:
        upvote_pipeline = [
            {"$match": {"photo_id": {"$in": all_photo_ids}}},
            {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}}
        ]
        upvote_results = await db.photo_upvotes.aggregate(upvote_pipeline).to_list(len(all_photo_ids))
        upvote_counts = {r["_id"]: r["count"] for r in upvote_results}
        
        # Check user upvotes (for all users — upvoting is free)
        user_upvote_docs = await db.photo_upvotes.find(
            {"photo_id": {"$in": all_photo_ids}, "user_id": current_user.user_id},
            {"_id": 0, "photo_id": 1}
        ).to_list(len(all_photo_ids))
        user_upvotes = {d["photo_id"] for d in user_upvote_docs}
    
    for photo_id, photo, visit in photo_visit_map:
        photos.append({
            "photo_id": photo_id,
            "photo_url": photo,
            "visit_id": visit["visit_id"],
            "user_id": visit["user_id"],
            "user_name": visit.get("user_name", "Anonymous"),
            "user_picture": visit.get("user_picture"),
            "username": visit.get("username"),
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
            "comments": visit.get("comments"),
            "diary_notes": visit.get("diary_notes") if visit.get("share_diary", True) else None,
            "has_diary": bool(visit.get("diary_notes")) and visit.get("share_diary", True),
            "upvotes": upvote_counts.get(photo_id, 0),
            "user_upvoted": photo_id in user_upvotes
        })
    
    # Sort by upvotes (most upvoted first), then by date
    if sort == "newest":
        photos.sort(key=lambda x: x.get("visited_at", "") or "", reverse=True)
    else:
        photos.sort(key=lambda x: (-x["upvotes"], x.get("visited_at", "") or ""), reverse=False)
    
    total_count = len(photos)
    
    # All users see all photos. Premium value: diary access
    hide_diaries = not is_premium
    if hide_diaries:
        for p in photos:
            p["diary_notes"] = None
            p["has_diary"] = False
    
    return {
        "photos": photos,
        "total_count": total_count,
        "is_preview": False,
        "diary_locked": hide_diaries,
        "landmark_id": landmark_id
    }


@router.get("/countries/{country_id}/community-photos")
async def get_country_community_photos(
    country_id: str,
    sort: str = "popular",
    current_user: User = Depends(get_current_user)
):
    """Get community photos for all landmarks in a country.
    Free users: top 3 photos + total count. Premium: all photos.
    sort: 'popular' (default) or 'newest'"""
    
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    # Get country name
    country = await db.countries.find_one({"country_id": country_id}, {"_id": 0, "name": 1})
    country_name = country["name"] if country else country_id
    
    # Get all public visits with photos for landmarks in this country
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "$or": [
                {"photos": {"$exists": True, "$ne": []}},
                {"photo_base64": {"$exists": True, "$ne": None}}
            ]
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "photos": 1,
            "photo_base64": 1,
            "visited_at": 1,
            "comments": 1,
            "diary_notes": 1,
            "share_diary": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(300)
    
    # Also get destination visit photos
    country_visits_pipeline = [
        {"$match": {
            "country_name": country_name,
            "photos": {"$exists": True, "$ne": []},
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "country_visit_id": 1,
            "user_id": 1,
            "photos": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }}
    ]
    country_visits = await db.country_visits.aggregate(country_visits_pipeline).to_list(200)
    
    # Build photo list - collect all photo IDs first for batch upvote fetch
    photos = []
    all_photo_ids = []
    photo_entries = []
    
    for visit in visits:
        visit_photos = visit.get("photos", [])
        photo_base64 = visit.get("photo_base64")
        
        all_visit_photos = []
        if visit_photos:
            all_visit_photos.extend(visit_photos)
        if photo_base64 and photo_base64 not in all_visit_photos:
            all_visit_photos.append(photo_base64)
        
        lm_name = landmark_names.get(visit.get("landmark_id"), "Unknown")
        
        for idx, photo in enumerate(all_visit_photos):
            photo_id = f"{visit['visit_id']}_{idx}"
            all_photo_ids.append(photo_id)
            photo_entries.append({
                "photo_id": photo_id,
                "photo_url": photo,
                "landmark_name": lm_name,
                "landmark_id": visit.get("landmark_id"),
                "user_id": visit["user_id"],
                "user_name": visit.get("user_name", "Anonymous"),
                "user_picture": visit.get("user_picture"),
                "username": visit.get("username"),
                "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
                "diary_notes": visit.get("diary_notes") if visit.get("share_diary", True) else None,
                "has_diary": bool(visit.get("diary_notes")) and visit.get("share_diary", True),
            })
    
    # Add destination visit photos
    for cv in country_visits:
        for idx, photo in enumerate(cv.get("photos", [])):
            photo_id = f"cv_{cv['country_visit_id']}_{idx}"
            all_photo_ids.append(photo_id)
            photo_entries.append({
                "photo_id": photo_id,
                "photo_url": photo,
                "landmark_name": "Destination visit",
                "landmark_id": None,
                "user_id": cv["user_id"],
                "user_name": cv.get("user_name", "Anonymous"),
                "user_picture": cv.get("user_picture"),
                "username": cv.get("username"),
                "visited_at": cv.get("visited_at").isoformat() if cv.get("visited_at") else None,
            })
    
    # Batch fetch upvote counts (fixes N+1 query)
    upvote_counts = {}
    user_upvotes = set()
    if all_photo_ids:
        upvote_pipeline = [
            {"$match": {"photo_id": {"$in": all_photo_ids}}},
            {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}}
        ]
        upvote_results = await db.photo_upvotes.aggregate(upvote_pipeline).to_list(len(all_photo_ids))
        upvote_counts = {r["_id"]: r["count"] for r in upvote_results}
        
        # Check user upvotes (for all users — upvoting is free)
        user_upvote_docs = await db.photo_upvotes.find(
            {"photo_id": {"$in": all_photo_ids}, "user_id": current_user.user_id},
            {"_id": 0, "photo_id": 1}
        ).to_list(len(all_photo_ids))
        user_upvotes = {d["photo_id"] for d in user_upvote_docs}
    
    for entry in photo_entries:
        entry["upvotes"] = upvote_counts.get(entry["photo_id"], 0)
        entry["user_upvoted"] = entry["photo_id"] in user_upvotes
        photos.append(entry)
    
    if sort == "newest":
        photos.sort(key=lambda x: x.get("visited_at", "") or "", reverse=True)
    else:
        photos.sort(key=lambda x: (-x["upvotes"], x.get("visited_at", "") or ""))
    
    total_count = len(photos)
    
    # All users see all photos. Premium value: diary access
    hide_diaries = not is_premium
    if hide_diaries:
        for p in photos:
            p.pop("diary_notes", None)
            p["has_diary"] = False
    
    return {
        "photos": photos,
        "total_count": total_count,
        "is_preview": False,
        "diary_locked": hide_diaries,
        "country_id": country_id,
        "country_name": country_name
    }


@router.get("/countries/{country_id}/travel-diaries")
async def get_country_travel_diaries(
    country_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all shared travel diaries for a country. Premium feature."""
    is_premium = current_user.subscription_tier == "pro"
    
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    country = await db.countries.find_one({"country_id": country_id}, {"_id": 0, "name": 1})
    country_name = country["name"] if country else country_id
    
    # Get visits with shared diary notes
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "share_diary": True,
            "diary_notes": {"$exists": True, "$ne": None, "$ne": ""}
        }},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "user_id",
            "as": "user_info"
        }},
        {"$unwind": {"path": "$user_info"}},
        {"$project": {
            "_id": 0,
            "visit_id": 1,
            "user_id": 1,
            "landmark_id": 1,
            "diary_notes": 1,
            "photos": 1,
            "visited_at": 1,
            "user_name": {"$ifNull": ["$user_info.name", "Anonymous"]},
            "user_picture": "$user_info.picture",
            "username": "$user_info.username"
        }},
        {"$sort": {"visited_at": -1}}
    ]
    
    visits = await db.visits.aggregate(pipeline).to_list(200)
    
    diaries = []
    for visit in visits:
        photo_url = None
        photos = visit.get("photos", [])
        if photos:
            photo_url = photos[0]
        
        diaries.append({
            "visit_id": visit["visit_id"],
            "diary_notes": visit["diary_notes"],
            "photo_url": photo_url,
            "landmark_name": landmark_names.get(visit.get("landmark_id"), "Unknown"),
            "landmark_id": visit.get("landmark_id"),
            "user_name": visit.get("user_name", "Anonymous"),
            "user_picture": visit.get("user_picture"),
            "username": visit.get("username"),
            "visited_at": visit.get("visited_at").isoformat() if visit.get("visited_at") else None,
        })
    
    total_count = len(diaries)
    
    if not is_premium:
        return {
            "diaries": diaries[:2],
            "total_count": total_count,
            "is_preview": True,
            "country_name": country_name
        }
    
    return {
        "diaries": diaries,
        "total_count": total_count,
        "is_preview": False,
        "country_name": country_name
    }


@router.get("/countries/{country_id}/community-highlights")
async def get_country_community_highlights(
    country_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get top 3 most photographed landmarks in a country."""
    # Get all landmark IDs for this country
    landmarks = await db.landmarks.find(
        {"country_id": country_id},
        {"_id": 0, "landmark_id": 1, "name": 1}
    ).to_list(200)
    landmark_ids = [l["landmark_id"] for l in landmarks]
    landmark_names = {l["landmark_id"]: l["name"] for l in landmarks}
    
    if not landmark_ids:
        return {"highlights": []}
    
    # Aggregate: count photos per landmark from public visits
    pipeline = [
        {"$match": {
            "landmark_id": {"$in": landmark_ids},
            "visibility": "public",
            "photos": {"$exists": True, "$ne": []}
        }},
        {"$project": {
            "landmark_id": 1,
            "photo_count": {"$size": "$photos"},
            "photos": {"$slice": ["$photos", 1]}
        }},
        {"$group": {
            "_id": "$landmark_id",
            "total_photos": {"$sum": "$photo_count"},
            "visitor_count": {"$sum": 1},
            "sample_photo": {"$first": {"$arrayElemAt": ["$photos", 0]}}
        }},
        {"$sort": {"total_photos": -1}},
        {"$limit": 3}
    ]
    
    results = await db.visits.aggregate(pipeline).to_list(3)
    
    highlights = []
    for r in results:
        lm_id = r["_id"]
        highlights.append({
            "landmark_id": lm_id,
            "landmark_name": landmark_names.get(lm_id, "Unknown"),
            "total_photos": r["total_photos"],
            "visitor_count": r["visitor_count"],
            "sample_photo": r.get("sample_photo"),
        })
    
    return {"highlights": highlights}


@router.get("/community-highlights")
async def get_global_community_highlights(
    current_user: User = Depends(get_current_user)
):
    """Get top trending landmarks globally — most photographed across all countries."""
    
    # Aggregate: top landmarks by photo count from public visits
    pipeline = [
        {"$match": {
            "visibility": "public",
            "photos": {"$exists": True, "$ne": []}
        }},
        {"$project": {
            "landmark_id": 1,
            "photo_count": {"$size": "$photos"},
            "photos": {"$slice": ["$photos", 1]}
        }},
        {"$group": {
            "_id": "$landmark_id",
            "total_photos": {"$sum": "$photo_count"},
            "visitor_count": {"$sum": 1},
            "sample_photo": {"$first": {"$arrayElemAt": ["$photos", 0]}}
        }},
        {"$sort": {"visitor_count": -1, "total_photos": -1}},
        {"$limit": 5}
    ]
    
    results = await db.visits.aggregate(pipeline).to_list(5)
    
    if not results:
        return {"highlights": []}
    
    # Batch-fetch landmark info
    landmark_ids = [r["_id"] for r in results]
    landmarks = await db.landmarks.find(
        {"landmark_id": {"$in": landmark_ids}},
        {"_id": 0, "landmark_id": 1, "name": 1, "country_name": 1, "country_id": 1}
    ).to_list(len(landmark_ids))
    lm_map = {l["landmark_id"]: l for l in landmarks}
    
    # Batch-fetch upvote counts for sample photos
    photo_ids = [f"{r['_id']}_0" for r in results]
    upvote_pipeline = [
        {"$match": {"photo_id": {"$in": photo_ids}}},
        {"$group": {"_id": "$photo_id", "count": {"$sum": 1}}}
    ]
    upvote_results = await db.photo_upvotes.aggregate(upvote_pipeline).to_list(len(photo_ids))
    upvote_map = {u["_id"]: u["count"] for u in upvote_results}
    
    highlights = []
    for r in results:
        lm_id = r["_id"]
        lm_info = lm_map.get(lm_id, {})
        highlights.append({
            "landmark_id": lm_id,
            "landmark_name": lm_info.get("name", "Unknown"),
            "country_name": lm_info.get("country_name", ""),
            "country_id": lm_info.get("country_id", ""),
            "total_photos": r["total_photos"],
            "visitor_count": r["visitor_count"],
            "sample_photo": r.get("sample_photo"),
            "upvotes": upvote_map.get(f"{lm_id}_0", 0),
        })
    
    return {"highlights": highlights}


@router.post("/community-photos/{photo_id}/upvote")
async def upvote_community_photo(photo_id: str, current_user: User = Depends(get_current_user)):
    """Toggle upvote on a community photo. Available to all users."""
    
    existing = await db.photo_upvotes.find_one({
        "photo_id": photo_id,
        "user_id": current_user.user_id
    })
    
    if existing:
        await db.photo_upvotes.delete_one({"_id": existing["_id"]})
        count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
        return {"upvoted": False, "upvotes": count}
    else:
        await db.photo_upvotes.insert_one({
            "photo_id": photo_id,
            "user_id": current_user.user_id,
            "created_at": datetime.now(timezone.utc)
        })
        count = await db.photo_upvotes.count_documents({"photo_id": photo_id})
        return {"upvoted": True, "upvotes": count}


