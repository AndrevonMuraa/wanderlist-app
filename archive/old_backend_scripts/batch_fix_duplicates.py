#!/usr/bin/env python3
"""
Batch fix multiple duplicate groups at once
"""

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix UAE/Dubai duplicates (5 landmarks using same URL)
fixes = [
    # Palm Jumeirah
    {
        'old': '''            "name": "Palm Jumeirah", 
            "description": "Artificial archipelago in shape of palm tree in Dubai.", 
            "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
                "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800"
            ],''',
        'new': '''            "name": "Palm Jumeirah", 
            "description": "Artificial archipelago in shape of palm tree in Dubai.", 
            "image_url": "https://images.unsplash.com/photo-1589996603843-9f05fef3804d?w=800",
            "images": [
                "https://images.unsplash.com/photo-1589996603843-9f05fef3804d?w=800",
                "https://images.unsplash.com/photo-1582408921715-18e7806365c1?w=800",
                "https://images.unsplash.com/photo-1632755119047-ebda4f4e56e5?w=800"
            ],'''
    },
    # Burj Al Arab
    {
        'old': '''            "name": "Burj Al Arab", 
            "description": "Luxury hotel on artificial island, iconic sail-shaped design.", 
            "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"
            ],''',
        'new': '''            "name": "Burj Al Arab", 
            "description": "Luxury hotel on artificial island, iconic sail-shaped design.", 
            "image_url": "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800",
            "images": [
                "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800",
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
                "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800"
            ],'''
    },
    # Dubai Mall
    {
        'old': '''            "name": "Dubai Mall", 
            "description": "World's largest shopping mall with aquarium and ice rink.", 
            "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
                "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800"
            ],''',
        'new': '''            "name": "Dubai Mall", 
            "description": "World's largest shopping mall with aquarium and ice rink.", 
            "image_url": "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800",
                "https://images.unsplash.com/photo-1583321500900-82807a458f67?w=800",
                "https://images.unsplash.com/photo-1568617207199-e9d0d6f49e93?w=800"
            ],'''
    },
    # Dubai Fountain
    {
        'old': '''            "name": "Dubai Fountain", 
            "description": "World's largest choreographed fountain system.", 
            "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
                "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=800"
            ],''',
        'new': '''            "name": "Dubai Fountain", 
            "description": "World's largest choreographed fountain system.", 
            "image_url": "https://images.unsplash.com/photo-1512418490979-92798cec1380?w=800",
            "images": [
                "https://images.unsplash.com/photo-1512418490979-92798cec1380?w=800",
                "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800",
                "https://images.unsplash.com/photo-1610265913160-e5049d2987a6?w=800"
            ],'''
    },
    # Dubai Marina
    {
        'old': '''            "name": "Dubai Marina", 
            "description": "Canal city carved along Persian Gulf shoreline.", 
            "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
            "images": [
                "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=800",
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"
            ],''',
        'new': '''            "name": "Dubai Marina", 
            "description": "Canal city carved along Persian Gulf shoreline.", 
            "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
            "images": [
                "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
                "https://images.unsplash.com/photo-1559628376-f3fe5f782a2e?w=800",
                "https://images.unsplash.com/photo-1582408921715-18e7806365c1?w=800"
            ],'''
    }
]

for fix in fixes:
    content = content.replace(fix['old'], fix['new'])

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed UAE/Dubai duplicates!")
