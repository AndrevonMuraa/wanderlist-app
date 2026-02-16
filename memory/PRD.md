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

### Authentication Flow
1. **Main screen**: Email input + "Send Login Code" (magic link) as primary
2. **Password login**: Available via "Use password instead" link
3. **Apple Sign-In**: Available on iOS devices
4. **Registration**: Available via "Don't have an account? Sign up" link

### What's Been Removed/Disabled
- **Google Sign-In**: Completely removed (user decision)
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

## Backlog / Future Tasks
- **P1**: Set up verified domain in Resend (currently limited to ricky.aarum@gmail.com)
- **P1**: Re-enable RevenueCat with production API key
- **P2**: Verify react-native-view-shot sharing works on device
- **P2**: Verify @react-native-picker/picker works on device
- **P3**: Clean up unused packages from package.json
- **P3**: Clean up app_backup directory

## Key Files
- `frontend/contexts/AuthContext.tsx` - Auth logic (Apple + Magic Link)
- `frontend/app/(auth)/login.tsx` - Login screen with magic link UI
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
