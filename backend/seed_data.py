import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Countries and their continents
COUNTRIES_DATA = [
    {"country_id": "norway", "name": "Norway", "continent": "Europe"},
    {"country_id": "france", "name": "France", "continent": "Europe"},
    {"country_id": "italy", "name": "Italy", "continent": "Europe"},
    {"country_id": "japan", "name": "Japan", "continent": "Asia"},
    {"country_id": "egypt", "name": "Egypt", "continent": "Africa"},
    {"country_id": "peru", "name": "Peru", "continent": "South America"},
    {"country_id": "australia", "name": "Australia", "continent": "Oceania"},
    {"country_id": "usa", "name": "United States", "continent": "North America"},
    {"country_id": "uk", "name": "United Kingdom", "continent": "Europe"},
    {"country_id": "china", "name": "China", "continent": "Asia"},
]

# 10 landmarks per country
LANDMARKS_DATA = {
    "norway": [
        {"name": "The Old Town of Fredrikstad", "description": "A well-preserved fortified town with cobblestone streets and historic buildings.", "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600"},
        {"name": "Preikestolen (Pulpit Rock)", "description": "A steep cliff that rises 604 meters above Lysefjorden, offering breathtaking views.", "image_url": "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=600"},
        {"name": "Bryggen", "description": "Colorful wooden houses on the waterfront in Bergen, a UNESCO World Heritage site.", "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600"},
        {"name": "Nidaros Cathedral", "description": "Norway's national sanctuary, built over the burial site of St. Olav.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=600"},
        {"name": "Geirangerfjord", "description": "A stunning fjord known for its deep blue waters and majestic waterfalls.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600"},
        {"name": "Vigeland Sculpture Park", "description": "The world's largest sculpture park made by a single artist, Gustav Vigeland.", "image_url": "https://images.unsplash.com/photo-1581791538302-03537b9e46bd?w=600"},
        {"name": "Northern Lights", "description": "Natural light display in Arctic skies, best seen in Northern Norway.", "image_url": "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=600"},
        {"name": "Lofoten Islands", "description": "Dramatic peaks, open sea, and sheltered bays in Arctic waters.", "image_url": "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=600"},
        {"name": "Akershus Fortress", "description": "Medieval castle and fortress in Oslo, built to protect the capital.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Trolltunga", "description": "A rock formation jutting horizontally out of a mountain 700 meters above sea level.", "image_url": "https://images.unsplash.com/photo-1586469479969-2fef2476c6b1?w=600"},
    ],
    "france": [
        {"name": "Eiffel Tower", "description": "Iconic iron lattice tower in Paris, symbol of France.", "image_url": "https://images.unsplash.com/photo-1551450500-2e0995baf0d6?w=600"},
        {"name": "Louvre Museum", "description": "World's largest art museum, home to the Mona Lisa.", "image_url": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600"},
        {"name": "Notre-Dame Cathedral", "description": "Medieval Catholic cathedral, masterpiece of French Gothic architecture.", "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600"},
        {"name": "Mont Saint-Michel", "description": "Island commune topped by medieval monastery.", "image_url": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600"},
        {"name": "Palace of Versailles", "description": "Opulent royal château with stunning gardens.", "image_url": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600"},
        {"name": "Arc de Triomphe", "description": "Monumental arch honoring those who fought for France.", "image_url": "https://images.unsplash.com/photo-1541170251893-16152cf69e6c?w=600"},
        {"name": "Pont du Gard", "description": "Ancient Roman aqueduct bridge in southern France.", "image_url": "https://images.unsplash.com/photo-1586032653823-fb4e8c653278?w=600"},
        {"name": "Château de Chambord", "description": "Distinctive French Renaissance château in Loire Valley.", "image_url": "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600"},
        {"name": "Sacré-Cœur", "description": "Stunning basilica on the summit of Montmartre in Paris.", "image_url": "https://images.unsplash.com/photo-1549144511-f099e773c147?w=600"},
        {"name": "French Riviera", "description": "Mediterranean coastline known for glamorous resorts.", "image_url": "https://images.unsplash.com/photo-1517456793572-1d8efd6dc135?w=600"},
    ],
    "italy": [
        {"name": "Colosseum", "description": "Ancient amphitheater in Rome, largest ever built.", "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600"},
        {"name": "Leaning Tower of Pisa", "description": "Freestanding bell tower known for its unintended tilt.", "image_url": "https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=600"},
        {"name": "Venice Canals", "description": "Romantic waterways through historic Venice.", "image_url": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=600"},
        {"name": "Vatican City", "description": "Smallest country, home to St. Peter's Basilica and the Pope.", "image_url": "https://images.unsplash.com/photo-1557409518-691ebcd96038?w=600"},
        {"name": "Trevi Fountain", "description": "Baroque fountain, the largest in Rome.", "image_url": "https://images.unsplash.com/photo-1548585744-c5f0eac5f0de?w=600"},
        {"name": "Florence Cathedral", "description": "Gothic cathedral with iconic red-tiled dome.", "image_url": "https://images.unsplash.com/photo-1543429258-232e513c7881?w=600"},
        {"name": "Cinque Terre", "description": "Five colorful villages on rugged Italian Riviera coastline.", "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600"},
        {"name": "Amalfi Coast", "description": "Stunning coastline with cliffside villages.", "image_url": "https://images.unsplash.com/photo-1558477360-cf1a7827c5be?w=600"},
        {"name": "Pompeii", "description": "Ancient city preserved by volcanic ash from Mt. Vesuvius.", "image_url": "https://images.unsplash.com/photo-1581544291234-31340be4b1b8?w=600"},
        {"name": "Sistine Chapel", "description": "Chapel with ceiling painted by Michelangelo.", "image_url": "https://images.unsplash.com/photo-1559564484-e48d68cd2d1f?w=600"},
    ],
    "japan": [
        {"name": "Mount Fuji", "description": "Japan's highest mountain and iconic snow-capped volcano.", "image_url": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=600"},
        {"name": "Fushimi Inari Shrine", "description": "Shrine famous for thousands of vermillion torii gates.", "image_url": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600"},
        {"name": "Tokyo Tower", "description": "Communications tower inspired by Eiffel Tower.", "image_url": "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600"},
        {"name": "Kinkaku-ji (Golden Pavilion)", "description": "Zen temple covered in gold leaf in Kyoto.", "image_url": "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=600"},
        {"name": "Hiroshima Peace Memorial", "description": "Monument to the atomic bombing victims.", "image_url": "https://images.unsplash.com/photo-1574873101598-00fb4c2f7eac?w=600"},
        {"name": "Osaka Castle", "description": "Historic castle that played a major role in Japanese unification.", "image_url": "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=600"},
        {"name": "Arashiyama Bamboo Grove", "description": "Serene bamboo forest in western Kyoto.", "image_url": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600"},
        {"name": "Senso-ji Temple", "description": "Tokyo's oldest temple, founded in 628 AD.", "image_url": "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=600"},
        {"name": "Shibuya Crossing", "description": "World's busiest pedestrian crossing in Tokyo.", "image_url": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600"},
        {"name": "Nara Park", "description": "Park where over 1,000 wild deer roam freely.", "image_url": "https://images.unsplash.com/photo-1528164344705-47542687000d?w=600"},
    ],
    "egypt": [
        {"name": "Great Pyramids of Giza", "description": "Ancient pyramids, one of the Seven Wonders of the Ancient World.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=600"},
        {"name": "Sphinx", "description": "Limestone statue of a reclining sphinx with human head.", "image_url": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600"},
        {"name": "Karnak Temple", "description": "Vast mix of temples, chapels, and other buildings in Luxor.", "image_url": "https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600"},
        {"name": "Valley of the Kings", "description": "Valley where tombs were constructed for pharaohs.", "image_url": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=600"},
        {"name": "Abu Simbel", "description": "Massive rock temples built by Pharaoh Ramesses II.", "image_url": "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600"},
        {"name": "Egyptian Museum", "description": "Home to extensive collection of ancient Egyptian antiquities.", "image_url": "https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600"},
        {"name": "Luxor Temple", "description": "Large Ancient Egyptian temple complex on the Nile's east bank.", "image_url": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600"},
        {"name": "Khan el-Khalili", "description": "Famous bazaar and souq in historic center of Cairo.", "image_url": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=600"},
        {"name": "Temple of Hatshepsut", "description": "Mortuary temple of female pharaoh Hatshepsut.", "image_url": "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600"},
        {"name": "Philae Temple", "description": "Island temple dedicated to goddess Isis.", "image_url": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=600"},
    ],
    "peru": [
        {"name": "Machu Picchu", "description": "15th-century Inca citadel set high in the Andes Mountains.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600"},
        {"name": "Nazca Lines", "description": "Ancient geoglyphs etched into desert sands.", "image_url": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=600"},
        {"name": "Sacred Valley", "description": "Valley in Andes of Peru, close to Inca capital of Cusco.", "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600"},
        {"name": "Lake Titicaca", "description": "Highest navigable lake in world, on Peru-Bolivia border.", "image_url": "https://images.unsplash.com/photo-1531804055935-76f44d7c3621?w=600"},
        {"name": "Colca Canyon", "description": "One of world's deepest canyons, home to Andean condors.", "image_url": "https://images.unsplash.com/photo-1517512006864-7ebd8bbdbd91?w=600"},
        {"name": "Rainbow Mountain", "description": "Mountain with naturally colorful layers of sediment.", "image_url": "https://images.unsplash.com/photo-1531804055935-76f44d7c3621?w=600"},
        {"name": "Chan Chan", "description": "Largest adobe city in the Americas, built by Chimú.", "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=600"},
        {"name": "Sacsayhuamán", "description": "Citadel on northern outskirts of Cusco.", "image_url": "https://images.unsplash.com/photo-1531804055935-76f44d7c3621?w=600"},
        {"name": "Amazon Rainforest", "description": "Peru's portion of the world's largest tropical rainforest.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
        {"name": "Huacachina Oasis", "description": "Desert oasis surrounded by sand dunes.", "image_url": "https://images.unsplash.com/photo-1531804055935-76f44d7c3621?w=600"},
    ],
    "australia": [
        {"name": "Sydney Opera House", "description": "Multi-venue performing arts center with distinctive sail design.", "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600"},
        {"name": "Great Barrier Reef", "description": "World's largest coral reef system.", "image_url": "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=600"},
        {"name": "Uluru (Ayers Rock)", "description": "Massive sandstone monolith in the heart of Northern Territory.", "image_url": "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=600"},
        {"name": "Twelve Apostles", "description": "Collection of limestone stacks off the shore of Port Campbell.", "image_url": "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600"},
        {"name": "Sydney Harbour Bridge", "description": "Steel through arch bridge across Sydney Harbour.", "image_url": "https://images.unsplash.com/photo-1549180030-48bf079fb38a?w=600"},
        {"name": "Blue Mountains", "description": "Mountainous region known for dramatic scenery.", "image_url": "https://images.unsplash.com/photo-1506374322094-1253a7594180?w=600"},
        {"name": "Bondi Beach", "description": "Popular beach and surfing spot in Sydney.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600"},
        {"name": "Daintree Rainforest", "description": "Tropical rainforest, oldest continuously surviving rainforest.", "image_url": "https://images.unsplash.com/photo-1523496922380-91d5afba98a3?w=600"},
        {"name": "Fraser Island", "description": "World's largest sand island, heritage-listed.", "image_url": "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=600"},
        {"name": "Whitsunday Islands", "description": "74 islands with pristine beaches and coral reefs.", "image_url": "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=600"},
    ],
    "usa": [
        {"name": "Statue of Liberty", "description": "Colossal neoclassical sculpture on Liberty Island, New York.", "image_url": "https://images.unsplash.com/photo-1508567473203-bc6c657c0d86?w=600"},
        {"name": "Grand Canyon", "description": "Steep-sided canyon carved by the Colorado River.", "image_url": "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=600"},
        {"name": "Yellowstone National Park", "description": "First national park, known for geothermal features.", "image_url": "https://images.unsplash.com/photo-1583486176154-07e7d30b1940?w=600"},
        {"name": "Golden Gate Bridge", "description": "Iconic suspension bridge in San Francisco.", "image_url": "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=600"},
        {"name": "Mount Rushmore", "description": "Mountain sculpture featuring four U.S. presidents.", "image_url": "https://images.unsplash.com/photo-1523918066709-c6631ee3e139?w=600"},
        {"name": "Times Square", "description": "Major commercial intersection in Midtown Manhattan.", "image_url": "https://images.unsplash.com/photo-1560720902-2d939b258f31?w=600"},
        {"name": "Las Vegas Strip", "description": "Famous stretch of Las Vegas Boulevard with casinos and hotels.", "image_url": "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600"},
        {"name": "Niagara Falls", "description": "Group of three waterfalls on US-Canada border.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=600"},
        {"name": "Walt Disney World", "description": "World's most visited vacation resort in Orlando.", "image_url": "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=600"},
        {"name": "Hollywood Sign", "description": "Iconic landmark in Hollywood Hills, Los Angeles.", "image_url": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600"},
    ],
    "uk": [
        {"name": "Big Ben", "description": "Great bell of the clock at Palace of Westminster in London.", "image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600"},
        {"name": "Tower of London", "description": "Historic castle on the north bank of River Thames.", "image_url": "https://images.unsplash.com/photo-1529679997670-ebbbcf9f30e2?w=600"},
        {"name": "Stonehenge", "description": "Prehistoric monument consisting of ring of standing stones.", "image_url": "https://images.unsplash.com/photo-1599833975787-5d613332275c?w=600"},
        {"name": "Buckingham Palace", "description": "London residence and administrative headquarters of monarch.", "image_url": "https://images.unsplash.com/photo-1543871958-7d8f34e1f19c?w=600"},
        {"name": "Edinburgh Castle", "description": "Historic fortress dominating skyline of Edinburgh.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600"},
        {"name": "Tower Bridge", "description": "Combined bascule and suspension bridge in London.", "image_url": "https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=600"},
        {"name": "Windsor Castle", "description": "Royal residence and the oldest occupied castle in the world.", "image_url": "https://images.unsplash.com/photo-1606408311223-bc79e3ebff06?w=600"},
        {"name": "British Museum", "description": "Public museum dedicated to human history, art and culture.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600"},
        {"name": "London Eye", "description": "Giant Ferris wheel on the South Bank of River Thames.", "image_url": "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=600"},
        {"name": "Westminster Abbey", "description": "Gothic abbey church in City of Westminster, London.", "image_url": "https://images.unsplash.com/photo-1599833975787-5d613332275c?w=600"},
    ],
    "china": [
        {"name": "Great Wall of China", "description": "Ancient series of walls built across historical northern borders.", "image_url": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600"},
        {"name": "Forbidden City", "description": "Palace complex in central Beijing, home to Chinese emperors.", "image_url": "https://images.unsplash.com/photo-1537871518640-e82505ad8e73?w=600"},
        {"name": "Terracotta Army", "description": "Collection of terracotta sculptures depicting armies of Qin Shi Huang.", "image_url": "https://images.unsplash.com/photo-1594576722512-582bcd46fba3?w=600"},
        {"name": "Temple of Heaven", "description": "Imperial complex of religious buildings visited by emperors.", "image_url": "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=600"},
        {"name": "Li River", "description": "River in Guangxi famous for karst mountain scenery.", "image_url": "https://images.unsplash.com/photo-1549041840-4021c9eb86ec?w=600"},
        {"name": "Shanghai Bund", "description": "Waterfront area with colonial-era buildings.", "image_url": "https://images.unsplash.com/photo-1537887858907-3b3687e70ca0?w=600"},
        {"name": "Potala Palace", "description": "Dzong fortress in Lhasa, Tibet, winter palace of Dalai Lamas.", "image_url": "https://images.unsplash.com/photo-1537887858907-3b3687e70ca0?w=600"},
        {"name": "Zhangjiajie National Park", "description": "Park with pillar-like rock formations, inspired Avatar's floating mountains.", "image_url": "https://images.unsplash.com/photo-1559564484-e48d68cd2d1f?w=600"},
        {"name": "Summer Palace", "description": "Vast ensemble of lakes, gardens and palaces in Beijing.", "image_url": "https://images.unsplash.com/photo-1537871518640-e82505ad8e73?w=600"},
        {"name": "Yellow Mountains", "description": "Mountain range known for granite peaks and hot springs.", "image_url": "https://images.unsplash.com/photo-1549041840-4021c9eb86ec?w=600"},
    ],
}

async def seed_database():
    print("Starting database seeding...")
    
    # Clear existing data
    await db.countries.delete_many({})
    await db.landmarks.delete_many({})
    print("Cleared existing data")
    
    # Insert countries
    await db.countries.insert_many(COUNTRIES_DATA)
    print(f"Inserted {len(COUNTRIES_DATA)} countries")
    
    # Insert landmarks
    all_landmarks = []
    for country_data in COUNTRIES_DATA:
        country_id = country_data["country_id"]
        country_name = country_data["name"]
        continent = country_data["continent"]
        
        landmarks = LANDMARKS_DATA.get(country_id, [])
        for idx, landmark in enumerate(landmarks):
            landmark_doc = {
                "landmark_id": f"{country_id}_landmark_{idx+1}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": landmark["description"],
                "category": "official",
                "image_url": landmark["image_url"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            all_landmarks.append(landmark_doc)
    
    await db.landmarks.insert_many(all_landmarks)
    print(f"Inserted {len(all_landmarks)} landmarks")
    
    print("Database seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_database())
