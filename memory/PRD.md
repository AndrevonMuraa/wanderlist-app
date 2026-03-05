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

## Prioritized Backlog
### P0 - None
### P1 - Upcoming
- Verify all features in TestFlight build
### P2 - Future
- Rename GitHub repository (wanderlist-app -> wandermark-app)
