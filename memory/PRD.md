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

### Total backend pytest now: 64+ ✅
Critical security surface covered: tier lockdown (10), 2FA (11), lockdown (9), year-recap (8), moderation regression (26).



### P3 — Ops
- Rename GitHub repo `wanderlist-app` → `wandermark-app`

### P4 — App Store
- Deploy Privacy/Terms-pages
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
