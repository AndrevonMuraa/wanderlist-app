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
- Added `_layout.tsx` to 10 subdirectories (auth, admin, messages, add-visit, landmark-detail, visit-detail, country-visit-detail, landmark-community-photos, country-community-photos, landmarks)
- `safeGoBack()` utility still in place as additional safety

### About/Info Page Overhaul (Feb 2026)
- Updated all stats: 796 landmarks, 66 countries, 10,000 total points
- FAQ updated: privacy answer includes diary sharing, delete account references Settings, badges include Elite Explorer (250)
- Badge System: added streak badges (3→7→30 days) and Elite Explorer
- Contact Support: replaced form with simple email reference (support@wandermark.app), moved to bottom
- Version updated to 1.1.0, date to February 2026
- Removed unused code (TextInput, handleSendSupport, etc.)

### Subscription Page Update (Feb 2026)
- Free features: 700+ Official Landmarks, Community Photo Preview, Photo of the Week
- Pro features: 93 Premium Landmarks, Full Community Gallery, Photo Upvoting, Travel Diary Access, Direct Messaging, Share in Community Feed
- Corrected landmark counts throughout

### Delete Account (Feb 2026)
- Backend: `DELETE /api/auth/account` - deletes all user data across all collections
- Frontend: Settings page "Delete Account" button now functional with confirmation dialog

### Previous Work (Jan-Feb 2026)
- Critical crash fix: `router.back()` → `safeGoBack()` across 23+ files
- Landing page: "Compete & Climb" section
- Community features: Custom Visits in feed, visibility toggle, explorer endpoint
- Promo code system with editable email template
- All text translated from Norwegian to English
- EAS build process (v1.1.0, build 51)

## Prioritized Backlog

### P0 - Critical
- User E2E testing on TestFlight (back button, promo codes, community features)

### P1 - Important
- Verify all new changes on device (About page, subscription page, delete account)

### P2 - Future
- Rename GitHub repo: wanderlist-app → wandermark-app
- App Store release preparation
- Verify RevenueCat and statistics sharing on device

## Key API Endpoints
- `DELETE /api/auth/account` - Delete user account
- `GET/PUT/DELETE /api/admin/promo-codes/template` - Email template CRUD
- `PATCH /api/users/me/custom-visits/{visit_id}/visibility` - Toggle visibility
- `GET /api/social/community-custom-visits` - Explore custom visits
- `GET /api/continent-stats` - Continent statistics

## Credentials
- Email: test@wandermark.app
- Password: Test1234!
