#!/usr/bin/env python3
"""
Add Premium Landmarks to Countries with Zero Premium Content
============================================================
This script adds 3-5 unique premium landmarks to each of the 28 countries
that currently have no premium content.

Target countries by region:
- Oceania (7): Cook Islands, Fiji, Samoa, Tonga, Vanuatu, French Polynesia, New Zealand
- Americas (5): Argentina, Chile, Colombia, Costa Rica, Ecuador
- Africa (8): Botswana, Kenya, Mauritius, Morocco, Namibia, Seychelles, Tanzania, Tunisia
- Asia (5): Indonesia, Malaysia, Singapore, South Korea, Vietnam
- Europe (3): Netherlands, Portugal, Switzerland
"""

from pymongo import MongoClient
from datetime import datetime

# New Premium Landmarks for all 28 countries
NEW_PREMIUM_LANDMARKS = {
    # ============== OCEANIA ==============
    "cook_islands": {
        "country_name": "Cook Islands",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Aitutaki Lagoon", "description": "One of the world's most beautiful lagoons with crystal-clear turquoise waters and pristine sandbars.", "image_url": "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=600", "points": 25},
            {"name": "Te Vara Nui Village", "description": "Cultural village showcasing traditional Polynesian dance, crafts, and ancient legends.", "image_url": "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600", "points": 25},
            {"name": "One Foot Island", "description": "Remote paradise island with the world's most unique post office, accessible only by boat.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600", "points": 25},
        ]
    },
    "fiji": {
        "country_name": "Fiji",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Sawa-i-Lau Caves", "description": "Sacred limestone caves with an underwater entrance to a hidden chamber.", "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600", "points": 25},
            {"name": "Bouma National Heritage Park", "description": "Pristine rainforest with three stunning waterfalls and natural swimming pools.", "image_url": "https://images.unsplash.com/photo-1511497584788-876760111969?w=600", "points": 25},
            {"name": "Navua River", "description": "Adventure through dramatic gorges and waterfalls on traditional bamboo rafts.", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600", "points": 25},
        ]
    },
    "samoa": {
        "country_name": "Samoa",
        "continent": "Oceania",
        "landmarks": [
            {"name": "To Sua Ocean Trench", "description": "Spectacular natural swimming hole - a 30-meter deep volcanic crater connected to the ocean.", "image_url": "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=600", "points": 25},
            {"name": "Lalomanu Beach", "description": "Paradise beach with traditional open-air fales and crystal-clear waters.", "image_url": "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=600", "points": 25},
            {"name": "Papaseea Sliding Rocks", "description": "Natural water slides carved by centuries of flowing water through volcanic rock.", "image_url": "https://images.unsplash.com/photo-1500259571355-332da5cb07aa?w=600", "points": 25},
        ]
    },
    "tonga": {
        "country_name": "Tonga",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Ha'atafu Beach", "description": "Pristine beach with excellent snorkeling and traditional Tongan villages nearby.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600", "points": 25},
            {"name": "Mapu'a 'a Vaea Blowholes", "description": "Dramatic coastal blowholes shooting water up to 30 meters high.", "image_url": "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600", "points": 25},
            {"name": "Humpback Whale Sanctuary", "description": "World-class whale watching where you can swim with humpback whales.", "image_url": "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=600", "points": 25},
        ]
    },
    "vanuatu": {
        "country_name": "Vanuatu",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Mount Yasur Volcano", "description": "One of the world's most accessible active volcanoes with nightly lava displays.", "image_url": "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=600", "points": 25},
            {"name": "Blue Lagoon Espiritu Santo", "description": "Mesmerizing freshwater lagoon with impossibly blue waters in pristine jungle.", "image_url": "https://images.unsplash.com/photo-1505881502353-a1986add3762?w=600", "points": 25},
            {"name": "Champagne Beach", "description": "Named for its effervescent volcanic springs bubbling through powdery white sand.", "image_url": "https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=600", "points": 25},
        ]
    },
    "french_polynesia": {
        "country_name": "French Polynesia",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Moorea Belvedere Lookout", "description": "Breathtaking viewpoint overlooking Cook's Bay and Opunohu Bay.", "image_url": "https://images.unsplash.com/photo-1589979481223-deb893043163?w=600", "points": 25},
            {"name": "Fakarava Atoll", "description": "UNESCO Biosphere Reserve with pristine diving and rare bird species.", "image_url": "https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=600", "points": 25},
            {"name": "Rangiroa Blue Lagoon", "description": "A lagoon within a lagoon, with vibrant coral gardens and reef sharks.", "image_url": "https://images.unsplash.com/photo-1544979590-37e9b47eb705?w=600", "points": 25},
        ]
    },
    "new_zealand": {
        "country_name": "New Zealand",
        "continent": "Oceania",
        "landmarks": [
            {"name": "Waitomo Glowworm Caves", "description": "Magical underground caves illuminated by thousands of bioluminescent glowworms.", "image_url": "https://images.unsplash.com/photo-1562084267-1e0a6e1ef5e5?w=600", "points": 25},
            {"name": "Coromandel Cathedral Cove", "description": "Stunning natural rock archway on a white sand beach, accessible only by foot or kayak.", "image_url": "https://images.unsplash.com/photo-1506701507507-3c1814e2ec7e?w=600", "points": 25},
            {"name": "Wai-O-Tapu Thermal Wonderland", "description": "Geothermal area with bubbling mud pools and the Champagne Pool's vibrant colors.", "image_url": "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=600", "points": 25},
        ]
    },
    
    # ============== AMERICAS ==============
    "argentina": {
        "country_name": "Argentina",
        "continent": "Americas",
        "landmarks": [
            {"name": "Quebrada de Humahuaca", "description": "UNESCO World Heritage valley with colorful mountains and ancient Incan history.", "image_url": "https://images.unsplash.com/photo-1523906921802-b5d2d899e93b?w=600", "points": 25},
            {"name": "Caminito Street", "description": "Iconic colorful street in La Boca neighborhood, birthplace of tango.", "image_url": "https://images.unsplash.com/photo-1584962934385-d1e3f7bc9d69?w=600", "points": 25},
            {"name": "Tierra del Fuego National Park", "description": "End-of-the-world wilderness with dramatic coastlines and sub-Antarctic forests.", "image_url": "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=600", "points": 25},
        ]
    },
    "chile": {
        "country_name": "Chile",
        "continent": "Americas",
        "landmarks": [
            {"name": "Marble Caves of Patagonia", "description": "Stunning blue marble formations carved by 6,000 years of waves on General Carrera Lake.", "image_url": "https://images.unsplash.com/photo-1502920514313-52581002a659?w=600", "points": 25},
            {"name": "Valle de la Luna", "description": "Otherworldly desert landscape in Atacama with moon-like terrain and salt formations.", "image_url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600", "points": 25},
            {"name": "Chiloé Island", "description": "Mystical island with unique wooden churches (UNESCO) and rich folklore.", "image_url": "https://images.unsplash.com/photo-1502003148287-a82ef80a6abc?w=600", "points": 25},
        ]
    },
    "colombia": {
        "country_name": "Colombia",
        "continent": "Americas",
        "landmarks": [
            {"name": "Caño Cristales", "description": "The 'River of Five Colors' - world's most beautiful river with vibrant aquatic plants.", "image_url": "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=600", "points": 25},
            {"name": "Lost City (Ciudad Perdida)", "description": "Ancient terraced city hidden in Sierra Nevada, older than Machu Picchu.", "image_url": "https://images.unsplash.com/photo-1510846229539-b43d2e7e1b7c?w=600", "points": 25},
            {"name": "Salt Cathedral of Zipaquirá", "description": "Underground church built within salt mines, 180 meters below the surface.", "image_url": "https://images.unsplash.com/photo-1533636721434-0e2d61030955?w=600", "points": 25},
        ]
    },
    "costa_rica": {
        "country_name": "Costa Rica",
        "continent": "Americas",
        "landmarks": [
            {"name": "Monteverde Cloud Forest", "description": "Mystical cloud forest reserve with incredible biodiversity and hanging bridges.", "image_url": "https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=600", "points": 25},
            {"name": "Tortuguero National Park", "description": "Remote rainforest canals accessible only by boat, major sea turtle nesting site.", "image_url": "https://images.unsplash.com/photo-1518399681705-1c1a55e5e883?w=600", "points": 25},
            {"name": "Rio Celeste Waterfall", "description": "Brilliant turquoise waterfall created by volcanic minerals mixing in the river.", "image_url": "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=600", "points": 25},
        ]
    },
    "ecuador": {
        "country_name": "Ecuador",
        "continent": "Americas",
        "landmarks": [
            {"name": "Cotopaxi Volcano", "description": "One of the world's highest active volcanoes with a perfect snow-capped cone.", "image_url": "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=600", "points": 25},
            {"name": "Nariz del Diablo Train", "description": "Thrilling train ride through dramatic switchbacks carved into sheer mountain faces.", "image_url": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600", "points": 25},
            {"name": "Mindo Cloud Forest", "description": "Biodiversity hotspot with hummingbirds, butterflies, and canopy adventures.", "image_url": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=600", "points": 25},
        ]
    },
    
    # ============== AFRICA ==============
    "botswana": {
        "country_name": "Botswana",
        "continent": "Africa",
        "landmarks": [
            {"name": "Okavango Delta Safari", "description": "World's largest inland delta, explore by mokoro canoe among elephants and hippos.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600", "points": 25},
            {"name": "Makgadikgadi Salt Pans", "description": "Vast prehistoric lake bed, one of the largest salt flats in the world.", "image_url": "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600", "points": 25},
            {"name": "Chobe Elephant Reserve", "description": "Home to Africa's largest elephant population with incredible river cruises.", "image_url": "https://images.unsplash.com/photo-1549366021-9f761d450615?w=600", "points": 25},
        ]
    },
    "kenya": {
        "country_name": "Kenya",
        "continent": "Africa",
        "landmarks": [
            {"name": "Lake Nakuru Flamingos", "description": "Alkaline lake that turns pink with millions of flamingos and diverse wildlife.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600", "points": 25},
            {"name": "Diani Beach", "description": "Pristine white sand beach with coral reefs and traditional Swahili culture.", "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600", "points": 25},
            {"name": "Hell's Gate National Park", "description": "Dramatic gorges and geothermal vents where you can hike and cycle among wildlife.", "image_url": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600", "points": 25},
        ]
    },
    "mauritius": {
        "country_name": "Mauritius",
        "continent": "Africa",
        "landmarks": [
            {"name": "Underwater Waterfall Illusion", "description": "Stunning optical illusion off Le Morne peninsula - sand cascading into the deep.", "image_url": "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=600", "points": 25},
            {"name": "Seven Colored Earths", "description": "Geological wonder with sand dunes in seven distinct colors from volcanic activity.", "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600", "points": 25},
            {"name": "Black River Gorges", "description": "National park with endemic wildlife and stunning waterfalls in lush forest.", "image_url": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=600", "points": 25},
        ]
    },
    "morocco": {
        "country_name": "Morocco",
        "continent": "Africa",
        "landmarks": [
            {"name": "Chefchaouen Blue City", "description": "Enchanting mountain town where every building is painted in shades of blue.", "image_url": "https://images.unsplash.com/photo-1553603227-2358aabe821e?w=600", "points": 25},
            {"name": "Ait Benhaddou", "description": "UNESCO fortified village - iconic mud-brick ksar used in countless films.", "image_url": "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600", "points": 25},
            {"name": "Erg Chebbi Dunes", "description": "Towering Saharan sand dunes reaching 150 meters, perfect for camel treks.", "image_url": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600", "points": 25},
        ]
    },
    "namibia": {
        "country_name": "Namibia",
        "continent": "Africa",
        "landmarks": [
            {"name": "Sossusvlei Dunes", "description": "World's tallest sand dunes with surreal red and orange colors at sunrise.", "image_url": "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600", "points": 25},
            {"name": "Deadvlei", "description": "Surreal white clay pan dotted with 900-year-old dead camel thorn trees.", "image_url": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600", "points": 25},
            {"name": "Fish River Canyon", "description": "Second largest canyon in the world with dramatic hiking trails.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600", "points": 25},
        ]
    },
    "seychelles": {
        "country_name": "Seychelles",
        "continent": "Africa",
        "landmarks": [
            {"name": "Vallée de Mai", "description": "UNESCO prehistoric forest home to the unique coco de mer palm.", "image_url": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=600", "points": 25},
            {"name": "Anse Source d'Argent", "description": "World-famous beach with giant granite boulders and pristine waters.", "image_url": "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=600", "points": 25},
            {"name": "Aldabra Atoll", "description": "Remote UNESCO site with giant tortoises and pristine coral ecosystems.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600", "points": 25},
        ]
    },
    "tanzania": {
        "country_name": "Tanzania",
        "continent": "Africa",
        "landmarks": [
            {"name": "Ngorongoro Crater", "description": "World's largest intact volcanic caldera, teeming with wildlife.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600", "points": 25},
            {"name": "Stone Town Zanzibar", "description": "Historic UNESCO town with winding alleys, spice markets, and carved doors.", "image_url": "https://images.unsplash.com/photo-1568454537842-d933259bb258?w=600", "points": 25},
            {"name": "Lake Manyara Tree Lions", "description": "Unique park where lions climb and sleep in acacia trees.", "image_url": "https://images.unsplash.com/photo-1534177616064-ef1a1dd14b3a?w=600", "points": 25},
        ]
    },
    "tunisia": {
        "country_name": "Tunisia",
        "continent": "Africa",
        "landmarks": [
            {"name": "Sidi Bou Said", "description": "Picturesque blue and white hilltop village overlooking the Mediterranean.", "image_url": "https://images.unsplash.com/photo-1553603227-2358aabe821e?w=600", "points": 25},
            {"name": "Star Wars Mos Espa Set", "description": "Original Star Wars filming location preserved in the Saharan desert.", "image_url": "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600", "points": 25},
            {"name": "Dougga Roman Ruins", "description": "Best-preserved Roman town in North Africa with stunning hilltop temple.", "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600", "points": 25},
        ]
    },
    
    # ============== ASIA ==============
    "indonesia": {
        "country_name": "Indonesia",
        "continent": "Asia",
        "landmarks": [
            {"name": "Kelimutu Tri-Colored Lakes", "description": "Three crater lakes that mysteriously change colors on Flores Island.", "image_url": "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=600", "points": 25},
            {"name": "Tana Toraja", "description": "Ancient culture with elaborate funeral ceremonies and cliff-side burial caves.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600", "points": 25},
            {"name": "Kawah Ijen Blue Fire", "description": "Volcanic crater with electric blue flames from burning sulfur at night.", "image_url": "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=600", "points": 25},
        ]
    },
    "malaysia": {
        "country_name": "Malaysia",
        "continent": "Asia",
        "landmarks": [
            {"name": "Cameron Highlands Tea", "description": "Cool highlands with rolling tea plantations and strawberry farms.", "image_url": "https://images.unsplash.com/photo-1587613990444-c1e459892840?w=600", "points": 25},
            {"name": "Langkawi Sky Bridge", "description": "Curved pedestrian bridge suspended 660m above sea level with stunning views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600", "points": 25},
            {"name": "Mulu Caves", "description": "UNESCO World Heritage caves with the world's largest cave chamber.", "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600", "points": 25},
        ]
    },
    "singapore": {
        "country_name": "Singapore",
        "continent": "Asia",
        "landmarks": [
            {"name": "Haw Par Villa", "description": "Surreal theme park depicting Chinese folklore with over 1,000 statues.", "image_url": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600", "points": 25},
            {"name": "Pulau Ubin Island", "description": "Step back in time on this rustic island with kampong villages and wildlife.", "image_url": "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600", "points": 25},
            {"name": "Supertree Grove Light Show", "description": "Futuristic vertical gardens with nightly light and sound spectacular.", "image_url": "https://images.unsplash.com/photo-1506351421178-63b52a2d2562?w=600", "points": 25},
        ]
    },
    "south_korea": {
        "country_name": "South Korea",
        "continent": "Asia",
        "landmarks": [
            {"name": "Gamcheon Culture Village", "description": "Colorful hillside village in Busan known as 'Korea's Santorini'.", "image_url": "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600", "points": 25},
            {"name": "Jeju Lava Tubes", "description": "UNESCO World Heritage lava tubes with stunning formations.", "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600", "points": 25},
            {"name": "Boseong Green Tea Fields", "description": "Stunning terraced tea plantations in a verdant mountain setting.", "image_url": "https://images.unsplash.com/photo-1587613990444-c1e459892840?w=600", "points": 25},
        ]
    },
    "vietnam": {
        "country_name": "Vietnam",
        "continent": "Asia",
        "landmarks": [
            {"name": "Hang Son Doong Cave", "description": "World's largest cave, big enough to fit a 40-story skyscraper.", "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600", "points": 25},
            {"name": "Golden Bridge Ba Na Hills", "description": "Stunning bridge supported by giant stone hands emerging from the mountains.", "image_url": "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600", "points": 25},
            {"name": "Ninh Binh Tam Coc", "description": "Stunning karst landscape known as 'Ha Long Bay on Land' with river caves.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=600", "points": 25},
        ]
    },
    
    # ============== EUROPE ==============
    "netherlands": {
        "country_name": "Netherlands",
        "continent": "Europe",
        "landmarks": [
            {"name": "Delta Works", "description": "Engineering marvel - world's largest flood protection system.", "image_url": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600", "points": 25},
            {"name": "Cube Houses Rotterdam", "description": "Innovative tilted cube-shaped houses that defy architectural norms.", "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600", "points": 25},
            {"name": "Tulip Fields Lisse", "description": "Endless colorful tulip fields creating a rainbow landscape in spring.", "image_url": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600", "points": 25},
        ]
    },
    "portugal": {
        "country_name": "Portugal",
        "continent": "Europe",
        "landmarks": [
            {"name": "Benagil Sea Cave", "description": "Stunning coastal cave with a natural skylight, accessible only by water.", "image_url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600", "points": 25},
            {"name": "Livraria Lello Bookstore", "description": "Neo-Gothic bookstore with ornate staircase that inspired Harry Potter.", "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600", "points": 25},
            {"name": "Pena Palace Sintra", "description": "Fairytale Romanticist castle with vibrant colors atop misty hills.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600", "points": 25},
        ]
    },
    "switzerland": {
        "country_name": "Switzerland",
        "continent": "Europe",
        "landmarks": [
            {"name": "Lauterbrunnen Valley", "description": "Valley of 72 waterfalls that inspired Tolkien's Rivendell.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600", "points": 25},
            {"name": "Glacier Express", "description": "Scenic train journey through 291 bridges and 91 tunnels in the Alps.", "image_url": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600", "points": 25},
            {"name": "Aletsch Glacier", "description": "Largest glacier in the Alps, a UNESCO World Heritage natural wonder.", "image_url": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600", "points": 25},
        ]
    },
}


def add_premium_landmarks():
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Get existing landmark names to avoid duplicates
    existing_names = set()
    for doc in db.landmarks.find({}, {"name": 1}):
        existing_names.add(doc["name"].lower())
    
    print(f"Total existing landmarks: {len(existing_names)}")
    print("=" * 60)
    
    added_count = 0
    skipped_count = 0
    
    for country_id, data in NEW_PREMIUM_LANDMARKS.items():
        country_name = data["country_name"]
        continent = data["continent"]
        landmarks = data["landmarks"]
        
        print(f"\n📍 {country_name} ({continent}):")
        
        for landmark in landmarks:
            # Check for duplicate
            if landmark["name"].lower() in existing_names:
                print(f"  ⚠️ SKIP (exists): {landmark['name']}")
                skipped_count += 1
                continue
            
            # Create landmark document
            doc = {
                "landmark_id": f"{country_id}_{landmark['name'].lower().replace(' ', '_').replace(\"'\", '')}",
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "name": landmark["name"],
                "description": landmark["description"],
                "image_url": landmark["image_url"],
                "images": [landmark["image_url"]],
                "difficulty": "Medium",
                "category": "premium",
                "points": landmark["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(),
                "facts": [],
                "best_time_to_visit": "Year-round",
                "duration": "2-4 hours",
                "latitude": None,
                "longitude": None,
            }
            
            # Insert into database
            db.landmarks.insert_one(doc)
            existing_names.add(landmark["name"].lower())  # Add to set to prevent duplicates within batch
            print(f"  ✅ Added: {landmark['name']}")
            added_count += 1
    
    print("\n" + "=" * 60)
    print(f"✅ TOTAL ADDED: {added_count} premium landmarks")
    print(f"⚠️ TOTAL SKIPPED: {skipped_count} (already existed)")
    print("=" * 60)
    
    # Verify counts
    total = db.landmarks.count_documents({})
    premium = db.landmarks.count_documents({"category": "premium"})
    print(f"\n📊 FINAL DATABASE STATE:")
    print(f"  Total landmarks: {total}")
    print(f"  Premium landmarks: {premium}")
    print(f"  Official landmarks: {total - premium}")
    
    client.close()


if __name__ == "__main__":
    add_premium_landmarks()
