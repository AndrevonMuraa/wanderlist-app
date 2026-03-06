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

### Privacy Policy Updated (March 6, 2026)
- Updated date to March 6, 2026
- Section 4: Added visibility settings (global default + per-visit override + retroactive), interaction controls (comment permissions, reporting)
- Section 6: Camera as primary method, photo verification requirements (user must be visible), moderation/revocation clause
- New Section 7: Content Reporting & Moderation (report types, data collected, anonymity, abuse policy)
- Renumbered sections 8-11
- Updated all 3 versions: in-app (privacy-policy.tsx), website_updates/privacy.html, wandermark-site/privacy.html

### Anti-Cheat / Photo Verification System (Complete - March 6, 2026)
- **Camera-first**: Primary action is now "Take Photo" (camera), "Choose from Library" is secondary
- **Photo guidelines**: Prominent banner in AddVisitModal: "Take a personal photo of yourself at the landmark"
- **Disclaimer**: Warning that photos without user visible may lead to verified points removal
- **Updated text across app**: leaderboard, points-summary, about, terms-of-service all emphasize personal photo requirement
- **Admin strip-verified endpoint**: `PUT /api/admin/users/{user_id}/strip-verified` removes verified status from all visits and resets leaderboard_points to 0, without deleting photos or content. Action logged to admin_logs collection
- **Terms of Service**: Updated with revocation clause for non-compliant photos

### Data Transfer Optimization (Complete - March 6, 2026)
- **Root cause**: `/api/visits` returned full base64 photo data (500KB-2MB per photo) on every page load
- **Journey page**: Removed `/api/visits` call entirely (was only used for offline caching, not display) — saves ~15-60MB per load
- **Points Summary**: Now uses only `/api/stats` (added `visits_with_photos` count) — eliminated `/api/visits` call entirely
- **My Landmark Visits**: Uses new lightweight `/api/visits/list` that excludes photo_base64, photos, diary_notes, comments — returns only metadata + has_photo/photo_count
- **Estimated production impact**: Journey page data transfer reduced from ~60MB to ~10KB for users with many visits

### Performance Optimizations v2 (Complete - March 6, 2026)
- `/api/stats`: 4 sequential DB calls → 3 parallel (asyncio.gather) + 1 sequential for rank
- `/api/progress`: Added 5-min TTL in-memory cache for static geo data (countries + landmark counts) + parallel query execution
- `/api/photos/collection`: 3 sequential DB queries → 3 parallel (asyncio.gather) with minimal projections
- New DB indexes: `comments.comment_id` (unique), `activities.visit_id`
- All endpoints now respond under 200ms

### Leaderboard Rank Fix (Complete - March 6, 2026)
- `/api/stats` now returns `rank` field calculated from leaderboard_points
- Fixed N/A display on Journey page leaderboard section

### Removed Detailed Statistics Page (March 6, 2026)
- Deleted `(tabs)/statistics.tsx`
- Removed navigation link from Journey page
- Removed tab registration from `_layout.tsx`

### Comments UI Integration (Complete - March 6, 2026)
- `CommentsSection` component integrated into visit-detail page
- Full CRUD: view, add, reply, like/unlike, delete comments
- Threaded replies with parent/child organization
- Delete button only shown for own comments (CommentItem fix)
- Visit detail endpoint extended to return `activity_id` and `comments_count`
- Comment permission enforcement (everyone/friends/nobody) verified with 27 tests

### Report/Moderation System (Complete - March 5, 2026)
- `ReportButton` component on visits, profiles
- Backend `POST /api/reports` validates type and reason
- Prevents self-reporting

### Premium Differentiation (Complete - March 5, 2026)
- Friend limit REMOVED for free tier (now unlimited)
- Diary hybrid model: 3 entries/month (free), unlimited (pro)
- "PRO" upgrade hint badge on locked premium landmarks

### Profile Improvements (Complete - March 5, 2026)
- "View All Visits" page with pagination and privacy filtering
- Diary indicator on profile visit cards
- Country name on profile visits, Report button on profiles

### Social Features (Complete)
- Friends, user profiles, unified feed, leaderboards
- Like/comment on activities, upvote community photos

### Share Profile (Complete - March 5, 2026)
- Share button on user profile pages using React Native Share API

### User Activity Stream (Complete - March 5, 2026)
- `GET /api/users/{user_id}/activity` endpoint with pagination and privacy filtering

### Codebase Cleanup (Complete - March 6, 2026)
- Full backend import cleanup across all 14 route files + utils/db.py
- travel_tips, has_tips fully removed
- Old test reports cleaned up
- Verified with 25/25 backend regression tests

### Codebase Cleanup v2 (Complete - Feb 2026)
- Removed all debug console.log statements from frontend (profile, landmarks, analytics, config, purchases, push notifications, Apple Auth)
- Removed obsolete TODO comments
- Kept functional console.log in toast.ts (web fallback) and all console.error/console.warn for error handling
- Bumped iOS buildNumber to 67
- Verified with 25/25 backend regression tests

## Key API Endpoints
- `GET /api/visits/check/{landmark_id}` - Lightweight visit status
- `GET /api/visits/{visit_id}` - Visit details with activity_id + comments_count
- `POST /api/visits` - Create visit with visibility + diary limit
- `PUT /api/visits/{id}/privacy` - Per-item privacy change
- `PUT /api/auth/privacy` - Global default (retroactive)
- `PUT /api/auth/comment-permission` - Comment permission control
- `GET /api/activities/{id}/comments` - Get comments for activity
- `POST /api/activities/{id}/comment` - Add comment (permission enforced)
- `DELETE /api/comments/{id}` - Delete own comment
- `POST /api/comments/{id}/like` - Like comment
- `DELETE /api/comments/{id}/like` - Unlike comment
- `GET /api/users/{id}/activity` - User activity stream
- `GET /api/users/{id}/visits` - User visits with privacy
- `POST /api/reports` - Submit report

## DB Schema (Key Fields)
- **users**: `default_privacy`, `comment_permission`, `subscription_tier`
- **visits**: `visibility`, `diary_notes`, `share_diary`
- **activities**: `visibility`, `visit_id`, `comments_count`
- **comments**: `comment_id`, `activity_id`, `user_id`, `content`, `parent_comment_id`, `likes_count`
- **friends**: Friend relationships (indexed)
- **reports**: `report_type`, `content_id`, `reason`, `status`

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

### My Photos Performance Fix (Complete - Feb 2026)
- Removed `photo_base64` from backend projection in `/api/photos/collection`
- Same optimization pattern as Journey/Landmark Visits performance fixes

### About & Help Page Overhaul (Complete - Feb 2026)
- FAQ section moved below Game Mechanics
- Key Features reordered: Explore Continents first, Custom Visits below Country Visits
- Custom Visits link now auto-scrolls to bottom of Journey page
- Rank System now links to dedicated `/ranks` page instead of expandable content
- Updated terminology: "Personal Points" → "Unverified Points", "Leaderboard Points" → "Verified Points"
- Expanded privacy FAQ with hybrid privacy details (default, per-visit, diary sharing, comments, reporting)
- Updated "How do I earn points?" FAQ with anti-cheat info
- Game Mechanics: Dual Points System and Privacy Controls fully updated

### Points Summary Updates (Complete - Feb 2026)
- "From visits with photos" → "From visits with personal photos"
- Photo Verification moved to top of "How Points Work" section

### Ranks Page Updates (Complete - Feb 2026)
- Fixed "5 ranks" → "8 ranks" in hero text
- Added Verified Points info to "How to Earn Points" section

### Custom Visits Feature Overhaul (Complete - Feb 2026)
**Backend:**
- NEW: `GET /api/user-created-visits/{visit_id}` - Get single custom visit with privacy check
- NEW: `PUT /api/user-created-visits/{visit_id}` - Edit custom visit (country_name, landmarks, photos, diary, visibility, share_diary)
- FIX: ObjectId leak in `GET /api/user-created-visits` - now excludes `_id` from projection
- NEW: `share_diary` field support in create and edit

**Frontend:**
- NEW: `custom-visit-detail/[visit_id].tsx` - Full detail page with photo carousel, landmarks list, diary view/edit, visibility toggle, share_diary toggle, camera/library photo adding, delete functionality
- UPDATE: Journey page custom visits are now tappable (TouchableOpacity → detail page)
- UPDATE: "+X more" text is now a clickable link with "View all X custom visits"
- UPDATE: AddUserCreatedVisitModal has camera button + library button (was library only)
- UPDATE: AddUserCreatedVisitModal has share_diary toggle
- FIX: Removed emoji character from modal text
- Verified with 9/9 backend tests (full CRUD flow)

## Prioritized Backlog
### P0 - None
### P1 - Upcoming
- Deploy updated Privacy Policy / Terms to a live URL
- Verify all features in TestFlight build 68
### P2 - Future
- Rename GitHub repository (wanderlist-app -> wandermark-app)
