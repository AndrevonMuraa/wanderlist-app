# WanderMark — Product Requirements Document

## Original Problem Statement
Bring "WanderMark" travel app (React Native + Expo + FastAPI + MongoDB) to a production-ready state for App Store launch. Stack: Expo Router, FastAPI, MongoDB Atlas (Render-hosted), Sentry, Stripe (planned).

## Architecture
- **Frontend**: `/app/frontend` — Expo Router, "Penthouse Window" aesthetic, heavy componentization
- **Backend**: `/app/backend` — FastAPI + Motor (MongoDB)
- **Production**: Render (backend) + EAS Build (iOS/TestFlight)

## What's been implemented (recent)

### April 2026 — Build 83+ (current session)
- ✅ **Build 83 EAS build successful** — pushed to TestFlight via `eas submit`
- ✅ **Production DB cleaned**: 1500 landmarks / 100 countries — 300/20 per continent, perfect balance (`fix_continent_drift.py` script)
- ✅ **Icon system unified** across stats rows + points breakdown:
  - `footsteps-outline` for Visited count, `shield-checkmark-outline` for Verified count
  - `star` filled gold for Total pts, `shield-checkmark` filled green for Verified pts
  - `star-outline` amber for Unverified points
  - Visual rule: outline = count, filled = sum
- ✅ **Pytest suite 205/205 green** (was 164/206) — fixed photo validation (base64 required), rate-limit configurable via env (`RATE_LIMIT_DEFAULT_RPM`, `RATE_LIMIT_AUTH_RPM`)

### April 2026 — Community refactor + reporting overhaul (current session)
- ✅ **Shape-shifting bug fixed**: Community Highlight hero on Social → /community → tap → directly to /visit-detail (no more random refetch on navigation)
- ✅ **Deleted dedicated highlights pages**: `/community-highlights.tsx` (476 lines) and `/community-highlights/top.tsx` (220 lines) — all moved into Community page
- ✅ **New `TopHighlightsList` component** — numbered top 1-10 list with #1 emphasized (gold border + larger image), gold/silver/bronze rank badges, inline ContentMenu overlay
- ✅ **Filter bar**: All-time/This month + 6 continent chips (All, Europe, Asia, Americas, Africa, Oceania)
- ✅ **Backend continent enrichment**: `build_candidate_pool` joins continent from countries collection. Top endpoint accepts `?continent=` query param
- ✅ **`ContentMenu` universal component** (3 variants: overlay/subtle/compact) — Instagram-style ••• bottom sheet with View profile + Report (red) + Cancel
- ✅ **Diary report type**: Backend `routes/reports.py` accepts `report_type=diary` with reasons `inappropriate_diary`, `harassment_diary`, etc.
- ✅ **Report rate limit**: Max 5 reports per user per hour (verified working: 429 on 6th)
- ✅ **Surfaces converted to ContentMenu**: TopHighlightsList, landmark-community-photos, country-community-photos (was missing), user-profile (replaced ReportButton), CommentItem (was missing)
- ✅ **Navigation entry points to /community**: Social hero (compact 16:10), Profile menu row, Social "Explore community" link
- ✅ **Removed**: Community CTA from Explore tab (continents.tsx) + dead `fetchTrendingLandmarks` code

## Prioritized Backlog

### P0 — Pending Phase 3 surfaces (for next session)
- ⏳ `visit-detail/[visit_id].tsx` — add ContentMenu in header for non-owners (activity report) + on diary section + on each photo for non-owners
- ⏳ `country-visit-detail/[country_visit_id].tsx` — add ContentMenu (photo + diary)
- ⏳ `feed.tsx` per-item — replace existing report-button with ContentMenu

### P1 — Polish
- ⏳ Simplify share CTA on top list to small icon below content (currently big "Share top of the month" CTA pattern was removed when /community-highlights/top was deleted; share flow needs new home)

### P2 — New features
- ⏳ "Mitt år i reise" — Auto-generated yearly summary with shareable cards
- ⏳ Block user feature (currently has backend route, no UI in ContentMenu yet)

### P3 — Operational
- ⏳ Rename GitHub repo: `wanderlist-app` → `wandermark-app`
- ⏳ Deploy legal pages site (Privacy/Terms) — App Store requirement

### P4 — Future
- ⏳ "Nearby travelers" geographical discovery section
- ⏳ Data-cleanup session for 12 remaining "activity-like" landmarks (Rick's Cafe Negril, Ithaa Undersea Restaurant, etc.)

## Key Test Credentials
- Admin/Basic: `test@wandermark.app` / `Test1234!`
- Pro: `testpro@wandermark.app` / `Test1234!`

## Key API Endpoints (added/modified)
- `GET /api/community-highlights/top?limit=10&scope=all|month&continent=Europe` — now accepts continent filter
- `POST /api/reports` — now accepts `report_type=diary`, enforces 5/hr per-user rate limit

## Critical Notes
- Hero on Social uses `compact` prop on `CommunityHighlightHero` (16:10 aspect)
- ContentMenu hides itself when `isOwnContent={true}` — never shows on user's own content
- Backend rate-limit middleware reads `RATE_LIMIT_DEFAULT_RPM` and `RATE_LIMIT_AUTH_RPM` env vars (production: 120/20, tests: 10000/500)
- Production DB uses `fix_continent_drift.py` for any future continent-label drift fixes (UPDATE only, no data loss)
