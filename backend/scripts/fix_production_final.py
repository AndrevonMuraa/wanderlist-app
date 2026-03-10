"""Final production fix - resolves remaining activity names and fills premium gaps.
Run on Render: cd scripts && python3 fix_production_final.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# 8 remaining activity landmarks - rename to DIFFERENT names (originals already taken)
ACTIVITY_RENAMES = {
    "Merzouga Camel Trek": {
        "new_name": "Legzira Rock Arches",
        "new_desc": "Dramatic natural red stone arches on the Atlantic coast, sculpted by millennia of wind and waves.",
    },
    "Tsavo Red Elephants": {
        "new_name": "Ol Pejeta Conservancy",
        "new_desc": "Home to the last two northern white rhinos on Earth and a successful chimpanzee sanctuary.",
    },
    "Cahuita Snorkeling Reef": {
        "new_name": "Tenorio Volcano National Park",
        "new_desc": "Volcanic national park home to the stunning sky-blue Rio Celeste and pristine cloud forest.",
    },
    "Coiba Island Diving": {
        "new_name": "Barro Colorado Island",
        "new_desc": "Tropical research island in Gatun Lake, one of the most studied patches of rainforest on Earth.",
    },
    "Blue Lagoon Swimming": {
        "new_name": "Cockpit Country Karst",
        "new_desc": "Dramatic limestone landscape of sinkholes and conical hills, one of the Caribbean's last wildernesses.",
    },
    "Boryeong Mud Festival": {
        "new_name": "Damyang Bamboo Forest",
        "new_desc": "Lush bamboo grove and garden complex in Jeollanam-do, one of Korea's most serene natural landscapes.",
    },
    "Navua River Rafting": {
        "new_name": "Taveuni Rainbow Reef",
        "new_desc": "World-renowned soft coral reef with kaleidoscopic colors in the Somosomo Strait.",
    },
    "Nile Felucca Cruise Aswan": {
        "new_name": "Wadi El Hitan",
        "new_desc": "UNESCO Valley of the Whales with 40-million-year-old fossil whale skeletons in the Western Desert.",
    },
}

# Countries that need premium landmarks filled (from step 3 deletions + activity fixes)
PREMIUM_FILLS = {
    "australia": [
        {"name": "Pinnacles Desert", "desc": "Thousands of ancient limestone pillars rising from golden sand dunes in Nambung National Park."},
    ],
    "canada": [
        {"name": "Pacific Rim National Park", "desc": "Rugged Vancouver Island coastline with ancient temperate rainforest and wild Pacific surf beaches."},
    ],
    "china": [
        {"name": "Leshan Giant Buddha", "desc": "World's largest stone Buddha statue at 71m, carved into a cliff overlooking the confluence of three rivers."},
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
    "japan": [
        {"name": "Shirakawa-go Village", "desc": "UNESCO mountain village with steep thatched-roof farmhouses set against the Japanese Alps."},
    ],
    "spain": [
        {"name": "Cies Islands", "desc": "Pristine Atlantic archipelago off Galicia with white sand beaches and crystal waters, part of a national park."},
    ],
    "uk": [
        {"name": "Cotswolds Villages", "desc": "Honey-colored stone villages nestled in rolling green hills, quintessential English countryside."},
        {"name": "Hadrian's Wall", "desc": "Ancient Roman frontier wall stretching 117km across northern England, a UNESCO World Heritage Site."},
    ],
}


async def fix():
    print("=" * 60)
    print("STEP 1: Rename 8 remaining activity landmarks")
    print("=" * 60)
    renamed = 0
    for old_name, fix_data in ACTIVITY_RENAMES.items():
        lm = await db.landmarks.find_one({"name": old_name}, {"_id": 1, "country_id": 1})
        if not lm:
            print(f"  SKIP (gone): {old_name}")
            continue
        # Check new name doesn't exist in same country
        exists = await db.landmarks.find_one({"country_id": lm["country_id"], "name": fix_data["new_name"]})
        if exists:
            print(f"  SKIP (exists): {old_name} -> {fix_data['new_name']}")
            continue
        await db.landmarks.update_one(
            {"_id": lm["_id"]},
            {"$set": {"name": fix_data["new_name"], "description": fix_data["new_desc"]}},
        )
        renamed += 1
        print(f"  OK: {old_name} -> {fix_data['new_name']}")
    print(f"Renamed: {renamed}\n")

    print("=" * 60)
    print("STEP 2: Fill premium gaps")
    print("=" * 60)
    added = 0
    for cid, entries in PREMIUM_FILLS.items():
        country = await db.countries.find_one({"country_id": cid}, {"_id": 0, "name": 1, "continent": 1})
        if not country:
            continue
        prem_count = await db.landmarks.count_documents({"country_id": cid, "category": "premium"})
        needed = 5 - prem_count
        if needed <= 0:
            print(f"  SKIP: {country['name']} already has {prem_count} premiums")
            continue
        for entry in entries[:needed]:
            # Check not duplicate
            exists = await db.landmarks.find_one({"country_id": cid, "name": entry["name"]})
            if exists:
                print(f"  SKIP (exists): {cid}/{entry['name']}")
                continue
            idx = prem_count + 1
            await db.landmarks.insert_one({
                "landmark_id": f"{cid}_premium_sync_{idx}",
                "name": entry["name"], "country_id": cid,
                "country_name": country["name"], "continent": country["continent"],
                "description": entry["desc"], "category": "premium",
                "image_url": "", "images": [],
                "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round", "duration": "Half day",
                "difficulty": "Moderate", "latitude": None, "longitude": None,
                "points": 25, "upvotes": 0, "created_by": None,
                "created_at": datetime.now(timezone.utc),
            })
            added += 1
            prem_count += 1
            print(f"  ADD: {country['name']} -> {entry['name']}")
    print(f"Added: {added}\n")

    print("=" * 60)
    print("FINAL VERIFICATION")
    print("=" * 60)
    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"Landmarks: {t} ({o} official, {p} premium)")

    # Duplicate IDs
    dupes = 0
    async for _ in db.landmarks.aggregate([
        {"$group": {"_id": "$landmark_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]):
        dupes += 1
    print(f"Duplicate IDs: {dupes}")

    # Duplicate names
    dup_n = 0
    async for doc in db.landmarks.aggregate([
        {"$group": {"_id": {"c": "$country_id", "n": "$name"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]):
        dup_n += 1
        print(f"  Dup name: {doc['_id']}")
    print(f"Duplicate names: {dup_n}")

    # Activity names
    pats = ['cruise','balloon','safari','diving','surf','rafting','train',
            'whale watching','swimming','snorkeling','fish fry','festival',
            'dancers','hunters','camel','shark cage','land diving','ride',
            'express','tour','icebreaker','hot air','sea turtles',
            'red elephants','mud festival','light show','pepper farm',
            'shipwreck div','boat tour','fire dance','bird watch',
            'whale shark swim','walking tour','gaucho festival','white water']
    act = 0
    async for lm in db.landmarks.find({}, {"_id": 0, "name": 1, "landmark_id": 1}):
        nl = lm["name"].lower()
        if "sliding" in nl:
            continue
        for p in pats:
            if p in nl:
                act += 1
                print(f"  Activity: {lm['landmark_id']}: {lm['name']}")
                break
    print(f"Activity names: {act}")

    # Wrong counts
    bad = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}).sort("name", 1):
        oc = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "official"})
        pc = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if oc != 10 or pc != 5:
            bad += 1
            print(f"  {c['name']}: {oc}o + {pc}p")
    print(f"Wrong counts: {bad}")

    client.close()

if __name__ == "__main__":
    asyncio.run(fix())
