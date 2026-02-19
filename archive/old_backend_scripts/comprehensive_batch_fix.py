#!/usr/bin/env python3
"""
Comprehensive batch fix - handles remaining major duplicate groups
Targets all 3-landmark groups to significantly reduce duplicates
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define comprehensive fixes for all remaining 3-landmark groups
fixes_applied = 0

# Japan group - Kinkaku-ji, Senso-ji, Nara Park
if '"name": "Senso-ji Temple"' in content:
    content = re.sub(
        r'("name": "Senso-ji Temple",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(".*?"images": \[.*?)\]',
        r'\1https://images.unsplash.com/photo-1585121345976-2ec5e09b84e4?w=800\2\n                "https://images.unsplash.com/photo-1585121345976-2ec5e09b84e4?w=800",\n                "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800"\n            ]',
        content,
        flags=re.DOTALL
    )
    fixes_applied += 1
    print("✅ Fixed: Senso-ji Temple")

if '"name": "Nara Park"' in content:
    content = re.sub(
        r'("name": "Nara Park",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(".*?"images": \[.*?)\]',
        r'\1https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800\2\n                "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800",\n                "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"\n            ]',
        content,
        flags=re.DOTALL
    )
    fixes_applied += 1
    print("✅ Fixed: Nara Park")

# Peru group - Nazca Lines, Colca Canyon, Huacachina Oasis  
if '"name": "Colca Canyon"' in content:
    content = re.sub(
        r'("name": "Colca Canyon",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1549989476-69a92fa57c36?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Colca Canyon")

if '"name": "Huacachina Oasis"' in content:
    content = re.sub(
        r'("name": "Huacachina Oasis",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Huacachina Oasis")

# Brazil group - Amazon, Iguazu, Pelourinho
if '"name": "Pelourinho"' in content:
    content = re.sub(
        r'("name": "Pelourinho",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Pelourinho")

# USA group - Grand Canyon, Golden Gate, Black Forest
if '"name": "Golden Gate Bridge"' in content and "Grand Canyon" in content:
    content = re.sub(
        r'("name": "Golden Gate Bridge",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Golden Gate Bridge")

# China groups
if '"name": "Li River"' in content:
    content = re.sub(
        r'("name": "Li River",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1549041840-4021c9eb86ec?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Li River")

if '"name": "Yellow Mountain"' in content:
    content = re.sub(
        r'("name": "Yellow Mountain",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1587639542670-d9440c01c5e8?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Yellow Mountain")

if '"name": "Temple of Heaven"' in content:
    content = re.sub(
        r'("name": "Temple of Heaven",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Temple of Heaven")

if '"name": "Summer Palace"' in content:
    content = re.sub(
        r'("name": "Summer Palace",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1557180295-76eab07dd7e9?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Summer Palace")

# Spain group
if '"name": "La Rambla"' in content:
    content = re.sub(
        r'("name": "La Rambla",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: La Rambla")

if '"name": "Casa Batlló"' in content:
    content = re.sub(
        r'("name": "Casa Batlló",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1588968864314-35e71c4493e7?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Casa Batlló")

# Greece/Mexico group
if '"name": "Tulum"' in content:
    content = re.sub(
        r'("name": "Tulum",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Tulum")

if '"name": "Cenotes of Yucatan"' in content:
    content = re.sub(
        r'("name": "Cenotes of Yucatan",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1549995663-03b35b1bb69a?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Cenotes of Yucatan")

# Thailand groups
if '"name": "Chiang Mai Old City"' in content:
    content = re.sub(
        r'("name": "Chiang Mai Old City",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1591815681165-61d0e88f5c27?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Chiang Mai Old City")

if '"name": "Sukhothai Historical Park"' in content:
    content = re.sub(
        r'("name": "Sukhothai Historical Park",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1563492065213-38c78eb3ec1f?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Sukhothai Historical Park")

# Brazil - Christ/Sugarloaf/Copacabana  
if '"name": "Sugarloaf Mountain"' in content:
    content = re.sub(
        r'("name": "Sugarloaf Mountain",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1516834474-2c480c60c50f?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Sugarloaf Mountain")

# Mexico - Chichen Itza/Palenque/Copper Canyon
if '"name": "Palenque"' in content:
    content = re.sub(
        r'("name": "Palenque",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1591361895545-78651b0b5c2d?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Palenque")

if '"name": "Copper Canyon"' in content:
    content = re.sub(
        r'("name": "Copper Canyon",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Copper Canyon")

# Mexico - Cabo San Lucas
if '"name": "Cabo San Lucas Arch"' in content:
    content = re.sub(
        r'("name": "Cabo San Lucas Arch",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Cabo San Lucas Arch")

# UAE - Al Fahidi
if '"name": "Al Fahidi Historical District"' in content:
    content = re.sub(
        r'("name": "Al Fahidi Historical District",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Al Fahidi Historical District")

# Canada - Banff/Moraine/Bay of Fundy
if '"name": "Moraine Lake"' in content:
    content = re.sub(
        r'("name": "Moraine Lake",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1568271675068-f76a83a1e2d6?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Moraine Lake")

if '"name": "Bay of Fundy"' in content:
    content = re.sub(
        r'("name": "Bay of Fundy",\s*"description": "[^"]+",\s*"image_url": ")[^"]+(")',
        r'\1https://images.unsplash.com/photo-1558447268-7e2c83a31c5e?w=800\2',
        content
    )
    fixes_applied += 1
    print("✅ Fixed: Bay of Fundy")

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Successfully applied {fixes_applied} fixes!")
