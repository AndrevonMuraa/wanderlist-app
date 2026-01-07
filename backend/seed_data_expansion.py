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
        {"name": "Champagne Vineyards", "description": "Rolling hillside vineyards, historic cellars, world's finest sparkling wine region.", "image_url": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80", "difficulty": "Easy"},
        {"name": "D-Day Beaches Normandy", "description": "Historic WWII landing beaches, museums, memorials, and Allied victory sites.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Catacombs of Paris", "description": "Underground ossuary holding remains of 6 million people, eerie subterranean tunnels.", "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Gorges du Verdon", "description": "Europe's Grand Canyon, turquoise river, dramatic cliffs, kayaking paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Château de Chenonceau", "description": "Elegant Renaissance castle spanning River Cher, stunning gardens, ladies' castle.", "image_url": "https://images.unsplash.com/photo-1590559865826-eb206e24cbd6?w=800&q=80", "difficulty": "Easy"},
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
        {"name": "Private Italy Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Italy experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Italy Wine & Dine", "description": "Premium dining experience featuring Italy cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Italy Heritage Pass", "description": "Skip-the-line access to Italy's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Italy Adventure", "description": "Multi-day premium adventure package including unique Italy activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Italy Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Spain Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Spain experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Spain Wine & Dine", "description": "Premium dining experience featuring Spain cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Spain Heritage Pass", "description": "Skip-the-line access to Spain's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Spain Adventure", "description": "Multi-day premium adventure package including unique Spain activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Spain Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Uk Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Uk experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Uk Wine & Dine", "description": "Premium dining experience featuring Uk cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Uk Heritage Pass", "description": "Skip-the-line access to Uk's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Uk Adventure", "description": "Multi-day premium adventure package including unique Uk activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Uk Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Germany Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Germany experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Germany Wine & Dine", "description": "Premium dining experience featuring Germany cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Germany Heritage Pass", "description": "Skip-the-line access to Germany's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Germany Adventure", "description": "Multi-day premium adventure package including unique Germany activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Germany Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Greece Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Greece experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Greece Wine & Dine", "description": "Premium dining experience featuring Greece cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Greece Heritage Pass", "description": "Skip-the-line access to Greece's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Greece Adventure", "description": "Multi-day premium adventure package including unique Greece activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Greece Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Norway Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Norway experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Norway Wine & Dine", "description": "Premium dining experience featuring Norway cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Norway Heritage Pass", "description": "Skip-the-line access to Norway's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Norway Adventure", "description": "Multi-day premium adventure package including unique Norway activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Norway Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Switzerland Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Switzerland experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Switzerland Wine & Dine", "description": "Premium dining experience featuring Switzerland cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Switzerland Heritage Pass", "description": "Skip-the-line access to Switzerland's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Switzerland Adventure", "description": "Multi-day premium adventure package including unique Switzerland activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Switzerland Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Netherlands Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Netherlands experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Netherlands Wine & Dine", "description": "Premium dining experience featuring Netherlands cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Netherlands Heritage Pass", "description": "Skip-the-line access to Netherlands's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Netherlands Adventure", "description": "Multi-day premium adventure package including unique Netherlands activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Netherlands Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Portugal Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Portugal experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Portugal Wine & Dine", "description": "Premium dining experience featuring Portugal cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Portugal Heritage Pass", "description": "Skip-the-line access to Portugal's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Portugal Adventure", "description": "Multi-day premium adventure package including unique Portugal activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Portugal Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Japan Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Japan experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Japan Wine & Dine", "description": "Premium dining experience featuring Japan cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Japan Heritage Pass", "description": "Skip-the-line access to Japan's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Japan Adventure", "description": "Multi-day premium adventure package including unique Japan activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Japan Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private China Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic China experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury China Wine & Dine", "description": "Premium dining experience featuring China cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP China Heritage Pass", "description": "Skip-the-line access to China's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate China Adventure", "description": "Multi-day premium adventure package including unique China activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret China Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Thailand Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Thailand experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Thailand Wine & Dine", "description": "Premium dining experience featuring Thailand cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Thailand Heritage Pass", "description": "Skip-the-line access to Thailand's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Thailand Adventure", "description": "Multi-day premium adventure package including unique Thailand activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Thailand Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private India Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic India experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury India Wine & Dine", "description": "Premium dining experience featuring India cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP India Heritage Pass", "description": "Skip-the-line access to India's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate India Adventure", "description": "Multi-day premium adventure package including unique India activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret India Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Uae Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Uae experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Uae Wine & Dine", "description": "Premium dining experience featuring Uae cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Uae Heritage Pass", "description": "Skip-the-line access to Uae's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Uae Adventure", "description": "Multi-day premium adventure package including unique Uae activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Uae Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Singapore Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Singapore experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Singapore Wine & Dine", "description": "Premium dining experience featuring Singapore cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Singapore Heritage Pass", "description": "Skip-the-line access to Singapore's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Singapore Adventure", "description": "Multi-day premium adventure package including unique Singapore activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Singapore Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Indonesia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Indonesia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Indonesia Wine & Dine", "description": "Premium dining experience featuring Indonesia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Indonesia Heritage Pass", "description": "Skip-the-line access to Indonesia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Indonesia Adventure", "description": "Multi-day premium adventure package including unique Indonesia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Indonesia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private South Korea Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic South Korea experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury South Korea Wine & Dine", "description": "Premium dining experience featuring South Korea cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP South Korea Heritage Pass", "description": "Skip-the-line access to South Korea's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate South Korea Adventure", "description": "Multi-day premium adventure package including unique South Korea activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret South Korea Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Vietnam Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Vietnam experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Vietnam Wine & Dine", "description": "Premium dining experience featuring Vietnam cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Vietnam Heritage Pass", "description": "Skip-the-line access to Vietnam's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Vietnam Adventure", "description": "Multi-day premium adventure package including unique Vietnam activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Vietnam Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
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
        {"name": "Private Malaysia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Malaysia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Malaysia Wine & Dine", "description": "Premium dining experience featuring Malaysia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Malaysia Heritage Pass", "description": "Skip-the-line access to Malaysia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Malaysia Adventure", "description": "Multi-day premium adventure package including unique Malaysia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Malaysia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - EGYPT
    "egypt": [
        {"name": "Pyramids of Giza", "description": "Ancient wonders, Great Pyramid, Sphinx, only surviving Seven Wonders.", "image_url": "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80", "difficulty": "Easy"},
        {"name": "Valley of the Kings", "description": "Pharaoh tombs, Tutankhamun's burial place, hieroglyphs, desert necropolis.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Abu Simbel Temples", "description": "Colossal rock-cut temples, Ramses II statues, Lake Nasser, UNESCO rescue.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Karnak Temple", "description": "Massive ancient complex, towering columns, hieroglyphs, Sound and Light show.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Egyptian Museum Cairo", "description": "World's largest Pharaonic collection, Tutankhamun treasures, mummies, artifacts.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nile River Cruise", "description": "Sail past temples, villages, history along world's longest river.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxor Temple", "description": "Ancient temple complex, Avenue of Sphinxes, illuminated at night, majestic columns.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Red Sea Riviera", "description": "World-class diving, coral reefs, resort towns, turquoise waters, marine life.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Khan el-Khalili Bazaar", "description": "Historic market, spices, perfumes, jewelry, authentic Cairo experience since 1382.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Siwa Oasis", "description": "Remote desert oasis, salt lakes, mud-brick fortress, dates, olive groves.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Private Egypt Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Egypt experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Egypt Wine & Dine", "description": "Premium dining experience featuring Egypt cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Egypt Heritage Pass", "description": "Skip-the-line access to Egypt's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Egypt Adventure", "description": "Multi-day premium adventure package including unique Egypt activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Egypt Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - MOROCCO
    "morocco": [
        {"name": "Marrakech Medina", "description": "Labyrinth of souks, Jemaa el-Fnaa square, snake charmers, aromatic spices.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sahara Desert", "description": "Golden dunes, camel treks, Berber camps, starry nights, endless sand seas.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Chefchaouen Blue City", "description": "Entire town painted blue, mountain setting, peaceful atmosphere, photo paradise.", "image_url": "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hassan II Mosque", "description": "Stunning seaside mosque, world's tallest minaret, intricate mosaics, Casablanca.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Fes Medina", "description": "Medieval walled city, UNESCO site, oldest university, tanneries, maze of alleys.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ait Benhaddou", "description": "Fortified village, earthen clay architecture, Game of Thrones filming location.", "image_url": "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80", "difficulty": "Easy"},
        {"name": "Atlas Mountains", "description": "Snow-capped peaks, Berber villages, trekking, valleys, North Africa's roof.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Essaouira Coast", "description": "Coastal town, whitewashed medina, seafood, windsurfing, laid-back vibe.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Todra Gorge", "description": "Dramatic canyon, 300m limestone walls, rock climbing, river, desert scenery.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Rabat Kasbah", "description": "Fortified citadel, blue and white streets, ocean views, capital's historic heart.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Morocco Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Morocco experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Morocco Wine & Dine", "description": "Premium dining experience featuring Morocco cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Morocco Heritage Pass", "description": "Skip-the-line access to Morocco's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Morocco Adventure", "description": "Multi-day premium adventure package including unique Morocco activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Morocco Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - SOUTH AFRICA
    "south_africa": [
        {"name": "Table Mountain", "description": "Flat-topped mountain, cable car, hiking, panoramic Cape Town and ocean views.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Kruger National Park", "description": "Big Five safari, largest game reserve, diverse wildlife, self-drive adventures.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cape of Good Hope", "description": "Dramatic cliffs at Africa's southwestern tip, meeting of two oceans, penguins.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80", "difficulty": "Easy"},
        {"name": "Robben Island", "description": "Historic prison where Mandela was held, UNESCO site, symbol of freedom.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80", "difficulty": "Easy"},
        {"name": "Garden Route", "description": "Scenic coastal drive, forests, lagoons, beaches, charming towns, nature paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Blyde River Canyon", "description": "Green canyon, third largest in world, Three Rondavels, waterfalls, viewpoints.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Victoria & Alfred Waterfront", "description": "Bustling harbor, shopping, dining, aquarium, seal colony, Cape Town hotspot.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80", "difficulty": "Easy"},
        {"name": "Drakensberg Mountains", "description": "UNESCO mountain range, hiking, rock art, waterfalls, Giant's Castle, scenery.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Winelands Stellenbosch", "description": "Cape Dutch architecture, vineyards, wine tasting, gourmet food, mountain backdrop.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Apartheid Museum", "description": "Powerful museum documenting South Africa's segregation history and triumph.", "image_url": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private South Africa Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic South Africa experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury South Africa Wine & Dine", "description": "Premium dining experience featuring South Africa cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP South Africa Heritage Pass", "description": "Skip-the-line access to South Africa's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate South Africa Adventure", "description": "Multi-day premium adventure package including unique South Africa activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret South Africa Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - KENYA
    "kenya": [
        {"name": "Maasai Mara Reserve", "description": "Great Migration, Big Five, savanna, hot air balloons, Maasai culture.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mount Kenya", "description": "Africa's second-highest peak, glaciers, alpine zones, trekking, UNESCO site.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Diani Beach", "description": "White sand, turquoise waters, coral reefs, water sports, coastal paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amboseli National Park", "description": "Elephant herds with Mount Kilimanjaro backdrop, swamps, dry lake bed, photography.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Nakuru", "description": "Pink flamingos, rhino sanctuary, baboons, diverse birdlife, soda lake.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lamu Old Town", "description": "Swahili architecture, UNESCO site, donkeys not cars, dhow boats, timeless island.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tsavo National Park", "description": "Red elephants, Mzima Springs, vast wilderness, lion history, Kenya's largest park.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hell's Gate National Park", "description": "Dramatic gorge, geothermal activity, cycling, rock climbing, inspired Lion King.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Great Rift Valley", "description": "Geological marvel, escarpments, lakes, volcanic formations, viewpoints.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nairobi National Park", "description": "Wildlife park with city skyline backdrop, lions, rhinos, giraffe center nearby.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Kenya Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Kenya experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Kenya Wine & Dine", "description": "Premium dining experience featuring Kenya cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Kenya Heritage Pass", "description": "Skip-the-line access to Kenya's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Kenya Adventure", "description": "Multi-day premium adventure package including unique Kenya activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Kenya Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - TANZANIA
    "tanzania": [
        {"name": "Mount Kilimanjaro", "description": "Africa's highest peak, snow-capped summit, trekking routes, bucket-list climb.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Hard"},
        {"name": "Serengeti National Park", "description": "Endless plains, Great Migration, Big Five, wildebeest, UNESCO wildlife paradise.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Zanzibar Beaches", "description": "White sand, turquoise Indian Ocean, spice tours, Stone Town, island paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ngorongoro Crater", "description": "World's largest intact caldera, dense wildlife, natural amphitheater, UNESCO gem.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Stone Town", "description": "Historic center of Zanzibar, Arab, Persian, Indian, European influences, UNESCO.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Manyara", "description": "Alkaline lake, tree-climbing lions, flamingos, elephants, diverse ecosystems.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tarangire National Park", "description": "Elephant herds, baobab trees, dry season wildlife concentration, birding.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mafia Island", "description": "Diving paradise, whale sharks, pristine reefs, laid-back, off-beaten path.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Olduvai Gorge", "description": "Cradle of Mankind, early human fossils, archaeological site, paleoanthropology.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pemba Island", "description": "Clove island, unspoiled beaches, diving, spice plantations, quiet escape.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Tanzania Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Tanzania experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Tanzania Wine & Dine", "description": "Premium dining experience featuring Tanzania cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Tanzania Heritage Pass", "description": "Skip-the-line access to Tanzania's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Tanzania Adventure", "description": "Multi-day premium adventure package including unique Tanzania activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Tanzania Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - MAURITIUS
    "mauritius": [
        {"name": "Le Morne Brabant", "description": "UNESCO mountain, hiking, symbol of resistance, stunning lagoon views, iconic peak.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Chamarel Seven Colored Earths", "description": "Sand dunes in seven colors, geological phenomenon, Chamarel Waterfall nearby.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Black River Gorges", "description": "National park, endemic species, waterfalls, hiking trails, lush rainforest.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Grand Baie Beach", "description": "Popular resort area, water sports, shopping, nightlife, turquoise lagoon.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ile aux Cerfs", "description": "Private island, pristine beaches, water activities, golf, day trip paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Port Louis Market", "description": "Central market, spices, textiles, street food, local culture, vibrant atmosphere.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Underwater Waterfall", "description": "Optical illusion of underwater waterfall, aerial views, unique natural phenomenon.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pamplemousses Garden", "description": "Botanical garden, giant water lilies, exotic plants, colonial history, peaceful oasis.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Blue Bay Marine Park", "description": "Snorkeling paradise, glass-bottom boats, coral gardens, protected marine area.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rodrigues Island", "description": "Remote volcanic island, pristine nature, Creole culture, caves, lagoon.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Mauritius Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Mauritius experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Mauritius Wine & Dine", "description": "Premium dining experience featuring Mauritius cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Mauritius Heritage Pass", "description": "Skip-the-line access to Mauritius's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Mauritius Adventure", "description": "Multi-day premium adventure package including unique Mauritius activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Mauritius Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - SEYCHELLES
    "seychelles": [
        {"name": "Anse Source d'Argent", "description": "World's most photographed beach, granite boulders, turquoise water, paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Vallée de Mai", "description": "UNESCO primeval forest, coco de mer palms, endemic species, Garden of Eden.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Aldabra Atoll", "description": "UNESCO atoll, giant tortoises, pristine ecosystem, remote coral islands.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Beau Vallon Beach", "description": "Main beach, sunset views, water sports, restaurants, lively atmosphere.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Morne Seychellois", "description": "Highest peak, hiking trails, cloud forests, endemic flora, panoramic views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Cousin Island", "description": "Nature reserve, seabirds, giant tortoises, conservation success story.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Anse Lazio", "description": "Pristine beach, granite rocks, clear water, snorkeling, consistently top-rated.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Curieuse Island", "description": "Giant tortoise breeding, mangrove forests, BBQ beaches, day excursions.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Victoria Clock Tower", "description": "Mini Big Ben, capital city landmark, colorful market, Creole culture.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sainte Anne Marine Park", "description": "First marine park, snorkeling, glass-bottom boats, protected reefs, sea turtles.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Seychelles Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Seychelles experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Seychelles Wine & Dine", "description": "Premium dining experience featuring Seychelles cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Seychelles Heritage Pass", "description": "Skip-the-line access to Seychelles's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Seychelles Adventure", "description": "Multi-day premium adventure package including unique Seychelles activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Seychelles Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - BOTSWANA
    "botswana": [
        {"name": "Okavango Delta", "description": "UNESCO inland delta, mokoro canoes, wildlife, water oasis in Kalahari Desert.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chobe National Park", "description": "Massive elephant herds, river safaris, Big Five, bird paradise, pristine wilderness.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Makgadikgadi Salt Pans", "description": "Vast white salt flats, meerkats, flamingos, stargazing, surreal landscapes.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Moremi Game Reserve", "description": "Prime wildlife viewing, leopards, wild dogs, diverse ecosystems, luxury lodges.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kalahari Desert", "description": "Red dunes, San Bushmen culture, wildlife adaptations, remote wilderness.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tsodilo Hills", "description": "UNESCO rock art site, 4500 paintings, sacred to San people, spiritual place.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Savuti Marsh", "description": "Predator capital, lion prides, dry season action, dramatic wildlife encounters.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Linyanti Wildlife Reserve", "description": "Remote wetlands, wild dogs, elephants, exclusive safari experience.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nxai Pan National Park", "description": "Ancient baobabs, springbok migration, dramatic landscapes, seasonal floods.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Kubu Island", "description": "Rocky outcrop in salt pan, ancient baobabs, camping, remote adventure.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Private Botswana Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Botswana experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Botswana Wine & Dine", "description": "Premium dining experience featuring Botswana cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Botswana Heritage Pass", "description": "Skip-the-line access to Botswana's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Botswana Adventure", "description": "Multi-day premium adventure package including unique Botswana activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Botswana Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - NAMIBIA
    "namibia": [
        {"name": "Sossusvlei Dunes", "description": "World's highest red sand dunes, Dead Vlei, surreal desert landscapes, photography.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Etosha National Park", "description": "Salt pan, waterholes, lions, elephants, rhinos, excellent game viewing.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Fish River Canyon", "description": "Second largest canyon in world, hiking trail, dramatic ravine, geological wonder.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Skeleton Coast", "description": "Shipwrecks, seals, desert meets ocean, fog, desolate beauty, remote coast.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Spitzkoppe", "description": "Granite peaks, rock formations, ancient rock art, boulders, dramatic landscapes.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Swakopmund", "description": "German colonial town, adventure capital, sandboarding, quad biking, Atlantic coast.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Deadvlei", "description": "Ancient camel thorn trees, white clay pan, red dunes, photographer's dream.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Damaraland", "description": "Desert elephants, rock engravings, petrified forest, rugged wilderness.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Kolmanskop Ghost Town", "description": "Abandoned diamond mining town, sand-filled houses, photographer paradise.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Waterberg Plateau", "description": "Sandstone cliffs, rare species sanctuary, hiking, prehistoric rock art.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Private Namibia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Namibia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Namibia Wine & Dine", "description": "Premium dining experience featuring Namibia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Namibia Heritage Pass", "description": "Skip-the-line access to Namibia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Namibia Adventure", "description": "Multi-day premium adventure package including unique Namibia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Namibia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AFRICA - TUNISIA
    "tunisia": [
        {"name": "Carthage Ruins", "description": "Ancient Phoenician city, Roman amphitheater, UNESCO site, Mediterranean history.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sidi Bou Said", "description": "Blue and white village, clifftop Mediterranean views, artists, cafes, charm.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sahara Star Wars Sets", "description": "Film locations in desert, Matmata troglodyte homes, Mos Espa, Tatooine experience.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "El Djem Amphitheater", "description": "Best-preserved Roman colosseum outside Italy, UNESCO, gladiator history.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tunis Medina", "description": "UNESCO old town, souks, mosques, palaces, traditional crafts, labyrinth.", "image_url": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chott el Djerid", "description": "Vast salt lake, mirages, Sahara gateway, surreal landscapes, desert tours.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Dougga Roman City", "description": "Best-preserved Roman town in North Africa, UNESCO, capitol, theater, temples.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hammamet Beach", "description": "Popular resort, white sand, turquoise water, medina, golf, family destination.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bardo National Museum", "description": "World's finest Roman mosaic collection, Carthaginian artifacts, Tunis palace.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tozeur Oasis", "description": "Desert oasis, palm groves, Berber architecture, Sahara gateway, date capital.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Tunisia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Tunisia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Tunisia Wine & Dine", "description": "Premium dining experience featuring Tunisia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Tunisia Heritage Pass", "description": "Skip-the-line access to Tunisia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Tunisia Adventure", "description": "Multi-day premium adventure package including unique Tunisia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Tunisia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - USA
    "usa": [
        {"name": "Statue of Liberty", "description": "Iconic symbol of freedom, New York Harbor, torch and crown, gift from France.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Grand Canyon", "description": "Massive canyon carved by Colorado River, colorful layers, natural wonder.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Yellowstone National Park", "description": "Geysers, Old Faithful, hot springs, wildlife, first national park in world.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Golden Gate Bridge", "description": "Iconic red suspension bridge, San Francisco, fog, engineering marvel, photo spot.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Times Square NYC", "description": "Bright lights, billboards, Broadway, heart of Manhattan, electric energy.", "image_url": "https://images.unsplash.com/photo-1543716627-839b54c40519?w=800&q=80", "difficulty": "Easy"},
        {"name": "Disney World Florida", "description": "Magic Kingdom, theme parks, castles, family entertainment, happiest place.", "image_url": "https://images.unsplash.com/photo-1566266318593-e5c2b925af37?w=800&q=80", "difficulty": "Easy"},
        {"name": "Las Vegas Strip", "description": "Casinos, shows, neon lights, entertainment capital, desert oasis of excess.", "image_url": "https://images.unsplash.com/photo-1540259029706-0ea7272c8b54?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mount Rushmore", "description": "Four presidents carved in granite, Black Hills, American symbol, monument.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Hawaii Volcanoes", "description": "Active lava flows, Kilauea, black sand beaches, tropical volcanic paradise.", "image_url": "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Niagara Falls", "description": "Powerful waterfalls on US-Canada border, Maid of the Mist, natural spectacle.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Usa Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Usa experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Usa Wine & Dine", "description": "Premium dining experience featuring Usa cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Usa Heritage Pass", "description": "Skip-the-line access to Usa's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Usa Adventure", "description": "Multi-day premium adventure package including unique Usa activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Usa Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - CANADA
    "canada": [
        {"name": "Banff National Park", "description": "Turquoise lakes, Rocky Mountains, glaciers, wildlife, pristine wilderness.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Niagara Falls", "description": "Horseshoe Falls, boat tours, illuminations, thundering water, natural wonder.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "CN Tower Toronto", "description": "Iconic communications tower, glass floor, city views, Canadian landmark.", "image_url": "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80", "difficulty": "Easy"},
        {"name": "Canadian Rockies", "description": "Majestic mountain range, hiking, Lake Louise, Moraine Lake, alpine beauty.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Old Quebec City", "description": "European charm, cobblestone streets, Château Frontenac, fortified city, UNESCO.", "image_url": "https://images.unsplash.com/photo-1519112232436-9923c6ba3d26?w=800&q=80", "difficulty": "Easy"},
        {"name": "Vancouver Stanley Park", "description": "Urban rainforest, seawall, totem poles, beaches, mountains meet ocean.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Churchill Polar Bears", "description": "Polar bear capital, tundra, beluga whales, northern lights, Arctic adventure.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Bay of Fundy", "description": "World's highest tides, dramatic coastline, fossil cliffs, tidal bore rafting.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Whistler", "description": "World-class ski resort, mountain biking, Peak 2 Peak gondola, alpine village.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Parliament Hill Ottawa", "description": "Gothic Revival buildings, Changing of Guard, capital city, Canadian government.", "image_url": "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Canada Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Canada experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Canada Wine & Dine", "description": "Premium dining experience featuring Canada cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Canada Heritage Pass", "description": "Skip-the-line access to Canada's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Canada Adventure", "description": "Multi-day premium adventure package including unique Canada activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Canada Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - MEXICO
    "mexico": [
        {"name": "Chichen Itza", "description": "Mayan pyramid, UNESCO wonder, El Castillo, ancient astronomy, Kukulkan.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cancun Beaches", "description": "White sand, turquoise Caribbean, resorts, nightlife, tropical paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Teotihuacan", "description": "Ancient city, Pyramid of Sun and Moon, Avenue of Dead, pre-Aztec mystery.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Copper Canyon", "description": "Network of canyons larger than Grand Canyon, indigenous Tarahumara, train ride.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tulum Ruins", "description": "Mayan ruins on Caribbean cliff, beach, turquoise waters, bohemian town.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mexico City Zócalo", "description": "Historic square, Aztec ruins, cathedral, National Palace, cultural heart.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cenotes Yucatan", "description": "Natural sinkholes, crystal-clear water, swimming, diving, Mayan underworld.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Guanajuato", "description": "Colorful hillside city, underground streets, mummies, silver mining history.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Palenque Jungle Temples", "description": "Mayan ruins in rainforest, pyramids, howler monkeys, mysterious inscriptions.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Oaxaca Monte Alban", "description": "Zapotec ruins, mezcal, handicrafts, Day of Dead traditions, colonial city.", "image_url": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Mexico Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Mexico experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Mexico Wine & Dine", "description": "Premium dining experience featuring Mexico cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Mexico Heritage Pass", "description": "Skip-the-line access to Mexico's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Mexico Adventure", "description": "Multi-day premium adventure package including unique Mexico activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Mexico Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - BRAZIL
    "brazil": [
        {"name": "Christ the Redeemer", "description": "Iconic statue atop Corcovado, arms open wide, Rio symbol, panoramic views.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Iguazu Falls", "description": "275 waterfalls, Devil's Throat, rainforest, Argentina border, thundering beauty.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amazon Rainforest", "description": "World's largest rainforest, biodiversity, indigenous tribes, river cruises, wildlife.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Copacabana Beach", "description": "Famous Rio beach, black and white mosaic, volleyball, samba, beach culture.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Sugarloaf Mountain", "description": "Cable car to granite peak, 360-degree Rio views, Guanabara Bay, sunset spot.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pantanal Wetlands", "description": "World's largest wetland, jaguars, caimans, birding, wildlife photography paradise.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Fernando de Noronha", "description": "Pristine archipelago, dolphins, sea turtles, diving, protected marine park.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Salvador Pelourinho", "description": "Afro-Brazilian culture, colonial architecture, capoeira, music, colorful historic center.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lençóis Maranhenses", "description": "White sand dunes with turquoise lagoons, desert meets water, unique ecosystem.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "São Paulo Avenida Paulista", "description": "Financial heart, museums, street art, dining, vibrant urban energy, cultural hub.", "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Brazil Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Brazil experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Brazil Wine & Dine", "description": "Premium dining experience featuring Brazil cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Brazil Heritage Pass", "description": "Skip-the-line access to Brazil's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Brazil Adventure", "description": "Multi-day premium adventure package including unique Brazil activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Brazil Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - PERU
    "peru": [
        {"name": "Machu Picchu", "description": "Lost city of Incas, mountain citadel, UNESCO wonder, mystical ruins in clouds.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Nazca Lines", "description": "Mysterious geoglyphs, giant animal figures, ancient desert drawings, fly-over tours.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Titicaca", "description": "Highest navigable lake, floating Uros Islands, Inca mythology, Bolivia border.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cusco Historic Center", "description": "Former Inca capital, Spanish colonial, Sacred Valley gateway, vibrant culture.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80", "difficulty": "Easy"},
        {"name": "Amazon Peru", "description": "Rainforest lodges, Iquitos, wildlife, ayahuasca ceremonies, river expeditions.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Colca Canyon", "description": "Second deepest canyon, Andean condors, terraced farming, hot springs, trekking.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Rainbow Mountain", "description": "Vinicunca, striped mountain, vibrant colors, high altitude hike, Instagram famous.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Sacred Valley", "description": "Inca ruins, Ollantaytambo, Pisac market, agricultural terraces, mountain scenery.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lima Historic Center", "description": "Colonial architecture, Plaza de Armas, catacombs, gastronomy capital, UNESCO.", "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80", "difficulty": "Easy"},
        {"name": "Huacachina Oasis", "description": "Desert oasis, sand dunes, sandboarding, dune buggies, palm-ringed lagoon.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Peru Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Peru experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Peru Wine & Dine", "description": "Premium dining experience featuring Peru cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Peru Heritage Pass", "description": "Skip-the-line access to Peru's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Peru Adventure", "description": "Multi-day premium adventure package including unique Peru activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Peru Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - ARGENTINA
    "argentina": [
        {"name": "Iguazu Falls", "description": "Massive waterfall system, Devil's Throat, walkways, rainbows, natural wonder.", "image_url": "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&q=80", "difficulty": "Easy"},
        {"name": "Perito Moreno Glacier", "description": "Advancing glacier, blue ice, calving, walkways, Patagonia's crown jewel.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Buenos Aires Tango", "description": "European-style city, La Boca, tango shows, steak, wine, cosmopolitan culture.", "image_url": "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ushuaia End of World", "description": "Southernmost city, Tierra del Fuego, penguins, Antarctica gateway, dramatic scenery.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mendoza Wine Region", "description": "Malbec vineyards, Andes backdrop, wineries, gourmet food, outdoor adventures.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Patagonia Torres del Paine", "description": "Granite peaks, glaciers, guanacos, W Trek, pristine wilderness, Chile border.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Recoleta Cemetery", "description": "Elaborate mausoleums, Eva Perón tomb, outdoor museum, Buenos Aires history.", "image_url": "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bariloche Lake District", "description": "Swiss-style town, chocolate, Nahuel Huapi Lake, skiing, hiking, scenic beauty.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Valdes Peninsula", "description": "UNESCO reserve, whales, sea lions, penguins, elephant seals, wildlife watching.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Salta & Jujuy", "description": "Colonial architecture, colorful mountains, Humahuaca Gorge, high-altitude vineyards.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Argentina Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Argentina experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Argentina Wine & Dine", "description": "Premium dining experience featuring Argentina cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Argentina Heritage Pass", "description": "Skip-the-line access to Argentina's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Argentina Adventure", "description": "Multi-day premium adventure package including unique Argentina activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Argentina Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - CHILE
    "chile": [
        {"name": "Torres del Paine", "description": "Iconic granite towers, glaciers, pumas, W Circuit, Patagonia's masterpiece.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Atacama Desert", "description": "Driest desert on Earth, Valle de la Luna, geysers, stargazing, salt flats.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Easter Island Moai", "description": "Mysterious stone heads, Polynesian culture, remote island, archaeological wonder.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Valparaiso", "description": "Colorful hillside port city, funiculars, street art, bohemian, UNESCO heritage.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chilean Lake District", "description": "Volcanoes, lakes, forests, hot springs, German influence, outdoor paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Marble Caves", "description": "Swirled blue marble caverns, General Carrera Lake, boat tours, natural wonder.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Santiago City", "description": "Modern capital, Andes views, wine tours, San Cristóbal Hill, urban sophistication.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Chiloé Island", "description": "Wooden churches, palafitos, mythology, seafood, unique architecture, UNESCO.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lauca National Park", "description": "High-altitude park, vicuñas, Lake Chungará, volcanoes, flamingos, altiplano.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Viña del Mar", "description": "Garden city, beaches, Flower Clock, casino, coastal resort, Pacific views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Chile Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Chile experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Chile Wine & Dine", "description": "Premium dining experience featuring Chile cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Chile Heritage Pass", "description": "Skip-the-line access to Chile's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Chile Adventure", "description": "Multi-day premium adventure package including unique Chile activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Chile Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - COLOMBIA
    "colombia": [
        {"name": "Cartagena Old City", "description": "Walled colonial city, colorful buildings, Caribbean beaches, UNESCO, romantic.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cocora Valley", "description": "World's tallest palm trees, Andean cloud forest, hiking, coffee region, surreal.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tayrona National Park", "description": "Jungle meets Caribbean, pristine beaches, indigenous ruins, biodiversity, paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Bogotá La Candelaria", "description": "Historic district, Gold Museum, street art, Monserrate, cultural heart.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Coffee Triangle", "description": "Coffee plantations, fincas, rolling hills, coffee culture, UNESCO landscape.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Caño Cristales", "description": "Liquid Rainbow, river of five colors, aquatic plants, remote jungle, seasonal.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "San Andrés Island", "description": "Caribbean paradise, seven-color sea, coral reefs, diving, beach bliss.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Medellín Transformation", "description": "City of eternal spring, cable cars, Comuna 13 art, innovation, vibrant nightlife.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Salt Cathedral Zipaquirá", "description": "Underground cathedral carved in salt mine, illuminated, engineering marvel.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Los Nevados Park", "description": "Snow-capped volcanoes, páramo ecosystem, hot springs, Andean condors, trekking.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Private Colombia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Colombia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Colombia Wine & Dine", "description": "Premium dining experience featuring Colombia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Colombia Heritage Pass", "description": "Skip-the-line access to Colombia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Colombia Adventure", "description": "Multi-day premium adventure package including unique Colombia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Colombia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - ECUADOR
    "ecuador": [
        {"name": "Galápagos Islands", "description": "Darwin's living laboratory, giant tortoises, marine iguanas, unique wildlife, UNESCO.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Quito Old Town", "description": "Best-preserved colonial center, UNESCO, churches, Plaza Grande, equator city.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cotopaxi Volcano", "description": "Active snow-capped volcano, horseback riding, climbing, Avenue of Volcanoes.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Amazon Ecuador", "description": "Primary rainforest, indigenous communities, wildlife, lodges, Yasuni National Park.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Baños de Agua Santa", "description": "Adventure capital, waterfalls, hot springs, swings, rafting, Casa del Árbol.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Montañita Beach", "description": "Surf town, bohemian vibe, nightlife, backpacker paradise, Pacific coast.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Otavalo Market", "description": "Indigenous market, textiles, handicrafts, colorful, Andean culture, weekend bustle.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cuenca Historic Center", "description": "Colonial architecture, Panama hats, riverside, UNESCO, charming cobblestone streets.", "image_url": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80", "difficulty": "Easy"},
        {"name": "Quilotoa Crater Lake", "description": "Turquoise volcanic crater lake, hiking rim, indigenous villages, stunning views.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Mindo Cloud Forest", "description": "Birding paradise, hummingbirds, zip-lining, waterfalls, chocolate tours, biodiversity.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Ecuador Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Ecuador experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Ecuador Wine & Dine", "description": "Premium dining experience featuring Ecuador cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Ecuador Heritage Pass", "description": "Skip-the-line access to Ecuador's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Ecuador Adventure", "description": "Multi-day premium adventure package including unique Ecuador activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Ecuador Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # AMERICAS - COSTA RICA
    "costa_rica": [
        {"name": "Arenal Volcano", "description": "Perfect cone volcano, hot springs, zip-lining, hanging bridges, adventure hub.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Manuel Antonio", "description": "National park, beaches meet jungle, sloths, monkeys, biodiversity hotspot.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Monteverde Cloud Forest", "description": "Misty cloud forest, hanging bridges, quetzals, zip-lining, ecological reserve.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Tortuguero Canals", "description": "Canals through jungle, sea turtles nesting, wildlife, boat tours, Caribbean coast.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tamarindo Beach", "description": "Surf town, sunset, nightlife, Pacific coast, sea turtles, beach life.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Poás Volcano", "description": "Active volcano, turquoise acid lake, easy access, cloud forest, crater views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rio Celeste Waterfall", "description": "Blue waterfall and river, chemical reaction, rainforest hike, natural wonder.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Corcovado National Park", "description": "Most biodiverse place on Earth, jaguars, tapirs, scarlet macaws, pristine wilderness.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Hard"},
        {"name": "La Fortuna Waterfall", "description": "75m waterfall, swimming hole, stairs through jungle, photogenic, refreshing.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cahuita National Park", "description": "Caribbean beaches, coral reef, sloths, howler monkeys, Afro-Caribbean culture.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Costa Rica Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Costa Rica experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Costa Rica Wine & Dine", "description": "Premium dining experience featuring Costa Rica cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Costa Rica Heritage Pass", "description": "Skip-the-line access to Costa Rica's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Costa Rica Adventure", "description": "Multi-day premium adventure package including unique Costa Rica activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Costa Rica Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - AUSTRALIA
    "australia": [
        {"name": "Sydney Opera House", "description": "Iconic sail-shaped building, harbor, performing arts, Sydney symbol, UNESCO.", "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", "difficulty": "Easy"},
        {"name": "Great Barrier Reef", "description": "World's largest coral reef system, diving, snorkeling, marine life, natural wonder.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Uluru Ayers Rock", "description": "Sacred red monolith, Aboriginal culture, sunrise/sunset, outback, spiritual.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Great Ocean Road", "description": "Scenic coastal drive, Twelve Apostles, cliffs, shipwrecks, stunning views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Blue Mountains", "description": "Sandstone cliffs, Three Sisters, eucalyptus forest, waterfalls, hiking, scenic railway.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Whitsunday Islands", "description": "74 tropical islands, Whitehaven Beach, sailing, coral reefs, turquoise waters.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kakadu National Park", "description": "Aboriginal rock art, wetlands, crocodiles, waterfalls, cultural heritage, wildlife.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Daintree Rainforest", "description": "Ancient rainforest meets reef, World Heritage, wildlife, Cape Tribulation.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tasmania Wilderness", "description": "Pristine wilderness, Cradle Mountain, convict history, wildlife, hiking trails.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Bondi Beach", "description": "Famous surf beach, coastal walk, beach culture, cafes, Sydney's playground.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Australia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Australia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Australia Wine & Dine", "description": "Premium dining experience featuring Australia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Australia Heritage Pass", "description": "Skip-the-line access to Australia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Australia Adventure", "description": "Multi-day premium adventure package including unique Australia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Australia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - NEW ZEALAND
    "new_zealand": [
        {"name": "Milford Sound", "description": "Fiordland, waterfalls, rainforest, dolphins, cruises, Mitre Peak, pristine beauty.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Hobbiton Movie Set", "description": "Lord of the Rings film set, Shire, hobbit holes, rolling green hills, fantasy come alive.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Queenstown", "description": "Adventure capital, bungee jumping, skiing, Remarkables, adrenaline, stunning lakeside.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tongariro Crossing", "description": "Alpine crossing, emerald lakes, Mount Doom, volcanic landscape, day hike.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Rotorua Geothermal", "description": "Geysers, hot springs, mud pools, Maori culture, thermal wonderland, unique.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Bay of Islands", "description": "150 subtropical islands, dolphins, sailing, historic Waitangi, pristine waters.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Franz Josef Glacier", "description": "Walk on glacier, ice climbing, rainforest to ice, West Coast beauty.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Abel Tasman Park", "description": "Golden beaches, coastal track, kayaking, seals, crystal waters, paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lake Tekapo", "description": "Turquoise lake, Church of Good Shepherd, stargazing, lupins, Southern Alps.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Wellington Te Papa Museum", "description": "National museum, Maori treasures, interactive, capital city, cultural hub.", "image_url": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private New Zealand Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic New Zealand experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury New Zealand Wine & Dine", "description": "Premium dining experience featuring New Zealand cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP New Zealand Heritage Pass", "description": "Skip-the-line access to New Zealand's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate New Zealand Adventure", "description": "Multi-day premium adventure package including unique New Zealand activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret New Zealand Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - FIJI
    "fiji": [
        {"name": "Coral Coast", "description": "White sand beaches, coral reefs, snorkeling, traditional villages, paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mamanuca Islands", "description": "Resort islands, crystal waters, surfing, Cast Away island, tropical bliss.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Yasawa Islands", "description": "Remote volcanic islands, pristine beaches, cave swimming, traditional Fijian culture.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Garden of Sleeping Giant", "description": "Orchid collection, tropical garden, rainforest, peaceful botanical paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Suva City", "description": "Capital, markets, colonial architecture, museums, cultural heart, urban Pacific.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Navua River", "description": "Bamboo rafting, jungle gorge, waterfalls, village visits, adventure.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Beqa Lagoon", "description": "World-class diving, shark diving, soft coral capital, marine biodiversity.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Taveuni Waterfalls", "description": "Garden Island, waterfalls, diving, rainforest, 180th meridian, natural beauty.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Sigatoka Sand Dunes", "description": "Archaeological site, coastal dunes, hiking, ancient burial grounds, geology.", "image_url": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80", "difficulty": "Easy"},
        {"name": "Kula Eco Park", "description": "Wildlife park, native species, birds, iguanas, conservation, educational.", "image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Fiji Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Fiji experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Fiji Wine & Dine", "description": "Premium dining experience featuring Fiji cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Fiji Heritage Pass", "description": "Skip-the-line access to Fiji's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Fiji Adventure", "description": "Multi-day premium adventure package including unique Fiji activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Fiji Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - FRENCH POLYNESIA
    "french_polynesia": [
        {"name": "Bora Bora Lagoon", "description": "Overwater bungalows, turquoise lagoon, Mount Otemanu, luxury paradise, honeymooners' dream.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Moorea", "description": "Heart-shaped island, snorkeling with rays, pineapple plantations, volcanic peaks.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tahiti Papeete Market", "description": "Colorful market, tropical fruits, handicrafts, Polynesian culture, vibrant.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Fakarava Atoll", "description": "UNESCO biosphere, diving paradise, shark wall, pristine coral, Tuamotu atolls.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rangiroa", "description": "Second largest atoll in world, diving, dolphins, lagoon, blue water infinity.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Huahine", "description": "Garden of Eden, sacred eels, vanilla plantations, archaeological sites, authentic.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tikehau Pink Sand", "description": "Pink sand beaches, pearl farms, bird island, snorkeling, secluded paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Maupiti Island", "description": "Bora Bora's little sister, authentic, fewer tourists, lagoon, traditional life.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Raiatea Sacred Sites", "description": "Sacred island, marae temples, Polynesian culture, Mount Temehani, history.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Marquesas Islands", "description": "Remote volcanic islands, tikis, horses, dramatic landscapes, Paul Gauguin.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
        {"name": "Private French Polynesia Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic French Polynesia experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury French Polynesia Wine & Dine", "description": "Premium dining experience featuring French Polynesia cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP French Polynesia Heritage Pass", "description": "Skip-the-line access to French Polynesia's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate French Polynesia Adventure", "description": "Multi-day premium adventure package including unique French Polynesia activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret French Polynesia Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - COOK ISLANDS
    "cook_islands": [
        {"name": "Aitutaki Lagoon", "description": "World's most beautiful lagoon, turquoise water, One Foot Island, paradise.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Rarotonga", "description": "Main island, jungle interior, coastal road, snorkeling, Polynesian culture.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Muri Lagoon", "description": "Protected lagoon, kayaking, stand-up paddle, sandbars, water activities.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Cross Island Trek", "description": "Jungle hike across Rarotonga, Te Rua Manga needle, rainforest, adventure.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Avarua Town", "description": "Capital, markets, colonial architecture, cafes, cultural center, relaxed vibe.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Wigmore's Waterfall", "description": "Jungle waterfall, swimming hole, tropical setting, hiking trail, refreshing.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "Atiu Caves", "description": "Limestone caves, kopeka birds, underground streams, traditional island.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Punanga Nui Market", "description": "Saturday market, local produce, crafts, food, live music, community gathering.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Titikaveka Beach", "description": "Best beach for snorkeling, coral gardens, fish, peaceful, crystal clear.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Maire Nui Gardens", "description": "Tropical gardens, orchids, cultural shows, traditional plants, peaceful oasis.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Cook Islands Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Cook Islands experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Cook Islands Wine & Dine", "description": "Premium dining experience featuring Cook Islands cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Cook Islands Heritage Pass", "description": "Skip-the-line access to Cook Islands's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Cook Islands Adventure", "description": "Multi-day premium adventure package including unique Cook Islands activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Cook Islands Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - SAMOA
    "samoa": [
        {"name": "To Sua Ocean Trench", "description": "30m swimming hole connected to ocean, ladder descent, stunning natural pool.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Lalomanu Beach", "description": "White sand, turquoise water, palm trees, fales, paradise beach, snorkeling.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Piula Cave Pool", "description": "Freshwater pool in cave, swim through to ocean, unique, refreshing.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Savai'i Island", "description": "Larger island, lava fields, blowholes, traditional villages, less touristy.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Apia Market", "description": "Colorful produce, handicrafts, local culture, fresh fish, authentic Samoan life.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Togitogiga Waterfall", "description": "Waterfall with natural pools, jungle setting, swimming, picnic spot, popular.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "Alofaaga Blowholes", "description": "Ocean water shooting high through lava rocks, dramatic, natural spectacle.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Robert Louis Stevenson Museum", "description": "Author's former home, colonial mansion, history, panoramic views, cultural site.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Falealupo Canopy Walk", "description": "Treetop walkway, rainforest, bird watching, conservation, stunning views.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Manono Island", "description": "Car-free island, traditional life, beaches, walking trails, peaceful escape.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Samoa Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Samoa experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Samoa Wine & Dine", "description": "Premium dining experience featuring Samoa cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Samoa Heritage Pass", "description": "Skip-the-line access to Samoa's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Samoa Adventure", "description": "Multi-day premium adventure package including unique Samoa activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Samoa Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - VANUATU
    "vanuatu": [
        {"name": "Mount Yasur Volcano", "description": "Active volcano, glowing lava, night visits, accessible crater, thrilling experience.", "image_url": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Champagne Beach", "description": "Powder white sand, crystal water, underwater bubbles, pristine, paradise.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Blue Hole Espiritu Santo", "description": "Natural swimming hole, blue water, rope swing, jungle, refreshing.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "SS President Coolidge", "description": "Wreck diving, WWII luxury liner, accessible wreck, marine life, historic.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Millennium Cave", "description": "Jungle trek, cave exploration, canyon, waterfall, adventure, remote.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Hard"},
        {"name": "Port Vila Markets", "description": "Fresh produce, handicrafts, kava bars, local life, vibrant atmosphere.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mele Cascades", "description": "Waterfall with pools, jungle walk, swimming, family-friendly, popular.", "image_url": "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800&q=80", "difficulty": "Easy"},
        {"name": "Pentecost Land Diving", "description": "Ancient bungee jumping, vines, ritual, cultural experience, seasonal.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Hideaway Island", "description": "Marine sanctuary, snorkeling, underwater post office, coral, beach resort.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Tanna Culture", "description": "Custom villages, traditional life, kastom dances, authentic Melanesian culture.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Vanuatu Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Vanuatu experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Vanuatu Wine & Dine", "description": "Premium dining experience featuring Vanuatu cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Vanuatu Heritage Pass", "description": "Skip-the-line access to Vanuatu's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Vanuatu Adventure", "description": "Multi-day premium adventure package including unique Vanuatu activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Vanuatu Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
    
    # OCEANIA - TONGA
    "tonga": [
        {"name": "Swimming with Whales", "description": "Humpback whales, July-October, snorkeling with giants, bucket-list, ethical.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ha'amonga'a Maui Trilithon", "description": "Ancient stone structure, Stonehenge of Pacific, 1200 AD, historical mystery.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Mapu'a 'a Vaea Blowholes", "description": "Coastal blowholes, water shooting up, dramatic, natural phenomenon, popular.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Anahulu Cave", "description": "Limestone cave, swimming in freshwater pool, stalactites, accessible, atmospheric.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Easy"},
        {"name": "Nuku'alofa Capital", "description": "Royal palace, markets, churches, friendly locals, Polynesian culture, relaxed.", "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80", "difficulty": "Easy"},
        {"name": "Vava'u Islands", "description": "Sailing paradise, anchorages, coral gardens, caves, pristine, yachting.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ha'apai Beaches", "description": "Remote white sand beaches, crystal water, few tourists, authentic, peaceful.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ene'io Botanical Garden", "description": "Native plants, walking trails, birdwatching, conservation, educational.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Swallows Cave", "description": "Sea cave, snorkeling, light shafts, cliff jumping, dramatic, boat access.", "image_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Royal Tombs", "description": "Burial site of Tongan royalty, historical, cultural significance, red sand.", "image_url": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80", "difficulty": "Easy"},
        {"name": "Private Tonga Cultural Tour", "description": "Exclusive guided tour with local experts, visiting hidden cultural sites and authentic Tonga experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Luxury Tonga Wine & Dine", "description": "Premium dining experience featuring Tonga cuisine, wine tasting, and gourmet culinary journey.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "VIP Tonga Heritage Pass", "description": "Skip-the-line access to Tonga's top heritage sites, private guides, and exclusive experiences.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Easy"},
        {"name": "Ultimate Tonga Adventure", "description": "Multi-day premium adventure package including unique Tonga activities and hidden natural wonders.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Moderate"},
        {"name": "Secret Tonga Sanctuary", "description": "Off-the-beaten-path exclusive location, pristine natural beauty, accessible only through premium access.", "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "difficulty": "Hard"},
],
}

# Now add country image URLs for all countries
COUNTRY_IMAGES = {
    "france": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&q=80",
    "italy": "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80",
    "spain": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
    "uk": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
    "germany": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80",
    "greece": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    "norway": "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&q=80",
    "switzerland": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    "netherlands": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80",
    "portugal": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
    "japan": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    "china": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80",
    "thailand": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
    "india": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80",
    "uae": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
    "indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    "south_korea": "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80",
    "vietnam": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
    "malaysia": "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
    "egypt": "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80",
    "morocco": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
    "south_africa": "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800&q=80",
    "kenya": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    "tanzania": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80",
    "mauritius": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80",
    "seychelles": "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800&q=80",
    "botswana": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    "namibia": "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80",
    "tunisia": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80",
    "usa": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    "canada": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800&q=80",
    "mexico": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80",
    "brazil": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80",
    "peru": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
    "argentina": "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&q=80",
    "chile": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    "colombia": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80",
    "ecuador": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80",
    "costa_rica": "https://images.unsplash.com/photo-1552047155-090ba9b7f2e9?w=800&q=80",
    "australia": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80",
    "new_zealand": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
    "fiji": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    "french_polynesia": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    "cook_islands": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    "samoa": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    "vanuatu": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&q=80",
    "tonga": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
}

# Update countries with image URLs
for country in COUNTRIES_DATA:
    country["image_url"] = COUNTRY_IMAGES[country["country_id"]]


async def seed_database():
    """Seed database with 48 countries and their landmarks"""
    try:
        print("🌍 Starting global content expansion...")
        print(f"📊 Target: {len(COUNTRIES_DATA)} countries, ~{len(COUNTRIES_DATA) * 10} landmarks\n")
        
        # Clear existing data
        print("🗑️  Clearing existing data...")
        await db.countries.delete_many({})
        await db.landmarks.delete_many({})
        print("✅ Old data cleared\n")
        
        # Insert countries
        print("📍 Inserting countries...")
        await db.countries.insert_many(COUNTRIES_DATA)
        print(f"✅ {len(COUNTRIES_DATA)} countries added\n")
        
        # Insert landmarks with category distribution
        print("🏛️  Inserting landmarks...")
        total_landmarks = 0
        official_count = 0
        premium_count = 0
        
        for country_id, landmarks in LANDMARKS_DATA.items():
            # Get country info for required fields
            country_info = next(c for c in COUNTRIES_DATA if c["country_id"] == country_id)
            
            # First 10 landmarks are official (free), last 5 are premium
            for idx, landmark in enumerate(landmarks):
                landmark_doc = {
                    "landmark_id": f"{country_id}_{landmark['name'].lower().replace(' ', '_').replace('&', 'and')}",
                    "country_id": country_id,
                    "country_name": country_info["name"],
                    "continent": country_info["continent"],
                    "name": landmark["name"],
                    "description": landmark["description"],
                    "image_url": landmark["image_url"],
                    "images": [landmark["image_url"]],
                    "difficulty": landmark["difficulty"],
                    "category": "premium" if idx >= 10 else "official",
                    "points": 25 if idx >= 10 else 10,  # Premium landmarks worth more points
                    "upvotes": 0,
                    "created_by": None,
                    "created_at": datetime.now(timezone.utc),
                    "facts": [],
                    "best_time_to_visit": "Year-round",
                    "duration": "2-3 hours",
                    "latitude": None,
                    "longitude": None
                }
                await db.landmarks.insert_one(landmark_doc)
                total_landmarks += 1
                if idx >= 10:
                    premium_count += 1
                else:
                    official_count += 1
            
            print(f"  ✓ {country_id}: {len(landmarks)} landmarks")
        
        print(f"\n🎉 SUCCESS! Database seeded with:")
        print(f"   • {len(COUNTRIES_DATA)} countries")
        print(f"   • {total_landmarks} total landmarks")
        print(f"   • {official_count} free landmarks")
        print(f"   • {premium_count} premium landmarks")
        
        # Print continent distribution
        print(f"\n🌐 Continental Distribution:")
        continents = {}
        for country in COUNTRIES_DATA:
            continent = country["continent"]
            continents[continent] = continents.get(continent, 0) + 1
        for continent, count in sorted(continents.items()):
            print(f"   • {continent}: {count} countries")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(seed_database())
