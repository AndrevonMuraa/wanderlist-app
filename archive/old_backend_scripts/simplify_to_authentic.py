#!/usr/bin/env python3
"""
Simplify to ONE authentic photo per landmark
Use the original image_url and set images array to contain just that photo
"""
import re

with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all landmarks and set their images array to contain just their image_url
landmark_pattern = r'(\{[^}]*"name":\s*"[^"]+",\s*"description":[^,]+,\s*"image_url":\s*"([^"]+)",\s*"images":\s*\[)(.*?)(\])'

def replace_images(match):
    prefix = match.group(1)  # Everything up to and including "images": [
    image_url = match.group(2)  # The main image_url
    suffix = match.group(4)  # The closing ]
    
    # Set images array to contain just the main image_url
    return f'{prefix}\n                "{image_url}"\n            {suffix}'

content_fixed = re.sub(landmark_pattern, replace_images, content, flags=re.DOTALL)

with open('/app/backend/seed_data.py', 'w', encoding='utf-8') as f:
    f.write(content_fixed)

print("✅ Simplified all landmarks to use ONE authentic photo from their image_url")
print("✅ All images arrays now contain just the original authentic photo")
