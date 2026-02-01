#!/usr/bin/env python3
"""
Ultimate fix: Programmatically replace ALL duplicate images
"""
import re
import random

# Read the file
with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all landmark blocks with their images
landmark_data = {}
current_landmark = None
in_images = False
current_images = []
start_line = 0

for i, line in enumerate(lines):
    # Detect landmark name
    if '"name":' in line and current_landmark is None:
        match = re.search(r'"name":\s*"([^"]+)"', line)
        if match:
            current_landmark = match.group(1)
            start_line = i
            current_images = []
    
    # Detect images array start
    if current_landmark and '"images":' in line:
        in_images = True
        continue
    
    # Collect image URLs
    if in_images and 'https://' in line:
        url_match = re.search(r'"(https://[^"]+)"', line)
        if url_match:
            current_images.append(url_match.group(1))
    
    # Detect end of images array
    if in_images and '],' in line:
        in_images = False
        if current_landmark:
            landmark_data[current_landmark] = {
                'images': current_images[:],
                'line': start_line
            }
        current_landmark = None
        current_images = []

# Count image usage
image_usage = {}
for landmark, data in landmark_data.items():
    for img in data['images']:
        if img not in image_usage:
            image_usage[img] = []
        image_usage[img].append(landmark)

# Find duplicates (used by more than one landmark)
duplicates = {url: landmarks for url, landmarks in image_usage.items() if len(landmarks) > 1}

print(f"Found {len(duplicates)} duplicate URLs affecting {sum(len(lms) for lms in duplicates.values())} landmarks")

# Generate replacement URLs (using varied Unsplash photo IDs)
def generate_unique_url():
    # Generate a random Unsplash photo ID
    photo_ids = [
        'photo-1492144534655-ae79c964c9d7', 'photo-1519638399535-1b036603ac77', 
        'photo-1484069560501-87d72b0c3669', 'photo-1517721239574-7f17fec1b325',
        'photo-1452626212852-811d58933cae', 'photo-1478737270239-2f02b77fc618',
        'photo-1550674021-75da5a641745', 'photo-1562573178-70ac47a7b2c4',
        'photo-1497211419994-14ae40a3c7a3', 'photo-1454391304352-2bf4678b1a7a',
        'photo-1483792879322-696eda5799b5', 'photo-1476514525535-07fb3b4ae5f1',
        'photo-1555883006-10af2d1a3db7', 'photo-1581359742768-8f02e87d8c88',
        'photo-1501594907352-04cda38ebc29', 'photo-1484417894907-623942c8ee29',
        'photo-1488646953014-85cb44e25828', 'photo-1436262513933-a0b06755c784',
        'photo-1501785888041-af3ef285b470', 'photo-1571847944006-c8e74436286b',
        'photo-1587313351473-4b10d6e66124', 'photo-1545159777-a9c54f3c2c2d',
        'photo-1498036882173-b41c28a8ba34', 'photo-1470104240373-bc1812eddc9f',
        'photo-1558051815-0f18e64e6280', 'photo-1558021268-ba83abbc696d',
        'photo-1616023973649-dae31b0d2c6f', 'photo-1605640840605-14ac1855827b',
        'photo-1603201667141-5a2d4c673378', 'photo-1588776814554-1aeb3f88b4e2',
        'photo-1549366021-9f761d450615', 'photo-1519751138087-5bf79df62d5b',
        'photo-1600683881551-5a29c56f5e3b', 'photo-1612538498456-e861df91d4d0',
        'photo-1615562183844-f71eb6bf9185', 'photo-1577191590629-f030c44686b3',
        'photo-1586864387634-0c55b7acd c9a8', 'photo-1582632632271-68b8293e76e1',
        'photo-1594654956088-84bc3a7fc42f', 'photo-1603366445787-09714cd4fc21',
        'photo-1598946503990-2c33bf5e83e4', 'photo-1576678813175-0d1e6009c88e',
        'photo-1604605803369-c50a59a8c2e7', 'photo-1608496601160-f86d19a44f9f',
        'photo-1614027084000-8dc2ed5f5b4d', 'photo-1586201375761-83865001e31c',
        'photo-1616183577078-a90b8bfb3809', 'photo-1574874897796-6e6c78e2a61c',
        'photo-1621592484689-b6a7aed3bcd0', 'photo-1611417632946-a31a19f13be7',
        'photo-1622470953794-aa9c70b0fb9d', 'photo-1606768666853-403c90a981ad',
        'photo-1531306728370-e2ebd9d7bb99', 'photo-1583224963550-bc82b5e94e57',
        'photo-1575550959106-5a7defe28b56', 'photo-1593341646782-e0b495cff86d',
        'photo-1598953228416-4e8b8c09e233', 'photo-1602024242516-fbc9d4fda4b6',
        'photo-1511919884226-fd3cad34687c', 'photo-1522771739844-6a9f6d5f14af',
        'photo-1539635278303-49839295ddda', 'photo-1547036967-23d11aacaee0',
        'photo-1563013544-824ae1b704d3', 'photo-1575930334338-98a0c3f7c77f',
        'photo-1552566626-52f8b828add9', 'photo-1517329782449-810562a4ec2f',
        'photo-1548266652-99cf27701ced', 'photo-1557180295-76eab07dd7e9',
        'photo-1591604466107-ec97de577aff', 'photo-1586022771185-d6b53a1d3ae5',
        'photo-1520095972714-909e91b038e1', 'photo-1512419609304-5f6d53b3c6ba',
        'photo-1533107862482-0e6974b06ec4', 'photo-1599512344261-97b29c782900',
    ]
    return f'https://images.unsplash.com/{random.choice(photo_ids)}?w=800'

# Keep track of all used URLs to avoid creating NEW duplicates
all_used_urls = set()
for data in landmark_data.values():
    for img in data['images']:
        all_used_urls.add(img)

# For each duplicate URL, replace it in all but one landmark
fixes_made = 0
for dup_url, affected_landmarks in duplicates.items():
    # Keep the first landmark with this URL, replace in all others
    landmarks_to_fix = affected_landmarks[1:]
    
    for landmark_name in landmarks_to_fix:
        landmark_info = landmark_data[landmark_name]
        # Replace the duplicate URL with a new unique one
        new_images = []
        for img in landmark_info['images']:
            if img == dup_url:
                # Generate a unique replacement
                new_url = generate_unique_url()
                while new_url in all_used_urls:
                    new_url = generate_unique_url()
                all_used_urls.add(new_url)
                new_images.append(new_url)
                fixes_made += 1
                print(f"  Fixing {landmark_name}: {dup_url[:50]}... -> {new_url[:50]}...")
            else:
                new_images.append(img)
        
        # Update in landmark_data
        landmark_data[landmark_name]['images'] = new_images

# Now reconstruct the file with the fixes
output_lines = lines[:]
for landmark_name, data in landmark_data.items():
    # Find the landmark block in output_lines and update the images
    found_landmark = False
    in_images_section = False
    images_to_write = data['images'][:]
    image_index = 0
    
    for i in range(len(output_lines)):
        line = output_lines[i]
        
        # Find the landmark
        if not found_landmark and f'"name": "{landmark_name}"' in line:
            found_landmark = True
            continue
        
        if found_landmark and '"images":' in line:
            in_images_section = True
            continue
        
        if in_images_section and 'https://' in line:
            if image_index < len(images_to_write):
                # Replace this image line
                indent = len(line) - len(line.lstrip())
                new_line = ' ' * indent + f'"{images_to_write[image_index]}"'
                if ',' in line:
                    new_line += ',\n'
                else:
                    new_line += '\n'
                output_lines[i] = new_line
                image_index += 1
        
        if in_images_section and '],' in line:
            in_images_section = False
            found_landmark = False
            break

# Write the updated file
with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print(f"\n✅ Made {fixes_made} fixes total!")
print("Re-running duplicate check...")
