"""Replace 6 duplicate premium landmarks with authentic new landmarks.

Each deletion + insert pair keeps the country at exactly 10 official + 5 premium.

SAFETY:
  - Visit-count check before delete. If visits exist → archive instead.
  - New IDs are guaranteed unique via find+suffix scheme.
  - Dry-run by default. Pass --apply to execute.

Run via Render Shell:
    cd scripts && python3 replace_duplicate_landmarks.py          # dry-run
    cd scripts && python3 replace_duplicate_landmarks.py --apply  # execute
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient


# Each entry: delete this duplicate, insert this authentic replacement.
REPLACEMENTS = [
    {
        "country_id": "tunisia",
        "country_name": "Tunisia",
        "continent": "Africa",
        "delete_name": "El Jem Amphitheatre",
        "insert": {
            "_base_id": "tunisia_kairouan_great_mosque",
            "name": "Kairouan Great Mosque",
            "description": "UNESCO-listed 7th-century mosque, one of Islam's four holiest sites and oldest place of worship in North Africa.",
        },
    },
    {
        "country_id": "samoa",
        "country_name": "Samoa",
        "continent": "Oceania",
        "delete_name": "Sua Ocean Trench",
        "insert": {
            "_base_id": "samoa_peapea_cave",
            "name": "Peapea Cave",
            "description": "Sacred lava-tube cave on Savai'i with folklore of the cave-dwelling Peapea swiftlets and legendary Samoan warriors.",
        },
    },
    {
        "country_id": "cook_islands",
        "country_name": "Cook Islands",
        "continent": "Oceania",
        "delete_name": "Muri Night Market",
        "insert": {
            "_base_id": "cook_islands_avana_harbour",
            "name": "Avana Harbour (Seven Canoes Site)",
            "description": "Sacred ancestral departure point where the seven great Polynesian voyaging canoes set sail for Aotearoa (New Zealand).",
        },
    },
    {
        "country_id": "dominican_republic",
        "country_name": "Dominican Republic",
        "continent": "Americas",
        "delete_name": "Bahia de las Aguilas",
        "insert": {
            "_base_id": "dominican_republic_los_tres_ojos",
            "name": "Los Tres Ojos",
            "description": "Three turquoise limestone lagoons inside a collapsed cave system within Mirador del Este National Park.",
        },
    },
    {
        "country_id": "tanzania",
        "country_name": "Tanzania",
        "continent": "Africa",
        "delete_name": "Kondoa Rock Art",
        "insert": {
            "_base_id": "tanzania_kalambo_falls",
            "name": "Kalambo Falls",
            "description": "One of Africa's highest single-drop waterfalls at 221 metres, on the Tanzania-Zambia border with ancient archaeological significance.",
        },
    },
    {
        "country_id": "ecuador",
        "country_name": "Ecuador",
        "continent": "Americas",
        "delete_name": "Cotopaxi Volcano Hike",
        "insert": {
            "_base_id": "ecuador_cajas_national_park",
            "name": "Cajas National Park",
            "description": "Andean páramo highlands with 270+ glacial lakes, pristine ecosystems, and ancient Incan trails near Cuenca.",
        },
    },
]


async def unique_id(db, base: str) -> str:
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
    print(f"Replace duplicate landmarks — {'APPLY' if apply else 'DRY-RUN'}")
    print("=" * 60)

    now = datetime.now(timezone.utc).isoformat()

    for r in REPLACEMENTS:
        print(f"\n=== {r['country_id']} ===")

        # Find the duplicate landmark to delete (by country_id + name)
        target = await db.landmarks.find_one(
            {"country_id": r["country_id"], "name": r["delete_name"]},
            {"_id": 0, "landmark_id": 1, "category": 1},
        )
        if not target:
            print(f"  SKIP DELETE — '{r['delete_name']}' not found in prod (already gone?)")
        else:
            visits = await db.visits.count_documents({"landmark_id": target["landmark_id"]})
            print(f"  Delete target: {target['landmark_id']}  '{r['delete_name']}'  [{target['category']}]  visits={visits}")
            if visits > 0:
                if apply:
                    await db.landmarks.update_one(
                        {"landmark_id": target["landmark_id"]},
                        {"$set": {"archived": True, "archived_at": now}},
                    )
                print(f"  -> ARCHIVE (visits exist, preserving history)")
            else:
                if apply:
                    await db.landmarks.delete_one({"landmark_id": target["landmark_id"]})
                print(f"  -> DELETE (zero visits)")

        # Skip insert if same name already exists
        ins = r["insert"]
        existing = await db.landmarks.find_one(
            {"country_id": r["country_id"], "name": ins["name"]},
            {"_id": 1},
        )
        if existing:
            print(f"  SKIP INSERT — '{ins['name']}' already exists")
            continue

        base = ins["_base_id"]
        new_id = await unique_id(db, base) if apply else base
        doc = {
            "landmark_id": new_id,
            "country_id": r["country_id"],
            "country_name": r["country_name"],
            "continent": r["continent"],
            "name": ins["name"],
            "description": ins["description"],
            "category": "premium",
            "points": 25,
            "difficulty": "Moderate",
            "best_time_to_visit": "Year-round",
            "duration": "Half day",
            "image_url": "",
            "images": [],
            "upvotes": 0,
            "created_by": None,
            "created_at": now,
            "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
            "latitude": None,
            "longitude": None,
        }
        if apply:
            await db.landmarks.insert_one(doc)
        print(f"  Insert: {new_id}  '{ins['name']}'  [premium]")

    # Final verify
    print("\n" + "=" * 60)
    print("FINAL STATE")
    print("=" * 60)
    affected = [r["country_id"] for r in REPLACEMENTS]
    all_good = True
    for cid in affected:
        o = await db.landmarks.count_documents({"country_id": cid, "category": "official", "archived": {"$ne": True}})
        p = await db.landmarks.count_documents({"country_id": cid, "category": "premium", "archived": {"$ne": True}})
        status = "OK" if (o == 10 and p == 5) else "STILL WRONG"
        if status != "OK":
            all_good = False
        print(f"  {cid:22} {o}o + {p}p = {o+p}  [{status}]")

    total = await db.landmarks.count_documents({"archived": {"$ne": True}})
    print(f"\n  Active landmarks: {total}  (expected 1500)")

    print("\n" + ("APPLIED." if apply else "DRY RUN — re-run with --apply to execute."))
    print("Then run: python3 db_quality_check.py")

    client.close()
    return 0 if all_good else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(run("--apply" in sys.argv)))
