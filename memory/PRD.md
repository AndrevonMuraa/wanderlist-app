# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store. Social features, hybrid privacy, premium differentiation, 100 destinations, 1,500 landmarks.

## Architecture
- **Frontend**: React Native / Expo Router
- **Backend**: FastAPI / MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)

## Current State (March 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 73 (next: 74)

### CRITICAL NOTES
- "Destinations" not "Countries" in all user-facing text
- "Basic Traveler" not "Free user", "Premium Traveler" not "Pro user"
- `recalculate_user_points()` is SINGLE SOURCE OF TRUTH for points
- Diamond icon: Always teal (#1E8A8A)
- Landmark icon: Always coral (#E87850)
- Custom visits: 0 points, optional country_id linking

## Key Changes (March 28, 2026)

### Visit Detail Photo Management
- "Add Photo to Verify" CTA for unverified visits without photos
- Long-press to delete individual photos (with last-photo warning)
- Backend recalculates points after photo changes
- Verified↔Unverified transitions dynamically

### Custom Visits ↔ Destinations Linking
- Backend auto-matches country_name to DB countries
- Frontend autocomplete for 100 DB countries
- "Your Custom Landmarks" section on country-visit-detail

### Leaderboard Redesign
- Top 10 standard view + "Your Position" card for #11+
- "Show Full Rankings" expands to compact Top 100
- Rank always based on verified_points (consistent across Global/Friends)

### UI/UX Fixes
- My Landmark Visits: Full redesign (list layout, thumbnails, sort, animations)
- My Country Visits → "Destinations": Full redesign
- Feed: Community tab default
- Points consistency across all endpoints
- Messages "View All" respects subscription tier
- Ranks page: No flash of "Newcomer"
- About page: Stats box spacing fixed

## Test Credentials
- test@wandermark.app / Test1234!
- testpro@wandermark.app / Test1234!

## Prioritized Backlog
### P0: Build 74, verify all fixes, run recalculate_points.py
### P1: Migration script for existing custom visits, Deploy legal pages
### P2: Sentry, Image optimization, Rename GitHub repo
