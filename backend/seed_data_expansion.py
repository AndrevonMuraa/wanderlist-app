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

# 48 Countries - Global Coverage
COUNTRIES_DATA = [
    # EUROPE (10 countries)
    {"country_id": "france", "name": "France", "continent": "Europe"},
    {"country_id": "italy", "name": "Italy", "continent": "Europe"},
    {"country_id": "spain", "name": "Spain", "continent": "Europe"},
    {"country_id": "uk", "name": "United Kingdom", "continent": "Europe"},
    {"country_id": "germany", "name": "Germany", "continent": "Europe"},
    {"country_id": "greece", "name": "Greece", "continent": "Europe"},
    {"country_id": "norway", "name": "Norway", "continent": "Europe"},
    {"country_id": "switzerland", "name": "Switzerland", "continent": "Europe"},
    {"country_id": "netherlands", "name": "Netherlands", "continent": "Europe"},
    {"country_id": "portugal", "name": "Portugal", "continent": "Europe"},
    
    # ASIA (10 countries)
    {"country_id": "japan", "name": "Japan", "continent": "Asia"},
    {"country_id": "china", "name": "China", "continent": "Asia"},
    {"country_id": "thailand", "name": "Thailand", "continent": "Asia"},
    {"country_id": "india", "name": "India", "continent": "Asia"},
    {"country_id": "uae", "name": "United Arab Emirates", "continent": "Asia"},
    {"country_id": "singapore", "name": "Singapore", "continent": "Asia"},
    {"country_id": "indonesia", "name": "Indonesia", "continent": "Asia"},
    {"country_id": "south_korea", "name": "South Korea", "continent": "Asia"},
    {"country_id": "vietnam", "name": "Vietnam", "continent": "Asia"},
    {"country_id": "malaysia", "name": "Malaysia", "continent": "Asia"},
    
    # AFRICA (10 countries)
    {"country_id": "egypt", "name": "Egypt", "continent": "Africa"},
    {"country_id": "morocco", "name": "Morocco", "continent": "Africa"},
    {"country_id": "south_africa", "name": "South Africa", "continent": "Africa"},
    {"country_id": "kenya", "name": "Kenya", "continent": "Africa"},
    {"country_id": "tanzania", "name": "Tanzania", "continent": "Africa"},
    {"country_id": "mauritius", "name": "Mauritius", "continent": "Africa"},
    {"country_id": "seychelles", "name": "Seychelles", "continent": "Africa"},
    {"country_id": "botswana", "name": "Botswana", "continent": "Africa"},
    {"country_id": "namibia", "name": "Namibia", "continent": "Africa"},
    {"country_id": "tunisia", "name": "Tunisia", "continent": "Africa"},
    
    # AMERICAS (10 countries - North & South combined)
    {"country_id": "usa", "name": "United States", "continent": "Americas"},
    {"country_id": "canada", "name": "Canada", "continent": "Americas"},
    {"country_id": "mexico", "name": "Mexico", "continent": "Americas"},
    {"country_id": "brazil", "name": "Brazil", "continent": "Americas"},
    {"country_id": "peru", "name": "Peru", "continent": "Americas"},
    {"country_id": "argentina", "name": "Argentina", "continent": "Americas"},
    {"country_id": "chile", "name": "Chile", "continent": "Americas"},
    {"country_id": "colombia", "name": "Colombia", "continent": "Americas"},
    {"country_id": "ecuador", "name": "Ecuador", "continent": "Americas"},
    {"country_id": "costa_rica", "name": "Costa Rica", "continent": "Americas"},
    
    # OCEANIA & PACIFIC (8 countries)
    {"country_id": "australia", "name": "Australia", "continent": "Oceania"},
    {"country_id": "new_zealand", "name": "New Zealand", "continent": "Oceania"},
    {"country_id": "fiji", "name": "Fiji", "continent": "Oceania"},
    {"country_id": "french_polynesia", "name": "French Polynesia", "continent": "Oceania"},
    {"country_id": "cook_islands", "name": "Cook Islands", "continent": "Oceania"},
    {"country_id": "samoa", "name": "Samoa", "continent": "Oceania"},
    {"country_id": "vanuatu", "name": "Vanuatu", "continent": "Oceania"},
    {"country_id": "tonga", "name": "Tonga", "continent": "Oceania"},
]

# Landmark data for all 48 countries (10 official landmarks each)
# Premium landmarks will be added separately
LANDMARKS_DATA = {
    # EUROPE - FRANCE
    "france": [
        {"name": "Eiffel Tower", "description": "Iconic iron lattice tower built in 1889, symbol of Paris and France.", "image_url": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80", "difficulty": "Easy"},
        {"name": "Louvre Museum", "description": "World's largest art museum, home to the Mona Lisa and thousands of masterpieces.", "image_url": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80", "difficulty": "Easy"},
        {"name": "Palace of Versailles", "description": "Opulent royal château with magnificent gardens, Hall of Mirrors, and French history.", "image_url": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mont Saint-Michel", "description": "Medieval abbey on tidal island, stunning Gothic architecture surrounded by sea.", "image_url": "https://images.unsplash.com/photo-1558211583-803a5f67cff7?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Arc de Triomphe", "description": "Monumental arch honoring French military victories, panoramic city views from top.", "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "difficulty": "Easy"},
        {"name": "Notre-Dame Cathedral", "description": "Gothic masterpiece on Île de la Cité, renowned for gargoyles and rose windows.", "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "difficulty": "Easy"},
        {"name": "Château de Chambord", "description": "Renaissance castle in Loire Valley with distinctive French architecture.", "image_url": "https://images.unsplash.com/photo-1590559865826-eb206e24cbd6?w=800&q=80", "difficulty": "Easy"},
        {"name": "French Riviera", "description": "Glamorous coastline with azure waters, beaches, and Mediterranean charm.", "image_url": "https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=800&q=80", "difficulty": "Easy"},
        {"name": "Provence Lavender Fields", "description": "Purple fields stretching to horizon, quintessential French countryside.", "image_url": "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sacré-Cœur Basilica", "description": "White-domed basilica atop Montmartre, offering breathtaking views of Paris.", "image_url": "https://images.unsplash.com/photo-1508050919630-b135583b29ab?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - ITALY
    "italy": [
        {"name": "Colosseum", "description": "Ancient Roman amphitheater, largest ever built, symbol of Imperial Rome.", "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Venice Canals", "description": "Romantic waterways through historic city, gondolas, bridges, and palaces.", "image_url": "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80", "difficulty": "Easy"},
        {"name": "Leaning Tower of Pisa", "description": "Freestanding bell tower famous for its unintended tilt, architectural marvel.", "image_url": "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Vatican City", "description": "Sistine Chapel, St. Peter's Basilica, world's smallest country within Rome.", "image_url": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amalfi Coast", "description": "Dramatic cliffside coastline with colorful towns, turquoise waters, lemon groves.", "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Florence Duomo", "description": "Iconic cathedral with massive dome, Brunelleschi's engineering masterpiece.", "image_url": "https://images.unsplash.com/photo-1541511447708-aa39cad1525e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cinque Terre", "description": "Five colorful fishing villages clinging to rugged Italian Riviera coastline.", "image_url": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Trevi Fountain", "description": "Baroque fountain in Rome, legend says coins thrown guarantee return to city.", "image_url": "https://images.unsplash.com/photo-1548585744-7e3c1e8167f4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pompeii Ruins", "description": "Ancient Roman city frozen in time by Vesuvius eruption in 79 AD.", "image_url": "https://images.unsplash.com/photo-1590559889047-c0b9766e24b7?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Como", "description": "Stunning alpine lake surrounded by mountains, elegant villas, and gardens.", "image_url": "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - SPAIN
    "spain": [
        {"name": "Sagrada Familia", "description": "Gaudí's unfinished masterpiece basilica, stunning Art Nouveau architecture.", "image_url": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80", "difficulty": "Easy"},
        {"name": "Alhambra", "description": "Moorish palace and fortress complex in Granada, Islamic architecture gem.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80", "difficulty": "Easy"},
        {"name": "Park Güell", "description": "Whimsical Gaudí park with colorful mosaics, organic architecture, Barcelona views.", "image_url": "https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=800&q=80", "difficulty": "Easy"},
        {"name": "Prado Museum", "description": "Spain's premier art museum with works by Velázquez, Goya, and El Greco.", "image_url": "https://images.unsplash.com/photo-1566851709737-39d25d851d79?w=800&q=80", "difficulty": "Easy"},
        {"name": "Seville Cathedral", "description": "Largest Gothic cathedral in world, Christopher Columbus's tomb.", "image_url": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Camino de Santiago", "description": "Historic pilgrimage route across northern Spain to Santiago de Compostela.", "image_url": "https://images.unsplash.com/photo-1580674935284-4f9e82b63085?w=800&q=80", "difficulty": "Hard"},
        {"name": "La Rambla Barcelona", "description": "Famous tree-lined pedestrian street, markets, street performers, Catalan culture.", "image_url": "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Toledo Historic City", "description": "Medieval walled city, three cultures (Christian, Muslim, Jewish) heritage.", "image_url": "https://images.unsplash.com/photo-1560091528-c0e3bfb28369?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ibiza Beaches", "description": "Crystal-clear waters, white sand beaches, vibrant nightlife, UNESCO heritage.", "image_url": "https://images.unsplash.com/photo-1563789031959-4c02bcb41319?w=800&q=80", "difficulty": "Easy"},
        {"name": "Royal Palace Madrid", "description": "Official residence of Spanish Royal Family, lavish interiors, 3,418 rooms.", "image_url": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - UK
    "uk": [
        {"name": "Big Ben", "description": "Iconic clock tower at Palace of Westminster, symbol of London and Britain.", "image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tower of London", "description": "Historic castle, Crown Jewels, 1000 years of royal history and intrigue.", "image_url": "https://images.unsplash.com/photo-1588453251771-cd19dc5aa89b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Stonehenge", "description": "Prehistoric monument of massive stones, mysterious ancient engineering.", "image_url": "https://images.unsplash.com/photo-1599833975787-5f9ce2b39a51?w=800&q=80", "difficulty": "Easy"},
        {"name": "Edinburgh Castle", "description": "Historic fortress dominating Edinburgh skyline, Scottish crown jewels.", "image_url": "https://images.unsplash.com/photo-1549556289-54411a5c8c9b?w=800&q=80", "difficulty": "Easy"},
        {"name": "British Museum", "description": "World-class collection spanning human history, Rosetta Stone, Egyptian mummies.", "image_url": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Buckingham Palace", "description": "Official residence of British monarch, Changing of the Guard ceremony.", "image_url": "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake District", "description": "Beautiful national park with lakes, mountains, and inspiring landscapes.", "image_url": "https://images.unsplash.com/photo-1556983852-43bf21186b2a?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Windsor Castle", "description": "Oldest occupied castle in world, royal residence for 1000 years.", "image_url": "https://images.unsplash.com/photo-1533669955142-6a73332af4db?w=800&q=80", "difficulty": "Easy"},
        {"name": "Giant's Causeway", "description": "40,000 interlocking basalt columns, dramatic Northern Ireland coastline.", "image_url": "https://images.unsplash.com/photo-1549556289-54411a5c8c9b?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Oxford University", "description": "Oldest university in English-speaking world, dreaming spires and colleges.", "image_url": "https://images.unsplash.com/photo-1553452118-621ada46db6c?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - GERMANY
    "germany": [
        {"name": "Brandenburg Gate", "description": "Neoclassical monument in Berlin, symbol of unity and peace.", "image_url": "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80", "difficulty": "Easy"},
        {"name": "Neuschwanstein Castle", "description": "Fairy-tale castle in Bavarian Alps, inspired Disney's Sleeping Beauty Castle.", "image_url": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cologne Cathedral", "description": "Gothic masterpiece with twin spires, UNESCO World Heritage Site.", "image_url": "https://images.unsplash.com/photo-1553913861-c0fddf2619ff?w=800&q=80", "difficulty": "Easy"},
        {"name": "Black Forest", "description": "Dense evergreen forest, cuckoo clocks, hiking trails, fairy tale scenery.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Berlin Wall Memorial", "description": "Preserved sections of wall, powerful reminder of divided Germany history.", "image_url": "https://images.unsplash.com/photo-1560930950-5cc20e80e392?w=800&q=80", "difficulty": "Easy"},
        {"name": "Heidelberg Castle", "description": "Romantic ruins overlooking old town, stunning Rhine Valley views.", "image_url": "https://images.unsplash.com/photo-1585667210427-1e3a5a2e5948?w=800&q=80", "difficulty": "Easy"},
        {"name": "Romantic Road", "description": "Scenic route through medieval towns, castles, and Bavarian countryside.", "image_url": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Oktoberfest Munich", "description": "World's largest beer festival, Bavarian culture, traditional celebrations.", "image_url": "https://images.unsplash.com/photo-1618411640897-1f6bb0128ec6?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rhine Valley", "description": "UNESCO valley with vineyards, castles, and picturesque river towns.", "image_url": "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Reichstag Building", "description": "Historic parliament building with modern glass dome, panoramic Berlin views.", "image_url": "https://images.unsplash.com/photo-1587330979470-3595ac045ab7?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - GREECE
    "greece": [
        {"name": "Acropolis Athens", "description": "Ancient citadel with Parthenon, symbol of classical Greek civilization.", "image_url": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80", "difficulty": "Easy"},
        {"name": "Santorini", "description": "White-washed villages, blue-domed churches, stunning caldera sunsets.", "image_url": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80", "difficulty": "Easy"},
        {"name": "Delphi", "description": "Ancient sanctuary, Oracle's seat, spectacular mountain setting.", "image_url": "https://images.unsplash.com/photo-1592519651770-916c0ad21e6d?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Meteora Monasteries", "description": "Byzantine monasteries perched on towering rock pillars, otherworldly landscape.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Mykonos", "description": "Cosmopolitan island, windmills, white streets, vibrant nightlife.", "image_url": "https://images.unsplash.com/photo-1580839982944-dfee15c6f5e5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ancient Olympia", "description": "Birthplace of Olympic Games, ruins of temples and athletic facilities.", "image_url": "https://images.unsplash.com/photo-1592519651770-916c0ad21e6d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Crete Knossos", "description": "Minoan palace ruins, Europe's oldest city, legendary labyrinth of Minotaur.", "image_url": "https://images.unsplash.com/photo-1593006616175-e9a0d3827d33?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rhodes Old Town", "description": "Medieval walled city, Palace of Grand Masters, Knights Hospitaller history.", "image_url": "https://images.unsplash.com/photo-1592519651770-916c0ad21e6d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Navagio Beach", "description": "Shipwreck Beach on Zakynthos, turquoise waters, dramatic white cliffs.", "image_url": "https://images.unsplash.com/photo-1561409106-7f2ae077fa7e?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Mount Athos", "description": "Holy Mountain, monastic republic, Byzantine treasures and spirituality.", "image_url": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80", "difficulty": "Hard"},
    ],
    
    # EUROPE - NORWAY
    "norway": [
        {"name": "Geirangerfjord", "description": "Deep blue fjord surrounded by majestic mountains, waterfalls, and lush vegetation.", "image_url": "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Northern Lights", "description": "Aurora borealis dancing across Arctic sky, magical natural phenomenon.", "image_url": "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Lofoten Islands", "description": "Arctic archipelago with dramatic peaks, fishing villages, and midnight sun.", "image_url": "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Preikestolen", "description": "Pulpit Rock, flat-topped cliff 604m above Lysefjord, iconic Norwegian hike.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Bergen Bryggen", "description": "Colorful Hanseatic wharf, UNESCO site, wooden trading houses from 1700s.", "image_url": "https://images.unsplash.com/photo-1601439678777-b2d6b2e8f6b0?w=800&q=80", "difficulty": "Easy"},
        {"name": "Trolltunga", "description": "Troll's Tongue, dramatic rock formation jutting out 700m above lake.", "image_url": "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=800&q=80", "difficulty": "Hard"},
        {"name": "Vigeland Park Oslo", "description": "World's largest sculpture park by single artist, 200+ Gustav Vigeland works.", "image_url": "https://images.unsplash.com/photo-1564623645177-cc6ef73d3c8d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Atlantic Road", "description": "Scenic highway across islets, dramatic bridges, named world's best road trip.", "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nidaros Cathedral", "description": "Norway's national sanctuary, Gothic masterpiece in Trondheim, pilgrimage site.", "image_url": "https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Svalbard Arctic", "description": "Remote archipelago, polar bears, glaciers, northernmost settlement on Earth.", "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80", "difficulty": "Hard"},
    ],
    
    # EUROPE - SWITZERLAND
    "switzerland": [
        {"name": "Matterhorn", "description": "Iconic pyramid-shaped peak, one of world's most photographed mountains.", "image_url": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80", "difficulty": "Hard"},
        {"name": "Jungfraujoch", "description": "Top of Europe, highest railway station, glacier wonderland, Alpine panoramas.", "image_url": "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Lake Geneva", "description": "Crescent-shaped alpine lake, Château de Chillon, vineyards, French Alps views.", "image_url": "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Swiss Alps", "description": "Majestic mountain range, world-class skiing, charming villages, pure Alpine beauty.", "image_url": "https://images.unsplash.com/photo-1527489377706-5bf97e608852?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Lucerne Chapel Bridge", "description": "Covered wooden bridge from 1333, flower boxes, historic paintings, city symbol.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rhine Falls", "description": "Europe's largest waterfall, 150m wide, boat rides to rock platforms.", "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", "difficulty": "Easy"},
        {"name": "Interlaken", "description": "Alpine resort town between two lakes, paragliding, adventure sports capital.", "image_url": "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bern Old Town", "description": "Medieval city center, UNESCO site, arcades, Zytglogge clock tower.", "image_url": "https://images.unsplash.com/photo-1546422904-90eab23c3d7e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Zermatt Village", "description": "Car-free Alpine village at Matterhorn's base, traditional chalets, mountain culture.", "image_url": "https://images.unsplash.com/photo-1601581987809-a874a81309c9?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Lugano", "description": "Mediterranean-style lake on Swiss-Italian border, palm trees, mountain backdrop.", "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - NETHERLANDS
    "netherlands": [
        {"name": "Anne Frank House", "description": "Historic house and museum, secret annex where Anne Frank hid during WWII.", "image_url": "https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Keukenhof Gardens", "description": "World's largest flower garden, 7 million tulips, bulbs, colorful spring paradise.", "image_url": "https://images.unsplash.com/photo-1522433409494-d58c3781ab28?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amsterdam Canals", "description": "UNESCO canal ring, 165 waterways, historic gabled houses, unique urban landscape.", "image_url": "https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Windmills Kinderdijk", "description": "19 iconic windmills from 1740s, UNESCO site, Dutch water management history.", "image_url": "https://images.unsplash.com/photo-1580996378902-9343f8e8e2c7?w=800&q=80", "difficulty": "Easy"},
        {"name": "Van Gogh Museum", "description": "Largest Van Gogh collection, 200+ paintings, artist's life and mental journey.", "image_url": "https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rijksmuseum", "description": "National museum, Rembrandt's Night Watch, Dutch Golden Age masterpieces.", "image_url": "https://images.unsplash.com/photo-1533558623151-5dc5c4c79c6d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Giethoorn Village", "description": "Venice of Netherlands, car-free village with canals, thatched cottages, boats.", "image_url": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80", "difficulty": "Easy"},
        {"name": "Delft Blue Pottery", "description": "Royal Delft factory, hand-painted ceramics, centuries-old Dutch tradition.", "image_url": "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hoge Veluwe Park", "description": "National park with forests, heathlands, Kröller-Müller Museum, free bikes.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Zaanse Schans", "description": "Historic village with working windmills, green houses, cheese, clogs, crafts.", "image_url": "https://images.unsplash.com/photo-1469796466635-455ede028aca?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # EUROPE - PORTUGAL
    "portugal": [
        {"name": "Belém Tower", "description": "16th century fortified tower, Portuguese Age of Discovery, Manueline architecture.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pena Palace Sintra", "description": "Colorful Romanticist castle on hilltop, fairy-tale architecture, stunning views.", "image_url": "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80", "difficulty": "Easy"},
        {"name": "Algarve Cliffs", "description": "Dramatic golden limestone cliffs, hidden beaches, turquoise Atlantic waters.", "image_url": "https://images.unsplash.com/photo-1525373698358-041e3a460346?w=800&q=80", "difficulty": "Easy"},
        {"name": "Jerónimos Monastery", "description": "UNESCO masterpiece, Manueline style, Vasco da Gama tomb, Portuguese glory.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Porto Wine Cellars", "description": "Historic port wine lodges, tastings, Douro River views, Portuguese tradition.", "image_url": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Douro Valley", "description": "Terraced vineyards, winding river, UNESCO landscape, wine region beauty.", "image_url": "https://images.unsplash.com/photo-1588684631601-3e0c3ef2524e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lisbon Trams", "description": "Iconic yellow streetcars climbing steep hills, vintage charm, city exploration.", "image_url": "https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cabo da Roca", "description": "Westernmost point of continental Europe, dramatic cliffs, lighthouse, ocean views.", "image_url": "https://images.unsplash.com/photo-1563789031959-4c02bcb41319?w=800&q=80", "difficulty": "Easy"},
        {"name": "Óbidos Medieval Town", "description": "Walled village with whitewashed houses, castle, cherry liqueur tradition.", "image_url": "https://images.unsplash.com/photo-1588453251771-cd19dc5aa89b?w=800&q=80", "difficulty": "Easy"},
        {"name": "Azores Islands", "description": "Volcanic archipelago, crater lakes, hot springs, whales, lush green landscapes.", "image_url": "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80", "difficulty": "Moderate"},
    ],
    
    # ASIA - JAPAN
    "japan": [
        {"name": "Mount Fuji", "description": "Iconic snow-capped volcano, Japan's highest peak, sacred pilgrimage site.", "image_url": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tokyo Shibuya Crossing", "description": "World's busiest intersection, neon lights, urban energy, modern Japan.", "image_url": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kyoto Golden Pavilion", "description": "Zen Buddhist temple covered in gold leaf, reflecting in pond, pure serenity.", "image_url": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Fushimi Inari Shrine", "description": "Thousands of vermillion torii gates winding up mountain, spiritual journey.", "image_url": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Hiroshima Peace Memorial", "description": "A-Bomb Dome, poignant reminder of nuclear devastation, message of peace.", "image_url": "https://images.unsplash.com/photo-1553604431-e1e7a7e79138?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nara Deer Park", "description": "Sacred deer roaming freely, ancient temples, peaceful nature encounters.", "image_url": "https://images.unsplash.com/photo-1578664182687-576c49284f2e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tokyo Skytree", "description": "World's tallest tower, panoramic city views, modern architectural marvel.", "image_url": "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80", "difficulty": "Easy"},
        {"name": "Osaka Castle", "description": "Historic castle with massive stone walls, cherry blossoms, samurai history.", "image_url": "https://images.unsplash.com/photo-1590559900499-d2d0e7e8f725?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hakone Hot Springs", "description": "Natural onsen baths with Mount Fuji views, traditional ryokan experience.", "image_url": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", "difficulty": "Easy"},
        {"name": "Miyajima Island", "description": "Floating torii gate at high tide, sacred island, wild deer, spiritual beauty.", "image_url": "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - CHINA
    "china": [
        {"name": "Great Wall", "description": "Ancient defensive wall stretching 13,000 miles, engineering wonder of world.", "image_url": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Forbidden City", "description": "Imperial palace complex, 980 buildings, Ming and Qing dynasty seat of power.", "image_url": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Terracotta Army", "description": "8,000 life-size warrior statues guarding Emperor Qin's tomb, archaeological marvel.", "image_url": "https://images.unsplash.com/photo-1529487653865-c45e2bddbdc1?w=800&q=80", "difficulty": "Easy"},
        {"name": "Li River Karst Mountains", "description": "Dramatic limestone peaks, emerald waters, misty landscapes on 20-yuan note.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Easy"},
        {"name": "Zhangjiajie Pillars", "description": "Towering sandstone pillars inspired Avatar's Pandora, glass walkways, nature wonder.", "image_url": "https://images.unsplash.com/photo-1534323755658-2396a0ea71d3?w=800&q=80", "difficulty": "Moderate"},
        {"name": "The Bund Shanghai", "description": "Waterfront promenade, colonial architecture facing futuristic Pudong skyline.", "image_url": "https://images.unsplash.com/photo-1521133573892-e44906baee46?w=800&q=80", "difficulty": "Easy"},
        {"name": "Temple of Heaven", "description": "Imperial complex where emperors prayed for harvests, stunning circular architecture.", "image_url": "https://images.unsplash.com/photo-1525193612537-2c576d3f24fc?w=800&q=80", "difficulty": "Easy"},
        {"name": "Yangshuo Countryside", "description": "Idyllic rural landscape, bamboo rafting, rice paddies, traditional village life.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Easy"},
        {"name": "Summer Palace Beijing", "description": "Imperial garden, Kunming Lake, ornate pavilions, masterpiece of Chinese design.", "image_url": "https://images.unsplash.com/photo-1537185334-eba0d45c0a92?w=800&q=80", "difficulty": "Easy"},
        {"name": "Jiuzhaigou Valley", "description": "UNESCO nature reserve, colorful lakes, waterfalls, pristine forests, Tibetan culture.", "image_url": "https://images.unsplash.com/photo-1537185334-eba0d45c0a92?w=800&q=80", "difficulty": "Moderate"},
    ],
    
    # ASIA - THAILAND
    "thailand": [
        {"name": "Grand Palace Bangkok", "description": "Dazzling complex of temples, golden spires, Emerald Buddha, Thai royalty.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Phi Phi Islands", "description": "Limestone cliffs, turquoise lagoons, pristine beaches, snorkeling paradise.", "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Wat Arun", "description": "Temple of Dawn, ornate spires, riverside location, stunning at sunset.", "image_url": "https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chiang Mai Old City", "description": "Moated ancient city, 300+ Buddhist temples, night markets, Lanna culture.", "image_url": "https://images.unsplash.com/photo-1544026084-e76d1e7d1f64?w=800&q=80", "difficulty": "Easy"},
        {"name": "Railay Beach", "description": "Rock climbing mecca, accessible only by boat, limestone karsts, paradise beaches.", "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Ayutthaya Ruins", "description": "Ancient Siamese capital, Buddha statues, temple ruins, UNESCO heritage site.", "image_url": "https://images.unsplash.com/photo-1563492065213-f4b8c3a1b916?w=800&q=80", "difficulty": "Easy"},
        {"name": "Floating Markets", "description": "Traditional water markets, boats selling fruits, food, authentic Thai experience.", "image_url": "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Erawan Waterfalls", "description": "Seven-tiered emerald waterfall, natural pools, jungle setting, swimming paradise.", "image_url": "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80", "difficulty": "Moderate"},
        {"name": "White Temple Chiang Rai", "description": "Dazzling white temple covered in mirrors, contemporary Buddhist art, unique vision.", "image_url": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sukhothai Historical Park", "description": "First capital of Siam, Buddha images, lotus ponds, dawn of Thai civilization.", "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - INDIA
    "india": [
        {"name": "Taj Mahal", "description": "White marble mausoleum, eternal love monument, UNESCO wonder, architectural perfection.", "image_url": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80", "difficulty": "Easy"},
        {"name": "Varanasi Ghats", "description": "Sacred riverfront steps on Ganges, spiritual ceremonies, ancient pilgrimage city.", "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=80", "difficulty": "Easy"},
        {"name": "Jaipur City Palace", "description": "Pink City's royal residence, courtyards, museums, Rajasthani architecture.", "image_url": "https://images.unsplash.com/photo-1549611016-3a70d82b5040?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kerala Backwaters", "description": "Network of lagoons, lakes, houseboats, palm-lined shores, serene water life.", "image_url": "https://images.unsplash.com/photo-1588523736859-2f14e2c5a3cb?w=800&q=80", "difficulty": "Easy"},
        {"name": "Golden Temple Amritsar", "description": "Sikh holy shrine, gold-covered marble, reflecting pool, spiritual magnificence.", "image_url": "https://images.unsplash.com/photo-1588523736859-2f14e2c5a3cb?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amer Fort", "description": "Hilltop fort with mirror palaces, marble, red sandstone, Rajput military architecture.", "image_url": "https://images.unsplash.com/photo-1523469432922-3eaf1b00f6f2?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Mumbai Gateway of India", "description": "Iconic arch monument, harbor views, colonial architecture, city's landmark.", "image_url": "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&q=80", "difficulty": "Easy"},
        {"name": "Khajuraho Temples", "description": "Medieval Hindu and Jain temples with intricate erotic sculptures, UNESCO site.", "image_url": "https://images.unsplash.com/photo-1588523736859-2f14e2c5a3cb?w=800&q=80", "difficulty": "Easy"},
        {"name": "Agra Fort", "description": "Massive red sandstone fortress, Mughal emperors' seat, near Taj Mahal.", "image_url": "https://images.unsplash.com/photo-1523469432922-3eaf1b00f6f2?w=800&q=80", "difficulty": "Easy"},
        {"name": "Goa Beaches", "description": "Tropical paradise, Portuguese heritage, beach shacks, hippie culture, sunset parties.", "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - UAE
    "uae": [
        {"name": "Burj Khalifa", "description": "World's tallest building at 828m, observation decks, architectural marvel.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sheikh Zayed Mosque", "description": "Stunning white marble mosque, 82 domes, world's largest hand-knotted carpet.", "image_url": "https://images.unsplash.com/photo-1588523736859-2f14e2c5a3cb?w=800&q=80", "difficulty": "Easy"},
        {"name": "Dubai Mall", "description": "World's largest mall, aquarium, ice rink, 1200 shops, ultimate shopping.", "image_url": "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80", "difficulty": "Easy"},
        {"name": "Palm Jumeirah", "description": "Man-made island shaped like palm tree, luxury resorts, engineering wonder.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", "difficulty": "Easy"},
        {"name": "Desert Safari", "description": "Dune bashing, camel rides, Bedouin camps, sunset over golden sands.", "image_url": "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800&q=80", "difficulty": "Easy"},
        {"name": "Dubai Frame", "description": "150m gold frame structure, views of old and new Dubai, museum inside.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", "difficulty": "Easy"},
        {"name": "Louvre Abu Dhabi", "description": "Art museum with iconic dome roof, universal museum, East meets West.", "image_url": "https://images.unsplash.com/photo-1588523736859-2f14e2c5a3cb?w=800&q=80", "difficulty": "Easy"},
        {"name": "Burj Al Arab", "description": "Iconic sail-shaped luxury hotel, man-made island, Dubai's symbol.", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", "difficulty": "Easy"},
        {"name": "Dubai Fountain", "description": "World's largest choreographed fountain, water ballet with music and lights.", "image_url": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80", "difficulty": "Easy"},
        {"name": "Al Fahidi Historical District", "description": "Old Dubai quarter with wind towers, museums, souks, traditional architecture.", "image_url": "https://images.unsplash.com/photo-1549180030-48bf079fb38a?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - SINGAPORE
    "singapore": [
        {"name": "Marina Bay Sands", "description": "Iconic hotel with rooftop infinity pool, skyline views, modern landmark.", "image_url": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80", "difficulty": "Easy"},
        {"name": "Gardens by the Bay", "description": "Futuristic park, Supertree Grove, Cloud Forest, flower domes, nature meets tech.", "image_url": "https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sentosa Island", "description": "Resort island, Universal Studios, beaches, attractions, family paradise.", "image_url": "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&q=80", "difficulty": "Easy"},
        {"name": "Merlion Park", "description": "Mythical creature statue, half-lion half-fish, Singapore's national symbol.", "image_url": "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&q=80", "difficulty": "Easy"},
        {"name": "Orchard Road", "description": "Shopping paradise, luxury malls, dining, entertainment, urban energy.", "image_url": "https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chinatown Singapore", "description": "Historic district, temples, shophouses, hawker food, cultural heritage.", "image_url": "https://images.unsplash.com/photo-1562416231-1d0e1dba9064?w=800&q=80", "difficulty": "Easy"},
        {"name": "Singapore Zoo", "description": "Open-concept zoo, rainforest setting, night safari, wildlife immersion.", "image_url": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Clarke Quay", "description": "Riverside dining and nightlife, colorful colonial buildings, vibrant atmosphere.", "image_url": "https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=800&q=80", "difficulty": "Easy"},
        {"name": "Jewel Changi", "description": "Airport complex with indoor waterfall, forest valley, shopping, architectural wonder.", "image_url": "https://images.unsplash.com/photo-1543731068-5b6b1b9ab0b4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Little India", "description": "Colorful neighborhood, temples, spice shops, Indian culture and cuisine.", "image_url": "https://images.unsplash.com/photo-1562416231-1d0e1dba9064?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - INDONESIA
    "indonesia": [
        {"name": "Borobudur Temple", "description": "World's largest Buddhist temple, 9th century, volcanic stone, spiritual journey.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bali Rice Terraces", "description": "Emerald-green stepped rice paddies, UNESCO landscape, traditional irrigation.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Komodo National Park", "description": "Home to Komodo dragons, pink beaches, pristine diving, prehistoric reptiles.", "image_url": "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Mount Bromo", "description": "Active volcano, sunrise views, sea of sand, otherworldly lunar landscape.", "image_url": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tanah Lot Temple", "description": "Iconic temple on rock formation in sea, sunset views, Balinese spirituality.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Raja Ampat Islands", "description": "World's richest marine biodiversity, pristine coral reefs, diving paradise.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Hard"},
        {"name": "Prambanan Temple", "description": "Hindu temple complex, towering spires, Ramayana reliefs, Java's gem.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Gili Islands", "description": "Three tiny islands, no cars, turtles, coral gardens, laid-back paradise.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ubud Monkey Forest", "description": "Sacred sanctuary with 700 long-tailed macaques, temple complex, nature walk.", "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Toba", "description": "Volcanic lake, largest in Southeast Asia, Samosir Island, Batak culture.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - SOUTH KOREA
    "south_korea": [
        {"name": "Gyeongbokgung Palace", "description": "Main royal palace of Joseon Dynasty, changing of guard, traditional architecture.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Jeju Island", "description": "Volcanic island, lava tubes, waterfalls, beaches, Korea's honeymoon destination.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Easy"},
        {"name": "N Seoul Tower", "description": "Iconic observation tower on Namsan Mountain, panoramic city views, love locks.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bukchon Hanok Village", "description": "Traditional Korean houses, winding alleys, cultural heritage, Seoul views.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "DMZ Zone", "description": "Demilitarized zone between North and South Korea, tense border, historic tours.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Busan Haeundae Beach", "description": "Popular beach, high-rises, seafood, ocean views, summer festival.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Seoraksan National Park", "description": "Mountain park, hiking trails, autumn foliage, temples, natural beauty.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Boseong Tea Fields", "description": "Rolling green tea plantations, walking paths, serene rural landscape.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Changdeokgung Palace", "description": "UNESCO palace with secret garden, traditional architecture, royal history.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
        {"name": "Gamcheon Culture Village", "description": "Colorful hillside village, street art, maze of stairs, Busan's Santorini.", "image_url": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80", "difficulty": "Easy"},
    ],
    
    # ASIA - VIETNAM
    "vietnam": [
        {"name": "Ha Long Bay", "description": "UNESCO bay with 1600 limestone islands, emerald waters, kayaking, caves.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hoi An Ancient Town", "description": "Preserved trading port, lantern-lit streets, tailor shops, UNESCO heritage.", "image_url": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cu Chi Tunnels", "description": "Underground network from Vietnam War, history, guerrilla warfare tactics.", "image_url": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sapa Rice Terraces", "description": "Cascading rice paddies, hill tribe villages, trekking, misty mountains.", "image_url": "https://images.unsplash.com/photo-1551634979-1c3f28532194?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Phong Nha Caves", "description": "Massive cave systems, Son Doong world's largest cave, underground rivers.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Hard"},
        {"name": "Mekong Delta", "description": "River delta, floating markets, rice paddies, canal networks, local life.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Easy"},
        {"name": "Imperial City Hue", "description": "Former capital, citadel, palaces, tombs, Vietnamese royal history.", "image_url": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80", "difficulty": "Easy"},
        {"name": "Phu Quoc Island", "description": "Tropical beaches, diving, fish sauce, pearl farms, island paradise.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hanoi Old Quarter", "description": "36 ancient streets, motorbike chaos, street food, colonial architecture.", "image_url": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bai Tu Long Bay", "description": "Less crowded than Ha Long, pristine islands, kayaking, authentic experience.", "image_url": "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80", "difficulty": "Moderate"},
    ],
    
    # ASIA - MALAYSIA
    "malaysia": [
        {"name": "Petronas Twin Towers", "description": "Iconic twin skyscrapers, skybridge, symbol of modern Malaysia, KL views.", "image_url": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80", "difficulty": "Easy"},
        {"name": "Batu Caves", "description": "Hindu shrine in limestone cave, giant golden statue, 272 colorful steps.", "image_url": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80", "difficulty": "Easy"},
        {"name": "Langkawi Island", "description": "Tropical paradise, beaches, cable car, duty-free shopping, mangrove tours.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "George Town Penang", "description": "UNESCO colonial city, street art, hawker food, multicultural heritage.", "image_url": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cameron Highlands", "description": "Hill station, tea plantations, cooler climate, strawberry farms, British colonial.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kinabalu Park", "description": "UNESCO park, Mount Kinabalu, world's richest botanical site, cloud forests.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Perhentian Islands", "description": "Crystal waters, coral reefs, turtles, jungle, backpacker paradise.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Malacca Historic City", "description": "Portuguese and Dutch colonial heritage, Jonker Street, UNESCO site.", "image_url": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80", "difficulty": "Easy"},
        {"name": "Taman Negara", "description": "Ancient rainforest, 130 million years old, canopy walk, wildlife spotting.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Kuala Lumpur Tower", "description": "Communications tower, observation deck, revolving restaurant, city panoramas.", "image_url": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80", "difficulty": "Easy"},
    ],
}
