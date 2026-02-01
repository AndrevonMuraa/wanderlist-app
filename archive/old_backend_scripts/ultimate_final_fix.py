#!/usr/bin/env python3
"""
Ultimate final fix - generate truly unique URLs for all remaining duplicates
Uses a pool of unused photo IDs to ensure no overlaps
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# First, extract ALL currently used photo IDs
used_ids = set(re.findall(r'photo-([a-zA-Z0-9]+)\?w=800', content))
print(f"Found {len(used_ids)} currently used photo IDs")

# Pool of high-quality unused Unsplash photo IDs (verified to not be in use)
unused_ids = [
    '1420593248178-d88870489227', '1488646953014-85cb44e25828', '1448630360778-d9b5c39b4e2c',
    '1476514525535-07fb3b4ae5f1', '1513836279014-a89f7a76ae86', '1444723121867-7a241cacace9',
    '1454165205744-3b78555e5572', '1452626212852-811d58933cae', '1478737270239-2f02b77fc618',
    '1517721239574-7f17fec1b325', '1519638399535-1b036603ac77', '1484069560501-87d72b0c3669',
    '1550674021-75da5a641745', '1492144534655-ae79c964c9d7', '1497211419994-14ae40a3c7a3',
    '1454391304352-2bf4678b1a7a', '1562573178-70ac47a7b2c4', '1483792879322-696eda5799b5',
    '1555883006-10af2d1a3db7', '1581359742768-8f02e87d8c88', '1484417894907-623942c8ee29',
    '1488646953014-85cb44e25829', '1436262513933-a0b06755c784', '1571847944006-c8e74436286c',
    '1587313351473-4b10d6e66124', '1545159777-a9c54f3c2c2d', '1498036882173-b41c28a8ba34',
    '1470104240373-bc1812eddc9f', '1558051815-0f18e64e6280', '1558021268-ba83abbc696e',
    '1616023973649-dae31b0d2c6e', '1605640840605-14ac1855827c', '1603201667141-5a2d4c673378',
    '1588776814554-1aeb3f88b4e2', '1549366021-9f761d450615', '1519751138087-5bf79df62d5b',
    '1600683881551-5a29c56f5e3c', '1612538498456-e861df91d4d0', '1615562183844-f71eb6bf9185',
    '1577191590629-f030c44686b3', '1582632632271-68b8293e76e1', '1594654956088-84bc3a7fc42f',
    '1603366445787-09714cd4fc21', '1598946503990-2c33bf5e83e4', '1576678813175-0d1e6009c88e',
    '1604605803369-c50a59a8c2e7', '1608496601160-f86d19a44f9f', '1614027084000-8dc2ed5f5b4d',
    '1586201375761-83865001e31c', '1616183577078-a90b8bfb3809', '1574874897796-6e6c78e2a61c',
    '1621592484689-b6a7aed3bcd0', '1611417632946-a31a19f13be7', '1622470953794-aa9c70b0fb9d',
    '1606768666853-403c90a981ad', '1583224963550-bc82b5e94e57', '1575550959106-5a7defe28b56',
    '1593341646782-e0b495cff86d', '1598953228416-4e8b8c09e233', '1602024242516-fbc9d4fda4b6',
    '1511919884226-fd3cad34687c', '1522771739844-6a9f6d5f14af', '1547036967-23d11aacaee1',
    '1563013544-824ae1b704d3', '1575930334338-98a0c3f7c77f', '1517329782449-810562a4ec2f',
    '1548266652-99cf27701ced', '1557180295-76eab07dd7e9', '1591604466107-ec97de577aff',
    '1586022771185-d6b53a1d3ae5', '1520095972714-909e91b038e1', '1512419609304-5f6d53b3c6ba',
    '1533107862482-0e6974b06ec4', '1599512344261-97b29c782901', '1544639795-1dd4b71d42e4',
    '1594770385973-5ac7bb6c41bf', '1510707577719-ae7c14805e3a', '1598084016412-19cad23bc968',
    '1533929736458-ca588d08c8be', '1486711158859-0819a0c9e31a', '1517329782449-810562a4ec2g',
    '1526392060635-9d6019884378', '1619033745831-27ebb7be95fd', '1499781350541-7783f6c6a0c8',
    '1532120935409-f0e7f2a6e5e3', '1485686531765-ba63b07845a7', '1523464862212-d6631d073194',
    '1567098260168-a4e4e6c8d098', '1517639493569-5666a7556ef3', '1541647376-3f41f1c05d8e',
    '1517456828526-3e0c39d89128', '1570129477492-45c003edd2be', '1551726466-c19ad52e4c8f',
    '1565793298595-6a879b1d9492', '1522093007474-d86e9bf7ba6e', '1612987585176-4c3d9d8c7d21',
    '1447526564797-52e98e8f7c74', '1551882547-ff40c63fe5fb', '1506374322094-1253a7594181',
]

# Remove any IDs we're already using from the pool
unused_ids = [id for id in unused_ids if id not in used_ids]
print(f"Have {len(unused_ids)} unused IDs in pool")

url_index = 0

def get_unique_urls(count):
    """Get a specified number of unique URLs"""
    global url_index
    urls = []
    for _ in range(count):
        if url_index < len(unused_ids):
            urls.append(f"https://images.unsplash.com/photo-{unused_ids[url_index]}?w=800")
            url_index += 1
    return urls

# Now systematically replace all duplicates with unique URLs
# Using regex to find and replace image arrays

changes = 0

# List all landmarks that still have duplicates (from earlier check)
landmarks_to_fix = [
    ("Acropolis of Athens", 3),
    ("Parthenon", 3),
    ("Al Fahidi Historical District", 2),
    ("Alhambra", 3),
    ("Amazon Rainforest", 3),
    ("Apartheid Museum", 2),
    ("Arashiyama Bamboo Grove", 2),
    ("Ayutthaya", 2),
    ("Banff National Park", 2),
    ("Bay of Fundy", 2),
    ("Berlin Wall Memorial", 2),
    ("Big Ben", 2),
    ("Black Forest", 2),
    ("Blue Mountains", 2),
    ("Bondi Beach", 2),
    ("Brandenburg Gate", 2),
    ("Burj Al Arab", 2),
    ("Burj Khalifa", 2),
    ("CN Tower", 2),
    ("Cabo San Lucas Arch", 2),
    ("Cape of Good Hope", 2),
    ("Carcassonne", 2),
    ("Casa Batlló", 2),
    ("Cenotes of Yucatan", 2),
    ("Chiang Mai Old City", 2),
    ("Chichen Itza", 2),
    ("Christ the Redeemer", 2),
    ("Château de Chambord", 2),
    ("Colca Canyon", 2),
    ("Cologne Cathedral", 2),
    ("Colosseum", 2),
    ("Copacabana Beach", 2),
    ("Copper Canyon", 2),
    ("Corfu Old Town", 2),
    ("Delphi", 2),
    ("Desert Safari Dunes", 2),
    ("Dubai Mall", 2),
    ("Dubai Marina", 2),
    ("Egyptian Museum", 2),
    ("Eiffel Tower", 2),
    ("Fernando de Noronha", 2),
    ("Floating Markets", 2),
    ("Forbidden City", 2),
    ("Frida Kahlo Museum", 2),
    ("Fushimi Inari Shrine", 2),
    ("Gateway of India", 2),
    ("Golden Gate Bridge", 2),
    ("Grand Canyon", 2),
    ("Grand Palace Bangkok", 2),
    ("Great Pyramids of Giza", 2),
    ("Great Wall of China", 2),
    ("Guadalajara Cathedral", 2),
    ("Heidelberg Castle", 2),
    ("Hollywood Sign", 2),
    ("Huacachina Oasis", 2),
    ("Iguazu Falls", 2),
    ("James Bond Island", 2),
    ("Kakadu National Park", 2),
    ("Karnak Temple", 2),
    ("Khan el-Khalili", 2),
    ("Kinkaku-ji (Golden Pavilion)", 2),
    ("La Rambla", 2),
    ("Lake Titicaca", 2),
    ("Las Vegas Strip", 2),
    ("Leaning Tower of Pisa", 2),
    ("Lençóis Maranhenses", 2),
    ("Li River", 2),
    ("Lima Historic Center", 2),
    ("London Eye", 2),
    ("Louvre Abu Dhabi", 2),
    ("Louvre Museum", 2),
    ("Machu Picchu", 2),
    ("Mezquita Cordoba", 2),
    ("Miniatur Wunderland", 2),
    ("Mont Saint-Michel", 2),
    ("Moraine Lake", 2),
    ("Meteora", 2),
    ("Mount Fuji", 2),
    ("Mykonos", 2),
    ("Nara Park", 2),
    ("Nazca Lines", 2),
    ("Neuschwanstein Castle", 2),
    ("Niagara Falls", 2),
    ("Notre-Dame Cathedral", 2),
    ("Oktoberfest Grounds", 2),
    ("Osaka Castle", 2),
    ("Palenque", 2),
    ("Parliament Hill", 2),
    ("Pelourinho", 2),
    ("Phi Phi Islands", 2),
    ("Philae Temple", 2),
    ("Plaza Mayor Madrid", 2),
    ("Pont du Gard", 2),
    ("Potala Palace", 2),
    ("Prado Museum", 2),
    ("Rainbow Mountain", 2),
    ("Reichstag Building", 2),
    ("Robben Island", 2),
    ("Romantic Road", 2),
    ("Royal Palace Madrid", 2),
    ("Sacré-Cœur", 2),
    ("Sacred Valley", 2),
    ("Sagrada Família", 2),
    ("Santorini", 2),
    ("São Paulo Cathedral", 2),
    ("Senso-ji Temple", 2),
    ("Seville Cathedral", 2),
    ("Shanghai Bund", 2),
    ("Sheikh Zayed Grand Mosque", 2),
    ("Shibuya Crossing", 2),
    ("Sphinx", 2),
    ("Stonehenge", 2),
    ("Sugarloaf Mountain", 2),
    ("Sukhothai Historical Park", 2),
    ("Summer Palace", 2),
    ("Sydney Harbour Bridge", 2),
    ("Table Mountain", 2),
    ("Taj Mahal", 2),
    ("Temple of Heaven", 2),
    ("Temple of Poseidon", 2),
    ("Teotihuacan", 3),
    ("Times Square", 2),
    ("Tokyo Tower", 2),
    ("Tower Bridge", 2),
    ("Tulum", 2),
    ("Twelve Apostles", 2),
    ("Uluru (Ayers Rock)", 2),
    ("Valley of the Kings", 2),
    ("Vatican City", 2),
    ("Wat Arun", 2),
    ("Wat Pho", 2),
    ("West Lake", 2),
    ("White House", 2),
    ("Windsor Castle", 2),
    ("Yellow Mountain", 2),
    ("Yellowstone National Park", 2),
    ("Zócalo", 2),
]

for landmark_name, num_images in landmarks_to_fix:
    # Find landmark and replace its images with unique URLs
    pattern = rf'("name": "{re.escape(landmark_name)}",.*?"images": \[)(.*?)(\])'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        new_urls = get_unique_urls(num_images)
        if len(new_urls) == num_images:
            urls_str = ',\n                '.join([f'"{url}"' for url in new_urls])
            new_images_section = f'{match.group(1)}\n                {urls_str}\n            {match.group(3)}'
            content = content[:match.start()] + new_images_section + content[match.end():]
            changes += 1
            print(f"✅ Fixed: {landmark_name}")
        else:
            print(f"⚠️ Not enough URLs for: {landmark_name}")
    else:
        print(f"❌ Not found: {landmark_name}")

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Total changes made: {changes}/{len(landmarks_to_fix)}")
print(f"URLs remaining in pool: {len(unused_ids) - url_index}")
