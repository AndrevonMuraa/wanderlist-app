"""Fix Africa orphan + Oceania undercount drift in production.

Production shows (as of Build 83 TestFlight):
  - Africa: 301 landmarks / 21 countries  (expected 300 / 20)
  - Oceania: 299 landmarks / 20 countries (expected 300 / 20)

This script:
  1. DIAGNOSE (read-only): show per-country counts, orphans, undercount countries
  2. FIX (with --apply):
     a. Delete orphan landmarks (country_id not in countries collection)
     b. For each undercount country, insert ONE authentic landmark from
        the pre-vetted BACKUP_POOL (only inserts if candidate name is not
        already present for that country — skips duplicates automatically)

Safe to run multiple times. Idempotent.

Run via Render Shell:
    cd scripts && python3 fix_africa_oceania_drift.py            # dry-run diagnose
    cd scripts && python3 fix_africa_oceania_drift.py --apply    # execute fix
"""
import asyncio
import os
import sys
import uuid
from collections import Counter
from motor.motor_asyncio import AsyncIOMotorClient


# --- Backup pool: pre-vetted authentic candidate landmarks per Oceania country ---
# Used ONLY when a country is short (< 15 landmarks). One candidate per country
# is enough since we only need to fill a 14→15 gap. Category defaults to "premium"
# (the 5-slot tier) since undercounts typically happen there.
BACKUP_POOL = {
    "australia": {
        "name": "Kakadu National Park",
        "description": "UNESCO World Heritage dual-listed park with Aboriginal rock art, waterfalls and wetlands.",
        "best_time_to_visit": "May-Sep",
        "duration": "2-3 days",
        "difficulty": "Moderate",
    },
    "new_zealand": {
        "name": "Tongariro Alpine Crossing",
        "description": "19km volcanic alpine crossing past Mount Doom with emerald lakes.",
        "best_time_to_visit": "Nov-Apr",
        "duration": "Full day",
        "difficulty": "Challenging",
    },
    "fiji": {
        "name": "Yasawa Islands",
        "description": "Volcanic island chain with white sand beaches and vibrant coral reefs.",
        "best_time_to_visit": "May-Oct",
        "duration": "2-3 days",
        "difficulty": "Easy",
    },
    "french_polynesia": {
        "name": "Moorea Lagoon",
        "description": "Heart-shaped volcanic island with turquoise lagoon and stingray encounters.",
        "best_time_to_visit": "May-Oct",
        "duration": "2-3 days",
        "difficulty": "Easy",
    },
    "cook_islands": {
        "name": "Aitutaki Lagoon",
        "description": "Triangular lagoon with 15 motus, considered one of the most beautiful in the world.",
        "best_time_to_visit": "May-Oct",
        "duration": "Full day",
        "difficulty": "Easy",
    },
    "samoa": {
        "name": "To Sua Ocean Trench",
        "description": "30m deep swimming hole connected to the ocean by underwater cave.",
        "best_time_to_visit": "May-Oct",
        "duration": "Half day",
        "difficulty": "Easy",
    },
    "vanuatu": {
        "name": "Mount Yasur Volcano",
        "description": "One of the world's most accessible active volcanoes with near-constant eruptions.",
        "best_time_to_visit": "Apr-Oct",
        "duration": "Half day",
        "difficulty": "Moderate",
    },
    "maldives": {
        "name": "Hanifaru Bay",
        "description": "UNESCO biosphere reserve where manta rays and whale sharks gather to feed.",
        "best_time_to_visit": "Jun-Nov",
        "duration": "Half day",
        "difficulty": "Easy",
    },
    "hawaii": {
        "name": "Kalalau Trail",
        "description": "18km coastal trail along Kauai's dramatic Na Pali Coast cliffs.",
        "best_time_to_visit": "May-Sep",
        "duration": "Full day",
        "difficulty": "Challenging",
    },
    "madagascar": {
        "name": "Tsingy de Bemaraha",
        "description": "UNESCO razor-sharp limestone pinnacle forest unique to Madagascar.",
        "best_time_to_visit": "Apr-Nov",
        "duration": "Full day",
        "difficulty": "Moderate",
    },
    "cape_verde": {
        "name": "Pico do Fogo",
        "description": "Active stratovolcano rising 2,829m from the Atlantic, last erupted 2014.",
        "best_time_to_visit": "Nov-Jun",
        "duration": "Full day",
        "difficulty": "Challenging",
    },
    "papua_new_guinea": {
        "name": "Kokoda Track",
        "description": "96km jungle trail across the Owen Stanley Range, site of WWII battles.",
        "best_time_to_visit": "Apr-Oct",
        "duration": "7-10 days",
        "difficulty": "Challenging",
    },
    "palau": {
        "name": "Jellyfish Lake",
        "description": "Marine lake on Eil Malk filled with millions of non-stinging golden jellyfish.",
        "best_time_to_visit": "Nov-Apr",
        "duration": "Half day",
        "difficulty": "Easy",
    },
    "solomon_islands": {
        "name": "Marovo Lagoon",
        "description": "World's largest saltwater lagoon, UNESCO-nominated with double barrier reef.",
        "best_time_to_visit": "May-Oct",
        "duration": "2-3 days",
        "difficulty": "Easy",
    },
    "new_caledonia": {
        "name": "Isle of Pines",
        "description": "Lagoon island with towering pines, natural pools and white sand beaches.",
        "best_time_to_visit": "Sep-Nov",
        "duration": "2-3 days",
        "difficulty": "Easy",
    },
    "guam": {
        "name": "Two Lovers Point",
        "description": "Dramatic 120m cliff overlook steeped in Chamorro legend, Tumon Bay views.",
        "best_time_to_visit": "Dec-May",
        "duration": "1-2 hours",
        "difficulty": "Easy",
    },
    "comoros": {
        "name": "Mount Karthala",
        "description": "Africa's largest active volcanic caldera at 2,361m on Grande Comore island.",
        "best_time_to_visit": "May-Oct",
        "duration": "2 days",
        "difficulty": "Challenging",
    },
    "reunion": {
        "name": "Piton de la Fournaise",
        "description": "One of the world's most active volcanoes with frequent safely-viewable eruptions.",
        "best_time_to_visit": "Apr-Nov",
        "duration": "Full day",
        "difficulty": "Moderate",
    },
    "mauritius": {
        "name": "Le Morne Brabant",
        "description": "UNESCO World Heritage peninsula mountain, symbol of the fight against slavery.",
        "best_time_to_visit": "May-Dec",
        "duration": "Half day",
        "difficulty": "Challenging",
    },
    "seychelles": {
        "name": "Vallee de Mai",
        "description": "UNESCO primeval palm forest on Praslin, home of the legendary Coco de Mer.",
        "best_time_to_visit": "Apr-Oct",
        "duration": "Half day",
        "difficulty": "Easy",
    },
}


def make_premium_landmark(country_id: str, country_name: str, continent: str, data: dict) -> dict:
    """Build a landmark document matching the existing schema (premium tier, 10 pts)."""
    return {
        "landmark_id": str(uuid.uuid4()),
        "country_id": country_id,
        "country_name": country_name,
        "continent": continent,
        "name": data["name"],
        "description": data["description"],
        "category": "premium",
        "points": 10,
        "image_url": "",
        "images": [],
        "best_time_to_visit": data.get("best_time_to_visit", "Year-round"),
        "duration": data.get("duration", "Full day"),
        "difficulty": data.get("difficulty", "Easy"),
        "upvotes": 0,
        "downvotes": 0,
        "coordinates": None,
    }


async def main(apply_fix: bool) -> int:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    total_issues = 0
    total_fixes = 0

    for continent in ["Africa", "Oceania"]:
        print(f"\n=== {continent} ===")
        # Valid countries (from countries collection)
        valid_countries = {}
        async for c in db.countries.find(
            {"continent": continent},
            {"_id": 0, "country_id": 1, "name": 1},
        ):
            valid_countries[c["country_id"]] = c["name"]
        print(f"Countries in collection: {len(valid_countries)}")

        # Landmarks for this continent
        lm_count = Counter()
        orphans = []
        async for lm in db.landmarks.find(
            {"continent": continent},
            {"_id": 0, "landmark_id": 1, "name": 1, "country_id": 1,
             "country_name": 1, "category": 1},
        ):
            lm_count[lm.get("country_id")] += 1
            if lm.get("country_id") not in valid_countries:
                orphans.append(lm)

        print(f"Landmarks total: {sum(lm_count.values())}")

        # --- Orphans ---
        if orphans:
            print(f"\n[ORPHANS: {len(orphans)}]")
            for o in orphans:
                print(
                    f"  - landmark_id={o.get('landmark_id')} "
                    f"name='{o.get('name')}' "
                    f"country_id='{o.get('country_id')}' "
                    f"country_name='{o.get('country_name')}' "
                    f"category={o.get('category')}"
                )
            total_issues += len(orphans)
            if apply_fix:
                ids = [o.get("landmark_id") for o in orphans if o.get("landmark_id")]
                if ids:
                    res = await db.landmarks.delete_many({"landmark_id": {"$in": ids}})
                    print(f"  [FIX] Deleted {res.deleted_count} orphan landmarks")
                    total_fixes += res.deleted_count

        # --- Undercount countries ---
        short = [
            (cid, valid_countries[cid], lm_count.get(cid, 0))
            for cid in valid_countries
            if lm_count.get(cid, 0) < 15
        ]
        if short:
            print(f"\n[UNDERCOUNT: {len(short)}]")
            for cid, cname, count in short:
                off = await db.landmarks.count_documents(
                    {"country_id": cid, "category": "official"}
                )
                prm = await db.landmarks.count_documents(
                    {"country_id": cid, "category": "premium"}
                )
                print(f"  - {cname} ({cid}): {count}/15  [official={off}/10, premium={prm}/5]")
                total_issues += 1

                if apply_fix:
                    candidate = BACKUP_POOL.get(cid)
                    if not candidate:
                        print(f"    [SKIP] No backup candidate in pool for {cid}")
                        continue
                    # Skip if the candidate name already exists for this country
                    existing = await db.landmarks.find_one(
                        {"country_id": cid, "name": candidate["name"]},
                        {"_id": 0, "landmark_id": 1},
                    )
                    if existing:
                        print(
                            f"    [SKIP] '{candidate['name']}' already exists for {cname}. "
                            f"Manual intervention needed."
                        )
                        continue
                    doc = make_premium_landmark(cid, cname, continent, candidate)
                    await db.landmarks.insert_one(doc)
                    print(f"    [FIX] Inserted premium landmark: '{candidate['name']}'")
                    total_fixes += 1

    # --- Final verification ---
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
    async for r in db.landmarks.aggregate(pipe):
        expected = 300
        marker = "" if r["total"] == expected and len(r["countries"]) == 20 else "  <-- STILL OFF"
        print(f"  {r['_id']}: {r['total']} landmarks / {len(r['countries'])} countries{marker}")
    grand_total = await db.landmarks.count_documents({})
    print(f"\nGrand total landmarks: {grand_total} (expected 1500)")

    print()
    if total_issues == 0:
        print("ALL CLEAN. No issues detected.")
        return 0
    if apply_fix:
        print(f"Fixed {total_fixes} / {total_issues} issues.")
        if total_fixes < total_issues:
            print("Some issues require manual intervention (see [SKIP] lines above).")
            return 1
        return 0
    print(f"DRY-RUN complete. {total_issues} issues found.")
    print("Re-run with --apply to execute the fix.")
    return 1


if __name__ == "__main__":
    apply_mode = "--apply" in sys.argv
    sys.exit(asyncio.run(main(apply_mode)))
