"""Script to split server.py into modular route files."""
import re

# Read the current server.py
with open('/app/backend/server.py', 'r') as f:
    lines = f.readlines()

total_lines = len(lines)
print(f"Total lines in server.py: {total_lines}")

# Define the sections (1-indexed line ranges, inclusive)
# We'll extract these as raw code blocks
sections = {
    'auth': (43, 561),          # Admin setup + auth endpoints
    'content': (563, 828),      # Continent stats, countries, landmarks
    'community': (829, 1450),   # Community feed, POTW, photos, diaries, highlights, upvote
    'visits': (1449, 1890),     # Visits CRUD
    'admin': (1887, 2410),      # Admin endpoints + admin notifications
    'social': (2407, 3205),     # Leaderboard, friends, messages, stats, progress, feed, comments
    'collections': (3205, 3444),# Bucket list + custom collections
    'notifications': (3446, 3528), # Notification helper + notification endpoints
    'country_visits': (3528, 4067), # Country visits + user created visits
    'photos': (4067, 4191),     # Photo collection
    'achievements': (4193, 4362), # Achievements endpoints
    'badge_and_subscription': (4379, 4760), # Badge defs, check_and_award_badges, subscription
    'reports_push_legal': (4760, 5018), # Reports, push, legal
}

for name, (start, end) in sections.items():
    # Convert to 0-indexed
    section_lines = lines[start-1:end]
    print(f"\n{name}: lines {start}-{end} ({len(section_lines)} lines)")
    # Show first and last 2 lines
    for l in section_lines[:2]:
        print(f"  FIRST: {l.rstrip()}")
    print("  ...")
    for l in section_lines[-2:]:
        print(f"  LAST: {l.rstrip()}")
