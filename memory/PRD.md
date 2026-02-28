# WanderMark - Product Requirements Document

## Problem Statement
WanderMark is a travel companion app (React Native + FastAPI) for discovering and tracking visits to 796 landmarks across 66 countries and 5 continents. Features include community sharing, points/leaderboards, badges, messaging, and custom visits.

## Core Architecture
- **Frontend**: React Native with Expo SDK 54, Expo Router v6
- **Backend**: FastAPI (modular routes structure)
- **Database**: MongoDB
- **Integrations**: Resend (email), RevenueCat (IAP), React Native WebView

## What's Been Implemented

### Navigation Fix (Feb 2026)
- Root `_layout.tsx`: `<Slot />` → `<Stack />` (fixes iOS back button crash)
- Added `_layout.tsx` to 10+ subdirectories
- `safeGoBack()` utility as additional safety layer

### Onboarding Fix (Feb 2026)
- `OnboardingFlow.tsx` slide 3: "Earn Achievements" → "Compete & Climb"
- Landmark count updated to 796

### About/Info Page Overhaul (Feb 2026)
- Stats: 796 landmarks, 66 countries, 10,000 total points
- FAQ: privacy with diary sharing, badges with Elite Explorer (250), delete account with 30-day deactivation, streak badges
- Contact Support: simple email reference (support@wandermark.app) at bottom
- Version: 1.1.0, February 2026

### Subscription Page Update (Feb 2026)
- Free: 700+ Official Landmarks, Community Photo Preview, Photo of the Week
- Pro: 93 Premium, Full Gallery, Upvoting, Diary, Messaging, Community Feed

### Account Deactivation System (Feb 2026)
- `DELETE /api/auth/account` deactivates for 30 days
- Auto-reactivation on all login methods (password, Apple, magic code)
- `POST /api/auth/account/purge-deactivated` for cleanup
- Settings UI with deactivation dialog

### Statistics Page Fix (Feb 2026)
- Moved to `(tabs)/statistics.tsx` — bottom tab bar now visible
- Continent Progress: uses real API data instead of hardcoded world-country counts
- Fun Facts: "explored X% of WanderMark countries" instead of "countries in the world"
- Removed fake Category Breakdown (was using Math.random())

### Journey Page Fix (Feb 2026)
- Added "Elite Explorer" (250) to milestone list
- Updated comment to 796 total landmarks

### Previous Work (Jan-Feb 2026)
- Landing page: "Compete & Climb" section
- Community features, promo code system, email templates
- All text translated from Norwegian to English
- Persistent login via SecureStore (7-day token)

### Leaderboard Anti-Cheat System Overhaul (Feb 2026)
- **Forslag 1 - Bonus-fiks**: Kontinent/land bonuser (`+50`, `+200` pts) tildeler nå `leaderboard_points` når besøk har bilder
- **Forslag 2 - Differensiert leaderboard**: Global = `leaderboard_points` (anti-juks), Friends = `points` (tillit). UI viser begge verdier med info-banner
- **Forslag 3 - Retroaktiv beregning**: Admin-endepunkt `POST /api/admin/recalculate-leaderboard-points` scanner alle besøk og beregner korrekt `leaderboard_points`

## Prioritized Backlog

### Production Hosting Migration (Feb 2026)
- MongoDB Atlas (M0 Free, Stockholm/eu-north-1) configured and seeded with 797 landmarks, 66 countries
- Render.com ($7/mnd Starter) deployed from GitHub, auto-deploy enabled
- Backend URL: `https://api.wandermark.app` (custom domene via Cloudflare CNAME → Render)
- SSL fix: certifi + tlsAllowInvalidCertificates for Render ↔ Atlas
- bcrypt pinned to 4.0.1 for passlib compatibility
- Frontend config.ts updated to point to Render
- Build number bumped to 54

### P0 - Critical
- Save to GitHub and build EAS #54 with new Render backend URL
- E2E testing of new build on TestFlight
- Test: login, landmarks, visits, leaderboard, navigation

### P1 - Important
- Sett opp custom domene: api.wandermark.app → Render (via Cloudflare)
- Oppdater privacy/terms of service for App Store-krav

### P2 - Future
- Rename GitHub repo: wanderlist-app → wandermark-app
- App Store release preparation
- Set up cron job for purge-deactivated endpoint
- Verify RevenueCat on device

## Key API Endpoints
- `DELETE /api/auth/account` - Deactivate account (30-day grace)
- `POST /api/auth/account/purge-deactivated` - Cleanup expired accounts
- `GET /api/continent-stats` - Real continent statistics
- `GET/PUT/DELETE /api/admin/promo-codes/template` - Email template
- `PATCH /api/users/me/custom-visits/{visit_id}/visibility` - Toggle visibility

## Credentials
- Email: test@wandermark.app
- Password: Test1234!
