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
- Deleted dedicated highlights pages
- TopHighlightsList numbered top 1-10 with scope+continent filter
- ContentMenu universal (••• bottom sheet) — 8 surfaces
- Backend report rate limit (5/hr/user), diary report type
- RN-Web pitfalls fixed (testID + sibling-overlay)

### April 2026 — Admin/moderator polish
- Explore CTA compressed (single-line text)
- admin/reports: 15 reasons, type-color icons, content_preview, audit-trail
- Destructive ops gated to super-admin (recalculate, strip-verified, role changes)
- NEW: make-moderator, demote-to-user endpoints
- Role-aware admin header (Super Admin / Moderator)
- /app/memory/ADMIN_ROLES.md documentation

### April 2026 — Moderator power tools (THIS SESSION — partially done)
- ✅ User model extended: `warning_count`, `warnings[]`, `last_warning_at`, `suspended_until`, `suspension_reason`
- ✅ NEW file `/app/backend/routes/moderation.py` with full implementation:
  - `POST /api/admin/content/{ctype}/{id}/hide` — soft-delete (any moderator)
  - `POST /api/admin/content/{ctype}/{id}/restore` — un-hide
  - `DELETE /api/admin/content/{ctype}/{id}` — hard-delete (super-admin only)
  - `POST /api/admin/users/{id}/warn` — issue warning + auto-escalation (3 in 30d → 7d suspend; 5+ ever → 30d)
  - `POST /api/admin/users/{id}/suspend` — manual N-day suspension
  - `POST /api/admin/users/{id}/unsuspend` — clear suspension
  - `POST /api/admin/users/{id}/message` — send moderator message via push
  - `GET /api/admin/users/{id}/moderation-history` — full mod history per user
  - `GET /api/admin/moderator-activity?days=30` — super-admin dashboard

## ⏳ PENDING — Critical work to complete in next session

### 🔴 P0 — Backend wiring (10 min)
1. **Wire moderation router** into `/app/backend/server.py`:
   ```python
   from routes import moderation
   app.include_router(moderation.router, prefix="/api")
   ```
2. **Update `get_current_user`** in `/app/backend/utils/auth.py` to enforce suspended_until:
   ```python
   if current_user.suspended_until and current_user.suspended_until > datetime.now(timezone.utc):
       raise HTTPException(403, detail=f"Account suspended until {suspended_until}. Reason: {suspension_reason}")
   ```
3. **Filter `hidden: true`** from public feeds:
   - `utils/highlight_scoring.py` `build_candidate_pool` — add `"hidden": {"$ne": True}` to query
   - `routes/feed.py`, `routes/social.py` (if applicable) — same filter
   - Comments listing — exclude `hidden: true`

### 🔴 P0 — Frontend admin UI (90 min)
4. **admin/reports.tsx — content action buttons** between Resolve and Dismiss:
   - "🗑️ Hide content" (soft-delete) — calls `/api/admin/content/{type}/{id}/hide`
   - "Delete permanently" (super-admin only) — calls DELETE
   - Confirmation dialogs with reason input
5. **admin/reports.tsx — warn user button** for user-type reports:
   - "⚠️ Warn user" yellow button → input modal for reason+message
6. **admin/users.tsx — moderation indicators**:
   - Show warning_count badge on user row
   - Show "Suspended until X" if suspended
   - Filter "Has warnings" + "Suspended"
7. **admin/users/[user_id]/moderation.tsx — NEW page** showing:
   - Warning history with reasons
   - Reports against this user
   - Action buttons: Warn, Suspend, Unsuspend, Send message
8. **admin/moderator-activity.tsx — NEW page** (super-admin only):
   - Fetches `/api/admin/moderator-activity?days=30`
   - Renders table sorted by reports_reviewed
   - Columns: name, role, reports handled, avg response time, warnings issued, content removed, last active

### 🟡 P1 — Notifications
9. Add notification handlers in app for new types: `content_hidden`, `warning_issued`, `account_suspended`, `moderator_message`

### 🟡 P1 — Owner UI for hidden content
10. `visit-detail` + `country-visit-detail`: show "⚠️ Hidden by moderator. Reason: X" badge for own visits where `hidden: true`

## Future Backlog
- P2: "Mitt år i reise" yearly summary
- P2: Block user UI in ContentMenu
- P3: Repo rename, Privacy/Terms pages
- P4: "Nearby travelers" discovery

## Key Test Credentials
- Super Admin: `test@wandermark.app` / `Test1234!`
- Pro: `testpro@wandermark.app` / `Test1234!`

## Critical Notes for Next Agent
- **moderation.py created but NOT wired** — must add to server.py first thing
- **Models updated** — User now has `warning_count`, `warnings[]`, `suspended_until`. Backend reload may have happened, verify with `curl /api/auth/me`.
- **`utils/notifications.create_notification`** is the helper used in moderation.py — verify signature matches existing implementation
- **Auth-block for suspended users** is the riskiest pending change — test with admin un-suspending themselves immediately if locked out
- See `/app/memory/ADMIN_ROLES.md` for role matrix
- RN-Web: use `testID` not `data-testid`, avoid nested `<TouchableOpacity>`
