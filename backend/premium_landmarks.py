# Premium Landmarks - Exclusive landmarks for Premium members
# These are unique landmarks NOT included in the official seed_data.py list
# Duplicates have been removed to prevent conflicts during database seeding
#
# Last cleaned: January 2025
# Total unique premium landmarks: 94 (34 original + 60 new)

PREMIUM_LANDMARKS = {
    # ============== ORIGINAL PREMIUM LANDMARKS ==============
    "norway": [
        {"name": "Røros Mining Town", "description": "UNESCO World Heritage Site - a charming mining town with colorful wooden houses and rich copper mining history dating back to 1644.", "image_url": "", "points": 25},
        {"name": "Borgund Stave Church", "description": "Norway's best-preserved stave church from the 12th century, featuring intricate Viking-era dragon carvings and medieval architecture.", "image_url": "", "points": 25},
        {"name": "Atlantic Ocean Road", "description": "Scenic road connecting islands with eight bridges, considered one of the world's most beautiful drives.", "image_url": "", "points": 25},
        {"name": "Sognefjord", "description": "Norway's longest and deepest fjord, stretching 205 km inland with spectacular scenery.", "image_url": "", "points": 25},
        {"name": "Tromsø Arctic Cathedral", "description": "Striking modern church with distinctive triangular shape, known as the Arctic Cathedral.", "image_url": "", "points": 25},
    ],
    "france": [
        {"name": "French Riviera (Côte d'Azur)", "description": "Glamorous coastline known for luxury resorts, pristine beaches, and Mediterranean charm.", "image_url": "", "points": 25},
        {"name": "Provence Lavender Fields", "description": "Iconic purple lavender fields stretching across the Provençal countryside.", "image_url": "", "points": 25},
    ],
    "italy": [
        {"name": "Vatican Museums", "description": "World-renowned art collection including the Sistine Chapel ceiling by Michelangelo.", "image_url": "", "points": 25},
        {"name": "Dolomites Mountains", "description": "Dramatic mountain range with jagged peaks, perfect for hiking and skiing.", "image_url": "", "points": 25},
    ],
    "japan": [
        {"name": "Nara Deer Park", "description": "Historic park where over 1,000 sacred deer roam freely among temples.", "image_url": "", "points": 25},
        {"name": "Himeji Castle", "description": "Stunning white castle considered the finest surviving example of Japanese castle architecture.", "image_url": "", "points": 25},
    ],
    "egypt": [
        {"name": "White Desert", "description": "Otherworldly landscape of white chalk rock formations shaped by sandstorms.", "image_url": "", "points": 25},
    ],
    "peru": [
        {"name": "Moray Terraces", "description": "Circular Incan agricultural terraces creating a natural amphitheater.", "image_url": "", "points": 25},
    ],
    "australia": [
        {"name": "Whitehaven Beach", "description": "Pristine white silica sand beach in the Whitsunday Islands.", "image_url": "", "points": 25},
        {"name": "Daintree Rainforest", "description": "Ancient tropical rainforest meeting the Great Barrier Reef, UNESCO World Heritage site.", "image_url": "", "points": 25},
    ],
    "usa": [
        {"name": "Antelope Canyon", "description": "Stunning slot canyon with light beams creating magical photography opportunities.", "image_url": "", "points": 25},
        {"name": "Brooklyn Bridge", "description": "Historic suspension bridge connecting Manhattan and Brooklyn, engineering marvel.", "image_url": "", "points": 25},
    ],
    "uk": [
        {"name": "Lake District", "description": "Stunning national park with mountains, lakes, and picturesque villages.", "image_url": "", "points": 25},
        {"name": "Giant's Causeway", "description": "Natural wonder of 40,000 interlocking basalt columns formed by volcanic activity.", "image_url": "", "points": 25},
    ],
    "china": [
        {"name": "Zhangjiajie National Forest Park", "description": "Towering sandstone pillars that inspired Avatar's floating mountains.", "image_url": "", "points": 25},
        {"name": "Jiuzhaigou Valley", "description": "Nature reserve with colorful lakes, waterfalls, and snow-capped peaks.", "image_url": "", "points": 25},
    ],
    "spain": [
        {"name": "Camino de Santiago", "description": "Historic pilgrimage route ending at Santiago de Compostela Cathedral.", "image_url": "", "points": 25},
        {"name": "Ibiza Old Town", "description": "Historic walled city with cobblestone streets and stunning Mediterranean views.", "image_url": "", "points": 25},
    ],
    "thailand": [
        {"name": "Erawan National Park", "description": "Park featuring stunning seven-tiered waterfall with emerald pools.", "image_url": "", "points": 25},
    ],
    "india": [
        {"name": "Kerala Backwaters", "description": "Network of lagoons and canals with traditional houseboat cruises.", "image_url": "", "points": 25},
        {"name": "Hampi", "description": "Ancient city ruins with temple complexes and boulder-strewn landscape.", "image_url": "", "points": 25},
    ],
    "mexico": [
        {"name": "Cenote Ik Kil", "description": "Stunning open-air cenote (sinkhole) with turquoise water near Chichen Itza.", "image_url": "", "points": 25},
        {"name": "Isla Holbox", "description": "Car-free island paradise with bioluminescent waters and whale sharks.", "image_url": "", "points": 25},
        {"name": "San Miguel de Allende", "description": "Colonial-era city with baroque architecture and vibrant art scene.", "image_url": "", "points": 25},
    ],
    "uae": [
        {"name": "Dubai Frame", "description": "150-meter high frame offering panoramic views of old and new Dubai.", "image_url": "", "points": 25},
        {"name": "Al Ain Oasis", "description": "Ancient oasis with 147,000 date palms and traditional irrigation system.", "image_url": "", "points": 25},
        {"name": "Hajar Mountains", "description": "Dramatic mountain range with traditional villages and scenic wadis.", "image_url": "", "points": 25},
    ],
    "germany": [
        {"name": "Rhine Valley", "description": "UNESCO site with castles, vineyards, and charming riverside villages.", "image_url": "", "points": 25},
    ],
    "canada": [
        {"name": "Churchill (Polar Bears)", "description": "Remote town known as 'Polar Bear Capital of the World' for wildlife viewing.", "image_url": "", "points": 25},
    ],
    
    # ============== NEW PREMIUM LANDMARKS (Added January 2025) ==============
    # OCEANIA
    "cook_islands": [
        {"name": "Te Vara Nui Village", "description": "Cultural village showcasing traditional Polynesian dance, crafts, and ancient legends.", "image_url": "", "points": 25},
        {"name": "One Foot Island", "description": "Remote paradise island with the world's most unique post office, accessible only by boat.", "image_url": "", "points": 25},
    ],
    "fiji": [
        {"name": "Sawa-i-Lau Caves", "description": "Sacred limestone caves with an underwater entrance to a hidden chamber.", "image_url": "", "points": 25},
        {"name": "Bouma National Heritage Park", "description": "Pristine rainforest with three stunning waterfalls and natural swimming pools.", "image_url": "", "points": 25},
    ],
    "samoa": [
        {"name": "Papaseea Sliding Rocks", "description": "Natural water slides carved by centuries of flowing water through volcanic rock.", "image_url": "", "points": 25},
    ],
    "tonga": [
        {"name": "Ha'atafu Beach", "description": "Pristine beach with excellent snorkeling and traditional Tongan villages nearby.", "image_url": "", "points": 25},
        {"name": "Humpback Whale Sanctuary", "description": "World-class whale watching where you can swim with humpback whales.", "image_url": "", "points": 25},
    ],
    "vanuatu": [
        {"name": "Blue Lagoon Espiritu Santo", "description": "Mesmerizing freshwater lagoon with impossibly blue waters in pristine jungle.", "image_url": "", "points": 25},
    ],
    "french_polynesia": [
        {"name": "Moorea Belvedere Lookout", "description": "Breathtaking viewpoint overlooking Cook's Bay and Opunohu Bay.", "image_url": "", "points": 25},
        {"name": "Rangiroa Blue Lagoon", "description": "A lagoon within a lagoon, with vibrant coral gardens and reef sharks.", "image_url": "", "points": 25},
    ],
    "new_zealand": [
        {"name": "Waitomo Glowworm Caves", "description": "Magical underground caves illuminated by thousands of bioluminescent glowworms.", "image_url": "", "points": 25},
        {"name": "Coromandel Cathedral Cove", "description": "Stunning natural rock archway on a white sand beach, accessible only by foot or kayak.", "image_url": "", "points": 25},
        {"name": "Wai-O-Tapu Thermal Wonderland", "description": "Geothermal area with bubbling mud pools and the Champagne Pool's vibrant colors.", "image_url": "", "points": 25},
    ],
    
    # AMERICAS
    "argentina": [
        {"name": "Quebrada de Humahuaca", "description": "UNESCO World Heritage valley with colorful mountains and ancient Incan history.", "image_url": "", "points": 25},
        {"name": "Caminito Street", "description": "Iconic colorful street in La Boca neighborhood, birthplace of tango.", "image_url": "", "points": 25},
        {"name": "Tierra del Fuego National Park", "description": "End-of-the-world wilderness with dramatic coastlines and sub-Antarctic forests.", "image_url": "", "points": 25},
    ],
    "chile": [
        {"name": "Marble Caves of Patagonia", "description": "Stunning blue marble formations carved by 6,000 years of waves on General Carrera Lake.", "image_url": "", "points": 25},
        {"name": "Valle de la Luna", "description": "Otherworldly desert landscape in Atacama with moon-like terrain and salt formations.", "image_url": "", "points": 25},
    ],
    "colombia": [
        {"name": "Lost City (Ciudad Perdida)", "description": "Ancient terraced city hidden in Sierra Nevada, older than Machu Picchu.", "image_url": "", "points": 25},
        # NOTE: "Salt Cathedral of Zipaquirá" removed - duplicate of official landmark
    ],
    "costa_rica": [
        {"name": "Tortuguero National Park", "description": "Remote rainforest canals accessible only by boat, major sea turtle nesting site.", "image_url": "", "points": 25},
    ],
    "ecuador": [
        {"name": "Nariz del Diablo Train", "description": "Thrilling train ride through dramatic switchbacks carved into sheer mountain faces.", "image_url": "", "points": 25},
    ],
    
    # AFRICA
    "botswana": [
        {"name": "Okavango Delta Safari", "description": "World's largest inland delta, explore by mokoro canoe among elephants and hippos.", "image_url": "", "points": 25},
        {"name": "Chobe Elephant Reserve", "description": "Home to Africa's largest elephant population with incredible river cruises.", "image_url": "", "points": 25},
    ],
    "kenya": [
        {"name": "Lake Nakuru Flamingos", "description": "Alkaline lake that turns pink with millions of flamingos and diverse wildlife.", "image_url": "", "points": 25},
    ],
    "mauritius": [
        {"name": "Underwater Waterfall Illusion", "description": "Stunning optical illusion off Le Morne peninsula - sand cascading into the deep.", "image_url": "", "points": 25},
        {"name": "Seven Colored Earths", "description": "Geological wonder with sand dunes in seven distinct colors from volcanic activity.", "image_url": "", "points": 25},
    ],
    "morocco": [
        {"name": "Erg Chebbi Dunes", "description": "Towering Saharan sand dunes reaching 150 meters, perfect for camel treks.", "image_url": "", "points": 25},
    ],
    "namibia": [
        {"name": "Twyfelfontein Rock Engravings", "description": "UNESCO World Heritage site with over 2,500 ancient rock engravings and paintings from 6,000 years ago.", "image_url": "", "points": 25},
        {"name": "Cape Cross Seal Colony", "description": "One of the world's largest Cape fur seal colonies with over 200,000 seals along the Skeleton Coast.", "image_url": "", "points": 25},
        {"name": "Quiver Tree Forest", "description": "Mystical forest of ancient aloe trees (kokerboom) that glow golden at sunset, some over 300 years old.", "image_url": "", "points": 25},
    ],
    "seychelles": [
        {"name": "Giant Tortoise Sanctuary", "description": "Home to hundreds of giant Aldabra tortoises, some over 100 years old, that roam freely on the island.", "image_url": "", "points": 25},
        {"name": "La Digue Island", "description": "Car-free paradise island explored by bicycle, with stunning granite boulder beaches and rare birds.", "image_url": "", "points": 25},
        {"name": "Coco de Mer Reserve", "description": "Protected reserve featuring the world's largest seed - the legendary 'love nut' palm found only in Seychelles.", "image_url": "", "points": 25},
    ],
    "tanzania": [
        {"name": "Stone Town Zanzibar", "description": "Historic UNESCO town with winding alleys, spice markets, and carved doors.", "image_url": "", "points": 25},
        {"name": "Lake Manyara Tree Lions", "description": "Unique park where lions climb and sleep in acacia trees.", "image_url": "", "points": 25},
    ],
    "tunisia": [
        {"name": "Star Wars Mos Espa Set", "description": "Original Star Wars filming location preserved in the Saharan desert.", "image_url": "", "points": 25},
        {"name": "Dougga Roman Ruins", "description": "Best-preserved Roman town in North Africa with stunning hilltop temple.", "image_url": "", "points": 25},
    ],
    
    # ASIA
    "indonesia": [
        {"name": "Kelimutu Tri-Colored Lakes", "description": "Three crater lakes that mysteriously change colors on Flores Island.", "image_url": "", "points": 25},
        {"name": "Tana Toraja", "description": "Ancient culture with elaborate funeral ceremonies and cliff-side burial caves.", "image_url": "", "points": 25},
        {"name": "Kawah Ijen Blue Fire", "description": "Volcanic crater with electric blue flames from burning sulfur at night.", "image_url": "", "points": 25},
    ],
    "malaysia": [
        {"name": "Cameron Highlands Tea", "description": "Cool highlands with rolling tea plantations and strawberry farms.", "image_url": "", "points": 25},
        {"name": "Langkawi Sky Bridge", "description": "Curved pedestrian bridge suspended 660m above sea level with stunning views.", "image_url": "", "points": 25},
        {"name": "Mulu Caves", "description": "UNESCO World Heritage caves with the world's largest cave chamber.", "image_url": "", "points": 25},
    ],
    "singapore": [
        {"name": "Haw Par Villa", "description": "Surreal theme park depicting Chinese folklore with over 1,000 statues.", "image_url": "", "points": 25},
        {"name": "Pulau Ubin Island", "description": "Step back in time on this rustic island with kampong villages and wildlife.", "image_url": "", "points": 25},
        {"name": "Supertree Grove Light Show", "description": "Futuristic vertical gardens with nightly light and sound spectacular.", "image_url": "", "points": 25},
    ],
    "south_korea": [
        {"name": "Jeju Lava Tubes", "description": "UNESCO World Heritage lava tubes with stunning formations.", "image_url": "", "points": 25},
        {"name": "Boseong Green Tea Fields", "description": "Stunning terraced tea plantations in a verdant mountain setting.", "image_url": "", "points": 25},
    ],
    "vietnam": [
        {"name": "Hang Son Doong Cave", "description": "World's largest cave, big enough to fit a 40-story skyscraper.", "image_url": "", "points": 25},
        {"name": "Golden Bridge Ba Na Hills", "description": "Stunning bridge supported by giant stone hands emerging from the mountains.", "image_url": "", "points": 25},
        {"name": "Ninh Binh Tam Coc", "description": "Stunning karst landscape known as 'Ha Long Bay on Land' with river caves.", "image_url": "", "points": 25},
    ],
    
    # EUROPE
    "netherlands": [
        {"name": "Delta Works", "description": "Engineering marvel - world's largest flood protection system.", "image_url": "", "points": 25},
        {"name": "Cube Houses Rotterdam", "description": "Innovative tilted cube-shaped houses that defy architectural norms.", "image_url": "", "points": 25},
        {"name": "Tulip Fields Lisse", "description": "Endless colorful tulip fields creating a rainbow landscape in spring.", "image_url": "", "points": 25},
    ],
    "portugal": [
        {"name": "Benagil Sea Cave", "description": "Stunning coastal cave with a natural skylight, accessible only by water.", "image_url": "", "points": 25},
        {"name": "Livraria Lello Bookstore", "description": "Neo-Gothic bookstore with ornate staircase that inspired Harry Potter.", "image_url": "", "points": 25},
    ],
    "switzerland": [
        {"name": "Lauterbrunnen Valley", "description": "Valley of 72 waterfalls that inspired Tolkien's Rivendell.", "image_url": "", "points": 25},
        {"name": "Glacier Express", "description": "Scenic train journey through 291 bridges and 91 tunnels in the Alps.", "image_url": "", "points": 25},
        {"name": "Aletsch Glacier", "description": "Largest glacier in the Alps, a UNESCO World Heritage natural wonder.", "image_url": "", "points": 25},
    ],
}
