"""Fill remaining premium gaps on Atlas. Run after fill_atlas_premiums.py"""
import asyncio, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'wandermark')]

FILL2 = {
    'thailand': ['Doi Inthanon Summit|Thailands highest peak with royal pagodas'],
    'south_korea': ['Seoraksan Mountain|Spectacular granite peaks and vibrant autumn foliage'],
    'south_africa': ['Cederberg Mountains|UNESCO wilderness with sandstone formations and San rock art'],
    'botswana': ['Nata Bird Sanctuary|Flamingo breeding on Makgadikgadi pans'],
    'chile': ['Elqui Valley Stargazing|Pristine skies for astronomical observation'],
    'morocco': ['Atlas Mountain Berber Village|Traditional Berber villages at 2000m','Fes Tanneries Chouara|Medieval leather tanning pits with natural dyes'],
    'argentina': ['Mendoza Wine Country|World class Malbec vineyards at foot of Andes'],
    'fiji': ['Namosi Highlands|Remote mountainous interior with dramatic gorges and waterfalls'],
    'cook_islands': ['One Foot Island Post Office|Worlds most unique post office'],
    'vanuatu': ['Millennium Cave|Spectacular cave system with underground rivers and waterfalls','Loru Rainforest Reserve|Ancient lowland rainforest with massive banyan trees'],
    'kenya': ['Watamu Marine Park|Pristine coral reef and turtle nesting site'],
    'brazil': ['Jalapao Fervedouros|Crystal springs where you float effortlessly'],
    'ecuador': ['Cotopaxi Volcano Hike|Trek on one of worlds highest active volcanoes','Ingapirca Inca Ruins|Best preserved Inca ruins in Ecuador'],
    'costa_rica': ['Rio Celeste Blue River|River that turns sky blue from volcanic minerals','Osa Peninsula Wildlife|Richest biodiversity per square meter'],
    'samoa': ['Robert Louis Stevenson Museum|Former home of Treasure Island author'],
    'germany': ['Berchtesgaden Eagles Nest|Historic mountaintop retreat with Alpine views'],
    'netherlands': ['Deltaworks Storm Barrier|Engineering marvel protecting from the sea','Maastricht Underground|Medieval tunnel network beneath the city'],
    'egypt': ['Colossi of Memnon|Two massive stone statues of Pharaoh Amenhotep III in Luxor','Siwa Oasis|Remote desert oasis with ancient Oracle Temple'],
    'mauritius': ['Rodrigues Island|Remote sister island with pristine lagoon'],
    'tunisia': ['El Jem Amphitheatre|Third largest Roman amphitheatre remarkably preserved'],
    'panama': ['Boquete Cloud Forest|Highland coffee region with quetzal birds'],
}

async def fill():
    total = 0
    for cid, entries in FILL2.items():
        country = await db.countries.find_one({'country_id': cid})
        if not country: continue
        existing = await db.landmarks.count_documents({'country_id': cid, 'category': 'premium'})
        needed = 5 - existing
        if needed <= 0: continue
        existing_names = set()
        async for lm in db.landmarks.find({'country_id': cid}, {'name': 1, '_id': 0}):
            existing_names.add(lm['name'].lower().strip())
        added = 0
        for entry in entries:
            if added >= needed: break
            name, desc = entry.split('|', 1)
            if name.lower().strip() in existing_names: continue
            idx = existing + added + 1
            await db.landmarks.insert_one({
                'landmark_id': f'{cid}_premium_{idx}', 'name': name,
                'country_id': cid, 'country_name': country['name'], 'continent': country['continent'],
                'description': desc, 'category': 'premium', 'image_url': '', 'images': [],
                'facts': [{'text': 'Worth 25 points!', 'icon': 'star-outline'}],
                'best_time_to_visit': 'Year-round', 'duration': 'Half day', 'difficulty': 'Moderate',
                'latitude': None, 'longitude': None, 'points': 25, 'upvotes': 0,
                'created_by': None, 'created_at': datetime.now(timezone.utc)
            })
            added += 1; total += 1
    print(f'Added {total} premium landmarks')
    t = await db.landmarks.count_documents({})
    p = await db.landmarks.count_documents({'category': 'premium'})
    short = 0
    async for c in db.countries.find({}, {'_id': 0, 'country_id': 1, 'name': 1}):
        pc = await db.landmarks.count_documents({'country_id': c['country_id'], 'category': 'premium'})
        if pc < 5:
            short += 1
            print(f'  STILL: {c["name"]} ({pc}/5)')
    print(f'Final: {t} landmarks ({p} premium), {short} short')
    client.close()

if __name__ == "__main__":
    asyncio.run(fill())
