# Temporary script to batch fix Australia landmarks
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Twelve Apostles
content = content.replace(
    '''            "name": "Twelve Apostles", 
            "description": "Collection of limestone stacks off the shore of Port Campbell.", 
            "image_url": "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
            "images": [
                "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
                "https://images.unsplash.com/photo-1506374322094-1253a7594180?w=800"
            ],''',
    '''            "name": "Twelve Apostles", 
            "description": "Collection of limestone stacks off the shore of Port Campbell.", 
            "image_url": "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800",
            "images": [
                "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800",
                "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?w=800",
                "https://images.unsplash.com/photo-1591269568148-af3c37df54cd?w=800"
            ],'''
)

# Fix Blue Mountains
content = content.replace(
    '''            "name": "Blue Mountains", 
            "description": "Mountainous region known for dramatic scenery.", 
            "image_url": "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
            "images": [
                "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
                "https://images.unsplash.com/photo-1506374322094-1253a7594180?w=800"
            ],''',
    '''            "name": "Blue Mountains", 
            "description": "Mountainous region known for dramatic scenery.", 
            "image_url": "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=800",
            "images": [
                "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=800",
                "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800",
                "https://images.unsplash.com/photo-1617196034796-f38a17c93145?w=800"
            ],'''
)

# Fix Great Ocean Road
content = content.replace(
    '''            "name": "Great Ocean Road", 
            "description": "Scenic coastal drive with stunning ocean views.", 
            "image_url": "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
            "images": [
                "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
                "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800"
            ],''',
    '''            "name": "Great Ocean Road", 
            "description": "Scenic coastal drive with stunning ocean views.", 
            "image_url": "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800",
            "images": [
                "https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800",
                "https://images.unsplash.com/photo-1579967330128-f0e8a22a2edb?w=800",
                "https://images.unsplash.com/photo-1595364138784-8e9bfc7a3fa1?w=800"
            ],'''
)

# Fix Kakadu National Park
content = content.replace(
    '''            "name": "Kakadu National Park", 
            "description": "Vast natural and cultural landscape with Aboriginal rock art.", 
            "image_url": "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
            "images": [
                "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
                "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=800"
            ],''',
    '''            "name": "Kakadu National Park", 
            "description": "Vast natural and cultural landscape with Aboriginal rock art.", 
            "image_url": "https://images.unsplash.com/photo-1604943911564-7751dd4a5c0a?w=800",
            "images": [
                "https://images.unsplash.com/photo-1604943911564-7751dd4a5c0a?w=800",
                "https://images.unsplash.com/photo-1587295537223-70c4e3fc7b31?w=800",
                "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=800"
            ],'''
)

# Fix Kangaroo Island
content = content.replace(
    '''            "name": "Kangaroo Island", 
            "description": "Island sanctuary for Australian wildlife.", 
            "image_url": "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
            "images": [
                "https://images.unsplash.com/photo-1591299022036-c6c8b1ed5089?w=800",
                "https://images.unsplash.com/photo-1587139223877-04cb899fa3e8?w=800"
            ],''',
    '''            "name": "Kangaroo Island", 
            "description": "Island sanctuary for Australian wildlife.", 
            "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
            "images": [
                "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
                "https://images.unsplash.com/photo-1540870986920-cf62fa5c4e15?w=800",
                "https://images.unsplash.com/photo-1577202214328-c04b77cefb5d?w=800"
            ],'''
)

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Australia landmarks fixed!")
