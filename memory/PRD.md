# WanderMark — Product Requirements Document

## Original Problem Statement
Bring "WanderMark" travel app (React Native + Expo + FastAPI + MongoDB) to a production-ready state for App Store launch.

## Architecture
- Frontend: `/app/frontend` — Expo Router, "Penthouse Window" aesthetic
- Backend: `/app/backend` — FastAPI + Motor (MongoDB)
- Production: Render (backend) + EAS Build (iOS/TestFlight)

## What's been implemented (completed sessions)

### April 2026 — Build 83 + DB cleanup
- Build 83 EAS build → TestFlight
- Production DB: 1500 landmarks / 100 countries (300/20 per continent)
- Icon system unified, pytest 205/205

### April 2026 — Community refactor + reporting overhaul
- Shape-shifting bug fixed (Community Highlight hero direct nav)
- Deleted dedicated highlights pages; TopHighlightsList numbered top 1-10
- ContentMenu universal (••• bottom sheet) — 8 surfaces
- Backend report rate limit (5/hr/user), diary report type
- RN-Web pitfalls fixed (testID + sibling-overlay)

### April 2026 — Admin/moderator polish
- Explore CTA compressed; admin/reports type-color icons + content_preview + audit trail
- Destructive ops gated to super-admin (recalculate, strip-verified, role changes)
- make-moderator, demote-to-user endpoints
- Role-aware admin header (Super Admin / Moderator)
- `/app/memory/ADMIN_ROLES.md` documentation

### April 2026 — Moderator power tools (COMPLETE) ✅
Backend (`/app/backend/routes/moderation.py` wired in `server.py`):
- `POST /api/admin/content/{ctype}/{id}/hide` — soft-delete (moderator+)
- `POST /api/admin/content/{ctype}/{id}/restore` — un-hide
- `DELETE /api/admin/content/{ctype}/{id}` — hard-delete (super-admin only)
- `POST /api/admin/users/{id}/warn` — issue warning + auto-escalation (3 in 30d → 7d suspend; 5+ ever → 30d)
- `POST /api/admin/users/{id}/suspend` — manual N-day suspension
- `POST /api/admin/users/{id}/unsuspend` — clear suspension
- `POST /api/admin/users/{id}/message` — send moderator message
- `GET /api/admin/users/{id}/moderation-history` — per-user history
- `GET /api/admin/moderator-activity?days=30` — super-admin dashboard
- Auth: `get_current_user` enforces `suspended_until` (returns 403 w/ reason); super-admin bypasses to self-unsuspend
- Public feeds filter `hidden: true` (highlight_scoring, feed, comments)
- Admin user listing filters: `has_warnings=true`, `suspended=true`
- User model extended: `warning_count`, `warnings[]`, `last_warning_at`, `suspended_until`, `suspension_reason`
- All destructive actions audit-logged via `admin_logs` collection

Frontend:
- `admin/reports.tsx` — Hide / Delete (super-admin) / Warn action buttons on report cards
- `admin/users.tsx` — Warnings + Suspended badges + filters; user row click routes to new moderation page
- `admin/user-moderation.tsx` (NEW) — full per-user moderation console: warn/suspend/unsuspend/message, warning history, reports list
- `admin/moderator-activity.tsx` (NEW, super-admin only) — per-moderator stats: reports reviewed, avg response time, warnings/suspensions/content actions
- Admin home gets super-admin-only link to moderator activity

### Testing (Apr 2026)
- Pytest 238 passed, 3 skipped (no regressions, e2e-verified suspend/unsuspend flow)

## ⏳ P1 backlog
- Notification handlers in app for new types: `content_hidden`, `warning_issued`, `account_suspended`, `moderator_message`
- `visit-detail` / `country-visit-detail`: "⚠️ Hidden by moderator" badge on own hidden content

## Future Backlog
- P2: "Mitt år i reise" yearly summary with shareable cards
- P2: Block user directly from ContentMenu (currently routed via profile)
- P3: Repo rename `wanderlist-app` → `wandermark-app`
- P4: Deploy Privacy/Terms website
- P4: "Nearby travelers" discovery

## Key Test Credentials
- Super Admin: `test@wandermark.app` / `Test1234!`
- Pro: `testpro@wandermark.app` / `Test1234!`
- Moderator: `mod@wandermark.app` / `Test1234!`

## Critical Notes
- **RN-Web**: use `testID` not `data-testid`; avoid nested `<TouchableOpacity>`
- **Suspension bypass**: Super-admins (`role === "admin"`) can still call `/me` while suspended — prevents lockout
- See `/app/memory/ADMIN_ROLES.md` for full role matrix
