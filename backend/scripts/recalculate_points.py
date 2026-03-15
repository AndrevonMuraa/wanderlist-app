"""Recalculate user points from actual visit data + clean up stale country visits.
Run on Render: cd scripts && python3 recalculate_points.py
Can also be run for a specific user: python3 recalculate_points.py user@email.com
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]


async def recalculate_user(user_id: str, verbose: bool = True):
    """Recalculate a single user's points from actual visit data."""

    # 1. Sum landmark visit points
    visits = await db.visits.find(
        {"user_id": user_id},
        {"_id": 0, "landmark_id": 1, "points_earned": 1, "verified": 1}
    ).to_list(10000)

    landmark_points = sum(v.get("points_earned", 0) for v in visits)
    verified_landmark_points = sum(
        v.get("points_earned", 0) for v in visits if v.get("verified")
    )

    # 2. Determine which countries have landmark visits
    visited_landmark_ids = [v["landmark_id"] for v in visits]
    countries_with_landmarks = set()
    if visited_landmark_ids:
        landmarks = await db.landmarks.find(
            {"landmark_id": {"$in": visited_landmark_ids}},
            {"_id": 0, "country_id": 1, "continent": 1}
        ).to_list(10000)
        for lm in landmarks:
            countries_with_landmarks.add(lm["country_id"])

    # 3. Clean up stale auto country visits (no landmark visits in that country)
    stale_deleted = 0
    async for cv in db.country_visits.find(
        {"user_id": user_id, "source": "auto_landmark"},
        {"_id": 0, "country_visit_id": 1, "country_id": 1, "country_name": 1}
    ):
        if cv["country_id"] not in countries_with_landmarks:
            await db.country_visits.delete_one({"country_visit_id": cv["country_visit_id"]})
            await db.activities.delete_many({"country_visit_id": cv["country_visit_id"]})
            stale_deleted += 1
            if verbose:
                print(f"  Cleaned stale: {cv.get('country_name', cv['country_id'])}")

    # 4. Sum remaining country visit points
    country_visits = await db.country_visits.find(
        {"user_id": user_id},
        {"_id": 0, "points_earned": 1, "has_photos": 1, "leaderboard_points_earned": 1}
    ).to_list(1000)

    country_points = sum(cv.get("points_earned", 0) for cv in country_visits)
    verified_country_points = sum(
        cv.get("leaderboard_points_earned", 0) for cv in country_visits
    )

    # 5. Calculate bonuses from actual state
    # Country exploration bonus: 20 pts for first landmark in each country
    country_bonus = len(countries_with_landmarks) * 20
    # We need to check if any visits in those countries have photos for verified bonus
    verified_country_bonus = 0
    for cid in countries_with_landmarks:
        has_verified = any(
            v.get("verified") for v in visits
            if v["landmark_id"].startswith(f"{cid}_")
        )
        if has_verified:
            verified_country_bonus += 20

    # Continent exploration bonus: 50 pts for first country in each continent
    continents_visited = set()
    for cid in countries_with_landmarks:
        country_doc = await db.countries.find_one(
            {"country_id": cid}, {"_id": 0, "continent": 1}
        )
        if country_doc:
            continents_visited.add(country_doc["continent"])

    continent_bonus = len(continents_visited) * 50
    # For verified continent bonus, check if any country in that continent has verified visits
    verified_continent_bonus = 0
    for cont in continents_visited:
        cont_countries = await db.countries.find(
            {"continent": cont}, {"_id": 0, "country_id": 1}
        ).to_list(100)
        has_verified_in_cont = False
        for cc in cont_countries:
            if any(
                v.get("verified") for v in visits
                if v["landmark_id"].startswith(f"{cc['country_id']}_")
            ):
                has_verified_in_cont = True
                break
        if has_verified_in_cont:
            verified_continent_bonus += 50

    # 6. Calculate totals
    # Note: country_visits.points_earned already INCLUDES the country exploration bonus (20 pts)
    # for auto-created visits. So we should NOT double-count.
    # For manual country visits, points_earned = 50.
    # For auto country visits, points_earned = 20 (= the country bonus).
    # So total = landmark_points + country_visit_points + continent_bonus
    # (country bonus is already in country_visit_points for auto visits)

    # Actually, let me reconsider. The auto country visit has points_earned=20.
    # But the 20 bonus was ALSO added to user.points separately.
    # So the auto country visit points_earned is a RECORD of the bonus, not additional points.
    # The actual point sources are:
    # - Landmark visit points (10 or 25 each)
    # - Country bonus (20 per new country) — stored in auto country visit
    # - Continent bonus (50 per new continent) — NOT stored anywhere
    # - Manual country visit points (50 each)

    # Let me just sum: landmark_points + country_visit_points + continent_bonus
    # where country_visit_points already contains the 20-pt bonuses for auto visits
    # and 50-pt for manual visits.

    total_points = landmark_points + country_points + continent_bonus
    total_verified = verified_landmark_points + verified_country_points + verified_continent_bonus

    # 7. Get current stored values
    user_doc = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "points": 1, "leaderboard_points": 1, "name": 1}
    )
    old_points = user_doc.get("points", 0) if user_doc else 0
    old_lb = user_doc.get("leaderboard_points", 0) if user_doc else 0

    # 8. Update user document
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "points": total_points,
            "leaderboard_points": total_verified,
        }}
    )

    if verbose:
        name = user_doc.get("name", "?") if user_doc else "?"
        print(f"  User: {name} ({user_id})")
        print(f"  Landmark points: {landmark_points} (verified: {verified_landmark_points})")
        print(f"  Country visit points: {country_points} (verified: {verified_country_points})")
        print(f"  Continent bonus: {continent_bonus} (verified: {verified_continent_bonus})")
        print(f"  TOTAL: {old_points} -> {total_points} | LB: {old_lb} -> {total_verified}")
        print(f"  Stale country visits cleaned: {stale_deleted}")

    return {
        "old_points": old_points,
        "new_points": total_points,
        "old_lb": old_lb,
        "new_lb": total_verified,
        "stale_cleaned": stale_deleted,
    }


async def recalculate_all():
    """Recalculate points for ALL users."""
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1}).to_list(10000)
    print(f"Recalculating {len(users)} users...")

    changed = 0
    for user in users:
        result = await recalculate_user(user["user_id"], verbose=False)
        if result["old_points"] != result["new_points"] or result["old_lb"] != result["new_lb"] or result["stale_cleaned"] > 0:
            changed += 1
            print(f"  CHANGED: {user.get('name', '?')} — pts: {result['old_points']}->{result['new_points']}, lb: {result['old_lb']}->{result['new_lb']}, stale: {result['stale_cleaned']}")

    print(f"\nDone. {changed}/{len(users)} users updated.")
    client.close()


async def recalculate_single(email: str):
    """Recalculate for a single user by email."""
    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if not user:
        print(f"User not found: {email}")
        return
    await recalculate_user(user["user_id"])
    client.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(recalculate_single(sys.argv[1]))
    else:
        asyncio.run(recalculate_all())
