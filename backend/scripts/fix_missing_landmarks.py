"""
Fix missing landmarks for 15 countries that only have premium landmarks,
and add premium landmarks to 3 countries that have none.

Each country should have at least 10 official + 2 premium landmarks.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# 15 countries that need 10 official landmarks each
OFFICIAL_LANDMARKS = {
    "austria": {
        "country_name": "Austria",
        "continent": "Europe",
        "landmarks": [
            {"name": "Schönbrunn Palace", "description": "Former imperial summer residence in Vienna with stunning baroque architecture and vast gardens.", "points": 10},
            {"name": "St. Stephen's Cathedral", "description": "Iconic Gothic cathedral in the heart of Vienna, known for its colorful tiled roof.", "points": 10},
            {"name": "Hallstatt Village", "description": "Picturesque lakeside village in the Salzkammergut region, a UNESCO World Heritage Site.", "points": 10},
            {"name": "Belvedere Palace", "description": "Baroque palace complex in Vienna housing an impressive art collection including Klimt's The Kiss.", "points": 10},
            {"name": "Hohensalzburg Fortress", "description": "One of the largest medieval castles in Europe, overlooking the city of Salzburg.", "points": 10},
            {"name": "Innsbruck Old Town", "description": "Historic city center surrounded by the Alps, famous for the Golden Roof balcony.", "points": 10},
            {"name": "Melk Abbey", "description": "Magnificent Benedictine monastery perched above the Danube in the Wachau Valley.", "points": 10},
            {"name": "Vienna State Opera", "description": "One of the world's leading opera houses, a masterpiece of Renaissance Revival architecture.", "points": 10},
            {"name": "Salzburg Old Town", "description": "Mozart's birthplace with a beautifully preserved baroque city center.", "points": 10},
            {"name": "Krimmler Waterfalls", "description": "The highest waterfall in Austria at 380 meters, located in the Hohe Tauern National Park.", "points": 10},
        ]
    },
    "bahamas": {
        "country_name": "Bahamas",
        "continent": "Americas",
        "landmarks": [
            {"name": "Nassau Straw Market", "description": "Vibrant marketplace in downtown Nassau selling handmade straw goods and local crafts.", "points": 10},
            {"name": "Atlantis Paradise Island", "description": "Iconic resort complex featuring marine habitats, water parks, and archaeological-themed exhibits.", "points": 10},
            {"name": "Blue Hole Dean's", "description": "The world's deepest known blue hole at over 200 meters, a renowned diving destination.", "points": 10},
            {"name": "Fort Charlotte", "description": "18th-century British colonial fortress overlooking Nassau harbor with dungeons and a moat.", "points": 10},
            {"name": "Harbour Island Pink Sand Beach", "description": "Famous three-mile stretch of pink-hued sand on Harbour Island's eastern shore.", "points": 10},
            {"name": "Queen's Staircase", "description": "65 hand-carved limestone steps built by enslaved people in the late 1700s in Nassau.", "points": 10},
            {"name": "Andros Barrier Reef", "description": "The third-largest barrier reef in the world, teeming with marine life.", "points": 10},
            {"name": "Pig Beach Big Major Cay", "description": "The original beach where feral pigs swim out to greet visiting boats.", "points": 10},
            {"name": "Clifton Heritage National Park", "description": "Cultural heritage site with Lucayan artifacts, plantation ruins, and underwater sculpture garden.", "points": 10},
            {"name": "Eleuthera Glass Window Bridge", "description": "Narrow land bridge offering dramatic views of the dark Atlantic and calm Caribbean side by side.", "points": 10},
        ]
    },
    "barbados": {
        "country_name": "Barbados",
        "continent": "Americas",
        "landmarks": [
            {"name": "Bathsheba Beach", "description": "Dramatic Atlantic coast beach known for its mushroom-shaped rock formations.", "points": 10},
            {"name": "Bridgetown Historic Garrison", "description": "UNESCO World Heritage Site featuring colonial architecture and a historic military garrison.", "points": 10},
            {"name": "Hunte's Gardens", "description": "Lush tropical garden set in a natural sinkhole, created by horticulturist Anthony Hunte.", "points": 10},
            {"name": "St. Nicholas Abbey", "description": "One of the oldest plantation houses in the Caribbean, dating to 1658.", "points": 10},
            {"name": "Carlisle Bay", "description": "Sheltered bay on the southwest coast with crystal-clear waters and shipwreck snorkeling.", "points": 10},
            {"name": "Cherry Tree Hill", "description": "Scenic viewpoint with panoramic views over the Scotland District and the Atlantic coast.", "points": 10},
            {"name": "Bottom Bay Beach", "description": "Secluded beach framed by towering coral cliffs and swaying palm trees.", "points": 10},
            {"name": "George Washington House", "description": "The only house outside the US where George Washington is known to have stayed.", "points": 10},
            {"name": "Andromeda Botanic Gardens", "description": "Six-acre tropical garden on the east coast with plants from around the world.", "points": 10},
            {"name": "Farley Hill National Park", "description": "Hilltop park with ruins of a grand plantation house and sweeping views of the east coast.", "points": 10},
        ]
    },
    "cambodia": {
        "country_name": "Cambodia",
        "continent": "Asia",
        "landmarks": [
            {"name": "Angkor Wat", "description": "The largest religious monument in the world, a 12th-century Khmer temple masterpiece.", "points": 10},
            {"name": "Bayon Temple", "description": "Ancient temple known for its massive stone faces carved into its towers at Angkor Thom.", "points": 10},
            {"name": "Ta Prohm Temple", "description": "Atmospheric temple engulfed by massive tree roots, famous from Tomb Raider.", "points": 10},
            {"name": "Royal Palace Phnom Penh", "description": "Official residence of the King of Cambodia with stunning Khmer-style architecture.", "points": 10},
            {"name": "Tuol Sleng Genocide Museum", "description": "Former high school turned S-21 prison, now a museum documenting Khmer Rouge atrocities.", "points": 10},
            {"name": "Tonle Sap Lake", "description": "Southeast Asia's largest freshwater lake with floating villages and rich biodiversity.", "points": 10},
            {"name": "Banteay Srei", "description": "10th-century temple renowned for its intricate pink sandstone carvings.", "points": 10},
            {"name": "Kampot Pepper Plantations", "description": "Famous region producing world-renowned Kampot pepper, a prized culinary ingredient.", "points": 10},
            {"name": "Silver Pagoda", "description": "Temple of the Emerald Buddha within the Royal Palace complex, with a diamond-studded Buddha.", "points": 10},
            {"name": "Bokor Hill Station", "description": "Abandoned French colonial hill station with eerie ruins and panoramic views.", "points": 10},
        ]
    },
    "croatia": {
        "country_name": "Croatia",
        "continent": "Europe",
        "landmarks": [
            {"name": "Dubrovnik Old Town", "description": "Stunning medieval walled city on the Adriatic coast, a UNESCO World Heritage Site.", "points": 10},
            {"name": "Plitvice Lakes National Park", "description": "Cascading turquoise lakes and waterfalls connected by wooden walkways through lush forest.", "points": 10},
            {"name": "Diocletian's Palace Split", "description": "Ancient Roman palace built for Emperor Diocletian, now the living heart of Split.", "points": 10},
            {"name": "Hvar Town", "description": "Charming island town with a Venetian-era fortress, lavender fields, and vibrant nightlife.", "points": 10},
            {"name": "Dubrovnik City Walls", "description": "Iconic fortified walls encircling the old city, offering stunning Adriatic views.", "points": 10},
            {"name": "Krka National Park", "description": "National park centered around the Krka River with spectacular waterfalls and swimming areas.", "points": 10},
            {"name": "Zadar Sea Organ", "description": "Architectural sound instrument on the waterfront that plays music from sea waves.", "points": 10},
            {"name": "Rovinj Old Town", "description": "Picturesque Istrian coastal town with cobblestone streets and colorful buildings.", "points": 10},
            {"name": "Arena Pula", "description": "Well-preserved Roman amphitheater from the 1st century, still used for events today.", "points": 10},
            {"name": "Trogir Historic Centre", "description": "UNESCO-listed medieval town on a small island with Romanesque and Gothic architecture.", "points": 10},
        ]
    },
    "cuba": {
        "country_name": "Cuba",
        "continent": "Americas",
        "landmarks": [
            {"name": "Old Havana", "description": "UNESCO World Heritage Site with colorful colonial architecture and classic 1950s cars.", "points": 10},
            {"name": "El Malecon Havana", "description": "Iconic 8-kilometer seawall and promenade along Havana's coast, the city's social hub.", "points": 10},
            {"name": "Varadero Beach", "description": "Cuba's most famous beach resort area with 20 km of pristine white sand.", "points": 10},
            {"name": "El Capitolio", "description": "Neoclassical capitol building in Havana modeled after the US Capitol, now housing the Cuban Academy of Sciences.", "points": 10},
            {"name": "Che Guevara Mausoleum", "description": "Memorial and museum in Santa Clara dedicated to the revolutionary leader.", "points": 10},
            {"name": "Plaza de la Catedral", "description": "Beautiful baroque square in Old Havana dominated by the Cathedral of the Virgin Mary.", "points": 10},
            {"name": "Castillo de los Tres Reyes del Morro", "description": "16th-century fortress guarding the entrance to Havana harbor with panoramic views.", "points": 10},
            {"name": "Valle de los Ingenios", "description": "UNESCO-listed valley near Trinidad with remains of sugar mills and slave plantations.", "points": 10},
            {"name": "Parque Nacional Alejandro de Humboldt", "description": "UNESCO Biosphere Reserve in eastern Cuba with exceptional biodiversity.", "points": 10},
            {"name": "Cienfuegos Historic Centre", "description": "UNESCO-listed city known as the Pearl of the South for its French-influenced architecture.", "points": 10},
        ]
    },
    "denmark": {
        "country_name": "Denmark",
        "continent": "Europe",
        "landmarks": [
            {"name": "Tivoli Gardens", "description": "Historic amusement park in Copenhagen open since 1843, inspiring Walt Disney himself.", "points": 10},
            {"name": "The Little Mermaid Statue", "description": "Iconic bronze sculpture on the Copenhagen waterfront inspired by Hans Christian Andersen's fairy tale.", "points": 10},
            {"name": "Nyhavn", "description": "Colorful 17th-century waterfront district in Copenhagen lined with townhouses and restaurants.", "points": 10},
            {"name": "Christiansborg Palace", "description": "Seat of the Danish Parliament on the islet of Slotsholmen, housing all three branches of government.", "points": 10},
            {"name": "Roskilde Cathedral", "description": "UNESCO-listed brick Gothic cathedral, burial site of Danish monarchs since the 15th century.", "points": 10},
            {"name": "Frederiksborg Castle", "description": "Magnificent Renaissance castle in Hillerød housing the Museum of National History.", "points": 10},
            {"name": "Amalienborg Palace", "description": "Home of the Danish royal family, consisting of four identical rococo palaces around an octagonal courtyard.", "points": 10},
            {"name": "Legoland Billund", "description": "Original Legoland theme park built with over 65 million Lego bricks.", "points": 10},
            {"name": "The Round Tower Copenhagen", "description": "17th-century tower with a spiral ramp leading to an observatory and panoramic city views.", "points": 10},
            {"name": "Skagen", "description": "Northernmost point of Denmark where the North Sea meets the Baltic, known for its light and art colony.", "points": 10},
        ]
    },
    "dominican_republic": {
        "country_name": "Dominican Republic",
        "continent": "Americas",
        "landmarks": [
            {"name": "Zona Colonial Santo Domingo", "description": "The oldest European settlement in the Americas, a UNESCO World Heritage Site.", "points": 10},
            {"name": "Punta Cana Beaches", "description": "World-famous 32-kilometer stretch of white sand beach on the eastern tip of the island.", "points": 10},
            {"name": "Alcázar de Colón", "description": "Palace built by Diego Columbus in 1510, now a museum showcasing colonial-era artifacts.", "points": 10},
            {"name": "Saona Island", "description": "Protected island off the southeast coast known for shallow turquoise waters and starfish.", "points": 10},
            {"name": "Lago Enriquillo", "description": "The largest lake in the Caribbean, home to American crocodiles and rhinoceros iguanas.", "points": 10},
            {"name": "Salto El Limón Waterfall", "description": "Stunning 40-meter waterfall hidden in lush tropical forest near the Samaná Peninsula.", "points": 10},
            {"name": "Cathedral of Santa María la Menor", "description": "The oldest cathedral in the Americas, completed in 1540 in Gothic and baroque styles.", "points": 10},
            {"name": "Bahía de las Águilas", "description": "Remote pristine beach considered one of the most beautiful in the Caribbean.", "points": 10},
            {"name": "Hoyo Azul Punta Cana", "description": "Natural swimming hole with crystal blue water at the base of a limestone cliff.", "points": 10},
            {"name": "Jarabacoa", "description": "Mountain town in the central highlands known as the City of Eternal Spring, gateway to Pico Duarte.", "points": 10},
        ]
    },
    "iceland": {
        "country_name": "Iceland",
        "continent": "Europe",
        "landmarks": [
            {"name": "Blue Lagoon", "description": "World-famous geothermal spa with milky-blue mineral-rich waters near Reykjavik.", "points": 10},
            {"name": "Gullfoss Waterfall", "description": "Majestic two-tiered waterfall on the Hvítá river, part of the Golden Circle route.", "points": 10},
            {"name": "Geysir Geothermal Area", "description": "Home to Strokkur geyser which erupts every 5-10 minutes, shooting water up to 30 meters.", "points": 10},
            {"name": "Thingvellir National Park", "description": "UNESCO site where the Eurasian and North American tectonic plates meet visibly.", "points": 10},
            {"name": "Hallgrímskirkja", "description": "Reykjavik's iconic church with a 74-meter tower offering panoramic views of the city.", "points": 10},
            {"name": "Skógafoss Waterfall", "description": "Powerful 60-meter waterfall on the south coast, one of Iceland's most iconic sights.", "points": 10},
            {"name": "Jökulsárlón Glacier Lagoon", "description": "Stunning glacial lagoon filled with floating icebergs calved from Breiðamerkurjökull glacier.", "points": 10},
            {"name": "Seljalandsfoss Waterfall", "description": "Unique waterfall where visitors can walk behind the 60-meter cascade.", "points": 10},
            {"name": "Reynisfjara Black Sand Beach", "description": "Dramatic volcanic beach with dark basalt columns and powerful Atlantic waves.", "points": 10},
            {"name": "Diamond Beach", "description": "Black sand beach where icebergs from Jökulsárlón wash ashore, glistening like diamonds.", "points": 10},
        ]
    },
    "jamaica": {
        "country_name": "Jamaica",
        "continent": "Americas",
        "landmarks": [
            {"name": "Dunn's River Falls", "description": "Iconic 180-meter tiered waterfall near Ocho Rios that visitors can climb.", "points": 10},
            {"name": "Bob Marley Museum Kingston", "description": "Former home of Bob Marley, now a museum dedicated to the reggae legend's life and music.", "points": 10},
            {"name": "Seven Mile Beach Negril", "description": "Famous long stretch of white sand beach on Jamaica's western coast.", "points": 10},
            {"name": "Blue Hole Ocho Rios", "description": "Hidden natural swimming hole with turquoise water surrounded by lush jungle.", "points": 10},
            {"name": "Port Royal", "description": "Historic pirate capital once called the wickedest city on earth, largely destroyed by earthquake in 1692.", "points": 10},
            {"name": "Rose Hall Great House", "description": "Restored Georgian mansion famous for the legend of the White Witch of Rose Hall.", "points": 10},
            {"name": "Rick's Cafe Negril", "description": "Legendary cliff-side bar famous for sunset views and cliff jumping.", "points": 10},
            {"name": "Martha Brae River", "description": "Scenic river offering bamboo rafting through lush tropical vegetation.", "points": 10},
            {"name": "Devon House Kingston", "description": "Historic mansion and national heritage site known for its gardens and famous ice cream.", "points": 10},
            {"name": "YS Falls", "description": "Seven cascading waterfalls in the St. Elizabeth parish surrounded by tropical forest.", "points": 10},
        ]
    },
    "nepal": {
        "country_name": "Nepal",
        "continent": "Asia",
        "landmarks": [
            {"name": "Boudhanath Stupa", "description": "One of the largest spherical stupas in the world, a UNESCO-listed Buddhist pilgrimage site.", "points": 10},
            {"name": "Pashupatinath Temple", "description": "Sacred Hindu temple complex on the banks of the Bagmati River in Kathmandu.", "points": 10},
            {"name": "Durbar Square Kathmandu", "description": "Historic plaza with ancient temples, palaces, and courtyards from the Malla period.", "points": 10},
            {"name": "Swayambhunath Monkey Temple", "description": "Ancient hilltop stupa overlooking Kathmandu valley, one of the oldest religious sites in Nepal.", "points": 10},
            {"name": "Chitwan National Park", "description": "UNESCO World Heritage Site with one-horned rhinos, Bengal tigers, and rich biodiversity.", "points": 10},
            {"name": "Pokhara Lakeside", "description": "Scenic lakeside town with views of the Annapurna range reflected in Phewa Lake.", "points": 10},
            {"name": "Lumbini", "description": "Birthplace of Siddhartha Gautama (Buddha), a UNESCO World Heritage pilgrimage site.", "points": 10},
            {"name": "Bhaktapur Durbar Square", "description": "Medieval city center with exquisite Newar architecture and the 55-Window Palace.", "points": 10},
            {"name": "Patan Durbar Square", "description": "Historic square in Lalitpur known for fine Newar art, metalwork, and stone carvings.", "points": 10},
            {"name": "Nagarkot", "description": "Hilltop village east of Kathmandu offering panoramic views of the Himalayan range including Everest.", "points": 10},
        ]
    },
    "philippines": {
        "country_name": "Philippines",
        "continent": "Asia",
        "landmarks": [
            {"name": "Chocolate Hills Bohol", "description": "Over 1,200 cone-shaped hills that turn brown in dry season, a geological wonder.", "points": 10},
            {"name": "Tubbataha Reefs Natural Park", "description": "UNESCO marine sanctuary in the Sulu Sea with pristine coral reefs and marine biodiversity.", "points": 10},
            {"name": "Intramuros Manila", "description": "Historic walled city in Manila built during the Spanish colonial period.", "points": 10},
            {"name": "Banaue Rice Terraces", "description": "2,000-year-old rice terraces carved into the mountains by Ifugao ancestors.", "points": 10},
            {"name": "Mayon Volcano", "description": "Active volcano near Legazpi known for its near-perfect cone shape.", "points": 10},
            {"name": "Coron Island", "description": "Island with crystal-clear lakes, World War II shipwreck diving, and dramatic limestone cliffs.", "points": 10},
            {"name": "Boracay White Beach", "description": "World-famous four-kilometer stretch of powdery white sand and turquoise water.", "points": 10},
            {"name": "Vigan Historic Town", "description": "UNESCO World Heritage colonial town with well-preserved Spanish-era cobblestone streets.", "points": 10},
            {"name": "Kawasan Falls Cebu", "description": "Multi-tiered turquoise waterfall in a lush canyon, popular for canyoneering adventures.", "points": 10},
            {"name": "San Agustin Church Manila", "description": "Oldest stone church in the Philippines, a UNESCO World Heritage baroque masterpiece from 1607.", "points": 10},
        ]
    },
    "sri_lanka": {
        "country_name": "Sri Lanka",
        "continent": "Asia",
        "landmarks": [
            {"name": "Temple of the Sacred Tooth Relic", "description": "Revered Buddhist temple in Kandy housing a relic of the tooth of Buddha.", "points": 10},
            {"name": "Galle Fort", "description": "UNESCO-listed 16th-century Dutch colonial fort on the southwestern coast.", "points": 10},
            {"name": "Dambulla Cave Temple", "description": "Rock temple complex with 153 Buddha statues and centuries-old murals in five caves.", "points": 10},
            {"name": "Yala National Park", "description": "Sri Lanka's most visited national park with the highest density of leopards in the world.", "points": 10},
            {"name": "Adam's Peak", "description": "Sacred 2,243-meter mountain with a footprint-shaped formation revered by multiple religions.", "points": 10},
            {"name": "Polonnaruwa Ancient City", "description": "UNESCO-listed ruins of the second ancient capital of Sri Lanka with well-preserved Buddhist monuments.", "points": 10},
            {"name": "Ella Rock", "description": "Popular hiking destination in the hill country with panoramic views of tea plantations and valleys.", "points": 10},
            {"name": "Kandy Lake", "description": "Artificial lake in the heart of Kandy, built by the last king of the Kandyan kingdom.", "points": 10},
            {"name": "Mirissa Whale Watching", "description": "Top whale watching destination where blue whales and dolphins are regularly spotted.", "points": 10},
            {"name": "Anuradhapura Sacred City", "description": "UNESCO World Heritage ancient city with ruins spanning over 1,000 years of Buddhist civilization.", "points": 10},
        ]
    },
    "sweden": {
        "country_name": "Sweden",
        "continent": "Europe",
        "landmarks": [
            {"name": "Vasa Museum Stockholm", "description": "Maritime museum housing the Vasa, a nearly intact 17th-century warship salvaged from the harbor.", "points": 10},
            {"name": "Gamla Stan Stockholm", "description": "Stockholm's medieval old town with narrow cobblestone streets and colorful buildings from the 1200s.", "points": 10},
            {"name": "Stockholm City Hall", "description": "Iconic red-brick building where the Nobel Prize banquet is held annually.", "points": 10},
            {"name": "Drottningholm Palace", "description": "UNESCO-listed royal residence on Lake Mälaren, Sweden's best-preserved royal palace.", "points": 10},
            {"name": "Abisko National Park", "description": "Arctic national park in Swedish Lapland, one of the best places on Earth to see the Northern Lights.", "points": 10},
            {"name": "Göta Canal", "description": "190-kilometer waterway connecting the east and west coasts of Sweden, a masterpiece of engineering.", "points": 10},
            {"name": "Turning Torso Malmö", "description": "Scandinavia's tallest building, a twisting 190-meter neo-futurist skyscraper.", "points": 10},
            {"name": "Kiruna Church", "description": "Distinctive wooden church voted Sweden's most beautiful building before the town's relocation.", "points": 10},
            {"name": "Uppsala Cathedral", "description": "Scandinavia's largest cathedral, a 13th-century Gothic masterpiece and burial site of Swedish kings.", "points": 10},
            {"name": "Gotland Visby", "description": "UNESCO-listed medieval Hanseatic town with well-preserved city walls on the island of Gotland.", "points": 10},
        ]
    },
    "taiwan": {
        "country_name": "Taiwan",
        "continent": "Asia",
        "landmarks": [
            {"name": "Taipei 101", "description": "Iconic 509-meter supertall skyscraper that was the world's tallest building from 2004 to 2010.", "points": 10},
            {"name": "Jiufen Old Street", "description": "Atmospheric mountain town with narrow alleyways, teahouses, and stunning coastal views.", "points": 10},
            {"name": "National Palace Museum", "description": "World-class museum housing one of the largest collections of Chinese art and artifacts.", "points": 10},
            {"name": "Alishan Forest Railway", "description": "Historic narrow-gauge mountain railway through misty cypress forests, famous for sunrise views.", "points": 10},
            {"name": "Chiang Kai-shek Memorial Hall", "description": "Monumental landmark in Taipei dedicated to the former president, set in a grand plaza.", "points": 10},
            {"name": "Kenting National Park", "description": "Taiwan's southernmost national park with tropical beaches, coral reefs, and lush forests.", "points": 10},
            {"name": "Longshan Temple", "description": "Ornate 18th-century temple in Taipei's Wanhua district, one of Taiwan's most important temples.", "points": 10},
            {"name": "Yehliu Geopark", "description": "Coastal park with extraordinary rock formations shaped by erosion, including the famous Queen's Head.", "points": 10},
            {"name": "Shifen Waterfall", "description": "Horseshoe-shaped 20-meter waterfall often called the Little Niagara of Taiwan.", "points": 10},
            {"name": "Fo Guang Shan Buddha Museum", "description": "Grand Buddhist complex in Kaohsiung with a 108-meter-tall golden Buddha statue.", "points": 10},
        ]
    },
}

# Premium landmarks for countries that have 0 premium
PREMIUM_ADDITIONS = {
    "brazil": {
        "country_name": "Brazil",
        "continent": "South America",
        "landmarks": [
            {"name": "Chapada Diamantina", "description": "Stunning table-top mountains with caves, waterfalls, and natural pools in Bahia.", "points": 25},
            {"name": "Anavilhanas Archipelago", "description": "The world's largest freshwater archipelago in the Rio Negro with over 400 islands.", "points": 25},
        ]
    },
    "greece": {
        "country_name": "Greece",
        "continent": "Europe",
        "landmarks": [
            {"name": "Samaria Gorge", "description": "Europe's longest gorge at 16 km in Crete, a challenging hike through dramatic landscapes.", "points": 25},
            {"name": "Shipwreck Beach Zakynthos", "description": "Iconic beach accessible only by boat, with a rusted shipwreck on white sand below towering cliffs.", "points": 25},
        ]
    },
    "south_africa": {
        "country_name": "South Africa",
        "continent": "Africa",
        "landmarks": [
            {"name": "Cango Caves", "description": "Spectacular underground dripstone caverns in the Swartberg mountains near Oudtshoorn.", "points": 25},
            {"name": "Wild Coast Transkei", "description": "Rugged and remote coastline with dramatic cliffs, the Hole in the Wall formation, and rolling green hills.", "points": 25},
        ]
    },
}

# Default image for landmarks
DEFAULT_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400"


async def fix_landmarks():
    print("=" * 60)
    print("FIXING MISSING LANDMARKS")
    print("=" * 60)
    
    # First, get ALL existing landmark names to check for duplicates
    all_landmarks = await db.landmarks.find({}, {"_id": 0, "name": 1, "country_id": 1}).to_list(10000)
    existing_names = {}
    for lm in all_landmarks:
        normalized = lm["name"].lower().strip()
        if normalized not in existing_names:
            existing_names[normalized] = []
        existing_names[normalized].append(lm["country_id"])
    
    print(f"\nExisting landmarks in database: {len(all_landmarks)}")
    
    # Add official landmarks for 15 countries
    total_added = 0
    total_skipped = 0
    
    print("\n--- Adding Official Landmarks ---")
    for country_id, data in OFFICIAL_LANDMARKS.items():
        added = 0
        skipped = 0
        
        for idx, landmark in enumerate(data["landmarks"]):
            normalized_name = landmark["name"].lower().strip()
            
            # Check for exact duplicate
            if normalized_name in existing_names:
                print(f"  SKIP (duplicate): {landmark['name']} in {data['country_name']} "
                      f"(exists in {existing_names[normalized_name]})")
                skipped += 1
                total_skipped += 1
                continue
            
            # Check for near-duplicates (one name contained in another, same country)
            is_near_dup = False
            for existing_name, existing_countries in existing_names.items():
                if country_id in existing_countries:
                    # Check if names are very similar
                    if (normalized_name in existing_name or existing_name in normalized_name) and len(normalized_name) > 5:
                        print(f"  SKIP (near-dup): {landmark['name']} ~ {existing_name} in {data['country_name']}")
                        is_near_dup = True
                        skipped += 1
                        total_skipped += 1
                        break
            
            if is_near_dup:
                continue
            
            doc = {
                "landmark_id": f"{country_id}_official_{idx+1}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": data["country_name"],
                "continent": data["continent"],
                "description": landmark["description"],
                "category": "official",
                "image_url": DEFAULT_IMAGE,
                "images": [DEFAULT_IMAGE],
                "facts": [{"text": f"A must-visit landmark in {data['country_name']}!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Easy",
                "latitude": None,
                "longitude": None,
                "points": landmark["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            
            await db.landmarks.insert_one(doc)
            existing_names[normalized_name] = [country_id]
            added += 1
            total_added += 1
        
        print(f"  {data['country_name']}: +{added} official landmarks (skipped {skipped})")
    
    # Add premium landmarks for 3 countries missing them
    print("\n--- Adding Premium Landmarks ---")
    for country_id, data in PREMIUM_ADDITIONS.items():
        added = 0
        skipped = 0
        
        for idx, landmark in enumerate(data["landmarks"]):
            normalized_name = landmark["name"].lower().strip()
            
            if normalized_name in existing_names:
                print(f"  SKIP (duplicate): {landmark['name']} in {data['country_name']}")
                skipped += 1
                total_skipped += 1
                continue
            
            # Near-duplicate check
            is_near_dup = False
            for existing_name, existing_countries in existing_names.items():
                if country_id in existing_countries:
                    if (normalized_name in existing_name or existing_name in normalized_name) and len(normalized_name) > 5:
                        print(f"  SKIP (near-dup): {landmark['name']} ~ {existing_name}")
                        is_near_dup = True
                        skipped += 1
                        total_skipped += 1
                        break
            
            if is_near_dup:
                continue
            
            doc = {
                "landmark_id": f"{country_id}_premium_extra_{idx+1}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": data["country_name"],
                "continent": data["continent"],
                "description": landmark["description"],
                "category": "premium",
                "image_url": DEFAULT_IMAGE,
                "images": [DEFAULT_IMAGE],
                "facts": [{"text": f"Worth {landmark['points']} points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Moderate",
                "latitude": None,
                "longitude": None,
                "points": landmark["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            
            await db.landmarks.insert_one(doc)
            existing_names[normalized_name] = [country_id]
            added += 1
            total_added += 1
        
        print(f"  {data['country_name']}: +{added} premium landmarks (skipped {skipped})")
    
    # Final verification
    print("\n" + "=" * 60)
    print("FINAL VERIFICATION")
    print("=" * 60)
    
    total_landmarks = await db.landmarks.count_documents({})
    total_countries = await db.countries.count_documents({})
    total_premium = await db.landmarks.count_documents({"category": "premium"})
    total_official = total_landmarks - total_premium
    
    print(f"\nTotal countries: {total_countries}")
    print(f"Total landmarks: {total_landmarks}")
    print(f"  Official: {total_official}")
    print(f"  Premium: {total_premium}")
    print(f"\nAdded: {total_added}, Skipped: {total_skipped}")
    
    # Check per-country distribution
    print(f"\n{'Country':<25} {'Official':>8} {'Premium':>8} {'Total':>8}")
    print("-" * 55)
    
    countries = await db.countries.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    warnings = []
    for c in countries:
        cid = c["country_id"]
        official = await db.landmarks.count_documents({"country_id": cid, "category": {"$ne": "premium"}})
        premium = await db.landmarks.count_documents({"country_id": cid, "category": "premium"})
        total = official + premium
        flag = ""
        if total < 10:
            flag = " ⚠️ LOW"
            warnings.append(c["name"])
        elif premium == 0:
            flag = " ⚠️ NO PREMIUM"
            warnings.append(c["name"])
        print(f"{c['name']:<25} {official:>8} {premium:>8} {total:>8}{flag}")
    
    if warnings:
        print(f"\n⚠️  Countries needing attention: {', '.join(warnings)}")
    else:
        print(f"\n✅ All countries have sufficient landmarks!")


if __name__ == "__main__":
    asyncio.run(fix_landmarks())
