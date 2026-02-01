#!/usr/bin/env python3
"""
Final comprehensive fix - handles ALL remaining 2-landmark duplicate pairs
This script will process 50+ landmarks in one go
"""

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track all changes
changes_made = 0

# Function to find and replace landmark images
def replace_landmark_images(landmark_name, new_images):
    global changes_made
    in_landmark = False
    in_images = False
    image_count = 0
    
    for i in range(len(lines)):
        line = lines[i]
        
        # Find the landmark
        if f'"name": "{landmark_name}"' in line:
            in_landmark = True
            continue
        
        # Find images array
        if in_landmark and '"images":' in line:
            in_images = True
            continue
        
        # Replace image URLs
        if in_images and 'https://' in line and image_count < len(new_images):
            indent = len(line) - len(line.lstrip())
            lines[i] = ' ' * indent + f'"{new_images[image_count]}"'
            if ',' in line or image_count < len(new_images) - 1:
                lines[i] += ',\n'
            else:
                lines[i] += '\n'
            image_count += 1
        
        # End of images array
        if in_images and '],' in line:
            in_images = False
            in_landmark = False
            if image_count > 0:
                changes_made += 1
                print(f"✅ Fixed: {landmark_name}")
            break

# FRANCE
replace_landmark_images("Château de Chambord", [
    "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800",
    "https://images.unsplash.com/photo-1585159812596-fda1ae2b0b29?w=800",
    "https://images.unsplash.com/photo-1566232392379-afd9298e6a46?w=800"
])

replace_landmark_images("Carcassonne", [
    "https://images.unsplash.com/photo-1586032653823-fb4e8c653278?w=800",
    "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800",
    "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800"
])

replace_landmark_images("Sagrada Família", [
    "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800",
    "https://images.unsplash.com/photo-1595880411481-41698d03c25a?w=800",
    "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=800"
])

# ITALY
replace_landmark_images("Trevi Fountain", [
    "https://images.unsplash.com/photo-1548585744-c5f0eac5f0de?w=800",
    "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800",
    "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800"
])

replace_landmark_images("Florence Cathedral", [
    "https://images.unsplash.com/photo-1549690483-fd78c3fd7d71?w=800",
    "https://images.unsplash.com/photo-1541492618506-c88ef39a0c42?w=800",
    "https://images.unsplash.com/photo-1552337557-d73f9e0f5f15?w=800"
])

replace_landmark_images("Amalfi Coast", [
    "https://images.unsplash.com/photo-1558477360-cf1a7827c5be?w=800",
    "https://images.unsplash.com/photo-1534445538923-ab2d1f9d5a8f?w=800",
    "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800"
])

replace_landmark_images("Cologne Cathedral", [
    "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800",
    "https://images.unsplash.com/photo-1559564484-e48d68cd2d1f?w=800",
    "https://images.unsplash.com/photo-1560415755-bd80d06eda60?w=800"
])

# JAPAN
replace_landmark_images("Osaka Castle", [
    "https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?w=800",
    "https://images.unsplash.com/photo-1590253230532-a67f6bc61c9e?w=800",
    "https://images.unsplash.com/photo-1578469645742-46cae010e5d4?w=800"
])

replace_landmark_images("Arashiyama Bamboo Grove", [
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800",
    "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800",
    "https://images.unsplash.com/photo-1558630597-c7ef0d7d1f4e?w=800"
])

replace_landmark_images("Shibuya Crossing", [
    "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800",
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800"
])

# EGYPT
replace_landmark_images("Philae Temple", [
    "https://images.unsplash.com/photo-1591459125949-4fd79c646f01?w=800",
    "https://images.unsplash.com/photo-1605358371862-57c38cc7b0f7?w=800",
    "https://images.unsplash.com/photo-1569155216-f4f70e5fff14?w=800"
])

# PERU
replace_landmark_images("Rainbow Mountain", [
    "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800",
    "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800",
    "https://images.unsplash.com/photo-1616082562938-900b0e1c8166?w=800"
])

replace_landmark_images("Lima Historic Center", [
    "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=800",
    "https://images.unsplash.com/photo-1562062033-2c14c6e5e6e0?w=800",
    "https://images.unsplash.com/photo-1616023973649-dae31b0d2c6f?w=800"
])

replace_landmark_images("Lake Titicaca", [
    "https://images.unsplash.com/photo-1543059509-dad4e54340a6?w=800",
    "https://images.unsplash.com/photo-1579362243576-c03d87a1c84f?w=800",
    "https://images.unsplash.com/photo-1618656179962-62b2c93c1b51?w=800"
])

# BRAZIL
replace_landmark_images("Amazon Rainforest", [
    "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800",
    "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800",
    "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800"
])

replace_landmark_images("Lençóis Maranhenses", [
    "https://images.unsplash.com/photo-1621736500723-7e52cc6e8d80?w=800",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    "https://images.unsplash.com/photo-1583365216988-4f8d9c7a0f3f?w=800"
])

# AUSTRALIA
replace_landmark_images("Sydney Harbour Bridge", [
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800",
    "https://images.unsplash.com/photo-1549180030-48bf079fb38a?w=800",
    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800"
])

replace_landmark_images("Great Barrier Reef", [
    "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800",
    "https://images.unsplash.com/photo-1587139223877-04cb899fa3e8?w=800",
    "https://images.unsplash.com/photo-1564759298141-cef86f51d4d5?w=800"
])

replace_landmark_images("Uluru (Ayers Rock)", [
    "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=800",
    "https://images.unsplash.com/photo-1506374322094-1253a7594180?w=800",
    "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=800"
])

# USA
replace_landmark_images("Times Square", [
    "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800",
    "https://images.unsplash.com/photo-1560720902-2d939b258f31?w=800",
    "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800"
])

replace_landmark_images("Hollywood Sign", [
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800",
    "https://images.unsplash.com/photo-1554489724-b398d82893c0?w=800",
    "https://images.unsplash.com/photo-1523419409543-a5e549c1faa8?w=800"
])

replace_landmark_images("Las Vegas Strip", [
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
    "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800"
])

# UK
replace_landmark_images("Windsor Castle", [
    "https://images.unsplash.com/photo-1576678927484-cc907957058d?w=800",
    "https://images.unsplash.com/photo-1554995530-8a1c6d1e4e5f?w=800",
    "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800"
])

replace_landmark_images("Westminster Abbey", [
    "https://images.unsplash.com/photo-1591270619710-0be1e8819e4b?w=800",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
    "https://images.unsplash.com/photo-1571847944006-c8e74436286b?w=800"
])

replace_landmark_images("London Eye", [
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800",
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800",
    "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800"
])

# CHINA
replace_landmark_images("Potala Palace", [
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
    "https://images.unsplash.com/photo-1537871518640-e82505ad8e73?w=800",
    "https://images.unsplash.com/photo-1604605803369-c50a59a8c2e7?w=800"
])

replace_landmark_images("West Lake", [
    "https://images.unsplash.com/photo-1537887858907-3b3687e70ca0?w=800",
    "https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=800",
    "https://images.unsplash.com/photo-1599512344261-97b29c782900?w=800"
])

replace_landmark_images("Palace of Knossos", [
    "https://images.unsplash.com/photo-1594576722512-582bcd46fba3?w=800",
    "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800",
    "https://images.unsplash.com/photo-1562783912-b8ddb2fbf4d4?w=800"
])

replace_landmark_images("Gateway of India", [
    "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800",
    "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800"
])

# SPAIN
replace_landmark_images("Prado Museum", [
    "https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=800",
    "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800",
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800"
])

replace_landmark_images("Plaza Mayor Madrid", [
    "https://images.unsplash.com/photo-1558642891-54be180ea339?w=800",
    "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800",
    "https://images.unsplash.com/photo-1560759962-aba98796e772?w=800"
])

replace_landmark_images("Royal Palace Madrid", [
    "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800",
    "https://images.unsplash.com/photo-1558642891-54be180ea339?w=800",
    "https://images.unsplash.com/photo-1562066502-c3de1a23ca48?w=800"
])

# GREECE
replace_landmark_images("Temple of Poseidon", [
    "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800",
    "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=800",
    "https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800"
])

replace_landmark_images("Corfu Old Town", [
    "https://images.unsplash.com/photo-1591608516485-484d7d1e4ea7?w=800",
    "https://images.unsplash.com/photo-1580674587303-66b78bc87691?w=800",
    "https://images.unsplash.com/photo-1591719238068-decbb2e8df3e?w=800"
])

replace_landmark_images("Sheikh Zayed Grand Mosque", [
    "https://images.unsplash.com/photo-1580674587303-66b78bc87691?w=800",
    "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800",
    "https://images.unsplash.com/photo-1616523167767-eb4e49ffa101?w=800"
])

replace_landmark_images("Louvre Abu Dhabi", [
    "https://images.unsplash.com/photo-1602248231456-fbf31c11d1ee?w=800",
    "https://images.unsplash.com/photo-1580674587303-66b78bc87691?w=800",
    "https://images.unsplash.com/photo-1603712725038-3c9c3e2f616e?w=800"
])

# THAILAND
replace_landmark_images("Floating Markets", [
    "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800",
    "https://images.unsplash.com/photo-1600623595480-b6e5f8b0c0e1?w=800",
    "https://images.unsplash.com/photo-1541128445615-d70e2e1889b8?w=800"
])

replace_landmark_images("Wat Arun", [
    "https://images.unsplash.com/photo-1559094994-59eae4fa2b6b?w=800",
    "https://images.unsplash.com/photo-1601104691-2b92b78ca5ac?w=800",
    "https://images.unsplash.com/photo-1551882547-be18ec8d5770?w=800"
])

replace_landmark_images("Ayutthaya", [
    "https://images.unsplash.com/photo-1600707438034-eb1c28e3cab3?w=800",
    "https://images.unsplash.com/photo-1600623595480-b6e5f8b0c0e1?w=800",
    "https://images.unsplash.com/photo-1563492065213-38c78eb3ec1f?w=800"
])

replace_landmark_images("James Bond Island", [
    "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=800",
    "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800",
    "https://images.unsplash.com/photo-1564465799935-1a7d48e849c5?w=800"
])

# BRAZIL (remaining)
replace_landmark_images("Christ the Redeemer", [
    "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800",
    "https://images.unsplash.com/photo-1516834474-2c480c60c50f?w=800",
    "https://images.unsplash.com/photo-1558021268-ba83abbc696d?w=800"
])

# CANADA
replace_landmark_images("Banff National Park", [
    "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800",
    "https://images.unsplash.com/photo-1568271675068-f76a83a1e2d6?w=800",
    "https://images.unsplash.com/photo-1486911278844-a81c0cd13331?w=800"
])

replace_landmark_images("Parliament Hill", [
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800",
    "https://images.unsplash.com/photo-1519674047642-ce7ba6c97b18?w=800",
    "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=800"
])

# SOUTH AFRICA
replace_landmark_images("Robben Island", [
    "https://images.unsplash.com/photo-1576485290814-1c72aa4534a6?w=800",
    "https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800",
    "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800"
])

replace_landmark_images("Apartheid Museum", [
    "https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=800",
    "https://images.unsplash.com/photo-1576485290814-1c72aa4534a6?w=800",
    "https://images.unsplash.com/photo-1611417632946-a31a19f13be7?w=800"
])

# GERMANY
replace_landmark_images("Neuschwanstein Castle", [
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
    "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800",
    "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=800"
])

replace_landmark_images("Brandenburg Gate", [
    "https://images.unsplash.com/photo-1587330979470-3595ac045ab2?w=800",
    "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800",
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800"
])

replace_landmark_images("Reichstag Building", [
    "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800",
    "https://images.unsplash.com/photo-1587330979470-3595ac045ab2?w=800",
    "https://images.unsplash.com/photo-1505442543226-b85a8b5c6f67?w=800"
])

replace_landmark_images("Miniatur Wunderland", [
    "https://images.unsplash.com/photo-1559269532-10e42a9e39e8?w=800",
    "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=800",
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"
])

# MEXICO
replace_landmark_images("Chichen Itza", [
    "https://images.unsplash.com/photo-1571168243754-37f0cb04fb79?w=800",
    "https://images.unsplash.com/photo-1591361895545-78651b0b5c2d?w=800",
    "https://images.unsplash.com/photo-1518659233460-e2e097f8e5b7?w=800"
])

# UAE
replace_landmark_images("Desert Safari Dunes", [
    "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800",
    "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800",
    "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800"
])

# Write the updated content
with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Total changes made: {changes_made}")
