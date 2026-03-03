"""
Script to:
1. Fix orphan landmarks (country_name = None)
2. Add 3 new countries (Finland, Maldives, Panama) to make even grids
3. Add premium landmarks to 17 countries missing them
4. Ensure no duplicates
"""

from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient("mongodb://localhost:27017")
db = client["test_database"]

def fix_orphan_landmarks():
    """Fix 6 landmarks with country_name = None"""
    fixes = {
        'thailand_phi_phi_islands': ('Thailand', 'thailand', 'Asia'),
        'thailand_doi_inthanon': ('Thailand', 'thailand', 'Asia'),
        'spain_alhambra': ('Spain', 'spain', 'Europe'),
        'brazil_lencois_maranhenses': ('Brazil', 'brazil', 'South America'),
        'greece_delphi': ('Greece', 'greece', 'Europe'),
        'india_varanasi_ghats': ('India', 'india', 'Asia'),
    }
    
    for landmark_id, (country_name, country_id, continent) in fixes.items():
        result = db.landmarks.update_one(
            {'landmark_id': landmark_id},
            {'$set': {
                'country_name': country_name,
                'country_id': country_id,
                'continent': continent,
            }}
        )
        if result.modified_count:
            print(f"  Fixed: {landmark_id} -> {country_name}")
        else:
            print(f"  Already fixed or not found: {landmark_id}")

def add_new_countries():
    """Add Finland, Maldives, Panama to even out grids"""
    new_countries = [
        {"country_id": "finland", "name": "Finland", "continent": "Europe", "flag": "fi"},
        {"country_id": "maldives", "name": "Maldives", "continent": "Asia", "flag": "mv"},
        {"country_id": "panama", "name": "Panama", "continent": "Americas", "flag": "pa"},
    ]
    
    for country in new_countries:
        existing = db.countries.find_one({"country_id": country["country_id"]})
        if existing:
            print(f"  Country already exists: {country['name']}")
            continue
        db.countries.insert_one(country)
        print(f"  Added country: {country['name']}")

def add_landmarks_for_new_countries():
    """Add landmarks for Finland, Maldives, Panama"""
    now = datetime.now(timezone.utc).isoformat()
    
    new_landmarks = [
        # Finland (10 official + 2 premium = 12)
        {"landmark_id": "finland_suomenlinna", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Suomenlinna", "description": "UNESCO-listed sea fortress spread across six islands in Helsinki's harbor.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_helsinki_cathedral", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Helsinki Cathedral", "description": "Iconic white neoclassical cathedral dominating Senate Square in Helsinki.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_santa_claus_village", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Santa Claus Village", "description": "The official home of Santa Claus in Rovaniemi, on the Arctic Circle.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "finland_northern_lights_lapland", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Northern Lights in Lapland", "description": "One of the best places on Earth to witness the Aurora Borealis.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "finland_olavinlinna_castle", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Olavinlinna Castle", "description": "15th-century medieval castle in Savonlinna, hosting the famous Opera Festival.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_temppeliaukio_church", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Temppeliaukio Church", "description": "Stunning rock church carved directly into solid rock in Helsinki.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_lake_saimaa", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Lake Saimaa", "description": "Finland's largest lake, home to the endangered Saimaa ringed seal.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_turku_castle", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Turku Castle", "description": "Medieval castle from the 1280s, one of Finland's oldest buildings.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_sibelius_monument", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Sibelius Monument", "description": "Abstract monument of 600 steel pipes honoring composer Jean Sibelius.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "finland_nuuksio_national_park", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Nuuksio National Park", "description": "Pristine forest and lake wilderness just outside Helsinki.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "finland_kemi_snow_castle", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Kemi Snow Castle", "description": "World's largest snow castle, rebuilt each winter with unique architecture.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "finland_icebreaker_sampo", "country_id": "finland", "country_name": "Finland", "continent": "Europe", "name": "Icebreaker Sampo Cruise", "description": "Cruise on a real icebreaker ship through frozen Arctic seas with ice swimming.", "difficulty": "Hard", "category": "premium", "points": 25},

        # Maldives (10 official + 2 premium = 12)
        {"landmark_id": "maldives_male_friday_mosque", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Male Friday Mosque", "description": "Historic coral stone mosque from the 17th century, a UNESCO World Heritage Site.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_artificial_beach", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Artificial Beach Male", "description": "Popular swimming beach in the capital with stunning turquoise waters.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_banana_reef", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Banana Reef", "description": "One of the first dive sites discovered in the Maldives, famous for coral formations.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "maldives_hp_reef", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "HP Reef", "description": "Protected marine area with stunning soft corals and diverse marine life.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "maldives_national_museum", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Maldives National Museum", "description": "Houses artifacts from the Maldives' Buddhist and Islamic past in Sultan Park.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_hulhumale", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Hulhumale", "description": "Modern reclaimed island connected to Male, with pristine beaches.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_vaadhoo_island", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Vaadhoo Island Sea of Stars", "description": "Bioluminescent beach that glows blue at night from marine phytoplankton.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "maldives_maafushi", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Maafushi Island", "description": "Popular local island known for water sports and affordable Maldives experience.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_fish_market", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Male Fish Market", "description": "Bustling waterfront market where fishermen sell the day's fresh catch.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "maldives_thulusdhoo", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Thulusdhoo Island", "description": "Surf paradise known for the famous 'Cokes' wave break.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "maldives_underwater_restaurant", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Ithaa Undersea Restaurant", "description": "World's first all-glass undersea restaurant, 5 meters below the Indian Ocean.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "maldives_baa_atoll", "country_id": "maldives", "country_name": "Maldives", "continent": "Asia", "name": "Baa Atoll Biosphere Reserve", "description": "UNESCO Biosphere Reserve with manta ray gatherings and whale sharks.", "difficulty": "Hard", "category": "premium", "points": 25},

        # Panama (10 official + 2 premium = 12)
        {"landmark_id": "panama_canal", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Panama Canal", "description": "One of the world's greatest engineering feats, connecting the Atlantic and Pacific oceans.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_casco_viejo", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Casco Viejo", "description": "UNESCO-listed historic district with colonial architecture and vibrant nightlife.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_biomuseo", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Biomuseo", "description": "Frank Gehry-designed biodiversity museum showcasing Panama's natural history.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_san_blas_islands", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "San Blas Islands", "description": "365 pristine Caribbean islands governed by the indigenous Guna people.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "panama_boquete", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Boquete", "description": "Highland town famous for coffee plantations and cloud forest hiking.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "panama_amador_causeway", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Amador Causeway", "description": "Scenic road connecting four islands at the Pacific entrance of the canal.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_metropolitan_park", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Metropolitan Natural Park", "description": "Tropical rainforest within the city limits of Panama City.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_panama_viejo", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Panama Viejo", "description": "Ruins of the original Panama City, destroyed by pirate Henry Morgan in 1671.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_taboga_island", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Taboga Island", "description": "Historic 'Island of Flowers' just 20 minutes by ferry from Panama City.", "difficulty": "Easy", "category": "official", "points": 10},
        {"landmark_id": "panama_soberania_park", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Soberania National Park", "description": "Tropical rainforest park along the canal with world-class birdwatching.", "difficulty": "Medium", "category": "official", "points": 10},
        {"landmark_id": "panama_darien_gap", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Darien Gap", "description": "Remote wilderness connecting Central and South America, one of Earth's last frontiers.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "panama_bocas_del_toro", "country_id": "panama", "country_name": "Panama", "continent": "Americas", "name": "Bocas del Toro", "description": "Caribbean archipelago with crystal-clear waters, coral reefs, and tropical wildlife.", "difficulty": "Medium", "category": "premium", "points": 25},
    ]
    
    added = 0
    for lm in new_landmarks:
        existing = db.landmarks.find_one({"landmark_id": lm["landmark_id"]})
        if existing:
            print(f"  Landmark already exists: {lm['name']}")
            continue
        lm["upvotes"] = 0
        lm["created_by"] = None
        lm["created_at"] = now
        lm["facts"] = []
        lm["best_time_to_visit"] = "Year-round"
        lm["duration"] = "2-3 hours"
        lm["latitude"] = None
        lm["longitude"] = None
        db.landmarks.insert_one(lm)
        added += 1
        print(f"  Added: {lm['name']} ({lm['country_name']}) [{lm['category']}]")
    print(f"  Total new landmarks added: {added}")

def add_premium_to_missing_countries():
    """Add 2-3 premium landmarks to 17 countries that lack them"""
    now = datetime.now(timezone.utc).isoformat()
    
    premium_landmarks = [
        # Austria
        {"landmark_id": "austria_grossglockner_road", "country_id": "austria", "country_name": "Austria", "continent": "Europe", "name": "Grossglockner High Alpine Road", "description": "Austria's highest mountain pass road with breathtaking panoramic views.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "austria_eisriesenwelt", "country_id": "austria", "country_name": "Austria", "continent": "Europe", "name": "Eisriesenwelt Ice Cave", "description": "The world's largest accessible ice cave, stretching 42km into the Alps.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Sweden
        {"landmark_id": "sweden_icehotel", "country_id": "sweden", "country_name": "Sweden", "continent": "Europe", "name": "ICEHOTEL Jukkasjarvi", "description": "The world's first ice hotel, rebuilt each winter from Torne River ice.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "sweden_kungsleden_trail", "country_id": "sweden", "country_name": "Sweden", "continent": "Europe", "name": "Kungsleden Trail", "description": "The King's Trail - Sweden's most famous long-distance hiking path through Arctic wilderness.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Denmark
        {"landmark_id": "denmark_kronborg_castle", "country_id": "denmark", "country_name": "Denmark", "continent": "Europe", "name": "Kronborg Castle", "description": "UNESCO-listed Renaissance castle, the setting of Shakespeare's Hamlet.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "denmark_mon_cliffs", "country_id": "denmark", "country_name": "Denmark", "continent": "Europe", "name": "Mons Klint", "description": "Dramatic 128-meter white chalk cliffs on the island of Mon.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Iceland
        {"landmark_id": "iceland_ice_cave_vatnajokull", "country_id": "iceland", "country_name": "Iceland", "continent": "Europe", "name": "Vatnajokull Ice Caves", "description": "Ethereal blue ice caves beneath Europe's largest glacier.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "iceland_landmannalaugar", "country_id": "iceland", "country_name": "Iceland", "continent": "Europe", "name": "Landmannalaugar", "description": "Remote highland area with colorful rhyolite mountains and natural hot springs.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Croatia
        {"landmark_id": "croatia_blue_cave", "country_id": "croatia", "country_name": "Croatia", "continent": "Europe", "name": "Blue Cave Bisevo", "description": "Natural sea cave that glows with an ethereal blue light from refracted sunlight.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "croatia_kornati_islands", "country_id": "croatia", "country_name": "Croatia", "continent": "Europe", "name": "Kornati Islands National Park", "description": "Archipelago of 89 uninhabited islands with dramatic cliffs and crystal waters.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Cambodia
        {"landmark_id": "cambodia_preah_vihear", "country_id": "cambodia", "country_name": "Cambodia", "continent": "Asia", "name": "Preah Vihear Temple", "description": "Cliff-top Khmer temple with panoramic views over the Cambodian plains.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "cambodia_koh_rong", "country_id": "cambodia", "country_name": "Cambodia", "continent": "Asia", "name": "Koh Rong Island", "description": "Tropical paradise island with bioluminescent plankton and untouched beaches.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Nepal
        {"landmark_id": "nepal_everest_base_camp", "country_id": "nepal", "country_name": "Nepal", "continent": "Asia", "name": "Everest Base Camp", "description": "The legendary base camp of the world's highest peak at 5,364 meters.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "nepal_annapurna_circuit", "country_id": "nepal", "country_name": "Nepal", "continent": "Asia", "name": "Annapurna Circuit", "description": "One of the world's greatest treks, circling the Annapurna massif through diverse landscapes.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Philippines
        {"landmark_id": "philippines_underground_river", "country_id": "philippines", "country_name": "Philippines", "continent": "Asia", "name": "Puerto Princesa Underground River", "description": "UNESCO-listed navigable underground river through a stunning limestone cave system.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "philippines_el_nido", "country_id": "philippines", "country_name": "Philippines", "continent": "Asia", "name": "El Nido Lagoons", "description": "Hidden lagoons surrounded by towering limestone cliffs in Palawan.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Sri Lanka
        {"landmark_id": "sri_lanka_sigiriya", "country_id": "sri_lanka", "country_name": "Sri Lanka", "continent": "Asia", "name": "Sigiriya Lion Rock", "description": "Ancient rock fortress rising 200m above the jungle, with 5th-century frescoes.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "sri_lanka_nine_arch_bridge", "country_id": "sri_lanka", "country_name": "Sri Lanka", "continent": "Asia", "name": "Nine Arch Bridge", "description": "Iconic colonial-era viaduct in the hill country, built entirely without steel.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Taiwan
        {"landmark_id": "taiwan_taroko_gorge", "country_id": "taiwan", "country_name": "Taiwan", "continent": "Asia", "name": "Taroko Gorge", "description": "Dramatic marble canyon carved through mountains, with trails and temples.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "taiwan_sun_moon_lake", "country_id": "taiwan", "country_name": "Taiwan", "continent": "Asia", "name": "Sun Moon Lake", "description": "Taiwan's largest natural lake surrounded by mountains and aboriginal culture.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Kenya
        {"landmark_id": "kenya_masai_mara_migration", "country_id": "kenya", "country_name": "Kenya", "continent": "Africa", "name": "Masai Mara Great Migration", "description": "Witness millions of wildebeest crossing the Mara River in the greatest wildlife spectacle.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "kenya_lake_nakuru", "country_id": "kenya", "country_name": "Kenya", "continent": "Africa", "name": "Lake Nakuru Flamingos", "description": "Millions of flamingos creating a pink shoreline at this Rift Valley lake.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Tanzania
        {"landmark_id": "tanzania_kilimanjaro_summit", "country_id": "tanzania", "country_name": "Tanzania", "continent": "Africa", "name": "Mount Kilimanjaro Summit", "description": "The roof of Africa at 5,895m - the world's tallest freestanding mountain.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "tanzania_ngorongoro_crater", "country_id": "tanzania", "country_name": "Tanzania", "continent": "Africa", "name": "Ngorongoro Crater", "description": "World's largest intact volcanic caldera, home to the densest concentration of wildlife.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Jamaica
        {"landmark_id": "jamaica_blue_mountains", "country_id": "jamaica", "country_name": "Jamaica", "continent": "Americas", "name": "Blue Mountains Peak", "description": "Jamaica's highest point at 2,256m, home to the world-famous Blue Mountain Coffee.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "jamaica_luminous_lagoon", "country_id": "jamaica", "country_name": "Jamaica", "continent": "Americas", "name": "Luminous Lagoon", "description": "One of the world's rare bioluminescent bays that glows neon blue at night.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Cuba
        {"landmark_id": "cuba_vinales_valley", "country_id": "cuba", "country_name": "Cuba", "continent": "Americas", "name": "Vinales Valley", "description": "UNESCO-listed valley with dramatic limestone mogotes and tobacco plantations.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "cuba_trinidad_colonial", "country_id": "cuba", "country_name": "Cuba", "continent": "Americas", "name": "Trinidad Colonial Center", "description": "Perfectly preserved colonial town frozen in time, a UNESCO World Heritage Site.", "difficulty": "Easy", "category": "premium", "points": 25},
        
        # Dominican Republic
        {"landmark_id": "dr_27_waterfalls", "country_id": "dominican_republic", "country_name": "Dominican Republic", "continent": "Americas", "name": "27 Waterfalls of Damajagua", "description": "Series of 27 cascading waterfalls hidden in the tropical mountain forest.", "difficulty": "Hard", "category": "premium", "points": 25},
        {"landmark_id": "dr_los_haitises", "country_id": "dominican_republic", "country_name": "Dominican Republic", "continent": "Americas", "name": "Los Haitises National Park", "description": "Rainforest park with limestone caves, Taino petroglyphs, and mangrove forests.", "difficulty": "Medium", "category": "premium", "points": 25},
        
        # Bahamas
        {"landmark_id": "bahamas_swimming_pigs", "country_id": "bahamas", "country_name": "Bahamas", "continent": "Americas", "name": "Swimming Pigs of Exuma", "description": "Famous swimming pigs at Big Major Cay in the Exuma Cays.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "bahamas_thunderball_grotto", "country_id": "bahamas", "country_name": "Bahamas", "continent": "Americas", "name": "Thunderball Grotto", "description": "Underwater cave system featured in the James Bond film, with stunning snorkeling.", "difficulty": "Hard", "category": "premium", "points": 25},
        
        # Barbados
        {"landmark_id": "barbados_harrisons_cave", "country_id": "barbados", "country_name": "Barbados", "continent": "Americas", "name": "Harrison's Cave", "description": "Crystallized limestone cave with flowing streams and dramatic stalactites.", "difficulty": "Medium", "category": "premium", "points": 25},
        {"landmark_id": "barbados_animal_flower_cave", "country_id": "barbados", "country_name": "Barbados", "continent": "Americas", "name": "Animal Flower Cave", "description": "Sea cave at the northernmost point of Barbados with natural ocean pools.", "difficulty": "Medium", "category": "premium", "points": 25},
    ]
    
    added = 0
    for lm in premium_landmarks:
        existing = db.landmarks.find_one({"landmark_id": lm["landmark_id"]})
        if existing:
            print(f"  Premium already exists: {lm['name']}")
            continue
        lm["upvotes"] = 0
        lm["created_by"] = None
        lm["created_at"] = now
        lm["facts"] = []
        lm["best_time_to_visit"] = "Year-round"
        lm["duration"] = "2-3 hours"
        lm["latitude"] = None
        lm["longitude"] = None
        db.landmarks.insert_one(lm)
        added += 1
        print(f"  Added premium: {lm['name']} ({lm['country_name']})")
    print(f"  Total premium landmarks added: {added}")

def verify_no_duplicates():
    """Check for any duplicate landmarks"""
    pipeline = [
        {"$group": {"_id": {"$toLower": "$name"}, "count": {"$sum": 1}, "countries": {"$addToSet": "$country_name"}, "ids": {"$addToSet": "$landmark_id"}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}}
    ]
    dupes = list(db.landmarks.aggregate(pipeline))
    if dupes:
        print(f"\n  WARNING: Found {len(dupes)} duplicate landmark names:")
        for d in dupes:
            print(f"    '{d['_id']}' in {d['countries']} (IDs: {d['ids']})")
    else:
        print("\n  No duplicate landmarks found!")

def print_final_stats():
    """Print final counts"""
    from collections import Counter
    countries = list(db.countries.find({}, {"_id": 0, "name": 1, "continent": 1}))
    continent_counts = Counter(c["continent"] for c in countries)
    
    total_landmarks = db.landmarks.count_documents({})
    premium_count = db.landmarks.count_documents({"category": "premium"})
    official_count = db.landmarks.count_documents({"category": "official"})
    orphans = db.landmarks.count_documents({"country_name": None})
    
    print(f"\n=== FINAL STATS ===")
    print(f"Total countries: {len(countries)}")
    for continent, count in sorted(continent_counts.items()):
        print(f"  {continent}: {count}")
    print(f"Total landmarks: {total_landmarks}")
    print(f"  Official: {official_count}")
    print(f"  Premium: {premium_count}")
    print(f"  Orphans: {orphans}")
    
    # Countries still without premium
    pipeline = [
        {"$match": {"category": "premium"}},
        {"$group": {"_id": "$country_name"}},
    ]
    with_premium = set(r["_id"] for r in db.landmarks.aggregate(pipeline))
    all_names = set(c["name"] for c in countries)
    without = sorted(all_names - with_premium)
    if without:
        print(f"  Countries still without premium: {without}")
    else:
        print(f"  All countries have premium landmarks!")

if __name__ == "__main__":
    print("1. Fixing orphan landmarks...")
    fix_orphan_landmarks()
    
    print("\n2. Adding new countries (Finland, Maldives, Panama)...")
    add_new_countries()
    
    print("\n3. Adding landmarks for new countries...")
    add_landmarks_for_new_countries()
    
    print("\n4. Adding premium landmarks to countries missing them...")
    add_premium_to_missing_countries()
    
    print("\n5. Verifying no duplicates...")
    verify_no_duplicates()
    
    print("\n6. Final statistics...")
    print_final_stats()
