# WanderMark PRD

## Product Overview
WanderMark is a gamified travel app where users visit landmarks, earn points, compete on leaderboards, and share their travel experiences. React Native (Expo Router) + FastAPI + MongoDB Atlas.

## Current State (April 19, 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 82
- Backend: Render (auto-deploy from GitHub) — api.wandermark.app
- Database: MongoDB Atlas
- Design system: V2 "Penthouse Window" DNA (warm #C9A961 shadows, 1px sand borders, matte inner frames, floating glass pills, ocean-to-sand rank gradients)

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
- P1: Sentry Integration for production error monitoring
- P2: Server-side image compression/resizing
- P3: Rename GitHub Repository from `wanderlist-app` to `wandermark-app`
- P4: "Nearby travelers" section for geographical discovery

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
