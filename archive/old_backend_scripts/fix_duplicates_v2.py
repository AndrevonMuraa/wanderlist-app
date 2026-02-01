"""
Fix duplicate landmarks and add replacement authentic landmarks
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# Duplicates to remove (landmark_id -> reason)
DUPLICATES_TO_REMOVE = {
    # Australia - Uluru duplicate
    "australia_uluru_ayers_rock": "premium",  # Keep the official one, remove premium duplicate
    
    # Canada - Churchill duplicate  
    "canada_churchill_polar_bears": "premium",  # Keep official, remove premium
    
    # Brazil
    "brazil_pantanal": True,  # Keep Pantanal Wetlands
    
    # Canada
    "canada_old_quebec": True,  # Keep Old Quebec City
    
    # China
    "china_li_river": True,  # Keep Li River Karst Mountains
    "china_summer_palace": True,  # Keep Summer Palace Beijing
    
    # Egypt
    "egypt_karnak_temple_complex": True,  # Keep Karnak Temple
    
    # France
    "france_french_riviera_côte_d'azur": True,  # Keep French Riviera
    
    # Greece
    "greece_meteora": True,  # Keep Meteora Monasteries
    
    # India
    "india_golden_temple": True,  # Keep Golden Temple Amritsar
    
    # Italy
    "italy_pompeii": True,  # Keep Pompeii Ruins
    
    # Japan
    "japan_shibuya_crossing": True,  # Keep Tokyo Shibuya Crossing
    
    # Mexico
    "mexico_palenque": True,  # Keep Palenque Jungle Temples
    
    # Peru
    "peru_rainbow_mountain_vinicunca": True,  # Keep Rainbow Mountain
    
    # UAE
    "uae_sheikh_zayed_grand_mosque": True,  # Keep Sheikh Zayed Mosque
}

# New replacement landmarks (to maintain landmark count)
REPLACEMENT_LANDMARKS = [
    # Australia replacement for Uluru duplicate
    {
        "landmark_id": "australia_kangaroo_island",
        "name": "Kangaroo Island",
        "country_id": "australia",
        "country_name": "Australia",
        "continent": "Oceania",
        "description": "Australia's third-largest island, known as a sanctuary for native wildlife including sea lions, koalas, and diverse bird species in pristine natural habitats.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1571367034861-e1b5848584f3?w=800",
        "points": 25
    },
    # Brazil replacement
    {
        "landmark_id": "brazil_lencois_maranhenses",
        "name": "Lençóis Maranhenses",
        "country_id": "brazil",
        "country_name": "Brazil",
        "continent": "Americas",
        "description": "A stunning national park featuring vast expanses of white sand dunes interspersed with seasonal crystal-clear lagoons, creating an otherworldly landscape.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1591302418462-eb55463b49d6?w=800",
        "points": 25
    },
    # Canada replacement for Old Quebec
    {
        "landmark_id": "canada_bay_of_fundy",
        "name": "Bay of Fundy",
        "country_id": "canada",
        "country_name": "Canada",
        "continent": "Americas",
        "description": "Home to the world's highest tides, this bay features dramatic rock formations, whales, and the iconic Hopewell Rocks sculpted by billions of tons of tidal water.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800",
        "points": 25
    },
    # Canada replacement for Churchill duplicate
    {
        "landmark_id": "canada_gros_morne",
        "name": "Gros Morne National Park",
        "country_id": "canada",
        "country_name": "Canada",
        "continent": "Americas",
        "description": "A UNESCO World Heritage Site showcasing the Earth's deep ocean crust and mantle exposed by plate tectonics, featuring spectacular fjords and ancient mountains.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        "points": 25
    },
    # China replacement for Li River
    {
        "landmark_id": "china_zhangjiajie",
        "name": "Zhangjiajie National Forest Park",
        "country_id": "china",
        "country_name": "China",
        "continent": "Asia",
        "description": "Towering sandstone pillar formations that inspired the floating mountains in Avatar, featuring glass-bottom bridges and dramatic cliff walkways.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1537531383496-f4749f7a8c37?w=800",
        "points": 25
    },
    # China replacement for Summer Palace
    {
        "landmark_id": "china_jiuzhaigou",
        "name": "Jiuzhaigou Valley",
        "country_id": "china",
        "country_name": "China",
        "continent": "Asia",
        "description": "A UNESCO biosphere reserve famous for its colorful lakes, multi-level waterfalls, snow-capped peaks, and diverse forest ecosystems.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800",
        "points": 25
    },
    # Egypt replacement
    {
        "landmark_id": "egypt_abu_simbel",
        "name": "Abu Simbel Temples",
        "country_id": "egypt",
        "country_name": "Egypt",
        "continent": "Africa",
        "description": "Massive rock temples of Ramesses II and Nefertari, famously relocated in the 1960s to save them from the rising waters of Lake Nasser.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800",
        "points": 25
    },
    # France replacement
    {
        "landmark_id": "france_gorges_du_verdon",
        "name": "Gorges du Verdon",
        "country_id": "france",
        "country_name": "France",
        "continent": "Europe",
        "description": "Europe's most beautiful river canyon with stunning turquoise waters, limestone cliffs up to 700 meters high, and excellent kayaking opportunities.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
        "points": 25
    },
    # Greece replacement for Meteora
    {
        "landmark_id": "greece_delos",
        "name": "Delos Island",
        "country_id": "greece",
        "country_name": "Greece",
        "continent": "Europe",
        "description": "The mythological birthplace of Apollo and Artemis, featuring one of the most extensive archaeological sites in the Mediterranean.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800",
        "points": 25
    },
    # India replacement
    {
        "landmark_id": "india_hampi",
        "name": "Hampi",
        "country_id": "india",
        "country_name": "India",
        "continent": "Asia",
        "description": "The haunting ruins of the last great Hindu kingdom of Vijayanagara, spread among giant boulders with ancient temples and royal structures.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800",
        "points": 25
    },
    # Italy replacement
    {
        "landmark_id": "italy_matera",
        "name": "Matera Sassi",
        "country_id": "italy",
        "country_name": "Italy",
        "continent": "Europe",
        "description": "Ancient cave dwellings carved into limestone, among the first human settlements in Italy, now a UNESCO World Heritage Site and cultural hotspot.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1568797629192-789acf8e4df3?w=800",
        "points": 25
    },
    # Japan replacement
    {
        "landmark_id": "japan_yakushima",
        "name": "Yakushima Island",
        "country_id": "japan",
        "country_name": "Japan",
        "continent": "Asia",
        "description": "A UNESCO World Heritage site with ancient cedar forests including 7,000-year-old trees, said to have inspired Studio Ghibli's Princess Mononoke.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=800",
        "points": 25
    },
    # Mexico replacement
    {
        "landmark_id": "mexico_hierve_el_agua",
        "name": "Hierve el Agua",
        "country_id": "mexico",
        "country_name": "Mexico",
        "continent": "Americas",
        "description": "Petrified waterfalls and natural infinity pools overlooking the Oaxacan valley, formed by mineral-rich spring water over thousands of years.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800",
        "points": 25
    },
    # Peru replacement
    {
        "landmark_id": "peru_huacachina",
        "name": "Huacachina Oasis",
        "country_id": "peru",
        "country_name": "Peru",
        "continent": "Americas",
        "description": "A tiny village built around a natural lagoon in the middle of the Ica Desert, surrounded by towering sand dunes perfect for sandboarding.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800",
        "points": 25
    },
    # UAE replacement
    {
        "landmark_id": "uae_al_ain_oasis",
        "name": "Al Ain Oasis",
        "country_id": "uae",
        "country_name": "United Arab Emirates",
        "continent": "Asia",
        "description": "A UNESCO World Heritage Site featuring 147,000 date palms in ancient falaj irrigation systems, offering a cool green retreat in the desert.",
        "category": "premium",
        "image_url": "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800",
        "points": 25
    },
]

async def fix_duplicates():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 60)
    print("FIXING DUPLICATE LANDMARKS")
    print("=" * 60)
    
    # Step 1: Find and remove duplicate landmarks
    removed_count = 0
    
    # Handle special case: ID collisions (same ID used twice)
    # For australia_uluru_ayers_rock - remove the premium one
    uluru_docs = await db.landmarks.find({"landmark_id": "australia_uluru_ayers_rock"}).to_list(10)
    if len(uluru_docs) > 1:
        for doc in uluru_docs:
            if doc.get("category") == "premium":
                result = await db.landmarks.delete_one({"_id": doc["_id"]})
                if result.deleted_count:
                    print(f"✅ Removed duplicate Uluru (premium with same ID)")
                    removed_count += 1
                break
    
    # For canada_churchill_polar_bears - remove the premium one
    churchill_docs = await db.landmarks.find({"landmark_id": "canada_churchill_polar_bears"}).to_list(10)
    if len(churchill_docs) > 1:
        for doc in churchill_docs:
            if doc.get("category") == "premium":
                result = await db.landmarks.delete_one({"_id": doc["_id"]})
                if result.deleted_count:
                    print(f"✅ Removed duplicate Churchill (premium with same ID)")
                    removed_count += 1
                break
    
    # Remove other duplicates by their unique IDs
    duplicates_to_delete = [
        "brazil_pantanal",
        "canada_old_quebec",
        "china_li_river",
        "china_summer_palace",
        "egypt_karnak_temple_complex",
        "france_french_riviera_côte_d'azur",
        "greece_meteora",
        "india_golden_temple",
        "italy_pompeii",
        "japan_shibuya_crossing",
        "mexico_palenque",
        "peru_rainbow_mountain_vinicunca",
    ]
    
    # Also check for Sheikh Zayed duplicate
    sheikh_docs = await db.landmarks.find({"name": {"$regex": "sheikh zayed", "$options": "i"}}).to_list(10)
    if len(sheikh_docs) > 1:
        for doc in sheikh_docs:
            if "grand" in doc.get("name", "").lower():
                result = await db.landmarks.delete_one({"_id": doc["_id"]})
                if result.deleted_count:
                    print(f"✅ Removed: Sheikh Zayed Grand Mosque (duplicate)")
                    removed_count += 1
                break
    
    for landmark_id in duplicates_to_delete:
        result = await db.landmarks.delete_one({"landmark_id": landmark_id})
        if result.deleted_count:
            print(f"✅ Removed: {landmark_id}")
            removed_count += 1
        else:
            print(f"⚠️  Not found: {landmark_id}")
    
    print(f"\nTotal removed: {removed_count}")
    
    # Step 2: Add replacement landmarks
    print("\n" + "=" * 60)
    print("ADDING REPLACEMENT LANDMARKS")
    print("=" * 60)
    
    added_count = 0
    for landmark in REPLACEMENT_LANDMARKS:
        # Check if already exists
        existing = await db.landmarks.find_one({"landmark_id": landmark["landmark_id"]})
        if existing:
            print(f"⚠️  Already exists: {landmark['name']}")
            continue
        
        # Add new landmark
        landmark["created_at"] = datetime.now(timezone.utc)
        landmark["upvotes"] = 0
        landmark["images"] = []
        landmark["facts"] = []
        landmark["best_time_to_visit"] = "Year-round"
        landmark["duration"] = "2-3 hours"
        landmark["difficulty"] = "Easy"
        
        await db.landmarks.insert_one(landmark)
        print(f"✅ Added: {landmark['name']} ({landmark['country_name']})")
        added_count += 1
    
    print(f"\nTotal added: {added_count}")
    
    # Step 3: Verify final state
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)
    
    total_landmarks = await db.landmarks.count_documents({})
    official_count = await db.landmarks.count_documents({"category": "official"})
    premium_count = await db.landmarks.count_documents({"category": "premium"})
    
    print(f"Total landmarks: {total_landmarks}")
    print(f"Official: {official_count}")
    print(f"Premium: {premium_count}")
    
    # Check for remaining duplicates
    all_landmarks = await db.landmarks.find({}, {"landmark_id": 1}).to_list(1000)
    ids = [lm["landmark_id"] for lm in all_landmarks]
    from collections import Counter
    id_counts = Counter(ids)
    collisions = {k: v for k, v in id_counts.items() if v > 1}
    
    if collisions:
        print(f"\n⚠️  Remaining ID collisions: {collisions}")
    else:
        print("\n✅ No ID collisions!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_duplicates())
