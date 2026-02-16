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
1. **Main screen**: Email input + "Send Login Code" (magic link) as primary
2. **Password login**: Available via "Use password instead" link
3. **Apple Sign-In**: Available on iOS devices
4. **Registration**: Available via "Don't have an account? Sign up" link

### What's Been Removed/Disabled
- **Google Sign-In**: Completely removed (user decision) — all code, UI, and styles cleaned
- **Dark Mode**: Completely removed — all isDark logic, darkColors, darkTheme.ts, darkShadows, helper functions cleaned
- **RevenueCat**: Set to MOCK mode (`MOCK_PURCHASES = true`)
- **Quick Test Login button**: Removed

### Key Configuration
- `newArchEnabled: true` in app.json
- `EXPO_PUBLIC_BACKEND_URL` in frontend/.env
- Hardcoded fallback URL in utils/config.ts
- `react-native-worklets@0.6.1` installed
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
    - Removed Google Login code, handler, button, and styles from register.tsx
    - Removed unused googleButton style from login.tsx
    - Removed unused Modal and gradients imports from login.tsx
    - Fixed shadows.card → shadows.md in login.tsx
    - Updated privacy-policy.tsx text (Google OAuth → Apple Sign-In)
    - Deleted styles/darkTheme.ts entirely
    - Removed darkColors, darkShadows, oceanToSandDark, getThemeColors, getThemeShadows, getGradientColors from theme.ts
    - Cleaned ThemeContext.tsx: removed isDark, themeMode, toggleTheme, setThemeMode, useIsDark, unused imports

## Backlog / Future Tasks
- **P0**: Create EAS build after cleanup for regression testing on device
- **P1**: Set up verified domain in Resend (currently limited to ricky.aarum@gmail.com)
- **P1**: Re-enable RevenueCat with production API key
- **P1**: Restore disabled features (statistics sharing, country/language pickers)
- **P2**: Verify react-native-view-shot sharing works on device
- **P2**: Verify @react-native-picker/picker works on device
- **P3**: Clean up unused packages from package.json
- **P3**: Clean up app_backup directory
- **P3**: Fix pre-existing TypeScript errors (shadows.card, backgroundSecondary in journey.tsx/profile.tsx)

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
- **Resend** - Email sending for magic link codes (free plan)
- **Expo SDK 54** - App framework
- **expo-apple-authentication** - Apple Sign-In
