"""Fix true near-duplicate landmarks on production.
Only targets cases where two landmarks are the SAME PLACE with slightly different names.
Skips false positives (different national parks, different old towns, etc.)

Run on Render: cd scripts && python3 fix_prod_near_dupes.py && python3 db_compare.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# (country_id, name_to_rename, new_name, new_description)
# Strategy: rename the duplicate to a completely different, unique landmark
FIXES = [
    # EXACT same place, different wording
    ("greece", "Zakynthos Shipwreck Beach", "Vikos Gorge", "One of the world's deepest gorges in Epirus with dramatic stone bridges and monasteries."),
    ("finland", "Northern Lights Lapland", "Koli National Park", "Iconic viewpoint over endless Finnish lakeland, inspiration for Sibelius and Finnish art."),
    ("finland", "Lake Saimaa Seal", "Rauma Old Town", "UNESCO wooden town with 600 colorful houses, the best-preserved in the Nordics."),
    ("argentina", "Mendoza Wine Country", "Los Glaciares National Park", "UNESCO park with Perito Moreno glacier and dramatic Patagonian peaks."),
    ("samoa", "Lalomanu White Beach", "Sua Ocean Trench", "Giant natural swimming hole connected to the ocean through an underground lava tube."),
    ("samoa", "Falealupo Rainforest Canopy Walk", "Papapapaitai Falls", "Samoa's highest waterfall plunging 100m into a lush volcanic valley."),
    ("south_korea", "Boseong Green Tea Fields", "Damyang Bamboo Forest", "Lush bamboo grove and garden complex, one of Korea's most serene natural landscapes."),
    ("tunisia", "Sidi Bou Said Village", "Djerba Island", "Mediterranean island with white-washed villages, ancient synagogue, and colorful street art."),
    ("tunisia", "Dougga Roman Ruins", "Ichkeul National Park", "UNESCO wetland with lake and mountain, vital stopover for migrating birds."),
    ("seychelles", "Anse Source dArgent", "Curieuse Island Tortoises", "Island sanctuary with giant Aldabra tortoises roaming freely among mangroves."),
    ("seychelles", "Vallee de Mai", "Morne Seychellois Peak", "Highest point in Seychelles with misty cloud forest and panoramic views."),
    ("bahamas", "Deans Blue Hole", "Cat Island Hermitage", "Hilltop monastery at the highest point in the Bahamas with panoramic ocean views."),
    ("bahamas", "Eleuthera Glass Window", "Exuma Thunderball Grotto", "Underwater cave made famous by James Bond, with snorkeling among tropical fish."),
    ("barbados", "Huntes Gardens", "Crane Beach", "Stunning pink-tinged beach backed by coral stone cliffs, one of the Caribbean's most beautiful."),
    ("uk", "Hadrians Wall Path", "Snowdonia Mountains", "Dramatic Welsh mountain range with Snowdon peak and ancient slate quarries."),
    ("tanzania", "Mount Kilimanjaro Summit", "Kondoa Rock Art", "UNESCO collection of ancient rock paintings spanning thousands of years in central Tanzania."),
    ("tanzania", "Stone Town Zanzibar", "Mahale Mountains", "Remote chimp trekking paradise on the shores of Lake Tanganyika."),
    ("botswana", "Okavango Delta Wetlands", "Gcwihaba Caves", "Remote limestone caverns known as Hills of the Hyenas, with stunning formations."),
    ("botswana", "Kubu Island Baobabs", "Tuli Block Mashatu", "Land of the Giants with massive elephants, baobabs, and ancient rock art."),
    ("ecuador", "Cotopaxi Volcano Hike", "Quilotoa Crater Lake", "Stunning turquoise volcanic crater lake in the Andean highlands."),
    ("fiji", "Navua River Gorge", "Colo-i-Suva Forest Park", "Lush rainforest park near Suva with natural rock pools and waterfalls."),
    ("germany", "Romantic Road Route", "Elbe Sandstone Mountains", "Dramatic sandstone pillars and arches in Saxon Switzerland near Dresden."),
    ("japan", "Yakushima Ancient Cedars", "Kenrokuen Garden", "One of Japan's three great gardens with streams, bridges, and seasonal beauty."),
    ("kenya", "Lake Nakuru Flamingos", "Ol Pejeta Conservancy", "Home to the last two northern white rhinos on Earth and a chimpanzee sanctuary."),
    ("malaysia", "Cameron Highlands Tea", "Sipadan Island", "World-class diving island with sheer walls dropping 600m into the deep."),
    ("mauritius", "Seven Colored Earths", "Trou aux Cerfs Crater", "Dormant volcanic crater in Curepipe with panoramic views and lush vegetation."),
    ("mauritius", "Underwater Waterfall Illusion", "Rodrigues Island", "Remote sister island with pristine lagoon and endemic wildlife."),
    ("mozambique", "Maputo Elephant Reserve", "Quirimbas Marine Sanctuary", "Remote northern marine protected area with pristine coral reefs and mangroves."),
    ("new_zealand", "Milford Sound Fiord", "Punakaiki Pancake Rocks", "Layered limestone formations resembling stacked pancakes with powerful blowholes."),
    ("philippines", "Coron Island Lagoons", "Chocolate Hills Bohol", "Over 1,200 symmetrical grass-covered limestone hills that turn brown in dry season."),
    ("thailand", "Doi Inthanon Summit", "Erawan Waterfall", "Stunning seven-tiered waterfall with emerald pools in Kanchanaburi province."),
    ("vanuatu", "Yasur Volcano Night", "Roi Mata Domain", "UNESCO World Heritage site of the legendary paramount chief's burial and residence."),
    ("zambia", "Bangweulu Wetlands", "Lilayi Elephant Nursery", "Rescue sanctuary caring for orphaned baby elephants before releasing them into the wild."),
]


async def fix():
    fixed = 0
    skipped_not_found = 0
    skipped_exists = 0

    for country_id, old_name, new_name, new_desc in FIXES:
        lm = await db.landmarks.find_one(
            {"country_id": country_id, "name": old_name}, {"_id": 1}
        )
        if not lm:
            print(f"  SKIP (not found): {country_id}/{old_name}")
            skipped_not_found += 1
            continue

        exists = await db.landmarks.find_one(
            {"country_id": country_id, "name": new_name}
        )
        if exists:
            print(f"  SKIP (exists): {country_id}/{new_name}")
            skipped_exists += 1
            continue

        await db.landmarks.update_one(
            {"_id": lm["_id"]},
            {"$set": {"name": new_name, "description": new_desc}},
        )
        fixed += 1
        print(f"  OK: {country_id}/{old_name} -> {new_name}")

    print(f"\nFixed: {fixed}, Not found: {skipped_not_found}, Already exists: {skipped_exists}")

    # Verify: exact duplicate names
    pipeline = [
        {"$group": {"_id": {"c": "$country_id", "n": "$name"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    exact = 0
    async for doc in db.landmarks.aggregate(pipeline):
        exact += 1
        print(f"  EXACT DUP: {doc['_id']}")
    print(f"Exact duplicate names: {exact}")

    # Verify: true near-dupes (same base name)
    print("\n=== Remaining TRUE near-duplicates ===")
    true_dupes = 0
    async for c in db.countries.find({}, {"_id": 0, "country_id": 1}).sort("country_id", 1):
        cid = c["country_id"]
        names = []
        async for lm in db.landmarks.find({"country_id": cid}, {"_id": 0, "name": 1}):
            names.append(lm["name"])
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                n1 = names[i].lower().replace("'", "").replace("-", " ").replace("  ", " ").strip()
                n2 = names[j].lower().replace("'", "").replace("-", " ").replace("  ", " ").strip()
                # Skip generic patterns (different parks, towns, etc.)
                w1, w2 = set(n1.split()), set(n2.split())
                generic = {"national", "park", "old", "town", "island", "beach", "mountain", "mountains",
                           "lake", "falls", "cave", "caves", "rock", "rocks", "reserve", "wildlife",
                           "forest", "river", "bay", "gorge", "volcano", "cathedral", "palace",
                           "temple", "monastery", "ruins", "square", "market", "museum", "fort",
                           "fortress", "bridge", "gardens", "garden", "village", "city", "historic",
                           "center", "centre", "de", "del", "la", "le", "el", "the", "of", "and",
                           "du", "des", "national", "state", "provincial"}
                content1 = w1 - generic
                content2 = w2 - generic
                overlap = content1 & content2
                # Only flag if 2+ content words overlap
                if len(overlap) >= 2:
                    true_dupes += 1
                    print(f"  {cid}: \"{names[i]}\" vs \"{names[j]}\"")
    print(f"True near-duplicates: {true_dupes}")

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({"category": "official"})
    p = await db.landmarks.count_documents({"category": "premium"})
    print(f"\nTotal: {t} ({o} official, {p} premium)")
    client.close()


if __name__ == "__main__":
    asyncio.run(fix())
