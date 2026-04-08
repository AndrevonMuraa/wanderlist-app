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

## Upcoming Tasks
- P0: Build 79 - test all changes (includes landmark visit photo action sheet)
- P1: Deploy juridiske sider (Privacy/Terms)
- P2: Sentry integration
- P3: Image optimization (server-side compression)
- P4: Rename GitHub repo to wandermark-app

## Completed (April 8, 2026 - Session 2)
- P1: "Add Photo" action sheet on visit-detail (landmark visits) matching country-visit-detail
  - Action sheet: Take Photo / Choose from Library / Cancel
  - ProFeatureLock for Basic users at photo limit ("Add More Photos" + PRO badge)
  - PhotoViewer (pinch-to-zoom, blur background) replaces old PhotoGalleryModal
  - Zoom hint overlay ("Tap to zoom")
  - Fixed ProFeatureLock feature prop: `multiple_photos` -> `unlimited_photos` on country-visit-detail
- Backend Visit CRUD: All endpoints tested and passing (16/16 tests passed)
