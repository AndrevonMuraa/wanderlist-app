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
            "image_url": "https://images.pexels.com/photos/4178799/pexels-photo-4178799.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/4178799/pexels-photo-4178799.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/2910597/pexels-photo-2910597.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/35530841/pexels-photo-35530841.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.unsplash.com/photo-1607343562353-a31c9ea753aa?w=800",
            "images": [
                "https://images.unsplash.com/photo-1607343562353-a31c9ea753aa?w=800",
                "https://images.unsplash.com/photo-1536683402757-75f8d0dfa419?w=800",
                "https://images.unsplash.com/photo-1558091579-31593a62efdc?w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/33583896/pexels-photo-33583896.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/33583896/pexels-photo-33583896.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/3580098/pexels-photo-3580098.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/2910597/pexels-photo-2910597.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/28260199/pexels-photo-28260199.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/28260199/pexels-photo-28260199.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/28257504/pexels-photo-28257504.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/1900202/pexels-photo-1900202.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/6272373/pexels-photo-6272373.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/6272373/pexels-photo-6272373.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/355749/pexels-photo-355749.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/6272372/pexels-photo-6272372.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800",
            "images": [
                "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800",
                "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/360912/pexels-photo-360912.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/1933239/pexels-photo-1933239.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/1933316/pexels-photo-1933316.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/1933320/pexels-photo-1933320.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
            "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800",
            "images": [
                "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800",
                "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800"
            ],
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
            "image_url": "https://images.pexels.com/photos/28386054/pexels-photo-28386054.jpeg?auto=compress&cs=tinysrgb&w=800",
            "images": [
                "https://images.pexels.com/photos/28386054/pexels-photo-28386054.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/3533013/pexels-photo-3533013.jpeg?auto=compress&cs=tinysrgb&w=800",
                "https://images.pexels.com/photos/35467646/pexels-photo-35467646.jpeg?auto=compress&cs=tinysrgb&w=800"
            ],
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
    "spain": [
        {"name": "Sagrada Família", "description": "Gaudí's unfinished basilica, Barcelona's most iconic landmark.", "image_url": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600"},
        {"name": "Alhambra", "description": "Moorish palace and fortress complex in Granada.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Park Güell", "description": "Colorful mosaic park designed by Antoni Gaudí.", "image_url": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600"},
        {"name": "Prado Museum", "description": "World-renowned art museum in Madrid.", "image_url": "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=600"},
        {"name": "La Rambla", "description": "Famous tree-lined pedestrian street in Barcelona.", "image_url": "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600"},
        {"name": "Seville Cathedral", "description": "Largest Gothic cathedral in the world with Giralda tower.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Plaza de España", "description": "Stunning Renaissance/Moorish revival plaza in Seville.", "image_url": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=600"},
        {"name": "Royal Palace of Madrid", "description": "Official residence of Spanish Royal Family.", "image_url": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600"},
        {"name": "Costa del Sol", "description": "Popular Mediterranean beach resort area in southern Spain.", "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600"},
        {"name": "Camino de Santiago", "description": "Historic pilgrimage route across northern Spain.", "image_url": "https://images.unsplash.com/photo-1588968864314-35e71c4493e7?w=600"},
    ],
    "greece": [
        {"name": "Acropolis & Parthenon", "description": "Ancient citadel and temple overlooking Athens.", "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600"},
        {"name": "Santorini", "description": "Iconic white-washed villages with blue domes on volcanic cliffs.", "image_url": "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600"},
        {"name": "Meteora", "description": "Monasteries built on top of towering rock pillars.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=600"},
        {"name": "Delphi", "description": "Ancient sanctuary and archaeological site, once home to Oracle.", "image_url": "https://images.unsplash.com/photo-1585783336122-b0c3e6760067?w=600"},
        {"name": "Mykonos", "description": "Cosmopolitan island with windmills, beaches and nightlife.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=600"},
        {"name": "Palace of Knossos", "description": "Bronze Age archaeological site in Crete, Minoan civilization.", "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600"},
        {"name": "Rhodes Old Town", "description": "Medieval walled city, UNESCO World Heritage Site.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=600"},
        {"name": "Olympia", "description": "Birthplace of the Olympic Games in ancient Greece.", "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600"},
        {"name": "Corfu Old Town", "description": "Venetian fortresses and elegant Italianate architecture.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=600"},
        {"name": "Temple of Poseidon", "description": "Ancient Greek temple at Cape Sounion overlooking the sea.", "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600"},
    ],
    "thailand": [
        {"name": "Grand Palace", "description": "Complex of buildings in Bangkok, former home to Thai kings.", "image_url": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600"},
        {"name": "Wat Pho", "description": "Temple with giant 46-meter reclining Buddha in Bangkok.", "image_url": "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=600"},
        {"name": "Phi Phi Islands", "description": "Stunning limestone islands in the Andaman Sea.", "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600"},
        {"name": "Wat Arun", "description": "Temple of Dawn with iconic spires on Chao Phraya River.", "image_url": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600"},
        {"name": "Ayutthaya", "description": "Ancient city and archaeological site, UNESCO World Heritage.", "image_url": "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=600"},
        {"name": "Chiang Mai Old City", "description": "Historic walled city with hundreds of temples.", "image_url": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600"},
        {"name": "Railay Beach", "description": "Secluded beach accessible only by boat, limestone cliffs.", "image_url": "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=600"},
        {"name": "Floating Markets", "description": "Traditional markets on Bangkok's canals and waterways.", "image_url": "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=600"},
        {"name": "Sukhothai Historical Park", "description": "Ruins of the first capital of Siam in 13th century.", "image_url": "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600"},
        {"name": "James Bond Island", "description": "Iconic limestone karst in Phang Nga Bay, featured in 007 film.", "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600"},
    ],
    "india": [
        {"name": "Taj Mahal", "description": "White marble mausoleum, one of world's most beautiful buildings.", "image_url": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600"},
        {"name": "Amber Fort", "description": "Majestic hilltop fort palace in Jaipur, Rajasthan.", "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600"},
        {"name": "Golden Temple", "description": "Holiest Gurdwara of Sikhism in Amritsar, covered in gold.", "image_url": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600"},
        {"name": "Red Fort", "description": "Historic fortified palace in Old Delhi, Mughal architecture.", "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600"},
        {"name": "Hawa Mahal", "description": "Palace of Winds with iconic honeycomb facade in Jaipur.", "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600"},
        {"name": "Gateway of India", "description": "Iconic arch monument in Mumbai overlooking Arabian Sea.", "image_url": "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=600"},
        {"name": "Varanasi Ghats", "description": "Sacred steps along the Ganges River, holiest city in Hinduism.", "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600"},
        {"name": "Backwaters of Kerala", "description": "Network of lagoons, lakes and canals in southern India.", "image_url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600"},
        {"name": "Mysore Palace", "description": "Indo-Saracenic palace, former seat of Wodeyar dynasty.", "image_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600"},
        {"name": "Ajanta & Ellora Caves", "description": "Ancient rock-cut cave temples with intricate carvings.", "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600"},
    ],
    "brazil": [
        {"name": "Christ the Redeemer", "description": "Iconic 30-meter statue overlooking Rio de Janeiro.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600"},
        {"name": "Sugarloaf Mountain", "description": "Cable car to granite peak with panoramic Rio views.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600"},
        {"name": "Iguazu Falls", "description": "Massive waterfalls system on Argentina-Brazil border.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600"},
        {"name": "Copacabana Beach", "description": "Famous 4km beach in Rio de Janeiro.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600"},
        {"name": "Amazon Rainforest", "description": "World's largest tropical rainforest, biodiversity hotspot.", "image_url": "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600"},
        {"name": "Pelourinho", "description": "Historic colonial center of Salvador with colorful buildings.", "image_url": "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=600"},
        {"name": "Lençóis Maranhenses", "description": "White sand dunes with crystal turquoise lagoons.", "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600"},
        {"name": "Fernando de Noronha", "description": "Remote archipelago with pristine beaches and marine life.", "image_url": "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=600"},
        {"name": "Pantanal", "description": "World's largest tropical wetland area, wildlife paradise.", "image_url": "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600"},
        {"name": "São Paulo Cathedral", "description": "Neo-Gothic metropolitan cathedral in Brazil's largest city.", "image_url": "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=600"},
    ],
    "mexico": [
        {"name": "Chichen Itza", "description": "Ancient Mayan city with iconic pyramid El Castillo.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600"},
        {"name": "Teotihuacan", "description": "Pyramid of the Sun and Moon near Mexico City.", "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=600"},
        {"name": "Tulum", "description": "Mayan ruins on Caribbean cliffside with stunning beach.", "image_url": "https://images.unsplash.com/photo-1569165003085-e8a1066f1cb8?w=600"},
        {"name": "Palenque", "description": "Ancient Mayan city in Chiapas jungle with pyramid temples.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600"},
        {"name": "Frida Kahlo Museum", "description": "Blue House in Mexico City, former home of iconic artist.", "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=600"},
        {"name": "Copper Canyon", "description": "Series of canyons larger and deeper than Grand Canyon.", "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=600"},
        {"name": "Cabo San Lucas Arch", "description": "Natural rock formation at Land's End where oceans meet.", "image_url": "https://images.unsplash.com/photo-1569165003085-e8a1066f1cb8?w=600"},
        {"name": "Cenotes of Yucatan", "description": "Natural sinkholes with crystal-clear water for swimming.", "image_url": "https://images.unsplash.com/photo-1569165003085-e8a1066f1cb8?w=600"},
        {"name": "Zócalo", "description": "Main square in Mexico City, one of world's largest plazas.", "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=600"},
        {"name": "Guadalajara Cathedral", "description": "Twin-spired cathedral in historic center of Guadalajara.", "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=600"},
    ],
    "uae": [
        {"name": "Burj Khalifa", "description": "World's tallest building at 828 meters in Dubai.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Sheikh Zayed Grand Mosque", "description": "Stunning white marble mosque in Abu Dhabi, one of world's largest.", "image_url": "https://images.unsplash.com/photo-1580674587303-66b78bc87691?w=600"},
        {"name": "Palm Jumeirah", "description": "Artificial archipelago in shape of palm tree in Dubai.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Burj Al Arab", "description": "Luxury hotel on artificial island, iconic sail-shaped design.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Dubai Mall", "description": "World's largest shopping mall with aquarium and ice rink.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Dubai Fountain", "description": "World's largest choreographed fountain system.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Desert Safari Dunes", "description": "Red sand dunes of Arabian Desert, popular safari destination.", "image_url": "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=600"},
        {"name": "Louvre Abu Dhabi", "description": "Art and civilization museum with iconic dome architecture.", "image_url": "https://images.unsplash.com/photo-1580674587303-66b78bc87691?w=600"},
        {"name": "Dubai Marina", "description": "Canal city carved along Persian Gulf shoreline.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
        {"name": "Al Fahidi Historical District", "description": "Heritage village with traditional wind-tower architecture.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
    ],
    "germany": [
        {"name": "Neuschwanstein Castle", "description": "Fairytale castle that inspired Disney's Sleeping Beauty Castle.", "image_url": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600"},
        {"name": "Brandenburg Gate", "description": "Iconic 18th-century neoclassical monument in Berlin.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Cologne Cathedral", "description": "Gothic masterpiece, tallest twin-spired church in world.", "image_url": "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=600"},
        {"name": "Reichstag Building", "description": "German parliament with modern glass dome offering city views.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Heidelberg Castle", "description": "Romantic castle ruins overlooking Neckar River and old town.", "image_url": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600"},
        {"name": "Black Forest", "description": "Scenic mountainous region with dense forests and cuckoo clocks.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600"},
        {"name": "Romantic Road", "description": "Scenic route through medieval towns and fairytale castles.", "image_url": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600"},
        {"name": "Berlin Wall Memorial", "description": "Preserved sections of the Cold War barrier dividing East and West.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
        {"name": "Oktoberfest Grounds", "description": "World's largest folk festival held annually in Munich.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600"},
        {"name": "Miniatur Wunderland", "description": "World's largest model railway exhibition in Hamburg.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600"},
    ],
    "canada": [
        {"name": "Niagara Falls", "description": "Powerful waterfalls on Canada-US border, boat tours available.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=600"},
        {"name": "Banff National Park", "description": "Stunning Rocky Mountain scenery with turquoise lakes.", "image_url": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600"},
        {"name": "CN Tower", "description": "Iconic 553-meter communications tower in Toronto.", "image_url": "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600"},
        {"name": "Old Quebec City", "description": "Historic fortified colonial city, UNESCO World Heritage.", "image_url": "https://images.unsplash.com/photo-1519276576360-d75a8c97c567?w=600"},
        {"name": "Moraine Lake", "description": "Glacially-fed lake with vibrant turquoise waters in Rockies.", "image_url": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600"},
        {"name": "Butchart Gardens", "description": "World-famous 55-acre gardens in Victoria, BC.", "image_url": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600"},
        {"name": "Parliament Hill", "description": "Gothic Revival complex housing Canadian government in Ottawa.", "image_url": "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600"},
        {"name": "Whistler", "description": "Premier ski resort in Coast Mountains of British Columbia.", "image_url": "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=600"},
        {"name": "Bay of Fundy", "description": "Home to the highest tides in the world, up to 16 meters.", "image_url": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=600"},
        {"name": "Northern Lights Yukon", "description": "Prime aurora borealis viewing destination in northern Canada.", "image_url": "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=600"},
    ],
    "south_africa": [
        {"name": "Table Mountain", "description": "Flat-topped mountain overlooking Cape Town, cable car access.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=600"},
        {"name": "Kruger National Park", "description": "Premier safari destination for viewing Big Five wildlife.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
        {"name": "Robben Island", "description": "Former prison where Nelson Mandela was held for 18 years.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=600"},
        {"name": "Cape of Good Hope", "description": "Dramatic headland at Africa's southwestern tip.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
        {"name": "Victoria & Alfred Waterfront", "description": "Historic harbor and shopping area in Cape Town.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=600"},
        {"name": "Garden Route", "description": "Scenic 300km coastal stretch with forests and lagoons.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
        {"name": "Blyde River Canyon", "description": "One of world's largest green canyons with dramatic views.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
        {"name": "Boulder's Beach", "description": "Beach home to colony of endangered African penguins.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=600"},
        {"name": "Apartheid Museum", "description": "Moving museum documenting South Africa's apartheid history.", "image_url": "https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=600"},
        {"name": "Drakensberg Mountains", "description": "Highest mountain range in South Africa with hiking trails.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600"},
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
                "points": 10,
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
