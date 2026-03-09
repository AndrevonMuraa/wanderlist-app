"""Fill premium landmarks to 5 per country on production Atlas DB.
Run: cd backend/scripts && python3 fill_atlas_premiums.py"""
import asyncio, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

FILL = {
    'france': ['Gorges du Verdon|Europes Grand Canyon with turquoise river','Dune of Pilat|Europes tallest sand dune on the Atlantic coast'],
    'italy': ['Trulli of Alberobello|UNESCO whitewashed conical houses in Puglia','Matera Sassi|UNESCO cave city one of oldest inhabited places'],
    'spain': ['Caminito del Rey|Thrilling pathway pinned to gorge walls 100m up','Ronda Gorge Bridge|Bridge spanning a 120m gorge'],
    'uk': ['Hadrians Wall Path|Walk along the 73 mile Roman frontier'],
    'germany': ['Neuschwanstein Castle|Fairy tale castle inspiring Disney','Bastei Bridge|Dramatic sandstone bridge 194m above the Elbe','Romantic Road Route|370km scenic route through medieval towns'],
    'greece': ['Santorini Caldera Walk|Scenic trail along volcanic rim Fira to Oia'],
    'switzerland': ['Oeschinen Lake|Stunning Alpine lake surrounded by rock faces','Creux du Van|Natural rock amphitheatre with ibex and 160m cliffs'],
    'netherlands': ['Giethoorn Village|Venice of the North with no roads only canals','Hoge Veluwe Park|Vast park with museum and free white bicycles'],
    'portugal': ['Azores Whale Watching|Mid Atlantic islands with sperm whales','Madeira Levada Walks|Unique irrigation channel walks through forests','Cabo Espichel Dinosaur Tracks|Jurassic footprints on sea cliffs'],
    'finland': ['Lake Saimaa Seal|Worlds rarest seal species in the lake district'],
    'austria': ['Green Lake Tragoss|Seasonal lake that submerges a park underwater'],
    'croatia': ['Vis Island Tunnels|Secret Yugoslav military tunnels for adventure'],
    'japan': ['Yakushima Ancient Cedars|Island with 1000 year old cedar trees'],
    'china': ['Longmen Grottoes|100000 Buddhist stone statues in limestone cliffs','Rainbow Mountains Zhangye|Surreal striped sandstone mountains'],
    'thailand': ['Sukhothai Historical Park|UNESCO ruins of first Siamese kingdom','Khao Sok Cheow Lan|Floating bungalows on emerald lake'],
    'india': ['Ladakh Pangong Lake|Surreal high altitude lake at 4350m','Rann of Kutch Salt Desert|Vast white salt desert'],
    'south_korea': ['Haeinsa Temple|UNESCO temple with 80000 wooden printing blocks','Gamcheon Culture Village|Colorful hillside village in Busan','Nami Island|Tree lined island famous from Korean drama'],
    'vietnam': ['Phong Nha Cave System|Worlds largest cave passage','Sapa Homestay|Overnight with hill tribes among rice terraces'],
    'indonesia': ['Nusa Penida Kelingking|T Rex shaped cliff off Bali','Derawan Islands|Remote archipelago with stingless jellyfish'],
    'malaysia': ['Bako National Park|Sarawak park with proboscis monkeys','Danum Valley Rainforest|130 million year old primary rainforest'],
    'singapore': ['Henderson Waves Bridge|Highest pedestrian bridge with wave design','Kampong Glam Heritage|Malay Arab quarter with Sultan Mosque'],
    'cambodia': ['Cardamom Mountains Trek|SE Asias largest intact rainforest','Sambor Prei Kuk|UNESCO pre Angkorian temple complex','Kampot Pepper Farm|Worlds finest pepper plantations'],
    'nepal': ['Upper Mustang Trek|Former forbidden kingdom with Tibetan culture','Bardia National Park|Remote jungle park with tigers','Gosaikunda Sacred Lakes|Alpine lakes sacred to Hindus'],
    'philippines': ['Apo Island Sea Turtles|Swim with hundreds of green sea turtles','Sagada Hanging Coffins|Ancient burial practice on cliff faces','Coron Shipwreck Diving|WWII Japanese shipwrecks in crystal waters'],
    'sri_lanka': ['Knuckles Mountain Range|UNESCO cloud forest with endemic species','Arugam Bay Surf|World class surf point break','Minneriya Elephant Gathering|Largest wild elephant gathering'],
    'taiwan': ['Penghu Basalt Columns|Dramatic volcanic columns on islands','Tainan Temple Trail|Oldest city with 200 temples','Wuling Cherry Blossoms|Highland farm with cherry blossom season'],
    'egypt': ['White Desert|Otherworldly white chalk formations','Dahab Blue Hole|World famous diving site in Red Sea'],
    'south_africa': ['Winelands Stellenbosch|Historic Cape Dutch wine estates'],
    'morocco': ['Chefchaouen Blue City|Magical blue painted mountain medina','Todra Gorge|Dramatic narrow canyon with 300m walls','Merzouga Camel Trek|Overnight desert camp among Saharan dunes'],
    'kenya': ['Lamu Old Town|UNESCO Swahili settlement with no cars','Tsavo Red Elephants|Famous park with elephants turned red'],
    'tanzania': ['Ngorongoro Crater Safari|Game drives on worlds largest caldera','Pemba Island Diving|Unspoiled coral reefs off Zanzibar','Serengeti Balloon|Hot air balloon at dawn over migration'],
    'botswana': ['Makgadikgadi Meerkats|Habituated meerkats on salt flats','Moremi Game Reserve|Pristine reserve inside Okavango Delta','Kubu Island Baobabs|Ancient baobab trees on granite island'],
    'namibia': ['Sossusvlei Dead Vlei|White clay pan with 900 year old trees','Etosha Pan Safari|Vast salt pan attracting elephants and lions'],
    'tunisia': ['Matmata Troglodyte Homes|Underground Berber dwellings Star Wars','Sidi Bou Said Village|Blue and white clifftop village'],
    'seychelles': ['Vallee de Mai|UNESCO prehistoric palm forest with coco de mer','Anse Source dArgent|Worlds most photographed beach'],
    'mauritius': ['Pamplemousses Garden|18th century garden with giant water lilies','Ile aux Aigrettes|Restored island sanctuary with tortoises','Grand Bassin Sacred Lake|Hindu pilgrimage site in volcanic crater'],
    'usa': ['Glacier National Park|Crown of the Continent with pristine forests','Sedona Red Rocks|Stunning red sandstone formations'],
    'canada': ['Peggys Cove Lighthouse|Iconic lighthouse on wave swept granite'],
    'mexico': ['Holbox Whale Sharks|Swim with whale sharks off car free island','Hierve el Agua|Petrified waterfall formations with infinity pools'],
    'brazil': ['Fernando de Noronha|Volcanic archipelago with pristine diving','Iguazu Devils Throat|Walk above the most powerful waterfall'],
    'peru': ['Kuelap Fortress|Ancient walled city in the clouds'],
    'argentina': ['Perito Moreno Glacier|Advancing glacier calving into lake','Ushuaia End of World Train|Southernmost railway through forest'],
    'chile': ['Easter Island Moai|Mysterious 887 stone statues on remote island','Atacama Stargazing|Clearest skies on Earth','Chiloe Wooden Churches|16 UNESCO churches built without nails'],
    'colombia': ['Cocora Valley Wax Palms|Worlds tallest palm trees reaching 60m','Guatape Rock Staircase|649 steps carved into a 200m monolith'],
    'ecuador': ['Mindo Cloud Forest|Biodiversity hotspot with hummingbirds','Quilotoa Crater Lake|Turquoise volcanic crater lake','Amazon Yasuni Lodge|Most biodiverse place on Earth'],
    'costa_rica': ['Corcovado National Park|Most biologically intense place on Earth','Monteverde Cloud Forest|Misty highland forest with quetzals','Arenal Volcano Hot Springs|Natural hot springs by active volcano','Cahuita Snorkeling Reef|Caribbean coral reef with sloths'],
    'panama': ['Coiba Island Diving|UNESCO island with pristine Pacific reef','Embera Village|Indigenous rainforest community with crafts','San Blas Islands|Indigenous Guna Yala pristine archipelago'],
    'cuba': ['Cayo Largo del Sur|Pristine uninhabited island with white beaches','Pinar del Rio Tobacco|Worlds finest tobacco growing region','Bay of Pigs Diving|Excellent snorkeling and cenote diving'],
    'dominican_republic': ['Bahia de las Aguilas|Most pristine beach only by boat','Larimar Mines|Worlds only source of rare blue gemstone','Salto de Limon|52m waterfall reached by horseback'],
    'jamaica': ['Reach Falls|Pristine cascading waterfall with heart pool','Blue Lagoon Swimming|Luminous turquoise lagoon springs','Port Royal Sunken City|Submerged pirate city of Caribbean'],
    'bahamas': ['Deans Blue Hole|Worlds second deepest blue hole 202m','Eleuthera Glass Window|Bridge where Atlantic meets Caribbean','Lucayan National Park|One of worlds longest underwater caves'],
    'barbados': ['Bathsheba Soup Bowl|World class surf with mushroom boulders','Huntes Gardens|Enchanting tropical garden in collapsed gully','Oistins Friday Fish Fry|Weekly oceanfront fish fry party'],
    'australia': ['Cradle Mountain Tasmania|Iconic alpine wilderness with wombats','Pinnacles Desert|Thousands of limestone pillars in golden sand'],
    'new_zealand': ['Milford Sound Fiord|Glacier carved fiord with waterfalls','Tongariro Alpine Crossing|One day volcanic hike emerald lakes'],
    'fiji': ['Taveuni Rainbow Reef|Soft coral capital of the world','Sigatoka Sand Dunes|Ancient Lapita pottery burial site','Sabeto Hot Springs|Volcanic mud pools near Nadi'],
    'french_polynesia': ['Tetiaroa Atoll|Marlon Brandos private island eco resort','Fakarava Shark Wall|Hundreds of grey reef sharks in south pass','Tiputa Pass Dolphins|Swim with spinner dolphins in Rangiroa'],
    'cook_islands': ['Aitutaki Lagoon|One of most beautiful lagoons in the world','Te Rua Manga Needle|Dramatic basalt peak hike in Rarotonga','Muri Beach Night Market|Weekly beachside market with local food'],
    'samoa': ['To Sua Ocean Trench|Giant natural swimming hole','Savaii Lava Fields|Walk across recent volcanic lava flows','Afu Aau Waterfall|Hidden jungle waterfall cascading into pool','Lalomanu White Beach|Pristine crescent beach rated worlds best'],
    'vanuatu': ['Yasur Volcano Night|Stand on rim of active volcano at night','Champagne Beach|Pristine beach with volcanic gas bubbles','Mele Cascades|Series of cascading pools in tropical jungle'],
}

async def fill():
    total = 0
    for cid, entries in FILL.items():
        country = await db.countries.find_one({'country_id': cid})
        if not country:
            continue
        existing = await db.landmarks.count_documents({'country_id': cid, 'category': 'premium'})
        needed = 5 - existing
        if needed <= 0:
            continue
        existing_names = set()
        async for lm in db.landmarks.find({'country_id': cid}, {'name': 1, '_id': 0}):
            existing_names.add(lm['name'].lower().strip())
        added = 0
        for entry in entries:
            if added >= needed:
                break
            name, desc = entry.split('|', 1)
            if name.lower().strip() in existing_names:
                continue
            idx = existing + added + 1
            await db.landmarks.insert_one({
                'landmark_id': f'{cid}_premium_{idx}',
                'name': name,
                'country_id': cid,
                'country_name': country['name'],
                'continent': country['continent'],
                'description': desc,
                'category': 'premium',
                'image_url': '',
                'images': [],
                'facts': [{'text': 'Worth 25 points!', 'icon': 'star-outline'}],
                'best_time_to_visit': 'Year-round',
                'duration': 'Half day',
                'difficulty': 'Moderate',
                'latitude': None,
                'longitude': None,
                'points': 25,
                'upvotes': 0,
                'created_by': None,
                'created_at': datetime.now(timezone.utc)
            })
            added += 1
            total += 1
    print(f'Added {total} premium landmarks')
    t = await db.landmarks.count_documents({})
    p = await db.landmarks.count_documents({'category': 'premium'})
    short = 0
    async for c in db.countries.find({}, {'_id': 0, 'country_id': 1, 'name': 1}):
        pc = await db.landmarks.count_documents({'country_id': c['country_id'], 'category': 'premium'})
        if pc < 5:
            short += 1
            print(f'  STILL SHORT: {c["name"]} ({pc}/5)')
    print(f'Final: {t} landmarks ({p} premium), {short} countries still short')
    client.close()

if __name__ == "__main__":
    asyncio.run(fill())
