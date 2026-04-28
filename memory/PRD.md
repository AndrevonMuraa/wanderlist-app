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

Frontend:
- `components/TrustBadge.tsx` — universal: 1 small filled emerald `shield-checkmark` icon, tap → bottom sheet with criteria checklist (own profile shows progress; others' profile shows badge meaning)
- Wired into `(tabs)/profile.tsx` (own — owner-only mode shows progress) and `user-profile/[user_id].tsx` (others — only renders if trusted=true)
- Notifications page handles `trusted_traveler_earned` icon + routing
- Backend regression: 42/42 moderation+admin tests green
- Grandfathering ran on lansering: 16 users evaluated, 0 currently qualified (test users er for ferske)

### P2 — Engagement
- "Mitt år i reise" (Year in Travel) auto-summary with shareable cards
- Block user directly from ContentMenu
- Community trust score badge (clean record 90d → "Trusted Traveler")

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
