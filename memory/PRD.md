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

## Completed (April 10, 2026 - Session 2 continued)
### Community Features Overhaul
- **A: Photo of the Week backend** — Forbedret fallback: nåværende uke → forrige uke → tilfeldig fra oppstemte → tilfeldig populært → country_visits
- **B: Community Photos åpnet** — Alle brukere ser alle bilder (ikke bare 3). Premium-verdi: dagbok-tilgang (diary_locked for Basic)
- **C: Trending Landmarks** — Erstattet Photo of the Week på Explore-siden med horisontal karusell av mest fotograferte landemerker globalt
- Nytt backend-endepunkt: `GET /api/community-highlights` (global, topp 5 trender)
- Frontend: Landmark/Country community photos viser diary lock-ikon for Basic-brukere
- Backend testing: **39/39 tester bestått**

### Add Photo Action Sheet (Build 79)
- Action sheet (Take Photo / Choose from Library / Cancel) på landmark visit-detail
- ProFeatureLock for Basic-brukere ved fotogrense
- PhotoViewer (pinch-to-zoom) erstatter gammel PhotoGalleryModal
- Fikset ProFeatureLock feature-prop på country-visit-detail
- Backend testing: **16/16 tester bestått**
