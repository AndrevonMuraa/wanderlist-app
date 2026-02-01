#!/usr/bin/env python3
"""
Efficient batch fix for remaining major duplicate groups
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Define all fixes as a list of (search, replace) tuples
fixes = [
    # Peru - Sacred Valley
    ('            "name": "Sacred Valley", \n            "description": "Valley in Andes with Incan archaeological sites.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n                "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800"\n            ],',
     '            "name": "Sacred Valley", \n            "description": "Valley in Andes with Incan archaeological sites.", \n            "image_url": "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800",\n                "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800",\n                "https://images.unsplash.com/photo-1523090642-3d6b8b55a7f1?w=800"\n            ],'),
    
    # Peru - Colca Canyon  
    ('            "name": "Colca Canyon", \n            "description": "Deep canyon with terraced agriculture and condors.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",',
     '            "name": "Colca Canyon", \n            "description": "Deep canyon with terraced agriculture and condors.", \n            "image_url": "https://images.unsplash.com/photo-1549989476-69a92fa57c36?w=800",'),
    
    # Peru - Sacsayhuamán
    ('            "name": "Sacsayhuamán", \n            "description": "Incan walled complex with massive stone blocks.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",',
     '            "name": "Sacsayhuamán", \n            "description": "Incan walled complex with massive stone blocks.", \n            "image_url": "https://images.unsplash.com/photo-1621883861398-56e13e49c9ed?w=800",'),
    
    # Brazil - Copacabana Beach
    ('            "name": "Copacabana Beach", \n            "description": "Famous beach in Rio de Janeiro with iconic boardwalk.", \n            "image_url": "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800",\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800"\n            ],',
     '            "name": "Copacabana Beach", \n            "description": "Famous beach in Rio de Janeiro with iconic boardwalk.", \n            "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",\n                "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800",\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800"\n            ],'),
    
    # Brazil - Fernando de Noronha
    ('            "name": "Fernando de Noronha", \n            "description": "Tropical archipelago with pristine beaches.", \n            "image_url": "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=800",\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800"\n            ],',
     '            "name": "Fernando de Noronha", \n            "description": "Tropical archipelago with pristine beaches.", \n            "image_url": "https://images.unsplash.com/photo-1539606328352-637f4aa160b9?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1539606328352-637f4aa160b9?w=800",\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",\n                "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=800"\n            ],'),
    
    # Brazil - Pantanal
    ('            "name": "Pantanal", \n            "description": "World\'s largest tropical wetland area.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",',
     '            "name": "Pantanal", \n            "description": "World\'s largest tropical wetland area.", \n            "image_url": "https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=800",'),
    
    # Brazil - São Paulo Cathedral
    ('            "name": "São Paulo Cathedral", \n            "description": "Neo-Gothic metropolitan cathedral in Brazil.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",',
     '            "name": "São Paulo Cathedral", \n            "description": "Neo-Gothic metropolitan cathedral in Brazil.", \n            "image_url": "https://images.unsplash.com/photo-1548978796-9f6e4d3e0d1d?w=800",'),
    
    # Mexico - Teotihuacan (appears twice with different images)
    ('            "name": "Teotihuacan", \n            "description": "Ancient Mesoamerican city with pyramids of Sun and Moon.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n                "https://images.unsplash.com/photo-1585464835-b61dc53be3de?w=800"\n            ],',
     '            "name": "Teotihuacan", \n            "description": "Ancient Mesoamerican city with pyramids of Sun and Moon.", \n            "image_url": "https://images.unsplash.com/photo-1518659233460-e2e097f8e5b7?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1518659233460-e2e097f8e5b7?w=800",\n                "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n                "https://images.unsplash.com/photo-1585464835-b61dc53be3de?w=800"\n            ],'),
    
    # Mexico - Frida Kahlo Museum
    ('            "name": "Frida Kahlo Museum", \n            "description": "Blue House where Frida Kahlo lived and painted.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
     '            "name": "Frida Kahlo Museum", \n            "description": "Blue House where Frida Kahlo lived and painted.", \n            "image_url": "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800",'),
    
    # Mexico - Zócalo  
    ('            "name": "Zócalo", \n            "description": "Main square in Mexico City, one of world\'s largest.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
     '            "name": "Zócalo", \n            "description": "Main square in Mexico City, one of world\'s largest.", \n            "image_url": "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",'),
    
    # Mexico - Guadalajara Cathedral
    ('            "name": "Guadalajara Cathedral", \n            "description": "Twin-towered Roman Catholic cathedral.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
     '            "name": "Guadalajara Cathedral", \n            "description": "Twin-towered Roman Catholic cathedral.", \n            "image_url": "https://images.unsplash.com/photo-1635178977722-30fd3e9f9d52?w=800",'),
]

# Apply all fixes
count = 0
for search, replace in fixes:
    if search in content:
        content = content.replace(search, replace)
        count += 1
        print(f"✅ Fixed: {search[:40]}...")
    else:
        print(f"⚠️  Not found: {search[:40]}...")

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Applied {count}/{len(fixes)} fixes!")
