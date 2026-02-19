#!/usr/bin/env python3
"""
Audit all 200 landmarks to identify potentially mismatched/random images
Flags images that might not be authentic landmark photos
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all landmarks with their images
landmark_pattern = r'"name":\s*"([^"]+)".*?"image_url":\s*"https://images\.unsplash\.com/photo-([^?]+)\?w=800"'
matches = re.findall(landmark_pattern, content, re.DOTALL)

# List of photo IDs that are known to be random/generic (from my earlier batch fixes)
suspicious_photo_ids = [
    '1420593248178', '1488646953014', '1448630360778', '1476514525535',
    '1513836279014', '1444723121867', '1454165205744', '1452626212852',
    '1478737270239', '1517721239574', '1519638399535', '1484069560501',
    '1550674021-75da5a641745', '1492144534655-ae79c964c9d7', '1497211419994',
    '1454391304352', '1562573178-70ac47a7b2c4', '1483792879322',
    '1555883006', '1581359742768', '1484417894907', '1488646953014',
    '1436262513933', '1571847944006', '1587313351473', '1545159777',
    '1498036882173', '1470104240373', '1558051815', '1558021268',
    '1616023973649', '1605640840605', '1603201667141', '1588776814554',
    '1549366021', '1519751138087', '1600683881551', '1612538498456',
    '1615562183844', '1577191590629', '1582632632271', '1594654956088',
    '1603366445787', '1598946503990', '1576678813175', '1604605803369',
    '1608496601160', '1614027084000', '1586201375761', '1616183577078',
    '1574874897796', '1621592484689', '1611417632946', '1622470953794',
    '1606768666853', '1583224963550', '1575550959106', '1593341646782',
    '1598953228416', '1602024242516', '1511919884226', '1522771739844',
]

print("=== AUDIT OF ALL LANDMARK IMAGES ===\n")
print("Checking for potentially mismatched images...\n")

suspicious_count = 0
suspicious_landmarks = []

for landmark_name, photo_id in matches:
    # Check if this photo ID is in our suspicious list
    is_suspicious = False
    for sus_id in suspicious_photo_ids:
        if sus_id in photo_id:
            is_suspicious = True
            break
    
    if is_suspicious:
        suspicious_count += 1
        suspicious_landmarks.append({
            'name': landmark_name,
            'photo_id': photo_id
        })
        print(f"⚠️  SUSPICIOUS: {landmark_name}")
        print(f"   Photo ID: {photo_id}")
        print()

if suspicious_count == 0:
    print("✅ No obviously suspicious photo IDs found!")
    print("All landmarks appear to use potentially authentic photos.")
else:
    print(f"\n📊 SUMMARY:")
    print(f"   Found {suspicious_count} potentially mismatched images")
    print(f"   These should be manually verified and replaced with authentic landmark photos")
    print(f"\n   Affected landmarks:")
    for item in suspicious_landmarks:
        print(f"   - {item['name']}")

print(f"\n✅ Total landmarks checked: {len(matches)}")
