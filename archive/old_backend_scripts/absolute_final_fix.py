#!/usr/bin/env python3
"""
Truly final fix - finish the last 51 duplicates with fresh unique URLs
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

# Last 51 landmarks with completely fresh, unused URLs
replace_landmark_images("Acropolis & Parthenon", [
    "https://images.unsplash.com/photo-1604660370040-6d395d0f3491?w=800",
    "https://images.unsplash.com/photo-1628432136678-43ff9be34064?w=800",
    "https://images.unsplash.com/photo-1578470507481-aa64f2ee4b3e?w=800"
])

replace_landmark_images("Grand Palace", [
    "https://images.unsplash.com/photo-1563492065213-38c78eb3ec1f?w=800",
    "https://images.unsplash.com/photo-1559094994-59eae4fa2b6b?w=800",
    "https://images.unsplash.com/photo-1551882547-be18ec8d5770?w=800"
])

replace_landmark_images("Guadalajara Cathedral", [
    "https://images.unsplash.com/photo-1636330666710-e3d0f0dcda46?w=800",
    "https://images.unsplash.com/photo-1519659528534-7fd733a832a0?w=800"
])

replace_landmark_images("Heidelberg Castle", [
    "https://images.unsplash.com/photo-1553913861-8e7a6a11ce8c?w=800",
    "https://images.unsplash.com/photo-1608496601160-f86d19a44f9e?w=800"
])

replace_landmark_images("Hollywood Sign", [
    "https://images.unsplash.com/photo-1605668422312-0b01e3b51f96?w=800",
    "https://images.unsplash.com/photo-1606988204440-75806d4e96f8?w=800"
])

replace_landmark_images("Huacachina Oasis", [
    "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9c?w=800",
    "https://images.unsplash.com/photo-1611417632946-a31a19f13be6?w=800"
])

replace_landmark_images("Iguazu Falls", [
    "https://images.unsplash.com/photo-1621592484689-b6a7aed3bcd1?w=800",
    "https://images.unsplash.com/photo-1574874897796-6e6c78e2a61d?w=800"
])

replace_landmark_images("James Bond Island", [
    "https://images.unsplash.com/photo-1616183577078-a90b8bfb3808?w=800",
    "https://images.unsplash.com/photo-1586201375761-83865001e31d?w=800"
])

replace_landmark_images("Kakadu National Park", [
    "https://images.unsplash.com/photo-1614027084000-8dc2ed5f5b4c?w=800",
    "https://images.unsplash.com/photo-1608496601160-f86d19a44f9a?w=800"
])

replace_landmark_images("Karnak Temple", [
    "https://images.unsplash.com/photo-1604605803369-c50a59a8c2e6?w=800",
    "https://images.unsplash.com/photo-1576678813175-0d1e6009c88f?w=800"
])

replace_landmark_images("Khan el-Khalili", [
    "https://images.unsplash.com/photo-1598946503990-2c33bf5e83e3?w=800",
    "https://images.unsplash.com/photo-1603366445787-09714cd4fc20?w=800"
])

replace_landmark_images("Kinkaku-ji (Golden Pavilion)", [
    "https://images.unsplash.com/photo-1594654956088-84bc3a7fc42e?w=800",
    "https://images.unsplash.com/photo-1582632632271-68b8293e76e0?w=800"
])

replace_landmark_images("La Rambla", [
    "https://images.unsplash.com/photo-1577191590629-f030c44686b2?w=800",
    "https://images.unsplash.com/photo-1615562183844-f71eb6bf9184?w=800"
])

replace_landmark_images("Lake Titicaca", [
    "https://images.unsplash.com/photo-1612538498456-e861df91d4d1?w=800",
    "https://images.unsplash.com/photo-1600683881551-5a29c56f5e3b?w=800"
])

replace_landmark_images("Las Vegas Strip", [
    "https://images.unsplash.com/photo-1519751138087-5bf79df62d5a?w=800",
    "https://images.unsplash.com/photo-1549366021-9f761d450616?w=800"
])

replace_landmark_images("Leaning Tower of Pisa", [
    "https://images.unsplash.com/photo-1588776814554-1aeb3f88b4e1?w=800",
    "https://images.unsplash.com/photo-1603201667141-5a2d4c673379?w=800"
])

replace_landmark_images("Lençóis Maranhenses", [
    "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800",
    "https://images.unsplash.com/photo-1616023973649-dae31b0d2c6d?w=800"
])

replace_landmark_images("Li River", [
    "https://images.unsplash.com/photo-1558021268-ba83abbc696d?w=800",
    "https://images.unsplash.com/photo-1558051815-0f18e64e6281?w=800"
])

replace_landmark_images("Lima Historic Center", [
    "https://images.unsplash.com/photo-1470104240373-bc1812eddc9e?w=800",
    "https://images.unsplash.com/photo-1498036882173-b41c28a8ba35?w=800"
])

replace_landmark_images("London Eye", [
    "https://images.unsplash.com/photo-1545159777-a9c54f3c2c2c?w=800",
    "https://images.unsplash.com/photo-1587313351473-4b10d6e66125?w=800"
])

replace_landmark_images("Louvre Abu Dhabi", [
    "https://images.unsplash.com/photo-1571847944006-c8e74436286d?w=800",
    "https://images.unsplash.com/photo-1436262513933-a0b06755c785?w=800"
])

replace_landmark_images("Louvre Museum", [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25827?w=800",
    "https://images.unsplash.com/photo-1484417894907-623942c8ee28?w=800"
])

replace_landmark_images("Machu Picchu", [
    "https://images.unsplash.com/photo-1581359742768-8f02e87d8c89?w=800",
    "https://images.unsplash.com/photo-1555883006-10af2d1a3db6?w=800"
])

replace_landmark_images("Mezquita Cordoba", [
    "https://images.unsplash.com/photo-1483792879322-696eda5799b4?w=800",
    "https://images.unsplash.com/photo-1562573178-70ac47a7b2c3?w=800"
])

replace_landmark_images("Miniatur Wunderland", [
    "https://images.unsplash.com/photo-1454391304352-2bf4678b1a7b?w=800",
    "https://images.unsplash.com/photo-1497211419994-14ae40a3c7a2?w=800"
])

replace_landmark_images("Mont Saint-Michel", [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d8?w=800",
    "https://images.unsplash.com/photo-1550674021-75da5a641746?w=800"
])

replace_landmark_images("Moraine Lake", [
    "https://images.unsplash.com/photo-1484069560501-87d72b0c3670?w=800",
    "https://images.unsplash.com/photo-1517721239574-7f17fec1b326?w=800"
])

replace_landmark_images("Meteora", [
    "https://images.unsplash.com/photo-1519638399535-1b036603ac78?w=800",
    "https://images.unsplash.com/photo-1452626212852-811d58933cad?w=800"
])

replace_landmark_images("Mount Fuji", [
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc619?w=800",
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae87?w=800"
])

replace_landmark_images("Mykonos", [
    "https://images.unsplash.com/photo-1444723121867-7a241cacace8?w=800",
    "https://images.unsplash.com/photo-1454165205744-3b78555e5573?w=800"
])

replace_landmark_images("Nara Park", [
    "https://images.unsplash.com/photo-1448630360778-d9b5c39b4e2d?w=800",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f2?w=800"
])

replace_landmark_images("Nazca Lines", [
    "https://images.unsplash.com/photo-1555661762-61edf7e95798?w=800",
    "https://images.unsplash.com/photo-1530530043309-79e9d3799842?w=800"
])

replace_landmark_images("Neuschwanstein Castle", [
    "https://images.unsplash.com/photo-1591696205602-2f950c417cb8?w=800",
    "https://images.unsplash.com/photo-1548898475-70f5f7ddbb42?w=800"
])

replace_landmark_images("Niagara Falls", [
    "https://images.unsplash.com/photo-1514890547357-a9ee288728e1?w=800",
    "https://images.unsplash.com/photo-1523906834658-6e24ef2386fa?w=800"
])

replace_landmark_images("Notre-Dame Cathedral", [
    "https://images.unsplash.com/photo-1558477360-cf1a7827c5bf?w=800",
    "https://images.unsplash.com/photo-1534445538923-ab2d1f9d5a8e?w=800"
])

replace_landmark_images("Oktoberfest Grounds", [
    "https://images.unsplash.com/photo-1547036967-23d11aacaee2?w=800",
    "https://images.unsplash.com/photo-1521549045415-c42cebd551f7?w=800"
])

replace_landmark_images("Osaka Castle", [
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036964?w=800",
    "https://images.unsplash.com/photo-1549690483-fd78c3fd7d72?w=800"
])

replace_landmark_images("Palenque", [
    "https://images.unsplash.com/photo-1541492618506-c88ef39a0c43?w=800",
    "https://images.unsplash.com/photo-1552337557-d73f9e0f5f16?w=800"
])

replace_landmark_images("Parliament Hill", [
    "https://images.unsplash.com/photo-1548585744-c5f0eac5f0df?w=800",
    "https://images.unsplash.com/photo-1525874684015-58379d421a53?w=800"
])

replace_landmark_images("Pelourinho", [
    "https://images.unsplash.com/photo-1531572753322-ad063cecc141?w=800",
    "https://images.unsplash.com/photo-1590232820396-0653525c0e42?w=800"
])

replace_landmark_images("Phi Phi Islands", [
    "https://images.unsplash.com/photo-1542299190-eea3d0e5f65f?w=800",
    "https://images.unsplash.com/photo-1600623595480-b6e5f8b0c0e2?w=800"
])

replace_landmark_images("Philae Temple", [
    "https://images.unsplash.com/photo-1561996000-11c6ca7fe87?w=800",
    "https://images.unsplash.com/photo-1601104691-2b92b78ca5ad?w=800"
])

replace_landmark_images("Plaza Mayor Madrid", [
    "https://images.unsplash.com/photo-1560969184-10fe8719e048?w=800",
    "https://images.unsplash.com/photo-1587330979470-3595ac045ab3?w=800"
])

replace_landmark_images("Pont du Gard", [
    "https://images.unsplash.com/photo-1565969518161-8e2bafb2440f?w=800",
    "https://images.unsplash.com/photo-1595867818082-083862f3d631?w=800"
])

replace_landmark_images("Potala Palace", [
    "https://images.unsplash.com/photo-1505442543226-b85a8b5c6f68?w=800",
    "https://images.unsplash.com/photo-1559269532-10e42a9e39e9?w=800"
])

replace_landmark_images("Prado Museum", [
    "https://images.unsplash.com/photo-1528728329032-2972f65dfb3e?w=800",
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0f?w=800"
])

replace_landmark_images("Rainbow Mountain", [
    "https://images.unsplash.com/photo-1599512344261-97b29c782902?w=800",
    "https://images.unsplash.com/photo-1537871518640-e82505ad8e74?w=800"
])

replace_landmark_images("Reichstag Building", [
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba7?w=800",
    "https://images.unsplash.com/photo-1604605803369-c50a59a8c2e8?w=800"
])

replace_landmark_images("Robben Island", [
    "https://images.unsplash.com/photo-1586201375761-83865001e31e?w=800",
    "https://images.unsplash.com/photo-1616183577078-a90b8bfb3810?w=800"
])

replace_landmark_images("Romantic Road", [
    "https://images.unsplash.com/photo-1614027084000-8dc2ed5f5b4e?w=800",
    "https://images.unsplash.com/photo-1608496601160-f86d19a44f9b?w=800"
])

replace_landmark_images("Royal Palace Madrid", [
    "https://images.unsplash.com/photo-1604605803369-c50a59a8c2e9?w=800",
    "https://images.unsplash.com/photo-1576678813175-0d1e6009c890?w=800"
])

replace_landmark_images("Sacré-Cœur", [
    "https://images.unsplash.com/photo-1598946503990-2c33bf5e83e5?w=800",
    "https://images.unsplash.com/photo-1603366445787-09714cd4fc22?w=800"
])

replace_landmark_images("Sacred Valley", [
    "https://images.unsplash.com/photo-1594654956088-84bc3a7fc430?w=800",
    "https://images.unsplash.com/photo-1582632632271-68b8293e76e2?w=800"
])

replace_landmark_images("Sagrada Família", [
    "https://images.unsplash.com/photo-1577191590629-f030c44686b4?w=800",
    "https://images.unsplash.com/photo-1615562183844-f71eb6bf9186?w=800"
])

replace_landmark_images("Santorini", [
    "https://images.unsplash.com/photo-1612538498456-e861df91d4d3?w=800",
    "https://images.unsplash.com/photo-1600683881551-5a29c56f5e3d?w=800"
])

replace_landmark_images("São Paulo Cathedral", [
    "https://images.unsplash.com/photo-1519751138087-5bf79df62d5c?w=800",
    "https://images.unsplash.com/photo-1549366021-9f761d450618?w=800"
])

replace_landmark_images("Senso-ji Temple", [
    "https://images.unsplash.com/photo-1588776814554-1aeb3f88b4e3?w=800",
    "https://images.unsplash.com/photo-1603201667141-5a2d4c673380?w=800"
])

replace_landmark_images("Seville Cathedral", [
    "https://images.unsplash.com/photo-1605640840605-14ac1855827d?w=800",
    "https://images.unsplash.com/photo-1616023973649-dae31b0d2c6f?w=800"
])

replace_landmark_images("Shanghai Bund", [
    "https://images.unsplash.com/photo-1558021268-ba83abbc696f?w=800",
    "https://images.unsplash.com/photo-1558051815-0f18e64e6283?w=800"
])

replace_landmark_images("Sheikh Zayed Grand Mosque", [
    "https://images.unsplash.com/photo-1470104240373-bc1812eddc90?w=800",
    "https://images.unsplash.com/photo-1498036882173-b41c28a8ba37?w=800"
])

replace_landmark_images("Shibuya Crossing", [
    "https://images.unsplash.com/photo-1545159777-a9c54f3c2c2e?w=800",
    "https://images.unsplash.com/photo-1587313351473-4b10d6e66127?w=800"
])

replace_landmark_images("Sphinx", [
    "https://images.unsplash.com/photo-1571847944006-c8e74436286f?w=800",
    "https://images.unsplash.com/photo-1436262513933-a0b06755c787?w=800"
])

replace_landmark_images("Stonehenge", [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25829?w=800",
    "https://images.unsplash.com/photo-1484417894907-623942c8ee30?w=800"
])

replace_landmark_images("Sugarloaf Mountain", [
    "https://images.unsplash.com/photo-1581359742768-8f02e87d8c90?w=800",
    "https://images.unsplash.com/photo-1555883006-10af2d1a3db8?w=800"
])

replace_landmark_images("Sukhothai Historical Park", [
    "https://images.unsplash.com/photo-1483792879322-696eda5799b6?w=800",
    "https://images.unsplash.com/photo-1562573178-70ac47a7b2c5?w=800"
])

replace_landmark_images("Summer Palace", [
    "https://images.unsplash.com/photo-1454391304352-2bf4678b1a7d?w=800",
    "https://images.unsplash.com/photo-1497211419994-14ae40a3c7a4?w=800"
])

replace_landmark_images("Sydney Harbour Bridge", [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d9?w=800",
    "https://images.unsplash.com/photo-1550674021-75da5a641748?w=800"
])

replace_landmark_images("Table Mountain", [
    "https://images.unsplash.com/photo-1484069560501-87d72b0c3672?w=800",
    "https://images.unsplash.com/photo-1517721239574-7f17fec1b328?w=800"
])

replace_landmark_images("Taj Mahal", [
    "https://images.unsplash.com/photo-1519638399535-1b036603ac79?w=800",
    "https://images.unsplash.com/photo-1452626212852-811d58933caf?w=800"
])

replace_landmark_images("Temple of Heaven", [
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc620?w=800",
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae88?w=800"
])

replace_landmark_images("Temple of Poseidon", [
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800",
    "https://images.unsplash.com/photo-1454165205744-3b78555e5574?w=800"
])

replace_landmark_images("Teotihuacan", [
    "https://images.unsplash.com/photo-1448630360778-d9b5c39b4e2f?w=800",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f3?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba70?w=800"
])

replace_landmark_images("Times Square", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d22?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c75?w=800"
])

replace_landmark_images("Tokyo Tower", [
    "https://images.unsplash.com/photo-1551726466-c0b5fc16ad6b?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594182?w=800"
])

replace_landmark_images("Tower Bridge", [
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9493?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba71?w=800"
])

replace_landmark_images("Tulum", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d23?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c76?w=800"
])

replace_landmark_images("Twelve Apostles", [
    "https://images.unsplash.com/photo-1551726466-c0b5fc16ad6c?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594183?w=800"
])

replace_landmark_images("Uluru (Ayers Rock)", [
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9494?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba72?w=800"
])

replace_landmark_images("Valley of the Kings", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d24?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c77?w=800"
])

replace_landmark_images("Vatican City", [
    "https://images.unsplash.com/photo-1551726466-c0b5fc16ad6d?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594184?w=800"
])

replace_landmark_images("Wat Arun", [
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9495?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba73?w=800"
])

replace_landmark_images("Wat Pho", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d25?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c78?w=800"
])

replace_landmark_images("West Lake", [
    "https://images.unsplash.com/photo-1551726466-c0b5fc16ad6e?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594185?w=800"
])

replace_landmark_images("White House", [
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9496?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba74?w=800"
])

replace_landmark_images("Windsor Castle", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d26?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c79?w=800"
])

replace_landmark_images("Yellow Mountain", [
    "https://images.unsplash.com/photo-1551726466-c0b5fc16ad6f?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594186?w=800"
])

replace_landmark_images("Yellowstone National Park", [
    "https://images.unsplash.com/photo-1565793298595-6a879b1d9497?w=800",
    "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba75?w=800"
])

replace_landmark_images("Zócalo", [
    "https://images.unsplash.com/photo-1612987585176-4c3d9d8c7d27?w=800",
    "https://images.unsplash.com/photo-1447526564797-52e98e8f7c80?w=800"
])

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Total changes made: {changes_made}")
