"""Replace Kyrgyzstan with Pakistan in the WanderMark database."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "wandermark")

PAKISTAN_LANDMARKS = [
    # Basic (10) - official, 10 pts
    {
        "landmark_id": "pakistan_k2_base_camp",
        "name": "K2 Base Camp",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "Base camp of the world's second highest mountain (8,611m). K2 is considered the most difficult and dangerous climb among the 8,000m peaks.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Jun-Aug",
        "duration": "7-14 days trek",
        "difficulty": "Challenging",
    },
    {
        "landmark_id": "pakistan_badshahi_mosque",
        "name": "Badshahi Mosque",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "One of the world's largest mosques, built in 1673 by Mughal Emperor Aurangzeb in Lahore. A masterpiece of Mughal architecture.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Oct-Mar",
        "duration": "1-2 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_faisal_mosque",
        "name": "Faisal Mosque",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "Pakistan's national mosque in Islamabad, designed by Turkish architect Vedat Dalokay. Its tent-like design is an icon of modern Islamic architecture.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Year-round",
        "duration": "1-2 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_lahore_fort",
        "name": "Lahore Fort",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "UNESCO World Heritage Site. A citadel spanning 20 hectares with Mughal-era palaces, halls, and gardens dating back to the 11th century.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Oct-Mar",
        "duration": "2-3 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_hunza_valley",
        "name": "Hunza Valley",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "A breathtaking valley in Gilgit-Baltistan surrounded by the Karakoram peaks, known for its dramatic scenery, terraced farms, and ancient forts.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Apr-Oct",
        "duration": "3-5 days",
        "difficulty": "Moderate",
    },
    {
        "landmark_id": "pakistan_shalimar_gardens",
        "name": "Shalimar Gardens",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "UNESCO World Heritage Site. Built in 1641 by Emperor Shah Jahan, these terraced Mughal gardens feature 410 fountains across three levels.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Feb-Apr",
        "duration": "1-2 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_karakoram_highway",
        "name": "Karakoram Highway",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "The world's highest paved international road, connecting Pakistan and China through the Karakoram mountains at 4,693m elevation.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "May-Oct",
        "duration": "2-4 days drive",
        "difficulty": "Moderate",
    },
    {
        "landmark_id": "pakistan_mohenjo_daro",
        "name": "Mohenjo-daro",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "UNESCO World Heritage Site. Ruins of a 4,500-year-old city of the Indus Valley Civilization, one of the world's earliest major urban settlements.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Nov-Feb",
        "duration": "2-3 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_derawar_fort",
        "name": "Derawar Fort",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "A massive square fortress rising from the Cholistan Desert with 40 bastions visible for miles. Built in the 9th century by Rai Jajja Bhatti.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Nov-Feb",
        "duration": "2-3 hours",
        "difficulty": "Moderate",
    },
    {
        "landmark_id": "pakistan_margalla_hills",
        "name": "Margalla Hills",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "National park on the foothills of the Himalayas overlooking Islamabad. Popular for hiking trails with panoramic views of the capital city.",
        "category": "official",
        "points": 10,
        "best_time_to_visit": "Oct-Apr",
        "duration": "3-5 hours",
        "difficulty": "Moderate",
    },
    # Premium (5) - premium, 25 pts
    {
        "landmark_id": "pakistan_fairy_meadows",
        "name": "Fairy Meadows",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "Known as 'the world's most beautiful grassland', this alpine meadow at 3,300m offers a stunning front-row view of Nanga Parbat's north face.",
        "category": "premium",
        "points": 25,
        "best_time_to_visit": "Jun-Sep",
        "duration": "2-3 days",
        "difficulty": "Challenging",
    },
    {
        "landmark_id": "pakistan_attabad_lake",
        "name": "Attabad Lake",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "A stunning turquoise lake created by a massive landslide in 2010. Surrounded by dramatic Karakoram peaks with boat rides through submerged villages.",
        "category": "premium",
        "points": 25,
        "best_time_to_visit": "May-Oct",
        "duration": "Half day",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_rohtas_fort",
        "name": "Rohtas Fort",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "UNESCO World Heritage Site. A massive 16th-century fortress built by Sher Shah Suri, with 12 gates and 4km of walls — never conquered in battle.",
        "category": "premium",
        "points": 25,
        "best_time_to_visit": "Oct-Mar",
        "duration": "2-3 hours",
        "difficulty": "Easy",
    },
    {
        "landmark_id": "pakistan_lake_saiful_malook",
        "name": "Lake Saif-ul-Malook",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "Pakistan's most iconic alpine lake at 3,224m, surrounded by snow-capped peaks. Named after a legendary Persian prince's love story.",
        "category": "premium",
        "points": 25,
        "best_time_to_visit": "Jun-Sep",
        "duration": "Full day",
        "difficulty": "Moderate",
    },
    {
        "landmark_id": "pakistan_taxila",
        "name": "Taxila",
        "country_id": "pakistan",
        "country_name": "Pakistan",
        "continent": "Asia",
        "description": "UNESCO World Heritage Site. Ancient Gandhara Buddhist university city dating back to the 5th century BCE, with remarkably preserved ruins and stupas.",
        "category": "premium",
        "points": 25,
        "best_time_to_visit": "Oct-Mar",
        "duration": "3-4 hours",
        "difficulty": "Easy",
    },
]

async def replace_kyrgyzstan_with_pakistan():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Delete Kyrgyzstan landmarks
    del_lm = await db.landmarks.delete_many({"country_id": "kyrgyzstan"})
    print(f"Deleted {del_lm.deleted_count} Kyrgyzstan landmarks")
    
    # 2. Delete Kyrgyzstan country
    del_c = await db.countries.delete_one({"country_id": "kyrgyzstan"})
    print(f"Deleted Kyrgyzstan country: {del_c.deleted_count}")
    
    # 3. Insert Pakistan country
    pakistan_country = {
        "country_id": "pakistan",
        "name": "Pakistan",
        "continent": "Asia",
        "image_url": "",
        "landmark_count": 15,
        "total_points": 225,  # 10*10 + 5*25
    }
    await db.countries.insert_one(pakistan_country)
    print("Inserted Pakistan country")
    
    # 4. Insert Pakistan landmarks
    common = {
        "image_url": "",
        "images": [],
        "facts": [],
        "latitude": None,
        "longitude": None,
        "upvotes": 0,
        "created_by": None,
    }
    for lm in PAKISTAN_LANDMARKS:
        doc = {**lm, **common}
        await db.landmarks.insert_one(doc)
    print(f"Inserted {len(PAKISTAN_LANDMARKS)} Pakistan landmarks")
    
    # 5. Verify
    count = await db.landmarks.count_documents({"country_id": "pakistan"})
    print(f"\nVerification: {count} Pakistan landmarks in DB")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(replace_kyrgyzstan_with_pakistan())
