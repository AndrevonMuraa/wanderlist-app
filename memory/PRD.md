# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a React Native (Expo) travel landmark app. The project went through extensive debugging to resolve persistent app crashes on iOS caused by incompatible native modules and an unstable Expo SDK 55 canary version. After stabilizing on Expo SDK 54, the focus shifted to implementing social logins, improving authentication, and expanding content.

## Tech Stack
- **Frontend**: React Native with Expo SDK 54, Expo Router
- **Backend**: FastAPI + MongoDB
- **Build System**: EAS Build (Expo Application Services)
- **Email**: Resend (free plan, sending from onboarding@resend.dev)
- **Payments**: RevenueCat (production key appac9346b09b)
- **Target**: iOS (Internal Distribution via EAS)

## Current State (Feb 16, 2026)

### Content Stats
- **66 countries** across 5 continents (Africa:10, Americas:16, Asia:16, Europe:16, Oceania:8)
- **742 landmarks** (581 official @ 10pts, 155 premium @ 25pts)
- All continents have even country counts (optimized for 2-column grid layout)
- All 66 countries have premium landmarks
- 0 duplicates, 0 orphan landmarks

### What's Working
- Apple Sign-In (end-to-end, verified on device)
- Magic Link login (email code, verified on device)
- Email/password login (primary method)
- All core app features (explore, journey, profile, social tabs)
- Backend API fully operational
- RevenueCat payments (production key)
- Statistics sharing (react-native-view-shot)
- Country/language pickers (@react-native-picker/picker)
- Maps (react-native-maps)
- Light-only theme (dark mode fully removed)
- New Architecture enabled (Fabric)

### Authentication Flow
1. **Main screen**: Email + Password login as primary method
2. **Forgot password**: Magic link code sent to email
3. **Apple Sign-In**: Available on iOS devices
4. **Registration**: Available via "Don't have an account? Sign up" link

### What's Removed
- **Google Sign-In**: Completely removed
- **Dark Mode**: Completely removed

### Key Configuration
- `newArchEnabled: true` in app.json
- `EXPO_PUBLIC_BACKEND_URL` in frontend/.env
- `RESEND_API_KEY` in backend/.env
- EAS project: @aarum/wandermark (ID: 036fc505-c923-44f1-8759-f3737fb5749c)

## Completed Tasks
1. Apple Sign-In — full end-to-end implementation
2. Magic Link login — email code authentication via Resend
3. Removed Google Sign-In completely
4. Dark mode removal — disabled app-wide, locked to light theme
5. TypeScript Error Fix — Reduced TS errors from ~80+ to 0
6. Package & Compatibility Cleanup — Removed 5 unused packages
7. Login Redesign — Password login as primary, magic link as "Forgot password?"
8. Landmark Duplicate Cleanup — Removed 27 duplicate landmarks
9. RevenueCat re-enabled with production key
10. Statistics sharing and pickers re-enabled
11. react-native-maps installed
12. **Content Expansion (Feb 16, 2026)**:
    - Added 15+ new countries with 150+ landmarks
    - Added 3 countries (Finland, Maldives, Panama) to make even grids
    - Added premium landmarks to ALL 66 countries (155 total premium)
    - Fixed 6 orphan landmarks (country_name = None)
    - Fixed 57 official landmarks that had wrong points (25→10)
    - Added flag codes (ISO + emoji) for all 66 countries across 4 files
    - Added countryAccents and countryFacts for new countries
    - Updated all hardcoded counts (742+ landmarks, 66 countries, 150+ premium)
    - All verified by automated testing (21/21 tests passed)

## Backlog / Future Tasks
- **P0**: Create EAS build for regression testing on device
- **P1**: Verify re-enabled features on physical device (RevenueCat, sharing, maps)
- **P2**: Set up custom domain for Resend emails

## Key Files
- `frontend/app/explore-countries.tsx` - Country cards with flag images (COUNTRY_FLAG_CODES)
- `frontend/app/photo-collection.tsx` - Photo collection with emoji flags
- `frontend/app/country-visit-detail/[country_visit_id].tsx` - Country visit detail
- `frontend/app/my-country-visits.tsx` - Country visits with emoji flags
- `frontend/styles/theme.ts` - countryAccents colors
- `frontend/utils/countryFacts.ts` - Country fun facts
- `frontend/app/about.tsx` - About page with hardcoded counts
- `frontend/components/OnboardingFlow.tsx` - Onboarding with counts
- `frontend/app/welcome.tsx` - Welcome with counts
- `frontend/app/subscription.tsx` - Premium landmark counts
- `frontend/components/ProFeatureLock.tsx` - Premium feature lock text
- `frontend/contexts/AuthContext.tsx` - Auth logic
- `backend/server.py` - Full API backend

## Key API Endpoints
- `/api/auth/login`: Email/password authentication
- `/api/auth/register`: User registration
- `/api/auth/magic-login`: Forgot password email
- `/api/auth/apple/callback`: Apple Sign-In
- `/api/countries`: Get all countries with landmark counts
- `/api/landmarks`: Get landmarks (filter by country_id, category, etc.)
- `/api/progress`: User progress data

## DB Schema
- `countries`: {country_id, name, continent, flag}
- `landmarks`: {landmark_id, country_id, country_name, continent, name, description, difficulty, category, points, ...}
- `users`: {user_id, email, password_hash, apple_user_id, magic_token, ...}
- `visits`: Links users to landmarks
