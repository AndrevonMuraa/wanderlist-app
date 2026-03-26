# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store submission. Social features, hybrid privacy system, premium differentiation, and 100 destinations across 5 continents with 1,500 landmarks.

## Architecture
- **Frontend**: React Native with Expo Router
- **Backend**: FastAPI with MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)

## Current State (March 2026)
- **100 destinations** across 5 continents (20 per continent)
- **1,500 landmarks** (1,000 official + 500 premium)
- **20 ranks**, **30+ badge types**
- **BuildNumber**: 73 (next: 74)

### CRITICAL NOTES
- Use "Destinations" (not "Countries") in all user-facing text
- `recalculate_user_points()` in `utils/helpers.py` is SINGLE SOURCE OF TRUTH for points
- Diamond icon: Always teal (#1E8A8A)
- Custom visits: 0 points, stored in `user_created_visits` collection with optional `country_id` linking
- `/api/progress` is the source for point display, `/api/stats` is lightweight (no recalculation)

## Key Features

### Custom Visits ↔ Destinations Linking (NEW - March 26, 2026)
- Custom visits can link to DB countries via `country_id` field
- Backend auto-matches `country_name` to DB countries on creation
- Frontend autocomplete dropdown for 100 DB countries in AddUserCreatedVisitModal
- Country Visit Detail shows "Your Custom Landmarks" section (PRO badge, teal diamond)
- Custom landmarks do NOT affect points, verified status, or progress counts

### Points System
- `/api/progress`: Calculates from visits + country_visits + continent bonuses (display source)
- `/api/stats`: Reads from `users` document (lightweight, no recalculation)
- `recalculate_user_points()`: Called on visit create/delete/update, updates `users.points`

### API Endpoints (New)
- `GET /api/user-created-visits/by-country/{country_id}` — Custom landmarks for a destination
- `GET /api/countries/names` — Lightweight autocomplete (100 countries)

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
- Premium: testpro@wandermark.app | Password: Test1234!

## Prioritized Backlog
### P0
- Build 74, verify all fixes, run recalculate_points.py on production

### P1
- Migration script for existing custom visits (set country_id where match exists)
- Deploy Privacy Policy / Terms

### P2
- Sentry, Image optimization, Rename GitHub repo
