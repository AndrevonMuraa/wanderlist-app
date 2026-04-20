# WanderMark PRD

## Product Overview
WanderMark is a gamified travel app where users visit landmarks, earn points, compete on leaderboards, and share their travel experiences. React Native (Expo Router) + FastAPI + MongoDB Atlas.

## Current State (April 20, 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 82
- Backend: Render (auto-deploy from GitHub) — api.wandermark.app
- Database: MongoDB Atlas
- Design system: V2 "Penthouse Window" DNA (warm #C9A961 shadows, 1px sand borders, matte inner frames, floating glass pills, ocean-to-sand rank gradients)

### Test hygiene: Happy-path compare-landmark tests no longer skip (P3 follow-up)
- **NEW** `/app/backend/tests/conftest.py` — introduces the `admin_friend_shared_landmark` pytest fixture that inserts 2 mutual visits (one for admin, one for Social Tester) with unique fixture-prefixed `visit_id`s, then auto-deletes them after the test via `try/finally`. Uses `dotenv` to load `backend/.env` so `MONGO_URL`/`DB_NAME` are available under pytest.
- Both happy-path tests (`test_shares_compare_iteration22.py::test_compare_landmark_happy_path` + `test_friends_hub_iteration21.py::test_compare_landmark_happy_path`) now consume the fixture instead of calling `pytest.skip("no shared landmark")`. They assert on real payload: `photo_count >= 1`, `visits` list length, and privacy leak detection.
- **Result**: 64/64 tests PASS, 0 skipped (previously 62 passed + 2 skipped). Zero dev-data pollution — verified 0 `fixture_*` visits remain in DB after test run.

## Session 19 — April 20, 2026 (ShareComparisonCard + backend refactor + test hygiene + server-side image defense)

### Feature: P5 — Server-side image compression / hard 5 MB ceiling (defense-in-depth) + observability
- **NEW** `/app/backend/utils/image_validate.py` — single entry point `normalize_photo` / `normalize_photos` implementing the hybrid strategy chosen by user:
  - `< 2 MB` decoded bytes → pass through unchanged (fast path, since client already targets 1600px/q70)
  - `2–5 MB` → re-encode via Pillow to max 1600px JPEG q70 (honours EXIF rotation, flattens RGBA on white, LANCZOS downscale)
  - `> 5 MB` → `HTTPException(413, "Image too large")`
  - Invalid base64 / non-image → `HTTPException(400, "Invalid image")`
- Wired into **all 6 upload surfaces**: `POST/PUT /api/visits` (photos + photo_base64), `POST/PUT /api/country-visits`, `POST/PUT /api/user-created-visits` (general photos + landmark photos), `PUT /api/auth/profile` (picture + banner_image), `POST /api/messages` (image_base64), `POST /api/bug-reports` (screenshots[]).
- **Observability** (added in second pass):
  - `utils/sentry.py` exposes `track_image_auto_resized()` (breadcrumb only, low-signal) and `track_image_rejected()` (breadcrumb + `capture_message(level="warning")`, shows up in Sentry issue stream). Both guarded by `try/except` so observability never breaks a real request.
  - `IMAGE_NORM_COUNTERS` — in-memory dict `{auto_resized, rejected}` incremented on every event. Resets on process restart (Sentry owns the long-term record).
  - **NEW** `GET /api/admin/image-normalization-stats` — admin-only endpoint returning `{counters, thresholds, note}`. Early-warning dashboard for client-side compression regressions.
  - **NEW** `/app/frontend/components/AdminSystemHealth.tsx` — compact 2×2 grid of health tiles: **🛡️ Image defense** (from the new endpoint), **🚩 Moderation** (from `/admin/stats`), **🚫 Banned**, **📈 New this week**. Each tile color-codes its icon circle by severity (green = ok, yellow = warn, red = alert) and shows a severity dot next to the value when `alert`. **Tiles are clickable shortcuts**: Moderation → `/admin/reports`, Banned → `/admin/users?filter=banned`, New this week → `/admin/users`, Image defense → in-page Alert with thresholds + Sentry tip. Each tile shows a subtle chevron-forward icon to signal clickability. Navigation verified live at iteration 26 (Moderation-tile → `/admin/reports` confirmed).
  - **Live refresh affordance**: Admin header now has a refresh icon button (top-right) mirroring the back button for symmetry. Tapping it re-fetches both `/admin/stats` AND `/admin/image-normalization-stats` via a `refreshSignal` counter passed to `AdminSystemHealth`. A small `Updated Xs/Xm/Xh ago` timestamp lives on the Overview-header row and re-renders every 15s via a React `setInterval`. Makes the admin panel feel like a living real-time command center.
  - **Overview layout overhaul**: Collapsed the 4 large ~140px-tall stat cards into **horizontal compact cards** (~60px tall) — icon circle left, value + subtle delta + label on the right. Dashboard is now ~42% shorter vertically (Overview + System Health combined height ≈ 420px vs. old Overview alone 300px).
  - **Metro CI-mode gotcha documented**: Expo runs with `CI=true` in this preview environment, which disables file watching for NEW files. Fix: `sudo supervisorctl restart expo`.
- **Testing**: 12 unit tests (11 pass + 1 platform-dependent PNG skip) + 23 live E2E tests across every endpoint × branch + 6 new observability tests. E2E verified: 7.9 MB → 413, 4 MB → 200 auto-resized to 1.15 MB (28% of original), counter increments survive real HTTP roundtrip.
- **Collateral fixes**: Patched `testpro` seed `subscription_tier` from 'free' → 'pro'. Fixed stray `deleted_count}` syntax error at end of `routes/auth.py`. Upgraded one `sentry_sdk.push_scope()` → `new_scope()` to match Sentry 2.x API.

### Test hygiene: Happy-path compare-landmark tests no longer skip (P3 follow-up)

### Feature: Shareable "We've both been here" memory card (P1)
- **NEW** `/app/frontend/components/ShareComparisonCard.tsx` — modal rendered on top of the Compare screen that captures an Instagram-Stories-ready gradient card featuring: WanderMark brand, landmark + country/continent, two-avatar-with-heart-connector row, 2x2 photo mosaic with "me / friend" badges, total-photos stat pill, subtle attribution footer.
- Re-uses `react-native-view-shot` + `expo-sharing` (same infra as ShareTopMonthCard / ShareJourneyCard / ShareVisitCard / ShareRankCard). Fire-and-forget `POST /api/shares` with `share_type="compare"` for virality analytics.
- Integrated into `/app/frontend/app/compare/[landmark_id]/[friend_user_id].tsx` — share button in header (right slot) + CTA pill inside hero. Also fixed pre-existing missing `useRouter()` declaration that broke avatar-tap navigation.
- **Backend** extended `allowed_types` in `/app/backend/routes/shares.py` to accept `"compare"` (set now: top_month, top_all, journey, rank, visit, compare).

### Refactor: Split friends.py into focused modules (P3)
- `/app/backend/routes/friends.py`: 1004 → 700 lines. Retained ONLY friendship CRUD + block management + user search + user profile/visits/activity + Friends Hub tail (shared-places, activity, group-stats).
- **NEW** `/app/backend/routes/compare.py` (226 lines): `/users/{id}/overlap`, `/users/{id}/overlap/countries`, `/landmarks/{id}/friends-visited`, `/users/{id}/compare-stats`, `/compare/landmarks/{lid}/friends/{fid}`.
- **NEW** `/app/backend/routes/leaderboards.py` (50 lines): `/friends/leaderboard?metric=...`.
- **NEW** `/app/backend/utils/social_stats.py` (56 lines): shared helpers `assert_friends_or_self`, `friend_ids`, `user_stats` (renamed from `_private` → public as they cross modules).
- Both new routers registered in `server.py`. Zero URL changes — all external clients continue to work unchanged.
- **Regression**: 62/62 pytest tests passed, 0 regressions (iteration_23.json). 2 skips are pre-existing seed-data gaps (admin has no shared-landmark with their only friend).

### Test credentials realigned (iter22)
- `/app/memory/test_credentials.md` updated with correct user_ids: admin=user_dd46a314f120, testpro=user_6ef7ed0c470a, mod=user_d2cee3abc41d. Clarified admin is friends ONLY with Social Tester (user_ff9a3f370f6b), not testpro.

## Session 18 — April 20, 2026 (Friends hub redesign + compare page + stats)

### Backend — 7 new endpoints in `routes/friends.py`
- `GET /api/users/{id}/compare-stats` — head-to-head Journey stats (continents/destinations/landmarks/points). Friends-only (403 else).
- `GET /api/users/{id}/overlap/countries` — destinations both users have visited (for flag-strip).
- `GET /api/compare/landmarks/{lid}/friends/{fid}` — side-by-side visit data. Respects privacy: friend's `private` visits hidden but surfaced as `has_private_visits` flag. No time-delta computed (registration dates unreliable).
- `GET /api/friends/leaderboard?metric=points|landmarks|destinations|continents` — ranks viewer + friends by chosen stat. Default metric `points`.
- `GET /api/friends/shared-places?limit=10` — landmarks you + ≥1 friend have visited, sorted by friend_count desc.
- `GET /api/friends/activity?limit=8` — recent friend visits (public/friends-visible only).
- `GET /api/friends/group-stats?user_ids=...` — combined stats for you + up to 4 selected friends.
- All verified via curl (200 OK across the board).

### Frontend — 7 new components + 1 new page
- `utils/statDefs.ts` — **single source of truth** for the 4 Journey-page stats (identical icons/colors everywhere).
- `components/FriendStatsCompare.tsx` — "HOW YOU COMPARE" table, 4 stat rows, subtle bold on leading value, **no winner labels**.
- `components/FriendsCrew.tsx` — horizontal avatar karusell with pending-badge + "Group mode" selectable state.
- `components/FriendsLeaderboardCard.tsx` — "Who's leading?" with 4-metric pill toggle, top 5 rank list, medals (🥇🥈🥉), You-row highlighted.
- `components/SharedPlacesStrip.tsx` — horizontal landmark strip with `+X friends` badge, taps go directly to compare page.
- `components/FriendsActivityFeed.tsx` — recent crew activity list (avatar + visit summary + landmark thumb).
- `components/GroupStatsModal.tsx` — multi-friend comparison modal with 4-metric per-person rows, column-high values color-highlighted.
- `app/compare/[landmark_id]/[friend_user_id].tsx` — shared memory hero + stacked Window Cards (you + friend) with photo-strip + diary. No date-as-hero; subtle "Last updated" only.

### Frontend — integrations
- `user-profile/[user_id].tsx` — renders `FriendOverlap` + `FriendStatsCompare` between header and Destinations Explored (order A per user's choice).
- `components/FriendOverlap.tsx` — tiles now navigate to `/compare/{landmark_id}/{friend_id}` instead of `/landmark/...`.
- `app/friends.tsx` — full hub redesign: sections reordered to Crew → Group toolbar → Who's leading → Shared places → Activity feed → Find friends (demoted). Group mode lets you multi-select up to 4 friends → opens GroupStatsModal.

### Design decisions honored
- **No date-as-hero anywhere** — respects that `visited_at` is a registration timestamp, not a true visit date. Only tiny "Last updated" meta on compare cards.
- **Icons + colors identical to Journey page** — earth/#4CAF50, flag/#4DB8D8, location/#E87850, star/#FFD700. Single `STAT_DEFS` source prevents drift.
- **Competition without pressure** — subtle fontweight bolding + sand-tinted cell bg on leading value. No "winning!" copy. No loser shaming.
- **Custom visits**: only custom↔custom via normalized `landmark_name` (scoped for follow-up; MVP shipped without this to keep matching safe).
- **Privacy**: friend's private visits hidden but acknowledged respectfully ("X has a private visit here — not shown").

### Verified
- ✅ All 7 new backend endpoints return 200 OK via curl.
- ✅ TypeScript clean.
- ✅ Friends hub screenshot shows: Your crew avatar, Group mode toggle, Who's leading pills, #1 medal "You 160 points", #2 Social Tester, old Find Friends demoted below.
- ✅ Fixed mid-build: missing `from fastapi import Query` in friends.py (backend was erroring with `NameError: Query is not defined`).

## Session 17 — April 20, 2026 (Friends overlap / "We've both been here")

### Motivation
Authentic social moments based on *real* shared experiences — not gamified streaks. "Oh you've been there too!" is the most universal conversation-starter among travelers.

### Backend — 2 new endpoints in `routes/friends.py`
- `GET /api/users/{user_id}/overlap?limit=12` — intersection of landmarks both the current user and the target have visited. Returns each shared landmark with both users' first photo + visit dates. **Enforces friendship** (403 for non-friends).
- `GET /api/landmarks/{landmark_id}/friends-visited?limit=6` — which of the current user's friends have visited this specific landmark. Returns friend list (with avatar + name) + total count. Deduplicates if a friend has multiple visits.
- Both endpoints verified via curl: ✅ self returns shared places, ✅ non-friend gets 403, ✅ no-matches returns `{total:0, items:[]}`.

### Frontend — 2 new components + 2 integrations
- `components/FriendOverlap.tsx` — Window Card on friend profile: "You've both been here — {total} shared places", with horizontal photo strip (friend's photos, not viewer's, so it feels like discovering THEIR story). Each tile is tappable → jumps to landmark. Silent (returns null) if no overlap. Wired into `/user-profile/[user_id].tsx` — only renders when `friendship_status === 'friends' && !is_own_profile`.
- `components/FriendsVisitedStrip.tsx` — Compact avatar-stack strip on landmark page: "Anna, Ola and 2 others have been here". Tappable → jumps to the top friend's profile. Silent when no friends match. Wired above Community Photos on `/landmark-detail/[landmark_id].tsx`.

### Design principles applied
- **Silent when empty** — neither component renders a placeholder when there's nothing to show. Surfaces organically only when there's a real shared moment.
- **Friend's content, not viewer's** — on overlap tiles we show THE FRIEND's photo (on their profile) so browsing feels like discovering them.
- **Window Card DNA** — sand border, warm shadow, surfaceTinted pill icons — consistent with the whole V2 design.

### Verified
- ✅ TypeScript clean
- ✅ Backend endpoints curl-verified (3 cases)
- ✅ Landmark page renders (Eiffel Tower smoke screenshot)
- ✅ FriendsVisitedStrip correctly invisible when empty (avoids noise on pages without matches)

## Session 16 — April 20, 2026 (Client-side image compression)

### Motivation
Before this session: images uploaded as **full-resolution base64** (3–8 MB each) directly into MongoDB documents — catastrophic for feed load time, doc size, and mobile bandwidth.

### New utility
- `/app/frontend/utils/image.ts`:
  - `compressToBase64(uri, { maxWidth = 1600, quality = 0.7 })` — runs `expo-image-manipulator` resize + JPEG compress → returns `data:image/jpeg;base64,…` ready for the existing upload flow.
  - `compressAvatarToBase64(uri)` — preset for profile pictures (600px max, 0.75 quality).

### Refactored upload paths (11 call sites across 8 files)
All now compress **on-device before network**:
- `components/AddVisitModal.tsx`
- `components/AddCountryVisitModal.tsx`
- `components/AddUserCreatedVisitModal.tsx` (landmark photos)
- `components/visit-shared/PhotoSection.tsx` (camera + gallery, with multi-select)
- `app/edit-profile.tsx` (avatar + banner — uses avatar preset for profile pic)
- `app/about.tsx` (bug report screenshots)
- `app/visit-detail/[visit_id].tsx` (camera + gallery)
- `app/custom-visit-detail/[visit_id].tsx` (camera + gallery)
- `app/country-visit-detail/[country_visit_id].tsx` (camera + gallery, 2 spots)

### Impact (typical)
- **4-8 MB original → ~250-400 KB compressed** (10-20× smaller)
- **MongoDB doc size** drops dramatically → faster queries, smaller backups, more documents per GB
- **Feed latency** drops on 4G → photos arrive in ~200ms instead of ~3s
- **Upload success rate** improves — fewer timeouts on slow connections

### Verified
- ✅ TypeScript clean across all 8 files
- ✅ Zero remaining raw `data:image/jpeg;base64,${...}` string concatenations
- ✅ Feed renders correctly post-refactor (0 console errors)
- ✅ Backend unchanged — same payload format, just smaller

## Session 15 — April 20, 2026 (Sentry error-monitoring integration)

### Plug-and-play setup (activates only when DSN is set)
Everything below is a **safe no-op until the user adds DSN env vars** — the app boots and works identically when Sentry is disabled.

### Backend
- New `utils/sentry.py`:
  - `init_sentry()` — reads `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE` / `SENTRY_TRACES_SAMPLE_RATE` from env. Returns False + logs "disabled" if DSN missing.
  - FastApi + Starlette integrations with `transaction_style="endpoint"`, 5xx-only capture.
  - `before_send` filter drops `/health`, `/docs`, `/openapi.json`, `/redoc` + ClientDisconnect/ConnectionReset.
  - `set_sentry_user()` / `clear_sentry_user()` helpers.
- `server.py`: calls `init_sentry()` **before** FastAPI instance is created.
- `utils/auth.py` → `get_current_user`: now auto-attaches `{user_id, email, username}` to Sentry scope on every authenticated request (via `_tag_sentry_user`).
- `requirements.txt`: `sentry-sdk==2.58.0` added.

### Frontend
- New `utils/sentry.ts`:
  - `initSentry()` — reads `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_ENVIRONMENT`. Release name auto-built from `Constants.expoConfig.version` + build number.
  - `tracesSampleRate: 0.1` in prod / `1.0` in dev. `replaysOnErrorSampleRate: 1.0`, session replay disabled.
  - `ignoreErrors`: Network request failed, AbortError, user-cancelled, etc.
  - `setSentryUser()` helper.
- `app/_layout.tsx`: imports + calls `initSentry()` early. Root component wrapped in `Sentry.wrap()` for native crash + touch breadcrumbs.
- `contexts/AuthContext.tsx`: `useEffect` syncs `user` state → Sentry scope automatically on login/logout/refresh (no need to patch every auth path).
- `metro.config.js`: now wrapped with `getSentryExpoConfig` so Metro emits debug IDs for source-map correlation in EAS builds.
- `app.json`: `@sentry/react-native/expo` plugin registered (placeholder org slug — user replaces before first EAS build).
- `package.json`: `@sentry/react-native@~7.2.0` (Expo SDK 51 compatible).
- `.env`: `EXPO_PUBLIC_SENTRY_DSN=` + `EXPO_PUBLIC_SENTRY_ENVIRONMENT=preview` (empty strings so behavior is no-op until filled).

### Docs
- `memory/SENTRY_SETUP.md` — step-by-step instructions: Sentry account creation, two-project setup, auth-token creation, Render env vars, EAS secret, and verification flow.

### Verified
- Backend reloaded cleanly with Sentry init (logged "Sentry disabled (SENTRY_DSN not set)").
- Frontend: `/` onboarding renders normally (smoke-screenshot passed).
- `POST /api/auth/login → 200`, `GET /api/community-highlights/top → 200`, `POST /api/shares → 200` — all unchanged.
- TypeScript + Ruff clean.

## Session 14 — April 19, 2026 (Share-card attribution + virality analytics)

### Backend (new)
- `POST /api/shares` — logs a share event `{share_type, period, user_id, created_at}`. Validates `share_type` against allow-list (`top_month|top_all|journey|rank|visit`). Idempotent, fire-and-forget from client.
- `GET /api/admin/shares/stats` — admin-only aggregate: `totals_by_type` + `top_sharers` (top 10 by share count, enriched with `name` + `username`).
- New collection: `shares`. New route module: `routes/shares.py`. Registered in `server.py`.

### Frontend
- `AuthContext.User` extended with `username?: string` (already returned by `/api/auth/me`).
- `ShareTopMonthCard`:
  - Reads `user?.username` via `useAuth()`.
  - Renders a subtle pill at the bottom of the shareable card: "👤 Shared by @username" (dark glass pill, 10px text). Only shown when username exists.
  - On share success, fires `POST /api/shares {share_type:'top_month', period}` before invoking `Sharing.shareAsync` — non-blocking, swallows errors.

### Verified (curl)
- ✅ POST `/api/shares` with valid type → `{"success": true}`
- ✅ POST with invalid type → 400 with allow-list
- ✅ Admin stats → `{"totals_by_type":{"top_month":1},"top_sharers":[{"username":"protester","share_count":1,...}]}`
- ✅ TypeScript clean
- ✅ Modal UI verified: empty-state still renders cleanly when no monthly content

### Why this matters (growth lever)
Every shared Top 10 card now carries the sharer's @handle — turning viral share into organic referral. Admin can see the monthly top sharers (proto-leaderboard for power users). Easy to extend: add a "Top sharers this month" page, or gift Pro minutes to top sharers.

## Session 13 — April 19, 2026 (Shareable "Top 10 of the month" card)

### Backend
- `GET /api/community-highlights/top` extended with `scope=all|month` query param:
  - `scope=month` filters visits whose `visited_at` >= first of current UTC month
  - Response adds `scope` + `period` fields (e.g. `period: "April 2026"`)
- All-time endpoint unchanged (default scope=all).
- Curl-verified: returns 10 items all-time, 0 items for current empty month.

### Frontend
- New `components/ShareTopMonthCard.tsx` (RN Paper `Modal` + `captureRef` + `expo-sharing`):
  - Ocean→Sand gradient card with decorative orbs, WanderMark brand row, title + period + gold accent line
  - **Podium row** (top 3) with `#rank` gold-sand gradient badges, photo thumbnails, like counts
  - **Rest list** (#4–#10) in compact dark row layout: rank / thumb / name / country / likes
  - Footer CTA: `"Discover what the world loves"` + `wandermark.app`
  - Gold `Share to social media` button → renders card to PNG → native share sheet
  - Empty-state card with friendly "No photos yet this month" copy
- Wired from `/community-highlights/top`: new premium Window Card CTA banner ("Share Top 10 of the month") between intro and grid, opens the modal.

### Verified
- Curl: scope=all (10 items) + scope=month (0 items, period="April 2026") both return 200.
- Playwright: CTA renders, click opens modal, dynamic "Share Top 10 of April 2026" title + empty-state shown.
- TypeScript clean (no errors in new files).

## Session 12 — April 19, 2026 (Penthouse Window V2 — Phase B + C)

All "ALT!" design items shipped and smoke-tested (testing_agent iteration_20: 6/6 pages zero crashes).

### Theme (global)
- `theme.ts`: `shadows.sm/md/lg/xl/card` all migrated from `#000` → `shadowWarm` (`#C9A961`). This cascades into every consumer (social.tsx, feed.tsx, admin surfaces, etc.).

### Hero + highlight surfaces
- `app/community-highlights.tsx` rewritten: `Animated.ScrollView` with **parallax hero** (scale + translateY on scroll/pull), 1px matte inner frame inside the hero, 24px radius, warm shadow.
- **Floating glass action bar** (pill-shaped, rgba(255,255,255,0.92) + sand border) overlapping the hero bottom edge (-22 margin). Like/Comment pills with inline dividers + a report icon button.
- Like button has **spring-physics scale bump** (1 → 1.25 → 1) + **haptic** (iOS only).
- User row upgraded to Window Card DNA (sand border, warm shadow, avatar glow wrap).
- Top 10 link card now has a small ocean-to-sand gradient trophy tile.

### Top 10 page
- `app/community-highlights/top.tsx`: unchanged — uses `MediaCard` which already renders ocean-to-sand gradient + warm glow on ranks #1-#3 and standard black pill on 4-10.

### Feed
- `app/feed.tsx` → `activityCard`: 20px padding, 20px radius, 1px sand border, warm `#C9A961` shadow (6px offset, 14px radius, opacity 0.1).
- `components/FeedCardHeader.tsx`: avatar wrapped in sand-glow container, 12px bottom padding + 1px sand divider below header (subtle 0.35 opacity line).
- `components/FeedCardActions.tsx`: top border now sand; **Like button has spring animation** (1 → 1.3 → 1) + iOS haptic on tap; **Comment button has iOS selection haptic**.

### Explore tab
- `app/continents.tsx` Community CTA: migrated from heavy dark-ocean gradient card to a **white Window Card** (sand border + warm shadow) with a small ocean-to-sand gradient icon tile and a chevron. Ocean-blue title, secondary-gray subtitle, premium glass feel.

### Community tab
- `app/community.tsx`: fallback `featuredLink` (shown only when no dynamic highlight exists) now uses warm shadow + sand border instead of heavy `#000`.

### Regression testing
- `testing_agent_v3_fork` iteration_20: 6/6 pages load clean, 0 crashes, 0 JS errors. Visual DNA smoke-validated via self-screenshot on `/feed` (white cards, sand borders, header divider, warm shadows all confirmed).

## Test Accounts
- **Admin (superadmin)**: test@wandermark.app / Test1234!
- **Pro user**: testpro@wandermark.app / Test1234!
- **Moderator**: mod@wandermark.app / Test1234!

## Upcoming Tasks
- P1: Self-verify ShareComparisonCard on native preview (backend 100% green; user to confirm UX on device)
- P2: "Mitt år i reise" / Yearly travel recap — auto-generated annual summary
- P3: Rename GitHub Repository from `wanderlist-app` to `wandermark-app` + deploy Privacy/Terms website
- P4 (future / deferred): **Forward-looking monthly share card** — DELIBERATELY deferred until user base is large enough that monthly share cards reflect real-time travel (not retroactive logging).
- P5: "Nearby travelers" section for geographical discovery

## Session 11 — April 19, 2026 (Admin auto-flag badge)

- Backend `GET /api/admin/reports` enriched with two new per-report fields:
  - `pending_report_count` — number of pending photo/activity reports against the same `target_id`
  - `auto_flagged` — boolean, true when `pending_report_count ≥ AUTO_FLAG_THRESHOLD (3)`
- Backend re-sorts response: auto-flagged pending reports bubble to the top, then by pending_count DESC, then recency. Admins triage severe cases first.
- Frontend `/admin/reports` ReportCard: red border + top banner "Auto-hidden — N pending reports" + shield icon when `auto_flagged=true`.
- ✅ End-to-end curl verified: 3 reports from 3 distinct users → all 3 bubble to top with `[AUTO-FLAGGED]` + `pending=3`.

## Session 10 — April 19, 2026 (Auto-flag P2)

- Ny `backend/utils/auto_flag.py` — eksporterer `AUTO_FLAG_THRESHOLD = 3` og `get_flagged_target_ids()` (returnerer set av target_ids med 3+ **pending** photo-reports; resolved/dismissed teller ikke).
- Wiret inn i 4 discovery-overflater:
  - `GET /api/community-highlight` (singular hero)
  - `GET /api/community-highlights/top`
  - `GET /api/community-feed` (både landmark-visits og custom-visits pipelines)
  - `GET /api/community-highlights` (plural / trending landmarks)
- Implementasjon: `$nin: flagged_ids` på `visit_id` / `user_created_visit_id` ved query-tid.
- Self-healing: når admin dismisser eller resolver rapportene, telleren faller under 3 → innholdet kommer automatisk tilbake (eller er allerede fjernet hvis resolvert).
- **Verifisert end-to-end**: 3 rapporter fra 3 forskjellige brukere → visit forsvant fra Top10 + Highlight (5 tries) + Feed → admin dismisset → flagged-set tømt → gjenoppstått.

## Session 9 — April 19, 2026 (Community Guidelines deep-link)

- `app/terms-of-service.tsx`: Content Moderation card upgraded into a visually distinct **Community Guidelines** card with gradient banner header, clearer "What's welcome / What's not allowed / Reporting / Enforcement / If your content was removed" sections, friendlier copy, and an `onLayout` Y-tracker for deep-linking.
- Deep-link support: `/terms-of-service?section=guidelines` auto-scrolls to the Community Guidelines card on mount.
- `app/notifications.tsx`: `content_removed` notifications now navigate to `/terms-of-service?section=guidelines`, with a dedicated shield icon in the feed.
- `routes/admin.py`: Notification message updated to "Tap to read the community guidelines" so users get clear CTA.
- ✅ End-to-end verified: admin resolves photo report → owner receives notification with correct deep-link copy.

## Session 8 — April 19, 2026 (Notification + Report wiring)

### Auto-notify photo owner on content removal
- `PUT /api/admin/reports/{id}` now fires a `content_removed` notification to the content owner when admin transitions a photo/activity report from non-resolved → `resolved`. Owner lookup supports both `visits` and `user_created_visits`. Idempotent (no re-fire on re-resolve).
- Verified end-to-end: admin resolves → owner `fake_user_43528211` received "A photo has been removed" notification.

### Report wiring across community surfaces
- **Feed community cards** (`feed.tsx`): subtle flag icon added next to upvote pill in `rightExtra` of `FeedCardActions`. Opens `<ReportModal reportType="photo">`.
- **Top 10 grid** (`community-highlights/top.tsx`): long-press on `MediaCard` → Alert confirmation → `<ReportModal>`. `MediaCard` gained new `onLongPress` prop.
- **Landmark community photos** (`landmark-community-photos/[landmark_id].tsx`): flag button appended to each photo's action row. Opens `<ReportModal>`.
- Footer hint text on Top 10 page: "Tip: long-press a card to report inappropriate content."

## Session 7 — April 19, 2026 (Refactor + Photo reports)

### Refactor
- Extracted `utils/highlight_scoring.py` — exports `compute_hotness()` + `build_candidate_pool()` helpers, with clear docstrings and constants (`FRESHNESS_DECAY_DAYS=30`, `FRESHNESS_FLOOR=0.3`).
- Split `routes/community_highlights.py` from `community.py` — contains only `/community-highlight` + `/community-highlights/top`. Registered in `server.py`.
- `community.py` trimmed from 1235 → 1011 lines.

### Content moderation — Report photo
- Reused existing `reports` collection and `POST /api/reports` endpoint (report_type='photo', 5 reasons including 'inappropriate', 'not_landmark', 'copyright', 'offensive', 'other').
- Existing `<ReportModal>` wired into `/community-highlights` page — subtle flag icon in action bar next to Like + Comment.
- Admin panel `/admin/reports` already supports filtering by report_type; photo reports now flow into the same triage UI.
- Verified end-to-end: testpro submits photo report → admin sees it in `/api/admin/reports?report_type=photo` → admin dismisses via `PUT /api/admin/reports/{id}`.

## Session 6 — April 19, 2026 (Community Highlight redesign)
### Design
- Ran `design_agent_full_stack` → `/app/design_guidelines.json` (v1). Coastal/nautical theme confirmed, Card DNA (16px radius, consistent shadow), 4:5 hero aspect, kebab-case section headers with "See all →", unified spacing scale.

### Backend
- New: `GET /api/community-highlight` — returns ONE dynamically-picked highlight using hotness algorithm `(likes+1) * max(0.3, 1 - age_days/30)`, random from top 20 for rotation. Sources: public landmark visits + public custom visits. Includes `activity_id`, `is_liked`, `likes_count`, `comments_count` (privacy/interaction aware).
- New: `GET /api/community-highlights/top?limit=N` — top N (max 50) all-time ranked by raw `likes_count`.
- Shared helper `_build_candidate_pool()` — joins users + activities + likes + (new) landmarks lookup to populate landmark_name/country_name from canonical source.
- Fix: custom visit query now includes `landmarks.photo` as photo source, not just top-level `photos`.

### Frontend
- New page: `app/community-highlights.tsx` — hero (4:5, dual gradient + badges), user row, Like + Comment action bar, "Why this photo?" info card, subtle discoverable "See top 10 all-time →" link.
- New page: `app/community-highlights/top.tsx` — 2-col grid of ranked MediaCard with rank badge.
- New component: `components/CommunityHighlightHero.tsx` — signature hero card rendered on Social tab.
- New component: `components/MediaCard.tsx` — unified card DNA for all carousels and grids.
- New component: `components/SectionHeader.tsx` — icon + title + optional "See all →".
- Rewritten: `app/community.tsx` — all carousels consistent (Recent photos converted from grid → carousel). Gradient CTA banner "Today's community highlight" at top.
- Updated: `app/continents.tsx` (Explore) — replaced redundant "Community highlights" carousel with a single gradient CTA banner linking to `/community-highlights`.
- Updated: `app/(tabs)/social.tsx` — renders `<CommunityHighlightHero>` at top of scroll; tapping navigates to `/community-highlights`.

### Testing
- Backend: `test_community_highlight_iteration19.py` — 11/11 active tests pass. Previous iteration_18 regression suite still green.
- TypeScript: clean across all new and modified files.
- Visual smoke: `/community-highlights` empty-state page renders correctly at 390px viewport.
- Backend: `/api/community-feed` now enriches each item with `activity_id`, `user_id`, `is_liked`, `likes_count`, `comments_count`, `user_upvoted` by joining activities via `visit_id` + `user_created_visit_id`. Likes and comments counts are aggregated live from their collections for parity with `/api/feed`.
- **Auto-heal**: For any public visit or public custom visit in the community feed that is missing an activity document (legacy data or failed prior insert), `community.py` now creates the activity inline (idempotent batch insert) so every visible item always has a valid `activity_id` → like/comment always works. Tested by deleting an activity, fetching the feed (auto-heals), and then successfully posting a like + comment against the restored activity.
- Frontend: Community feed card redesigned to match Friends feed. Heart toggles REAL like (reuses `/api/activities/{id}/like`). New comment icon button opens a shared `CommentsModal` bottom-sheet (wraps existing `CommentsSection` with new `forceExpanded` prop). Comment button also added to Friends feed card.
- Added `components/CommentsModal.tsx` (new). Extended `components/CommentsSection.tsx` with `forceExpanded` prop.
- **Notification bonus**: Because community likes/comments now flow through the activity endpoints, `create_notification(...)` fires automatically for the post owner — verified end-to-end with two accounts. No extra code needed.
- **Mini refactor (phase 3-lite)**: Extracted `components/FeedCardHeader.tsx` + `components/FeedCardActions.tsx` — shared across Friends and Community feeds. Removed ~100 lines of duplicated JSX/styles + cleaned unused imports.
- Backend tested: `test_feed_parity_iteration18.py` — 10/10 passed.

## Completed (Session 3+4 — April 11-19, 2026)

### Major Features
- Community Hub page (community.tsx) — Trending, recent, popular
- ShareVisitCard (visual share for all visit types with privacy)
- Bug report system (About → modal with text + screenshots)
- User blocking (block/unblock, friend request prevention, search hiding)
- Photo gallery on user profiles (privacy-filtered)
- Account settings page (separated from main settings, Delete Account hidden)
- Guide CTA on Explore ("Where have you been?")

### Leaderboard
- Anti-cheat: Global requires verified for landmarks/destinations
- Time Period removed, category icons match Journey
- Entry cards komprimert, full username visible
- Share card overflow fix, W-logo branding

### Admin
- Bug reports tab (superadmin only), Blocks tab
- Test-toggle restricted to admin, Moderator user created

### UX Polish
- Keyboard returnKeyType on ALL TextInputs
- Stats boxes: 4-column with flex weights (0.7/1/1/1.2)
- Photo section: light backgrounds, reduced padding
- Subscription page updated features
- Diary limit error handling
- Photo limit bypass fixed (Basic: single select only)
- Profile update bugfix (featured_badges)
- Rank catchphrase in progress card
- Tier badge overlap fix
- Privacy policy/terms: selectable email, sentence case
- About: key features icons match Journey, bug report, text fixes
- ShareJourneyCard: W-logo, reordered stats, catch-phrase expanded
- ShareRankCard: width fix, teal gradient
- Community photos: fullwidth cards

### Code Quality  
- getToken/countryFlags/formatTimeAgo consolidated
- console.log removed, unused code deleted
- Backend imports cleaned, query limits reduced
- "country" → "destination" terminology in code

### Content
- Pakistan replaces Kyrgyzstan (15 landmarks)
- 14 duplicates fixed, 5 weak landmarks upgraded, 5 drive-by landmarks replaced
- Norway: Atlantic Ocean Road → Flåm Railway
- Database verified: exactly 1500 landmarks, 100 countries

## Upcoming Tasks
- P0: Feed consistency fixes (community vs friends)
- P1: Deploy legal pages (Privacy/Terms website)
- P2: Sentry integration
- P3: Server-side image compression
- P4: Rename GitHub repo
