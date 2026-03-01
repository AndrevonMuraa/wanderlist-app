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

### Current Session - P0 (Feb 2026)
- Backend: Auto-country-visit no longer copies landmark photos
- Frontend: Allow visits without photos (with verified points warning)
- Frontend: Removed "Did you know?" section from landmarks
- Frontend: Smart FAB on landmark and country pages
- Frontend: Visit Detail header consistency + white card backgrounds
- Backend+Frontend: Feed shows photos

### Current Session - P1 (Feb 2026)
- Social page reordered: Leaderboard top, Community Feed, then Activity Feed
- Leaderboard: Custom-styled filters (replaced react-native-paper dark/purple)
- Version 1.1.0 -> 1.0.0
- New pages: My Landmark Visits, Points Summary
- Journey stats clickable: Countries/Landmarks/Points/Rank navigate to relevant pages

### Current Session - P2 (Feb 2026)
- Privacy warning: Alert when selecting friends/private about global leaderboard impact
- Retroactive logic: Global leaderboard filters by default_privacy=public, switching back to public automatically restores visibility
- Scroll position preservation: useScrollRestore hook on journey + social tabs
- Performance: Database indexes on startup (users, visits, country_visits, activities, landmarks, friendships, likes, comments)
- Performance: React.memo and useMemo imports for heavy components

## Pending Deployment
All changes need: 1) Save to GitHub, 2) Deploy backend to Render, 3) New EAS build (#55)

## Remaining Tasks
1. Rename GitHub repo (wanderlist-app -> wandermark-app)
2. App Store submission preparation
3. Further performance profiling on real device

## Key Files Modified/Created This Session
- `backend/server.py` - Added startup index creation
- `backend/utils/db.py` - Added create_indexes function
- `backend/routes/visits.py` - Auto-country-visit fix
- `backend/routes/social.py` - Feed photos + leaderboard privacy filter
- `backend/models/all.py` - photo_url on Activity model
- `frontend/app/settings.tsx` - Privacy warning alerts
- `frontend/hooks/useScrollRestore.ts` - NEW: Scroll position hook
- `frontend/app/(tabs)/journey.tsx` - Scroll restore + clickable stats
- `frontend/app/(tabs)/social.tsx` - Reordered + scroll restore
- `frontend/app/leaderboard.tsx` - Custom filter styling
- `frontend/app/my-landmark-visits.tsx` - NEW
- `frontend/app/points-summary.tsx` - NEW
- `frontend/app/landmark-detail/[landmark_id].tsx` - Smart FAB + removed facts
- `frontend/app/landmarks/[country_id].tsx` - Smart FAB
- `frontend/app/visit-detail/[visit_id].tsx` - Header + text fix
- `frontend/app/feed.tsx` - Photo display
- `frontend/components/AddVisitModal.tsx` - Allow empty visits
- `frontend/app.json` - Version 1.0.0

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
