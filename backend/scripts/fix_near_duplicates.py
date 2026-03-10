"""Fix near-duplicate landmark names across all countries.
Resolves ~15 cases where official and premium have essentially the same name.
Safe to run on both local and production.

Run: cd scripts && python3 fix_near_duplicates.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# Each fix: (country_id, old_name_to_change, new_name, new_description)
# Strategy: rename the PREMIUM duplicate to a unique landmark
FIXES = [
    ("greece", "Zakynthos Shipwreck Beach", "Samaria Gorge", "Europe's longest gorge in Crete, a dramatic 16km hike through towering canyon walls."),
    ("finland", "Northern Lights Lapland", "Lemmenjoki National Park", "Finland's largest national park with pristine wilderness, gold-panning rivers, and ancient Sami culture."),
    ("finland", "Olavinlinna Opera Castle", "Koli National Park", "Iconic viewpoint over endless Finnish lakeland, inspiration for Sibelius and Finnish art."),
    ("maldives", "Underwater Restaurant Ithaa", "Fuvahmulah Island", "Unique equatorial island with freshwater lake, tiger sharks, and distinct ecosystem."),
    ("netherlands", "Giethoorn Canal Village", "Texel Island", "Largest Wadden Sea island with seal colonies, beaches, and bird reserves."),
    ("netherlands", "Hoge Veluwe National Park", "Maastricht Underground Tunnels", "Medieval tunnel network of over 20,000 passages beneath the city."),
    ("mauritius", "Pamplemousses Botanical Garden", "Flic en Flac Beach", "Long white sand beach on the west coast with a protected coral lagoon and spectacular sunsets."),
    ("bahamas", "Dean's Blue Hole", "Thunderball Grotto", "Underwater cave made famous by James Bond, with snorkeling among tropical fish."),
    ("cook_islands", "Te Rua Manga Needle Hike", "Aitutaki Lagoon", "One of the most beautiful lagoons in the world with pristine turquoise waters."),
    ("tunisia", "Dougga Roman Ruins", "Sidi Bou Said Village", "Blue and white clifftop village overlooking the Mediterranean."),
    ("argentina", "Mendoza Wine Country", "Tierra del Fuego National Park", "End-of-the-world wilderness with dramatic coastlines and sub-Antarctic forests."),
    ("south_korea", "Boseong Green Tea Fields", "Damyang Bamboo Forest", "Lush bamboo grove and garden complex, one of Korea's most serene natural landscapes."),
    ("samoa", "Lalomanu White Beach", "Alofaaga Blowholes", "Powerful natural blowholes on Savai'i's south coast where ocean waves blast through lava rock."),
    ("samoa", "Falealupo Rainforest Canopy Walk", "Piula Cave Pool", "Natural ocean swimming pool inside a cave beneath a historic church, fed by freshwater springs."),
    ("new_zealand", "Tongariro Alpine Crossing", "Aoraki Dark Sky Reserve", "World's largest dark sky reserve surrounding New Zealand's tallest mountain."),
    ("philippines", "Coron Island Lagoons", "Chocolate Hills Bohol", "Over 1,200 symmetrical grass-covered limestone hills that turn brown in dry season."),
    ("botswana", "Makgadikgadi Pans Meerkats", "Nata Bird Sanctuary", "Vast sanctuary on the edge of the salt pans, a critical breeding ground for flamingos."),
    ("mozambique", "Maputo Elephant Reserve", "Ibo Island Fort", "Historic fortified island with silver workshops and crumbling colonial architecture."),
]


async def fix():
    fixed = 0
    skipped = 0

    for country_id, old_name, new_name, new_desc in FIXES:
        # Find the landmark to rename
        lm = await db.landmarks.find_one(
            {"country_id": country_id, "name": old_name},
            {"_id": 1, "category": 1}
        )
        if not lm:
            print(f"  SKIP (not found): {country_id}/{old_name}")
            skipped += 1
            continue

        # Check new name doesn't already exist in same country
        exists = await db.landmarks.find_one(
            {"country_id": country_id, "name": new_name}
        )
        if exists:
            print(f"  SKIP (exists): {country_id}/{old_name} -> {new_name}")
            skipped += 1
            continue

        await db.landmarks.update_one(
            {"_id": lm["_id"]},
            {"$set": {"name": new_name, "description": new_desc}}
        )
        fixed += 1
        print(f"  OK: {country_id}/{old_name} -> {new_name}")

    print(f"\nFixed: {fixed}, Skipped: {skipped}")

    # Verify no remaining near-duplicates
    print("\n=== Remaining near-duplicates check ===")
    remaining = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1}).sort("country_id", 1):
        cid = c["country_id"]
        names = []
        async for lm in db.landmarks.find({"country_id": cid}, {"_id": 0, "name": 1, "category": 1}):
            names.append((lm["name"], lm["category"]))
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                n1 = names[i][0].lower().replace("'", "").replace("-", " ")
                n2 = names[j][0].lower().replace("'", "").replace("-", " ")
                w1, w2 = set(n1.split()), set(n2.split())
                overlap = w1 & w2
                # Only flag if 2+ words overlap AND overlap > 50% of the longer name
                if len(overlap) >= 2 and (len(overlap) / max(len(w1), len(w2))) > 0.6:
                    remaining += 1
                    print(f"  {cid}: \"{names[i][0]}\" vs \"{names[j][0]}\"")

    print(f"Near-duplicates remaining: {remaining}")

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"Total: {t} ({o} official, {p} premium)")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix())
