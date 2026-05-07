"""
E2E test data seeder — idempotent, namespaced, production-safe.

Creates a realistic mix of users, visits, friendships, reports, support
tickets, and hidden content so a manual EAS build can exercise every screen
with non-trivial data. Safe to re-run: every artifact is tagged
`_seed_source = "e2e"` and re-seeding deletes only those before recreating.

Run:
    python -m scripts.seed_e2e_data            # full seed (default)
    python -m scripts.seed_e2e_data --wipe     # remove ALL e2e seed data + exit
    python -m scripts.seed_e2e_data --dry-run  # show what would happen, no writes

Personas created (or refreshed):
    - test@wandermark.app       super-admin   (Test1234!)  — pre-existing
    - mod@wandermark.app        moderator     (Test1234!)  — pre-existing
    - testpro@wandermark.app    pro user      (Test1234!)  — pre-existing
    - testfree@wandermark.app   freemium                   (Test1234!)
    - testpro2@wandermark.app   pro #2 (friend graph)      (Test1234!)
    - testsuspended@wandermark.app   suspended user        (Test1234!)
    - testnew@wandermark.app    brand-new (no visits)      (Test1234!)
"""
from __future__ import annotations

import argparse
import asyncio
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow running both as module and as script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from utils.auth import hash_password  # noqa: E402

SEED_TAG = "e2e"
DEFAULT_PASSWORD = "Test1234!"

PERSONAS = [
    {"email": "test@wandermark.app",          "name": "Test Admin",     "username": "testadmin",  "role": "admin",     "tier": "pro",  "trusted": True},
    {"email": "mod@wandermark.app",           "name": "Test Moderator", "username": "testmod",    "role": "moderator", "tier": "free", "trusted": True},
    {"email": "testpro@wandermark.app",       "name": "Test Pro",       "username": "testpro",    "role": "user",      "tier": "pro",  "trusted": True},
    {"email": "testfree@wandermark.app",      "name": "Test Free",      "username": "testfree",   "role": "user",      "tier": "free", "trusted": False},
    {"email": "testpro2@wandermark.app",      "name": "Test Pro Two",   "username": "testpro2",   "role": "user",      "tier": "pro",  "trusted": False},
    {"email": "testsuspended@wandermark.app", "name": "Test Suspended", "username": "testsusp",   "role": "user",      "tier": "free", "trusted": False, "suspended_until": "+30d"},
    {"email": "testnew@wandermark.app",       "name": "Test Newcomer",  "username": "testnew",    "role": "user",      "tier": "free", "trusted": False},
]

UNSPLASH_PHOTOS = [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900",  # Eiffel
    "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=900",  # Generic
    "https://images.unsplash.com/photo-1535139262971-c51845709a48?w=900",  # Asia city
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900",  # Mountain
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900",    # Coast
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900",  # Castle
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900",  # Sunset
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900",  # Boat
]

LANDMARK_FALLBACKS_BY_CONTINENT = {
    "Europe":   ["france_eiffel_tower", "italy_colosseum", "uk_tower_of_london", "spain_sagrada_familia", "greece_parthenon", "germany_neuschwanstein_castle"],
    "Asia":     ["japan_mount_fuji", "japan_kinkaku-ji_(golden_pavilion)", "china_great_wall", "thailand_grand_palace"],
    "Americas": ["usa_grand_canyon", "usa_statue_of_liberty", "usa_times_square", "brazil_christ_the_redeemer"],
    "Africa":   ["egypt_great_pyramid_of_giza", "south_africa_table_mountain"],
    "Oceania":  ["australia_sydney_opera_house"],
}

PRIVACIES = ["public", "friends", "private"]


def parse_suspended_until(raw):
    if not raw:
        return None
    if raw.startswith("+") and raw.endswith("d"):
        days = int(raw[1:-1])
        return datetime.now(timezone.utc) + timedelta(days=days)
    return None


async def upsert_user(db, persona, dry_run=False):
    """Idempotent — create user if missing, otherwise update role/tier/trusted/suspended."""
    update_fields = {
        "role": persona["role"],
        "subscription_tier": persona["tier"],
        "is_premium": persona["tier"] == "pro",
        "trusted_traveler": persona["trusted"],
        "_seed_source": SEED_TAG,
    }
    if "suspended_until" in persona:
        until = parse_suspended_until(persona["suspended_until"])
        if until:
            update_fields["suspended_until"] = until
            update_fields["suspended_reason"] = "E2E test — suspension flow validation"
    else:
        # Make sure non-suspended personas are NOT carrying a stale suspension
        update_fields["suspended_until"] = None
        update_fields["suspended_reason"] = None

    existing = await db.users.find_one({"email": persona["email"]}, {"_id": 0, "user_id": 1})
    if existing:
        if dry_run:
            print(f"  ↻ would update existing user: {persona['email']} ({existing['user_id']})")
            return existing["user_id"]
        await db.users.update_one(
            {"email": persona["email"]},
            {"$set": update_fields},
        )
        return existing["user_id"]

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    if dry_run:
        print(f"  + would create user: {persona['email']} ({user_id})")
        return user_id

    await db.users.insert_one({
        "user_id": user_id,
        "email": persona["email"],
        "name": persona["name"],
        "username": persona["username"],
        "password_hash": hash_password(DEFAULT_PASSWORD),
        "picture": "",
        "bio": "E2E test account",
        "default_privacy": "public",
        "comment_permission": "everyone",
        "points": 0,
        "leaderboard_points": 0,
        "created_at": datetime.now(timezone.utc),
        **update_fields,
    })
    return user_id


async def wipe_seed(db):
    """Remove ALL artifacts created by previous e2e seeds. Users are kept (so
    you don't lose login credentials) but their seed-generated content is wiped."""
    collections = ["visits", "user_created_visits", "country_visits", "friends",
                   "friend_requests", "reports", "support_tickets", "activities",
                   "comments", "notifications", "activity_likes"]
    total = 0
    for c in collections:
        res = await db[c].delete_many({"_seed_source": SEED_TAG})
        if res.deleted_count:
            print(f"  - removed {res.deleted_count} from {c}")
            total += res.deleted_count
    return total


async def pick_landmark(db, continent: str):
    for lm_id in LANDMARK_FALLBACKS_BY_CONTINENT.get(continent, []):
        lm = await db.landmarks.find_one({"landmark_id": lm_id}, {"_id": 0, "landmark_id": 1, "name": 1, "country": 1, "continent": 1})
        if lm:
            return lm
    # Fallback: any landmark on that continent
    return await db.landmarks.find_one({"continent": continent}, {"_id": 0, "landmark_id": 1, "name": 1, "country": 1, "continent": 1})


async def seed_visits_for(db, user_id: str, plan: list, dry_run=False):
    """Create verified landmark visits per plan. Plan items: (continent, n_photos, privacy, days_ago)."""
    inserted = 0
    for continent, n_photos, privacy, days_ago in plan:
        lm = await pick_landmark(db, continent)
        if not lm:
            continue
        photos = UNSPLASH_PHOTOS[:n_photos] if n_photos > 0 else []
        visited_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
        doc = {
            "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "landmark_id": lm["landmark_id"],
            "landmark_name": lm.get("name", ""),
            "country": lm.get("country", ""),
            "continent": lm.get("continent", continent),
            "photos": photos,
            "visited_at": visited_at,
            "visibility": privacy,
            "is_public": privacy == "public",
            "created_at": visited_at,
            "diary_notes": f"E2E memory ({privacy}) — {n_photos} photo{'s' if n_photos != 1 else ''}",
            "share_diary": privacy != "private",
            "verified": n_photos > 0,
            "points_earned": 10 if n_photos > 0 else 5,
            "_seed_source": SEED_TAG,
        }
        if dry_run:
            inserted += 1
            continue
        await db.visits.insert_one(doc)
        inserted += 1
    return inserted


async def seed_country_visits_for(db, user_id: str, countries: list, dry_run=False):
    inserted = 0
    for c in countries:
        if dry_run:
            inserted += 1
            continue
        await db.country_visits.insert_one({
            "country_visit_id": f"cv_{uuid.uuid4().hex[:10]}",
            "user_id": user_id,
            "country": c,
            "visited_at": datetime.now(timezone.utc) - timedelta(days=random.randint(30, 720)),
            "photos": [],
            "diary_notes": f"E2E country visit: {c}",
            "_seed_source": SEED_TAG,
        })
        inserted += 1
    return inserted


async def seed_custom_visits_for(db, user_id: str, count: int, dry_run=False):
    samples = [
        ("My grandmother's village", "Norway", "Europe"),
        ("That little cafe in Paris", "France", "Europe"),
        ("Hidden beach", "Thailand", "Asia"),
        ("Family cabin", "Norway", "Europe"),
    ]
    inserted = 0
    for i in range(count):
        name, country, continent = samples[i % len(samples)]
        if dry_run:
            inserted += 1
            continue
        await db.user_created_visits.insert_one({
            "user_visit_id": f"ucv_{uuid.uuid4().hex[:10]}",
            "user_id": user_id,
            "name": name,
            "country": country,
            "continent": continent,
            "photos": UNSPLASH_PHOTOS[:2] if i % 2 == 0 else [],
            "visited_at": datetime.now(timezone.utc) - timedelta(days=random.randint(10, 365)),
            "visibility": "friends",
            "diary_notes": "E2E custom visit",
            "_seed_source": SEED_TAG,
        })
        inserted += 1
    return inserted


async def seed_friendship(db, user_a: str, user_b: str, status: str = "accepted", dry_run=False):
    # Idempotent — skip if exists
    if await db.friends.find_one({"$or": [
        {"user_id": user_a, "friend_id": user_b},
        {"user_id": user_b, "friend_id": user_a},
    ]}):
        return 0
    if dry_run:
        return 1
    now = datetime.now(timezone.utc)
    await db.friends.insert_many([
        {"user_id": user_a, "friend_id": user_b, "status": status, "created_at": now, "_seed_source": SEED_TAG},
        {"user_id": user_b, "friend_id": user_a, "status": status, "created_at": now, "_seed_source": SEED_TAG},
    ])
    return 1


async def seed_friend_request(db, from_id: str, to_id: str, dry_run=False):
    if await db.friend_requests.find_one({"from_user_id": from_id, "to_user_id": to_id, "status": "pending"}):
        return 0
    if dry_run:
        return 1
    await db.friend_requests.insert_one({
        "request_id": f"fr_{uuid.uuid4().hex[:10]}",
        "from_user_id": from_id,
        "to_user_id": to_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "_seed_source": SEED_TAG,
    })
    return 1


async def seed_reports(db, reporter_id: str, target_visits: list, count: int, dry_run=False):
    reasons = ["spam", "inappropriate", "misinformation", "harassment"]
    inserted = 0
    for i in range(min(count, len(target_visits))):
        if dry_run:
            inserted += 1
            continue
        v = target_visits[i]
        await db.reports.insert_one({
            "report_id": f"rep_{uuid.uuid4().hex[:10]}",
            "reporter_id": reporter_id,
            "content_type": "visit",
            "content_id": v["visit_id"],
            "target_user_id": v["user_id"],
            "reason": reasons[i % len(reasons)],
            "description": f"E2E test report #{i + 1}",
            "status": "pending",
            "priority": "normal",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=i * 2),
            "_seed_source": SEED_TAG,
        })
        inserted += 1
    return inserted


async def seed_support_tickets(db, user_id: str, count: int, dry_run=False):
    topics = [
        ("Cannot upload photo", "Photo upload spinner runs forever on iOS 17.4."),
        ("Subscription not activating", "I bought Pro but my account still shows Free."),
        ("Lost my visits", "All my Europe visits disappeared after Build 84."),
    ]
    inserted = 0
    for i in range(min(count, len(topics))):
        if dry_run:
            inserted += 1
            continue
        subject, body = topics[i]
        await db.support_tickets.insert_one({
            "ticket_id": f"tkt_{uuid.uuid4().hex[:10]}",
            "user_id": user_id,
            "subject": subject,
            "status": "open",
            "messages": [{
                "message_id": f"msg_{uuid.uuid4().hex[:8]}",
                "from_user_id": user_id,
                "from_role": "user",
                "body": body,
                "created_at": datetime.now(timezone.utc) - timedelta(hours=i * 6),
            }],
            "created_at": datetime.now(timezone.utc) - timedelta(hours=i * 6),
            "updated_at": datetime.now(timezone.utc) - timedelta(hours=i * 6),
            "user_unread": 0,
            "admin_unread": 1,
            "_seed_source": SEED_TAG,
        })
        inserted += 1
    return inserted


async def hide_random_visits(db, count: int, dry_run=False):
    """Mark `count` non-test-admin visits as hidden — exercises the hidden-by-mod banner."""
    cursor = db.visits.find({"_seed_source": SEED_TAG, "hidden": {"$ne": True}}).limit(count)
    docs = await cursor.to_list(length=count)
    if dry_run:
        return len(docs)
    for d in docs:
        await db.visits.update_one(
            {"visit_id": d["visit_id"]},
            {"$set": {
                "hidden": True,
                "hidden_reason": "E2E test — community guideline violation simulation",
                "hidden_by": "system",
                "hidden_at": datetime.now(timezone.utc),
            }},
        )
    return len(docs)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wipe", action="store_true", help="Remove all e2e seed data and exit")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without writing")
    args = parser.parse_args()

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print(f"Connected to {db_name} (dry_run={args.dry_run})")

    if args.wipe:
        print("Wiping all e2e seed artifacts...")
        n = await wipe_seed(db)
        print(f"Done. Removed {n} document(s).")
        return

    # 1. Wipe previous seed BEFORE recreating (idempotent re-seed)
    if not args.dry_run:
        n = await wipe_seed(db)
        print(f"Removed {n} previous seed document(s).")

    # 2. Personas
    print("\n=== Personas ===")
    user_ids = {}
    for p in PERSONAS:
        uid = await upsert_user(db, p, dry_run=args.dry_run)
        user_ids[p["email"]] = uid
        print(f"  {p['email']:42s} → {uid}  ({p['role']}/{p['tier']})")

    pro_id   = user_ids["testpro@wandermark.app"]
    free_id  = user_ids["testfree@wandermark.app"]
    pro2_id  = user_ids["testpro2@wandermark.app"]
    susp_id  = user_ids["testsuspended@wandermark.app"]
    admin_id = user_ids["test@wandermark.app"]
    mod_id   = user_ids["mod@wandermark.app"]

    # 3. Visits — realistic mix per persona
    print("\n=== Visits ===")
    # testpro: heavy traveller — 30 visits across continents
    plan_pro = (
        [("Europe",   3, "public",  d) for d in range(5, 65, 6)]    # 10 in Europe
        + [("Asia",   2, "public",  d) for d in range(20, 110, 15)]  # 6 in Asia
        + [("Americas", 4, "friends", d) for d in range(40, 160, 20)] # 6 in Americas
        + [("Europe", 0, "private", d) for d in (90, 200, 365)]      # 3 private no-photo
        + [("Africa", 5, "public",  d) for d in (120, 250)]         # 2 Africa
        + [("Asia",   1, "public",  3650)]                            # 1 ancient (10y ago) — Year-Recap time-traveller
    )
    n = await seed_visits_for(db, pro_id, plan_pro, dry_run=args.dry_run)
    print(f"  testpro:  {n} verified visits")

    # testpro2: lighter — 15 visits (for friend feed)
    plan_pro2 = (
        [("Europe",   2, "public", d) for d in range(10, 70, 10)]
        + [("Asia",   3, "friends", d) for d in (15, 45, 75)]
        + [("Americas", 1, "public", d) for d in (30, 90, 150)]
    )
    n = await seed_visits_for(db, pro2_id, plan_pro2, dry_run=args.dry_run)
    print(f"  testpro2: {n} verified visits")

    # testfree: minimal — 8 visits to test free-tier limits/CTAs
    plan_free = [
        ("Europe",   2, "public", 5),
        ("Europe",   1, "friends", 30),
        ("Asia",     0, "private", 60),
        ("Americas", 3, "public", 90),
        ("Europe",   1, "public", 120),
        ("Asia",     2, "public", 180),
        ("Africa",   0, "friends", 240),
        ("Europe",   1, "private", 300),
    ]
    n = await seed_visits_for(db, free_id, plan_free, dry_run=args.dry_run)
    print(f"  testfree: {n} verified visits")

    # admin gets a couple too — tests admin posting in their own feed
    plan_admin = [("Europe", 2, "public", 5), ("Asia", 3, "public", 30)]
    n = await seed_visits_for(db, admin_id, plan_admin, dry_run=args.dry_run)
    print(f"  testadmin: {n} verified visits")

    # 4. Country visits (no specific landmark)
    print("\n=== Country visits ===")
    n = await seed_country_visits_for(db, pro_id, ["Norway", "Sweden", "Iceland"], dry_run=args.dry_run)
    print(f"  testpro:  {n} country-only visits")
    n = await seed_country_visits_for(db, free_id, ["Denmark"], dry_run=args.dry_run)
    print(f"  testfree: {n} country-only visits")

    # 5. Custom user-created visits
    print("\n=== Custom visits ===")
    n = await seed_custom_visits_for(db, pro_id, 4, dry_run=args.dry_run)
    print(f"  testpro:  {n} custom visits")
    n = await seed_custom_visits_for(db, pro2_id, 2, dry_run=args.dry_run)
    print(f"  testpro2: {n} custom visits")

    # 6. Friend graph
    print("\n=== Friendships ===")
    pairs = [
        (pro_id, pro2_id),    # accepted
        (pro_id, free_id),    # accepted
        (pro2_id, free_id),   # accepted — triangle, useful for testing privacy=friends
    ]
    for a, b in pairs:
        n = await seed_friendship(db, a, b, "accepted", dry_run=args.dry_run)
        if n:
            print(f"  + {a} ↔ {b} (accepted)")
    n = await seed_friend_request(db, free_id, admin_id, dry_run=args.dry_run)
    if n:
        print(f"  + pending request: testfree → admin")
    n = await seed_friend_request(db, pro2_id, admin_id, dry_run=args.dry_run)
    if n:
        print(f"  + pending request: testpro2 → admin")

    # 7. Reports — 8 from various reporters against pro/pro2 visits
    print("\n=== Reports ===")
    target_visits = await db.visits.find(
        {"_seed_source": SEED_TAG, "user_id": {"$in": [pro_id, pro2_id]}},
        {"_id": 0, "visit_id": 1, "user_id": 1},
    ).limit(8).to_list(length=8)
    n = await seed_reports(db, free_id, target_visits, 8, dry_run=args.dry_run)
    print(f"  + {n} pending reports")

    # 8. Support tickets
    print("\n=== Support tickets ===")
    n = await seed_support_tickets(db, free_id, 3, dry_run=args.dry_run)
    print(f"  + {n} open tickets from testfree")

    # 9. Hidden visits — 2 to exercise the "hidden by moderator" banner
    print("\n=== Hidden visits ===")
    n = await hide_random_visits(db, 2, dry_run=args.dry_run)
    print(f"  + {n} visits marked hidden")

    # 10. Recompute points so leaderboard reflects new state
    if not args.dry_run:
        print("\n=== Point recompute ===")
        for uid in {pro_id, pro2_id, free_id, admin_id}:
            agg = await db.visits.aggregate([
                {"$match": {"user_id": uid, "verified": True}},
                {"$group": {"_id": None, "pts": {"$sum": {"$ifNull": ["$points_earned", 0]}}}},
            ]).to_list(length=1)
            pts = agg[0]["pts"] if agg else 0
            await db.users.update_one(
                {"user_id": uid},
                {"$set": {"points": pts, "leaderboard_points": pts}},
            )
            print(f"  {uid}: {pts} pts")

    print("\n✔ E2E seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
