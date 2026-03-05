# WanderMark - Product Requirements Document

## Original Problem Statement
WanderMark is a travel app where users visit landmarks and countries, earn points, and compete on leaderboards. React Native (Expo) frontend, FastAPI backend, MongoDB Atlas database.

## Architecture
- **Frontend**: React Native with Expo Router, built via EAS
- **Backend**: FastAPI on Render (https://api.wandermark.app)
- **Database**: MongoDB Atlas
- **DNS**: Cloudflare/Namecheap for wandermark.app

## Three Visit Types
1. **Landmark Visits** (`db.visits` / `/api/visits`) - Official landmarks (797), gives points, verified with photos
2. **Country Visits** (`db.country_visits` / `/api/country-visits`) - 50 pts, standalone or auto-created from landmarks
3. **Custom Visits** (`db.user_created_visits` / `/api/user-created-visits`) - PRO feature, no points

## Points System
- Landmark visit: varies (~10 pts), Country visit: 50 pts, Country bonus: 20 pts
- **Verified** (leaderboard_points): only with photos + public privacy
- **Total** (points): always awarded
- Global leaderboard: excludes users with private/friends privacy settings

## What's Been Implemented

### Previous Sessions
- Full production migration (Render + MongoDB Atlas)
- Custom domain (api.wandermark.app), Security fix, Legal updates
- Leaderboard overhaul (Global=Verified, Friends=Total)
- Repository cleanup, Build #54 deployed to TestFlight

### Session Feb 2026 (Build #56) - P0/P1/P2
- Backend: Auto-country-visit no longer copies landmark photos
- Frontend: Allow visits without photos (with verified points warning)
- Frontend: Removed "Did you know?" section from landmarks
- Frontend: Smart FAB on landmark and country pages
- Social page reordered: Leaderboard top, Community Feed, then Activity Feed
- Leaderboard: Custom-styled filters
- New pages: My Landmark Visits, Points Summary
- Journey stats clickable
- Privacy warning when changing settings
- Scroll position preservation
- Database indexes

### Session Mar 2026 - E2E-2 Fixes
- **Badge icons**: Fixed broken icons (grey circles with text) → Ionicons with proper colors
- **Achievements page**: Fixed tab visibility (white text on active solid background)
- **My Landmark Visits**: Fixed auth token key (`token` → `auth_token`)
- **Points Summary**: Fixed auth token key (`token` → `auth_token`)
- **Visit model**: Added `landmark_name` and `country_name` fields
- **Visits endpoint**: Enriches visits with landmark names retroactively
- **Explore progress bars**: Shown on ALL continent cards
- **Journey page restructured**:
  - Removed "Your Top Continent" (redundant)
  - Moved link lines above "Recent Achievements" below "Continental Progress"
  - Added links: My Landmark Visits, Achievements & Badges, Points Summary
  - Badge count clickable → /achievements
  - "View All Badges" → /achievements (was /profile)
  - Replaced "Recent Visits" list with visual carousel (photos + cards)
  - Carousel placed under "Overall Progress" section
- **Country visit detail**:
  - Removed three-dots menu from header
  - Added "No photos" empty state with "Add Photos" button
  - Added "Visited Landmarks" list at bottom
  - **Photo management**: Add photos, remove individual photos (via ImagePicker)
- **Country visit photos migration**: Backend endpoint to clean auto-created visit photos
- **My Country Visits**: Auto-triggers migration on page load
- **Visit detail page**: UniversalHeader, theme.colors.surface cards, country subtitle
- **Social page**: Removed duplicate leaderboard, vertical community feed layout
- **Leaderboard**: Context-aware back navigation
- **Badge logic**: Added milestone_250

### Session Mar 2026 - Photo Management + Carousel
- **Country visit photo editing**: Full CRUD - add photos (ImagePicker), remove individual photos, backend PUT endpoint with proper leaderboard points handling
- **Recently Visited carousel**: Horizontal scrollable photo cards replacing old text-only list, placed under Overall Progress. Visits without photos show "Add Photo" prompt with camera icon
- **Next Milestone icon**: Changed from `flag-outline` to `rocket` for better visual impact
- **Next Milestone section verified**: Retroactive, uses same milestones as badge system (10, 25, 50, 100, 200, 250, 350, 500), names match BADGE_DEFINITIONS exactly

### Session Mar 2026 - Streak Removal + Continents Stat
- **Streak fully removed** from all active code paths (~15 files):
  - Backend: Removed streak calculation from visits, streak badges (streak_3/7/30), streak leaderboard category, streak push reminders
  - Frontend: Replaced streak stat with "Continents" (X/7), removed streak from leaderboard filters, celebration messages, notification settings
- **"Continents" stat added**: Shows X/7 continents visited, links to continents page
- **DB fields kept** (current_streak, longest_streak) with default 0 for backward compatibility

### Session Mar 2026 - Country Card Progress Bars
- **Enhanced country card info bar**: Replaced single-line points display with two-line layout:
  - Row 1: Points (left) + landmark progress count with location icon (right), always visible even at 0
  - Row 2: Thin progress bar spanning full width, green when 100% complete
- Card height increased from 160 to 170px to accommodate the new layout

### Session Mar 2026 - Terminology & Share Overhaul
- **"Achievements" → "Badges" terminology standardized**: All user-facing text across the entire app now says "Badges" instead of "Achievements". Updated i18n strings, page titles (Badges page), about page, notification settings ("Badge Alerts"), analytics ("Badge Collector"), share messages ("Badges Unlocked"), push notification title ("Badge Unlocked!"), celebration message ("BADGE UNLOCKED!"), privacy policy, and legal pages. Internal variable/function names preserved to avoid breaking changes.
- **Share functionality overhauled**: All share messages now include `https://wandermark.app` link. Added new `shareBadge` and `shareCountryVisit` utility functions. Standardized share format across visit detail, country visit detail, profile "Share My Journey", and progress sharing.
- **"Share My Badges" button added**: New share functionality on the Badges page allowing users to share their badge progress with friends.
- **Profile menu simplified**: Removed redundant "Badges" link from Profile menu (now accessible from Journey page).
- **Badges page back navigation**: Updated to navigate back to Journey page instead of Profile page.
- **About page fixes**: Version number in App Info section now dynamic (was hardcoded "1.1.0"), "Last Updated" corrected to "March 2026".

### Session Mar 2026 - Badge Icons & Colors Overhaul
- **5 problematic badge icons fixed**:
  - Adventurer (25 visits): `trending-up` → `footsteps` (more thematic)
  - Ultimate Explorer (500 visits): `ribbon` → `flash` (more prestigious for top badge)
  - Point Collector (500 pts): `radio-button-on` → `aperture` (less generic)
  - Point Legend (5000 pts): `sparkles` → `thunderstorm` (differentiated from Point Master)
  - Social Butterfly (25 friends): `flower` → `people-circle` (more social)
- **Graduated badge color system**: Each badge tier now has a unique color reflecting prestige level:
  - Milestones: Green (#4CAF50) → Teal → Blue → Indigo → Purple → Amber → Deep Orange → Gold (#FFD700)
  - Points: Green (#43A047) → Amber → Dark Amber → Gold
  - Social: Purple (#AB47BC) → Dark Purple → Pink (#E91E63)
- **Share Individual Badge feature**: Each earned badge card now has a "Share" button that shares the badge name, description, earned date, and wandermark.app link. Progress bars on locked badges now use badge-specific colors instead of generic primary color.

### Session Mar 2026 - Points System Audit & Next Milestone Badge Icon
- **Next Milestone badge icon**: Added badge-specific icon in a 68px colored circle on the right side of the milestone card. Rocket icon preserved on the left. Uses getBadgeIconName/getBadgeColor utilities for consistent styling.
- **About page "Total Points" corrected**: Changed from "10,000" to "14,500+" to reflect actual total (landmark pts 10,025 + country visits 3,300 + country bonuses 1,320). Font size reduced to 18px to prevent text wrapping.
- **Welcome page point values FIXED (CRITICAL)**: Previous values were completely fabricated (100, 50, 75, 25 pts). Corrected to match actual backend logic: Landmark +10 pts, Premium +25 pts, Country visit +50 pts, New country bonus +20 pts. Rank ranges also corrected.
- **About page Points System & FAQ expanded**: Added all bonus types (country exploration 20, continent exploration 50, country completion 50, continent completion 200).
- **rankSystem.ts comment updated**: Reflects correct total ~15,900 pts for 797 landmarks.

## Current App Version
- Version: 1.3.0
- Build: 58

## Pending Deployment
All Mar 2026 changes need: 1) Save to GitHub, 2) Deploy backend to Render, 3) New EAS build

### Session Mar 2026 - CRITICAL Crash Fix (Build 58)
- **P0 CRITICAL: "My Journey" page crash fixed** - App crashed with SIGSEGV when navigating to the Journey page. Four root causes identified and fixed:
  1. `Image` component from `react-native` was used but never imported → Added to imports
  2. `useSafeAreaInsets()` hook was called AFTER a conditional `return` statement, violating React's Rules of Hooks → Moved before any returns
  3. `photos` field was missing from the `Visit` TypeScript interface → Added to interface
  4. `badgeMap` object was recreated on every render inside `getNextMilestone()` → Extracted to module-level constants (`MILESTONE_BADGE_MAP`, `MILESTONES`)

### Session Mar 2026 - Multi-Bug Fix & Performance (Build 58)
- **Backend /api/countries performance fix**: Replaced N+1 query pattern (67 separate DB queries) with single aggregation pipeline (2 queries). Response time reduced from potential 3-13s to ~120ms on Atlas.
- **About page "14,500+" stat box**: Fixed text wrapping by adjusting stat item padding
- **About page Key Features updated**: Removed "Photo Collection" and "NEW" tags, added "Landmark Visits" and "Explore Continents" features
- **About page "Start Exploring"**: Navigation already correctly uses `/(tabs)/explore` for tab bar visibility
- **Edit Profile page**: "Name" → "Username", removed "Featured Badges" section, moved "Save" button from header to page content as prominent styled button
- **Social page Messages gradient**: Fixed grey gradient for free users → always uses colorful theme gradient (lock icon still communicates pro-only status)

### Session Mar 2026 - Client-Side API Caching with Smart Invalidation
- **Cache utility created** (`utils/apiCache.ts`): In-memory cache with 5-minute TTL, group invalidation, and `cachedFetch` helper
- **Cached endpoints**: `/api/countries`, `/api/continent-stats`, `/api/progress`, `/api/stats`, `/api/achievements`, `/api/country-visits`
- **Cache invalidation on visit creation**: All 3 visit flows (landmark, country, custom) call `invalidateCacheGroup('visit')` after successful POST, clearing all related caches instantly
- **Result**: Navigation between pages uses cached data (instant). After registering a visit, all stats refresh immediately with fresh data
- **Hermes fix**: Replaced `new Response()` in `cachedFetch` with plain JS object for React Native Hermes compatibility

### Session Mar 2026 - Major Rank System Overhaul & Bug Fixes (Build 60)
- **New 8-level rank system** replacing the old badge/achievement system:
  - Newcomer (0-199), Wanderer (200-749), Explorer (750-1,999), Adventurer (2,000-4,499)
  - Trailblazer (4,500-8,499), Globetrotter (8,500-13,999), Legend (14,000-17,999), Titan (18,000+)
  - Each rank has unique Ionicons icon and color
- **Badge system removed**: achievements.tsx page, Badge interface, My Badges navigation, Recent Badges section all removed
- **Journey page updated**: "Next Milestone" → "Next Rank" with progress bar and rank icon
- **Profile page updated**: Shows current rank (not badge count)
- **Header fixes**: points-summary and my-landmark-visits changed from SafeAreaView to useSafeAreaInsets for flush-to-top headers
- **Settings**: Removed "Change Email", implemented working "Change Password" with backend endpoint
- **Email addresses fixed**: privacy-policy and terms-of-service now use support@wandermark.app
- **Social Feed**: Renamed "Feed"/"Community Feed" to consistent "Activity Feed"
- **About page**: Updated FAQ with rank descriptions, "14,500+" → "19,000+", Key Features now shows "Rank System" and "Explore Continents" instead of Badges and Photo Collection

### Session Mar 2026 - Comprehensive Code Audit & Bug Fixes
- **P0 CRITICAL: Points Summary page fixed** - Was completely broken (GET to PUT-only /api/auth/profile returned 405). Now uses /api/stats with correct field mapping.
- **P0 CRITICAL: Continents stat corrected** - Journey page showed "/7" but app only has 5 continents. Fixed to "/5".
- **P1: Share buttons removed from ALL headers** - Journey stats header share icon removed, Visit Detail share moved from header to content area button.
- **P1: Dead options menu removed** - Country Visit Detail had an options modal that could never be opened (no trigger). Removed modal, state, import, and styles.
- **P1: Statistics continent mapping fixed** - Had "South America" key but backend uses "Americas". Fixed to match.
- **P1: Points Summary bonus types added** - Now shows all 6 earning methods: Landmark (10/25), Country Visit (50), Country Bonus (+20), Continent Bonus (+50), Completion Bonuses (+50/+200), Photo Verification.
- **P1: Continents fallback data updated** - Was significantly outdated (e.g., Europe showed 107 landmarks, actual is 196). Updated all 5 continents.
- **P2: Dead streak code removed** - Deleted StreakDisplay.tsx (132 lines), removed streak fields from leaderboard interface, hardcoded backend streak response to 0.
- **P3: Leaderboard share added** - "Share My Ranking" button with visual card (ShareRankCard component). Dark gradient card with medal icon, rank number, user name, 3 stats columns (category value, total travelers, percentile), and wandermark.app CTA. Uses react-native-view-shot for image capture and expo-sharing for sharing.
- **P3: Backend scripts reorganized** - 11 one-time seed/migration scripts moved to /backend/scripts/ folder.

## Remaining Tasks
1. Deploy all changes: Save to GitHub → Deploy backend to Render → New EAS build
2. User E2E testing of new build with all fixes
3. App Store submission preparation
4. P2: Rename GitHub repository (`wanderlist-app` → `wandermark-app`)

## Session Mar 4, 2026 - Backend Performance Optimization
### Root cause: Backend timeouts, NOT frontend/cache
- `/api/stats` → Rewritten with `$lookup` + `$group` aggregation (was >30s, now 0.19s)
- `/api/progress` → Rewritten with aggregation pipeline (was >15s, now 0.20s)
- `/api/landmarks` → Rewritten with `$lookup` for visited-status in DB (was slow, now 0.19s)
### Other fixes this session:
- Badge→Rank terminology finalized across entire app
- has_password field added to /api/auth/me (hides Change Password for Apple users)
- Dead badge code deleted (achievements.tsx, badgeIcons.ts)
- Visit-detail Surface→View for text visibility fix
- Notifications page: Hook crash fix, navigation, mark-all-read, backend notifications for friends + rank-up
- "Can't find your destination?" box made consistent for all users
- Journey: Rank icon bigger, text smaller, "Recently Visited" removed, "Rank"→"Leaderboard"
- Social: Duplicate Activity Feed removed + 290 lines dead code
- Norwegian text removed (Kampanjekoder → Promo Codes)
- Points Summary crash fixed (missing `insets`)
- Frontend useEffect guards: `if (user)` + `[user]` dependency on all tab pages
- Promise.allSettled in journey.tsx for resilient data fetching

### Session Feb 27, 2026 - Backend Performance Overhaul (Final)
- **`/api/feed` optimized**: Replaced N+1 query loop (250 queries per request) with single MongoDB aggregation pipeline using `$lookup` for users, likes, comments, and visit photos. Response time: 12s+ → <0.1s.
- **`/api/visits` optimized**: Replaced two-step query with single aggregation pipeline using `$lookup` for landmark names. Response time: 12s+ → <0.1s.
- **Previous session**: `/api/stats`, `/api/progress`, `/api/landmarks` already optimized with same pattern.
- Fixed missing `get_user_limits` import in `social.py`.
- **Pull-to-refresh with haptic feedback**: Added light haptic on pull start + success haptic on completion for Social and Notifications pages.
- **`/api/landmarks` optimized**: Replaced correlated `$lookup` with `$expr` (per-landmark sub-query) with a batch `$in` query for visited status. Much faster with many landmarks.
- **`/api/continent-stats` optimized**: Replaced Python loops + multiple queries with MongoDB aggregation pipeline using `$lookup` for visited landmarks by continent.
- **`/api/community-feed` optimized**: Replaced N+1 upvote counting (`count_documents` per item) with single batch aggregation `$group`.
- Added `is_visited` field to Landmark Pydantic model.
- **CRITICAL: Fixed index mismatch**: Indexes were created on `db.friendships` but all code uses `db.friends` — the `friends` collection had ZERO indexes, causing full collection scans on every friend query.
- **Added 15+ missing indexes**: `photo_upvotes.photo_id`, `user_created_visits.(user_id, visibility)`, `notifications.(user_id, created_at)`, `visits.visibility`, `landmarks.continent`, `friends.(user_id/friend_id + status)`, `likes.(activity_id + user_id)`.
- **Fixed N+1 in `/api/progress` (empty user)**: Replaced per-country `count_documents` (50+ queries) with single aggregation.
- **Optimized leaderboard endpoints**: Replaced N+1 user lookups in `/api/leaderboard?category=visits`, `?category=countries`, and `/api/leaderboard/rising-stars` with `$lookup` in aggregation pipelines.
- All 34 backend tests passed (iteration_27).

### Session Feb 27, 2026 - Social Features Overhaul
**Backend:**
- **New: Public User Profile** (`GET /api/users/{user_id}/profile`): Returns name, stats (visits/countries/continents/friends), friendship status, recent visits. Respects privacy settings.
- **New: User Search** (`GET /api/users/search?q=X`): Search by name or username, excludes self.
- **New: Conversations endpoint** (`GET /api/messages/conversations`): Single aggregation returns all conversations with last message + unread count. Replaces N+1 fetch.
- **New: Friend improvements**: `POST /api/friends/{id}/reject`, `DELETE /api/friends/{id}` (remove), `GET /api/friends/sent`.
- **New: Visit privacy** (`PUT /api/visits/{id}/privacy`): Change visibility on existing visits (updates both visits + activities).
- Optimized `GET /api/friends/pending` with `$lookup` (was N+1).

**Frontend:**
- **New: User profile page** (`/app/user-profile/[user_id].tsx`): Avatar, stats, rank, friend/message buttons, recent visits.
- **Updated: Friends page**: User search (typeahead), reject button on requests, sent requests section, profile navigation on tap.
- **Updated: Feed page**: Merged feed with "Friends" | "Community" tabs. Community tab shows public visit photos/diaries.
- **Updated: Social page**: Community Feed renamed from "Activity Feed". Leaderboard items now link to profiles.
- **Updated: Settings**: Better privacy descriptions ("Your visits, photos and diary entries are visible to everyone").
- All 30 backend tests passed (iteration_28).

## Key Files Modified (Latest)
- `backend/routes/country_visits.py` - Full PUT endpoint with photo management + landmarks endpoint + migration
- `frontend/app/(tabs)/journey.tsx` - Carousel, reordered sections, badge icons, navigation
- `frontend/app/country-visit-detail/[country_visit_id].tsx` - Photo CRUD, landmarks list, empty states
- `frontend/utils/badgeIcons.ts` - Badge icon mapping utility
- `frontend/app/achievements.tsx` - Tab visibility, icon rendering
- `frontend/app/my-landmark-visits.tsx` - Token fix, interface alignment
- `frontend/app/points-summary.tsx` - Token fix
- `frontend/app/visit-detail/[visit_id].tsx` - UniversalHeader, consistent styling
- `frontend/app/(tabs)/social.tsx` - Removed duplicate leaderboard, vertical feed
- `frontend/app/continents.tsx` - Progress bars on all continents
- `frontend/app/leaderboard.tsx` - Context-aware back nav
- `backend/models/all.py` - Visit model with landmark_name, country_name
- `backend/routes/visits.py` - Enriches visits with landmark names
- `backend/utils/helpers.py` - milestone_250 in badge milestones

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
