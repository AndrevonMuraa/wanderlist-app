# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a React Native (Expo) travel landmark app. The project went through extensive debugging to resolve persistent app crashes on iOS caused by incompatible native modules and an unstable Expo SDK 55 canary version. After stabilizing on Expo SDK 54, the focus shifted to implementing social logins and improving the authentication experience.

## Tech Stack
- **Frontend**: React Native with Expo SDK 54, Expo Router
- **Backend**: FastAPI + MongoDB
- **Build System**: EAS Build (Expo Application Services)
- **Email**: Resend (free plan, sending from onboarding@resend.dev)
- **Target**: iOS (Internal Distribution via EAS)

## Current State (Feb 16, 2026)

### What's Working
- Apple Sign-In (end-to-end, verified on device)
- Magic Link login (email code, verified on device)
- Email/password login
- App launches successfully on iOS
- New Architecture enabled (required by Reanimated v4)
- All core app features (explore, journey, profile, social tabs)
- Backend API fully operational
- Navigation: back buttons in Achievements and About correctly return to Profile
- Light-only theme (dark mode fully removed)

### Authentication Flow
1. **Main screen**: Email + Password login as primary method
2. **Forgot password**: Magic link code sent to email (accessed via "Forgot password?" link)
3. **Apple Sign-In**: Available on iOS devices
4. **Registration**: Available via "Don't have an account? Sign up" link

### What's Removed
- **Google Sign-In**: Completely removed
- **Dark Mode**: Completely removed

### Previously "Disabled" Features — Now Verified Active
- **Statistics Sharing** (`ShareStatsCard`): Active in profile, uses `react-native-view-shot` + `expo-sharing`
- **Country Picker** (`@react-native-picker/picker`): Active in `suggest-landmark` and `add-country-visit`
- Both packages verified compatible with Expo SDK 54 + New Architecture via `expo-doctor`

### Key Configuration
- `newArchEnabled: true` in app.json
- `EXPO_PUBLIC_BACKEND_URL` in frontend/.env
- Hardcoded fallback URL in utils/config.ts
- `react-native-worklets@0.5.1` installed
- `RESEND_API_KEY` in backend/.env
- EAS project: @aarum/wandermark (ID: 036fc505-c923-44f1-8759-f3737fb5749c)

## Completed Tasks
1. Apple Sign-In — full end-to-end implementation
2. Magic Link login — email code authentication via Resend
3. Removed Google Sign-In completely
4. Fixed back navigation for Achievements and About pages
5. Removed Quick Test Login button
6. Fixed RevenueCat test API key dialog
7. Fixed EAS build (react-native-worklets, new arch)
8. Detailed logging for Apple auth (frontend + backend)
9. Hardcoded fallback backend URL
10. Dark mode removal — disabled app-wide, locked to light theme
11. Fixed settings page crash (ReferenceError from isDark removal)
12. **Code Cleanup (Feb 16, 2026)** — Comprehensive dead code removal:
    - Removed all Google Login code, handlers, buttons, and styles
    - Removed all dark mode code (darkTheme.ts, darkColors, darkShadows, helper functions, isDark, etc.)
    - Cleaned ThemeContext.tsx to light-only provider
    - Updated privacy-policy.tsx text
    - Fixed dead references in auto-login.tsx (refreshAuth → refreshUser)
13. **TypeScript Error Fix (Feb 16, 2026)** — Reduced TS errors from ~80+ to 1:
    - Added missing theme properties (backgroundSecondary, accentLight, accentDark, ocean, surfaceVariant)
    - Added missing shadow `card` and borderRadius `full` to theme.ts
    - Added missing styles (shareButton, photoCountBadge, photoCountText, headerRight)
    - Fixed User interface (subscription_tier, role) and register function type in AuthContext
    - Fixed Comment type conflict between CommentsSection and CommentItem
    - Fixed UpgradeModal props (added reason)
    - Fixed Expo Notifications API type changes
    - Fixed LinearGradient overload issues
    - Fixed Expo Router dynamic route typing
    - Fixed OfflineContext, performance.ts, landmarks Set typing
    - Fixed leaderboard RankBadge usage (wrong props)
    - Only remaining: react-native-maps missing type declarations (native-only module)
14. **Package & Compatibility Cleanup (Feb 16, 2026)**:
    - Removed 5 unused packages: `expo-auth-session`, `react-native-dotenv`, `zustand`, `expo-camera`, `expo-symbols`
    - Removed stale `package-lock.json` (project uses yarn)
    - Downgraded `react-native-worklets` from 0.6.1 to 0.5.1 (Expo SDK 54 recommended)
    - `expo-doctor` 17/17 checks passed — all packages compatible
    - Confirmed `react-native-view-shot` and `@react-native-picker/picker` are active and compatible
15. **Login Redesign (Feb 16, 2026)**: Password login as primary, magic link moved to "Forgot password?"

17. **Landmark Duplicate Cleanup (Feb 16, 2026)**:
    - Removed 27 duplicate landmarks across 17 countries (560 → 533)
    - Migrated 7 visits and 7 activities to correct landmark IDs before deletion
    - Key duplicates: Pompeii/Pompeii Ruins, Karnak Temple/Complex, Meteora/Monasteries, etc.
    - Verified: 0 duplicate IDs, 0 substring duplicates remaining (except intentional different places)

## Backlog / Future Tasks
- **P0**: Create EAS build for regression testing on device (covers all session changes)
- **P1**: Set up verified domain in Resend
- **P1**: Re-enable RevenueCat with production API key

## Key Files
- `frontend/contexts/AuthContext.tsx` - Auth logic (Apple + Magic Link)
- `frontend/contexts/ThemeContext.tsx` - Theme provider (light-only)
- `frontend/app/(auth)/login.tsx` - Login screen with magic link UI
- `frontend/app/(auth)/register.tsx` - Registration screen
- `frontend/styles/theme.ts` - Design system (light theme only)
- `frontend/utils/config.ts` - Backend URL configuration
- `frontend/utils/purchases.ts` - RevenueCat (mocked)
- `backend/server.py` - All API endpoints including magic link
- `backend/.env` - RESEND_API_KEY, MONGO_URL

## API Endpoints
- `POST /api/auth/magic-link/send` - Send 6-digit code to email
- `POST /api/auth/magic-link/verify` - Verify code and login
- `POST /api/auth/apple/callback` - Apple Sign-In callback
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - User registration

## 3rd Party Integrations
- **Expo SDK 54**: Core framework
- **Apple Authentication** (`expo-apple-authentication`): For Apple Sign-In
- **Resend**: For delivering magic link emails (free plan)
