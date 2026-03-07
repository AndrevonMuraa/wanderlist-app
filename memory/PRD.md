# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store submission. Evolved to include social features, hybrid privacy system, comment/report moderation, premium differentiation, and profile improvements.

## Architecture
- **Frontend**: React Native with Expo Router
- **Backend**: FastAPI with MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)

## Current State (March 2026)
- **100 countries** across 5 continents (20 per continent)
- **1,500 landmarks** (1,000 official + 500 premium)
- **30,000 total achievable points** (22,500 landmarks + 1,500 country visits + 5,000 country bonuses + 1,000 continent bonuses)
- **20 ranks**: Newcomer, Wanderer, Scout, Explorer, Pathfinder, Adventurer, Voyager, Trailblazer, Navigator, Pioneer, Globetrotter, Nomad King, Horizon Chaser, Legend, Atlas, Titan, Sovereign, Mythic, Eternal, Transcendent
- **30+ badge types**: Milestone (10), Points (6), Social (4), Country mastery (4+), Continent mastery

### Continent Distribution (PERFECTLY BALANCED)
| Continent | Countries | Landmarks | Points |
|-----------|-----------|-----------|--------|
| Europe | 20 | 300 | 4,500 |
| Asia | 20 | 300 | 4,500 |
| Africa | 20 | 300 | 4,500 |
| Americas | 20 | 300 | 4,500 |
| Oceania & Island Paradises | 20 | 300 | 4,500 |

### Content Expansion (March 7, 2026)
**Expanded from 66 to 100 countries** with 1,500 landmarks (perfectly balanced):
- Added 36 new countries, 360 standard landmarks, 500 premium landmarks
- Removed: UAE (conflict), Tonga (least popular)
- Moved: Maldives, Mauritius, Seychelles to Oceania. Added Hawaii to Oceania
- Added: Saint Lucia to Americas
- Duplicate cleanup: Removed 8 exact + 46 near-duplicate premium landmarks, replaced with unique ones
- Added country images for all 54 new countries
- Upgraded rank system: 8 → 20 ranks (Newcomer to Transcendent) for 30K points
- Upgraded badge system: 17 → 30+ badges (milestone, points, social, country mastery, continent mastery)

### DB/Architecture Notes for Future Agents
- **ALWAYS check the actual DATABASE** for current state, not seed files
- Use: `python3 scripts/seed_expansion.py` for content migrations
- `countries_data.py` is the authoritative country list (100 countries)
- DB continent "Oceania" displays as "Oceania & Island Paradises" via frontend apiName mapping
- DB continent "Americas" is the standardized name (not "North America"/"South America")
- Frontend uses `apiName` field on continent objects to match backend stats

## What's Been Implemented

### Content Expansion (Complete - March 7, 2026)
- Expanded from 66 to 100 countries (20 per continent)
- Added 360 new standard landmarks (10 per new country)
- Added 233 new premium landmarks
- Removed UAE and Tonga
- Moved Maldives, Mauritius, Seychelles to Oceania
- Added Hawaii as Oceania destination
- Created authoritative `countries_data.py` with migration metadata
- Updated frontend continent display with apiName for proper stats matching
- Updated continent-stats API list capacity

### Admin Panel (Complete)
- Full admin section with dashboard, user management, report moderation, analytics, notifications, and promo codes

### Quick Visit Feature (Removed - March 7, 2026)
- QuickVisitButton removed from landmarks list and landmark detail pages

### Share My Journey Card (Complete - March 7, 2026)
- Premium shareable card with travel stats, rank badge, and branding

### App Audit Phases 1-4 (Complete)
- AddCountryVisitModal standardization, backend logging, UX improvements

### Performance (Complete)
- MongoDB aggregation pipelines, N+1 query fixes, caching

### All Other Features (Complete)
- Hybrid Privacy, Comments, Anti-Cheat, Social, Custom Visits, Landmark Visits, Country Visits

## Key API Endpoints
- `GET /api/continent-stats` - Dynamic continent statistics (returns 5 continents)
- `GET /api/countries?continent=X` - Countries filtered by continent
- `POST /api/visits` - Create visit
- All other endpoints unchanged

## DB Schema (Key Fields)
- **countries**: `country_id`, `name`, `continent` (Europe/Asia/Africa/Americas/Oceania)
- **landmarks**: `landmark_id`, `country_id`, `continent`, `category` (official/premium)
- **users**: `default_privacy`, `comment_permission`, `subscription_tier`

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
- Email: test2@wandermark.app | Password: Test1234!

## Prioritized Backlog
### P0 - None (all P0 items completed)
### P1 - Upcoming
- Deploy updated Privacy Policy / Terms to a live URL
- Bump iOS build number and prepare TestFlight build

### P2 - Future
- Rename GitHub repository (wanderlist-app -> wandermark-app)
- Add pull-to-refresh to remaining pages
- More comprehensive skeleton loading states

## Scripts Reference
- `backend/scripts/countries_data.py` - Authoritative 100-country list
- `backend/scripts/seed_expansion.py` - Content expansion migration
- `backend/scripts/expansion_landmarks_1.py` - Europe + Asia landmarks
- `backend/scripts/expansion_landmarks_2.py` - Africa landmarks
- `backend/scripts/expansion_landmarks_3.py` - Americas + Oceania landmarks
