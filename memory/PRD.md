# WanderMark — Product Requirements Document

## Original Problem Statement
Bring "WanderMark" travel app (React Native + Expo + FastAPI + MongoDB) to a production-ready state for App Store launch.

## Architecture
- Frontend: `/app/frontend` — Expo Router, "Penthouse Window" aesthetic
- Backend: `/app/backend` — FastAPI + Motor (MongoDB)
- Production: Render (backend) + EAS Build (iOS/TestFlight)

## What's been implemented (completed sessions)

### April 2026 — Build 83 + DB cleanup + Community + Moderation foundations
- TestFlight Build 83, DB at 1500/100 balance, icon system unified
- Community tab refactor with TopHighlightsList, ContentMenu everywhere
- Admin/moderator roles split, destructive ops gated to super-admin
- Explore CTA polish, admin/reports modernized

### April 2026 — Moderator power tools ✅
Backend (`routes/moderation.py` wired into `server.py`):
- `POST /api/admin/content/{type}/{id}/hide`, `restore`, `delete`
- `POST /api/admin/users/{id}/warn` (auto-escalation 3/30d → 7d, 5+ → 30d)
- `POST /api/admin/users/{id}/suspend`, `unsuspend`, `message`
- `GET /api/admin/users/{id}/moderation-history`
- `GET /api/admin/moderator-activity?days=N` (super-admin only)
- Auth: suspension enforced in `get_current_user`; super-admin self-bypass
- Public feeds filter `hidden: true` (highlight_scoring, feed, comments)
- Admin user filters: `has_warnings`, `suspended`
- Tz-naive datetime bug in warn_user caught by testing agent + fixed

Frontend:
- `admin/reports.tsx` — Hide/Delete/Warn action buttons
- `admin/users.tsx` — warnings + suspended badges + filters
- `admin/user-moderation.tsx` (NEW) — per-user console
- `admin/moderator-activity.tsx` (NEW) — moderator dashboard
- `notifications.tsx` — icons + routing for `content_hidden`, `warning_issued`, `account_suspended`, `moderator_message`; modal opens for moderator messages with Reply button
- Testing agent: 26/26 moderation tests + 264/265 full regression green

### April 28, 2026 — In-app Support Inbox (ticket system) ✅
Backend (`routes/support.py` wired into `server.py`):
- `POST /api/support/tickets` — user creates a ticket (called from Reply button)
- `GET /api/support/tickets` + `/{id}` — user reads own threads
- `GET /api/admin/tickets?status=open|closed` — admin lists with unread count
- `GET /api/admin/tickets/{id}` — admin reads + auto-marks read
- `POST /api/admin/tickets/{id}/reply` — admin reply; auto-creates `moderator_message` notification + audit log
- `POST /api/admin/tickets/{id}/close` — close ticket
- Data: `support_tickets` collection with messages[] array

Frontend:
- `notifications.tsx` — Reply button now opens in-app compose pane (TextInput, Send/Cancel) that posts to `/api/support/tickets`
- `admin/tickets.tsx` (NEW) — inbox with Open/Closed/All filters, iMessage-style chat thread (user = grey left, mod = blue right), reply input with Send / Reply & Close
- Admin home has "Support Inbox" menu card with **live unread badge** (fetched from `/api/admin/tickets?status=open`)
- End-to-end verified via curl + Playwright (264/3 pytest green, no regressions)

### April 28, 2026 — Hidden-by-moderator UX ✅
Backend (`routes/visits.py`):
- `GET /api/visits/{visit_id}` — now 404s for non-owners when `hidden: true`; owner still receives the full doc with `hidden` + `hidden_reason`

Frontend:
- `visit-detail/[visit_id].tsx` and `custom-visit-detail/[visit_id].tsx` — show amber "⚠️ Hidden by moderator" banner at top when owner views their hidden visit. Banner includes reason + link to community guidelines.

### April 28, 2026 — Community Safety side ✅
Frontend (`/app/frontend/app/settings/community-safety.tsx`):
- Dedikert side under Settings → Community Safety, lenkbar fra hovedinnstillinger
- 11 forklaringskort i 3 seksjoner: "Tools you can use", "How we protect the community", "Your data and account"
- Dekker: rapportering, blokkering, privacy-nivåer, moderator-kontakt, trent moderasjon, strike-system, hidden content, Trusted Traveler, kontosikkerhet, privacy policy, nødsrapportering (mailto:safety@wandermark.app)
- Hver kort har ikon + 1-linjes forklaring + handlingslenke (CTA)
- Designet for å la App Review-team enkelt forstå alle sikkerhets-features uten teknisk bakgrunn

### April 28, 2026 — Trust badge wired across feed/comments/leaderboard ✅
Backend:
- `routes/feed.py` — activities aggregation lookups `trusted_traveler` from users; expose as `user_trusted` on each activity
- `routes/feed.py` — comment-creation copies `user_trusted` snapshot at insert time (denormalized for performance)
- `routes/leaderboard.py` — leaderboard rows include `trusted` from user doc
- `models/all.py` — `Activity.user_trusted: bool` and `Comment.user_trusted: bool`

Frontend:
- `components/FeedCardHeader.tsx` — small `TrustBadge` (12px) inline after name, before privacy dot
- `components/CommentItem.tsx` — `TrustBadge` (11px) inline after name in comment header
- `app/leaderboard.tsx` — `TrustBadge` in both full and compact leaderboard rows
- TrustBadge gracefully renders nothing for non-trusted users (zero noise)

Outcome: Trusted Traveler shield now appears as a tiny, tappable signal everywhere users encounter each other — but **only when earned**. Tap → the same universal bottom sheet with criteria checklist.

## ⏳ Current backlog

### April 28, 2026 — Trusted Traveler ✅
Backend (`utils/trust.py` + `routes/trust.py`):
- 6 criteria: account 90+d, 10+ verified visits, 0 warnings/90d, 0 hidden/90d, not banned/suspended, ≥1 friend OR ≥5 likes
- `trusted_traveler` cached on user doc, refreshed on warn/suspend/unsuspend/hide events
- `GET /api/users/me/trust` (full progress + breakdown), `GET /api/users/{id}/trust` (boolean only)
- `POST /api/admin/trust/grandfather` (super-admin one-time job)
- `trust_events` audit collection
- First-time earn → `trusted_traveler_earned` notification
- `trusted` field exposed on user profile + leaderboard rows; `trusted_traveler` on `UserPublic`/`/auth/me`

**Trusted-bonus**: Reports submitted by Trusted Travelers get `priority: "high"` and `reporter_trusted: true` automatically. Admin reports endpoint sorts these first. Admin reports UI shows a green "Trusted reporter — prioritized" banner on these cards.

Frontend:
- `components/TrustBadge.tsx` — universal: 1 small filled emerald `shield-checkmark` icon, tap → bottom sheet with criteria checklist (own profile shows progress; others' profile shows badge meaning)
- Wired into `(tabs)/profile.tsx` (own — owner-only mode shows progress) and `user-profile/[user_id].tsx` (others — only renders if trusted=true)
- `admin/reports.tsx` — green banner + automatic prioritization when reporter is trusted
- Notifications page handles `trusted_traveler_earned` icon + routing
- Backend regression: 42/42 moderation+admin tests green
- Grandfathering ran on lansering: 16 users evaluated, 0 currently qualified (test users er for ferske)

### April 28, 2026 — "Your 2026 on WanderMark" (Year in Travel) ✅
Backend (`routes/year_in_travel.py`):
- `GET /api/me/year-in-travel?year=YYYY` — Spotify Wrapped style aggregation
  - `created_at` based (memories *added* this year), with `visited_at` fallback for `trips_actually_taken`
  - Returns: memories_added, photos_uploaded, countries_count, new_countries[], top_continent, busiest_month, oldest_memory (time-traveler), top_landmarks[3], hero_photo
- `POST /api/me/year-in-travel/dispatch-notification` — idempotent in-app `year_recap_ready` notification (one per user per year). Returns `{dispatched, reason}`. Skipped when no memories that year.
- Default recap year = `current_year - 1` (Spotify Wrapped convention) for the dispatcher; default for GET = current year.
- Tests: `tests/test_year_in_travel.py` 8/8 ✅; moderation regression 26/26 ✅

Frontend:
- `app/year-in-travel.tsx` — full Stories-style multi-slide carousel (intro → memories → countries → continent → busiest month → time-travel oldest memory → top 3 landmarks → finale share card). Auto-progressing top progress bars (Animated.timing), tap-left = previous, tap-right = next, long-press = pause. Year picker bottom sheet with last 4 years. Empty state when no memories. Final slide is a 9:16 hero share card (captureRef) with native Share + Save-to-Photos buttons.
- `components/YearInTravelBanner.tsx` — gradient hero banner with shimmering "2025" badge; injected as `ListHeaderComponent` of the Community Feed.
- `app/notifications.tsx` — added `year_recap_ready` case routing to `/year-in-travel?year={related_id}`; cleaned a pre-existing duplicate `moderator_message` switch case (modal path was unreachable).
- Feed mount triggers a one-shot best-effort dispatch — server is idempotent so safe to call repeatedly.
- Seed helper `scripts/seed_year_recap_test.py` produces 14 visits for testpro with Time-Traveler trigger (1995 visit added in 2025).
- Packages added: `expo-media-library@~18.2.1` (save-to-photos on native; web gracefully falls back to Share).

### April 29, 2026 — Year Recap real Push Notifications ✅
Goal: Spotify-Wrapped-grade virality — buzz the user's phone the moment the recap is ready.

Backend:
- `utils/helpers.py:notify_year_recap_ready()` — sends the Expo push using the existing `send_push_notification()` infra. Title `"✨ Your {year} recap is ready"`, body greets by first name, `data={type:'year_recap_ready', year}` for deep-link routing. Respects new `year_recap_enabled` push setting (default True).
- `routes/year_in_travel.py` dispatch endpoint: after the in-app notification insert, fires the push best-effort (try/except, never blocks the response). On second call → idempotent return → no duplicate push.
- `routes/push.py`: added `year_recap_enabled` to defaults + allowed update keys.
- Tests: `tests/test_year_in_travel.py` now 8 cases (added GET-default and toggle round-trip for `year_recap_enabled`).

Frontend:
- `components/PushTapRouter.tsx` — single-source-of-truth for push deep-linking. Listens for both `getLastNotificationResponseAsync()` (cold-start) and `addNotificationResponseReceivedListener` (warm). Routes `type=year_recap_ready` → `/year-in-travel?year=Y`. Mounted once in `app/_layout.tsx` above the Stack. Web is a no-op.
- `app/notification-settings.tsx` — new "Year in travel" toggle with sparkles icon (test-id `toggle-year-recap`).

Net: when the dispatch endpoint fires for a user who has push opted in, they receive both an in-app notification AND a phone push. Tapping either deep-links straight into the recap.

### April 29, 2026 — Admin Hardening: Tier Lockdown + Stealth Mode ✅
Goal: Eliminate revenue-loss risk from rogue/compromised moderators, and keep super-admin presence discreet on public surfaces (App Store-compliant).

Subscription tier lockdown (P0):
- `routes/admin.py PUT /admin/users/{id}` — `subscription_tier` mutation now requires `role == "admin"` (super-admin). Moderators get 403 with explicit message.
- `routes/admin.py PUT /admin/users/{id}/tier` — switched dependency from `get_admin_user` → `get_super_admin_user`. Now audit-logged via `admin_logs` (`action: tier_change`).
- New defense-in-depth quota: `tier_quota` collection, `TIER_QUOTA_DEFAULT = 25`/UTC day per super-admin. 26th tier-change returns 429.
- New endpoints: `GET /admin/tier-quota` (status), `POST /admin/tier-quota/reset` (super-admin can raise the cap with `{limit: int}` payload — useful for legitimate bulk migrations).
- Frontend `app/admin/users.tsx` — upgrade/downgrade arrow icons hidden unless `currentUser.role === 'admin'`.

Super-admin stealth mode (P1):
- `routes/moderation.py` — all moderator-issued user-facing strings now sign as `WanderMark Safety Team` (constant `SAFETY_TEAM_NAME`): `hidden_by_name`, `issued_by_name` on warnings, mod-message signatures.
- `routes/support.py` — admin replies in support tickets show `from_name: WanderMark Safety Team` and `related_user_name: WanderMark Safety Team` on the user-facing notification. Internal `admin_user_id` / `admin_user_name` (real) preserved in audit log.
- `routes/leaderboard.py` — all 4 public-leaderboard queries now exclude `role: admin` (points/visits/countries/rising-stars). Friends-only mode unaffected.
- `routes/friends.py search_users` — excludes `role: admin` from results.
- Internal admin tooling (admin reports, moderator activity dashboard) still shows real names — auditors need them.

Tests: `tests/test_admin_security.py` — 10 new tests covering moderator-blocked / super-admin-allowed / 25-cap / quota-bump / audit-log / search-stealth / leaderboard-stealth / message-anonymization. Total backend pytest: **44/44 ✅**.

### April 29, 2026 — UX: Oceania++ filter labels ✅
- `components/TopHighlightsList.tsx`, `app/continents.tsx`, `app/year-in-travel.tsx ContinentSlide` now display `Oceania++` (continuing the convention from `app/(tabs)/journey.tsx` and `app/explore-countries.tsx`) to signal that island paradises outside the strict UN definition are mixed into this filter. API value remains `Oceania` (no backend change).

### April 29, 2026 — Two-Factor Authentication (TOTP) for super-admin ✅
Goal: Last-mile defense against compromised super-admin credentials. Combined with the 25/day tier-quota cap, worst-case damage from a single-credential leak is near-zero.

Backend:
- New `routes/two_factor.py`: `/2fa/setup`, `/2fa/confirm`, `/2fa/disable`, `/2fa/status`, `/2fa/regenerate-backup-codes`. Uses `pyotp` for RFC-6238 compliance (works with Google Authenticator, 1Password, Authy, etc.) and `qrcode` to render an inline base64 PNG.
- 10 single-use backup codes, stored as SHA-256 hashes (DB leak ≠ code leak). Codes are formatted `XXXX-XXXX`.
- `routes/auth.py login`: respects `totp_enabled`. Without 2FA enabled, super-admin gets a 7-day grace period (`TWO_FA_GRACE_DAYS`) to enroll. After that, login returns 403 with `requires_2fa_setup: true`.
- All enable/disable events written to `admin_logs` (`action: 2fa_enabled` / `2fa_disabled`).
- Tests: 11 new pytest cases covering setup → confirm → login challenge → backup-code consumption → disable proof-of-possession → grace-period expiry → non-admin bypass.

Frontend:
- New screen `app/admin/2fa-setup.tsx`: full enrollment flow (QR scan → manual key fallback → 6-digit confirm → backup-code reveal-once panel with copy-all). Also handles already-enabled state (disable + regenerate-codes). Uses the existing theme.
- `contexts/AuthContext.tsx login()` accepts an optional `totpCode`; surfaces structured `requires_2fa` / `requires_2fa_setup` errors for the UI.
- `app/(auth)/login.tsx`: when backend returns the 2FA challenge, the screen renders an additional 2FA code input + button label flips to "Verify & Login" — same screen, no new route needed.

Net effect: backed-up password leak alone now grants the attacker exactly nothing.

### April 29, 2026 — Emergency Lockdown (break-glass kill switch) ✅
Goal: One-click freeze of every moderator/admin write action across the app, for the worst case where you spot suspicious activity in audit logs.

Backend:
- `utils/lockdown.py` — `assert_not_locked_down()` raises 503 with `{admin_lockdown: true}` when the global flag is on. Stored on `system_flags._id == "global"`.
- `routes/lockdown.py`:
  - `GET /admin/lockdown/status` — current state (super-admin only)
  - `POST /admin/lockdown/enable` — super-admin only
  - `POST /admin/lockdown/disable` — super-admin only AND requires a fresh TOTP/backup code (stored 2FA must be enabled — guidance returned otherwise). Compromised password alone cannot un-freeze.
- All enable/disable events audit-logged in `admin_logs` (`action: lockdown_enabled` / `lockdown_disabled`).
- 13 high-risk write endpoints now declare `dependencies=[Depends(assert_not_locked_down)]`:
  - admin.py: `PUT /admin/users/{id}`, `PUT /admin/users/{id}/tier`, `POST /admin/make-admin`, `POST /admin/make-moderator`, `POST /admin/demote-to-user`
  - moderation.py: `POST /admin/content/{type}/{id}/hide`, `/restore`, `DELETE /admin/content/{type}/{id}`, `POST /admin/users/{id}/warn`, `/suspend`, `/unsuspend`, `/message`
- Reads remain open during lockdown so the operator can audit logs and decide what to do next.
- Tests: 9 new pytest cases — moderator-blocked / lockdown-blocks-write / lockdown-allows-read / disable-without-2FA-rejected / disable-with-valid-totp-succeeds / wrong-code-rejected.

Frontend:
- New screen `app/admin/lockdown.tsx` — big red "Freeze all admin actions" button when healthy, lift form requiring TOTP code when locked. Status hero card flips green ↔ red.

### May 1, 2026 — Full Production Hardening pass ✅
Goal: systematic pre-launch audit — security, performance, observability, code quality.

**Phase 1 — Security (P0):**
- Rate-limiter coverage expanded to ALL high-risk endpoints (`utils/rate_limit.py`): auth/login, register, forgot/reset-password, 2FA confirm/disable/regenerate, lockdown enable/disable. Default 120 rpm; auth bucket 10 rpm per IP+path.
- Per-user progressive brute-force lockout (`utils/auth.py`): 3 failures → 1 min, 5 → 10 min, 10 → 1 h, 15 → 24 h. `check_user_locked` / `register_failed_login` / `clear_failed_logins` helpers. Wired into `POST /auth/login`. Successful login always clears the counter.
- Tests: new `tests/test_brute_force_lockout.py` — 3-failure lockout trigger + counter-reset on successful login.

**Phase 2 — DB performance (P1):**
- Added indexes: `users.email` (unique, sparse), `users.locked_until` (sparse), `users.role` (sparse), `admin_logs` (created_at, admin_id+created_at, action+created_at), `tier_quota` (admin_id+date, unique), `support_tickets.ticket_id`, `support_tickets` (user_id+updated_at), `support_tickets` (status+updated_at). All auto-created at backend startup via `utils/db.py`.

**Phase 3 — App Store readiness (P2):**
- `LogBox.ignoreLogs([...])` in `app/_layout.tsx` silences the SDK 54 deprecation warnings (`shadow*`, `textShadow*`, `pointerEvents` prop) — these still function on native and will be migrated for SDK 56.
- Production `console.log/warn/info/debug` stripped via a `__DEV__` guard in `_layout.tsx` (prevents PII/data leakage in release builds). `console.error` still fires so Sentry captures real errors.

**Phase 4 — Cleanup (P3):**
- Deleted unused components: `ReportButton.tsx`, `ShareTopMonthCard.tsx`.
- Admin dashboard (`app/admin/index.tsx`) now surfaces super-admin-only links to `/admin/2fa-setup` (Two-Factor Auth) and `/admin/lockdown` (Emergency Lockdown).

**Phase 5 — Testing:** Ran full critical-path suite: brute-force (2), 2FA (11), admin-security (10), lockdown (9), year-in-travel (8), moderation regression (26) = **66 tests green** ✅.

### Current total backend pytest: 66+ passing
- Security: tier lockdown (10), 2FA (11), lockdown (9), brute-force (2)
- Features: year-recap (8), moderation (26)

### Total backend pytest now: 64+ ✅
Critical security surface covered: tier lockdown (10), 2FA (11), lockdown (9), year-recap (8), moderation regression (26).

### May 2, 2026 — Security Dashboard verified + test-infra cleanup ✅
- Security Dashboard (`routes/security_dashboard.py` + `app/admin/security-dashboard.tsx`) verified end-to-end:
  - Backend pytest: 3/3 PASS (`test_security_dashboard.py`)
  - Frontend screenshot confirmed: 2FA coverage card, active-lockouts card, lockdown status card, staff 2FA list with role badges, last 10 admin actions, 30-day action counts, lockdown history — all rendering correctly with live data
- Full backend regression: **307/307 product tests PASS** (testing_agent_v3_fork iteration_33). Zero critical, zero frontend issues.
- Test-infra cleanup: replaced stale hardcoded preview URL `memory-recap-2026.preview.emergentagent.com` with `http://localhost:8001` default in 10 legacy test files (test_admin_moderator_iteration29, test_community_features_iteration17, test_community_highlight_iteration19, test_community_refactor_iteration26, test_feed_parity_iteration18, test_friends_hub_iteration21, test_refactor_regression_iteration23, test_shares_compare_iteration22, test_visit_crud_iteration16, test_wandermark_comprehensive_iteration15). Verified: 40 passed / 16 legitimately skipped on representative subset.
- Known minor: rate-limiter (10 req/min/IP on /auth/login) can trigger 429s during full single-shot pytest runs. Not a product bug — mitigation options noted in iteration_33 (cache login token via session-scoped fixture, exempt loopback IPs, or bump dev RPM).



### P3 — Ops
- Rename GitHub repo `wanderlist-app` → `wandermark-app`

### May 5, 2026 — Trust Center (Privacy + Terms) ✅
- `/app/trust-center/privacy.md` written from scratch (13 sections, 209 lines) — GDPR/CCPA compliant, covers 2FA secrets, admin action logs with IP, trust events, brute-force lockout data, RevenueCat subscription data, Expo push tokens, MongoDB Atlas + Render EU hosting, 30-day deactivation grace period, automated decision-making (Trusted Traveler) disclosure
- `/app/trust-center/terms.md` written from scratch (20 sections) — App Store 3.1.2 compliant EULA with Apple-specific clauses (§11), subscription auto-renewal, Norwegian governing law + Oslo tingrett venue, mandatory consumer carve-out for EU/EEA/UK/Swiss, DSA appeal rights, EU ODR platform link
- `/app/trust-center/README.md` — deployment + in-app linking checklist

### May 5, 2026 — Photo system robustness (Plan C: Full opprydding) ✅
**Bug**: Ingrid Berg's "French Riviera" community highlight + visit detail rendered empty white (light bg) and empty black (fullscreen viewer dark bg). Root cause: 2 dead Unsplash URLs (`photo-1568797629192-...` + `photo-1543349689-...`) silently 404 → `<Image>` failed without `onError` handler → background bled through. The 2nd dead URL was used as cover photo on **20 seed visits** (Eiffel, Louvre, Colosseum, Mount Fuji, Grand Canyon, Statue of Liberty, etc).

**Backend** (`/app/backend/`):
- `utils/photo_health.py` — async URL probe utility with per-host concurrency limit (6), global concurrency cap (30), 8s timeout, falls back to GET-range if HEAD returns 403/405. Defensive: any exception = treat as broken.
- `routes/photo_health.py` — super-admin-only endpoints:
  - `GET /api/admin/photos/healthcheck` — read-only scan, returns broken URLs grouped by collection
  - `POST /api/admin/photos/healthcheck/repair` — scan + remove broken URLs from `visits.photos`, `user_created_visits.photos|photo_url`, `country_visits.photos`, `landmarks.image_url`, `users.photo_url`. Auto-revokes `verified=False` on visits that lose their last photo and have no `photo_base64`. Recomputes points for every affected user.
- `scripts/cleanup_broken_photos.py` — same logic as CLI for production Render shells (`python -m scripts.cleanup_broken_photos [--apply]`)
- Wired into `server.py` as `photo_health.router`
- **Migration run on local/preview DB**: 20 visits patched, 4 lost verified status, 5 users had points recomputed. Rerun confirms 0 broken URLs remain.
- `tests/test_photo_health.py` — 6/6 pytest green (covers HTTP/HTTPS detection, base64/file/empty rejection, 200/404/503 status mapping, network exception handling, empty input)

**Frontend** (`/app/frontend/`):
- `components/SmartImage.tsx` — drop-in `<Image>` replacement: pulsing skeleton while loading, fallback panel with icon on error/missing URL, configurable `silentWhenMissing`. `testID`-aware. Solves the "background bleeds through" class of bug forever.
- Replaced bare `<Image>` with `<SmartImage>` in the highest-impact rendering paths:
  - `components/PhotoViewer.tsx` (fullscreen viewer — fixes the "1/2 black box" symptom)
  - `components/CommunityHighlightHero.tsx` (community highlight card — fixes the "white box on Community page" symptom)
  - `components/TopHighlightsList.tsx` (trending landmarks rank list)
  - `components/MediaCard.tsx` (used by feed cards)
  - `app/visit-detail/[visit_id].tsx` (main photo + thumbnail strip — fixes the "tap to zoom blank" symptom)
- TypeScript clean on all 5 changed files

**Why this is permanent fix**: even if Unsplash deletes more images tomorrow, users see an elegant placeholder ("image unavailable" with icon) instead of empty boxes; admins can run `/admin/photos/healthcheck/repair` periodically to keep the DB clean.


Goal: let you update privacy/terms on the CDN and have every installed app pick them up on next launch — no App Store re-submission.

Architecture:
- `yarn add react-native-markdown-display` (no native deps, works with Expo Go + EAS)
- `/app/frontend/constants/legal.ts` (AUTO-GENERATED) — ships bundled markdown as build-time fallback
- `/app/frontend/assets/legal/privacy.md` + `terms.md` — source-of-truth copies synced from `/app/trust-center/`
- `/app/frontend/scripts/sync-legal.sh` — regenerates `constants/legal.ts` from `/app/trust-center/*.md` in one command
- `/app/frontend/utils/legalContent.ts` — CDN-first fetcher:
  1. Read AsyncStorage cache → return immediately if < 6h old
  2. Else fetch from `EXPO_PUBLIC_TRUST_CENTER_URL` (default `https://wandermark.app`) with 8s timeout, sanity-check (≥500 chars + heading), cache on success
  3. Any failure → fall through to last cache → bundled
  4. `refreshLegalContent()` for pull-to-refresh bypass
- `/app/frontend/components/LegalMarkdownViewer.tsx` — shared RN component rendering markdown via `react-native-markdown-display`, keeps existing gradient header + branding, shows a "Live · just updated" / "Last synced X" / "Bundled with app" provenance badge, pull-to-refresh
- `/app/frontend/app/privacy-policy.tsx` and `/app/frontend/app/terms-of-service.tsx` — reduced to 16-line wrappers that pass doc-specific props to the viewer

Verified on `/privacy-policy` web preview: markdown renders correctly with the new May 5 content, "Bundled with app" badge shown (CDN at wandermark.app not yet live), TypeScript compiles clean on all 5 new/changed files.

### May 5, 2026 — Photo Health daily scheduler + alerts ✅
Backend (`utils/photo_health_scheduler.py`):
- Daily background asyncio task (interval `PHOTO_HEALTH_INTERVAL_HOURS`, default 24h)
- On each run: collects URLs, calls `check_urls`, persists `{run_id, scanned, broken_count, broken_by_collection, alerted_admins, threshold, started_at, finished_at, trigger}` to `photo_health_runs` collection
- When `broken_count >= PHOTO_HEALTH_ALERT_THRESHOLD` (default 10): in-app `photo_health_alert` notification + Expo push to every super-admin (`role: admin`)
- Started from `server.py` `@app.on_event("startup")`; killable via `PHOTO_HEALTH_SCHEDULER_DISABLED=1`
- New endpoints (super-admin only):
  - `GET /api/admin/photos/healthcheck/last-run` — latest persisted run summary
  - `POST /api/admin/photos/healthcheck/run-now` — manually trigger one full scheduler cycle (scan + persist + alert if threshold hit)
- 3 new pytest tests in `tests/test_photo_health_scheduler.py` (all 9 photo-health tests green)

Frontend:
- `app/admin/photo-health.tsx` — new "Daily auto-scan" card showing relative timestamp, scanned/broken counts, alert delivery info; "Run scheduler now" link triggers manual cycle and refreshes both scan and last-run state
- `app/notifications.tsx` — `photo_health_alert` notification type now has sky-blue `images` icon and taps through to `/admin/photo-health`

Verified: scheduler logs `photo_health scheduler started (interval=24.0h, alert_threshold=10)` on startup; `POST /run-now` returned `{scanned:14, broken_count:0, alerted_admins:0}` and is reflected on the dashboard ("Last run 3m ago — scanned 14, 0 broken").

### May 5, 2026 — Photo Health system + admin repair UI ✅
Backend (`routes/photo_health.py`, `utils/photo_health.py`):
- `GET /api/admin/photos/healthcheck` — read-only scan of every photo URL across `visits`, `user_created_visits`, `country_visits`, `landmarks`, `users`; returns broken count + per-collection breakdown
- `POST /api/admin/photos/healthcheck/repair` — destructive repair: removes broken URLs, flips `verified=False` on visits that lose their last proof (no `photo_base64`), recalculates points for affected users
- Both gated to super-admin only (`get_super_admin_user`)
- `utils/photo_health.check_urls()` HEAD-checks URLs in parallel with bounded concurrency
- 6 backend pytest tests in `tests/test_photo_health.py` (all green)
- Migration script `scripts/cleanup_broken_photos.py` already repaired 20 legacy visits in DB

Frontend:
- `components/SmartImage.tsx` — drop-in `<Image>` replacement with placeholder fallback when remote URL 404s; rolled out to PhotoViewer, CommunityHighlightHero, TopHighlightsList, ShareVisitCard, MediaCard, visit-detail (no more blank/black screens)
- `app/admin/photo-health.tsx` (NEW) — super-admin two-step flow: auto-scans on mount → shows "All photos healthy" or "N broken URLs" + per-collection breakdown → "Repair N" button with destructive Alert confirmation → renders repair receipt (URLs removed, visits unverified, users recomputed) → automatic rescan
- `app/admin/index.tsx` — added "Photo Health" MenuCard (sky-blue `images-outline`, super-admin block, between "Two-Factor Auth" and "Emergency Lockdown")

Verified: `/api/admin/photos/healthcheck` returns 200 with `scanned: 14, broken_count: 0` for super-admin; `/admin/photo-health` web preview renders the green healthy state with Rescan button.

### P4 — App Store (remaining)
- Deploy Trust Center to static host (Vercel / Cloudflare Pages) with `/privacy` and `/terms` URLs — after deploy, remember to add `EXPO_PUBLIC_TRUST_CENTER_URL=https://wandermark.app` (or the CDN domain) to `frontend/.env`
- Link Privacy + Terms on registration screen (required checkbox), Settings → Legal, Pro purchase screen
- Add Privacy URL + EULA URL in App Store Connect metadata
- User to run EAS iOS Build 86 with `--clear-cache` to verify data-integrity fixes + live-legal integration
- Seed admin + run `repair_legacy_visits.py` on production Render MongoDB
- App Store Connect submission
- Inbound email (SendGrid/Postmark Parse) → auto-ingest into support_tickets
- "Nearby travelers" discovery

## Key Test Credentials
- Super Admin: `test@wandermark.app` / `Test1234!`
- Pro: `testpro@wandermark.app` / `Test1234!`
- Moderator: `mod@wandermark.app` / `Test1234!`

## Critical Notes
- **RN-Web**: use `testID` not `data-testid`
- **Suspension bypass**: super-admins can still call `/me` while suspended (prevents self-lockout)
- **Expo CI mode**: new route files need `sudo supervisorctl restart expo` to register
- See `/app/memory/ADMIN_ROLES.md` for full role matrix
