"""Fix the 5 countries with divergent official/premium split in production Atlas.

Uses name-based matching (landmark_ids differ between local & prod).

SAFETY RULES:
- Only UPDATES the `category` field.
- NEVER inserts new landmarks (could conflict with existing user visits).
- NEVER deletes landmarks (would orphan user visits/photos).
- Reports extras/missing for manual review.

Source of truth for expected landmarks: snapshotted from local preview DB on 2026-04-20.

Run via Render Shell:
    cd scripts && python3 fix_country_splits.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient


# Expected state per country (name, category) — from local DB snapshot.
EXPECTED = {
    "argentina": {
        "official": {
            "Iguazu Falls", "Perito Moreno Glacier", "Buenos Aires Tango",
            "Ushuaia End of World", "Mendoza Wine Region",
            "Patagonia Torres del Paine", "Recoleta Cemetery",
            "Bariloche Lake District", "Valdes Peninsula", "Salta & Jujuy",
        },
        "premium": {
            "Quebrada de Humahuaca", "Caminito Street",
            "Tierra del Fuego National Park", "Salta Wine Route",
            "Los Glaciares National Park",
        },
    },
    "cook_islands": {
        "official": {
            "Aitutaki Lagoon", "Rarotonga", "Muri Lagoon",
            "Cross Island Nature Trail", "Avarua Town", "Wigmore's Waterfall",
            "Atiu Caves", "Punanga Nui Market", "Titikaveka Beach",
            "Maire Nui Gardens",
        },
        "premium": {
            "Te Vara Nui Village", "One Foot Island", "Te Rua Manga (The Needle)",
            "Muri Beach Night Market", "Muri Night Market",
        },
    },
    "japan": {
        "official": {
            "Mount Fuji", "Tokyo Shibuya Crossing", "Kyoto Golden Pavilion",
            "Fushimi Inari Shrine", "Hiroshima Peace Memorial",
            "Nara Deer Park", "Tokyo Skytree", "Osaka Castle",
            "Hakone Hot Springs", "Miyajima Island",
        },
        "premium": {
            "Himeji Castle", "Naoshima Art Island", "Yakushima Ancient Forest",
            "Yakushima Cedar Forests", "Shirakawa-go Village",
        },
    },
    "samoa": {
        "official": {
            "To Sua Ocean Trench", "Lalomanu Beach", "Piula Cave Pool",
            "Savai'i Island", "Apia Market", "Togitogiga Waterfall",
            "Alofaaga Blowholes", "Robert Louis Stevenson Museum",
            "Falealupo Canopy Walk", "Manono Island",
        },
        "premium": {
            "Papaseea Sliding Rocks", "Savaii Lava Fields", "Afu Aau Waterfall",
            "Sua Ocean Trench", "Papapapaitai Falls",
        },
    },
    "tunisia": {
        "official": {
            "Carthage Ruins", "Sidi Bou Said", "Sahara Star Wars Sets",
            "El Djem Amphitheater", "Tunis Medina", "Chott el Djerid",
            "Dougga Roman City", "Hammamet Beach", "Bardo National Museum",
            "Tozeur Oasis",
        },
        "premium": {
            "Star Wars Mos Espa Set", "Djerba Island", "El Jem Amphitheatre",
            "Ksar Ouled Soltane Granary", "Matmata Troglodyte Homes",
        },
    },
}


async def run():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "wandermark")]

    total_updated = 0
    total_extras = 0
    total_missing = 0

    for country_id, expected in EXPECTED.items():
        print(f"\n=== {country_id} ===")

        # Fetch current state from Atlas
        prod_items = {}
        async for lm in db.landmarks.find(
            {"country_id": country_id},
            {"_id": 0, "landmark_id": 1, "name": 1, "category": 1},
        ):
            prod_items[lm["name"]] = lm

        expected_by_name = {}
        for cat, names in expected.items():
            for n in names:
                expected_by_name[n] = cat

        # 1. Category mismatches → safe update
        for name, exp_cat in expected_by_name.items():
            if name in prod_items:
                actual_cat = prod_items[name]["category"]
                if actual_cat != exp_cat:
                    print(f"  FIX  [{actual_cat} → {exp_cat}]  {name}")
                    await db.landmarks.update_one(
                        {"landmark_id": prod_items[name]["landmark_id"]},
                        {"$set": {"category": exp_cat}},
                    )
                    total_updated += 1

        # 2. Extras in prod that aren't in expected → report only
        extras = [n for n in prod_items if n not in expected_by_name]
        for n in extras:
            print(f"  EXTRA  [{prod_items[n]['category']}]  {n}  "
                  f"(id: {prod_items[n]['landmark_id']})  — manual review")
            total_extras += 1

        # 3. Missing from prod → report only
        missing = [n for n in expected_by_name if n not in prod_items]
        for n in missing:
            print(f"  MISSING  [{expected_by_name[n]}]  {n}  — manual add needed")
            total_missing += 1

        # Verify final state
        o = await db.landmarks.count_documents({"country_id": country_id, "category": "official"})
        p = await db.landmarks.count_documents({"country_id": country_id, "category": "premium"})
        status = "OK" if o == 10 and p == 5 else "STILL WRONG"
        print(f"  RESULT: {o}o + {p}p = {o+p}  [{status}]")

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Categories updated : {total_updated}")
    print(f"Extras (reported)  : {total_extras}")
    print(f"Missing (reported) : {total_missing}")
    print("\nRun `python3 db_compare.py` next to confirm clean state.")

    client.close()


if __name__ == "__main__":
    asyncio.run(run())
