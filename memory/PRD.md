# WanderMark PRD

## Product Overview
WanderMark is a gamified travel app where users visit landmarks, earn points, compete on leaderboards, and share their travel experiences. React Native (Expo Router) + FastAPI + MongoDB Atlas.

## Current State (April 11, 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 82
- Backend: Render (auto-deploy from GitHub)
- Database: MongoDB Atlas

### CRITICAL NOTES
- "Destinations" not "Countries", "Basic Traveler" not "Free user", "Pro Traveler" not "Pro user"
- `recalculate_user_points()` is SINGLE SOURCE OF TRUTH for points
- Sentence case everywhere (not Title Case)
- Global leaderboard requires verified (photo) for ALL 3 categories (points, landmarks, destinations)
- Friends leaderboard shows all (verified + unverified)

## Test Accounts
- **Admin (superadmin)**: test@wandermark.app / Test1234! (role: admin, tier: free)
- **Pro user**: testpro@wandermark.app / Test1234! (role: user, tier: free — use admin test-toggle for pro)
- **Moderator**: mod@wandermark.app / Test1234! (role: moderator, tier: free)

## Completed (Session 3 — April 11, 2026)

### Features
- Community Hub page (`community.tsx`) — Trending landmarks, recent photos, most popular
- "Community highlights" on Explore → links to Community Hub
- "Explore community" link on Social tab
- ShareVisitCard (visual share card for all visit types with privacy respect)
- Bug report system (About → "Report an issue" → modal with text + screenshots → `bug_reports` collection)
- User blocking (block/unblock, friend request prevention, search hiding, minimal profile)
- Photo gallery on user profiles (privacy-filtered recent photos)

### Leaderboard
- Anti-cheat: Global landmarks/destinations now require `verified: true` (photo proof)
- Friends leaderboard unchanged (trust)
- Time Period removed (overflødig)
- Category icons match Journey colors (star gold, location coral, flag teal)
- Entry cards komprimert ~40% (full username visible)
- Share card overflow fix (width: 100%)
- "Verified" label on global, category names on friends

### Admin
- Bug reports tab in admin Reports (superadmin only)
- Blocks overview tab in admin Reports
- Test-toggle restricted to admin role
- Moderator user created (mod@wandermark.app)

### About & Help
- Key Features: Added Point system + Leaderboard, fixed Custom visits icon/route
- Removed duplicate Rank System from Game Mechanics
- "Custom visits" added to FAQ photos list
- "Total points = verified + unverified" clarification
- Bug report link under "Need help?"
- Icons match Journey page colors

### UX Polish
- Keyboard handling: returnKeyType on ALL TextInputs across app (edit-profile, login, register, search, subscription)
- Bio field: "Done" button for multiline
- Social Friends section: whitespace komprimert
- Leaderboard rank box komprimert
- Stats boxes: 4-column layout (Visited | Verified | Total pts | Verified pts) on both my-landmark-visits and my-country-visits
- Photo section: removed black background, reduced card padding
- Subscription page: updated features list (removed outdated, added current)
- Diary limit: proper error handling with "Diary limit" alert

### Code Quality
- Community photos open for all (diary locked for basic)
- Photo of the Week: improved fallback + country_visits
- formatTimeAgo consolidated to utils/formatTime.ts
- getToken consolidated to utils/token.ts
- countryFlags consolidated to utils/countryFlags.ts
- console.log removed (65 statements)
- Unused components/utils deleted
- Backend imports cleaned
- "country" → "destination" terminology in code

### Bugfixes
- photo-collection crash (missing `height` in Dimensions)
- ranks crash (missing ActivityIndicator import)
- user-profile crash (invalid `ban` Ionicons name)
- my-country-visits crash (missing `countryFlags` import)
- Import paths fixed (token, countryFlags)
- explore-countries broken multi-line import

## Upcoming Tasks
- P0: Build 82 E2E testing
- P1: Deploy legal pages (Privacy/Terms)
- P2: Sentry integration
- P3: Server-side image compression
- P4: Rename GitHub repo
