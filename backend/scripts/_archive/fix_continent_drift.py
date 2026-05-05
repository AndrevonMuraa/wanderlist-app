"""Retag continent labels to fix drift — NO deletions, NO insertions.

Issues found in production:
  1. 'Tope de Coroa' landmark has continent='Africa' but country_id='cape_verde'
     which is classified as Oceania in the countries collection. This makes:
       - Africa = 301 landmarks / 21 countries (should be 300/20)
       - Oceania = 299 landmarks / 20 countries (should be 300/20)
  2. 5 legacy landmarks use continent 'North America' or 'South America'
     instead of the canonical 'Americas'. This makes:
       - Americas = 295 / North America = 3 / South America = 2
     Total is correct (300) but split across 3 continent labels.

Fix strategy: UPDATE only — no data lost, no duplicates risked.

Run via Render Shell:
    cd scripts && python3 fix_continent_drift.py           # dry-run
    cd scripts && python3 fix_continent_drift.py --apply   # execute fix
"""
import asyncio
import os
import sys
from collections import Counter
from motor.motor_asyncio import AsyncIOMotorClient


async def main(apply_fix: bool) -> int:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    total_updates = 0

    # --- Fix 1: Reconcile each landmark's continent with its country's continent ---
    print("=== FIX 1: Reconcile landmark.continent with country.continent ===")
    country_continent = {}
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "continent": 1}):
        country_continent[c["country_id"]] = c["continent"]

    mismatches = []
    async for lm in db.landmarks.find(
        {}, {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1, "continent": 1}
    ):
        expected = country_continent.get(lm.get("country_id"))
        if expected and expected != lm.get("continent"):
            mismatches.append({
                "landmark_id": lm.get("landmark_id"),
                "name": lm.get("name"),
                "country_id": lm.get("country_id"),
                "from": lm.get("continent"),
                "to": expected,
            })

    if mismatches:
        print(f"Found {len(mismatches)} landmarks with mismatched continent:")
        for m in mismatches:
            print(
                f"  - '{m['name']}' ({m['country_id']}): "
                f"'{m['from']}' → '{m['to']}'"
            )
        if apply_fix:
            for m in mismatches:
                await db.landmarks.update_one(
                    {"landmark_id": m["landmark_id"]},
                    {"$set": {"continent": m["to"]}},
                )
            print(f"  [FIX] Updated {len(mismatches)} landmarks")
            total_updates += len(mismatches)
    else:
        print("No mismatches found.")

    # --- Fix 2: Collapse legacy 'North America' / 'South America' → 'Americas' ---
    print("\n=== FIX 2: Legacy continent labels → 'Americas' ===")
    for legacy in ["North America", "South America"]:
        count = await db.landmarks.count_documents({"continent": legacy})
        if count > 0:
            print(f"  Landmarks with continent='{legacy}': {count}")
            if apply_fix:
                res = await db.landmarks.update_many(
                    {"continent": legacy},
                    {"$set": {"continent": "Americas"}},
                )
                print(f"    [FIX] Updated {res.modified_count} landmarks to 'Americas'")
                total_updates += res.modified_count

        # Also fix countries collection (in case any countries still carry the legacy label)
        count_c = await db.countries.count_documents({"continent": legacy})
        if count_c > 0:
            print(f"  Countries with continent='{legacy}': {count_c}")
            if apply_fix:
                res = await db.countries.update_many(
                    {"continent": legacy},
                    {"$set": {"continent": "Americas"}},
                )
                print(f"    [FIX] Updated {res.modified_count} countries to 'Americas'")
                total_updates += res.modified_count

    # --- Post-check ---
    print("\n" + "=" * 60)
    print("POST-CHECK TOTALS:")
    pipe = [
        {"$group": {
            "_id": "$continent",
            "total": {"$sum": 1},
            "countries": {"$addToSet": "$country_id"},
        }},
        {"$sort": {"_id": 1}},
    ]
    all_clean = True
    async for r in db.landmarks.aggregate(pipe):
        ok = r["total"] == 300 and len(r["countries"]) == 20
        marker = "" if ok else "  <-- STILL OFF"
        if not ok:
            all_clean = False
        print(f"  {r['_id']}: {r['total']} landmarks / {len(r['countries'])} countries{marker}")

    grand = await db.landmarks.count_documents({})
    total_c = await db.countries.count_documents({})
    print(f"\nGrand total: {grand} landmarks / {total_c} countries "
          f"(expected 1500 / 100)")

    print()
    if apply_fix:
        print(f"APPLIED: {total_updates} total updates.")
        if all_clean and grand == 1500 and total_c == 100:
            print("ALL CLEAN. Database is now perfectly balanced.")
            return 0
        print("Some issues remain — see above.")
        return 1
    else:
        print("DRY-RUN complete. Re-run with --apply to execute.")
        return 0 if total_updates == 0 else 1


if __name__ == "__main__":
    apply_mode = "--apply" in sys.argv
    sys.exit(asyncio.run(main(apply_mode)))
