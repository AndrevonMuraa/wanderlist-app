from typing import Optional
import uuid
import logging
import httpx
from datetime import datetime, timezone

from utils.db import db


# Rank thresholds - 10 ranks for ~30,000 total achievable points
# Updated March 2026 for 100 countries / 1500 landmarks expansion
RANK_THRESHOLDS = [
    {"name": "Newcomer", "min_points": 0},
    {"name": "Wanderer", "min_points": 250},
    {"name": "Explorer", "min_points": 1000},
    {"name": "Adventurer", "min_points": 2500},
    {"name": "Trailblazer", "min_points": 5000},
    {"name": "Voyager", "min_points": 8500},
    {"name": "Globetrotter", "min_points": 13000},
    {"name": "Legend", "min_points": 18000},
    {"name": "Titan", "min_points": 24000},
    {"name": "Mythic", "min_points": 30000},
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


BADGE_DEFINITIONS = {
    # Milestone badges (visit count)
    "first_visit": {
        "name": "First Steps",
        "description": "Your journey begins! You've taken the first step into a world of adventure",
        "icon": "footsteps"
    },
    "milestone_10": {
        "name": "Explorer",
        "description": "10 landmarks conquered! You're building momentum",
        "icon": "map"
    },
    "milestone_25": {
        "name": "Adventurer",
        "description": "25 landmarks down! You're collecting memories across the globe",
        "icon": "compass"
    },
    "milestone_50": {
        "name": "Globetrotter",
        "description": "50 landmarks explored! You've caught the travel bug",
        "icon": "globe"
    },
    "milestone_100": {
        "name": "World Traveler",
        "description": "100 landmarks! Triple digits - the world is your playground",
        "icon": "airplane"
    },
    "milestone_200": {
        "name": "Seasoned Traveler",
        "description": "200 landmarks! You've seen corners most only dream about",
        "icon": "trail-sign"
    },
    "milestone_350": {
        "name": "Elite Explorer",
        "description": "350 landmarks - you're writing history with every step",
        "icon": "medal"
    },
    "milestone_500": {
        "name": "Legend",
        "description": "500 landmarks conquered! LEGENDARY status achieved",
        "icon": "trophy"
    },
    "milestone_750": {
        "name": "Titan",
        "description": "750 landmarks! You've mastered the art of exploration",
        "icon": "shield"
    },
    "milestone_1000": {
        "name": "Ultimate Explorer",
        "description": "1,000 landmarks - every landmark conquered. You ARE the legend",
        "icon": "crown"
    },
    # Points badges
    "points_100": {
        "name": "Point Starter",
        "description": "Your first 100 points! Every journey starts with a single step",
        "icon": "star"
    },
    "points_500": {
        "name": "Point Collector",
        "description": "500 points earned! The memories are adding up",
        "icon": "star-half"
    },
    "points_1000": {
        "name": "Point Master",
        "description": "1,000 points! Four digits - you're in the big leagues",
        "icon": "sparkles"
    },
    "points_5000": {
        "name": "Point Legend",
        "description": "5,000 points! You're rewriting the leaderboard",
        "icon": "flash"
    },
    "points_10000": {
        "name": "Point Titan",
        "description": "10,000 points! Halfway to perfection. Unstoppable",
        "icon": "diamond"
    },
    "points_20000": {
        "name": "Point Mythic",
        "description": "20,000 points! Almost at the pinnacle of achievement",
        "icon": "ribbon"
    },
    # Social badges
    "social_5": {
        "name": "Friendly",
        "description": "5 travel buddies! Adventure is better with friends",
        "icon": "people"
    },
    "social_10": {
        "name": "Popular",
        "description": "10 friends in your crew! Building a travel community",
        "icon": "hand-right"
    },
    "social_25": {
        "name": "Social Butterfly",
        "description": "25 friends! You're bringing travelers together",
        "icon": "heart"
    },
    "social_50": {
        "name": "Community Leader",
        "description": "50 friends! You're a pillar of the travel community",
        "icon": "megaphone"
    },
    # Country mastery badges
    "country_complete": {
        "name": "Country Master",
        "description": "All landmarks in one country! You don't just visit - you CONQUER",
        "icon": "flag"
    },
    "countries_5": {
        "name": "Five Nations",
        "description": "5 countries fully explored! The world map is filling up",
        "icon": "map"
    },
    "countries_10": {
        "name": "Decade of Nations",
        "description": "10 countries mastered! Double digits of pure dedication",
        "icon": "earth"
    },
    "countries_25": {
        "name": "Quarter Century",
        "description": "25 countries completed! A quarter of the world is yours",
        "icon": "planet"
    },
    # Continent mastery
    "continent_complete": {
        "name": "Continent Conqueror",
        "description": "Every country in a continent explored! Absolute domination",
        "icon": "globe"
    },
}


async def check_and_award_badges(user_id: str):
    """Check for new badges and award them"""
    newly_awarded = []

    existing_badges = await db.achievements.find({"user_id": user_id}).to_list(1000)
    existing_badge_types = {badge["badge_type"] for badge in existing_badges}

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return newly_awarded

    total_points = user.get("points", 0)

    visits = await db.visits.find({"user_id": user_id}).to_list(1000)
    visit_count = len(visits)

    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user_id, "status": "accepted"},
            {"friend_id": user_id, "status": "accepted"}
        ]
    })

    # Check milestone badges
    milestones = [1, 10, 25, 50, 100, 200, 350, 500, 750, 1000]
    for milestone in milestones:
        badge_type = f"milestone_{milestone}" if milestone > 1 else "first_visit"
        if visit_count >= milestone and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type if milestone > 1 else "first_visit")
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": milestone >= 100
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)

    # Check points badges
    point_milestones = [(100, "points_100"), (500, "points_500"), (1000, "points_1000"), (5000, "points_5000"), (10000, "points_10000"), (20000, "points_20000")]
    for points, badge_type in point_milestones:
        if total_points >= points and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type)
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": points >= 1000
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)

    # Check social badges
    social_milestones = [(5, "social_5"), (10, "social_10"), (25, "social_25"), (50, "social_50")]
    for count, badge_type in social_milestones:
        if friend_count >= count and badge_type not in existing_badge_types:
            badge_def = BADGE_DEFINITIONS.get(badge_type)
            if badge_def:
                achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                achievement = {
                    "achievement_id": achievement_id,
                    "user_id": user_id,
                    "badge_type": badge_type,
                    "badge_name": badge_def["name"],
                    "badge_description": badge_def["description"],
                    "badge_icon": badge_def["icon"],
                    "earned_at": datetime.now(timezone.utc),
                    "is_featured": count >= 25
                }
                await db.achievements.insert_one(achievement)
                newly_awarded.append(badge_type)

    # Check country complete badges
    if visits:
        visited_by_country = {}
        for visit in visits:
            landmark = await db.landmarks.find_one({"landmark_id": visit["landmark_id"]})
            if landmark:
                country_id = landmark.get("country_id")
                if country_id:
                    if country_id not in visited_by_country:
                        visited_by_country[country_id] = set()
                    visited_by_country[country_id].add(visit["landmark_id"])

        for country_id, visited_landmarks in visited_by_country.items():
            all_country_landmarks = await db.landmarks.find({"country_id": country_id}).to_list(1000)
            total_in_country = len(all_country_landmarks)

            if len(visited_landmarks) >= total_in_country and total_in_country > 0:
                badge_type = f"country_complete_{country_id}"
                if badge_type not in existing_badge_types:
                    country = await db.countries.find_one({"country_id": country_id})
                    country_name = country.get("name", "Unknown") if country else "Unknown"

                    achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
                    achievement = {
                        "achievement_id": achievement_id,
                        "user_id": user_id,
                        "badge_type": badge_type,
                        "badge_name": f"{country_name} Master",
                        "badge_description": f"Completed all landmarks in {country_name}",
                        "badge_icon": "trophy",
                        "earned_at": datetime.now(timezone.utc),
                        "is_featured": True
                    }
                    await db.achievements.insert_one(achievement)
                    newly_awarded.append(badge_type)

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


async def notify_achievement(user_id: str, badge_name: str, badge_icon: str):
    settings = await db.push_settings.find_one({"user_id": user_id})
    if settings and not settings.get("achievements_enabled", True):
        return
    await send_push_notification(
        user_id=user_id,
        title=f"Badge Unlocked! {badge_icon}",
        body=f"You earned: {badge_name}",
        data={"type": "achievement"}
    )
