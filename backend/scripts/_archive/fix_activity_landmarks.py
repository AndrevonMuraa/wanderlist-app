"""Fix activity-based landmarks in the database.
Replaces tourist activities with proper nature/physical landmarks.

Run locally:  cd backend/scripts && python3 fix_activity_landmarks.py
Run on Render: cd backend/scripts && python3 fix_activity_landmarks.py

Total fixes: 49 landmarks (8 official + 41 premium)
Skip: Papaseea Sliding Rocks (user approved to keep)
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

# Each entry: landmark_id -> {new_name, new_description}
# Organized by continent for clarity.
FIXES = {
    # =================== AFRICA ===================
    "egypt_nile_river_cruise": {
        "new_name": "Nile River Valley",
        "new_desc": "The life-giving river flowing through Egypt, lined with ancient temples and fertile landscapes.",
    },
    "egypt_premium_3": {
        "new_name": "Colossi of Memnon",
        "new_desc": "Two massive stone statues of Pharaoh Amenhotep III guarding the entrance to his mortuary temple in Luxor.",
    },
    "egypt_premium_5": {
        "new_name": "Aswan Botanical Island",
        "new_desc": "Lush botanical garden on Kitchener's Island in the Nile, home to exotic plants from across Africa and Asia.",
    },
    "ivory_coast_landmark_7": {
        "new_name": "Dent de Man Peaks",
        "new_desc": "Dramatic tooth-shaped mountain peaks near Man, iconic rock formations rising from the western rainforest.",
    },
    "kenya_premium_5": {
        "new_name": "Tsavo Mudanda Rock",
        "new_desc": "Massive 1.5km inselberg in Tsavo East, a natural dam collecting rainwater and a spectacular wildlife viewpoint.",
    },
    "morocco_premium_5": {
        "new_name": "Draa Valley Oasis",
        "new_desc": "Morocco's longest river valley lined with ancient kasbahs, palm groves, and traditional Berber villages.",
    },
    "namibia_premium_5": {
        "new_name": "Etosha Salt Pan",
        "new_desc": "Vast 4,760 km² salt pan visible from space, surrounded by waterholes attracting diverse wildlife.",
    },
    "rwanda_premium_2": {
        "new_name": "Akagera Wetlands",
        "new_desc": "Vast papyrus swamps and interconnected lakes along the Akagera River, teeming with birdlife and hippos.",
    },
    "rwanda_premium_3": {
        "new_name": "Nyamirambo Cultural Quarter",
        "new_desc": "Kigali's most vibrant multicultural neighborhood with mosques, colorful markets, and lively street culture.",
    },
    "south_africa_premium_5": {
        "new_name": "Cederberg Mountains",
        "new_desc": "UNESCO wilderness area with dramatic sandstone formations, ancient San rock art, and the iconic Maltese Cross.",
    },
    "tanzania_premium_1": {
        "new_name": "Lake Natron",
        "new_desc": "Eerie alkaline lake that turns animals to stone, breeding ground for millions of lesser flamingos.",
    },
    "tanzania_premium_2": {
        "new_name": "Ruaha River Gorge",
        "new_desc": "Tanzania's largest national park centered on a dramatic river gorge flanked by ancient baobab trees.",
    },
    "tanzania_premium_4": {
        "new_name": "Nyerere National Park",
        "new_desc": "Africa's largest protected area with pristine wilderness, vast lakes, and the mighty Rufiji River.",
    },
    "tanzania_premium_5": {
        "new_name": "Ol Doinyo Lengai Volcano",
        "new_desc": "The only active volcano producing natrocarbonatite lava, sacred Mountain of God to the Maasai people.",
    },
    "uganda_premium_1": {
        "new_name": "Ssezibwa Falls",
        "new_desc": "Sacred waterfall where the Ssezibwa River cascades over ancient rocks, an important spiritual and cultural site.",
    },
    "zambia_premium_1": {
        "new_name": "Lilayi Elephant Nursery",
        "new_desc": "Rescue sanctuary caring for orphaned baby elephants before releasing them back into the wild.",
    },
    "zimbabwe_premium_1": {
        "new_name": "Zambezi River Gorge",
        "new_desc": "Series of dramatic zigzag gorges below Victoria Falls carved over millennia by the mighty Zambezi River.",
    },

    # =================== AMERICAS ===================
    "bahamas_swimming_pigs": {
        "new_name": "Exuma Cays Land and Sea Park",
        "new_desc": "World's first land-and-sea park with pristine blue holes, coral reefs, and protected marine ecosystems.",
    },
    "barbados_premium_5": {
        "new_name": "Welchman Hall Gully",
        "new_desc": "Tropical ravine with ancient coral rock formations, giant ferns, and Barbados green monkeys.",
    },
    "costa_rica_premium_5": {
        "new_name": "Cahuita Coral Reef",
        "new_desc": "Costa Rica's largest coral reef ecosystem with over 500 species of fish and 35 coral species.",
    },
    "ecuador_nariz_del_diablo_train": {
        "new_name": "Chimborazo Volcano",
        "new_desc": "Ecuador's highest peak at 6,263m, the point on Earth's surface farthest from the planet's center.",
    },
    "jamaica_premium_5": {
        "new_name": "Blue Lagoon Portland",
        "new_desc": "Deep turquoise mineral spring lagoon where fresh mountain water meets the warm Caribbean Sea.",
    },
    "mexico_premium_5": {
        "new_name": "Holbox Island",
        "new_desc": "Car-free island paradise with bioluminescent waters, flamingo colonies, and pristine Caribbean beaches.",
    },
    "panama_premium_4": {
        "new_name": "Coiba Island",
        "new_desc": "UNESCO World Heritage island with pristine Pacific coral reefs, untouched rainforest, and rare wildlife.",
    },
    "uruguay_premium_5": {
        "new_name": "Santa Teresa National Park",
        "new_desc": "Coastal fortress park with pristine beaches, native palm forests, and an 18th-century Portuguese fort.",
    },

    # =================== ASIA ===================
    "cambodia_premium_5": {
        "new_name": "Koh Ker Pyramid Temple",
        "new_desc": "Remote 10th-century pyramid temple rising 36m from the jungle, a forgotten Khmer capital.",
    },
    "laos_premium_4": {
        "new_name": "Mekong River Vientiane",
        "new_desc": "The mighty Mekong flowing past the Lao capital, with scenic promenades, temple-lined banks, and sunset views.",
    },
    "mongolia_landmark_10": {
        "new_name": "Altai Tavan Bogd Mountains",
        "new_desc": "Five sacred peaks on the border of Mongolia, Russia, and China with glaciers and ancient Turkic petroglyphs.",
    },
    "nepal_premium_3": {
        "new_name": "Upper Mustang",
        "new_desc": "Former forbidden kingdom with Tibetan Buddhist culture, ancient cave monasteries, and barren lunar landscapes.",
    },
    "philippines_premium_3": {
        "new_name": "Apo Island Marine Sanctuary",
        "new_desc": "Protected marine sanctuary with pristine coral gardens, one of the Philippines' finest reef ecosystems.",
    },
    "philippines_premium_5": {
        "new_name": "Coron Island Lagoons",
        "new_desc": "Hidden crystal-clear lagoons surrounded by dramatic limestone cliffs on this remote Palawan island.",
    },
    "singapore_supertree_grove_light_show": {
        "new_name": "Supertree Grove",
        "new_desc": "Futuristic vertical gardens up to 50m tall at Gardens by the Bay, an iconic engineering marvel.",
    },
    "south_korea_premium_4": {
        "new_name": "Seoraksan Mountain",
        "new_desc": "Spectacular granite peaks, ancient temples, and vibrant autumn foliage in Korea's most scenic national park.",
    },
    "sri_lanka_official_9": {
        "new_name": "Mirissa Bay",
        "new_desc": "Crescent-shaped bay on Sri Lanka's south coast with golden beaches and a dramatic coconut palm headland.",
    },
    "sri_lanka_premium_4": {
        "new_name": "Arugam Bay",
        "new_desc": "Beautiful crescent bay on Sri Lanka's east coast, surrounded by lagoons, mangroves, and wildlife reserves.",
    },
    "sri_lanka_premium_5": {
        "new_name": "Minneriya National Park",
        "new_desc": "Ancient reservoir and surrounding parkland, one of Sri Lanka's most important wildlife habitats.",
    },
    "taiwan_premium_5": {
        "new_name": "Wuling Alpine Meadows",
        "new_desc": "High-altitude meadows in the Central Mountain Range surrounded by Taiwan's tallest peaks and pristine forests.",
    },

    # =================== EUROPE ===================
    "finland_icebreaker_sampo": {
        "new_name": "Lemmenjoki National Park",
        "new_desc": "Finland's largest national park with pristine wilderness, gold-panning rivers, and ancient Sami culture.",
    },
    "portugal_premium_3": {
        "new_name": "Sete Cidades Crater Lakes",
        "new_desc": "Stunning twin crater lakes of blue and green on São Miguel island in the volcanic Azores archipelago.",
    },
    "switzerland_glacier_express": {
        "new_name": "Gorner Gorge",
        "new_desc": "Dramatic glacier-carved gorge near Zermatt with wooden walkways over thundering glacial meltwater.",
    },

    # =================== OCEANIA ===================
    "cook_islands_cross_island_trek": {
        "new_name": "Cross Island Nature Trail",
        "new_desc": "Scenic trail through Rarotonga's volcanic interior with lush rainforest, mountain streams, and panoramic views.",
    },
    "fiji_premium_4": {
        "new_name": "Namosi Highlands",
        "new_desc": "Remote mountainous interior of Viti Levu with dramatic river gorges, waterfalls, and untouched rainforest.",
    },
    "hawaii_premium_2": {
        "new_name": "Napali Coast Sea Cliffs",
        "new_desc": "Towering 1,200m fluted sea cliffs along Kauai's remote northwest shore, one of Earth's most dramatic coastlines.",
    },
    "maldives_premium_4": {
        "new_name": "Addu Atoll",
        "new_desc": "Southernmost atoll straddling the equator with unique heart-shaped natural lagoon and WWII heritage sites.",
    },
    "papua_new_guinea_landmark_6": {
        "new_name": "Goroka Highland Valley",
        "new_desc": "Lush highland valley at 1,600m surrounded by rugged mountains, with traditional gardens and misty peaks.",
    },
    "papua_new_guinea_premium_1": {
        "new_name": "Baining Mountains",
        "new_desc": "Remote volcanic mountain range on New Britain island with pristine cloud forest and unique endemic wildlife.",
    },
    "papua_new_guinea_premium_3": {
        "new_name": "Tari Basin Highlands",
        "new_desc": "Fertile highland basin at 1,800m surrounded by moss forests, home to rare birds of paradise.",
    },
    "solomon_islands_landmark_9": {
        "new_name": "Uepi Island",
        "new_desc": "Tiny coral island in the vast Marovo Lagoon with pristine reefs and lush tropical vegetation.",
    },
    "vanuatu_pentecost_land_diving": {
        "new_name": "Mount Yasur Ash Plains",
        "new_desc": "Otherworldly volcanic ash plains surrounding one of the world's most accessible active volcanoes.",
    },
}


async def migrate():
    total = 0
    not_found = []

    for landmark_id, fix in FIXES.items():
        result = await db.landmarks.update_one(
            {"landmark_id": landmark_id},
            {"$set": {
                "name": fix["new_name"],
                "description": fix["new_desc"],
            }}
        )
        if result.modified_count == 1:
            total += 1
            print(f"  OK: {landmark_id} -> {fix['new_name']}")
        elif result.matched_count == 0:
            not_found.append(landmark_id)
            print(f"  NOT FOUND: {landmark_id}")
        else:
            print(f"  SKIP (already updated): {landmark_id}")

    print(f"\nUpdated: {total}")
    if not_found:
        print(f"Not found: {len(not_found)}")
        for nf in not_found:
            print(f"  - {nf}")

    # Verification
    print("\n=== VERIFICATION ===")
    activity_patterns = [
        'cruise', 'balloon', 'safari', 'diving', 'surf', 'rafting', 'trek',
        'train', 'whale watching', 'swimming', 'snorkeling', 'fish fry',
        'festival', 'show', 'dancers', 'hunters', 'camel', 'shark cage',
        'land diving', 'ride', 'express', 'tour', 'icebreaker',
        'hot air', 'sea turtles', 'red elephants', 'mud festival',
        'light show', 'pepper farm', 'shipwreck div', 'boat tour',
        'fire dance', 'bird watch', 'whale shark swim', 'walking tour',
        'shoebill', 'gaucho festival', 'white water'
    ]
    remaining = 0
    async for lm in db.landmarks.find({}, {'_id': 0, 'name': 1, 'landmark_id': 1}):
        name_lower = lm['name'].lower()
        for pat in activity_patterns:
            if pat in name_lower:
                # Skip known exceptions (user approved)
                if lm['landmark_id'] in ('samoa_papaseea_sliding_rocks',):
                    continue
                remaining += 1
                print(f"  REMAINING: {lm['landmark_id']} -> {lm['name']}")
                break

    if remaining == 0:
        print("  All activity-based landmarks have been fixed!")
    else:
        print(f"  {remaining} activity-based landmarks still remain")

    t = await db.landmarks.count_documents({})
    o = await db.landmarks.count_documents({'category': 'official'})
    p = await db.landmarks.count_documents({'category': 'premium'})
    print(f"\nFinal totals: {t} landmarks ({o} official, {p} premium)")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
