# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a React Native (Expo) travel landmark app. The user wanted to implement Social Logins, prioritizing Apple Sign-In. The project went through extensive debugging to resolve persistent app crashes on iOS, which were caused by incompatible native modules and an unstable Expo SDK 55 canary version.

## Tech Stack
- **Frontend**: React Native with Expo SDK 54, Expo Router
- **Backend**: FastAPI + MongoDB
- **Build System**: EAS Build (Expo Application Services)
- **Target**: iOS (TestFlight / Internal Distribution)

## Current State (Feb 14, 2026)

### What's Working
- Apple Sign-In (end-to-end, verified on device)
- Email/password login
- App launches successfully on iOS via EAS internal distribution
- New Architecture enabled (required by Reanimated v4)
- All core app features (explore, journey, profile, social tabs)
- Backend API fully operational
- Navigation: back buttons in Achievements and About correctly return to Profile

### What's Been Removed/Disabled
- **Google Sign-In**: Completely removed from UI and AuthContext (user's decision)
- **RevenueCat**: Set to MOCK mode (`MOCK_PURCHASES = true`) to prevent test API key dialogs
- **Quick Test Login button**: Removed from login screen

### Key Configuration
- `newArchEnabled: true` in app.json (required for Reanimated v4)
- `EXPO_PUBLIC_BACKEND_URL` in frontend/.env
- Hardcoded fallback URL in utils/config.ts
- `react-native-worklets@0.6.1` installed (Reanimated v4 dependency)
- EAS project linked: @aarum/wandermark (ID: 036fc505-c923-44f1-8759-f3737fb5749c)

## Completed Tasks
1. ✅ Apple Sign-In - full end-to-end implementation
2. ✅ Removed Google Sign-In completely
3. ✅ Fixed back navigation for Achievements and About pages
4. ✅ Removed Quick Test Login button
5. ✅ Fixed RevenueCat test API key dialog
6. ✅ Fixed EAS build (added react-native-worklets, enabled new arch)
7. ✅ Added detailed logging for Apple auth (frontend + backend)
8. ✅ Hardcoded fallback backend URL for reliability

## Backlog / Future Tasks
- **P1**: Re-enable RevenueCat with production API key
- **P2**: Restore react-native-view-shot sharing functionality (package installed, needs testing)
- **P2**: Verify @react-native-picker/picker works on device (used in suggest-landmark, add-country-visit)
- **P3**: Clean up unused Google auth imports (expo-auth-session still in package.json)
- **P3**: Remove package-lock.json (causes EAS build warnings)
- **P3**: Clean up app_backup directory

## Key Files
- `frontend/contexts/AuthContext.tsx` - Auth logic (Apple only)
- `frontend/app/(auth)/login.tsx` - Login screen
- `frontend/utils/config.ts` - Backend URL configuration
- `frontend/utils/purchases.ts` - RevenueCat (mocked)
- `frontend/components/UniversalHeader.tsx` - Navigation header
- `backend/server.py` - All API endpoints including Apple callback
