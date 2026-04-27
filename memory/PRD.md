# WanderMark — Product Requirements Document

## Original Problem Statement
Bring "WanderMark" travel app (React Native + Expo + FastAPI + MongoDB) to a production-ready state for App Store launch.

## Architecture
- **Frontend**: `/app/frontend` — Expo Router, "Penthouse Window" aesthetic
- **Backend**: `/app/backend` — FastAPI + Motor (MongoDB)
- **Production**: Render (backend) + EAS Build (iOS/TestFlight)

## What's been implemented (recent)

### April 2026 — Build 83+ (current session)
- ✅ **Build 83 EAS build successful** — pushed to TestFlight via `eas submit`
- ✅ **Production DB cleaned**: 1500 landmarks / 100 countries — 300/20 per continent (`fix_continent_drift.py` script — UPDATE-only, no data loss)
- ✅ **Icon system unified** across stats rows + points breakdown (footsteps-outline / shield-checkmark-outline / star / shield-checkmark / star-outline)
- ✅ **Pytest suite 205/205 green** — fixed photo validation (base64 required), rate-limit env-configurable

### April 2026 — Community refactor + reporting overhaul (current session)
- ✅ **Shape-shifting bug fixed**: Community Highlight hero on Social → /community → tap → DIRECTLY to /visit-detail (no more random refetch)
- ✅ **Deleted** /community-highlights.tsx (476 lines) + /community-highlights/top.tsx (220 lines)
- ✅ **TopHighlightsList component** — numbered top 1-10 with #1 emphasized (gold border, larger image), gold/silver/bronze badges, ContentMenu overlay per item
- ✅ **Filter bar**: All-time/This month + 6 continent chips (All, Europe, Asia, Americas, Africa, Oceania)
- ✅ **Backend continent enrichment**: `build_candidate_pool` joins continent. Top endpoint accepts `?continent=` filter
- ✅ **ContentMenu universal component** (3 variants: overlay/subtle/compact) — Instagram-style ••• bottom sheet with View profile + Report + Cancel + 2-tap confirmation
- ✅ **Backend report rate limit**: Max 5 reports/user/hour (verified 429 on 6th)
- ✅ **Diary report type**: Backend accepts `report_type=diary` with 5 reasons
- ✅ **All Phase 3 surfaces converted to ContentMenu**:
  - TopHighlightsList (overlay)
  - landmark-community-photos (subtle, replaced flag-button)
  - country-community-photos (subtle, was missing)
  - user-profile (subtle, replaced ReportButton)
  - CommentItem per non-own comment (compact)
  - **visit-detail photo overlay** (overlay, sibling-of-TouchableOpacity to avoid RN-Web nested-button drop)
  - **visit-detail diary header** (subtle, non-owner only)
  - **country-visit-detail diary header** (subtle, non-owner only) + share/edit gated to owner
  - **feed.tsx per-item** (subtle, replaced flag button)
  - **social.tsx community feed cards** (overlay, sibling-of-TouchableOpacity)
- ✅ **Critical RN-Web fix**: `data-testid` → `testID` inside ContentMenu component (RN-Web requires camelCase, drops HTML attrs on RN components)
- ✅ **Navigation entry points to /community**: Social hero (compact 16:10), Profile menu row, Social "Explore community" link
- ✅ **Removed**: Community CTA from Explore tab + dead `fetchTrendingLandmarks` code

## Prioritized Backlog

### P1 — Polish
- ⏳ Simplify share CTA on top list to small icon below content
- ⏳ Convert other `data-testid="..."` HTML-attrs to `testID="..."` in non-ContentMenu files (e.g. visit-detail line 567/606/621)
- ⏳ Seed public visit with diary text in preview DB so non-owner diary ContentMenu can be exercised

### P2 — New features
- ⏳ "Mitt år i reise" — Auto-generated yearly summary with shareable cards
- ⏳ Block user UI in ContentMenu user-variant (backend route exists)

### P3 — Operational
- ⏳ Rename GitHub repo: `wanderlist-app` → `wandermark-app`
- ⏳ Deploy legal pages site (Privacy/Terms) — App Store requirement

### P4 — Future
- ⏳ "Nearby travelers" geographical discovery section
- ⏳ Data-cleanup session for 12 remaining "activity-like" landmarks

## Key Test Credentials
- Admin/Basic: `test@wandermark.app` / `Test1234!`
- Pro: `testpro@wandermark.app` / `Test1234!`

## Key API Endpoints
- `GET /api/community-highlights/top?limit=10&scope=all|month&continent=Europe`
- `POST /api/reports` — supports `report_type=diary`, enforces 5/hr per-user rate limit

## Critical Notes
- **RN-Web pitfall**: Use `testID` (camelCase) NOT `data-testid` on React Native components
- **RN-Web pitfall**: Nested `<TouchableOpacity>` inside another `<TouchableOpacity>` causes inner button to be dropped from accessibility/render tree → render as sibling-overlay with absolute positioning
- ContentMenu hides itself when `isOwnContent={true}` — never shows on user's own content
- Backend rate-limit env vars: `RATE_LIMIT_DEFAULT_RPM` (prod 120), `RATE_LIMIT_AUTH_RPM` (prod 20), tests use 10000/500
