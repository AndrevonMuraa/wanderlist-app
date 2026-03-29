# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store. Social features, hybrid privacy, premium differentiation, 100 destinations, 1,500 landmarks.

## Architecture
- **Frontend**: React Native / Expo Router
- **Backend**: FastAPI / MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)

## Current State (March 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 74

### CRITICAL NOTES
- "Destinations" not "Countries", "Basic Traveler" not "Free user", "Premium Traveler" not "Pro user"
- `recalculate_user_points()` is SINGLE SOURCE OF TRUTH for points
- Diamond: teal #1E8A8A. Landmark: coral #E87850
- Custom visits: 0 points, optional country_id linking
- Privacy: visit detail enforces visibility + strips diary for non-owners

## Key Changes (March 28-29, 2026)

### New Features
- Custom Visits ↔ Destinations linking (autocomplete, country_id, "Your Custom Landmarks" section)
- Leaderboard: Top 10 + "Your Position" + Expand to compact Top 100
- Points Breakdown: Tappable Verified/Unverified → itemized list with navigation to visits
- Earning Potential section on Points Summary (replaces "Your Journey")
- Next Milestone card on Points Summary
- Explore "Your Progress" dashboard with 3 progress bars
- Visit Detail: "Add Photo to Verify" CTA + long-press to delete photos
- Ranks: Next rank shows progress bar + "X pts to unlock"
- Profile: "X pts to {NextRank}" under rank badge
- Subscription: "12,500 extra pts" value shown

### Bug Fixes
- Points consistency (continent bonuses in /api/progress, default values synced)
- Privacy enforcement on visit/country-visit detail endpoints
- Backend recalculates points after photo changes
- Rank always based on verified_points on leaderboard
- No flash of "Newcomer" on ranks page
- Photo limit enforced visually for basic users
- Messages "View All" respects subscription tier

### UI/UX
- My Landmark Visits + Destinations: Full redesign (list, thumbnails, sort, animations)
- "Countries" → "Destinations" throughout app
- "Free user" → "Basic Traveler" / "Pro user" → "Premium Traveler"
- Feed: Community tab default + first
- Diamond teal, Landmark coral consistency
- About stats box spacing
- Explore header: "Explore Destinations"
- Section subtitles with points

## Test Credentials
- test@wandermark.app / Test1234!
- testpro@wandermark.app / Test1234!

## Prioritized Backlog
### P0: Build 74 E2E testing, run recalculate_points.py on Render
### P1: Migration script for existing custom visits, Deploy legal pages
### P2: Sentry, Image optimization, Rename GitHub repo
