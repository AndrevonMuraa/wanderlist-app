"""Fill premium gaps after duplicate cleanup.
Adds 29 premium landmarks to restore 5 per country balance.

Run locally:  MONGO_URL=... DB_NAME=... python3 fill_premium_gaps.py
Run on Render: cd backend/scripts && python3 fill_premium_gaps.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# Country -> list of {name, desc} to add as premium landmarks
FILL_GAPS = {
    # Need 1 each
    "australia": [
        {"name": "Pinnacles Desert", "desc": "Thousands of ancient limestone pillars rising from golden sand dunes in Nambung National Park."},
    ],
    "bahamas": [
        {"name": "Inagua National Park", "desc": "Remote island sanctuary with the world's largest breeding colony of West Indian flamingos."},
    ],
    "barbados": [
        {"name": "Crane Beach", "desc": "Stunning pink-tinged beach backed by coral stone cliffs, one of the Caribbean's most beautiful."},
    ],
    "brazil": [
        {"name": "Chapada dos Veadeiros", "desc": "Ancient quartz crystal plateau with waterfalls, natural pools, and cerrado biodiversity."},
    ],
    "canada": [
        {"name": "Pacific Rim National Park", "desc": "Rugged Vancouver Island coastline with ancient temperate rainforest and wild Pacific surf beaches."},
    ],
    "chile": [
        {"name": "Queulat Hanging Glacier", "desc": "Dramatic hanging glacier suspended on a cliff face above a turquoise lagoon in Patagonia."},
    ],
    "china": [
        {"name": "Leshan Giant Buddha", "desc": "World's largest stone Buddha statue at 71m, carved into a cliff overlooking the confluence of three rivers."},
    ],
    "costa_rica": [
        {"name": "Tenorio Volcano National Park", "desc": "Volcanic national park home to the stunning sky-blue Rio Celeste and pristine cloud forest."},
    ],
    "fiji": [
        {"name": "Taveuni Rainbow Reef", "desc": "World-renowned soft coral reef with kaleidoscopic colors in the Somosomo Strait."},
    ],
    "france": [
        {"name": "Loire Valley Châteaux", "desc": "Garden of France with over 300 Renaissance castles along the Loire River, a UNESCO World Heritage Site."},
    ],
    "germany": [
        {"name": "Bamberg Old Town", "desc": "UNESCO medieval town with 11th-century cathedral, half-timbered houses, and unique smoked beer tradition."},
    ],
    "india": [
        {"name": "Sundarbans Mangrove Forest", "desc": "World's largest mangrove forest spanning the Ganges Delta, home to the Royal Bengal tiger."},
    ],
    "italy": [
        {"name": "Trulli of Alberobello", "desc": "UNESCO village of unique whitewashed conical stone houses in the Puglia countryside."},
    ],
    "japan": [
        {"name": "Shirakawa-go Village", "desc": "UNESCO mountain village with steep thatched-roof farmhouses set against the Japanese Alps."},
    ],
    "kenya": [
        {"name": "Lamu Old Town", "desc": "UNESCO Swahili settlement with narrow streets, carved wooden doors, and centuries-old coral architecture."},
    ],
    "malaysia": [
        {"name": "Bako National Park", "desc": "Sarawak's oldest national park with dramatic sea stacks, pitcher plants, and proboscis monkeys."},
    ],
    "morocco": [
        {"name": "Legzira Rock Arches", "desc": "Dramatic natural red stone arches on the Atlantic coast, sculpted by millennia of wind and waves."},
    ],
    "panama": [
        {"name": "Barro Colorado Island", "desc": "Tropical research island in Gatun Lake, one of the most studied patches of rainforest on Earth."},
    ],
    "samoa": [
        {"name": "Falealupo Rainforest Canopy Walk", "desc": "Treetop walkway through pristine rainforest at the westernmost point of Samoa, the last place to see each sunset."},
    ],
    "spain": [
        {"name": "Cies Islands", "desc": "Pristine Atlantic archipelago off Galicia with white sand beaches and crystal waters, part of a national park."},
    ],
    "vanuatu": [
        {"name": "Champagne Beach", "desc": "Pristine white sand beach on Espiritu Santo where volcanic gas bubbles rise through the warm shallows."},
    ],
    # Need 2 each
    "botswana": [
        {"name": "Nata Bird Sanctuary", "desc": "Vast sanctuary on the edge of Makgadikgadi pans, a critical breeding ground for flamingos and pelicans."},
        {"name": "Khama Rhino Sanctuary", "desc": "Community-run sanctuary protecting both black and white rhinos in the heart of the Kalahari."},
    ],
    "french_polynesia": [
        {"name": "Rangiroa Blue Lagoon", "desc": "A lagoon within a lagoon, with vibrant coral gardens and pristine turquoise waters."},
        {"name": "Taputapuatea Marae", "desc": "UNESCO sacred ceremonial site on Raiatea, the spiritual heart of Polynesian civilization."},
    ],
    "mauritius": [
        {"name": "Pamplemousses Botanical Garden", "desc": "Historic 18th-century botanical garden with giant Amazon water lilies and 85 palm species."},
        {"name": "Flic en Flac Beach", "desc": "Long white sand beach on the west coast with a protected coral lagoon and spectacular sunsets."},
    ],
    "uk": [
        {"name": "Cotswolds Villages", "desc": "Honey-colored stone villages nestled in rolling green hills, quintessential English countryside."},
        {"name": "Hadrian's Wall", "desc": "Ancient Roman frontier wall stretching 117km across northern England, a UNESCO World Heritage Site."},
    ],
}


async def fill():
    total = 0

    for cid, entries in FILL_GAPS.items():
        country = await db.countries.find_one(
            {"country_id": cid}, {"_id": 0, "name": 1, "continent": 1}
        )
        if not country:
            print(f"  SKIP: country {cid} not found")
            continue

        existing_count = await db.landmarks.count_documents(
            {"country_id": cid, "category": "premium"}
        )
        needed = 5 - existing_count
        if needed <= 0:
            print(f"  SKIP: {country['name']} already has 5+ premiums")
            continue

        # Get existing names to avoid duplicates
        existing_names = set()
        async for lm in db.landmarks.find({"country_id": cid}, {"_id": 0, "name": 1}):
            existing_names.add(lm["name"].lower().strip())

        added = 0
        for entry in entries:
            if added >= needed:
                break
            if entry["name"].lower().strip() in existing_names:
                print(f"  SKIP DUP: {entry['name']} already exists in {cid}")
                continue

            idx = existing_count + added + 1
            lid = f"{cid}_premium_fill_{idx}"

            await db.landmarks.insert_one({
                "landmark_id": lid,
                "name": entry["name"],
                "country_id": cid,
                "country_name": country["name"],
                "continent": country["continent"],
                "description": entry["desc"],
                "category": "premium",
                "image_url": "",
                "images": [],
                "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Moderate",
                "latitude": None,
                "longitude": None,
                "points": 25,
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc),
            })
            added += 1
            total += 1
            print(f"  ADD: {country['name']} -> {entry['name']} ({lid})")

    print(f"\nAdded {total} premium landmarks")

    # Verification
    print("\n=== VERIFICATION ===")
    bad = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}).sort("name", 1):
        off = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "official"})
        prem = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if off != 10 or prem != 5:
            print(f"  ISSUE: {c['name']:30s} {off} official + {prem} premium")
            bad += 1

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"\nFinal: {t} landmarks ({o} official, {p} premium)")
    if bad == 0:
        print("ALL COUNTRIES HAVE EXACTLY 15 LANDMARKS (10 + 5)!")
    else:
        print(f"{bad} countries still have issues")

    client.close()


if __name__ == "__main__":
    asyncio.run(fill())
