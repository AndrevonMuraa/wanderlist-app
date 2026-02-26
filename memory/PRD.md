# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a React Native (Expo SDK 54) mobile travel app where users discover and track visits to iconic landmarks worldwide. Features include gamification (points, leaderboards), social features (friends, sharing), premium content (RevenueCat), and an admin panel.

## Architecture
- **Frontend:** React Native with Expo SDK 54, Expo Router (file-based routing)
- **Backend:** FastAPI (modular structure - refactored Feb 26, 2026)
  - `server.py` - Main app entry point (52 lines)
  - `routes/` - 15 route modules (auth, content, community, visits, admin, social, collections, notifications, country_visits, photos, achievements, subscription, reports, push, legal)
  - `utils/` - Shared utilities (auth.py, db.py, helpers.py)
  - `models/` - Pydantic models (all.py)
- **Database:** MongoDB
- **Email:** Resend (transactional emails from noreply@wandermark.app)
- **DNS:** Cloudflare (migrated from Namecheap BasicDNS)
- **Static Site:** GitHub Pages (wandermark.app - landing, privacy, terms)
- **Payments:** RevenueCat (in-app purchases)
- **Auth:** Apple Sign-In + email/password + Google Sign-In + Magic Link

## Content Stats
- **66 countries** across 5 continents
- **797 landmarks** (660 official + 137 premium)
- Every country has at least 10 official + 1-5 premium landmarks

## What's Been Implemented

### Core App
- Full landmark browsing, visiting, and tracking system
- Points, achievements, and leaderboard system
- Social features (friends via username search, sharing)
- Photo uploads with visits
- Travel diary and tips
- Privacy controls (public/friends/private)
- Premium subscription (RevenueCat)

### Admin System
- POST /api/admin/setup - Create first admin via secret key
- PUT /api/admin/users/{user_id} - Change user roles
- Frontend admin panel with role filtering and management

### Promo Code System (NEW - Feb 26, 2026)
- Admin can create, manage, activate/deactivate promo codes
- Supports both lifetime premium and time-limited premium (N days)
- **Batch-opprett**: Generer opptil 500 unike koder med prefiks (INFLUENCER-001, INFLUENCER-002, osv.)
- **CSV-eksport**: Last ned alle koder som CSV-fil for utsendelse
- **E-postutsendelse**: Send kampanjekoder direkte til bloggere/influencere med pen HTML e-postmal via Resend
- **Utsendelseshistorikk**: Se alle tidligere e-postkampanjer med dato, mottakere, koder, leveringsstatus
- Users redeem codes on subscription page
- Admin views who redeemed each code (full tracking)
- Backend: routes/promo.py | Frontend: subscription.tsx + admin/promo-codes.tsx

### Community Features
- **Community Photo Gallery** - Freemium model (3 photos free, all for premium)
- **Photo of the Week** - Most upvoted photo on explore page
- **Travel Diary Sharing** - Share diary notes with photos, privacy toggle
- **Advanced Gallery** - Sort by Most Liked/Newest, tabbed Photos/Diaries view
- **Community Highlights** - Top 3 most photographed landmarks per country
- **Community Feed** - Latest photos/diaries from all users on Social tab

### Backend Refactoring (COMPLETED - Feb 26, 2026)
- Refactored monolithic 5025-line server.py into modular structure
- 15 route files, 3 utility modules, 1 models module
- 33/33 API endpoint tests passed (100% regression test)

## Key API Endpoints

### Auth (routes/auth.py)
- POST /api/auth/register, /api/auth/login
- POST /api/auth/apple/callback, /api/auth/google/callback, /api/auth/google/token
- POST /api/auth/magic-link/send, /api/auth/magic-link/verify
- GET /api/auth/me, PUT /api/auth/profile, PUT /api/auth/privacy
- POST /api/auth/logout, GET /api/auth/temp-token

### Content (routes/content.py)
- GET /api/continent-stats, /api/countries, /api/landmarks
- GET /api/landmarks/{id}, /api/landmarks/search/query
- POST /api/landmarks

### Community (routes/community.py)
- GET /api/community-feed, /api/community-photos/photo-of-the-week
- GET /api/landmarks/{id}/community-photos, /api/countries/{id}/community-photos
- GET /api/countries/{id}/travel-diaries, /api/countries/{id}/community-highlights
- POST /api/community-photos/{id}/upvote

### Visits (routes/visits.py)
- GET /api/visits, /api/visits/stats, /api/visits/{id}
- POST /api/visits

### Admin (routes/admin.py)
- GET /api/admin/stats, /api/admin/users, /api/admin/reports, /api/admin/logs
- PUT /api/admin/users/{id}, /api/admin/reports/{id}
- POST /api/admin/notifications/send

### Social (routes/social.py)
- GET /api/leaderboard, /api/friends, /api/stats, /api/progress, /api/feed
- POST /api/friends/request, /api/activities/{id}/like, /api/activities/{id}/comment

### Other Routes
- collections.py: bucket-list, collections CRUD
- notifications.py: notification CRUD
- country_visits.py: country visits + user-created visits
- photos.py: photo collection
- achievements.py: achievements + badge checks
- subscription.py: subscription status/upgrade/cancel
- reports.py: report creation
- push.py: push token + settings management
- legal.py: privacy + terms pages

## Upcoming Tasks
- P0: Create EAS preview build for device testing
- P1: Verify RevenueCat, statistics sharing, and pickers on device

## 3rd Party Integrations
- Expo SDK 54
- Apple Authentication
- Resend (transactional email)
- RevenueCat (in-app purchases)
- Cloudflare (DNS + Email Routing)
- GitHub Pages (static site hosting)
