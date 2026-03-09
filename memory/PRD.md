# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store submission. Evolved to include social features, hybrid privacy system, comment/report moderation, premium differentiation, and profile improvements.

## Architecture
- **Frontend**: React Native with Expo Router
- **Backend**: FastAPI with MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)
- **Backend routes**: Split into modular files (leaderboard, friends, messages, stats, feed + shared _social_common)

## Current State (March 2026)
- **100 countries** across 5 continents (20 per continent)
- **1,500 landmarks** (1,000 official + 500 premium)
- **30,000 total achievable points** (22,500 landmarks + 1,500 country visits + 5,000 country bonuses + 1,000 continent bonuses)
- **20 ranks**: Newcomer, Wanderer, Scout, Explorer, Pathfinder, Adventurer, Voyager, Trailblazer, Navigator, Pioneer, Globetrotter, Nomad King, Horizon Chaser, Legend, Atlas, Titan, Sovereign, Mythic, Eternal, Transcendent
- **30+ badge types**: Milestone (10), Points (6), Social (4), Country mastery (4+), Continent mastery
- **BuildNumber**: 70 (ready for TestFlight)

### Continent Distribution (PERFECTLY BALANCED)
| Continent | Countries | Landmarks | Points |
|-----------|-----------|-----------|--------|
| Europe | 20 | 300 | 4,500 |
| Asia | 20 | 300 | 4,500 |
| Africa | 20 | 300 | 4,500 |
| Americas | 20 | 300 | 4,500 |
| Oceania & other island paradises | 20 | 300 | 4,500 |

### CRITICAL NOTES FOR FUTURE AGENTS
- **ALWAYS check the actual DATABASE** for current state, not seed files
- **NO pre-filled images**: Landmarks and countries do NOT have stock/placeholder images. All images come from user-uploaded visit photos. Do NOT add Unsplash or stock URLs.
- **NO coordinates**: Landmarks do NOT have latitude/longitude. Do NOT add coordinates to seed data or DB.
- **Continent naming**: DB stores "Oceania". Frontend displays "Oceania" with subtitle "& other island paradises" on the card. Explore-countries page shows "Oceania and other Island Paradises" as section header.
- **Continent mapping**: DB "Americas" → frontend apiName "Americas". DB "Oceania" → frontend apiName "Oceania"
- **Oceania sorting**: Geographic Oceania countries appear first (Australia, NZ, Fiji, etc.), followed by transferred island paradises (Maldives, Hawaii, Seychelles, etc.)
- **Hawaii flag**: Uses `us-hi` (state flag), not `us` (USA flag). Guam uses `gu`.
- **Removed features**: QuickVisitButton was removed. Do not re-add.
- **Removed countries**: UAE (conflict zone) and Tonga (least popular) were removed. Do not re-add.
- **social.py was split**: Into leaderboard.py, friends.py, messages.py, stats.py, feed.py + _social_common.py. The old social.py no longer exists.
- **Points consistency**: `/api/stats` (user.points) and `/api/progress` (visits sum + country_visits sum) must always match. The progress endpoint sums BOTH visits and country_visits collections.

## What's Been Implemented

### Content Expansion (Complete - March 7, 2026)
- Expanded from 66 to 100 countries (20 per continent)
- 1,500 landmarks (1,000 official + 500 premium), zero duplicates
- Removed: UAE (conflict), Tonga (least popular)
- Moved: Maldives, Mauritius, Seychelles to Oceania. Added Hawaii, Guam to Oceania
- Added: Saint Lucia to Americas

### App Store Hardening (Complete - March 9, 2026)
- BuildNumber 70, CORS configurable, rate limiting (120/20 rpm), Error boundary
- All stock/placeholder images removed from DB and seed scripts
- MongoDB indexes added: countries.country_id, countries.continent, landmarks.continent

### Backend Refactoring (Complete - March 9, 2026)
- social.py (1,390 lines) split into 5 focused modules
- Old migration scripts cleaned up (10 one-time scripts deleted)
- Archive folder removed, test files cleaned

### Admin Panel (Complete)
- Dashboard, user management, report moderation, analytics, notifications, promo codes

### Rank System (Complete - 20 ranks)
- Frontend: utils/rankSystem.ts (20 ranks synced with backend)
- Backend: utils/helpers.py (20 rank thresholds + 30+ badge definitions)

### All Other Features (Complete)
- Hybrid Privacy, Comments, Anti-Cheat, Social, Custom Visits, Landmark Visits, Country Visits
- Share My Journey Card, RevenueCat subscriptions, Push notifications
- Account deletion, Privacy Policy, Terms of Service

## Key API Endpoints
- `GET /api/continent-stats` - 5 continents with counts and points
- `GET /api/countries?continent=X` - Countries filtered by continent
- `GET /api/landmarks?country_id=X` - Landmarks for a country
- `GET /api/progress` - User progress (points from visits + country_visits)
- `GET /api/stats` - User stats (points from user document)
- `POST /api/visits` - Create landmark visit
- `POST /api/country-visits` - Create country visit

## DB Schema (Key Fields)
- **countries**: `country_id`, `name`, `continent` (Europe/Asia/Africa/Americas/Oceania). No image_url.
- **landmarks**: `landmark_id`, `country_id`, `continent`, `category` (official/premium), `points`. No pre-filled image_url. No coordinates.
- **visits**: `user_id`, `landmark_id`, `points_earned`, `photo_url` (user-uploaded)
- **country_visits**: `user_id`, `country_id`, `points_earned`
- **users**: `points`, `leaderboard_points`, `default_privacy`, `subscription_tier`

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
- Email: test2@wandermark.app | Password: Test1234!

## Prioritized Backlog
### P1 - Upcoming
- Deploy Privacy Policy / Terms to live URL
- Build and submit to TestFlight (buildNumber 70)

### P2 - Future
- Deploy Privacy Policy / Terms HTML to live URL (GitHub Pages, Netlify, etc.)
- Sentry crash reporting (requires Sentry account + DSN key)
- Rename GitHub repository (wanderlist-app -> wandermark-app)
- Add pull-to-refresh to remaining pages

## Scripts Reference
- `backend/scripts/countries_data.py` - Authoritative 100-country list with migration metadata
- `backend/scripts/seed_expansion.py` - Content expansion migration (imports from expansion files)
- `backend/scripts/expansion_landmarks_1.py` - Europe + Asia landmark data (no images)
- `backend/scripts/expansion_landmarks_2.py` - Africa landmark data (no images)
- `backend/scripts/expansion_landmarks_3.py` - Americas + Oceania landmark data (no images)
- `backend/scripts/seed_data.py` - Original seeder (historical, no images)
- `backend/scripts/premium_landmarks.py` - Premium landmark data (no images)
