"""Find and optionally fix the Africa/Oceania data anomalies.

Production shows:
  - Africa: 301 landmarks / 21 countries  (expected 300 / 20)
  - Oceania: 299 landmarks / 20 countries (expected 300 / 20)
  - Grand total: 1500 landmarks / 101 unique countries (expected 100)

Read-only by default. Pass --fix to remove orphan + see remediation hint.

Run on Render Shell:
    cd scripts && python3 find_africa_orphan.py          # diagnose
    cd scripts && python3 find_africa_orphan.py --fix    # remove orphan
"""
import asyncio
import os
import sys
from collections import Counter
from motor.motor_asyncio import AsyncIOMotorClient


async def main(fix: bool) -> int:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    issues = 0

    for continent in ["Africa", "Oceania"]:
        print(f"\n=== {continent} ===")
        # Valid country_ids for this continent
        valid_countries = {
            c["country_id"]: c["name"]
            async for c in db.countries.find(
                {"continent": continent},
                {"_id": 0, "country_id": 1, "name": 1},
            )
        }
        print(f"Countries collection: {len(valid_countries)}")

        # Landmarks for this continent
        lm_count_by_country_id = Counter()
        lm_count_by_country_name = Counter()
        orphans = []
        async for lm in db.landmarks.find(
            {"continent": continent},
            {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1, "country_name": 1, "category": 1},
        ):
            lm_count_by_country_id[lm.get("country_id")] += 1
            lm_count_by_country_name[lm.get("country_name")] += 1
            if lm.get("country_id") not in valid_countries:
                orphans.append(lm)

        total_lm = sum(lm_count_by_country_id.values())
        print(f"Landmarks collection: {total_lm}")
        print(f"Unique country_ids in landmarks: {len(lm_count_by_country_id)}")
        print(f"Unique country_names in landmarks: {len(lm_count_by_country_name)}")

        # Per-country counts — flag anything != 15
        print("\nPer-country landmark counts (flag != 15):")
        for cid, count in sorted(lm_count_by_country_id.items()):
            cname = valid_countries.get(cid, f"ORPHAN:{cid}")
            marker = "" if count == 15 else f"  <-- ANOMALY (expected 15)"
            print(f"  {cname} ({cid}): {count}{marker}")

        # Report orphans
        if orphans:
            issues += len(orphans)
            print(f"\n[ORPHANS FOUND: {len(orphans)}]")
            for o in orphans:
                print(
                    f"  - landmark_id={o.get('landmark_id')} name='{o.get('name')}' "
                    f"country_id='{o.get('country_id')}' country_name='{o.get('country_name')}' "
                    f"category={o.get('category')}"
                )
            if fix:
                ids = [o.get("landmark_id") for o in orphans if o.get("landmark_id")]
                res = await db.landmarks.delete_many({"landmark_id": {"$in": ids}})
                print(f"  [FIX] Deleted {res.deleted_count} orphan landmarks")

        # Flag countries with < 15 landmarks (Oceania case)
        short = [(cid, valid_countries[cid], lm_count_by_country_id.get(cid, 0))
                 for cid in valid_countries
                 if lm_count_by_country_id.get(cid, 0) < 15]
        if short:
            issues += len(short)
            print(f"\n[UNDERCOUNT COUNTRIES: {len(short)}]")
            for cid, cname, count in short:
                missing = 15 - count
                # Show which (official/premium) category has deficit
                official = await db.landmarks.count_documents({"country_id": cid, "category": "official"})
                premium = await db.landmarks.count_documents({"country_id": cid, "category": "premium"})
                print(f"  - {cname} ({cid}): {count}/15  [official={official}/10, premium={premium}/5, missing={missing}]")

    print()
    print("=" * 60)
    if issues == 0:
        print("ALL CLEAN. No issues detected.")
        return 0
    print(f"TOTAL ISSUES: {issues}")
    print()
    if not fix:
        print("Re-run with --fix to delete orphans.")
        print("Undercount countries need a follow-up insert script (see output above).")
    return 1


if __name__ == "__main__":
    fix_mode = "--fix" in sys.argv
    sys.exit(asyncio.run(main(fix_mode)))
