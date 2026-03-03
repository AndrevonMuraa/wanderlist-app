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
- **Badge icons**: Fixed broken icons (grey circles with text) → Ionicons with proper colors
- **Achievements page**: Fixed tab visibility (white text on active solid background)
- **My Landmark Visits**: Fixed auth token key (`token` → `auth_token`)
- **Points Summary**: Fixed auth token key (`token` → `auth_token`)
- **Visit model**: Added `landmark_name` and `country_name` fields
- **Visits endpoint**: Enriches visits with landmark names retroactively
- **Explore progress bars**: Shown on ALL continent cards
- **Journey page restructured**:
  - Removed "Your Top Continent" (redundant)
  - Moved link lines above "Recent Achievements" below "Continental Progress"
  - Added links: My Landmark Visits, Achievements & Badges, Points Summary
  - Badge count clickable → /achievements
  - "View All Badges" → /achievements (was /profile)
  - Replaced "Recent Visits" list with visual carousel (photos + cards)
  - Carousel placed under "Overall Progress" section
- **Country visit detail**:
  - Removed three-dots menu from header
  - Added "No photos" empty state with "Add Photos" button
  - Added "Visited Landmarks" list at bottom
  - **Photo management**: Add photos, remove individual photos (via ImagePicker)
- **Country visit photos migration**: Backend endpoint to clean auto-created visit photos
- **My Country Visits**: Auto-triggers migration on page load
- **Visit detail page**: UniversalHeader, theme.colors.surface cards, country subtitle
- **Social page**: Removed duplicate leaderboard, vertical community feed layout
- **Leaderboard**: Context-aware back navigation
- **Badge logic**: Added milestone_250

### Session Mar 2026 - Photo Management + Carousel
- **Country visit photo editing**: Full CRUD - add photos (ImagePicker), remove individual photos, backend PUT endpoint with proper leaderboard points handling
- **Recently Visited carousel**: Horizontal scrollable photo cards replacing old text-only list, placed under Overall Progress. Visits without photos show "Add Photo" prompt with camera icon
- **Next Milestone icon**: Changed from `flag-outline` to `rocket` for better visual impact
- **Next Milestone section verified**: Retroactive, uses same milestones as badge system (10, 25, 50, 100, 200, 250, 350, 500), names match BADGE_DEFINITIONS exactly

## Current App Version
- Version: 1.2.0
- Build: 56

## Pending Deployment
All Mar 2026 changes need: 1) Save to GitHub, 2) Deploy backend to Render, 3) New EAS build

## Remaining Tasks
1. User E2E testing of new build with all fixes
2. App Store submission preparation
3. Further performance profiling on real device

## Key Files Modified (Latest)
- `backend/routes/country_visits.py` - Full PUT endpoint with photo management + landmarks endpoint + migration
- `frontend/app/(tabs)/journey.tsx` - Carousel, reordered sections, badge icons, navigation
- `frontend/app/country-visit-detail/[country_visit_id].tsx` - Photo CRUD, landmarks list, empty states
- `frontend/utils/badgeIcons.ts` - Badge icon mapping utility
- `frontend/app/achievements.tsx` - Tab visibility, icon rendering
- `frontend/app/my-landmark-visits.tsx` - Token fix, interface alignment
- `frontend/app/points-summary.tsx` - Token fix
- `frontend/app/visit-detail/[visit_id].tsx` - UniversalHeader, consistent styling
- `frontend/app/(tabs)/social.tsx` - Removed duplicate leaderboard, vertical feed
- `frontend/app/continents.tsx` - Progress bars on all continents
- `frontend/app/leaderboard.tsx` - Context-aware back nav
- `backend/models/all.py` - Visit model with landmark_name, country_name
- `backend/routes/visits.py` - Enriches visits with landmark names
- `backend/utils/helpers.py` - milestone_250 in badge milestones

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
