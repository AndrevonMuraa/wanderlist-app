# WanderMark - Product Requirements Document

## Original Problem Statement
Prepare WanderMark app for App Store submission by fixing bugs, improving UI/UX, and implementing social/privacy features. The scope expanded to address critical performance issues, a complete backend overhaul, and a comprehensive privacy system.

## User Personas
- **Travelers**: Users who want to log and share their visits to landmarks worldwide
- **Social Users**: Users who want to connect with friends and see what others are visiting
- **Privacy-conscious Users**: Users who want granular control over who sees their content

## Core Requirements
1. Fast, performant backend with MongoDB aggregation pipelines
2. Social features (friends, profiles, feeds, leaderboards)
3. Hybrid privacy model with global defaults + per-item overrides
4. Travel diary for personal notes on visits
5. Points and verification system for leaderboards
6. Premium tier with additional features (more photos, premium landmarks)

## Architecture
- **Frontend**: React Native with Expo Router
- **Backend**: FastAPI with MongoDB Atlas
- **Hosting**: Render (backend), EAS Build (mobile)
- **Key Patterns**: MongoDB aggregation pipelines, hybrid privacy model, retroactive data updates

## What's Been Implemented

### Performance & Backend (Complete)
- All endpoints optimized with MongoDB aggregation pipelines
- Fixed N+1 queries across all data-fetching endpoints
- Database indexing corrected (db.friends vs db.friendships)
- All known performance bottlenecks resolved

### Social Features (Complete)
- User profile pages viewable by other users
- Friend management (search, add, accept, reject, remove)
- Unified tabbed feed (Activity + Community)
- Profile navigation from all social surfaces
- Haptic feedback on social interactions

### Privacy System - Hybrid Model (Complete - March 5, 2026)
- **Global default privacy**: Users set default (public/friends/private) in dedicated Privacy settings page
- **Per-item override**: Each visit can have its own visibility setting, independent of default
- **Retroactive updates**: Changing global default updates ALL existing visits and activities
- **Leaderboard integration**: Only public verified visits count for global leaderboard
- **Dedicated Privacy page**: `/settings/privacy` with clear explanations of all privacy levels
- **Per-visit controls**: Visibility selector in AddVisitModal and Visit Detail page
- **Travel Tips removed**: Feature eliminated to simplify data model; diary is the sole text feature

### Code Cleanup (Complete - March 5, 2026)
- Travel Tips completely removed from backend models, API, and all frontend components
- Settings page simplified - privacy controls moved to dedicated page
- Route conflict fixed (settings.tsx → settings/index.tsx for Expo Router compatibility)

### Performance Optimization - Country & Landmark Pages (Complete - March 5, 2026)
- **Root cause identified**: Both country page and landmark detail page fetched ALL user visits (`GET /api/visits`) just to check visit status - extremely wasteful
- **Country page**: Removed 2 heavy API calls (`/api/visits` + `/api/progress`), now computes progress locally from landmarks data which already includes `is_visited`
- **Landmark detail page**: Replaced `GET /api/visits` (all visits) with new `GET /api/visits/check/{landmark_id}` (single indexed lookup, 48 bytes vs 4KB+)
- **Net result**: Country page reduced from 5→3 API calls; Landmark page's heaviest call replaced with lightweight endpoint

## Key API Endpoints
- `GET /api/visits/check/{landmark_id}` - Lightweight visit status check (single indexed query)
- `POST /api/visits` - Create visit with optional `visibility` field
- `PUT /api/visits/{visit_id}/privacy` - Change per-item visibility
- `PUT /api/auth/privacy` - Change global default (retroactive)
- `GET /api/auth/me` - Returns user with `default_privacy` field
- `GET /api/feed` - Activity feed (respects visibility)
- `GET /api/community-feed` - Community feed (public only)
- `GET /api/users/{user_id}` - Public user profile
- `GET /api/friends/search` - User search

## DB Schema (Key Fields)
- **users**: `default_privacy: str` (public/friends/private)
- **visits**: `visibility: str` (overrides user default per-item)
- **activities**: `visibility: str` (mirrors visit visibility)
- **friends**: Collection for friend relationships (indexed)

## Test Credentials
- Email: test@wandermark.app | Password: Test1234!

## Prioritized Backlog

### P0 - None remaining

### P1 - Upcoming
- Verify full social & privacy overhaul in TestFlight build

### P2 - Future
- Rename GitHub repository (wanderlist-app → wandermark-app)
