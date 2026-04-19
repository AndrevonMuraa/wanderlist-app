# WanderMark PRD

## Product Overview
WanderMark is a gamified travel app where users visit landmarks, earn points, compete on leaderboards, and share their travel experiences. React Native (Expo Router) + FastAPI + MongoDB Atlas.

## Current State (April 19, 2026)
- 100 destinations, 1,500 landmarks, 20 ranks, 30+ badges
- BuildNumber: 82
- Backend: Render (auto-deploy from GitHub) — api.wandermark.app
- Database: MongoDB Atlas
- Pakistan added, Kyrgyzstan removed, 24 landmark upgrades applied

### CRITICAL NOTES
- "Destinations" not "Countries", "Basic Traveler" not "Free user", "Pro Traveler" not "Pro user"
- `recalculate_user_points()` is SINGLE SOURCE OF TRUTH for points
- Sentence case everywhere (not Title Case)
- Global leaderboard requires verified (photo) for ALL 3 categories
- Friends leaderboard shows all (verified + unverified)
- Icon colors: location=#E87850, flag=#4DB8D8, earth=#4CAF50, star=#FFD700, diamond=#1E8A8A

## Test Accounts
- **Admin (superadmin)**: test@wandermark.app / Test1234!
- **Pro user**: testpro@wandermark.app / Test1234!
- **Moderator**: mod@wandermark.app / Test1234!

## Pending Issues (for next fork)
- ~~P0: Feed consistency — Community vs Friends tabs have different like/date/info behavior~~ ✅ DONE (April 19, 2026 — Session 5)
- P0: User profile crash on leaderboard click — possibly aspectRatio issue, fixed with Dimensions but needs testing
- P0: Verify all fixes in Build 83

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
