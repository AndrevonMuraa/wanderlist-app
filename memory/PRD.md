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
- Bucket list bug fix (list → object)

### Custom Domain & Email
- Domain: wandermark.app (registered via Namecheap)
- DNS: Migrated to Cloudflare (Feb 25, 2026)
- Transactional email: Resend (noreply@wandermark.app)
- Email forwarding: Cloudflare Email Routing (support@wandermark.app → Gmail) — PENDING PROPAGATION

### Static Website (GitHub Pages)
- Landing page (index.html)
- Privacy Policy (privacy.html) - contact: support@wandermark.app
- Terms of Service (terms.html) - contact: support@wandermark.app

### Code Cleanup
- Removed Spanish i18n (es.json, language-settings.tsx)
- Removed unused map components (react-native-maps)
- Removed dead code (countryFacts.ts)

## Completed This Session (Feb 25, 2026)
1. ✅ Guided user through updating legal pages on GitHub (privacy.html, terms.html → support@wandermark.app)
2. ✅ Seeded preview database with full content (66 countries, 797 landmarks)
3. ✅ Fixed 15 countries missing official landmarks (Austria, Bahamas, Barbados, Cambodia, Croatia, Cuba, Denmark, Dominican Republic, Iceland, Jamaica, Nepal, Philippines, Sri Lanka, Sweden, Taiwan)
4. ✅ Added premium landmarks to 3 countries missing them (Brazil, Greece, South Africa)
5. ✅ Guided user through Cloudflare setup (account creation, domain connection, nameserver migration)
6. ✅ Set up Cloudflare Email Routing for support@wandermark.app → Ricky.aarum@gmail.com
7. ✅ All DNS records configured and verified (MX, SPF, DKIM)

## Pending / In Progress
- **P0: Cloudflare Email Routing propagation** — All config is correct but Cloudflare internal propagation pending. User will test tomorrow.
- **P0: New EAS build** — User needs a fresh build to test all accumulated changes on device
- **P1: Verify email forwarding works** — Send test email after propagation

## Upcoming Tasks
- **P1: Create EAS preview build** for device testing
- **P2: Verify RevenueCat, statistics sharing, and pickers on device**

## Key Files
- Backend: /app/backend/server.py
- Seed data: /app/backend/seed_data.py, seed_data_expansion.py, fix_and_expand.py, fix_missing_landmarks.py
- Legal pages: /app/backend/legal_pages.py
- Static site: /app/wandermark-site/
- Frontend admin: /app/frontend/app/(tabs)/admin/

## 3rd Party Integrations
- Expo SDK 54
- Apple Authentication
- Resend (transactional email)
- RevenueCat (in-app purchases)
- Cloudflare (DNS + Email Routing)
- GitHub Pages (static site hosting)
