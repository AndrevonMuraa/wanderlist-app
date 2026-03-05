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
- Allows sharing content publicly while controlling who can interact

### Report/Moderation System (Complete - March 5, 2026)
- `ReportButton` component on visits, profiles
- Backend `POST /api/reports` validates type (activity/comment/photo/user) and reason
- Prevents self-reporting
- Connected to existing admin report management

### Premium Differentiation (Complete - March 5, 2026)
- Friend limit REMOVED for free tier (was 5, now unlimited)
- Diary hybrid model: 3 entries/month (free), unlimited (pro)
- "PRO" upgrade hint badge on locked premium landmarks
- Premium landmarks, 10 photos/visit, custom visits, messaging remain pro-only

### Profile Improvements (Complete - March 5, 2026)
- "View All Visits" page (`/user-visits/[user_id]`) with pagination and privacy filtering
- Diary indicator (journal icon) on profile visit cards
- Country name shown on profile visits
- Report button on user profiles

### Social Features (Complete)
- Friends, user profiles, unified feed, leaderboards
- Like/comment on activities, upvote community photos
- Travel Tips completely removed; diary is sole text feature

### Codebase Cleanup (Complete)
- travel_tips, has_tips fully removed from all code
- db.friendships → db.friends fix in account deletion
- 3 unused components deleted
- Backend import cleanup

## Key API Endpoints
- `GET /api/visits/check/{landmark_id}` - Lightweight visit status
- `POST /api/visits` - Create visit with visibility + diary limit
- `PUT /api/visits/{id}/privacy` - Per-item privacy change
- `PUT /api/auth/privacy` - Global default (retroactive)
- `PUT /api/auth/comment-permission` - Comment permission control
- `GET /api/users/{id}/visits` - Paginated user visits with privacy
- `GET /api/users/{id}/profile` - Profile with has_diary + comment_permission
- `POST /api/reports` - Submit report (activity/comment/photo/user)
- `GET /api/feed` - Activity feed
- `GET /api/community-feed` - Public community feed

## DB Schema (Key Fields)
- **users**: `default_privacy`, `comment_permission`, `subscription_tier`
- **visits**: `visibility`, `diary_notes`, `share_diary`
- **activities**: `visibility`
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
- Share Profile function (external sharing)
- User activity stream on profile
- Rename GitHub repository (wanderlist-app → wandermark-app)
