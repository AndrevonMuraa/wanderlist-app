import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from premium_landmarks import PREMIUM_LANDMARKS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Countries and their continents
COUNTRIES_DATA = [
    # Original 10 countries
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
    # New 10 countries
    {"country_id": "spain", "name": "Spain", "continent": "Europe"},
    {"country_id": "greece", "name": "Greece", "continent": "Europe"},
    {"country_id": "thailand", "name": "Thailand", "continent": "Asia"},
    {"country_id": "india", "name": "India", "continent": "Asia"},
    {"country_id": "brazil", "name": "Brazil", "continent": "South America"},
    {"country_id": "mexico", "name": "Mexico", "continent": "North America"},
    {"country_id": "uae", "name": "United Arab Emirates", "continent": "Asia"},
    {"country_id": "germany", "name": "Germany", "continent": "Europe"},
    {"country_id": "canada", "name": "Canada", "continent": "North America"},
    {"country_id": "south_africa", "name": "South Africa", "continent": "Africa"},
]

# 10 landmarks per country
LANDMARKS_DATA = {
    "norway": [
        {
            "name": "The Old Town of Fredrikstad", 
            "description": "A well-preserved fortified town with cobblestone streets and historic buildings.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Historic Fortress City",
                    "text": "Founded in 1567 by King Frederick II, Fredrikstad is the best-preserved fortified town in Scandinavia. The star-shaped fortress remains intact with its original moat and ramparts.",
                    "icon": "shield-outline"
                },
                {
                    "title": "Cobblestone Streets",
                    "text": "Walk through charming cobblestone streets lined with 17th-century buildings, artisan shops, and cozy cafés. The old town has been continuously inhabited for over 450 years.",
                    "icon": "home-outline"
                },
                {
                    "title": "Living History",
                    "text": "The fortress walls host cultural events, festivals, and theatrical performances. Local artisans still practice traditional crafts in workshops within the old town.",
                    "icon": "people-outline"
                }
            ],
            "best_time_to_visit": "June-August",
            "duration": "3-4 hours",
            "difficulty": "Easy"
        },
        {
            "name": "Preikestolen (Pulpit Rock)", 
            "description": "A steep cliff that rises 604 meters above Lysefjorden, offering breathtaking views.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Iconic Cliff Formation",
                    "text": "Pulpit Rock rises 604 meters above Lysefjorden, featuring a flat-topped cliff approximately 25x25 meters. Formed during the Ice Age by glacial erosion about 10,000 years ago.",
                    "icon": "triangle-outline"
                },
                {
                    "title": "Popular Hiking Destination",
                    "text": "The 8km round-trip hike takes 4-5 hours and attracts over 300,000 visitors annually. The trail offers stunning views of the fjord and surrounding mountains.",
                    "icon": "walk-outline"
                },
                {
                    "title": "Natural Wonder",
                    "text": "Despite appearing precarious, geologists say there's no immediate risk of the rock falling. However, the spectacular drop creates an unforgettable experience for visitors.",
                    "icon": "warning-outline"
                }
            ],
            "best_time_to_visit": "May-September",
            "duration": "4-5 hours",
            "difficulty": "Moderate"
        },
        {
            "name": "Bryggen", 
            "description": "Colorful wooden houses on the waterfront in Bergen, a UNESCO World Heritage site.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "UNESCO World Heritage",
                    "text": "Bryggen (the wharf) has been a UNESCO World Heritage site since 1979. These colorful wooden buildings date back to the 14th century and represent the Hanseatic League trading post.",
                    "icon": "ribbon-outline"
                },
                {
                    "title": "Hanseatic Legacy",
                    "text": "From 1360 to 1754, Bryggen was the center of the Hanseatic League's trading empire in Norway. German merchants lived and worked here, controlling Bergen's trade.",
                    "icon": "boat-outline"
                },
                {
                    "title": "Survived Many Fires",
                    "text": "Despite being rebuilt numerous times after devastating fires (most recently in 1955), the area maintains its medieval street plan and distinctive wooden architecture.",
                    "icon": "flame-outline"
                }
            ],
            "best_time_to_visit": "May-September",
            "duration": "2-3 hours",
            "difficulty": "Easy"
        },
        {
            "name": "Nidaros Cathedral", 
            "description": "Norway's national sanctuary, built over the burial site of St. Olav.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "National Sanctuary",
                    "text": "Built over the burial site of St. Olav, the patron saint of Norway. Construction began in 1070, and it remains the northernmost medieval cathedral in the world.",
                    "icon": "ribbon-outline"
                },
                {
                    "title": "Gothic Architecture",
                    "text": "The cathedral showcases stunning Gothic architecture with intricate stone carvings. It has been the coronation church for Norwegian kings since 1814.",
                    "icon": "business-outline"
                },
                {
                    "title": "Pilgrimage Site",
                    "text": "For centuries, pilgrims have traveled the St. Olav Ways to reach this sacred site. The tradition continues today with thousands walking the historic routes.",
                    "icon": "walk-outline"
                }
            ],
            "best_time_to_visit": "May-September",
            "duration": "1-2 hours",
            "difficulty": "Easy"
        },
        {
            "name": "Geirangerfjord", 
            "description": "A stunning fjord known for its deep blue waters and majestic waterfalls.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "UNESCO Fjord",
                    "text": "Geirangerfjord is a UNESCO World Heritage site, renowned as one of the most beautiful fjords in the world. The 15km fjord features cascading waterfalls and snow-capped peaks.",
                    "icon": "water-outline"
                },
                {
                    "title": "Seven Sisters Waterfall",
                    "text": "The fjord is home to the famous Seven Sisters waterfall (De syv søstrene), which plunges 250 meters into the fjord, along with the 'Bridal Veil' and 'Suitor' waterfalls.",
                    "icon": "rainy-outline"
                },
                {
                    "title": "Abandoned Farms",
                    "text": "Steep mountainsides feature abandoned farms perched on narrow ledges, accessible only by arduous paths. These farms tell stories of hardy people who once called this dramatic landscape home.",
                    "icon": "home-outline"
                }
            ],
            "best_time_to_visit": "May-September",
            "duration": "4-6 hours (cruise)",
            "difficulty": "Easy"
        },
        {
            "name": "Vigeland Sculpture Park", 
            "description": "The world's largest sculpture park made by a single artist, Gustav Vigeland.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "World's Largest Sculpture Park",
                    "text": "Created by Gustav Vigeland, featuring over 200 sculptures in bronze, granite and wrought iron. The park covers 80 acres in Oslo's Frogner Park.",
                    "icon": "star-outline"
                },
                {
                    "title": "Human Experience",
                    "text": "The sculptures depict the cycle of human life, from birth to death, capturing emotions, relationships, and the human condition in stunning detail.",
                    "icon": "people-outline"
                },
                {
                    "title": "Free for All",
                    "text": "The park is open 24/7 and completely free to visit, making it one of Oslo's most popular attractions with over a million visitors annually.",
                    "icon": "heart-outline"
                }
            ],
            "best_time_to_visit": "Year-round",
            "duration": "2-3 hours",
            "difficulty": "Easy"
        },
        {
            "name": "Northern Lights", 
            "description": "Natural light display in Arctic skies, best seen in Northern Norway.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Aurora Borealis Magic",
                    "text": "The Northern Lights (Aurora Borealis) occur when solar particles collide with gases in Earth's atmosphere, creating colorful light displays. Northern Norway offers some of the world's best viewing opportunities.",
                    "icon": "sparkles-outline"
                },
                {
                    "title": "Best Viewing Season",
                    "text": "From late September to late March, the polar night in Northern Norway provides ideal darkness for viewing. Tromsø, often called the 'Gateway to the Arctic,' is a premier viewing location.",
                    "icon": "moon-outline"
                },
                {
                    "title": "Colors and Myths",
                    "text": "The lights appear in shades of green, pink, red, yellow, and violet. Ancient Norse mythology believed the lights were reflections from the armor of the Valkyries leading warriors to Valhalla.",
                    "icon": "star-outline"
                }
            ],
            "best_time_to_visit": "September-March",
            "duration": "All night",
            "difficulty": "Easy"
        },
        {
            "name": "Lofoten Islands", 
            "description": "Dramatic peaks, open sea, and sheltered bays in Arctic waters.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Arctic Archipelago",
                    "text": "The Lofoten Islands are an archipelago within the Arctic Circle, known for dramatic scenery with jagged peaks rising directly from the sea, creating a spectacular landscape.",
                    "icon": "snow-outline"
                },
                {
                    "title": "Fishing Villages",
                    "text": "Traditional red fishing cabins (rorbu) dot the coastline. Lofoten has been a fishing center for over 1,000 years, with cod fishing still central to the local economy and culture.",
                    "icon": "fish-outline"
                },
                {
                    "title": "Midnight Sun",
                    "text": "From late May to mid-July, the sun never sets, creating unique opportunities for hiking, kayaking, and photography in 24-hour daylight. Winter brings the magical polar night.",
                    "icon": "sunny-outline"
                }
            ],
            "best_time_to_visit": "May-September",
            "duration": "3-5 days",
            "difficulty": "Easy-Moderate"
        },
        {
            "name": "Akershus Fortress", 
            "description": "Medieval castle and fortress in Oslo, built to protect the capital.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Medieval Stronghold",
                    "text": "Built around 1299, Akershus Fortress has never been successfully captured by a foreign enemy. It served as a military base, prison, and royal residence.",
                    "icon": "shield-outline"
                },
                {
                    "title": "Royal Mausoleum",
                    "text": "The fortress church serves as the final resting place for Norwegian kings and queens, including King Haakon VII and Queen Maud.",
                    "icon": "ribbon-outline"
                },
                {
                    "title": "Panoramic Views",
                    "text": "The fortress offers stunning views of Oslo Harbor and the city. Its strategic location has made it central to Oslo's defense for over 700 years.",
                    "icon": "eye-outline"
                }
            ],
            "best_time_to_visit": "Year-round",
            "duration": "2-3 hours",
            "difficulty": "Easy"
        },
        {
            "name": "Trolltunga", 
            "description": "A rock formation jutting horizontally out of a mountain 700 meters above sea level.", 
            "image_url": "",
            "images": [],
            "facts": [
                {
                    "title": "Dramatic Rock Formation",
                    "text": "Trolltunga (Troll's Tongue) is a piece of rock jutting horizontally out from a mountain 700 meters above Lake Ringedalsvatnet. Formed during the Ice Age when glaciers carved the landscape.",
                    "icon": "flash-outline"
                },
                {
                    "title": "Challenging Hike",
                    "text": "The 28km round-trip hike takes 10-12 hours and is one of Norway's most spectacular but demanding trails. The route includes steep climbs and exposed sections.",
                    "icon": "fitness-outline"
                },
                {
                    "title": "Instagram Famous",
                    "text": "Once a hidden gem, Trolltunga has become one of Norway's most photographed landmarks. Over 80,000 hikers attempt the journey annually, despite the challenge.",
                    "icon": "camera-outline"
                }
            ],
            "best_time_to_visit": "June-September",
            "duration": "10-12 hours",
            "difficulty": "Challenging"
        }
    ],
    "france": [
        {
            "name": "Eiffel Tower", 
            "description": "Iconic iron lattice tower in Paris, symbol of France.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Louvre Museum", 
            "description": "World's largest art museum, home to the Mona Lisa.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Notre-Dame Cathedral", 
            "description": "Medieval Catholic cathedral, masterpiece of French Gothic architecture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Mont Saint-Michel", 
            "description": "Island commune topped by medieval monastery.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Palace of Versailles", 
            "description": "Opulent royal château with stunning gardens.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Arc de Triomphe", 
            "description": "Monumental arch honoring those who fought for France.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Pont du Gard", 
            "description": "Ancient Roman aqueduct bridge in southern France.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Château de Chambord", 
            "description": "Distinctive French Renaissance château in Loire Valley.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sacré-Cœur", 
            "description": "Romano-Byzantine basilica on Montmartre hill.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Carcassonne", 
            "description": "Medieval fortified city with impressive ramparts.", 
            "image_url": "",
            "images": []
        },
    ],
    "italy": [
        {
            "name": "Colosseum", 
            "description": "Ancient amphitheater in Rome, largest ever built.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Leaning Tower of Pisa", 
            "description": "Freestanding bell tower known for its unintended tilt.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Venice Canals", 
            "description": "Romantic waterways through historic Venice.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Vatican City", 
            "description": "Smallest country, home to St. Peter's Basilica and the Pope.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Trevi Fountain", 
            "description": "Baroque fountain, the largest in Rome.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Florence Cathedral", 
            "description": "Gothic cathedral with iconic red-tiled dome.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Cinque Terre", 
            "description": "Five colorful villages on rugged Italian Riviera coastline.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Amalfi Coast", 
            "description": "Stunning coastline with cliffside villages.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Pompeii", 
            "description": "Ancient city preserved by volcanic ash from Mt. Vesuvius.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Milan Cathedral", 
            "description": "Magnificent Gothic cathedral in Milan's center.", 
            "image_url": "",
            "images": []
        },
    ],
    "japan": [
        {
            "name": "Mount Fuji", 
            "description": "Japan's highest mountain and iconic snow-capped volcano.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Fushimi Inari Shrine", 
            "description": "Shrine famous for thousands of vermillion torii gates.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Tokyo Tower", 
            "description": "Communications tower inspired by Eiffel Tower.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Kinkaku-ji (Golden Pavilion)", 
            "description": "Zen temple covered in gold leaf in Kyoto.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Hiroshima Peace Memorial", 
            "description": "Monument to the atomic bombing victims.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Osaka Castle", 
            "description": "Historic castle that played a major role in Japanese unification.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Arashiyama Bamboo Grove", 
            "description": "Serene bamboo forest in western Kyoto.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Senso-ji Temple", 
            "description": "Tokyo's oldest temple, founded in 628 AD.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Shibuya Crossing", 
            "description": "World's busiest pedestrian crossing in Tokyo.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Nara Park", 
            "description": "Park where over 1,000 wild deer roam freely.", 
            "image_url": "",
            "images": []
        },
    ],
    "egypt": [
        {
            "name": "Great Pyramids of Giza", 
            "description": "Ancient pyramids, one of the Seven Wonders of the Ancient World.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sphinx", 
            "description": "Limestone statue of a reclining sphinx with human head.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Karnak Temple", 
            "description": "Vast mix of temples, chapels, and other buildings in Luxor.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Valley of the Kings", 
            "description": "Valley where tombs were constructed for pharaohs.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Abu Simbel", 
            "description": "Massive rock temples built by Pharaoh Ramesses II.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Egyptian Museum", 
            "description": "Home to extensive collection of ancient Egyptian antiquities.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Luxor Temple", 
            "description": "Large Ancient Egyptian temple complex on the Nile's east bank.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Khan el-Khalili", 
            "description": "Famous bazaar and souq in historic center of Cairo.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Philae Temple", 
            "description": "Island temple dedicated to goddess Isis.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Alexandria Library", 
            "description": "Modern library commemorating ancient Library of Alexandria.", 
            "image_url": "",
            "images": []
        },
    ],
    "peru": [
        {
            "name": "Machu Picchu", 
            "description": "15th-century Inca citadel set high in the Andes Mountains.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Nazca Lines", 
            "description": "Ancient geoglyphs etched into desert sands.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sacred Valley", 
            "description": "Valley in Andes of Peru, close to Inca capital of Cusco.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Lake Titicaca", 
            "description": "Highest navigable lake in world, on Peru-Bolivia border.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Colca Canyon", 
            "description": "One of world's deepest canyons, home to Andean condors.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Rainbow Mountain", 
            "description": "Mountain with naturally colorful layers of sediment.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sacsayhuamán", 
            "description": "Citadel on northern outskirts of Cusco.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Lima Historic Center", 
            "description": "Colonial center with Plaza Mayor and Spanish architecture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Amazon Rainforest", 
            "description": "Peru's portion of the world's largest tropical rainforest.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Huacachina Oasis", 
            "description": "Desert oasis surrounded by sand dunes.", 
            "image_url": "",
            "images": []
        },
    ],
    "australia": [
        {
            "name": "Sydney Opera House", 
            "description": "Multi-venue performing arts center with distinctive sail design.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Great Barrier Reef", 
            "description": "World's largest coral reef system.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Uluru (Ayers Rock)", 
            "description": "Massive sandstone monolith in the heart of Northern Territory.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Twelve Apostles", 
            "description": "Collection of limestone stacks off the shore of Port Campbell.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sydney Harbour Bridge", 
            "description": "Steel through arch bridge across Sydney Harbour.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Blue Mountains", 
            "description": "Mountainous region known for dramatic scenery.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Bondi Beach", 
            "description": "Popular beach and surfing spot in Sydney.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Great Ocean Road", 
            "description": "Scenic coastal drive with stunning ocean views.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Kakadu National Park", 
            "description": "Vast natural and cultural landscape with Aboriginal rock art.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Kangaroo Island", 
            "description": "Island sanctuary for Australian wildlife.", 
            "image_url": "",
            "images": []
        },
    ],
    "usa": [
        {
            "name": "Statue of Liberty", 
            "description": "Colossal neoclassical sculpture on Liberty Island, New York.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Grand Canyon", 
            "description": "Steep-sided canyon carved by the Colorado River.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Yellowstone National Park", 
            "description": "First national park, known for geothermal features.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Golden Gate Bridge", 
            "description": "Iconic suspension bridge in San Francisco.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Mount Rushmore", 
            "description": "Mountain sculpture featuring four U.S. presidents.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Times Square", 
            "description": "Major commercial intersection in Midtown Manhattan.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Las Vegas Strip", 
            "description": "Famous stretch of Las Vegas Boulevard with casinos and hotels.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Niagara Falls", 
            "description": "Group of three waterfalls on US-Canada border.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "White House", 
            "description": "Official residence and workplace of U.S. President.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Hollywood Sign", 
            "description": "Iconic landmark in Hollywood Hills, Los Angeles.", 
            "image_url": "",
            "images": []
        },
    ],
    "uk": [
        {
            "name": "Big Ben", 
            "description": "Great bell of the clock at Palace of Westminster in London.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Tower of London", 
            "description": "Historic castle on the north bank of River Thames.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Stonehenge", 
            "description": "Prehistoric monument consisting of ring of standing stones.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Buckingham Palace", 
            "description": "London residence and administrative headquarters of monarch.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Edinburgh Castle", 
            "description": "Historic fortress dominating skyline of Edinburgh.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Tower Bridge", 
            "description": "Combined bascule and suspension bridge in London.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Windsor Castle", 
            "description": "Royal residence and the oldest occupied castle in the world.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "British Museum", 
            "description": "Public museum dedicated to human history, art and culture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "London Eye", 
            "description": "Giant Ferris wheel on the South Bank of River Thames.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Westminster Abbey", 
            "description": "Gothic abbey church in City of Westminster, London.", 
            "image_url": "",
            "images": []
        },
    ],
    "china": [
        {
            "name": "Great Wall of China", 
            "description": "Ancient series of walls built across historical northern borders.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Forbidden City", 
            "description": "Palace complex in central Beijing, home to Chinese emperors.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Terracotta Army", 
            "description": "Collection of terracotta sculptures depicting armies of Qin Shi Huang.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Temple of Heaven", 
            "description": "Imperial complex of religious buildings visited by emperors.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Li River", 
            "description": "River in Guangxi famous for karst mountain scenery.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Shanghai Bund", 
            "description": "Waterfront area with colonial-era buildings.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Potala Palace", 
            "description": "Dzong fortress in Lhasa, Tibet, winter palace of Dalai Lamas.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Summer Palace", 
            "description": "Vast ensemble of lakes, gardens and palaces in Beijing.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Yellow Mountain", 
            "description": "Mountain range known for granite peaks and hot springs.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "West Lake", 
            "description": "Freshwater lake in Hangzhou, famous for scenic beauty.", 
            "image_url": "",
            "images": []
        },
    ],
    "spain": [
        {
            "name": "Sagrada Família", 
            "description": "Gaudí's unfinished basilica, Barcelona's most iconic landmark.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Alhambra", 
            "description": "Moorish palace and fortress complex in Granada.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Park Güell", 
            "description": "Colorful mosaic park designed by Antoni Gaudí.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Prado Museum", 
            "description": "World-renowned art museum in Madrid.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "La Rambla", 
            "description": "Famous tree-lined pedestrian street in Barcelona.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Seville Cathedral", 
            "description": "Largest Gothic cathedral in the world with Giralda tower.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Plaza Mayor Madrid", 
            "description": "Central square in Madrid surrounded by historic buildings.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Royal Palace Madrid", 
            "description": "Official residence of Spanish Royal Family.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Mezquita Cordoba", 
            "description": "Former mosque converted to cathedral, architectural marvel.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Casa Batlló", 
            "description": "Gaudí's surreal modernist building in Barcelona.", 
            "image_url": "",
            "images": []
        },
    ],
    "greece": [
        {
            "name": "Acropolis & Parthenon", 
            "description": "Ancient citadel and temple overlooking Athens.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Santorini", 
            "description": "Iconic white-washed villages with blue domes on volcanic cliffs.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Meteora", 
            "description": "Monasteries built on top of towering rock pillars.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Delphi", 
            "description": "Ancient sanctuary and archaeological site, once home to Oracle.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Mykonos", 
            "description": "Cosmopolitan island with windmills, beaches and nightlife.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Palace of Knossos", 
            "description": "Bronze Age archaeological site in Crete, Minoan civilization.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Rhodes Old Town", 
            "description": "Medieval walled city, UNESCO World Heritage Site.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Olympia", 
            "description": "Birthplace of the Olympic Games in ancient Greece.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Corfu Old Town", 
            "description": "Venetian fortresses and elegant Italianate architecture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Temple of Poseidon", 
            "description": "Ancient Greek temple at Cape Sounion overlooking the sea.", 
            "image_url": "",
            "images": []
        },
    ],
    "thailand": [
        {
            "name": "Grand Palace", 
            "description": "Complex of buildings in Bangkok, former home to Thai kings.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Wat Pho", 
            "description": "Temple with giant 46-meter reclining Buddha in Bangkok.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Phi Phi Islands", 
            "description": "Stunning limestone islands in the Andaman Sea.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Wat Arun", 
            "description": "Temple of Dawn with iconic spires on Chao Phraya River.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Ayutthaya", 
            "description": "Ancient city and archaeological site, UNESCO World Heritage.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Chiang Mai Old City", 
            "description": "Historic walled city with hundreds of temples.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Railay Beach", 
            "description": "Secluded beach accessible only by boat, limestone cliffs.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Floating Markets", 
            "description": "Traditional markets on Bangkok's canals and waterways.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sukhothai Historical Park", 
            "description": "Ruins of the first capital of Siam in 13th century.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "James Bond Island", 
            "description": "Iconic limestone karst in Phang Nga Bay, featured in 007 film.", 
            "image_url": "",
            "images": []
        },
    ],
    "india": [
        {
            "name": "Taj Mahal", 
            "description": "White marble mausoleum, one of world's most beautiful buildings.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Amber Fort", 
            "description": "Majestic hilltop fort palace in Jaipur, Rajasthan.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Golden Temple", 
            "description": "Holiest Gurdwara of Sikhism in Amritsar, covered in gold.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Red Fort", 
            "description": "Historic fortified palace in Old Delhi, Mughal architecture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Hawa Mahal", 
            "description": "Palace of Winds with iconic honeycomb facade in Jaipur.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Gateway of India", 
            "description": "Iconic arch monument in Mumbai overlooking Arabian Sea.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Varanasi Ghats", 
            "description": "Sacred steps along the Ganges River, holiest city in Hinduism.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Backwaters of Kerala", 
            "description": "Network of lagoons, lakes and canals in southern India.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Mysore Palace", 
            "description": "Indo-Saracenic palace, former seat of Wodeyar dynasty.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Ajanta & Ellora Caves", 
            "description": "Ancient rock-cut cave temples with intricate carvings.", 
            "image_url": "",
            "images": []
        },
    ],
    "brazil": [
        {
            "name": "Christ the Redeemer", 
            "description": "Iconic 30-meter statue overlooking Rio de Janeiro.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sugarloaf Mountain", 
            "description": "Cable car to granite peak with panoramic Rio views.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Iguazu Falls", 
            "description": "Massive waterfalls system on Argentina-Brazil border.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Copacabana Beach", 
            "description": "Famous 4km beach in Rio de Janeiro.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Amazon Rainforest", 
            "description": "World's largest tropical rainforest, biodiversity hotspot.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Pelourinho", 
            "description": "Historic colonial center of Salvador with colorful buildings.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Lençóis Maranhenses", 
            "description": "White sand dunes with crystal turquoise lagoons.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Fernando de Noronha", 
            "description": "Remote archipelago with pristine beaches and marine life.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Pantanal", 
            "description": "World's largest tropical wetland area, wildlife paradise.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "São Paulo Cathedral", 
            "description": "Neo-Gothic metropolitan cathedral in Brazil's largest city.", 
            "image_url": "",
            "images": []
        },
    ],
    "mexico": [
        {
            "name": "Chichen Itza", 
            "description": "Ancient Mayan city with iconic pyramid El Castillo.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Teotihuacan", 
            "description": "Pyramid of the Sun and Moon near Mexico City.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Tulum", 
            "description": "Mayan ruins on Caribbean cliffside with stunning beach.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Palenque", 
            "description": "Ancient Mayan city in Chiapas jungle with pyramid temples.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Frida Kahlo Museum", 
            "description": "Blue House in Mexico City, former home of iconic artist.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Copper Canyon", 
            "description": "Series of canyons larger and deeper than Grand Canyon.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Cabo San Lucas Arch", 
            "description": "Natural rock formation at Land's End where oceans meet.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Cenotes of Yucatan", 
            "description": "Natural sinkholes with crystal-clear water for swimming.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Zócalo", 
            "description": "Main square in Mexico City, one of world's largest plazas.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Guadalajara Cathedral", 
            "description": "Twin-spired cathedral in historic center of Guadalajara.", 
            "image_url": "",
            "images": []
        },
    ],
    "uae": [
        {
            "name": "Burj Khalifa", 
            "description": "World's tallest building at 828 meters in Dubai.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Sheikh Zayed Grand Mosque", 
            "description": "Stunning white marble mosque in Abu Dhabi, one of world's largest.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Palm Jumeirah", 
            "description": "Artificial archipelago in shape of palm tree in Dubai.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Burj Al Arab", 
            "description": "Luxury hotel on artificial island, iconic sail-shaped design.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Dubai Mall", 
            "description": "World's largest shopping mall with aquarium and ice rink.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Dubai Fountain", 
            "description": "World's largest choreographed fountain system.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Desert Safari Dunes", 
            "description": "Red sand dunes of Arabian Desert, popular safari destination.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Louvre Abu Dhabi", 
            "description": "Art and civilization museum with iconic dome architecture.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Dubai Marina", 
            "description": "Canal city carved along Persian Gulf shoreline.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Al Fahidi Historical District", 
            "description": "Heritage village with traditional wind-tower architecture.", 
            "image_url": "",
            "images": []
        },
    ],
    "germany": [
        {
            "name": "Neuschwanstein Castle", 
            "description": "Fairytale castle that inspired Disney's Sleeping Beauty Castle.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Brandenburg Gate", 
            "description": "Iconic 18th-century neoclassical monument in Berlin.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Cologne Cathedral", 
            "description": "Gothic masterpiece, tallest twin-spired church in world.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Reichstag Building", 
            "description": "German parliament with modern glass dome offering city views.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Heidelberg Castle", 
            "description": "Romantic castle ruins overlooking Neckar River and old town.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Black Forest", 
            "description": "Scenic mountainous region with dense forests and cuckoo clocks.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Romantic Road", 
            "description": "Scenic route through medieval towns and fairytale castles.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Berlin Wall Memorial", 
            "description": "Preserved sections of the Cold War barrier dividing East and West.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Oktoberfest Grounds", 
            "description": "World's largest folk festival held annually in Munich.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Miniatur Wunderland", 
            "description": "World's largest model railway exhibition in Hamburg.", 
            "image_url": "",
            "images": []
        },
    ],
    "canada": [
        {
            "name": "Niagara Falls", 
            "description": "Powerful waterfalls on Canada-US border, boat tours available.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Banff National Park", 
            "description": "Stunning Rocky Mountain scenery with turquoise lakes.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "CN Tower", 
            "description": "Iconic 553-meter communications tower in Toronto.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Old Quebec City", 
            "description": "Historic fortified colonial city, UNESCO World Heritage.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Moraine Lake", 
            "description": "Glacially-fed lake with vibrant turquoise waters in Rockies.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Butchart Gardens", 
            "description": "World-famous 55-acre gardens in Victoria, BC.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Parliament Hill", 
            "description": "Gothic Revival complex housing Canadian government in Ottawa.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Whistler", 
            "description": "Premier ski resort in Coast Mountains of British Columbia.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Bay of Fundy", 
            "description": "Home to the highest tides in the world, up to 16 meters.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Northern Lights Yukon", 
            "description": "Prime aurora borealis viewing destination in northern Canada.", 
            "image_url": "",
            "images": []
        },
    ],
    "south_africa": [
        {
            "name": "Table Mountain", 
            "description": "Flat-topped mountain overlooking Cape Town, cable car access.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Kruger National Park", 
            "description": "Premier safari destination for viewing Big Five wildlife.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Robben Island", 
            "description": "Former prison where Nelson Mandela was held for 18 years.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Cape of Good Hope", 
            "description": "Dramatic headland at Africa's southwestern tip.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Victoria & Alfred Waterfront", 
            "description": "Historic harbor and shopping area in Cape Town.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Garden Route", 
            "description": "Scenic 300km coastal stretch with forests and lagoons.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Blyde River Canyon", 
            "description": "One of world's largest green canyons with dramatic views.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Boulder's Beach", 
            "description": "Beach home to colony of endangered African penguins.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Apartheid Museum", 
            "description": "Moving museum documenting South Africa's apartheid history.", 
            "image_url": "",
            "images": []
        },
        {
            "name": "Drakensberg Mountains", 
            "description": "Highest mountain range in South Africa with hiking trails.", 
            "image_url": "",
            "images": []
        },
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
                "images": landmark.get("images", [landmark["image_url"]]),
                "facts": landmark.get("facts", []),
                "best_time_to_visit": landmark.get("best_time_to_visit", "Year-round"),
                "duration": landmark.get("duration", "2-3 hours"),
                "difficulty": landmark.get("difficulty", "Easy"),
                "latitude": None,
                "longitude": None,
                "points": 10,
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            all_landmarks.append(landmark_doc)
    
    # Build a set of official landmark names (normalized) by country for duplicate detection
    official_names_by_country = {}
    for lm in all_landmarks:
        country = lm["country_id"]
        name_normalized = lm["name"].lower().strip()
        if country not in official_names_by_country:
            official_names_by_country[country] = set()
        official_names_by_country[country].add(name_normalized)
    
    await db.landmarks.insert_many(all_landmarks)
    print(f"Inserted {len(all_landmarks)} official landmarks")
    
    # Insert premium landmarks (skip any that duplicate official landmarks)
    premium_landmark_docs = []
    skipped_duplicates = []
    for country_id, premium_landmarks in PREMIUM_LANDMARKS.items():
        country_data = next((c for c in COUNTRIES_DATA if c["country_id"] == country_id), None)
        if not country_data:
            continue
        
        country_name = country_data["name"]
        continent = country_data["continent"]
        official_names = official_names_by_country.get(country_id, set())
        
        for idx, landmark in enumerate(premium_landmarks):
            # Check if this premium landmark name overlaps with official landmarks
            premium_name_normalized = landmark["name"].lower().strip()
            
            # Skip if exact match or similar name exists in official landmarks
            is_duplicate = False
            for official_name in official_names:
                # Check for exact match
                if premium_name_normalized == official_name:
                    is_duplicate = True
                    break
                # Check if one is contained in the other (e.g., "Li River" in "Li River Karst Mountains")
                if premium_name_normalized in official_name or official_name in premium_name_normalized:
                    is_duplicate = True
                    break
            
            if is_duplicate:
                skipped_duplicates.append(f"{country_id}: {landmark['name']}")
                continue
                
            premium_doc = {
                "landmark_id": f"{country_id}_premium_{idx+1}",
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": landmark["description"],
                "category": "premium",
                "image_url": landmark["image_url"],
                "images": [landmark["image_url"]],
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
            premium_landmark_docs.append(premium_doc)
    
    if skipped_duplicates:
        print(f"Skipped {len(skipped_duplicates)} duplicate premium landmarks:")
        for dup in skipped_duplicates:
            print(f"  - {dup}")
    
    await db.landmarks.insert_many(premium_landmark_docs)
    print(f"Inserted {len(premium_landmark_docs)} premium landmarks")
    
    print("Database seeding completed!")

if __name__ == "__main__":
    asyncio.run(seed_database())
