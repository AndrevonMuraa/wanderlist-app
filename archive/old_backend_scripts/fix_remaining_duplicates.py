#!/usr/bin/env python3
"""
Fix the remaining 5 duplicate pairs with unique authentic photos
"""

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix each duplicate by replacing the image_url and images array
replacements = [
    # Mont Saint-Michel (sharing with Sagrada - already fixed above)
    {
        'name': 'Mont Saint-Michel',
        'old_url': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
        'new_url': 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800'
    },
    # Senso-ji (sharing with Fushimi Inari)
    {
        'name': 'Senso-ji Temple',
        'old_url': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
        'new_url': 'https://images.unsplash.com/photo-1545931113-7bf0728c7541?w=800'
    },
    # Huacachina (sharing with Romantic Road)
    {
        'name': 'Huacachina Oasis',
        'old_url': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
        'new_url': 'https://images.unsplash.com/photo-1616083707673-5e8f55ed53f3?w=800'
    },
    # Alhambra (sharing with Sagrada - need different one)
    {
        'name': 'Alhambra',
        'old_url': 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=800',
        'new_url': 'https://images.unsplash.com/photo-1592839147723-e51ba61b77c7?w=800'
    },
    # Floating Markets (sharing with Wat Pho)
    {
        'name': 'Floating Markets',
        'old_url': 'https://images.unsplash.com/photo-1600623595480-b6e5f8b0c0e1?w=800',
        'new_url': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800'
    },
    # Tulum (sharing with Cabo San Lucas)
    {
        'name': 'Tulum',
        'old_url': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        'new_url': 'https://images.unsplash.com/photo-1621881982584-b45a5ef5d9e4?w=800'
    },
]

for replacement in replacements:
    landmark_name = replacement['name']
    old_url = replacement['old_url']
    new_url = replacement['new_url']
    
    # Find and replace the landmark's image_url and images array
    # Pattern: "name": "{name}", ... "image_url": "{old_url}", "images": [ "{old_url}" ]
    import re
    
    # Find the landmark block
    pattern = rf'("name": "{re.escape(landmark_name)}".*?"image_url": "){re.escape(old_url)}(".*?"images": \[\s*"){re.escape(old_url)}(")'
    
    replacement_text = rf'\g<1>{new_url}\g<2>{new_url}\g<3>'
    
    new_content, count = re.subn(pattern, replacement_text, content, flags=re.DOTALL)
    
    if count > 0:
        content = new_content
        print(f"✅ Fixed: {landmark_name}")
    else:
        print(f"⚠️  Could not find: {landmark_name}")

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ All remaining duplicates fixed!")
