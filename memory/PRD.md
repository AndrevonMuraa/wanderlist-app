# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a React Native (Expo SDK 54) mobile travel app where users discover and track visits to iconic landmarks worldwide. Features include gamification (points, leaderboards), social features (friends, sharing), premium content (RevenueCat), and an admin panel.

## Architecture
- **Frontend:** React Native with Expo SDK 54, Expo Router (file-based routing)
- **Backend:** FastAPI (single server.py)
- **Database:** MongoDB
- **Email:** Resend (transactional emails from noreply@wandermark.app)
- **DNS:** Cloudflare (migrated from Namecheap BasicDNS)
- **Static Site:** GitHub Pages (wandermark.app - landing, privacy, terms)
- **Payments:** RevenueCat (in-app purchases)
- **Auth:** Apple Sign-In + email/password

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

### Privacy & Security
- Friend search: username-only (email search removed)
- Apple Sign-In: auto-generated usernames for new users
- Bucket list bug fix (list to object)

### Custom Domain & Email
- Domain: wandermark.app (registered via Namecheap)
- DNS: Migrated to Cloudflare (Feb 25, 2026)
- Transactional email: Resend (noreply@wandermark.app)
- Email forwarding: Cloudflare Email Routing (support@wandermark.app -> ricky.aarum@gmail.com) - ACTIVE

### Static Website (GitHub Pages)
- Landing page (index.html)
- Privacy Policy (privacy.html) - contact: support@wandermark.app
- Terms of Service (terms.html) - contact: support@wandermark.app

### Community Photo Gallery (NEW - Feb 26, 2026)
- **Landmark Community Photos:** Subpage from each landmark showing public photos from all users
- **Country Community Photos:** Subpage from each country showing all public photos across landmarks
- **Freemium Model:**
  - Free users: See top 3 photos + total count + upgrade CTA
  - Premium users: Full gallery access + upvoting capability
- **Photo Upvoting:** Premium-only feature, toggle-based (heart icon)
- **Removed:** Old landmark upvoting system (was redundant)

### Code Cleanup
- Removed Spanish i18n (es.json, language-settings.tsx)
- Removed unused map components (react-native-maps)
- Removed dead code (countryFacts.ts)
- Removed landmark upvoting (replaced by community photo system)

## Key API Endpoints

### Community Photos (NEW)
- GET /api/landmarks/{landmark_id}/community-photos - Get community photos for a landmark
- GET /api/countries/{country_id}/community-photos - Get community photos for a country
- POST /api/community-photos/{photo_id}/upvote - Toggle upvote (premium only)

### Auth & Users
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/apple/callback
- GET /api/users/me

### Admin
- POST /api/admin/setup
- PUT /api/admin/users/{user_id}

### Content
- GET /api/continent-stats
- GET /api/countries
- GET /api/landmarks/{landmark_id}
- GET /api/legal/privacy
- GET /api/legal/terms

### Social
- POST /api/users/friend-request (username only)
- GET /api/feed

## Key Files
- Backend: /app/backend/server.py
- Seed data: /app/backend/seed_data.py, seed_data_expansion.py, fix_and_expand.py, fix_missing_landmarks.py
- Legal pages: /app/backend/legal_pages.py
- Static site: /app/wandermark-site/
- Frontend admin: /app/frontend/app/(tabs)/admin/
- Landmark community photos: /app/frontend/app/landmark-community-photos/[landmark_id].tsx
- Country community photos: /app/frontend/app/country-community-photos/[country_id].tsx
- Landmark detail: /app/frontend/app/landmark-detail/[landmark_id].tsx
- Country landmarks: /app/frontend/app/landmarks/[country_id].tsx

## Verification Status
- Community Photo Gallery: VERIFIED (Feb 26, 2026) - Backend APIs + Frontend UI tested with simulated data
  - Freemium model confirmed: 3 photos for free users, all photos for premium
  - Upgrade CTA shows correct count ("+X more photos")
  - Upvote toggle works for premium, blocked (403) for free users
  - Both landmark and country galleries functional

## Upcoming Tasks
- P0: Create EAS preview build for device testing
- P1: Verify RevenueCat, statistics sharing, and pickers on device
- P2: Refactor server.py into modular structure (routes, models, services)

## 3rd Party Integrations
- Expo SDK 54
- Apple Authentication
- Resend (transactional email)
- RevenueCat (in-app purchases)
- Cloudflare (DNS + Email Routing)
- GitHub Pages (static site hosting)
