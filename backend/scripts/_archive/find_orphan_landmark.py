"""Find the orphan landmark — one whose country_id doesn't match any country.

Run via Render Shell:
    cd scripts && python3 find_orphan_landmark.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient


async def run():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    # Build set of valid country_ids
    valid_ids = set()
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1}):
        valid_ids.add(c["country_id"])

    print(f"Valid country_ids count: {len(valid_ids)}")

    # Scan landmarks for orphans
    orphans = []
    null_cid = []
    total = 0
    async for lm in db.landmarks.find(
        {}, {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1, "category": 1}
    ):
        total += 1
        cid = lm.get("country_id")
        if not cid:
            null_cid.append(lm)
        elif cid not in valid_ids:
            orphans.append(lm)

    print(f"Total landmarks scanned: {total}")
    print(f"Orphan landmarks (unknown country_id): {len(orphans)}")
    for o in orphans:
        print(f"  - {o.get('landmark_id')}  [{o.get('category')}]  '{o.get('name')}'  country_id='{o.get('country_id')}'")

    print(f"\nLandmarks with null/missing country_id: {len(null_cid)}")
    for o in null_cid:
        print(f"  - {o.get('landmark_id')}  [{o.get('category')}]  '{o.get('name')}'")

    # Also check if any country_id appears in landmarks but isn't in countries
    print("\nAll unique country_ids in landmarks collection:")
    cids_in_lm = set()
    async for lm in db.landmarks.find({}, {"_id": 0, "country_id": 1}):
        if lm.get("country_id"):
            cids_in_lm.add(lm["country_id"])
    extra_cids = cids_in_lm - valid_ids
    if extra_cids:
        print(f"  country_ids in landmarks but NOT in countries: {sorted(extra_cids)}")
    else:
        print("  All landmark country_ids map to valid countries.")

    client.close()


if __name__ == "__main__":
    asyncio.run(run())
