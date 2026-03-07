# Premium landmark fill script - adds missing premiums to reach 5 per country
# Run: cd /app/backend && python3 scripts/fill_premiums.py

import asyncio, os
from datetime import datetime, timezone
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Extra premium landmarks keyed by country_id
# Only entries needed to fill gaps will be used
FILL = {
    "egypt": [
        {"name": "Siwa Oasis", "description": "Remote desert oasis with ancient Oracle Temple and salt lakes.", "points": 25},
        {"name": "Red Sea Coral Reefs", "description": "World-class diving with vibrant coral walls and tropical fish.", "points": 25},
    ],
    "morocco": [
        {"name": "Chefchaouen Blue City", "description": "Magical blue-painted mountain medina in the Rif Mountains.", "points": 25},
        {"name": "Ait Benhaddou Kasbah", "description": "UNESCO fortified village used in many Hollywood films.", "points": 25},
        {"name": "Todra Gorge", "description": "Dramatic narrow canyon with 300m limestone walls.", "points": 25},
    ],
    "south_africa": [
        {"name": "Winelands Stellenbosch", "description": "Historic Cape Dutch wine estates surrounded by mountains.", "points": 25},
    ],
    "kenya": [
        {"name": "Lamu Old Town", "description": "UNESCO Swahili settlement with no cars, only donkeys.", "points": 25},
        {"name": "Diani Beach", "description": "Pristine white sand beach on the Indian Ocean coast.", "points": 25},
    ],
    "tanzania": [
        {"name": "Ngorongoro Crater Floor", "description": "Drive into the world's largest intact volcanic caldera with Big Five.", "points": 25},
        {"name": "Mafia Island Marine Park", "description": "Remote island with whale shark encounters and pristine reefs.", "points": 25},
    ],
    "botswana": [
        {"name": "Makgadikgadi Salt Pans", "description": "Vast prehistoric lake bed with meerkat encounters and quad biking.", "points": 25},
        {"name": "Tsodilo Hills Rock Art", "description": "UNESCO site with over 4,500 rock paintings, the Louvre of the Desert.", "points": 25},
        {"name": "Central Kalahari Game Reserve", "description": "Remote desert reserve with black-maned lions and San Bushmen heritage.", "points": 25},
    ],
    "namibia": [
        {"name": "Skeleton Coast", "description": "Haunting Atlantic coastline with shipwrecks and desert elephants.", "points": 25},
        {"name": "Fish River Canyon", "description": "World's second-largest canyon with epic multi-day hiking trail.", "points": 25},
    ],
    "tunisia": [
        {"name": "Sidi Bou Said", "description": "Clifftop village with blue-and-white architecture overlooking the sea.", "points": 25},
        {"name": "El Jem Amphitheatre", "description": "Third-largest Roman amphitheatre in the world, remarkably preserved.", "points": 25},
        {"name": "Ksar Ouled Soltane Granary", "description": "Multi-story Berber granary used as Star Wars filming location.", "points": 25},
    ],
    "usa": [
        {"name": "Glacier National Park", "description": "Crown of the Continent with pristine forests and alpine meadows.", "points": 25},
        {"name": "Sedona Red Rocks", "description": "Stunning red sandstone formations with spiritual energy vortexes.", "points": 25},
    ],
    "canada": [
        {"name": "Peggy's Cove Lighthouse", "description": "Iconic lighthouse on wave-swept granite in Nova Scotia.", "points": 25},
    ],
    "mexico": [
        {"name": "Copper Canyon", "description": "Series of canyons larger and deeper than the Grand Canyon.", "points": 25},
        {"name": "Hierve el Agua", "description": "Petrified waterfall formations with natural infinity pools.", "points": 25},
    ],
    "brazil": [
        {"name": "Pantanal Wetlands", "description": "World's largest tropical wetland with jaguars and caimans.", "points": 25},
        {"name": "Fernando de Noronha", "description": "Volcanic archipelago with the world's best beach and diving.", "points": 25},
    ],
    "peru": [
        {"name": "Kuelap Fortress", "description": "Ancient walled city in the clouds, rival to Machu Picchu.", "points": 25},
    ],
    "argentina": [
        {"name": "Perito Moreno Glacier", "description": "Advancing glacier that calves dramatically into Lake Argentino.", "points": 25},
        {"name": "Salta Wine Route", "description": "World's highest vineyards producing exceptional Torrontes wine.", "points": 25},
    ],
    "chile": [
        {"name": "Easter Island Moai", "description": "Mysterious 887 stone statues on the world's most remote island.", "points": 25},
        {"name": "Torres del Paine W Trek", "description": "Multi-day trek past towers, glaciers and turquoise lakes.", "points": 25},
        {"name": "Atacama Stargazing", "description": "Clearest skies on Earth for astronomical observation.", "points": 25},
    ],
    "colombia": [
        {"name": "Cocora Valley Wax Palms", "description": "Valley with the world's tallest palm trees reaching 60m.", "points": 25},
    ],
    "ecuador": [
        {"name": "Mindo Cloud Forest", "description": "Biodiversity hotspot with hummingbirds and chocolate tours.", "points": 25},
        {"name": "Quilotoa Crater Lake", "description": "Stunning turquoise volcanic crater lake in the Andes.", "points": 25},
        {"name": "Galapagos Underwater", "description": "Dive with hammerhead sharks and marine iguanas.", "points": 25},
    ],
    "costa_rica": [
        {"name": "Corcovado National Park", "description": "Most biologically intense place on Earth per National Geographic.", "points": 25},
        {"name": "Rio Celeste Blue River", "description": "River that turns sky blue from volcanic minerals.", "points": 25},
        {"name": "Monteverde Cloud Forest", "description": "Misty highland forest with quetzals and hanging bridges.", "points": 25},
        {"name": "Arenal Volcano Hot Springs", "description": "Natural hot springs heated by the active Arenal Volcano.", "points": 25},
    ],
    "panama": [
        {"name": "San Blas Islands Kuna", "description": "Indigenous Guna Yala archipelago with pristine islands.", "points": 25},
        {"name": "Coiba Island Diving", "description": "UNESCO island with pristine Pacific reef and whale sharks.", "points": 25},
        {"name": "Boquete Cloud Forest", "description": "Highland coffee region with quetzal bird watching.", "points": 25},
    ],
    "bahamas": [
        {"name": "Dean's Blue Hole", "description": "World's second-deepest blue hole at 202m on Long Island.", "points": 25},
        {"name": "Andros Barrier Reef", "description": "Third-largest barrier reef in the world with blue holes.", "points": 25},
        {"name": "Eleuthera Glass Window Bridge", "description": "Narrow bridge where dark Atlantic meets turquoise Caribbean.", "points": 25},
    ],
    "barbados": [
        {"name": "Bathsheba Soup Bowl", "description": "World-class surf spot with dramatic boulder-strewn beach.", "points": 25},
        {"name": "St. Nicholas Abbey", "description": "One of three Jacobean mansions in the Western Hemisphere.", "points": 25},
        {"name": "Hunte's Gardens", "description": "Enchanting garden in a collapsed cave with tropical plants.", "points": 25},
    ],
    "cuba": [
        {"name": "Cayo Largo del Sur", "description": "Pristine uninhabited island with powder-white beaches.", "points": 25},
        {"name": "Pinar del Rio Tobacco", "description": "World's finest tobacco-growing region with cigar factory tours.", "points": 25},
        {"name": "Bahia de Cochinos", "description": "Bay of Pigs with excellent snorkeling and cenote diving.", "points": 25},
    ],
    "dominican_republic": [
        {"name": "Bahia de las Aguilas", "description": "Most pristine beach in the Caribbean, only reachable by boat.", "points": 25},
        {"name": "Larimar Mines Baoruco", "description": "World's only source of the rare blue pectolite gemstone.", "points": 25},
        {"name": "Salto de Limon", "description": "52m waterfall reached by horseback through lush jungle.", "points": 25},
    ],
    "jamaica": [
        {"name": "Reach Falls", "description": "Pristine cascading waterfall with natural heart-shaped pool.", "points": 25},
        {"name": "Cockpit Country", "description": "Unique karst landscape with caves and endemic species.", "points": 25},
        {"name": "Port Royal Sunken City", "description": "Submerged pirate city, the Pompeii of the Caribbean.", "points": 25},
    ],
    "japan": [
        {"name": "Yakushima Cedar Forests", "description": "Ancient cedar forests on a mystical island that inspired Miyazaki.", "points": 25},
    ],
    "china": [
        {"name": "Longmen Grottoes", "description": "100,000 Buddhist stone statues carved into limestone cliffs.", "points": 25},
        {"name": "Rainbow Mountains Zhangye", "description": "Surreal striped sandstone mountains in Gansu province.", "points": 25},
    ],
    "thailand": [
        {"name": "Sukhothai Historical Park", "description": "UNESCO ruins of the first Siamese kingdom with serene Buddha statues.", "points": 25},
        {"name": "Khao Sok Cheow Lan Lake", "description": "Floating bungalows on emerald lake surrounded by limestone karsts.", "points": 25},
    ],
    "india": [
        {"name": "Ladakh Pangong Lake", "description": "Surreal high-altitude lake changing colors at 4,350m.", "points": 25},
        {"name": "Rann of Kutch White Desert", "description": "Vast white salt desert that transforms into an island during monsoon.", "points": 25},
    ],
    "singapore": [
        {"name": "Henderson Waves Bridge", "description": "Highest pedestrian bridge in Singapore with undulating wave design.", "points": 25},
        {"name": "Kampong Glam Heritage", "description": "Malay-Arab quarter with Sultan Mosque and vibrant Haji Lane.", "points": 25},
    ],
    "indonesia": [
        {"name": "Nusa Penida Kelingking Beach", "description": "T-Rex shaped cliff with turquoise waters off Bali.", "points": 25},
        {"name": "Derawan Islands", "description": "Remote archipelago with stingless jellyfish lake in East Kalimantan.", "points": 25},
    ],
    "south_korea": [
        {"name": "Haeinsa Temple Tripitaka", "description": "UNESCO temple housing 80,000 wooden printing blocks of Buddhist scriptures.", "points": 25},
        {"name": "Boryeong Mud Festival", "description": "Famous annual festival at Daecheon Beach with therapeutic mud.", "points": 25},
        {"name": "Gamcheon Culture Village", "description": "Colorful hillside village in Busan, the Machu Picchu of the East.", "points": 25},
    ],
    "vietnam": [
        {"name": "Phong Nha Cave System", "description": "World's largest cave passage at Son Doong, requires expedition.", "points": 25},
        {"name": "Sapa Hill Tribe Homestay", "description": "Overnight with Hmong or Dao families among terraced rice fields.", "points": 25},
    ],
    "malaysia": [
        {"name": "Semporna Stilt Villages", "description": "Bajau Sea Gypsy villages on stilts with crystal-clear waters.", "points": 25},
        {"name": "Danum Valley Rainforest", "description": "130-million-year-old primary rainforest with pygmy elephants.", "points": 25},
    ],
    "cambodia": [
        {"name": "Cardamom Mountains", "description": "Southeast Asia's largest intact rainforest with community treks.", "points": 25},
        {"name": "Sambor Prei Kuk", "description": "UNESCO pre-Angkorian temple complex hidden in the forest.", "points": 25},
        {"name": "Kampot Pepper Plantations", "description": "World's finest pepper grown in organic farms by the river.", "points": 25},
    ],
    "nepal": [
        {"name": "Upper Mustang Trek", "description": "Former forbidden kingdom with Tibetan culture and desert canyons.", "points": 25},
        {"name": "Bardia National Park", "description": "Remote jungle park with tigers and wild elephants.", "points": 25},
        {"name": "Gosaikunda Sacred Lakes", "description": "Alpine lakes sacred to Hindus at 4,380m altitude.", "points": 25},
    ],
    "philippines": [
        {"name": "Apo Island Sea Turtles", "description": "Swim with hundreds of green sea turtles at this marine sanctuary.", "points": 25},
        {"name": "Sagada Hanging Coffins", "description": "Ancient burial practice of hanging coffins on cliff faces.", "points": 25},
        {"name": "Coron Shipwreck Diving", "description": "WWII Japanese shipwrecks in crystal-clear Palawan waters.", "points": 25},
    ],
    "sri_lanka": [
        {"name": "Knuckles Mountain Range", "description": "UNESCO cloud forest with endemic species and misty peaks.", "points": 25},
        {"name": "Arugam Bay Surf", "description": "World-class surf point break on the east coast.", "points": 25},
        {"name": "Minneriya Elephant Gathering", "description": "Largest wild elephant gathering on Earth during dry season.", "points": 25},
    ],
    "taiwan": [
        {"name": "Penghu Basalt Columns", "description": "Dramatic volcanic columns on archipelago islands.", "points": 25},
        {"name": "Tainan Temple Trail", "description": "Oldest city with over 200 temples and best street food.", "points": 25},
        {"name": "Wuling Farm Cherry Blossoms", "description": "Highland farm with spectacular cherry blossom season.", "points": 25},
    ],
    "france": [
        {"name": "Gorges du Verdon", "description": "Europe's Grand Canyon with turquoise river and kayaking.", "points": 25},
        {"name": "Dune of Pilat", "description": "Europe's tallest sand dune on the Atlantic coast.", "points": 25},
        {"name": "Colmar Petit Venice", "description": "Fairytale Alsatian town with half-timbered houses on canals.", "points": 25},
    ],
    "italy": [
        {"name": "Lake Como Villas", "description": "Y-shaped Alpine lake surrounded by elegant villas and gardens.", "points": 25},
        {"name": "Matera Sassi Cave Dwellings", "description": "UNESCO cave city, one of the oldest continuously inhabited places.", "points": 25},
    ],
    "spain": [
        {"name": "Caminito del Rey Walkway", "description": "Thrilling pathway pinned to gorge walls 100m above the river.", "points": 25},
        {"name": "Ronda Bridge", "description": "Bridge spanning a 120m gorge connecting old and new town.", "points": 25},
    ],
    "uk": [
        {"name": "Jurassic Coast", "description": "185-million-year-old UNESCO coastline with fossil hunting.", "points": 25},
    ],
    "germany": [
        {"name": "Neuschwanstein Castle", "description": "Fairy-tale castle that inspired Disney's Sleeping Beauty Castle.", "points": 25},
        {"name": "Bastei Bridge", "description": "Dramatic sandstone bridge 194m above the Elbe River.", "points": 25},
        {"name": "Black Forest Cuckoo Trail", "description": "Scenic trail through dark evergreen forests and traditional villages.", "points": 25},
    ],
    "greece": [
        {"name": "Santorini Caldera Walk", "description": "Scenic trail along volcanic rim from Fira to Oia.", "points": 25},
    ],
    "switzerland": [
        {"name": "Oeschinen Lake", "description": "Stunning Alpine lake surrounded by towering rock faces.", "points": 25},
        {"name": "Creux du Van", "description": "Natural rock amphitheatre with ibex and 160m vertical cliffs.", "points": 25},
    ],
    "netherlands": [
        {"name": "Giethoorn Village", "description": "The Venice of the North with no roads, only canals.", "points": 25},
        {"name": "Hoge Veluwe National Park", "description": "Vast park with Kroller-Muller Museum and free white bicycles.", "points": 25},
    ],
    "portugal": [
        {"name": "Azores Whale Watching", "description": "Mid-Atlantic islands with sperm whales and volcanic calderas.", "points": 25},
        {"name": "Madeira Levada Walks", "description": "Unique irrigation channel walks through laurel forests.", "points": 25},
        {"name": "Cabo Espichel Dinosaur Tracks", "description": "Jurassic dinosaur footprints on dramatic sea cliffs.", "points": 25},
    ],
    "finland": [
        {"name": "Lake Saimaa Seal Watching", "description": "Home to the world's rarest seal species in the lake district.", "points": 25},
    ],
    "austria": [
        {"name": "Green Lake Tragoss", "description": "Seasonal lake that submerges a park, creating an underwater world.", "points": 25},
    ],
    "croatia": [
        {"name": "Vis Island Military Tunnels", "description": "Secret Yugoslav military tunnels converted to adventure tourism.", "points": 25},
    ],
    "mauritius": [
        {"name": "Black River Gorges", "description": "National park with endemic birds and stunning canyon viewpoints.", "points": 25},
        {"name": "Le Morne Brabant", "description": "UNESCO mountain with tragic history and world-class kitesurfing.", "points": 25},
        {"name": "Chamarel Rum Distillery", "description": "Award-winning artisanal rum from sugarcane fields.", "points": 25},
    ],
    "seychelles": [
        {"name": "Vallee de Mai Palm Forest", "description": "UNESCO prehistoric palm forest with the legendary coco de mer.", "points": 25},
        {"name": "Anse Source d'Argent", "description": "World's most photographed beach with granite boulders.", "points": 25},
    ],
    "australia": [
        {"name": "Cradle Mountain Tasmania", "description": "Iconic alpine wilderness with wombats and ancient pines.", "points": 25},
        {"name": "Horizontal Falls Kimberley", "description": "Tidal waterfalls through narrow gorges in remote Western Australia.", "points": 25},
    ],
    "new_zealand": [
        {"name": "Milford Sound", "description": "Fiord carved by glaciers with waterfalls and dolphins.", "points": 25},
        {"name": "Tongariro Alpine Crossing", "description": "One-day volcanic hike past emerald lakes and red craters.", "points": 25},
    ],
    "fiji": [
        {"name": "Navua River Rafting", "description": "White water rafting through lush gorges and waterfalls.", "points": 25},
        {"name": "Taveuni Rainbow Reef", "description": "Soft coral capital of the world with vibrant diving.", "points": 25},
        {"name": "Sigatoka Sand Dunes", "description": "National park with ancient Lapita pottery burial sites.", "points": 25},
    ],
    "french_polynesia": [
        {"name": "Tetiaroa Atoll", "description": "Marlon Brando's private island, now luxury eco-resort.", "points": 25},
        {"name": "Huahine Sacred Sites", "description": "The Garden of Eden with ancient marae temple platforms.", "points": 25},
    ],
    "cook_islands": [
        {"name": "Aitutaki Lagoon", "description": "One of the most beautiful lagoons in the world.", "points": 25},
        {"name": "Te Rua Manga (The Needle)", "description": "Dramatic basalt peak hike in the interior of Rarotonga.", "points": 25},
        {"name": "Muri Beach Night Market", "description": "Weekly beachside market with local food and music.", "points": 25},
    ],
    "samoa": [
        {"name": "To Sua Ocean Trench", "description": "Giant swimming hole connected to the ocean by a lava tube.", "points": 25},
        {"name": "Lalomanu Beach", "description": "Pristine white sand beach rated among the world's best.", "points": 25},
        {"name": "Piula Cave Pool", "description": "Freshwater swimming pool inside a cave beneath a church.", "points": 25},
        {"name": "Robert Louis Stevenson Museum", "description": "Former home of the Treasure Island author, now a museum.", "points": 25},
    ],
    "vanuatu": [
        {"name": "Pentecost Land Diving", "description": "Original bungee jumping where men dive from wooden towers.", "points": 25},
        {"name": "SS President Coolidge Wreck", "description": "World's most accessible large WWII wreck dive.", "points": 25},
        {"name": "Champagne Beach", "description": "Pristine beach with bubbling volcanic gases in the sand.", "points": 25},
    ],
}


async def fill_premiums():
    print("Filling premium landmarks to 5 per country...\n")
    total_added = 0

    for country_id, premiums in FILL.items():
        country = await db.countries.find_one({"country_id": country_id})
        if not country:
            continue

        existing_premium = await db.landmarks.count_documents({"country_id": country_id, "category": "premium"})
        needed = 5 - existing_premium
        if needed <= 0:
            continue

        # Get ALL existing landmark names for duplicate check
        existing_names = set()
        async for lm in db.landmarks.find({"country_id": country_id}, {"name": 1, "_id": 0}):
            existing_names.add(lm["name"].lower().strip())

        added = 0
        for p in premiums:
            if added >= needed:
                break
            name_lower = p["name"].lower().strip()
            # Only exact match check (not substring - too aggressive)
            if name_lower in existing_names:
                continue
            
            idx = existing_premium + added + 1
            doc = {
                "landmark_id": f"{country_id}_premium_{idx}",
                "name": p["name"],
                "country_id": country_id,
                "country_name": country["name"],
                "continent": country["continent"],
                "description": p["description"],
                "category": "premium",
                "image_url": "",
                "images": [],
                "facts": [{"text": f"Worth {p['points']} points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Moderate",
                "latitude": None,
                "longitude": None,
                "points": p["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            await db.landmarks.insert_one(doc)
            added += 1
            total_added += 1

        if added > 0:
            new_total = existing_premium + added
            status = "OK" if new_total >= 5 else f"STILL SHORT ({new_total}/5)"
            print(f"  {country['name']:25s} +{added} -> {status}")

    # Final verification
    print(f"\nTotal added: {total_added}")
    total_lm = await db.landmarks.count_documents({})
    total_prem = await db.landmarks.count_documents({"category": "premium"})
    print(f"Total landmarks: {total_lm} (premium: {total_prem})")

    # Check remaining short countries
    short = 0
    countries = await db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}).to_list(200)
    for c in countries:
        prem = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if prem < 5:
            short += 1
            print(f"  STILL SHORT: {c['name']} ({prem}/5)")
    
    if short == 0:
        print("\nALL 100 countries have 5+ premium landmarks!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fill_premiums())
