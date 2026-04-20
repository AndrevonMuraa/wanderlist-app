"""Full cleanup of the 5 drifted countries in production Atlas.

Makes prod match local preview DB exactly: 10 official + 5 premium per country.

Strategy (in order, for safety):
  1. RENAME known same-landmark spelling variants (preserves visits)
  2. Pre-flight visit-count audit for anything we'd delete
  3. DELETE true extras (only if zero user visits reference them)
  4. INSERT missing landmarks (with unique landmark_ids to avoid collisions)
  5. Final verification via db_compare logic

SAFETY:
  - Dry-run by default. Pass --apply to actually modify the DB.
  - Refuses to delete any landmark that has user visits (reports instead).
  - Never touches `visits` collection.

Run:
    cd scripts && python3 fix_country_drift.py          # dry-run
    cd scripts && python3 fix_country_drift.py --apply  # execute
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


# === RENAMES: known spelling variants (landmark_id -> new name) ===
RENAMES = [
    {
        "landmark_id": "cook_islands_premium_3",
        "old_name": "Te Rua Manga Needle",
        "new_name": "Te Rua Manga (The Needle)",
    },
    {
        "landmark_id": "tunisia_star_wars_mos_espa_set",
        "old_name": "Kerkouane Punic Ruins",
        "new_name": "Star Wars Mos Espa Set",
    },
]

# === DELETES: true extras that should be removed ===
DELETES = [
    # Argentina
    {"landmark_id": "argentina_premium_4", "name": "Beagle Channel"},
    {"landmark_id": "argentina_el_chalten", "name": "El Chaltén"},
    {"landmark_id": "argentina_quebrada_flechas", "name": "Quebrada de las Flechas"},
    # Cook Islands
    {"landmark_id": "cook_islands_premium_5", "name": "One Foot Island Post Office"},
    {"landmark_id": "cook_islands_black_rock", "name": "Black Rock (Tuoro)"},
    # Japan
    {"landmark_id": "japan_premium_5", "name": "Kenrokuen Garden"},
    # Samoa
    {"landmark_id": "samoa_premium_4", "name": "Apia Clock Tower"},
    {"landmark_id": "samoa_saleaula_lava_fields", "name": "Saleaula Lava Fields"},
    # Tunisia
    {"landmark_id": "tunisia_dougga_roman_ruins", "name": "Ichkeul National Park"},
]

# === INSERTS: missing landmarks (full records from local DB) ===
# landmark_id will be regenerated to guarantee uniqueness in prod.
INSERTS = [
    {
        "_base_id": "argentina_buenos_aires_tango",
        "country_id": "argentina",
        "country_name": "Argentina",
        "continent": "Americas",
        "name": "Buenos Aires Tango",
        "description": "European-style city, La Boca, tango shows, steak, wine, cosmopolitan culture.",
        "category": "official",
        "points": 10,
        "difficulty": "Easy",
        "best_time_to_visit": "Year-round",
        "duration": "2-3 hours",
    },
    {
        "_base_id": "argentina_salta_wine_route",
        "country_id": "argentina",
        "country_name": "Argentina",
        "continent": "Americas",
        "name": "Salta Wine Route",
        "description": "World's highest vineyards producing exceptional Torrontes wine.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "cook_islands_muri_lagoon",
        "country_id": "cook_islands",
        "country_name": "Cook Islands",
        "continent": "Oceania",
        "name": "Muri Lagoon",
        "description": "Protected lagoon, kayaking, stand-up paddle, sandbars, water activities.",
        "category": "official",
        "points": 10,
        "difficulty": "Easy",
        "best_time_to_visit": "Year-round",
        "duration": "2-3 hours",
    },
    {
        "_base_id": "cook_islands_muri_night_market",
        "country_id": "cook_islands",
        "country_name": "Cook Islands",
        "continent": "Oceania",
        "name": "Muri Night Market",
        "description": "Weekly beachside market with local food, crafts, and island entertainment.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "japan_yakushima_ancient_forest",
        "country_id": "japan",
        "country_name": "Japan",
        "continent": "Asia",
        "name": "Yakushima Ancient Forest",
        "description": "UNESCO island with 1,000-year-old cedar trees that inspired Princess Mononoke.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "japan_yakushima_cedar_forests",
        "country_id": "japan",
        "country_name": "Japan",
        "continent": "Asia",
        "name": "Yakushima Cedar Forests",
        "description": "Ancient cedar forests on a mystical island that inspired Miyazaki.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "samoa_to_sua_ocean_trench",
        "country_id": "samoa",
        "country_name": "Samoa",
        "continent": "Oceania",
        "name": "To Sua Ocean Trench",
        "description": "30m swimming hole connected to ocean, ladder descent, stunning natural pool.",
        "category": "official",
        "points": 10,
        "difficulty": "Easy",
        "best_time_to_visit": "Year-round",
        "duration": "2-3 hours",
    },
    {
        "_base_id": "samoa_sua_ocean_trench",
        "country_id": "samoa",
        "country_name": "Samoa",
        "continent": "Oceania",
        "name": "Sua Ocean Trench",
        "description": "Giant natural swimming hole connected to the ocean through an underground lava tube.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "tunisia_el_jem_amphitheatre",
        "country_id": "tunisia",
        "country_name": "Tunisia",
        "continent": "Africa",
        "name": "El Jem Amphitheatre",
        "description": "Third-largest Roman amphitheatre in the world, remarkably preserved.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
    {
        "_base_id": "tunisia_ksar_ouled_soltane_granary",
        "country_id": "tunisia",
        "country_name": "Tunisia",
        "continent": "Africa",
        "name": "Ksar Ouled Soltane Granary",
        "description": "Multi-story Berber granary used as Star Wars filming location.",
        "category": "premium",
        "points": 25,
        "difficulty": "Moderate",
        "best_time_to_visit": "Year-round",
        "duration": "Half day",
    },
]


async def unique_id(db, base: str) -> str:
    """Return a landmark_id not yet used in prod."""
    lid = base
    suffix = 2
    while await db.landmarks.find_one({"landmark_id": lid}, {"_id": 1}):
        lid = f"{base}_v{suffix}"
        suffix += 1
    return lid


async def run(apply: bool):
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    print("=" * 60)
    print(f"WanderMark country drift cleanup — {'APPLY MODE' if apply else 'DRY RUN'}")
    print("=" * 60)

    # ---------- 1. RENAMES ----------
    print("\n[1] RENAMES (safe — preserves all user visits)")
    for r in RENAMES:
        doc = await db.landmarks.find_one({"landmark_id": r["landmark_id"]}, {"_id": 0, "name": 1})
        if not doc:
            print(f"  SKIP  {r['landmark_id']} — not in prod")
            continue
        current = doc["name"]
        if current == r["new_name"]:
            print(f"  OK    {r['landmark_id']} already named '{r['new_name']}'")
            continue
        if current != r["old_name"]:
            print(f"  WARN  {r['landmark_id']} current name is '{current}', expected '{r['old_name']}' — still renaming")
        if apply:
            await db.landmarks.update_one(
                {"landmark_id": r["landmark_id"]},
                {"$set": {"name": r["new_name"]}},
            )
        print(f"  RENAME  {r['landmark_id']}: '{current}' -> '{r['new_name']}'")

    # ---------- 2. PRE-FLIGHT DELETE AUDIT ----------
    print("\n[2] PRE-FLIGHT visit-count audit for deletions")
    blocked = []
    for d in DELETES:
        visits = await db.visits.count_documents({"landmark_id": d["landmark_id"]})
        flag = "BLOCKED" if visits > 0 else "ok"
        print(f"  {flag:7}  {d['landmark_id']:45} visits={visits}")
        if visits > 0:
            blocked.append(d)

    if blocked:
        print(f"\n  {len(blocked)} landmark(s) have user visits — they will NOT be deleted.")
        print("  To preserve user data, these extras will be moved to 'archive: true' marker")
        print("  instead (if --apply). Counts may remain slightly off but no data is lost.")

    # ---------- 3. DELETES ----------
    print("\n[3] DELETES")
    blocked_ids = {b["landmark_id"] for b in blocked}
    for d in DELETES:
        if d["landmark_id"] in blocked_ids:
            if apply:
                await db.landmarks.update_one(
                    {"landmark_id": d["landmark_id"]},
                    {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}},
                )
            print(f"  ARCHIVE  {d['landmark_id']}  ({d['name']}) — has user visits")
        else:
            if apply:
                await db.landmarks.delete_one({"landmark_id": d["landmark_id"]})
            print(f"  DELETE   {d['landmark_id']}  ({d['name']})")

    # ---------- 4. INSERTS ----------
    print("\n[4] INSERTS")
    now = datetime.now(timezone.utc).isoformat()
    for item in INSERTS:
        base = item.pop("_base_id")
        # Already exists by name? skip
        existing = await db.landmarks.find_one(
            {"country_id": item["country_id"], "name": item["name"]}, {"_id": 1}
        )
        if existing:
            print(f"  SKIP     {item['name']} ({item['country_id']}) — already exists")
            continue
        new_id = await unique_id(db, base) if apply else base
        doc = {
            "landmark_id": new_id,
            **item,
            "image_url": "",
            "images": [],
            "upvotes": 0,
            "created_by": None,
            "created_at": now,
            "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}] if item["category"] == "premium" else [],
            "latitude": None,
            "longitude": None,
        }
        if apply:
            await db.landmarks.insert_one(doc)
        print(f"  INSERT   {new_id:50}  [{item['category']}]  {item['name']}")

    # ---------- 5. VERIFY ----------
    print("\n[5] FINAL STATE")
    affected = ["argentina", "cook_islands", "japan", "samoa", "tunisia"]
    all_good = True
    for cid in affected:
        # Only count non-archived
        o = await db.landmarks.count_documents(
            {"country_id": cid, "category": "official", "archived": {"$ne": True}}
        )
        p = await db.landmarks.count_documents(
            {"country_id": cid, "category": "premium", "archived": {"$ne": True}}
        )
        status = "OK" if (o == 10 and p == 5) else "STILL WRONG"
        if status != "OK":
            all_good = False
        print(f"  {cid:15}  {o}o + {p}p = {o+p}  [{status}]")

    total_active = await db.landmarks.count_documents({"archived": {"$ne": True}})
    total_all = await db.landmarks.count_documents({})
    print(f"\n  Active landmarks : {total_active}  (expected 1500)")
    print(f"  Total (incl archived): {total_all}")

    print("\n" + "=" * 60)
    if apply:
        print("APPLIED. Run `python3 db_compare.py` to confirm.")
    else:
        print("DRY RUN. No changes made. Re-run with --apply to execute.")
    print("=" * 60)

    client.close()
    return 0 if all_good else 1


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    sys.exit(asyncio.run(run(apply)))
