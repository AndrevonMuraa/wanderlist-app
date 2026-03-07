# WanderMark - Product Requirements Document

## Original Problem Statement
Travel app for App Store submission. Evolved to include social features, hybrid privacy system, comment/report moderation, premium differentiation, and profile improvements.

## Architecture
- **Frontend**: React Native with Expo Router
- **Backend**: FastAPI with MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)

## What's Been Implemented

### Performance (Complete)
- MongoDB aggregation pipelines for all read-heavy endpoints
- N+1 query fix for community photos (batch upvote fetching)
- Country/landmark pages: removed redundant /api/visits + /api/progress calls
- New lightweight `GET /api/visits/check/{landmark_id}` endpoint

### Hybrid Privacy Model (Complete)
- Global default privacy (public/friends/private) with retroactive updates
- Per-visit visibility override (AddVisitModal + Visit Detail)
- Dedicated Privacy settings page (`/settings/privacy`)
- Leaderboard integration (only public verified visits count)

### Comment Permission System (Complete - March 5, 2026)
- `comment_permission` field on users (everyone/friends/nobody)
- Backend enforces permission on POST /api/activities/{id}/comment
- UI control in Privacy settings page

### Anti-Cheat / Photo Verification System (Complete - March 6, 2026)
- Camera-first: Primary action is now "Take Photo" (camera), "Choose from Library" is secondary
- Photo guidelines: Prominent banner in AddVisitModal
- Admin strip-verified endpoint

### Data Transfer Optimization (Complete - March 6, 2026)
- Journey page data transfer reduced from ~60MB to ~10KB for users with many visits

### Performance Optimizations v2 (Complete - March 6, 2026)
- Parallel DB calls, in-memory caching, new DB indexes
- All endpoints now respond under 200ms

### Comments UI Integration (Complete - March 6, 2026)
- Full CRUD: view, add, reply, like/unlike, delete comments
- Threaded replies with parent/child organization

### Report/Moderation System (Complete - March 5, 2026)
- `ReportButton` component on visits, profiles
- Backend POST /api/reports validates type and reason

### Premium Differentiation (Complete - March 5, 2026)
- Diary hybrid model: 3 entries/month (free), unlimited (pro)

### Profile Improvements (Complete - March 5, 2026)
- "View All Visits" page with pagination and privacy filtering

### Social Features (Complete)
- Friends, user profiles, unified feed, leaderboards

### Custom Visits Feature Overhaul (Complete - Feb 2026)
- Full CRUD: GET, POST, PUT, DELETE for custom visits
- Dedicated detail page with photo carousel, diary, visibility toggle

### Landmark Visits Feature Enhancement (Complete - Feb 2026)
- Full edit/delete functionality
- Visit detail page with editable diary, photo management

### Country Visits Feature Enhancement (Complete - Feb 2026)
- share_diary support in POST/PUT endpoints
- Camera button alongside library button
- Consistent UI patterns

### App Audit Phase 1 - Critical Fixes (Complete - March 7, 2026)
**AddCountryVisitModal Standardization:**
- Added camera support (takePhoto function) matching AddVisitModal pattern
- Wired share_diary toggle to POST request body
- Added share_diary toggle UI in diary section
- Replaced emoji characters in Alert messages with plain text
- Added cache invalidation (invalidateCacheGroup) on successful submit
- Added photo limit handling with upgrade prompts

**Backend Bug Fix:**
- Fixed share_diary not being saved in country-visits POST "upgrade" path (when user already has a visit)

### App Audit Phase 3 - Backend Logging (Complete - March 7, 2026)
- Converted print() statements in db.py to structured logging (logging module)

### App Audit Phase 4 - UX Improvements (Complete - March 7, 2026)
**Friends Filter:**
- Added client-side filter for existing friends list (search by name or username)
- Filter appears when user has > 3 friends
- Empty state updates based on filter status

**Loading Skeletons:**
- Replaced ActivityIndicator spinners with skeleton loading states on:
  - my-landmark-visits.tsx: Card-style skeleton rows
  - my-country-visits.tsx: Grid-style skeleton layout

### Share My Journey Card (Complete - March 7, 2026)
- Created premium `ShareJourneyCard` component with dark gradient background, gold accents, and elegant typography
- Card displays: countries visited, landmarks, continents, points earned, rank badge, global rank, WanderMark branding
- Integrated into Journey tab with a dark gradient "Share My Journey" button below stats card
- Uses `react-native-view-shot` + `expo-sharing` for native share to Instagram, WhatsApp, Facebook etc.
- Refined aspirational copy: "A life measured in destinations" / "The world awaits. Start your journey."

## Key API Endpoints
- `GET /api/visits/check/{landmark_id}` - Lightweight visit status
- `GET /api/visits/{visit_id}` - Visit details with activity_id + comments_count
- `POST /api/visits` - Create visit with visibility + diary limit
- `PUT /api/visits/{id}` - Edit landmark visit
- `DELETE /api/visits/{id}` - Delete landmark visit
- `PUT /api/visits/{id}/privacy` - Per-item privacy change
- `PUT /api/auth/privacy` - Global default (retroactive)
- `PUT /api/auth/comment-permission` - Comment permission control
- `GET /api/activities/{id}/comments` - Get comments for activity
- `POST /api/activities/{id}/comment` - Add comment (permission enforced)
- `POST /api/country-visits` - Create country visit with share_diary
- `PUT /api/country-visits/{id}` - Update country visit
- `GET /api/user-created-visits/{id}` - Get single custom visit
- `PUT /api/user-created-visits/{id}` - Edit custom visit
- `POST /api/reports` - Submit report

## DB Schema (Key Fields)
- **users**: `default_privacy`, `comment_permission`, `subscription_tier`
- **visits**: `visibility`, `diary_notes`, `share_diary`
- **country_visits**: `visibility`, `diary`, `share_diary`, `photos`
- **user_created_visits**: `visibility`, `diary_notes`, `share_diary`, `landmarks`, `photos`
- **activities**: `visibility`, `visit_id`, `comments_count`
- **comments**: `comment_id`, `activity_id`, `user_id`, `content`, `parent_comment_id`, `likes_count`

## Subscription Tiers
| Feature | Free | Pro |
|---|---|---|
| Friends | Unlimited | Unlimited |
| Photos/visit | 1 | 10 |
| Diary entries/month | 3 | Unlimited |
| Premium landmarks | No | Yes (150+) |
| Custom visits | No | Yes |
| Messaging | No | Yes |

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!
- Email: test2@wandermark.app | Password: Test1234!

## Prioritized Backlog
### P0 - None
### P1 - Upcoming
- Refactor visit modals into single reusable component (Phase 3 remaining)
- Deploy updated Privacy Policy / Terms to a live URL
- Bump iOS build number and prepare TestFlight build
### P2 - Future
- Rename GitHub repository (wanderlist-app -> wandermark-app)
- Add pull-to-refresh to remaining pages
- More comprehensive skeleton loading states
