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
}

# I'll create this as a separate file to keep it manageable - let me continue with a few more key countries
