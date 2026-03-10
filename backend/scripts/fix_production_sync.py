"""Fix production database mismatches.
Fixes activity names, duplicate IDs, and duplicate names.
Works by NAME matching (not landmark_id) so it works regardless of ID scheme.

Run on Render: cd scripts && python3 fix_production_sync.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# ===== STEP 1: Fix activity-named landmarks by name =====
# Maps old_name -> {new_name, new_desc}
ACTIVITY_FIXES = {
    "Okavango Delta Safari": {
        "new_name": "Okavango Delta Wetlands",
        "new_desc": "World's largest inland delta, a UNESCO World Heritage maze of channels, islands, and floodplains.",
    },
    "Merzouga Camel Trek": {
        "new_name": "Draa Valley Oasis",
        "new_desc": "Morocco's longest river valley lined with ancient kasbahs, palm groves, and traditional Berber villages.",
    },
    "Tsavo Red Elephants": {
        "new_name": "Tsavo Mudanda Rock",
        "new_desc": "Massive 1.5km inselberg in Tsavo East, a natural dam collecting rainwater and a spectacular wildlife viewpoint.",
    },
    "Ushuaia End of World Train": {
        "new_name": "Beagle Channel",
        "new_desc": "Historic strait at the southern tip of South America named after Darwin's HMS Beagle, with glaciers and sea lions.",
    },
    "Cahuita Snorkeling Reef": {
        "new_name": "Cahuita Coral Reef",
        "new_desc": "Costa Rica's largest coral reef ecosystem with over 500 species of fish and 35 coral species.",
    },
    "Coiba Island Diving": {
        "new_name": "Coiba Island",
        "new_desc": "UNESCO World Heritage island with pristine Pacific coral reefs, untouched rainforest, and rare wildlife.",
    },
    "Bay of Pigs Diving": {
        "new_name": "Bay of Pigs",
        "new_desc": "Historic bay with crystal-clear cenotes, pristine coral formations, and Cold War history.",
    },
    "Blue Lagoon Swimming": {
        "new_name": "Blue Lagoon Portland",
        "new_desc": "Deep turquoise mineral spring lagoon where fresh mountain water meets the warm Caribbean Sea.",
    },
    "Boryeong Mud Festival": {
        "new_name": "Seoraksan Mountain",
        "new_desc": "Spectacular granite peaks, ancient temples, and vibrant autumn foliage in Korea's most scenic national park.",
    },
    "Navua River Rafting": {
        "new_name": "Namosi Highlands",
        "new_desc": "Remote mountainous interior of Viti Levu with dramatic river gorges, waterfalls, and untouched rainforest.",
    },
    "Nile Felucca Cruise Aswan": {
        "new_name": "Aswan Botanical Island",
        "new_desc": "Lush botanical garden on Kitchener's Island in the Nile, home to exotic plants from across Africa and Asia.",
    },
}

# ===== STEP 2: Fix duplicate names =====
# For each duplicate name, rename one of them to something unique
DUPE_NAME_FIXES = {
    # (country_id, old_name, category_to_rename) -> new_name, new_desc
    # We rename the PREMIUM version since official is the "base" data
    ("spain", "Camino de Santiago", "premium"): {
        "new_name": "Cies Islands",
        "new_desc": "Pristine Atlantic archipelago off Galicia with white sand beaches and crystal waters, part of a national park.",
    },
    ("samoa", "Piula Cave Pool", "premium"): {
        "new_name": "Falealupo Rainforest Canopy Walk",
        "new_desc": "Treetop walkway through pristine rainforest at the westernmost point of Samoa.",
    },
    ("japan", "Nara Deer Park", "premium"): {
        "new_name": "Shirakawa-go Village",
        "new_desc": "UNESCO mountain village with steep thatched-roof farmhouses set against the Japanese Alps.",
    },
    ("germany", "Rhine Valley", "premium"): {
        "new_name": "Bamberg Old Town",
        "new_desc": "UNESCO medieval town with 11th-century cathedral, half-timbered houses, and unique smoked beer tradition.",
    },
    ("cambodia", "Kampot Pepper Plantations", "premium"): {
        "new_name": "Koh Ker Pyramid Temple",
        "new_desc": "Remote 10th-century pyramid temple rising 36m from the jungle, a forgotten Khmer capital.",
    },
    ("china", "Jiuzhaigou Valley", "premium"): {
        "new_name": "Leshan Giant Buddha",
        "new_desc": "World's largest stone Buddha statue at 71m, carved into a cliff overlooking the confluence of three rivers.",
    },
    ("australia", "Daintree Rainforest", "premium"): {
        "new_name": "Pinnacles Desert",
        "new_desc": "Thousands of ancient limestone pillars rising from golden sand dunes in Nambung National Park.",
    },
    ("france", "Provence Lavender Fields", "premium"): {
        "new_name": "Loire Valley Châteaux",
        "new_desc": "Garden of France with over 300 Renaissance castles along the Loire River, a UNESCO World Heritage Site.",
    },
    ("mauritius", "Chamarel Seven Colored Earths", "premium"): {
        "new_name": "Pamplemousses Botanical Garden",
        "new_desc": "Historic 18th-century botanical garden with giant Amazon water lilies and 85 palm species.",
    },
    ("india", "Kerala Backwaters", "premium"): {
        "new_name": "Sundarbans Mangrove Forest",
        "new_desc": "World's largest mangrove forest spanning the Ganges Delta, home to the Royal Bengal tiger.",
    },
    ("uk", "Lake District", "premium"): {
        "new_name": "Cotswolds Villages",
        "new_desc": "Honey-colored stone villages nestled in rolling green hills, quintessential English countryside.",
    },
    ("switzerland", "Rhine Falls", "premium"): {
        "new_name": "Gorner Gorge",
        "new_desc": "Dramatic glacier-carved gorge near Zermatt with wooden walkways over thundering glacial meltwater.",
    },
    ("vanuatu", "Millennium Cave", "premium"): {
        "new_name": "Mount Yasur Ash Plains",
        "new_desc": "Otherworldly volcanic ash plains surrounding one of the world's most accessible active volcanoes.",
    },
    ("uk", "Giant's Causeway", "premium"): {
        "new_name": "Hadrian's Wall",
        "new_desc": "Ancient Roman frontier wall stretching 117km across northern England, a UNESCO World Heritage Site.",
    },
}


async def fix():
    print("=" * 60)
    print("STEP 1: Fix activity-named landmarks")
    print("=" * 60)
    fixed_activities = 0
    for old_name, fix_data in ACTIVITY_FIXES.items():
        # Check if this name still exists AND the new name doesn't already exist in same country
        lm = await db.landmarks.find_one({"name": old_name}, {"_id": 1, "country_id": 1})
        if not lm:
            print(f"  SKIP (not found): {old_name}")
            continue

        # Check new name doesn't already exist in same country
        existing = await db.landmarks.find_one(
            {"country_id": lm["country_id"], "name": fix_data["new_name"]}
        )
        if existing:
            print(f"  SKIP (new name exists): {old_name} -> {fix_data['new_name']}")
            continue

        result = await db.landmarks.update_one(
            {"_id": lm["_id"]},
            {"$set": {"name": fix_data["new_name"], "description": fix_data["new_desc"]}},
        )
        if result.modified_count:
            fixed_activities += 1
            print(f"  OK: {old_name} -> {fix_data['new_name']}")
    print(f"Fixed {fixed_activities} activity names\n")

    print("=" * 60)
    print("STEP 2: Fix duplicate names within same country")
    print("=" * 60)
    fixed_names = 0
    for (country_id, old_name, cat), fix_data in DUPE_NAME_FIXES.items():
        # Find the specific duplicate (by country + name + category)
        lm = await db.landmarks.find_one(
            {"country_id": country_id, "name": old_name, "category": cat},
            {"_id": 1},
        )
        if not lm:
            # Try without category filter (might have different category)
            lm = await db.landmarks.find_one(
                {"country_id": country_id, "name": old_name},
                {"_id": 1},
            )
            if not lm:
                print(f"  SKIP (not found): {country_id}/{old_name}")
                continue

        # Check new name doesn't exist
        existing = await db.landmarks.find_one(
            {"country_id": country_id, "name": fix_data["new_name"]}
        )
        if existing:
            print(f"  SKIP (new name exists): {country_id}/{old_name} -> {fix_data['new_name']}")
            continue

        result = await db.landmarks.update_one(
            {"_id": lm["_id"]},
            {"$set": {"name": fix_data["new_name"], "description": fix_data["new_desc"]}},
        )
        if result.modified_count:
            fixed_names += 1
            print(f"  OK: {country_id}/{old_name} -> {fix_data['new_name']}")
    print(f"Fixed {fixed_names} duplicate names\n")

    print("=" * 60)
    print("STEP 3: Remove duplicate landmark_ids")
    print("=" * 60)
    pipeline = [
        {"$group": {"_id": "$landmark_id", "count": {"$sum": 1}, "ids": {"$push": "$_id"}, "names": {"$push": "$name"}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    removed = 0
    async for doc in db.landmarks.aggregate(pipeline):
        # Keep the first, delete the rest
        for extra_id in doc["ids"][1:]:
            await db.landmarks.delete_one({"_id": extra_id})
            removed += 1
            print(f"  DEL: {doc['_id']} (kept: {doc['names'][0]}, removed: {doc['names'][1:]})")
    print(f"Removed {removed} duplicate ID entries\n")

    print("=" * 60)
    print("STEP 4: Fill any gaps (countries with < 5 premiums)")
    print("=" * 60)
    filled = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1, "continent": 1}).sort("name", 1):
        prem = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if prem >= 5:
            continue
        needed = 5 - prem
        print(f"  {c['name']}: needs {needed} more premium")
        # We can't auto-fill without knowing what's missing - just report
        filled += needed

    if filled > 0:
        print(f"\n  {filled} premium landmarks need to be added manually.")
        print("  Run: python3 fill_premium_gaps.py")
    else:
        print("  All countries have 5 premiums!")

    print("\n" + "=" * 60)
    print("FINAL VERIFICATION")
    print("=" * 60)
    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"Landmarks: {t} ({o} official, {p} premium)")

    # Check remaining issues
    pipeline2 = [
        {"$group": {"_id": "$landmark_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dup_ids = 0
    async for _ in db.landmarks.aggregate(pipeline2):
        dup_ids += 1
    print(f"Duplicate IDs: {dup_ids}")

    pipeline3 = [
        {"$group": {"_id": {"country_id": "$country_id", "name": "$name"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dup_n = 0
    async for doc in db.landmarks.aggregate(pipeline3):
        dup_n += 1
        print(f"  Still dup name: {doc['_id']}")
    print(f"Duplicate names: {dup_n}")

    activity_patterns = [
        "cruise", "balloon", "safari", "diving", "surf", "rafting",
        "train", "whale watching", "swimming", "snorkeling", "fish fry",
        "festival", "dancers", "hunters", "camel", "shark cage",
        "land diving", "ride", "express", "tour", "icebreaker",
        "hot air", "sea turtles", "red elephants", "mud festival",
        "light show", "pepper farm", "shipwreck div", "boat tour",
        "fire dance", "bird watch", "whale shark swim", "walking tour",
        "gaucho festival", "white water",
    ]
    act = 0
    async for lm in db.landmarks.find({}, {"_id": 0, "name": 1, "landmark_id": 1}):
        for pat in activity_patterns:
            if pat in lm["name"].lower():
                if "sliding" in lm["name"].lower():
                    continue
                act += 1
                print(f"  Still activity: {lm['landmark_id']}: {lm['name']}")
                break
    print(f"Activity names: {act}")

    client.close()


if __name__ == "__main__":
    asyncio.run(fix())
