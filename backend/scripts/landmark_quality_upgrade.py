"""
WanderMark Landmark Quality Upgrade — Build 82
Fixes 13 duplicates and 5 weak landmarks across the database.
Run on Render shell: cd scripts && python3 landmark_quality_upgrade.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "wandermark")

# ============================================================
# PHASE 1: Fix duplicates — remove duplicate, insert replacement
# ============================================================
DUPLICATE_FIXES = [
    # Brazil: Remove premium "Lencois Maranhenses" (duplicate of basic "Lençóis Maranhenses")
    {
        "delete": {"country_id": "brazil", "name": "Lencois Maranhenses", "category": "premium"},
        "insert": {
            "landmark_id": "brazil_jericoacoara",
            "name": "Jericoacoara Beach",
            "country_id": "brazil", "country_name": "Brazil", "continent": "South America",
            "description": "A remote paradise village with towering sand dunes, turquoise lagoons, and dramatic sunsets from Sunset Dune. One of Brazil's most beautiful beach destinations.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Jul-Dec", "duration": "2-3 days", "difficulty": "Easy",
        }
    },
    # Colombia: Remove duplicate "Lost City Ciudad Perdida"
    {
        "delete": {"country_id": "colombia", "name": "Lost City Ciudad Perdida", "category": "premium"},
        "insert": {
            "landmark_id": "colombia_guatape_rock",
            "name": "Guatapé Rock (El Peñón)",
            "country_id": "colombia", "country_name": "Colombia", "continent": "South America",
            "description": "A 220m monolithic rock with 740 steps carved into its side. The summit offers a panoramic view of the reservoir and surrounding islands.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Dec-Mar", "duration": "Half day", "difficulty": "Moderate",
        }
    },
    # Costa Rica: Remove premium duplicate of "Tortuguero National Park"
    {
        "delete": {"country_id": "costa_rica", "name": "Tortuguero National Park", "category": "premium"},
        "insert": {
            "landmark_id": "costa_rica_irazu_volcano",
            "name": "Irazú Volcano",
            "country_id": "costa_rica", "country_name": "Costa Rica", "continent": "North America",
            "description": "Costa Rica's highest active volcano at 3,432m. On clear days you can see both the Pacific and Atlantic oceans from the summit crater.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Dec-Apr", "duration": "Half day", "difficulty": "Easy",
        }
    },
    # Costa Rica: Remove premium duplicate of "Rio Celeste Blue River"
    {
        "delete": {"country_id": "costa_rica", "name": "Rio Celeste Blue River", "category": "premium"},
        "insert": {
            "landmark_id": "costa_rica_chirripo",
            "name": "Cerro Chirripó",
            "country_id": "costa_rica", "country_name": "Costa Rica", "continent": "North America",
            "description": "Costa Rica's highest peak at 3,820m. A challenging 2-day hike through cloud forests to páramo grasslands with sunrise views above the clouds.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Jan-Apr", "duration": "2 days", "difficulty": "Challenging",
        }
    },
    # Mexico: Remove "Holbox Island" (duplicate of "Isla Holbox")
    {
        "delete": {"country_id": "mexico", "name": "Holbox Island", "category": "premium"},
        "insert": {
            "landmark_id": "mexico_sumidero_canyon",
            "name": "Sumidero Canyon",
            "country_id": "mexico", "country_name": "Mexico", "continent": "North America",
            "description": "A dramatic canyon with walls rising 1,000m above the Grijalva River in Chiapas. Boat tours reveal caves, waterfalls, and crocodile habitats.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Nov-May", "duration": "Half day", "difficulty": "Easy",
        }
    },
    # Namibia: Remove "Sossusvlei Dead Vlei" (duplicate of basic "Deadvlei")
    {
        "delete": {"country_id": "namibia", "name": "Sossusvlei Dead Vlei", "category": "premium"},
        "insert": {
            "landmark_id": "namibia_brandberg_mountain",
            "name": "Brandberg Mountain",
            "country_id": "namibia", "country_name": "Namibia", "continent": "Africa",
            "description": "Namibia's highest mountain (2,573m) with the famous 2,000-year-old White Lady rock painting. Sacred to the Damara people.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Apr-Oct", "duration": "Full day", "difficulty": "Moderate",
        }
    },
    # Japan: Remove "Yakushima Cedar Forests" (duplicate of "Yakushima Ancient Forest")
    {
        "delete": {"country_id": "japan", "name": "Yakushima Cedar Forests", "category": "premium"},
        "insert": {
            "landmark_id": "japan_kenrokuen_garden",
            "name": "Kenrokuen Garden",
            "country_id": "japan", "country_name": "Japan", "continent": "Asia",
            "description": "One of Japan's Three Great Gardens in Kanazawa. A masterpiece of Japanese landscape design with streams, waterfalls, and ancient pine trees across all four seasons.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Mar-May, Oct-Nov", "duration": "2-3 hours", "difficulty": "Easy",
        }
    },
    # Samoa: Remove "Sua Ocean Trench" (duplicate of "To Sua Ocean Trench")
    {
        "delete": {"country_id": "samoa", "name": "Sua Ocean Trench", "category": "premium"},
        "insert": {
            "landmark_id": "samoa_saleaula_lava_fields",
            "name": "Saleaula Lava Fields",
            "country_id": "samoa", "country_name": "Samoa", "continent": "Oceania",
            "description": "Eerie volcanic landscape from the 1905-1911 eruptions of Mount Matavanu. Includes a church buried in lava and the Virgin's Grave.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "May-Oct", "duration": "2 hours", "difficulty": "Easy",
        }
    },
    # Cook Islands: Remove "Muri Night Market" (duplicate of "Muri Beach Night Market")  
    {
        "delete": {"country_id": "cook_islands", "name": "Muri Night Market", "category": "premium"},
        "insert": {
            "landmark_id": "cook_islands_black_rock",
            "name": "Black Rock (Tuoro)",
            "country_id": "cook_islands", "country_name": "Cook Islands", "continent": "Oceania",
            "description": "A sacred volcanic rock where Polynesian spirits are believed to depart for the afterlife. Spectacular snorkeling spot with crystal-clear waters.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Apr-Nov", "duration": "2 hours", "difficulty": "Easy",
        }
    },
    # Denmark: Remove "Hamlet Castle Helsingr" (duplicate of "Kronborg Castle")
    {
        "delete": {"country_id": "denmark", "name": "Hamlet Castle Helsingr", "category": "premium"},
        "insert": {
            "landmark_id": "denmark_thy_national_park",
            "name": "Thy National Park",
            "country_id": "denmark", "country_name": "Denmark", "continent": "Europe",
            "description": "Denmark's first national park with wild dune landscapes, rare bird habitats, and miles of untouched North Sea coastline.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "May-Sep", "duration": "1-2 days", "difficulty": "Moderate",
        }
    },
    # Finland: Remove "Suomenlinna Sea Fortress" (duplicate of basic "Suomenlinna")
    {
        "delete": {"country_id": "finland", "name": "Suomenlinna Sea Fortress", "category": "premium"},
        "insert": {
            "landmark_id": "finland_oulanka_national_park",
            "name": "Oulanka National Park",
            "country_id": "finland", "country_name": "Finland", "continent": "Europe",
            "description": "One of Finland's most visited national parks with the famous Karhunkierros trail, roaring rapids, and pristine boreal forests.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Jun-Sep", "duration": "1-3 days", "difficulty": "Moderate",
        }
    },
    # Tunisia: Remove "El Jem Amphitheatre" (duplicate of "El Djem Amphitheater")
    {
        "delete": {"country_id": "tunisia", "name": "El Jem Amphitheatre", "category": "premium"},
        "insert": {
            "landmark_id": "tunisia_ichkeul_lake",
            "name": "Ichkeul National Park",
            "country_id": "tunisia", "country_name": "Tunisia", "continent": "Africa",
            "description": "UNESCO World Heritage lake and wetland — the last remaining in a chain that once stretched across North Africa. Major stopover for migratory birds.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Oct-Mar", "duration": "Half day", "difficulty": "Easy",
        }
    },
    # Thailand: Remove "Erawan National Park" (overlaps with "Erawan Waterfalls")
    {
        "delete": {"country_id": "thailand", "name": "Erawan National Park", "category": "premium"},
        "insert": {
            "landmark_id": "thailand_pai",
            "name": "Pai",
            "country_id": "thailand", "country_name": "Thailand", "continent": "Asia",
            "description": "A charming mountain town in Mae Hong Son province known for its laid-back atmosphere, hot springs, Pai Canyon, and the iconic Memorial Bridge.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Nov-Feb", "duration": "2-3 days", "difficulty": "Easy",
        }
    },
    # Thailand: Remove "Khao Sok Floating Raft Houses" (overlaps with "Khao Sok Cheow Lan Lake")
    {
        "delete": {"country_id": "thailand", "name": "Khao Sok Floating Raft Houses", "category": "premium"},
        "insert": {
            "landmark_id": "thailand_koh_lipe",
            "name": "Koh Lipe",
            "country_id": "thailand", "country_name": "Thailand", "continent": "Asia",
            "description": "The 'Maldives of Thailand' — a tiny island in the Andaman Sea with crystal-clear water, vibrant coral reefs, and powdery white sand beaches.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "Nov-Apr", "duration": "2-4 days", "difficulty": "Easy",
        }
    },
]

# ============================================================
# PHASE 2: Weak landmarks → stronger replacements
# ============================================================
WEAK_REPLACEMENTS = [
    # Norway: "Atlantic Ocean Road" → "Flåm Railway" (premium)
    {
        "delete": {"country_id": "norway", "name": "Atlantic Ocean Road"},
        "insert": {
            "landmark_id": "norway_flam_railway",
            "name": "Flåm Railway",
            "country_id": "norway", "country_name": "Norway", "continent": "Europe",
            "description": "One of the world's steepest railway lines, descending 866m through spectacular fjord scenery, waterfalls, and mountain tunnels between Myrdal and Flåm.",
            "category": "premium", "points": 25,
            "best_time_to_visit": "May-Sep", "duration": "1 hour ride", "difficulty": "Easy",
        }
    },
    # Argentina: "Buenos Aires Tango" → "El Chaltén"
    {
        "delete": {"country_id": "argentina", "name": "Buenos Aires Tango"},
        "insert": {
            "landmark_id": "argentina_el_chalten",
            "name": "El Chaltén",
            "country_id": "argentina", "country_name": "Argentina", "continent": "South America",
            "description": "Argentina's trekking capital at the base of Mount Fitz Roy. Stunning Patagonian scenery with glaciers, turquoise lakes, and jagged granite peaks.",
            "category": "official", "points": 10,
            "best_time_to_visit": "Oct-Mar", "duration": "2-4 days", "difficulty": "Moderate",
        }
    },
    # Maldives: "Male Fish Market" → "Overwater Villas"
    {
        "delete": {"country_id": "maldives", "name": "Male Fish Market"},
        "insert": {
            "landmark_id": "maldives_overwater_villas",
            "name": "Maldives Overwater Villas",
            "country_id": "maldives", "country_name": "Maldives", "continent": "Oceania",
            "description": "The Maldives' iconic overwater bungalows — thatched-roof villas on stilts above turquoise lagoons with glass floors and direct ocean access.",
            "category": "official", "points": 10,
            "best_time_to_visit": "Nov-Apr", "duration": "2-5 days", "difficulty": "Easy",
        }
    },
    # Singapore: "Orchard Road" → "Hawker Centres"
    {
        "delete": {"country_id": "singapore", "name": "Orchard Road"},
        "insert": {
            "landmark_id": "singapore_hawker_centres",
            "name": "UNESCO Hawker Centres",
            "country_id": "singapore", "country_name": "Singapore", "continent": "Asia",
            "description": "Singapore's UNESCO-listed hawker culture — open-air food courts serving world-class dishes at local prices. Try Maxwell, Lau Pa Sat, or Old Airport Road.",
            "category": "official", "points": 10,
            "best_time_to_visit": "Year-round", "duration": "1-2 hours", "difficulty": "Easy",
        }
    },
    # UK: Move "Giant's Causeway" to proper context — replace with "York Minster"
    {
        "delete": {"country_id": "united kingdom", "name": "Giant's Causeway"},
        "insert": {
            "landmark_id": "uk_york_minster",
            "name": "York Minster",
            "country_id": "united kingdom", "country_name": "United Kingdom", "continent": "Europe",
            "description": "One of the largest Gothic cathedrals in Northern Europe, built over 250 years. Famous for its medieval stained glass, including the Great East Window.",
            "category": "official", "points": 10,
            "best_time_to_visit": "Year-round", "duration": "1-2 hours", "difficulty": "Easy",
        }
    },
]

COMMON_FIELDS = {
    "image_url": "", "images": [], "facts": [],
    "latitude": None, "longitude": None,
    "upvotes": 0, "created_by": None,
}

async def run_upgrade():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("WANDERMARK LANDMARK QUALITY UPGRADE")
    print("=" * 60)
    
    # Phase 1: Fix duplicates
    print("\n--- PHASE 1: Fixing 14 duplicates ---")
    for i, fix in enumerate(DUPLICATE_FIXES, 1):
        d = fix["delete"]
        result = await db.landmarks.delete_one(d)
        deleted = result.deleted_count
        
        ins = {**fix["insert"], **COMMON_FIELDS}
        await db.landmarks.insert_one(ins)
        
        print(f"  {i}. {d['country_id']}: Removed '{d['name']}' ({deleted}), Added '{fix['insert']['name']}'")
    
    # Phase 2: Weak replacements
    print("\n--- PHASE 2: 5 weak → strong replacements ---")
    for i, fix in enumerate(WEAK_REPLACEMENTS, 1):
        d = fix["delete"]
        result = await db.landmarks.delete_one(d)
        deleted = result.deleted_count
        
        ins = {**fix["insert"], **COMMON_FIELDS}
        await db.landmarks.insert_one(ins)
        
        print(f"  {i}. {d['country_id']}: Removed '{d['name']}' ({deleted}), Added '{fix['insert']['name']}'")
    
    # Verification
    print("\n--- VERIFICATION ---")
    total = await db.landmarks.count_documents({})
    countries = await db.countries.count_documents({})
    print(f"  Total landmarks: {total}")
    print(f"  Total countries: {countries}")
    
    # Check for remaining duplicates
    pipeline = [
        {"$group": {"_id": {"country": "$country_id", "name": "$name"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    dupes = await db.landmarks.aggregate(pipeline).to_list(100)
    if dupes:
        print(f"  WARNING: {len(dupes)} remaining duplicates found!")
        for d in dupes:
            print(f"    - {d['_id']['country']}: {d['_id']['name']} (x{d['count']})")
    else:
        print("  No duplicates found!")
    
    print("\nDone!")
    client.close()

if __name__ == "__main__":
    asyncio.run(run_upgrade())
