#!/usr/bin/env python3
"""
Script to update all pages with new HeaderBranding component
"""

import re
import os

# List of files to update with their relative import path
files_to_update = [
    ("/app/frontend/app/settings.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/notifications.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/bucket-list.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/friends.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/leaderboard.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/my-country-visits.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/ranks.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/subscription.tsx", "../components/BrandedGlobeIcon"),
    ("/app/frontend/app/analytics.tsx", "../components/BrandedGlobeIcon"),
]

def add_import(content, import_path):
    """Add HeaderBranding import if not present"""
    if "HeaderBranding" in content:
        return content
    
    # Find the last import statement
    import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];?\s*\n)"
    imports = list(re.finditer(import_pattern, content))
    
    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        new_import = f"import {{ HeaderBranding }} from '{import_path}';\n"
        content = content[:insert_pos] + new_import + content[insert_pos:]
    
    return content

def replace_old_branding(content):
    """Replace old earth icon branding with HeaderBranding"""
    
    # Pattern 1: <View style={styles.brandingContainer}> with earth icon and text
    pattern1 = r'<View style=\{styles\.brandingContainer\}>\s*<Ionicons name="earth" size=\{16\} color="[^"]*" />\s*<Text style=\{styles\.brandingText(?:Dark)?\}>WanderList</Text>\s*</View>'
    replacement1 = '<View style={styles.brandingContainer}>\n            <HeaderBranding size={16} textColor="#2A2A2A" />\n          </View>'
    content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)
    
    # Pattern 2: Just earth icon with brandingTextDark
    pattern2 = r'<Ionicons name="earth" size=\{16\} color="[^"]*" />\s*<Text style=\{styles\.brandingTextDark\}>WanderList</Text>'
    replacement2 = '<HeaderBranding size={16} textColor="#2A2A2A" />'
    content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
    
    # Pattern 3: Standalone earth icon in header (not in brandingContainer)
    # Be careful not to replace icons that are used for other purposes
    
    return content

def process_file(filepath, import_path):
    """Process a single file"""
    if not os.path.exists(filepath):
        print(f"  Skipping {filepath} - file not found")
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Add import
    content = add_import(content, import_path)
    
    # Replace old branding
    content = replace_old_branding(content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  ✓ Updated {filepath}")
        return True
    else:
        print(f"  - No changes needed for {filepath}")
        return False

def main():
    print("Updating branding across all pages...")
    print("=" * 50)
    
    updated = 0
    for filepath, import_path in files_to_update:
        if process_file(filepath, import_path):
            updated += 1
    
    print("=" * 50)
    print(f"Done! Updated {updated} files.")

if __name__ == "__main__":
    main()
