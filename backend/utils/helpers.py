from typing import Optional
import uuid
import logging
import httpx
from datetime import datetime, timezone

from utils.db import db


# Rank thresholds - 20 ranks for ~30,000 total achievable points
# Updated March 2026 for 100 countries / 1500 landmarks expansion
RANK_THRESHOLDS = [
    {"name": "Newcomer", "min_points": 0},
    {"name": "Wanderer", "min_points": 150},
    {"name": "Scout", "min_points": 400},
    {"name": "Explorer", "min_points": 800},
    {"name": "Pathfinder", "min_points": 1500},
    {"name": "Adventurer", "min_points": 2500},
    {"name": "Voyager", "min_points": 4000},
    {"name": "Trailblazer", "min_points": 6000},
    {"name": "Navigator", "min_points": 8000},
    {"name": "Pioneer", "min_points": 10000},
    {"name": "Globetrotter", "min_points": 12000},
    {"name": "Nomad King", "min_points": 14000},
    {"name": "Horizon Chaser", "min_points": 16000},
    {"name": "Legend", "min_points": 18000},
    {"name": "Atlas", "min_points": 20000},
    {"name": "Titan", "min_points": 22000},
    {"name": "Sovereign", "min_points": 24000},
    {"name": "Mythic", "min_points": 26000},
    {"name": "Eternal", "min_points": 28000},
    {"name": "Transcendent", "min_points": 30000},
]

def get_rank_for_points(points: int) -> str:
    rank_name = RANK_THRESHOLDS[0]["name"]
    for rank in RANK_THRESHOLDS:
        if points >= rank["min_points"]:
            rank_name = rank["name"]
    return rank_name



async def create_notification(user_id: str, notif_type: str, title: str, message: str,
                              related_id: Optional[str] = None, related_user_id: Optional[str] = None,
                              related_user_name: Optional[str] = None):
    """Helper function to create a notification"""
    notification_id = f"notif_{uuid.uuid4().hex[:12]}"
    notification = {
        "notification_id": notification_id,
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "related_id": related_id,
        "related_user_id": related_user_id,
        "related_user_name": related_user_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(notification)
    return notification_id


# Badge definitions - each rank IS a badge
# When a user reaches a rank, they earn that rank's badge permanently
BADGE_DEFINITIONS = {
    "rank_newcomer": {"name": "Newcomer", "description": "Taking your first steps", "icon": "compass-outline"},
    "rank_wanderer": {"name": "Wanderer", "description": "The world is calling", "icon": "footsteps"},
    "rank_scout": {"name": "Scout", "description": "Eyes on the horizon", "icon": "eye"},
    "rank_explorer": {"name": "Explorer", "description": "Charting new territory", "icon": "map"},
    "rank_pathfinder": {"name": "Pathfinder", "description": "Finding hidden trails", "icon": "trail-sign"},
    "rank_adventurer": {"name": "Adventurer", "description": "No border can stop you", "icon": "airplane"},
    "rank_voyager": {"name": "Voyager", "description": "Sailing uncharted waters", "icon": "boat"},
    "rank_trailblazer": {"name": "Trailblazer", "description": "Blazing your own path", "icon": "flame"},
    "rank_navigator": {"name": "Navigator", "description": "Guided by the stars", "icon": "navigate"},
    "rank_pioneer": {"name": "Pioneer", "description": "Breaking new ground", "icon": "flag"},
    "rank_globetrotter": {"name": "Globetrotter", "description": "The world knows your name", "icon": "earth"},
    "rank_nomad_king": {"name": "Nomad King", "description": "Ruler of the open road", "icon": "compass"},
    "rank_horizon_chaser": {"name": "Horizon Chaser", "description": "Always chasing the next sunrise", "icon": "sunny"},
    "rank_legend": {"name": "Legend", "description": "A true travel legend", "icon": "star"},
    "rank_atlas": {"name": "Atlas", "description": "Carrying the world on your shoulders", "icon": "globe-outline"},
    "rank_titan": {"name": "Titan", "description": "Forged in distant lands", "icon": "diamond"},
    "rank_sovereign": {"name": "Sovereign", "description": "Master of every continent", "icon": "shield-checkmark"},
    "rank_mythic": {"name": "Mythic", "description": "Stories told around campfires", "icon": "bonfire"},
    "rank_eternal": {"name": "Eternal", "description": "Your legacy echoes forever", "icon": "infinite"},
    "rank_transcendent": {"name": "Transcendent", "description": "Beyond mortal. Beyond legendary.", "icon": "trophy"},
}

# Map rank names to badge IDs
RANK_TO_BADGE = {r["name"]: f"rank_{r['name'].lower().replace(' ', '_')}" for r in RANK_THRESHOLDS}


async def check_and_award_badges(user_id: str):
    """Sync rank badges to match current verified points (leaderboard_points).
    Badges are DYNAMIC — added when rank is reached, removed when points drop below threshold.
    This prevents users from keeping unearned badges after deleting verified visits."""
    newly_awarded = []

    existing_badges = await db.achievements.find({"user_id": user_id}).to_list(100)
    existing_badge_map = {badge["badge_type"]: badge for badge in existing_badges}

    # Get user's verified points
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "leaderboard_points": 1})
    if not user:
        return newly_awarded
    
    verified_points = user.get("leaderboard_points", 0)

    # Determine which rank badges the user SHOULD have
    earned_badge_ids = set()
    for rank in RANK_THRESHOLDS:
        badge_id = RANK_TO_BADGE.get(rank["name"])
        if badge_id and verified_points >= rank["min_points"]:
            earned_badge_ids.add(badge_id)

    # Award missing badges
    for badge_id in earned_badge_ids:
        if badge_id not in existing_badge_map:
            badge_def = BADGE_DEFINITIONS.get(badge_id, {})
            achievement = {
                "achievement_id": f"achievement_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "badge_type": badge_id,
                "badge_name": badge_def.get("name", ""),
                "badge_description": badge_def.get("description", ""),
                "badge_icon": badge_def.get("icon", "star"),
                "earned_at": datetime.now(timezone.utc)
            }
            await db.achievements.insert_one(achievement)
            newly_awarded.append(badge_id)

    # Remove badges the user no longer qualifies for
    for badge_type, badge_doc in existing_badge_map.items():
        if badge_type.startswith("rank_") and badge_type not in earned_badge_ids:
            await db.achievements.delete_one({"_id": badge_doc["_id"]})

    # Send notification for newly awarded badges
    for badge_type in newly_awarded:
        badge_def = BADGE_DEFINITIONS.get(badge_type, {})
        await create_notification(
            user_id=user_id,
            notif_type="badge",
            title=f"Rank Achieved: {badge_def.get('name', 'New Rank')}!",
            message=badge_def.get("description", "You've reached a new rank!")
        )

    return newly_awarded

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send a push notification to a user via Expo Push Service."""
    token_doc = await db.push_tokens.find_one({"user_id": user_id})
    if not token_doc:
        return False

    push_token = token_doc.get("push_token")
    if not push_token:
        return False

    settings = await db.push_settings.find_one({"user_id": user_id})

    message = {
        "to": push_token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }

    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                logging.info(f"Push notification sent to user {user_id}")
                return True
            else:
                logging.error(f"Failed to send push notification: {response.text}")
                return False
    except Exception as e:
        logging.error(f"Error sending push notification: {e}")
        return False


async def notify_new_like(liker_name: str, target_user_id: str, visit_id: str):
    settings = await db.push_settings.find_one({"user_id": target_user_id})
    if settings and not settings.get("likes_enabled", True):
        return
    await send_push_notification(
        user_id=target_user_id,
        title="New Like!",
        body=f"{liker_name} liked your visit",
        data={"type": "like", "visit_id": visit_id}
    )


async def notify_new_comment(commenter_name: str, target_user_id: str, activity_id: str):
    settings = await db.push_settings.find_one({"user_id": target_user_id})
    if settings and not settings.get("comments_enabled", True):
        return
    await send_push_notification(
        user_id=target_user_id,
        title="New Comment!",
        body=f"{commenter_name} commented on your post",
        data={"type": "comment", "activity_id": activity_id}
    )


async def notify_friend_request(requester_name: str, target_user_id: str):
    settings = await db.push_settings.find_one({"user_id": target_user_id})
    if settings and not settings.get("friend_requests_enabled", True):
        return
    await send_push_notification(
        user_id=target_user_id,
        title="Friend Request!",
        body=f"{requester_name} wants to be your friend",
        data={"type": "friend_request"}
    )




async def recalculate_user_points(user_id: str):
    """Recalculate user points from actual visit data. Cleans stale auto country visits."""
    # 1. Get all landmark visits
    visits = await db.visits.find(
        {"user_id": user_id},
        {"_id": 0, "landmark_id": 1, "points_earned": 1, "verified": 1}
    ).to_list(10000)

    landmark_points = sum(v.get("points_earned", 0) for v in visits)
    verified_landmark_points = sum(
        v.get("points_earned", 0) for v in visits if v.get("verified")
    )

    # 2. Find countries with landmark visits
    visited_landmark_ids = [v["landmark_id"] for v in visits]
    countries_with_landmarks = set()
    if visited_landmark_ids:
        landmarks = await db.landmarks.find(
            {"landmark_id": {"$in": visited_landmark_ids}},
            {"_id": 0, "country_id": 1}
        ).to_list(10000)
        for lm in landmarks:
            countries_with_landmarks.add(lm["country_id"])

    # 3. Clean stale auto country visits
    async for cv in db.country_visits.find(
        {"user_id": user_id, "source": "auto_landmark"},
        {"_id": 0, "country_visit_id": 1, "country_id": 1}
    ):
        if cv["country_id"] not in countries_with_landmarks:
            await db.country_visits.delete_one({"country_visit_id": cv["country_visit_id"]})
            await db.activities.delete_many({"country_visit_id": cv["country_visit_id"]})

    # 4. Sum remaining country visit points
    country_points = 0
    verified_country_points = 0
    async for cv in db.country_visits.find(
        {"user_id": user_id},
        {"_id": 0, "points_earned": 1, "leaderboard_points_earned": 1}
    ):
        country_points += cv.get("points_earned", 0)
        verified_country_points += cv.get("leaderboard_points_earned", 0)

    # 5. Calculate continent bonuses
    continents_visited = set()
    verified_continents = set()
    for cid in countries_with_landmarks:
        country_doc = await db.countries.find_one({"country_id": cid}, {"_id": 0, "continent": 1})
        if country_doc:
            continents_visited.add(country_doc["continent"])
            has_verified = any(
                v.get("verified") for v in visits
                if v["landmark_id"].startswith(f"{cid}_")
            )
            if has_verified:
                verified_continents.add(country_doc["continent"])

    continent_bonus = len(continents_visited) * 50
    verified_continent_bonus = len(verified_continents) * 50

    # 6. Update user
    total_points = landmark_points + country_points + continent_bonus
    total_verified = verified_landmark_points + verified_country_points + verified_continent_bonus

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"points": max(0, total_points), "leaderboard_points": max(0, total_verified)}}
    )
