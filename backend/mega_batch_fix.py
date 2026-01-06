#!/usr/bin/env python3
"""
Large batch fix - Fix France, Peru, Brazil, and Mexico duplicates
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# List of all replacements
replacements = [
    # === FRANCE ===
    # Eiffel Tower
    {
        'search': '"name": "Eiffel Tower", \n            "description": "Iconic iron lattice tower on the Champ de Mars in Paris.", \n            "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",\n                "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=800"\n            ],',
        'replace': '"name": "Eiffel Tower", \n            "description": "Iconic iron lattice tower on the Champ de Mars in Paris.", \n            "image_url": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800",\n                "https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?w=800",\n                "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800"\n            ],'
    },
    # Pont du Gard
    {
        'search': '"name": "Pont du Gard", \n            "description": "Ancient Roman aqueduct bridge in southern France.", \n            "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",',
        'replace': '"name": "Pont du Gard", \n            "description": "Ancient Roman aqueduct bridge in southern France.", \n            "image_url": "https://images.unsplash.com/photo-1590832543591-6413484b20b5?w=800",'
    },
    # Sacré-Cœur
    {
        'search': '"name": "Sacré-Cœur", \n            "description": "Romano-Byzantine basilica on Montmartre hill.", \n            "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",',
        'replace': '"name": "Sacré-Cœur", \n            "description": "Romano-Byzantine basilica on Montmartre hill.", \n            "image_url": "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800",'
    },
    
    # === PERU ===
    # Machu Picchu
    {
        'search': '"name": "Machu Picchu", \n            "description": "15th-century Inca citadel set high in the Andes Mountains.", \n            "image_url": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800",\n                "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n                "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800"\n            ],',
        'replace': '"name": "Machu Picchu", \n            "description": "15th-century Inca citadel set high in the Andes Mountains.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n                "https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?w=800",\n                "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800"\n            ],'
    },
    # Sacred Valley
    {
        'search': '"name": "Sacred Valley", \n            "description": "Valley in Andes with Incan archaeological sites.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",\n                "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800"\n            ],',
        'replace': '"name": "Sacred Valley", \n            "description": "Valley in Andes with Incan archaeological sites.", \n            "image_url": "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1531065208531-4036c0dba3ca?w=800",\n                "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800",\n                "https://images.unsplash.com/photo-1523090642-3d0b64b8e66e?w=800"\n            ],'
    },
    # Colca Canyon
    {
        'search': '"name": "Colca Canyon", \n            "description": "Deep canyon with terraced agriculture and condors.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",',
        'replace': '"name": "Colca Canyon", \n            "description": "Deep canyon with terraced agriculture and condors.", \n            "image_url": "https://images.unsplash.com/photo-1549989476-69a92fa57c36?w=800",'
    },
    # Sacsayhuamán
    {
        'search': '"name": "Sacsayhuamán", \n            "description": "Incan walled complex with massive stone blocks.", \n            "image_url": "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800",',
        'replace': '"name": "Sacsayhuamán", \n            "description": "Incan walled complex with massive stone blocks.", \n            "image_url": "https://images.unsplash.com/photo-1621883861398-56e13e49c9ed?w=800",'
    },
    
    # === BRAZIL ===
    # Copacabana Beach
    {
        'search': '"name": "Copacabana Beach", \n            "description": "Famous beach in Rio de Janeiro with iconic boardwalk.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",\n                "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800"\n            ],',
        'replace': '"name": "Copacabana Beach", \n            "description": "Famous beach in Rio de Janeiro with iconic boardwalk.", \n            "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800",\n                "https://images.unsplash.com/photo-1518623001395-125242310d0c?w=800",\n                "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800"\n            ],'
    },
    # Fernando de Noronha
    {
        'search': '"name": "Fernando de Noronha", \n            "description": "Tropical archipelago with pristine beaches.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",',
        'replace': '"name": "Fernando de Noronha", \n            "description": "Tropical archipelago with pristine beaches.", \n            "image_url": "https://images.unsplash.com/photo-1539606328352-637f4aa160b9?w=800",'
    },
    # Pantanal
    {
        'search': '"name": "Pantanal", \n            "description": "World\'s largest tropical wetland area.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",',
        'replace': '"name": "Pantanal", \n            "description": "World\'s largest tropical wetland area.", \n            "image_url": "https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=800",'
    },
    # São Paulo Cathedral
    {
        'search': '"name": "São Paulo Cathedral", \n            "description": "Neo-Gothic metropolitan cathedral in Brazil.", \n            "image_url": "https://images.unsplash.com/photo-1591977860134-2c49af55ed13?w=800",',
        'replace': '"name": "São Paulo Cathedral", \n            "description": "Neo-Gothic metropolitan cathedral in Brazil.", \n            "image_url": "https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=800",'
    },
    
    # === MEXICO ===
    # Teotihuacan - multiple duplicates!
    {
        'search': '"name": "Teotihuacan", \n            "description": "Ancient Mesoamerican city with pyramids of Sun and Moon.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n                "https://images.unsplash.com/photo-1585464835-b61dc53be3de?w=800"\n            ],',
        'replace': '"name": "Teotihuacan", \n            "description": "Ancient Mesoamerican city with pyramids of Sun and Moon.", \n            "image_url": "https://images.unsplash.com/photo-1518659233460-e2e097f8e5b7?w=800",\n            "images": [\n                "https://images.unsplash.com/photo-1518659233460-e2e097f8e5b7?w=800",\n                "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",\n                "https://images.unsplash.com/photo-1585464835-b61dc53be3de?w=800"\n            ],'
    },
    # Frida Kahlo Museum
    {
        'search': '"name": "Frida Kahlo Museum", \n            "description": "Blue House where Frida Kahlo lived and painted.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
        'replace': '"name": "Frida Kahlo Museum", \n            "description": "Blue House where Frida Kahlo lived and painted.", \n            "image_url": "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800",'
    },
    # Zócalo
    {
        'search': '"name": "Zócalo", \n            "description": "Main square in Mexico City, one of world\'s largest.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
        'replace': '"name": "Zócalo", \n            "description": "Main square in Mexico City, one of world\'s largest.", \n            "image_url": "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",'
    },
    # Guadalajara Cathedral
    {
        'search': '"name": "Guadalajara Cathedral", \n            "description": "Twin-towered Roman Catholic cathedral.", \n            "image_url": "https://images.unsplash.com/photo-1512813498716-34c4f0c9da3b?w=800",',
        'replace': '"name": "Guadalajara Cathedral", \n            "description": "Twin-towered Roman Catholic cathedral.", \n            "image_url": "https://images.unsplash.com/photo-1635178977722-30fd3e9f9d52?w=800",'
    },
]

# Apply all replacements
for r in replacements:
    if r['search'] in content:
        content = content.replace(r['search'], r['replace'])
        print(f"✅ Fixed: {r['search'][:50]}...")
    else:
        print(f"⚠️  Not found: {r['search'][:50]}...")

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Batch fix completed!")
