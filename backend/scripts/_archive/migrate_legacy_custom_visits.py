"""Migrate legacy custom visits to link with official DB countries.
Adds country_id, matched_country, and continent to user_created_visits 
that were created before the autocomplete feature was added.

Run: cd scripts && python3 migrate_legacy_custom_visits.py
     cd scripts && python3 migrate_legacy_custom_visits.py --dry-run
"""
import asyncio
import os
import sys
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'wandermark')


async def migrate(dry_run=False):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Load all DB countries for matching
    countries = await db.countries.find(
        {}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}
    ).to_list(500)

    # Build lookup: lowercase name -> country doc
    country_lookup = {}
    for c in countries:
        country_lookup[c["name"].lower()] = c

    print(f"Loaded {len(countries)} countries from DB")

    # 2. Find legacy custom visits without country_id
    legacy_filter = {
        "$or": [
            {"country_id": {"$exists": False}},
            {"country_id": None},
            {"matched_country": {"$exists": False}},
        ]
    }
    legacy_visits = await db.user_created_visits.find(
        legacy_filter, {"_id": 0, "user_created_visit_id": 1, "country_name": 1, "user_id": 1}
    ).to_list(10000)

    print(f"Found {len(legacy_visits)} legacy custom visits to migrate")

    matched = 0
    unmatched = 0

    for visit in legacy_visits:
        visit_id = visit["user_created_visit_id"]
        country_name = (visit.get("country_name") or "").strip()
        key = country_name.lower()

        country = country_lookup.get(key)

        if country:
            update = {
                "$set": {
                    "country_id": country["country_id"],
                    "continent": country["continent"],
                    "matched_country": True,
                    "country_name": country["name"],  # Normalize casing
                }
            }
            matched += 1
            print(f"  MATCH: '{country_name}' -> {country['country_id']} ({country['continent']})")
        else:
            update = {
                "$set": {
                    "country_id": None,
                    "matched_country": False,
                }
            }
            unmatched += 1
            print(f"  NO MATCH: '{country_name}' (visit {visit_id})")

        if not dry_run:
            await db.user_created_visits.update_one(
                {"user_created_visit_id": visit_id},
                update
            )

    print(f"\n{'DRY RUN - ' if dry_run else ''}Migration complete:")
    print(f"  Matched:   {matched}")
    print(f"  Unmatched: {unmatched}")
    print(f"  Total:     {len(legacy_visits)}")

    client.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("=== DRY RUN MODE (no changes will be made) ===\n")
    asyncio.run(migrate(dry_run=dry_run))
