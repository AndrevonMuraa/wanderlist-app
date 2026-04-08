# WanderMark PRD

## Product
Travel app (React Native + Expo + FastAPI + MongoDB Atlas) for tracking landmark/destination visits with a gamified points system.

## Current State (April 8, 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 78
- Backend: Render (auto-deploy from GitHub)
- Database: MongoDB Atlas

### CRITICAL NOTES
- "Destinations" not "Countries", "Basic Traveler" not "Free user", "Pro Traveler" not "Pro user"
- `recalculate_user_points()` is SINGLE SOURCE OF TRUTH for points
- Diamond: teal #1E8A8A. Landmark: coral #E87850. Destination: turkis #4DB8D8. Continent: green #4CAF50. Points: gold #FFD700
- Continent bonus verified = country_visit has photo OR at least one verified landmark
- Country visit verified = has photos OR has verified landmark in that country
- Completion bonuses: destination (+50, all landmarks visited, verified if all have photos), continent (+200, all destinations visited, verified if each has photo/verified landmark)

## Key Changes (April 7-8, 2026)

### Points System Overhaul
- Completion bonuses implemented (destination +50, continent +200) with verified/unverified logic
- Continent completion trigger: all destinations visited (not all landmarks)
- Breakdown endpoint synced with recalculate (verified country visits consider landmarks)
- New continent bonus from create_country_visit endpoint
- Earning Potential: 33,750 max (22,500 landmarks + 5,000 destinations + 250 continents + 6,000 completion)

### UX Improvements
- Edit Diary: bottom-sheet with KeyboardAvoidingView (all 3 detail pages)
- Photo buttons: single "Add Photo" action sheet, "Add More Photos" PRO upsell for Basic users
- PhotoViewer: minimalist redesign (blur background, no rotate/controls, pinch-to-zoom improved)
- User Profile: total makeover (Destinations Explored, consistent stat icons, no share/activity)
- Explore: removed search icon from header
- My Photos: "By Destination" filter, matching icon colors
- Visit cards: fixed 90px height on landmark/destination lists
- Cache invalidation on delete (both visit types)
- useFocusEffect on explore-countries for live data refresh
- Points Summary: reordered sections, "Destinations" in Earning Potential, Next Rank links to /ranks
- Friends search: keyboard stays open (renderHeader fix + keyboardShouldPersistTaps)
- Profile: PRO badge pill, Ionicons diamond for WanderMark Pro menu item
- About: compact stats box, "Destination Completion" terminology
- Consistent alert text (friends vs global leaderboard)

### Bug Fixes
- Custom Visits crash (ProFeatureLock import)
- Add visit 500 error (missing return statement)
- Continent bonus rsplit bug (DB lookup instead)
- Country visits not counted in progress/continent-stats
- Points breakdown verified/unverified mismatch

## Upcoming Tasks
- P0: Build 78 + test all changes
- P1: Implement "Add Photo" action sheet on visit-detail (landmark visits) matching country-visit-detail
- P1: Deploy juridiske sider (Privacy/Terms)
- P2: Sentry integration
- P3: Image optimization (server-side compression)
- P4: Rename GitHub repo to wandermark-app
