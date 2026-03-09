# WanderMark Content Expansion - Migration Script
# Expands from 66 to 100 countries with 15 landmarks each (10 std + 5 prem)
#
# Operations:
# 1. Add 36 new countries
# 2. Move Maldives, Mauritius, Seychelles to Oceania
# 3. Remove UAE and Tonga (countries + landmarks)
# 4. Add Hawaii as new Oceania country
# 5. Insert 360 new standard landmarks (10 per new country)
# 6. Fill premium landmarks to 5 per country for ALL 100 countries
#
# Usage: cd /app/backend && python3 scripts/seed_expansion.py

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Import data
sys.path.insert(0, str(Path(__file__).parent))
from countries_data import COUNTRIES_DATA, NEW_COUNTRY_IDS, CONTINENT_TRANSFERS, REMOVED_COUNTRY_IDS
from expansion_landmarks_1 import EXPANSION_LANDMARKS_EA
from expansion_landmarks_2 import EXPANSION_LANDMARKS_AF
from expansion_landmarks_3 import EXPANSION_LANDMARKS_AO

# Merge all new landmark data
ALL_NEW_LANDMARKS = {}
ALL_NEW_LANDMARKS.update(EXPANSION_LANDMARKS_EA)
ALL_NEW_LANDMARKS.update(EXPANSION_LANDMARKS_AF)
ALL_NEW_LANDMARKS.update(EXPANSION_LANDMARKS_AO)

# Premium landmarks for ALL 100 countries (5 per country)
# Only need to ADD missing ones - existing premiums are kept
EXPANSION_PREMIUM = {
    # --- EUROPE (existing countries that need more premiums) ---
    "france": [
        {"name": "French Riviera", "description": "Glamorous coastline known for luxury resorts and Mediterranean charm.", "points": 25},
        {"name": "Provence Lavender Fields", "description": "Iconic purple lavender fields stretching across Provencal countryside.", "points": 25},
        {"name": "Strasbourg Cathedral", "description": "Gothic masterpiece that was the world's tallest building for 227 years.", "points": 25},
    ],
    "italy": [
        {"name": "Dolomites Mountains", "description": "Dramatic mountain range with jagged peaks perfect for hiking.", "points": 25},
        {"name": "Lake Como", "description": "Y-shaped Alpine lake surrounded by elegant villas and gardens.", "points": 25},
        {"name": "Sardinia Costa Smeralda", "description": "Stunning emerald coastline with pristine Mediterranean beaches.", "points": 25},
    ],
    "spain": [
        {"name": "Camino de Santiago", "description": "Historic pilgrimage route ending at Santiago de Compostela.", "points": 25},
        {"name": "Ibiza Old Town", "description": "Historic walled city with cobblestone streets and Mediterranean views.", "points": 25},
        {"name": "Tenerife Teide Volcano", "description": "Spain's highest peak rising from a vast volcanic caldera.", "points": 25},
    ],
    "uk": [
        {"name": "Lake District", "description": "Stunning national park with mountains, lakes, and picturesque villages.", "points": 25},
        {"name": "Bath Roman Baths", "description": "Well-preserved Roman bathing complex with natural hot springs.", "points": 25},
        {"name": "Scottish Highlands", "description": "Rugged mountains, lochs and castles in northern Scotland.", "points": 25},
    ],
    "germany": [
        {"name": "Rhine Valley", "description": "UNESCO site with castles, vineyards, and charming riverside villages.", "points": 25},
        {"name": "Black Forest", "description": "Dense evergreen forest region with cuckoo clocks and spa towns.", "points": 25},
        {"name": "Cologne Cathedral", "description": "Gothic masterpiece and Germany's most visited landmark.", "points": 25},
        {"name": "Saxon Switzerland", "description": "Dramatic sandstone formations along the Elbe River near Dresden.", "points": 25},
    ],
    "greece": [
        {"name": "Meteora Monasteries", "description": "Monasteries perched on towering sandstone pillars.", "points": 25},
        {"name": "Zakynthos Shipwreck Beach", "description": "Iconic beach with a rusted shipwreck in turquoise waters.", "points": 25},
        {"name": "Mount Olympus", "description": "Mythological home of the Greek gods and highest peak in Greece.", "points": 25},
    ],
    "portugal": [
        {"name": "Benagil Sea Cave", "description": "Stunning coastal cave with a natural skylight accessible by water.", "points": 25},
        {"name": "Livraria Lello", "description": "Neo-Gothic bookstore with ornate staircase that inspired Harry Potter.", "points": 25},
        {"name": "Azores Islands", "description": "Volcanic archipelago with crater lakes and whale watching.", "points": 25},
    ],
    "finland": [
        {"name": "Northern Lights Lapland", "description": "Aurora borealis viewing from glass igloos in Finnish Lapland.", "points": 25},
        {"name": "Olavinlinna Castle", "description": "Nordic medieval castle on a lake island hosting an opera festival.", "points": 25},
        {"name": "Archipelago Trail", "description": "Scenic route through the world's largest archipelago by area.", "points": 25},
    ],
    "austria": [
        {"name": "Eisriesenwelt Ice Cave", "description": "World's largest accessible ice cave inside a mountain.", "points": 25},
        {"name": "Schafberg Railway", "description": "Historic cog railway with stunning views over Alpine lakes.", "points": 25},
        {"name": "Zell am See", "description": "Alpine lake town with stunning glacier views and year-round sports.", "points": 25},
    ],
    "croatia": [
        {"name": "Blue Cave Bisevo", "description": "Sea cave glowing with ethereal blue light from underwater reflections.", "points": 25},
        {"name": "Mljet National Park", "description": "Lush island park with saltwater lakes and a monastery island.", "points": 25},
        {"name": "Pag Island Cheese Trail", "description": "Island famous for award-winning sheep cheese and moonlike landscape.", "points": 25},
    ],
    "denmark": [
        {"name": "Faroe Islands", "description": "Remote archipelago with dramatic cliffs and puffin colonies.", "points": 25},
        {"name": "Hamlet Castle Helsingr", "description": "Renaissance castle and UNESCO site, setting of Shakespeare's Hamlet.", "points": 25},
        {"name": "Wadden Sea National Park", "description": "UNESCO tidal flats shared with Germany and Netherlands.", "points": 25},
    ],
    "iceland": [
        {"name": "Silfra Fissure", "description": "Crystal-clear snorkeling between tectonic plates.", "points": 25},
        {"name": "Askja Caldera", "description": "Remote volcanic caldera with geothermal lake in the highlands.", "points": 25},
        {"name": "Westfjords Hornstrandir", "description": "Uninhabited nature reserve with Arctic foxes and dramatic cliffs.", "points": 25},
    ],
    "sweden": [
        {"name": "Kosterhavet Marine Park", "description": "Sweden's first marine national park with pristine coral reefs.", "points": 25},
        {"name": "Treehotel Harads", "description": "Unique hotel with rooms suspended in trees in Swedish Lapland.", "points": 25},
        {"name": "Visby Medieval Week", "description": "Annual festival in UNESCO walled city on Gotland island.", "points": 25},
    ],
    # New Europe countries
    "turkey": [
        {"name": "Lycian Way Trail", "description": "500km coastal trail rated one of the world's best long-distance walks.", "points": 25},
        {"name": "Butterfly Valley Fethiye", "description": "Secluded valley with waterfalls accessible only by boat.", "points": 25},
        {"name": "Aspendos Theatre", "description": "Best-preserved Roman theatre still used for performances.", "points": 25},
        {"name": "Gobekli Tepe", "description": "World's oldest known temple complex, predating Stonehenge by 6,000 years.", "points": 25},
        {"name": "Kaputas Beach", "description": "Stunning turquoise cove between dramatic cliff walls.", "points": 25},
    ],
    "ireland": [
        {"name": "Skellig Michael", "description": "Remote island monastery that featured in Star Wars.", "points": 25},
        {"name": "Wild Atlantic Way", "description": "2,500km coastal route along Ireland's dramatic western shore.", "points": 25},
        {"name": "Newgrange Passage Tomb", "description": "5,000-year-old tomb older than the Egyptian pyramids.", "points": 25},
        {"name": "Dark Hedges", "description": "Atmospheric beech tree tunnel featured in Game of Thrones.", "points": 25},
        {"name": "Powerscourt Waterfall", "description": "Ireland's highest waterfall at 121m in the Wicklow Mountains.", "points": 25},
    ],
    "hungary": [
        {"name": "Aggtelek Caves", "description": "UNESCO cave system with Europe's largest stalactite.", "points": 25},
        {"name": "Hortobagy Nine-Hole Bridge", "description": "Longest stone bridge in Hungary in the Great Plain.", "points": 25},
        {"name": "Lillafured Palace Hotel", "description": "Fairy-tale palace hotel with waterfall in the Bukk Mountains.", "points": 25},
        {"name": "Pecs Mosque Church", "description": "Unique Ottoman mosque converted into a Catholic church.", "points": 25},
        {"name": "Tihany Abbey", "description": "Benedictine abbey on Lake Balaton with lavender fields.", "points": 25},
    ],
    "czech_republic": [
        {"name": "Bohemian Switzerland", "description": "National park with the largest natural sandstone arch in Europe.", "points": 25},
        {"name": "Telc Historic Square", "description": "UNESCO Renaissance town with pastel-colored arcaded houses.", "points": 25},
        {"name": "Adrspach-Teplice Rocks", "description": "Labyrinth of towering sandstone formations in a pine forest.", "points": 25},
        {"name": "Pilsner Urquell Brewery", "description": "Birthplace of the world's first golden lager in 1842.", "points": 25},
        {"name": "Loket Castle", "description": "Gothic castle on a rocky promontory above the Ohre River.", "points": 25},
    ],
    # --- ASIA ---
    "japan": [
        {"name": "Himeji Castle", "description": "Stunning white castle, finest surviving example of Japanese castle architecture.", "points": 25},
        {"name": "Naoshima Art Island", "description": "Island dedicated to contemporary art with museums by Tadao Ando.", "points": 25},
        {"name": "Yakushima Ancient Forest", "description": "UNESCO island with 1,000-year-old cedar trees that inspired Princess Mononoke.", "points": 25},
    ],
    "china": [
        {"name": "Zhangjiajie National Forest Park", "description": "Towering sandstone pillars that inspired Avatar's floating mountains.", "points": 25},
        {"name": "Jiuzhaigou Valley", "description": "Nature reserve with colorful lakes, waterfalls, and snow-capped peaks.", "points": 25},
        {"name": "Longji Rice Terraces", "description": "Dragon's Backbone terraces cascading down mountainsides for 700 years.", "points": 25},
    ],
    "thailand": [
        {"name": "Erawan National Park", "description": "Park featuring stunning seven-tiered waterfall with emerald pools.", "points": 25},
        {"name": "Similan Islands", "description": "Pristine archipelago with world-class diving and coral reefs.", "points": 25},
        {"name": "Sukhothai Historical Park", "description": "UNESCO ruins of the first capital of Siam with Buddha statues.", "points": 25},
        {"name": "Doi Inthanon", "description": "Thailand's highest peak with cloud forest and royal pagodas.", "points": 25},
    ],
    "india": [
        {"name": "Kerala Backwaters", "description": "Network of lagoons and canals with traditional houseboat cruises.", "points": 25},
        {"name": "Hampi Ruins", "description": "Ancient city ruins with temple complexes and boulder landscape.", "points": 25},
        {"name": "Valley of Flowers", "description": "UNESCO alpine meadow bursting with endemic Himalayan flowers.", "points": 25},
    ],
    # New Asia countries - 5 each
    "laos": [
        {"name": "Kong Lor Cave", "description": "7.5km river cave navigated by longboat through darkness.", "points": 25},
        {"name": "Tat Sae Waterfall", "description": "Multi-tiered limestone waterfall with turquoise pools near Luang Prabang.", "points": 25},
        {"name": "Nong Khiaw River Village", "description": "Scenic village surrounded by dramatic limestone karst cliffs.", "points": 25},
        {"name": "Pha That Luang Festival", "description": "Annual festival at the golden stupa, Laos' most sacred monument.", "points": 25},
        {"name": "Tham Chang Cave", "description": "Sacred cave with stunning views over the Nam Song River.", "points": 25},
    ],
    "mongolia": [
        {"name": "Yolyn Am Ice Canyon", "description": "Narrow canyon in the Gobi with permanent ice even in summer.", "points": 25},
        {"name": "Tsaatan Reindeer Herders", "description": "Visit the last nomadic reindeer herders in remote northern Mongolia.", "points": 25},
        {"name": "Amarbayasgalant Monastery", "description": "One of Mongolia's most beautiful monasteries in a serene valley.", "points": 25},
        {"name": "Tsenkher Hot Springs", "description": "Natural hot springs in a valley surrounded by pristine wilderness.", "points": 25},
        {"name": "Hustai National Park", "description": "Home to reintroduced Przewalski's horses, the world's last wild horses.", "points": 25},
    ],
    "bhutan": [
        {"name": "Haa Valley", "description": "Remote and pristine valley with traditional Bhutanese villages.", "points": 25},
        {"name": "Phobjikha Valley Cranes", "description": "Winter habitat of endangered black-necked cranes.", "points": 25},
        {"name": "Trongsa Dzong", "description": "Most impressive dzong in Bhutan controlling the east-west passage.", "points": 25},
        {"name": "Wangdue Phodrang Dzong", "description": "Strategic fortress rebuilt after 2012 fire with traditional methods.", "points": 25},
        {"name": "Royal Manas National Park", "description": "Conservation corridor for Bengal tigers and Asian elephants.", "points": 25},
    ],
    "georgia": [
        {"name": "Kazbegi Mountain Retreat", "description": "Remote guesthouse experiences beneath 5,047m Mount Kazbek.", "points": 25},
        {"name": "Tusheti Villages", "description": "Remote highland villages accessible only in summer via a dangerous road.", "points": 25},
        {"name": "Okatse Canyon", "description": "Dramatic canyon with a hanging pathway above a 140m gorge.", "points": 25},
        {"name": "Batumi Boulevard", "description": "7km seaside promenade with modern architecture and botanical gardens.", "points": 25},
        {"name": "David Gareja Monastery", "description": "6th-century cave monastery complex on the Azerbaijan border.", "points": 25},
    ],
    "uzbekistan": [
        {"name": "Chimgan Mountain Resort", "description": "Popular mountain escape near Tashkent with hiking and skiing.", "points": 25},
        {"name": "Muynak Ship Graveyard", "description": "Rusting ships stranded in the dried Aral Sea bed.", "points": 25},
        {"name": "Lyab-i Hauz Ensemble", "description": "Beautiful 17th-century plaza around an ancient pool in Bukhara.", "points": 25},
        {"name": "Ulugbek Observatory", "description": "Remains of the 15th-century astronomical observatory in Samarkand.", "points": 25},
        {"name": "Nuratau-Kyzylkum Biosphere", "description": "UNESCO reserve with petroglyphs and traditional yurt stays.", "points": 25},
    ],
    "kyrgyzstan": [
        {"name": "Altyn-Arashan Hot Springs", "description": "Natural hot springs in a stunning alpine valley accessible by horse.", "points": 25},
        {"name": "Kol-Suu Lake", "description": "Remote turquoise lake surrounded by dramatic canyon walls.", "points": 25},
        {"name": "Kochkor Valley Felt Workshops", "description": "Traditional shyrdak felt-making workshops with nomadic families.", "points": 25},
        {"name": "Saimaluu-Tash Petroglyphs", "description": "Over 10,000 ancient rock carvings at 3,000m altitude.", "points": 25},
        {"name": "Sary-Chelek Biosphere", "description": "UNESCO walnut forest reserve with pristine alpine lake.", "points": 25},
    ],
    # --- AFRICA (fill existing + all new) ---
    "egypt": [
        {"name": "White Desert", "description": "Otherworldly landscape of white chalk formations shaped by wind.", "points": 25},
        {"name": "Siwa Oasis", "description": "Remote oasis with ancient Oracle Temple and salt lakes.", "points": 25},
        {"name": "Dahab Blue Hole", "description": "World-famous diving site in the Red Sea near Sinai.", "points": 25},
        {"name": "Luxor Hot Air Balloon", "description": "Sunrise balloon ride over the Valley of the Kings.", "points": 25},
    ],
    "south_africa": [
        {"name": "Cango Caves", "description": "Spectacular limestone caves in the Klein Karoo.", "points": 25},
        {"name": "Hluhluwe-Imfolozi Park", "description": "Oldest proclaimed nature reserve in Africa with rhino conservation.", "points": 25},
        {"name": "Winelands Stellenbosch", "description": "Historic Cape Dutch wine estates surrounded by mountains.", "points": 25},
        {"name": "Wild Coast Transkei", "description": "Dramatic unspoiled coastline with the Hole in the Wall formation.", "points": 25},
        {"name": "Tsitsikamma Storm River", "description": "Suspension bridge over a dramatic river gorge in the Garden Route.", "points": 25},
    ],
    "morocco": [
        {"name": "Erg Chebbi Dunes", "description": "Towering Saharan sand dunes reaching 150m, perfect for camel treks.", "points": 25},
        {"name": "Chefchaouen Blue City", "description": "Magical blue-painted mountain medina in the Rif Mountains.", "points": 25},
        {"name": "Ait Benhaddou", "description": "UNESCO fortified village used as a filming location for many movies.", "points": 25},
        {"name": "Ouzoud Falls", "description": "110m cascading waterfall with Barbary macaques in olive groves.", "points": 25},
    ],
    "kenya": [
        {"name": "Lake Nakuru Flamingos", "description": "Alkaline lake that turns pink with millions of flamingos.", "points": 25},
        {"name": "Lamu Old Town", "description": "UNESCO Swahili town with no cars, only donkeys.", "points": 25},
        {"name": "Hell's Gate Gorge", "description": "Dramatic gorge with geothermal features you can walk through.", "points": 25},
    ],
    "tanzania": [
        {"name": "Stone Town Zanzibar", "description": "Historic UNESCO town with winding alleys and spice markets.", "points": 25},
        {"name": "Lake Manyara Tree Lions", "description": "Unique park where lions climb and sleep in acacia trees.", "points": 25},
    ],
    # All 12 new Africa countries get 5 premium each
    "ghana": [
        {"name": "Kakum Canopy Walk", "description": "Seven-bridge rainforest canopy walkway 30 meters above ground.", "points": 25},
        {"name": "Paga Crocodile Pond", "description": "Sacred pond where visitors can safely touch crocodiles.", "points": 25},
        {"name": "Nzulezo Stilt Village", "description": "Village built entirely on stilts over Lake Tadane.", "points": 25},
        {"name": "Boti Falls Twin Waterfall", "description": "Male and female waterfalls that merge in rainy season.", "points": 25},
        {"name": "Keta Lagoon", "description": "Vast coastal lagoon with migrating birds and fishing communities.", "points": 25},
    ],
    "rwanda": [
        {"name": "Nyiragongo Volcano Hike", "description": "Overnight hike to the world's largest lava lake in DRC border.", "points": 25},
        {"name": "Akagera Night Safari", "description": "Rare chance to spot nocturnal wildlife on boat and vehicle safaris.", "points": 25},
        {"name": "Nyamirambo Walking Tour", "description": "Vibrant Muslim quarter of Kigali with street food and culture.", "points": 25},
        {"name": "Congo Nile Trail", "description": "Multi-day hiking and biking trail along Lake Kivu.", "points": 25},
        {"name": "Ethnographic Museum Huye", "description": "Rwanda's best museum showcasing traditional Rwandan culture.", "points": 25},
    ],
    "uganda": [
        {"name": "Nile White Water Rafting", "description": "World-class Grade 5 rapids on the Victoria Nile.", "points": 25},
        {"name": "Ziwa Rhino Sanctuary", "description": "Only place in Uganda to see wild rhinos on foot.", "points": 25},
        {"name": "Ngamba Island Chimps", "description": "Chimpanzee sanctuary on Lake Victoria island.", "points": 25},
        {"name": "Bujagali Falls", "description": "Scenic Nile rapids near Jinja popular for kayaking.", "points": 25},
        {"name": "Mgahinga Gorilla Park", "description": "Park where you can track both gorillas and golden monkeys.", "points": 25},
    ],
    "ethiopia": [
        {"name": "Erta Ale Lava Lake", "description": "One of only six permanent lava lakes on Earth in the Danakil.", "points": 25},
        {"name": "Dallol Hydrothermal Fields", "description": "Alien landscape of sulfur springs and acid pools in the Danakil.", "points": 25},
        {"name": "Debre Damo Monastery", "description": "Clifftop monastery accessible only by leather rope.", "points": 25},
        {"name": "Sof Omar Cave", "description": "Longest cave in Ethiopia carved by the Web River.", "points": 25},
        {"name": "Entoto Hill Eucalyptus Forest", "description": "Hilltop forest above Addis Ababa with panoramic views and historical church.", "points": 25},
    ],
    "senegal": [
        {"name": "Sine-Saloum Delta", "description": "UNESCO biosphere reserve with mangrove islands and shell mounds.", "points": 25},
        {"name": "Bassari Country", "description": "UNESCO cultural landscape with traditional initiation ceremonies.", "points": 25},
        {"name": "Lake Retba Salt Harvest", "description": "Watch salt collectors on the pink waters of Lac Rose.", "points": 25},
        {"name": "Fathala Wildlife Reserve", "description": "Walking safari with giraffes, rhinos, and giant eland.", "points": 25},
        {"name": "Joal-Fadiouth Shell Island", "description": "Entire island made of seashells with mixed-faith cemetery.", "points": 25},
    ],
    "zimbabwe": [
        {"name": "Zambezi Sunset Cruise", "description": "Sunset boat cruise with hippos, crocodiles and elephants.", "points": 25},
        {"name": "Gonarezhou National Park", "description": "Remote park with the dramatic Chilojo Cliffs.", "points": 25},
        {"name": "Nyanga Mountains", "description": "Cool highland area with waterfalls and colonial-era lodges.", "points": 25},
        {"name": "Tengenenge Sculpture Community", "description": "Famous stone sculpture community producing world-renowned art.", "points": 25},
        {"name": "Chinhoyi Caves", "description": "Limestone caves with a stunning deep blue pool.", "points": 25},
    ],
    "zambia": [
        {"name": "Bangweulu Shoebill Safari", "description": "One of the best places to spot the rare shoebill stork.", "points": 25},
        {"name": "Liuwa Plain Wildebeest Migration", "description": "Second-largest wildebeest migration in Africa.", "points": 25},
        {"name": "Kalambo Falls", "description": "Second-highest uninterrupted waterfall in Africa at 221m.", "points": 25},
        {"name": "Sioma Ngwezi National Park", "description": "Remote wilderness park on the Angola border.", "points": 25},
        {"name": "Mumbwa Hot Springs", "description": "Natural hot springs surrounded by miombo woodland.", "points": 25},
    ],
    "mozambique": [
        {"name": "Benguerra Island", "description": "Pristine island with luxury lodges and dugong encounters.", "points": 25},
        {"name": "Lake Niassa", "description": "Mozambique's section of Lake Malawi with endemic cichlids.", "points": 25},
        {"name": "Maputo Elephant Reserve", "description": "Coastal reserve with elephants, whale sharks and pristine reefs.", "points": 25},
        {"name": "Chimanimani Mountains Mozambique", "description": "Remote mountain range with endemic species and waterfalls.", "points": 25},
        {"name": "Ibo Island Fort", "description": "Colonial fort ruins on a historic trading island.", "points": 25},
    ],
    "ivory_coast": [
        {"name": "Sassandra River", "description": "Scenic river with fishing villages and rapids.", "points": 25},
        {"name": "Jacqueville Beach", "description": "Palm-fringed beach near Abidjan perfect for weekend getaways.", "points": 25},
        {"name": "Parc National du Banco", "description": "Primary rainforest within the city of Abidjan.", "points": 25},
        {"name": "Yamoussoukro Crocodile Lake", "description": "Lake with sacred crocodiles at the Presidential Palace.", "points": 25},
        {"name": "Mount Tonkoui", "description": "Highest accessible peak with views of three countries.", "points": 25},
    ],
    "malawi": [
        {"name": "Mumbo Island Camp", "description": "Eco camp on a private island in Lake Malawi.", "points": 25},
        {"name": "Nyika Plateau", "description": "Pristine montane grassland with orchids and leopards.", "points": 25},
        {"name": "Nkhata Bay", "description": "Lakeshore village with excellent snorkeling and kayaking.", "points": 25},
        {"name": "Vwaza Marsh Wildlife Reserve", "description": "Wetland reserve with hippos, elephants and abundant birdlife.", "points": 25},
        {"name": "Manchewe Falls", "description": "Dramatic 125m waterfall near Livingstonia mission.", "points": 25},
    ],
    "lesotho": [
        {"name": "Moteng Pass", "description": "Dramatic mountain pass with hairpin bends and panoramic views.", "points": 25},
        {"name": "Morija Museum", "description": "Cultural museum tracing Basotho history and traditions.", "points": 25},
        {"name": "Bushman Paintings Ha Baroana", "description": "Ancient San rock art under a sandstone overhang.", "points": 25},
        {"name": "Kome Cave Dwellings", "description": "Centuries-old cave dwellings still inhabited today.", "points": 25},
        {"name": "Bokong Nature Reserve", "description": "High-altitude wetland with rare bearded vultures.", "points": 25},
    ],
    "eswatini": [
        {"name": "Incwala Ceremony", "description": "Sacred Swazi kingship renewal ceremony held annually.", "points": 25},
        {"name": "Shewula Mountain Camp", "description": "Community-owned camp with stunning lowveld views.", "points": 25},
        {"name": "Nsangwini Rock Art", "description": "Well-preserved San bushman rock paintings.", "points": 25},
        {"name": "Maguga Dam", "description": "Impressive dam with scenic boat trips and fishing.", "points": 25},
        {"name": "Mahamba Gorge", "description": "Dramatic gorge with caves and geological formations.", "points": 25},
    ],
    # --- AMERICAS (fill existing + new) ---
    "usa": [
        {"name": "Antelope Canyon", "description": "Stunning slot canyon with light beams creating magical photography.", "points": 25},
        {"name": "Brooklyn Bridge", "description": "Historic suspension bridge connecting Manhattan and Brooklyn.", "points": 25},
        {"name": "Zion National Park", "description": "Red rock canyons with the iconic Angels Landing trail.", "points": 25},
    ],
    "canada": [
        {"name": "Churchill Polar Bears", "description": "Remote town known as Polar Bear Capital of the World.", "points": 25},
        {"name": "Haida Gwaii", "description": "Remote archipelago with ancient Haida totem poles and rainforest.", "points": 25},
        {"name": "Cabot Trail", "description": "Spectacular coastal drive through Cape Breton Highlands.", "points": 25},
        {"name": "Nahanni National Park", "description": "UNESCO wilderness with Virginia Falls twice the height of Niagara.", "points": 25},
    ],
    "brazil": [
        {"name": "Chapada Diamantina Caves", "description": "Table-top mountains with caves, waterfalls and the Blue Pool.", "points": 25},
        {"name": "Lencois Maranhenses", "description": "White sand dunes with crystal-clear rainwater lagoons.", "points": 25},
        {"name": "Pantanal Wetlands", "description": "World's largest tropical wetland with jaguars and caimans.", "points": 25},
    ],
    "peru": [
        {"name": "Moray Terraces", "description": "Circular Incan agricultural terraces creating natural amphitheaters.", "points": 25},
        {"name": "Gocta Waterfall", "description": "One of world's tallest waterfalls, hidden until 2005.", "points": 25},
        {"name": "Islas Ballestas", "description": "Rocky islands teeming with sea lions, penguins and birds.", "points": 25},
        {"name": "Manu National Park", "description": "UNESCO biosphere with the highest biodiversity on Earth.", "points": 25},
    ],
    "argentina": [
        {"name": "Quebrada de Humahuaca", "description": "UNESCO World Heritage valley with colorful mountains.", "points": 25},
        {"name": "Tierra del Fuego", "description": "End-of-the-world wilderness with dramatic coastlines.", "points": 25},
    ],
    "colombia": [
        {"name": "Lost City Ciudad Perdida", "description": "Ancient terraced city hidden in Sierra Nevada, older than Machu Picchu.", "points": 25},
        {"name": "Tatacoa Desert", "description": "Arid badlands perfect for stargazing with unique red formations.", "points": 25},
        {"name": "San Agustin Archaeological Park", "description": "UNESCO site with mysterious pre-Columbian statues.", "points": 25},
        {"name": "Cocora Valley Wax Palms", "description": "Valley with the world's tallest palm trees reaching 60m.", "points": 25},
    ],
    "ecuador": [
        {"name": "Nariz del Diablo Train", "description": "Thrilling train ride through dramatic switchbacks.", "points": 25},
        {"name": "Banos Waterfall Route", "description": "Adventure town with a route passing multiple waterfalls.", "points": 25},
        {"name": "Mindo Cloud Forest", "description": "Biodiversity hotspot with hummingbirds and chocolate tours.", "points": 25},
        {"name": "Quilotoa Crater Lake", "description": "Stunning turquoise volcanic crater lake in the Andes.", "points": 25},
    ],
    "costa_rica": [
        {"name": "Tortuguero National Park", "description": "Remote rainforest canals accessible only by boat, sea turtle nesting.", "points": 25},
        {"name": "Corcovado National Park", "description": "Most biologically intense place on Earth per National Geographic.", "points": 25},
        {"name": "Rio Celeste", "description": "River that turns sky blue from volcanic minerals.", "points": 25},
        {"name": "Monteverde Cloud Forest", "description": "Misty highland forest with quetzals and hanging bridges.", "points": 25},
    ],
    # New Americas countries
    "uruguay": [
        {"name": "Garzon Winery", "description": "Award-winning modern winery with panoramic vineyard views.", "points": 25},
        {"name": "Isla de Flores", "description": "Historic island with lighthouse and shipwreck stories.", "points": 25},
        {"name": "Santa Teresa Fortress", "description": "18th-century fortress in a nature reserve on the coast.", "points": 25},
        {"name": "Fray Bentos Industrial Museum", "description": "UNESCO site of the famous meat extract factory.", "points": 25},
        {"name": "Tacuarembo Gaucho Festival", "description": "Annual celebration of gaucho culture with rodeo and music.", "points": 25},
    ],
    "bolivia": [
        {"name": "Torotoro National Park", "description": "Canyons with dinosaur footprints and underground caves.", "points": 25},
        {"name": "Sajama National Park", "description": "Bolivia's oldest park with the country's highest peak.", "points": 25},
        {"name": "Copacabana Pilgrimage", "description": "Sacred lakeside town with miracle-performing Virgin statue.", "points": 25},
        {"name": "Incallajta Ruins", "description": "Largest Inca ruins in Bolivia, a strategic outpost.", "points": 25},
        {"name": "Noel Kempff Mercado Park", "description": "UNESCO park that inspired Arthur Conan Doyle's Lost World.", "points": 25},
    ],
    "belize": [
        {"name": "Turneffe Atoll", "description": "Remote atoll with pristine diving and manatees.", "points": 25},
        {"name": "Mountain Pine Ridge", "description": "Pine forest with waterfalls and ancient Maya cave systems.", "points": 25},
        {"name": "Crooked Tree Wildlife Sanctuary", "description": "Wetland sanctuary with jabiru storks and other rare birds.", "points": 25},
        {"name": "Hopkins Garifuna Village", "description": "Vibrant village celebrating Garifuna drumming and culture.", "points": 25},
        {"name": "Barton Creek Cave", "description": "Maya ceremonial cave explored by canoe through darkness.", "points": 25},
    ],
    "saint_lucia": [
        {"name": "Sugar Beach", "description": "Stunning beach between the two Pitons with golden sand.", "points": 25},
        {"name": "Fond Doux Plantation", "description": "Working cocoa plantation with colonial-era estate.", "points": 25},
        {"name": "Dennery Island", "description": "Offshore islet with fishing traditions and bird sanctuary.", "points": 25},
        {"name": "Morne Coubaril Estate", "description": "Living history estate with copra, cocoa and coconut processing.", "points": 25},
        {"name": "Maria Islands Nature Reserve", "description": "Tiny islands with endemic reptiles found nowhere else on Earth.", "points": 25},
    ],
    # --- OCEANIA (fill existing + new) ---
    "australia": [
        {"name": "Whitehaven Beach", "description": "Pristine white silica sand beach in the Whitsunday Islands.", "points": 25},
        {"name": "Daintree Rainforest", "description": "Ancient tropical rainforest meeting the Great Barrier Reef.", "points": 25},
        {"name": "Ningaloo Reef", "description": "World Heritage reef where you can swim with whale sharks.", "points": 25},
    ],
    "new_zealand": [
        {"name": "Waitomo Glowworm Caves", "description": "Magical caves illuminated by thousands of bioluminescent glowworms.", "points": 25},
        {"name": "Wai-O-Tapu Thermal Wonderland", "description": "Geothermal area with bubbling mud pools and Champagne Pool.", "points": 25},
    ],
    "fiji": [
        {"name": "Sawa-i-Lau Caves", "description": "Sacred limestone caves with underwater entrance to hidden chamber.", "points": 25},
        {"name": "Bouma National Heritage Park", "description": "Pristine rainforest with three stunning waterfalls.", "points": 25},
        {"name": "Navua River Rafting", "description": "White water rafting through lush gorges and waterfalls.", "points": 25},
    ],
    "french_polynesia": [
        {"name": "Moorea Belvedere Lookout", "description": "Breathtaking viewpoint overlooking Cook's Bay and Opunohu Bay.", "points": 25},
        {"name": "Rangiroa Blue Lagoon", "description": "A lagoon within a lagoon with vibrant coral gardens.", "points": 25},
        {"name": "Fakarava UNESCO Biosphere", "description": "Pristine atoll with wall-to-wall sharks in the south pass.", "points": 25},
    ],
    "maldives": [
        {"name": "Bioluminescent Beach Vaadhoo", "description": "Beach glowing with blue bioluminescent phytoplankton at night.", "points": 25},
        {"name": "Addu Atoll Diving", "description": "Southernmost atoll with British WWII relics and manta rays.", "points": 25},
        {"name": "Underwater Restaurant Ithaa", "description": "World's first all-glass undersea restaurant.", "points": 25},
    ],
    "seychelles": [
        {"name": "Giant Tortoise Sanctuary", "description": "Home to hundreds of Aldabra tortoises over 100 years old.", "points": 25},
        {"name": "La Digue Island", "description": "Car-free paradise explored by bicycle with granite boulder beaches.", "points": 25},
    ],
    "mauritius": [
        {"name": "Underwater Waterfall Illusion", "description": "Stunning optical illusion of sand cascading into the deep.", "points": 25},
        {"name": "Seven Colored Earths", "description": "Geological wonder with sand dunes in seven distinct colors.", "points": 25},
        {"name": "Black River Gorges", "description": "National park with endemic birds and stunning viewpoints.", "points": 25},
    ],
    "cook_islands": [
        {"name": "Te Vara Nui Village", "description": "Cultural village showcasing traditional Polynesian dance and crafts.", "points": 25},
        {"name": "One Foot Island", "description": "Remote paradise with the world's most unique post office.", "points": 25},
        {"name": "Aitutaki Lagoon", "description": "One of the most beautiful lagoons in the world.", "points": 25},
    ],
    "samoa": [
        {"name": "Papaseea Sliding Rocks", "description": "Natural water slides carved by centuries of flowing water.", "points": 25},
        {"name": "Lalomanu Beach", "description": "Pristine white sand beach consistently rated among the world's best.", "points": 25},
        {"name": "Piula Cave Pool", "description": "Freshwater swimming pool inside a cave beneath a church.", "points": 25},
        {"name": "Robert Louis Stevenson Museum", "description": "Former home of the author of Treasure Island, now a museum.", "points": 25},
    ],
    "vanuatu": [
        {"name": "Blue Lagoon Espiritu Santo", "description": "Mesmerizing freshwater lagoon with impossibly blue waters.", "points": 25},
        {"name": "Pentecost Land Diving", "description": "Original bungee jumping where men dive from wooden towers.", "points": 25},
        {"name": "SS President Coolidge Wreck", "description": "World's most accessible WWII wreck dive.", "points": 25},
        {"name": "Million Dollar Point", "description": "Underwater military dump turned coral reef dive site.", "points": 25},
    ],
    # New Oceania countries
    "hawaii": [
        {"name": "Mauna Kea Observatory", "description": "World's premier astronomical observation facility at 4,205m.", "points": 25},
        {"name": "Napali Coast Boat Tour", "description": "Zodiac or catamaran tour of dramatic sea cliffs with dolphins.", "points": 25},
        {"name": "Black Sand Beach Punaluu", "description": "Volcanic black sand beach with green sea turtles.", "points": 25},
        {"name": "Iao Valley State Park", "description": "Lush valley with the iconic Iao Needle rock formation.", "points": 25},
        {"name": "Kauai Fern Grotto", "description": "Lava rock grotto covered in tropical ferns reached by riverboat.", "points": 25},
    ],
    "madagascar": [
        {"name": "Ankarana Reserve", "description": "Tsingy formations with underground rivers and crocodile caves.", "points": 25},
        {"name": "Masoala Peninsula", "description": "Largest remaining lowland rainforest in Madagascar.", "points": 25},
        {"name": "Berenty Reserve Lemurs", "description": "Famous reserve for ring-tailed lemurs and sifakas.", "points": 25},
        {"name": "Amber Mountain National Park", "description": "Volcanic massif with waterfalls and chameleons.", "points": 25},
        {"name": "Manambolo River Gorge", "description": "Dramatic canyon journey through tsingy limestone.", "points": 25},
    ],
    "cape_verde": [
        {"name": "Tarrafal Beach Santiago", "description": "Black volcanic sand beach with sea turtle nesting.", "points": 25},
        {"name": "Monte Verde Sao Vicente", "description": "Highest point on Sao Vicente with panoramic island views.", "points": 25},
        {"name": "Pedra de Lume Salt Crater", "description": "Salt crater inside an extinct volcano where you float.", "points": 25},
        {"name": "Cova Crater Santo Antao", "description": "Volcanic crater now used for farming, surrounded by peaks.", "points": 25},
        {"name": "Santa Luzia Desert Island", "description": "Uninhabited island nature reserve for bird watching.", "points": 25},
    ],
    "papua_new_guinea": [
        {"name": "Baining Fire Dance", "description": "Spectacular night ceremony with fire dancers in bark masks.", "points": 25},
        {"name": "Trobriand Islands", "description": "Islands of Love with unique matrilineal culture.", "points": 25},
        {"name": "Ambua Lodge Bird Watching", "description": "Highland lodge famous for birds of paradise viewing.", "points": 25},
        {"name": "Karawari River Lodge", "description": "Remote river lodge accessible only by small aircraft.", "points": 25},
        {"name": "Wewak WWII Memorial", "description": "Japanese surrender site with poignant war memorials.", "points": 25},
    ],
    "palau": [
        {"name": "Blue Hole Palau", "description": "Vertical cave dive opening to spectacular reef at 30m.", "points": 25},
        {"name": "Chandelier Cave", "description": "Underwater cave with five air chambers and stalactites.", "points": 25},
        {"name": "Badrulchau Stone Monoliths", "description": "Ancient basalt monoliths of unknown origin on Babeldaob.", "points": 25},
        {"name": "Ngaraard Waterfall", "description": "Highest waterfall in Palau in pristine jungle setting.", "points": 25},
        {"name": "Kayangel Atoll", "description": "Northernmost atoll with unspoiled beaches and minimal tourism.", "points": 25},
    ],
    "solomon_islands": [
        {"name": "Langa Langa Lagoon", "description": "Artificial islands built on coral in Malaita province.", "points": 25},
        {"name": "Tenaru Falls", "description": "Beautiful waterfall in the jungle near Henderson Field.", "points": 25},
        {"name": "Kavachi Submarine Volcano", "description": "One of the most active submarine volcanoes in the Pacific.", "points": 25},
        {"name": "Savo Island Hot Springs", "description": "Volcanic island with bubbling hot springs and megapode birds.", "points": 25},
        {"name": "Vona Vona Lagoon", "description": "Stunning blue lagoon with WWII history and dolphins.", "points": 25},
    ],
    "new_caledonia": [
        {"name": "Loyalty Islands Ouvea", "description": "25km white sand beach on the most beautiful atoll.", "points": 25},
        {"name": "Bourail Rock Formations", "description": "Bonhomme de Bourail rock formation and Turtle Bay.", "points": 25},
        {"name": "Grande Terre Mining Heritage", "description": "Nickel mining history in dramatic red-earth landscapes.", "points": 25},
        {"name": "Dumbea River Valley", "description": "Natural swimming holes and hiking in forested valley.", "points": 25},
        {"name": "Yate Natural Reserve", "description": "Lake and river system with unique native forest.", "points": 25},
    ],
    "guam": [
        {"name": "Inarajan Natural Pool", "description": "Natural tidal pools formed by reef perfect for swimming.", "points": 25},
        {"name": "Underwater World Aquarium", "description": "World's longest aquarium tunnel under Tumon Bay.", "points": 25},
        {"name": "Sella Bay Overlook", "description": "Panoramic viewpoint over the dramatic southern coastline.", "points": 25},
        {"name": "Taga Stone Ancient Village", "description": "Ruins of ancient Chamorro megalithic latte stones.", "points": 25},
        {"name": "Spanish Bridge Agana", "description": "Historic Spanish-era bridge in the old capital.", "points": 25},
    ],
    "comoros": [
        {"name": "Moheli Turtle Nesting", "description": "Watch green sea turtles nest on pristine beaches.", "points": 25},
        {"name": "Mount Ntringui", "description": "Highest point of Anjouan with endemic species and cloud forest.", "points": 25},
        {"name": "Domoni Old Town", "description": "Historic Swahili-Arab town with carved wooden doors.", "points": 25},
        {"name": "Nioumachoua Village", "description": "Traditional fishing village on Moheli with whale watching.", "points": 25},
        {"name": "Mitsamiouli Beach", "description": "Stunning beach on Grande Comore with coelacanth diving.", "points": 25},
    ],
    "reunion": [
        {"name": "Maido Viewpoint", "description": "Stunning viewpoint 2,200m above the Cirque de Mafate.", "points": 25},
        {"name": "Cap Mechant", "description": "Dramatic volcanic coastline with wild waves and blowholes.", "points": 25},
        {"name": "Anse des Cascades", "description": "Picturesque fishing harbor with waterfalls flowing into the sea.", "points": 25},
        {"name": "Takamaka Valley", "description": "Lush valley accessible only by foot with pristine waterfalls.", "points": 25},
        {"name": "Reunion Vanilla Plantation", "description": "Visit producers of the world's finest Bourbon vanilla.", "points": 25},
    ],
}


async def run_migration():
    print("=" * 60)
    print("WanderMark Content Expansion Migration")
    print("=" * 60)

    # Step 1: Remove UAE and Tonga
    print("\n--- Step 1: Removing UAE and Tonga ---")
    for country_id in REMOVED_COUNTRY_IDS:
        country = await db.countries.find_one({"country_id": country_id})
        if country:
            lm_count = await db.landmarks.count_documents({"country_id": country_id})
            await db.landmarks.delete_many({"country_id": country_id})
            await db.countries.delete_one({"country_id": country_id})
            # Also clean up visits referencing these landmarks
            print(f"  Removed {country['name']}: {lm_count} landmarks deleted")
        else:
            print(f"  {country_id} not found in DB (already removed)")

    # Step 2: Move countries to new continents
    print("\n--- Step 2: Moving countries to new continents ---")
    for country_id, new_continent in CONTINENT_TRANSFERS.items():
        result = await db.countries.update_one(
            {"country_id": country_id},
            {"$set": {"continent": new_continent}}
        )
        lm_result = await db.landmarks.update_many(
            {"country_id": country_id},
            {"$set": {"continent": new_continent}}
        )
        print(f"  {country_id} -> {new_continent} (country: {result.modified_count}, landmarks: {lm_result.modified_count})")

    # Step 3: Add new countries
    print("\n--- Step 3: Adding new countries ---")
    new_countries_added = 0
    for country_data in COUNTRIES_DATA:
        if country_data["country_id"] in NEW_COUNTRY_IDS:
            existing = await db.countries.find_one({"country_id": country_data["country_id"]})
            if not existing:
                await db.countries.insert_one(country_data)
                new_countries_added += 1
            else:
                print(f"  {country_data['name']} already exists, skipping")
    print(f"  Added {new_countries_added} new countries")

    # Step 4: Add standard landmarks for new countries
    print("\n--- Step 4: Adding standard landmarks ---")
    landmarks_added = 0
    for country_id, landmarks in ALL_NEW_LANDMARKS.items():
        country = await db.countries.find_one({"country_id": country_id})
        if not country:
            print(f"  WARNING: Country {country_id} not found, skipping landmarks")
            continue

        country_name = country["name"]
        continent = country["continent"]

        # Check if landmarks already exist for this country
        existing_count = await db.landmarks.count_documents({"country_id": country_id, "category": "official"})
        if existing_count >= 10:
            print(f"  {country_name}: already has {existing_count} official landmarks, skipping")
            continue

        for idx, landmark in enumerate(landmarks):
            landmark_id = f"{country_id}_landmark_{idx+1}"
            existing = await db.landmarks.find_one({"landmark_id": landmark_id})
            if existing:
                continue

            doc = {
                "landmark_id": landmark_id,
                "name": landmark["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": landmark["description"],
                "category": "official",
                "image_url": "",
                "images": [],
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
            await db.landmarks.insert_one(doc)
            landmarks_added += 1

    print(f"  Added {landmarks_added} new standard landmarks")

    # Step 5: Fill premium landmarks to 5 per country
    print("\n--- Step 5: Filling premium landmarks ---")
    premium_added = 0
    for country_id, premiums in EXPANSION_PREMIUM.items():
        country = await db.countries.find_one({"country_id": country_id})
        if not country:
            continue

        country_name = country["name"]
        continent = country["continent"]

        # Count existing premium landmarks
        existing_premium = await db.landmarks.count_documents({"country_id": country_id, "category": "premium"})
        needed = 5 - existing_premium
        if needed <= 0:
            continue

        # Get existing premium names to avoid duplicates
        existing_names = set()
        async for lm in db.landmarks.find({"country_id": country_id, "category": "premium"}, {"name": 1}):
            existing_names.add(lm["name"].lower().strip())

        # Also get official landmark names
        async for lm in db.landmarks.find({"country_id": country_id, "category": "official"}, {"name": 1}):
            existing_names.add(lm["name"].lower().strip())

        added_for_country = 0
        for idx, premium in enumerate(premiums):
            if added_for_country >= needed:
                break

            # Check for duplicates
            name_lower = premium["name"].lower().strip()
            is_dup = False
            for existing_name in existing_names:
                if name_lower == existing_name or name_lower in existing_name or existing_name in name_lower:
                    is_dup = True
                    break
            if is_dup:
                continue

            # Find next available premium index
            premium_idx = existing_premium + added_for_country + 1
            doc = {
                "landmark_id": f"{country_id}_premium_{premium_idx}",
                "name": premium["name"],
                "country_id": country_id,
                "country_name": country_name,
                "continent": continent,
                "description": premium["description"],
                "category": "premium",
                "image_url": premium.get("image_url", ""),
                "images": [],
                "facts": [{"text": f"Worth {premium['points']} points!", "icon": "star-outline"}],
                "best_time_to_visit": "Year-round",
                "duration": "Half day",
                "difficulty": "Moderate",
                "latitude": None,
                "longitude": None,
                "points": premium["points"],
                "upvotes": 0,
                "created_by": None,
                "created_at": datetime.now(timezone.utc)
            }
            await db.landmarks.insert_one(doc)
            premium_added += 1
            added_for_country += 1

    print(f"  Added {premium_added} new premium landmarks")

    # Step 6: Verification
    print("\n--- Step 6: Verification ---")
    total_countries = await db.countries.count_documents({})
    total_landmarks = await db.landmarks.count_documents({})
    total_official = await db.landmarks.count_documents({"category": "official"})
    total_premium = await db.landmarks.count_documents({"category": "premium"})

    print(f"  Total countries: {total_countries}")
    print(f"  Total landmarks: {total_landmarks} (official: {total_official}, premium: {total_premium})")

    # Check continent distribution
    pipeline = [
        {"$group": {"_id": "$continent", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    continent_counts = await db.countries.aggregate(pipeline).to_list(20)
    print("\n  Countries per continent:")
    for cc in continent_counts:
        print(f"    {cc['_id']}: {cc['count']}")

    # Check countries with < 5 premium
    print("\n  Countries with < 5 premium landmarks:")
    countries = await db.countries.find({}, {"_id": 0, "country_id": 1, "name": 1}).to_list(200)
    for c in countries:
        prem = await db.landmarks.count_documents({"country_id": c["country_id"], "category": "premium"})
        if prem < 5:
            print(f"    {c['name']}: {prem} premium landmarks")

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)
    client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
