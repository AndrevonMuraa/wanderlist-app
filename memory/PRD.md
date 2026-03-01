# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a travel app where users visit landmarks and countries, earn points, and compete on leaderboards. The app uses React Native (Expo) for frontend and FastAPI for backend, with MongoDB Atlas as the database.

## Architecture
- **Frontend**: React Native with Expo Router, built via EAS
- **Backend**: FastAPI on Render (https://api.wandermark.app)
- **Database**: MongoDB Atlas
- **DNS**: Cloudflare/Namecheap for wandermark.app

## Three Visit Types
1. **Landmark Visits** (`db.visits` / `/api/visits`) - Official landmarks (797 total), gives points, verified with photos
2. **Country Visits** (`db.country_visits` / `/api/country-visits`) - Country-level visits, 50 pts, can be standalone or auto-created from landmark visits
3. **Custom Visits** (`db.user_created_visits` / `/api/user-created-visits`) - PRO feature, no points

## Points System
- Landmark visit: varies per landmark (~10 pts)
- Country visit: 50 pts
- Country bonus (first landmark in country): 20 pts
- **Verified points** (leaderboard_points): only with photos
- **Total points** (points): always awarded

## What's Been Implemented

### Session 1 (Previous)
- Full production migration (Render + MongoDB Atlas)
- Custom domain setup (api.wandermark.app)
- Security fix (leaked password rotated)
- Leaderboard overhaul (Global=Verified, Friends=Total)
- Legal document updates
- Repository cleanup (35+ files deleted)
- Build #54 successfully deployed to TestFlight

### Session 2 (Current - Feb 2026)
- **Backend: Auto-country-visit fix** - No longer copies landmark photos to auto-created country visits (visits.py)
- **Frontend: Allow visits without photos** - AddVisitModal now allows submitting without photo/diary, with alert about verified points (AddVisitModal.tsx)
- **Frontend: Removed "Did You Know?"** - Removed generic facts section from landmark detail (landmark-detail/[landmark_id].tsx)
- **Frontend: Smart Landmark FAB** - Split into "View Visit" + "Visited" buttons when already visited (landmark-detail/[landmark_id].tsx)
- **Frontend: Smart Country FAB** - Context-aware: shows "Add photos & diary" for auto-visits with landmarks, "View details" for visits with photos, "Tap to remove" only for standalone visits without landmarks (landmarks/[country_id].tsx)
- **Frontend: Visit Detail header fix** - Changed to oceanToSand gradient matching UniversalHeader, white background on cards for text visibility (visit-detail/[visit_id].tsx)
- **Backend: Feed photos** - Added photo_url to Activity model and feed API enrichment (models/all.py, routes/social.py)
- **Frontend: Feed photos** - Added photo display in feed cards (feed.tsx)

## Pending Deployment
All changes are in codebase but NOT yet deployed to production:
- Backend changes need Render redeploy
- Frontend changes need new EAS build (#55)

## Remaining P1 Tasks (from E2E testing)
1. Social page layout reorder (Leaderboard on top, Community Feed above Activity Feed)
2. Leaderboard colors (replace dark/purple with app theme colors)
3. Version number change (1.1.0 -> 1.0.0)
4. My Landmark Visits page (new page)
5. Clickable journey stats (Countries -> My Country Visits, Landmarks -> My Landmark Visits, Points -> Points Summary)
6. Points Summary page (new page)

## Remaining P2 Tasks
1. Privacy settings warning (verified points loss when choosing friends-only/private)
2. Retroactive privacy logic (switching public restores verified points)
3. Scroll position preservation on back navigation
4. Performance optimization
5. Rename GitHub repo (wanderlist-app -> wandermark-app)
6. App Store submission

## Key Files
- `backend/routes/visits.py` - Landmark visit creation + auto-country-visit
- `backend/routes/country_visits.py` - Country visit CRUD
- `backend/routes/social.py` - Feed + leaderboard
- `backend/models/all.py` - Data models
- `frontend/components/AddVisitModal.tsx` - Visit creation form
- `frontend/app/landmark-detail/[landmark_id].tsx` - Landmark page
- `frontend/app/landmarks/[country_id].tsx` - Country page
- `frontend/app/visit-detail/[visit_id].tsx` - Visit detail
- `frontend/app/feed.tsx` - Activity feed
- `frontend/app/(tabs)/social.tsx` - Social hub
- `frontend/app/leaderboard.tsx` - Leaderboard
- `frontend/styles/theme.ts` - Design system

## Test Credentials
- Email: test@wandermark.app
- Password: Test1234!
