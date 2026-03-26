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
- **BuildNumber**: 73 (next: 74)

### CRITICAL NOTES FOR FUTURE AGENTS
- **ALWAYS check the actual DATABASE** for current state, not seed files
- **NO pre-filled images**: Landmarks and countries do NOT have stock/placeholder images. All images come from user-uploaded visit photos.
- **NO coordinates**: Landmarks do NOT have latitude/longitude.
- **Terminology**: Use "Destinations" (not "Countries") in all user-facing text
- **Points System**: `recalculate_user_points()` in `utils/helpers.py` is the SINGLE SOURCE OF TRUTH for points. `/api/stats` calls it on every request. All point values (landmarks, country visits, continent bonuses) must use 0 as default, not 10/15.
- **Diamond icon**: Always teal (#1E8A8A), never gold (#C9A961) — consistent with My Journey design

## What's Been Implemented

### Build 73 Fixes (March 26, 2026)
- Points system: `/api/stats` calls `recalculate_user_points()` for lazy recalculation
- Points system: `/api/progress` now includes continent bonuses + fixed defaults
- Points system: `update_visit` now sets `verified=true` when photos are added
- Visit list: Dynamic `verified` computation + `thumbnail_url` field in API
- My Landmark Visits: Full redesign with thumbnails, animated cards, sort chips, better stats/empty state
- Feed: Community tab is now default, placed first
- Terminology: All "Countries" → "Destinations" throughout app
- Diamond icon: Gold → teal on Profile page
- Build fixes: package-lock.json deleted, preview submit profile added to eas.json, search.tsx JSX syntax fixed

### Content Expansion (Complete - March 7, 2026)
- 100 countries, 1,500 landmarks, zero duplicates

### Activity Landmark Cleanup (Complete - March 10, 2026)
- 50 activity-based landmarks replaced with proper landmarks

### Points System Overhaul (Complete - March 10, 2026)
- Centralized `recalculate_user_points` function
- Country visits standardized to 50 pts

### All Other Features (Complete)
- Hybrid Privacy, Comments, Anti-Cheat, Social, Custom Visits, Landmark Visits, Country Visits
- Share My Journey Card, RevenueCat subscriptions, Push notifications
- Account deletion, Privacy Policy, Terms of Service

## Key API Endpoints
- `GET /api/stats` - User stats (triggers recalculate)
- `GET /api/progress` - User progress (calculated from visits)
- `GET /api/visits/list` - Lightweight visit list with thumbnails
- `POST /api/visits` - Create landmark visit
- `PUT /api/visits/{id}` - Update visit (sets verified when photos added)

## Prioritized Backlog
### P0 - Immediate
- Build 74 and verify all fixes
- Bump buildNumber to 74

### P1 - Upcoming
- Deploy Privacy Policy / Terms to live URL

### P2 - Future
- Sentry crash reporting
- Server-side image compression/resizing
- Rename GitHub repository (wanderlist-app -> wandermark-app)

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
- Premium: testpro@wandermark.app | Password: Test1234!
- Secondary: test2@wandermark.app | Password: Test1234!
