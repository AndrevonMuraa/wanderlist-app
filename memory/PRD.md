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
3. **Custom Visits** (`db.user_created_visits` / `/api/user-created-visits`) - PRO, no points

## Points System
- Landmark visit: varies (~10 pts), Country visit: 50 pts, Country bonus: 20 pts
- **Verified** (leaderboard_points): only with photos
- **Total** (points): always awarded

## What's Been Implemented

### Previous Sessions
- Full production migration (Render + MongoDB Atlas)
- Custom domain (api.wandermark.app), Security fix, Legal updates
- Leaderboard overhaul (Global=Verified, Friends=Total)
- Repository cleanup, Build #54 deployed to TestFlight

### Current Session - P0 (Feb 2026)
- Backend: Auto-country-visit no longer copies landmark photos
- Frontend: Allow visits without photos (with verified points warning)
- Frontend: Removed "Did you know?" section from landmarks
- Frontend: Smart FAB on landmark detail (View Visit + Visited buttons)
- Frontend: Smart FAB on country page (context-aware: Add/Edit/Remove)
- Frontend: Visit Detail header consistency + white card backgrounds
- Backend: Feed API returns photo_url, Frontend: Feed shows photos

### Current Session - P1 (Feb 2026)
- Social page reordered: Leaderboard on top, Community Feed above Activity Feed
- Leaderboard: Custom-styled filters replacing react-native-paper SegmentedButtons/Chips
- Version number changed from 1.1.0 to 1.0.0
- New page: My Landmark Visits (`/my-landmark-visits`)
- New page: Points Summary (`/points-summary`)
- Journey stats now clickable: Countries→My Country Visits, Landmarks→My Landmark Visits, Points→Points Summary, Rank→Leaderboard

## Pending Deployment
All changes need: 1) Save to GitHub, 2) Deploy backend to Render, 3) New EAS build (#55)

## Remaining P2 Tasks
1. Privacy settings warning (verified points loss when choosing friends-only/private)
2. Retroactive privacy logic (switching to public restores verified points)
3. Scroll position preservation on back navigation
4. Performance optimization
5. Rename GitHub repo (wanderlist-app → wandermark-app)
6. App Store submission

## Key Files Modified This Session
- `backend/routes/visits.py`, `backend/routes/social.py`, `backend/models/all.py`
- `frontend/components/AddVisitModal.tsx`
- `frontend/app/landmark-detail/[landmark_id].tsx`
- `frontend/app/landmarks/[country_id].tsx`
- `frontend/app/visit-detail/[visit_id].tsx`
- `frontend/app/feed.tsx`
- `frontend/app/(tabs)/social.tsx`
- `frontend/app/(tabs)/journey.tsx`
- `frontend/app/leaderboard.tsx`
- `frontend/app.json`
- NEW: `frontend/app/my-landmark-visits.tsx`
- NEW: `frontend/app/points-summary.tsx`

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
