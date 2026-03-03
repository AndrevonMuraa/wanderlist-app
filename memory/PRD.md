# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a travel app where users visit landmarks and countries, earn points, and compete on leaderboards. React Native (Expo) frontend, FastAPI backend, MongoDB Atlas database.

## Architecture
- **Frontend**: React Native with Expo Router, built via EAS
- **Backend**: FastAPI on Render (https://api.wandermark.app)
- **Database**: MongoDB Atlas
- **DNS**: Cloudflare/Namecheap for wandermark.app

## Three Visit Types
1. **Landmark Visits** (`db.visits` / `/api/visits`) - Official landmarks (797), gives points, verified with photos
2. **Country Visits** (`db.country_visits` / `/api/country-visits`) - 50 pts, standalone or auto-created from landmarks
3. **Custom Visits** (`db.user_created_visits` / `/api/user-created-visits`) - PRO feature, no points

## Points System
- Landmark visit: varies (~10 pts), Country visit: 50 pts, Country bonus: 20 pts
- **Verified** (leaderboard_points): only with photos + public privacy
- **Total** (points): always awarded
- Global leaderboard: excludes users with private/friends privacy settings

## What's Been Implemented

### Previous Sessions
- Full production migration (Render + MongoDB Atlas)
- Custom domain (api.wandermark.app), Security fix, Legal updates
- Leaderboard overhaul (Global=Verified, Friends=Total)
- Repository cleanup, Build #54 deployed to TestFlight

### Session Feb 2026 (Build #56) - P0/P1/P2
- Backend: Auto-country-visit no longer copies landmark photos
- Frontend: Allow visits without photos (with verified points warning)
- Frontend: Removed "Did you know?" section from landmarks
- Frontend: Smart FAB on landmark and country pages
- Social page reordered: Leaderboard top, Community Feed, then Activity Feed
- Leaderboard: Custom-styled filters
- New pages: My Landmark Visits, Points Summary
- Journey stats clickable
- Privacy warning when changing settings
- Scroll position preservation
- Database indexes

### Session Mar 2026 - E2E-2 Fixes
- **Badge icons**: Fixed broken icons (grey circles with text) → now renders proper Ionicons
- **Achievements page**: Fixed tab visibility (earned/in progress tabs now show white text on active)
- **Achievements page**: Badge icon containers with proper sizing and colors
- **My Landmark Visits**: Fixed auth token key (`token` → `auth_token`) - was causing 0 stats
- **Points Summary**: Fixed auth token key (`token` → `auth_token`) - was causing 0 stats
- **Visit model**: Added `landmark_name` and `country_name` fields for retroactive display
- **Visits endpoint**: Now enriches visits with landmark names from DB for old records
- **Explore progress bars**: Now shown on ALL continent cards (not just >0%)
- **Journey page restructured**:
  - Removed "Your Top Continent" section (redundant)
  - Moved link lines above "Recent Achievements" and below "Continental Progress"
  - Added new links: My Landmark Visits, Achievements & Badges, Points Summary
  - Made badge count clickable → navigates to /achievements
  - "View All Badges" now navigates to /achievements (was /profile)
- **Country visit detail**:
  - Removed three-dots options menu from header
  - Added "No photos added yet" empty state
  - Added "Visited Landmarks" list at bottom with navigation
- **Country visit photos migration**: Backend endpoint to clean auto-created visit photos (retroactive fix)
- **My Country Visits**: Auto-triggers migration on page load to clean landmark photos
- **Visit detail page**: Updated to use UniversalHeader, theme.colors.surface cards, country subtitle
- **Social page**: Removed duplicate leaderboard section (bottom), changed community feed to vertical layout
- **Leaderboard**: Fixed back navigation (router.back() instead of always pushing social)
- **Badge logic**: Added milestone_250 to award milestones list

## Current App Version
- Version: 1.2.0
- Build: 56

## Pending Deployment
All Mar 2026 changes need: 1) Save to GitHub, 2) Deploy backend to Render, 3) New EAS build

## Remaining Tasks
1. User E2E testing of new build with all Mar 2026 fixes
2. Country visit photo editing (add/remove/change photos)
3. App Store submission preparation
4. Further performance profiling on real device

## Key Files Modified Mar 2026
- `backend/models/all.py` - Added landmark_name, country_name to Visit model
- `backend/routes/country_visits.py` - Added landmarks endpoint + migration endpoint
- `backend/routes/visits.py` - Enriches visits with landmark names
- `backend/utils/helpers.py` - Added milestone_250 to badge milestones
- `frontend/utils/badgeIcons.ts` - NEW: Badge icon mapping utility
- `frontend/app/(tabs)/journey.tsx` - Major restructuring (links, badges, removed top continent)
- `frontend/app/(tabs)/social.tsx` - Removed duplicate leaderboard, vertical community feed
- `frontend/app/achievements.tsx` - Fixed tabs, badge icons, container sizing
- `frontend/app/continents.tsx` - Progress bars on all continents
- `frontend/app/country-visit-detail/[country_visit_id].tsx` - No-photo state, landmarks list, removed menu
- `frontend/app/leaderboard.tsx` - Context-aware back navigation
- `frontend/app/my-country-visits.tsx` - Auto-migration call
- `frontend/app/my-landmark-visits.tsx` - Fixed token key, interface
- `frontend/app/points-summary.tsx` - Fixed token key
- `frontend/app/visit-detail/[visit_id].tsx` - UniversalHeader, theme colors

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
