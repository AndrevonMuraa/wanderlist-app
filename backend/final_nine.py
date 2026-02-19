#!/usr/bin/env python3
"""
Final 8 duplicates - complete 100%
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

# Final 8 duplicates
replace_landmark_images("Senso-ji Temple", [
    "https://images.unsplash.com/photo-1624253321743-c94f0dacb471?w=800",
    "https://images.unsplash.com/photo-1586829505799-8b93f6c89b7f?w=800"
])

replace_landmark_images("Amazon Rainforest", [
    "https://images.unsplash.com/photo-1589802829985-817e51171b93?w=800",
    "https://images.unsplash.com/photo-1571708794784-8cc0f7d86c94?w=800"
])

replace_landmark_images("Stonehenge", [
    "https://images.unsplash.com/photo-1567213502106-37e04c56a107?w=800",
    "https://images.unsplash.com/photo-1574875276767-4f8da1f05b6b?w=800"
])

replace_landmark_images("Terracotta Warriors", [
    "https://images.unsplash.com/photo-1528127269322-539801943593?w=800",
    "https://images.unsplash.com/photo-1519817650390-64a93db51150?w=800"
])

replace_landmark_images("Alhambra", [
    "https://images.unsplash.com/photo-1562883676-8c7feb83f09a?w=800",
    "https://images.unsplash.com/photo-1592839147723-e51ba61b77c8?w=800",
    "https://images.unsplash.com/photo-1558007685-5a1e0cf1aa5a?w=800"
])

replace_landmark_images("Acropolis & Parthenon", [
    "https://images.unsplash.com/photo-1555993539-1732b0258236?w=800",
    "https://images.unsplash.com/photo-1612430982775-ba0a00ffee48?w=800",
    "https://images.unsplash.com/photo-1603565816030-6b389eeb23cc?w=800"
])

replace_landmark_images("Zócalo", [
    "https://images.unsplash.com/photo-1602002418082-a4443e081dd2?w=800",
    "https://images.unsplash.com/photo-1635178977722-30fd3e9f9d53?w=800"
])

replace_landmark_images("Neuschwanstein Castle", [
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2c?w=800",
    "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5c?w=800"
])

replace_landmark_images("Cologne Cathedral", [
    "https://images.unsplash.com/photo-1568084680786-a84f91d1153d?w=800",
    "https://images.unsplash.com/photo-1559564484-e48d68cd2d1e?w=800",
    "https://images.unsplash.com/photo-1560415755-bd80d06eda61?w=800"
])

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Total changes made: {changes_made}")
