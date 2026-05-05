"""Debug: show exactly what recalculate_user_points sees.
Run: cd scripts && python3 debug_points.py test@wandermark.app
"""
import asyncio, os, sys
from motor.motor_asyncio import AsyncIOMotorClient

async def debug(email):
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ.get('DB_NAME', 'wandermark')]

    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "name": 1})
    if not user:
        print(f"User not found: {email}")
        return
    uid = user["user_id"]
    print(f"User: {user['name']} ({uid})\n")

    # Landmark visits
    visits = await db.visits.find({"user_id": uid}, {"_id": 0, "landmark_id": 1, "verified": 1, "points_earned": 1}).to_list(10000)
    print(f"=== LANDMARK VISITS ({len(visits)}) ===")
    for v in visits:
        lm = await db.landmarks.find_one({"landmark_id": v["landmark_id"]}, {"_id": 0, "country_id": 1, "continent": 1, "name": 1})
        c = lm.get("continent", "?") if lm else "?"
        n = lm.get("name", "?") if lm else "?"
        cid = lm.get("country_id", "?") if lm else "?"
        print(f"  {n} ({cid}) | continent={c} | verified={v.get('verified')} | pts={v.get('points_earned')}")

    # Country visits
    print(f"\n=== COUNTRY VISITS ===")
    async for cv in db.country_visits.find({"user_id": uid}, {"_id": 0, "country_id": 1, "country_name": 1, "source": 1, "has_photos": 1, "points_earned": 1, "leaderboard_points_earned": 1, "continent": 1}).sort("continent", 1):
        print(f"  {cv.get('country_name', cv['country_id'])} | continent={cv.get('continent')} | source={cv.get('source')} | has_photos={cv.get('has_photos')} | pts={cv.get('points_earned')} | lb={cv.get('leaderboard_points_earned')}")

    # Continent analysis
    print(f"\n=== CONTINENT ANALYSIS ===")
    countries_with_landmarks = set()
    for v in visits:
        lm = await db.landmarks.find_one({"landmark_id": v["landmark_id"]}, {"_id": 0, "country_id": 1})
        if lm:
            countries_with_landmarks.add(lm["country_id"])

    continents_visited = set()
    verified_continents = set()

    # From landmarks
    for cid in countries_with_landmarks:
        cd = await db.countries.find_one({"country_id": cid}, {"_id": 0, "continent": 1})
        if cd:
            cont = cd["continent"]
            continents_visited.add(cont)
            has_v = any(v.get("verified") for v in visits if v["landmark_id"].startswith(f"{cid}_"))
            if has_v:
                verified_continents.add(cont)
            print(f"  From landmarks: {cid} -> {cont} (verified_landmark={has_v})")

    # From manual country visits
    async for cv in db.country_visits.find({"user_id": uid, "source": {"$ne": "auto_landmark"}}, {"_id": 0, "country_id": 1, "has_photos": 1}):
        cd = await db.countries.find_one({"country_id": cv["country_id"]}, {"_id": 0, "continent": 1})
        if cd:
            cont = cd["continent"]
            continents_visited.add(cont)
            if cv.get("has_photos"):
                verified_continents.add(cont)
            print(f"  From manual CV: {cv['country_id']} -> {cont} (has_photos={cv.get('has_photos')})")

    print(f"\n  Continents visited: {continents_visited}")
    print(f"  Verified continents: {verified_continents}")
    print(f"  Continent bonus: {len(continents_visited) * 50}")
    print(f"  Verified continent bonus: {len(verified_continents) * 50}")

    client.close()

if __name__ == "__main__":
    asyncio.run(debug(sys.argv[1] if len(sys.argv) > 1 else "test@wandermark.app"))
