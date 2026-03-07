#!/usr/bin/env python3
"""Fix missing country images and remove duplicate landmarks."""
import asyncio, os
from datetime import datetime, timezone
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Country flag/hero images - Unsplash URLs for all 54 missing countries
COUNTRY_IMAGES = {
    "finland": "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=800&q=80",
    "maldives": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80",
    "panama": "https://images.unsplash.com/photo-1564594985645-4427056e22e2?w=800&q=80",
    "austria": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80",
    "bahamas": "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&q=80",
    "barbados": "https://images.unsplash.com/photo-1567170175090-2a710e78ee51?w=800&q=80",
    "cambodia": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80",
    "croatia": "https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80",
    "cuba": "https://images.unsplash.com/photo-1570299437522-25057f635c19?w=800&q=80",
    "denmark": "https://images.unsplash.com/photo-1552560880-2482680b24b4?w=800&q=80",
    "dominican_republic": "https://images.unsplash.com/photo-1580237072617-771c3ecc4a24?w=800&q=80",
    "iceland": "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80",
    "jamaica": "https://images.unsplash.com/photo-1562932831-afcfe735720b?w=800&q=80",
    "nepal": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80",
    "philippines": "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&q=80",
    "sri_lanka": "https://images.unsplash.com/photo-1578128178289-ed1f63e84c75?w=800&q=80",
    "sweden": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&q=80",
    "taiwan": "https://images.unsplash.com/photo-1508962914676-e053062cf57b?w=800&q=80",
    "turkey": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
    "ireland": "https://images.unsplash.com/photo-1564959130747-897fb406b9af?w=800&q=80",
    "hungary": "https://images.unsplash.com/photo-1551867633-194f125bddfa?w=800&q=80",
    "czech_republic": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80",
    "laos": "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&q=80",
    "mongolia": "https://images.unsplash.com/photo-1567599672391-17b31d92e431?w=800&q=80",
    "bhutan": "https://images.unsplash.com/photo-1553856622-d1b352e24a76?w=800&q=80",
    "georgia": "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80",
    "uzbekistan": "https://images.unsplash.com/photo-1596394516094-501ba68a0ba7?w=800&q=80",
    "kyrgyzstan": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "ghana": "https://images.unsplash.com/photo-1580746738099-27fd0f049f1a?w=800&q=80",
    "rwanda": "https://images.unsplash.com/photo-1516426122078-c23e76319802?w=800&q=80",
    "uganda": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    "ethiopia": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80",
    "senegal": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
    "zimbabwe": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80",
    "zambia": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80",
    "mozambique": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "ivory_coast": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    "malawi": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
    "lesotho": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "eswatini": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    "uruguay": "https://images.unsplash.com/photo-1583483425797-14e6749a0d62?w=800&q=80",
    "bolivia": "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800&q=80",
    "belize": "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=800&q=80",
    "saint_lucia": "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800&q=80",
    "hawaii": "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=800&q=80",
    "madagascar": "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800&q=80",
    "cape_verde": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "papua_new_guinea": "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    "palau": "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=800&q=80",
    "solomon_islands": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "new_caledonia": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "guam": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "comoros": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "reunion": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
}

# Replacement premium landmarks for exact duplicates we'll remove
REPLACEMENT_PREMIUMS = {
    "australia": {"name": "Horizontal Falls Kimberley", "description": "Tidal waterfalls through narrow gorges in remote Western Australia."},
    "china": {"name": "Rainbow Mountains Zhangye", "description": "Surreal striped sandstone mountains in Gansu province."},
    "germany": {"name": "Bastei Bridge", "description": "Dramatic sandstone bridge 194m above the Elbe River."},
    "india": {"name": "Rann of Kutch Salt Desert", "description": "Vast white salt desert that transforms during monsoon."},
    "japan": {"name": "Yakushima Ancient Cedars", "description": "Island with 1,000-year-old cedar trees inspiring Princess Mononoke."},
    "spain": {"name": "Ronda Gorge Bridge", "description": "Bridge spanning a 120m gorge connecting old and new Ronda."},
    "uk": [
        {"name": "Jurassic Coast Fossils", "description": "185-million-year-old UNESCO coastline with fossil hunting."},
        {"name": "Cotswolds Villages", "description": "Honey-colored stone villages in rolling English countryside."},
    ],
}


async def fix_all():
    print("=" * 60)
    print("Fix: Country Images + Duplicate Landmarks")
    print("=" * 60)

    # STEP 1: Add missing country images
    print("\n--- Step 1: Adding country images ---")
    img_updated = 0
    for cid, url in COUNTRY_IMAGES.items():
        r = await db.countries.update_one(
            {"country_id": cid, "$or": [{"image_url": None}, {"image_url": ""}, {"image_url": {"$exists": False}}]},
            {"$set": {"image_url": url}}
        )
        if r.modified_count > 0:
            img_updated += 1
    print(f"  Updated {img_updated} country images")

    # STEP 2: Remove exact duplicate landmarks (keep official, remove premium dupe)
    print("\n--- Step 2: Removing exact duplicate landmarks ---")
    pipeline = [
        {"$group": {
            "_id": {"country_id": "$country_id", "name_lower": {"$toLower": "$name"}},
            "count": {"$sum": 1},
            "docs": {"$push": {"lid": "$landmark_id", "cat": "$category", "oid": "$_id"}}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dupes = await db.landmarks.aggregate(pipeline).to_list(100)
    removed = 0
    for d in dupes:
        docs = d["docs"]
        # Keep the official one, remove premium duplicate
        officials = [doc for doc in docs if doc["cat"] == "official"]
        premiums = [doc for doc in docs if doc["cat"] == "premium"]
        
        if officials and premiums:
            for p in premiums:
                await db.landmarks.delete_one({"_id": p["oid"]})
                removed += 1
                print(f"  Removed premium dupe: {d['_id']['country_id']}/{d['_id']['name_lower']}")
        elif len(premiums) > 1:
            # Multiple premium dupes - keep first, remove rest
            for p in premiums[1:]:
                await db.landmarks.delete_one({"_id": p["oid"]})
                removed += 1
                print(f"  Removed extra premium: {d['_id']['country_id']}/{d['_id']['name_lower']}")
    print(f"  Removed {removed} exact duplicates")

    # STEP 3: Remove worst near-duplicates (premium that's just official + extra word)
    print("\n--- Step 3: Removing near-duplicate premiums ---")
    near_removed = 0
    countries = await db.countries.find({}, {"_id": 0, "country_id": 1}).to_list(200)
    for c in countries:
        cid = c["country_id"]
        officials = []
        premiums = []
        async for lm in db.landmarks.find({"country_id": cid}, {"_id": 1, "name": 1, "category": 1}):
            if lm["category"] == "official":
                officials.append(lm)
            else:
                premiums.append(lm)
        
        off_names = [o["name"].lower().strip() for o in officials]
        
        for p in premiums:
            pname = p["name"].lower().strip()
            for oname in off_names:
                # Check if the premium is just the official name + minor suffix
                if len(oname) > 5 and oname in pname and pname != oname:
                    # This is a near-duplicate - remove the premium
                    await db.landmarks.delete_one({"_id": p["_id"]})
                    near_removed += 1
                    print(f"  Removed: {cid}: '{p['name']}' (near-dupe of official)")
                    break
    print(f"  Removed {near_removed} near-duplicates")

    # Also check premium-vs-premium near-dupes
    print("\n--- Step 3b: Removing premium-vs-premium near-dupes ---")
    pp_removed = 0
    for c in countries:
        cid = c["country_id"]
        premiums = []
        async for lm in db.landmarks.find({"country_id": cid, "category": "premium"}, {"_id": 1, "name": 1}):
            premiums.append(lm)
        
        seen = set()
        for p in premiums:
            pname = p["name"].lower().strip()
            is_dup = False
            for s in seen:
                if len(s) > 5 and (s in pname or pname in s):
                    await db.landmarks.delete_one({"_id": p["_id"]})
                    pp_removed += 1
                    print(f"  Removed: {cid}: '{p['name']}' (premium near-dupe)")
                    is_dup = True
                    break
            if not is_dup:
                seen.add(pname)
    print(f"  Removed {pp_removed} premium-vs-premium near-duplicates")

    # STEP 4: Add replacement premiums for countries now below 5
    print("\n--- Step 4: Adding replacement premiums ---")
    replacements_added = 0
    for cid, repls in REPLACEMENT_PREMIUMS.items():
        country = await db.countries.find_one({"country_id": cid})
        if not country: continue
        
        prem_count = await db.landmarks.count_documents({"country_id": cid, "category": "premium"})
        needed = 5 - prem_count
        if needed <= 0: continue
        
        existing_names = set()
        async for lm in db.landmarks.find({"country_id": cid}, {"name": 1, "_id": 0}):
            existing_names.add(lm["name"].lower().strip())
        
        if isinstance(repls, dict):
            repls = [repls]
        
        added = 0
        for r in repls:
            if added >= needed: break
            if r["name"].lower().strip() in existing_names: continue
            idx = prem_count + added + 1
            await db.landmarks.insert_one({
                "landmark_id": f"{cid}_premium_{idx}",
                "name": r["name"], "country_id": cid,
                "country_name": country["name"], "continent": country["continent"],
                "description": r["description"], "category": "premium",
                "image_url": "", "images": [],
                "facts": [{"text": "Worth 25 points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round", "duration": "Half day",
                "difficulty": "Moderate", "latitude": None, "longitude": None,
                "points": 25, "upvotes": 0, "created_by": None,
                "created_at": datetime.now(timezone.utc)
            })
            added += 1
            replacements_added += 1
    print(f"  Added {replacements_added} replacement premiums")

    # STEP 5: Final verification
    print("\n--- Step 5: Final verification ---")
    total = await db.landmarks.count_documents({})
    off = await db.landmarks.count_documents({"category": "official"})
    prem = await db.landmarks.count_documents({"category": "premium"})
    countries_total = await db.countries.count_documents({})
    
    missing_img = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "image_url": 1}):
        if not c.get("image_url"):
            missing_img += 1
    
    # Check remaining duplicates
    dupes_remaining = 0
    dup_pipeline = [
        {"$group": {"_id": {"country_id": "$country_id", "name_lower": {"$toLower": "$name"}}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dupes_remaining = len(await db.landmarks.aggregate(dup_pipeline).to_list(100))
    
    # Countries with <5 premium
    short_premium = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}):
        p = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if p < 5:
            short_premium += 1
            print(f"  SHORT: {c['name']} ({p}/5 premium)")
    
    print(f"\n  Countries: {countries_total}")
    print(f"  Landmarks: {total} (official: {off}, premium: {prem})")
    print(f"  Missing country images: {missing_img}")
    print(f"  Remaining exact duplicates: {dupes_remaining}")
    print(f"  Countries <5 premium: {short_premium}")
    
    print("\n" + "=" * 60)
    client.close()


if __name__ == "__main__":
    asyncio.run(fix_all())
