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
- Root `_layout.tsx` changed from `<Slot />` to `<Stack />` - fixes iOS back button crash
- Added `_layout.tsx` to 10 subdirectories
- `safeGoBack()` utility still in place as additional safety

### Onboarding Fix (Feb 2026)
- `OnboardingFlow.tsx` slide 3: "Earn Achievements" → "Compete & Climb" with podium icon
- Landmark count updated to 796 in OnboardingFlow and welcome.tsx

### About/Info Page Overhaul (Feb 2026)
- Stats: 796 landmarks, 66 countries, 10,000 total points
- FAQ: privacy includes diary sharing, delete account references Settings with 30-day deactivation, badges include Elite Explorer (250)
- Badge System: streak badges (3→7→30 days), Elite Explorer added
- Contact Support: form replaced with simple email reference (support@wandermark.app), moved to bottom
- Version: 1.1.0, February 2026

### Subscription Page Update (Feb 2026)
- Free: 700+ Official Landmarks, Community Photo Preview, Photo of the Week
- Pro: 93 Premium Landmarks, Full Community Gallery, Upvoting, Diary, Messaging, Community Feed

### Account Deactivation System (Feb 2026)
- `DELETE /api/auth/account` deactivates for 30 days (not immediate delete)
- Auto-reactivation on login (password, Apple Sign-In, magic code)
- `POST /api/auth/account/purge-deactivated` for cleanup cron job
- Settings UI shows deactivation dialog with explanation
- Login returns `reactivated: true` if account was reactivated

### Previous Work (Jan-Feb 2026)
- Critical crash fix: `router.back()` → `safeGoBack()` across 23+ files
- Landing page: "Compete & Climb" section
- Community features: Custom Visits in feed, visibility toggle, explorer endpoint
- Promo code system with editable email template
- All text translated from Norwegian to English
- Persistent login via SecureStore (7-day token expiration)

## Prioritized Backlog

### P0 - Critical
- Save to GitHub and build EAS (build 52) for TestFlight testing
- User E2E testing: back button, onboarding, about page, deactivation flow

### P2 - Future
- Rename GitHub repo: wanderlist-app → wandermark-app
- App Store release preparation
- Set up cron job for purge-deactivated endpoint
- Verify RevenueCat on device

## Key API Endpoints
- `DELETE /api/auth/account` - Deactivate account (30-day grace period)
- `POST /api/auth/account/purge-deactivated` - Cleanup expired accounts
- `GET/PUT/DELETE /api/admin/promo-codes/template` - Email template CRUD
- `PATCH /api/users/me/custom-visits/{visit_id}/visibility` - Toggle visibility
- `GET /api/social/community-custom-visits` - Explore custom visits

## Credentials
- Email: test@wandermark.app
- Password: Test1234!
