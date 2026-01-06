#!/usr/bin/env python3
"""
Script to check for duplicate image URLs across landmarks in seed_data.py
"""
import re
from collections import defaultdict

def extract_landmarks_and_images():
    """Extract all landmarks and their images from seed_data.py"""
    with open('/app/backend/seed_data.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all landmark dictionaries
    landmark_pattern = r'\{[^}]*"name":\s*"([^"]+)"[^}]*"images":\s*\[(.*?)\][^}]*\}'
    matches = re.findall(landmark_pattern, content, re.DOTALL)
    
    landmark_images = {}
    for name, images_str in matches:
        # Extract URLs from the images array
        url_pattern = r'"(https://[^"]+)"'
        urls = re.findall(url_pattern, images_str)
        landmark_images[name] = urls
    
    return landmark_images

def find_duplicates(landmark_images):
    """Find duplicate image URLs and which landmarks use them"""
    url_to_landmarks = defaultdict(list)
    
    for landmark_name, urls in landmark_images.items():
        for url in urls:
            url_to_landmarks[url].append(landmark_name)
    
    # Filter to only duplicates (used by more than one landmark)
    duplicates = {url: landmarks for url, landmarks in url_to_landmarks.items() 
                  if len(landmarks) > 1}
    
    return duplicates

def main():
    print("🔍 Scanning seed_data.py for duplicate images...\n")
    
    landmark_images = extract_landmarks_and_images()
    total_landmarks = len(landmark_images)
    print(f"✅ Found {total_landmarks} landmarks\n")
    
    duplicates = find_duplicates(landmark_images)
    
    if not duplicates:
        print("🎉 SUCCESS! No duplicate images found!")
        return
    
    print(f"⚠️  Found {len(duplicates)} duplicate image URLs\n")
    print("=" * 80)
    
    # Sort by number of landmarks using each image (most duplicated first)
    sorted_duplicates = sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)
    
    for url, landmarks in sorted_duplicates:
        print(f"\n🔗 Image used by {len(landmarks)} landmarks:")
        print(f"   URL: {url[:80]}...")
        print(f"   Landmarks:")
        for landmark in landmarks:
            print(f"     • {landmark}")
    
    print("\n" + "=" * 80)
    print(f"\n📊 SUMMARY:")
    print(f"   Total duplicate URLs: {len(duplicates)}")
    print(f"   Total affected landmarks: {sum(len(lms) for lms in duplicates.values())}")
    print(f"   Needs fixing: ~{sum(len(lms) - 1 for lms in duplicates.values())} image replacements")

if __name__ == "__main__":
    main()
