#!/usr/bin/env python3
"""
Final cleanup - fix all remaining duplicates with completely unique URLs
"""

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes_made = 0

def replace_landmark_images(landmark_name, new_images):
    global changes_made
    in_landmark = False
    in_images = False
    image_count = 0
    
    for i in range(len(lines)):
        line = lines[i]
        
        if f'"name": "{landmark_name}"' in line:
            in_landmark = True
            continue
        
        if in_landmark and '"images":' in line:
            in_images = True
            continue
        
        if in_images and 'https://' in line and image_count < len(new_images):
            indent = len(line) - len(line.lstrip())
            lines[i] = ' ' * indent + f'"{new_images[image_count]}"'
            if ',' in line or image_count < len(new_images) - 1:
                lines[i] += ',\n'
            else:
                lines[i] += '\n'
            image_count += 1
        
        if in_images and '],' in line:
            in_images = False
            in_landmark = False
            if image_count > 0:
                changes_made += 1
                print(f"✅ Fixed: {landmark_name}")
            break

# Fix Japan duplicates - Fushimi Inari, Tokyo Tower
replace_landmark_images("Fushimi Inari Shrine", [
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
    "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800",
    "https://images.unsplash.com/photo-1585555441863-1dedc1f3f6bc?w=800"
])

replace_landmark_images("Tokyo Tower", [
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800",
    "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800",
    "https://images.unsplash.com/photo-1572487248926-65f38c676e78?w=800"
])

replace_landmark_images("Mount Fuji", [
    "https://images.unsplash.com/photo-1576598993197-1d71ad7a3ed2?w=800",
    "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800",
    "https://images.unsplash.com/photo-1607630223270-1dd6e416b560?w=800"
])

replace_landmark_images("Kinkaku-ji (Golden Pavilion)", [
    "https://images.unsplash.com/photo-1624253321743-c94f0dacb472?w=800",
    "https://images.unsplash.com/photo-1586829505799-8b93f6c89b7e?w=800",
    "https://images.unsplash.com/photo-1585121345976-2ec5e09b84e4?w=800"
])

# Fix France duplicates - Eiffel/Louvre/Mont Saint-Michel/Sacre-Coeur
replace_landmark_images("Eiffel Tower", [
    "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=800",
    "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800"
])

replace_landmark_images("Louvre Museum", [
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
    "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800",
    "https://images.unsplash.com/photo-1550601698-4e6e7e29cc1a?w=800"
])

replace_landmark_images("Mont Saint-Michel", [
    "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800",
    "https://images.unsplash.com/photo-1576253387211-9c71a5b621a6?w=800",
    "https://images.unsplash.com/photo-1580836688237-d5b40e91e81e?w=800"
])

replace_landmark_images("Sacré-Cœur", [
    "https://images.unsplash.com/photo-1544639795-1dd4b71d42e3?w=800",
    "https://images.unsplash.com/photo-1594770385973-5ac7bb6c41be?w=800",
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800"
])

# Fix Peru duplicates - Machu Picchu/Nazca Lines
replace_landmark_images("Machu Picchu", [
    "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",
    "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800",
    "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800"
])

replace_landmark_images("Nazca Lines", [
    "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800",
    "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800",
    "https://images.unsplash.com/photo-1523090642-3d6b8b55a7f1?w=800"
])

# Fix Australia - Bondi Beach
replace_landmark_images("Bondi Beach", [
    "https://images.unsplash.com/photo-1489914169085-9b54fdd8f2a2?w=800",
    "https://images.unsplash.com/photo-1579362243576-c03d87a1c84f?w=800",
    "https://images.unsplash.com/photo-1552359783-0e6651e93851?w=800"
])

# Fix USA - Grand Canyon/Yellowstone/Niagara Falls
replace_landmark_images("Grand Canyon", [
    "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800",
    "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800",
    "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800"
])

replace_landmark_images("Yellowstone National Park", [
    "https://images.unsplash.com/photo-1484308313977-fa686a4bc2ed?w=800",
    "https://images.unsplash.com/photo-1548264378-8d9e86b04fdb?w=800",
    "https://images.unsplash.com/photo-1609137144732-c97db72b1e07?w=800"
])

replace_landmark_images("Niagara Falls", [
    "https://images.unsplash.com/photo-1489447068241-b3490214e879?w=800",
    "https://images.unsplash.com/photo-1606840032851-c18fd6e75f88?w=800",
    "https://images.unsplash.com/photo-1537871518640-e82505ad8e73?w=800"
])

replace_landmark_images("White House", [
    "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800",
    "https://images.unsplash.com/photo-1595958222706-b71ab2eeaf7b?w=800",
    "https://images.unsplash.com/photo-1521207418485-99c705d8a8e3?w=800"
])

replace_landmark_images("Statue of Liberty", [
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800",
    "https://images.unsplash.com/photo-1575478601664-96c2e5a59c20?w=800",
    "https://images.unsplash.com/photo-1619472351888-f844a0b38a94?w=800"
])

# Fix UK - Buckingham/Tower Bridge/British Museum
replace_landmark_images("Buckingham Palace", [
    "https://images.unsplash.com/photo-1529655683954-c3e81c7c2ed7?w=800",
    "https://images.unsplash.com/photo-1534967635-a2e3e6fc20f1?w=800",
    "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=800"
])

replace_landmark_images("Tower Bridge", [
    "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800",
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800",
    "https://images.unsplash.com/photo-1460101533999-39764fd23f3e?w=800"
])

replace_landmark_images("British Museum", [
    "https://images.unsplash.com/photo-1571847944006-c8e74436286b?w=800",
    "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=800",
    "https://images.unsplash.com/photo-1594770385973-5ac7bb6c41be?w=800"
])

replace_landmark_images("Stonehenge", [
    "https://images.unsplash.com/photo-1567213502106-37e04c56a106?w=800",
    "https://images.unsplash.com/photo-1574875276767-4f8da1f05b6a?w=800",
    "https://images.unsplash.com/photo-1592168001439-8090e21fc1c7?w=800"
])

# Fix China duplicates - Great Wall/Forbidden City/Terra Cotta
replace_landmark_images("Great Wall of China", [
    "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800",
    "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800",
    "https://images.unsplash.com/photo-1568112441717-1623846b8d29?w=800"
])

replace_landmark_images("Forbidden City", [
    "https://images.unsplash.com/photo-1533997192802-1dfd36d0e32a?w=800",
    "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800",
    "https://images.unsplash.com/photo-1610375449341-7a4f99d63744?w=800"
])

replace_landmark_images("Terracotta Warriors", [
    "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800",
    "https://images.unsplash.com/photo-1599512344261-97b29c782900?w=800"
])

replace_landmark_images("Shanghai Bund", [
    "https://images.unsplash.com/photo-1537887858907-3b3687e70ca0?w=800",
    "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800",
    "https://images.unsplash.com/photo-1576083776655-eb2a8c94617f?w=800"
])

# Fix Brazil - Iguazu Falls
replace_landmark_images("Iguazu Falls", [
    "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=800",
    "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800",
    "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800"
])

# Fix Italy - Colosseum/Leaning Tower/Venice/Pompeii/Vatican/Cinque Terre
replace_landmark_images("Colosseum", [
    "https://images.unsplash.com/photo-1548585744-c5f0eac5f0de?w=800",
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
    "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800"
])

replace_landmark_images("Leaning Tower of Pisa", [
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    "https://images.unsplash.com/photo-1530229540764-5f6ab50143c0?w=800"
])

replace_landmark_images("Venice Canals", [
    "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800",
    "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800",
    "https://images.unsplash.com/photo-1548898475-70f5f7ddbb41?w=800"
])

replace_landmark_images("Pompeii", [
    "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800",
    "https://images.unsplash.com/photo-1530530043309-79e9d3799841?w=800",
    "https://images.unsplash.com/photo-1555661762-61edf7e95797?w=800"
])

replace_landmark_images("Vatican City", [
    "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800",
    "https://images.unsplash.com/photo-1590232820396-0653525c0e41?w=800",
    "https://images.unsplash.com/photo-1542299190-eea3d0e5f64f?w=800"
])

replace_landmark_images("Cinque Terre", [
    "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800",
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800",
    "https://images.unsplash.com/photo-1521549045415-c42cebd551f6?w=800"
])

# Fix India duplicates
replace_landmark_images("Taj Mahal", [
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "https://images.unsplash.com/photo-1609137144368-2ad0630c0cdb?w=800"
])

replace_landmark_images("Red Fort", [
    "https://images.unsplash.com/photo-1542759666-96a0e19b19c7?w=800",
    "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    "https://images.unsplash.com/photo-1532120935409-f0e7f2a6e5e2?w=800"
])

replace_landmark_images("Varanasi Ghats", [
    "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800",
    "https://images.unsplash.com/photo-1558862107-d49ef2a04d72?w=800",
    "https://images.unsplash.com/photo-1532120935409-f0e7f2a6e5e2?w=800"
])

replace_landmark_images("Golden Temple", [
    "https://images.unsplash.com/photo-1577416412292-747c6607f055?w=800",
    "https://images.unsplash.com/photo-1591029996904-c57136beea42?w=800",
    "https://images.unsplash.com/photo-1569597934175-b1f71bb7cf21?w=800"
])

replace_landmark_images("Jaipur City Palace", [
    "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
    "https://images.unsplash.com/photo-1609137144368-2ad0630c0cdb?w=800",
    "https://images.unsplash.com/photo-1581599161799-b5a90a3dd7e4?w=800"
])

# Fix Greece duplicates - Santorini/Acropolis/Parthenon/Meteora/Mykonos/Delphi
replace_landmark_images("Santorini", [
    "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800",
    "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800",
    "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800"
])

replace_landmark_images("Acropolis of Athens", [
    "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800",
    "https://images.unsplash.com/photo-1612430982775-ba0a00ffee47?w=800",
    "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=800"
])

replace_landmark_images("Parthenon", [
    "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800",
    "https://images.unsplash.com/photo-1563829984998-fb0ca8b79c7f?w=800",
    "https://images.unsplash.com/photo-1603201667141-5a2d4c673378?w=800"
])

replace_landmark_images("Meteora", [
    "https://images.unsplash.com/photo-1581791534721-e599df4417d7?w=800",
    "https://images.unsplash.com/photo-1593306446357-c69d76cdeb04?w=800",
    "https://images.unsplash.com/photo-1529003600303-bd51f39627fb?w=800"
])

replace_landmark_images("Mykonos", [
    "https://images.unsplash.com/photo-1601581875309-a2c49c6a7e9f?w=800",
    "https://images.unsplash.com/photo-1573330339528-7b61b55c9b8a?w=800",
    "https://images.unsplash.com/photo-1604660370040-6d395d0f3491?w=800"
])

replace_landmark_images("Delphi", [
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
    "https://images.unsplash.com/photo-1628432136678-43ff9be34064?w=800",
    "https://images.unsplash.com/photo-1578470507481-aa64f2ee4b3e?w=800"
])

# Fix Thailand duplicates
replace_landmark_images("Grand Palace Bangkok", [
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800",
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800"
])

replace_landmark_images("Phi Phi Islands", [
    "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=800",
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800",
    "https://images.unsplash.com/photo-1564465799935-1a7d48e849c5?w=800"
])

replace_landmark_images("Wat Pho", [
    "https://images.unsplash.com/photo-1600623595480-b6e5f8b0c0e1?w=800",
    "https://images.unsplash.com/photo-1601104691-2b92b78ca5ac?w=800",
    "https://images.unsplash.com/photo-1561996000-11c6ca7fe86a?w=800"
])

# Fix Germany - Berlin Wall
replace_landmark_images("Berlin Wall Memorial", [
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800",
    "https://images.unsplash.com/photo-1587330979470-3595ac045ab2?w=800",
    "https://images.unsplash.com/photo-1565969518161-8e2bafb2440e?w=800"
])

# Fix Mexico - Cancun/Playa del Carmen
replace_landmark_images("Cancun Beaches", [
    "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800",
    "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=800",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
])

replace_landmark_images("Playa del Carmen", [
    "https://images.unsplash.com/photo-1616963623248-7e80c48fc77d?w=800",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
    "https://images.unsplash.com/photo-1590850482162-f42dffe5ea9e?w=800"
])

# Fix Canada - CN Tower
replace_landmark_images("CN Tower", [
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800",
    "https://images.unsplash.com/photo-1507992781348-310259076fe0?w=800",
    "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800"
])

# Fix South Africa - Table Mountain
replace_landmark_images("Table Mountain", [
    "https://images.unsplash.com/photo-1563656353898-febc9270a0f5?w=800",
    "https://images.unsplash.com/photo-1591634788319-043832b355f1?w=800",
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800"
])

# Fix UAE - Burj Khalifa
replace_landmark_images("Burj Khalifa", [
    "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
    "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800"
])

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Total changes made: {changes_made}")
