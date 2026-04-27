# WanderMark — Product Requirements Document

## Original Problem Statement
Bring "WanderMark" travel app (React Native + Expo + FastAPI + MongoDB) to a production-ready state for App Store launch.

## Architecture
- **Frontend**: `/app/frontend` — Expo Router, "Penthouse Window" aesthetic
- **Backend**: `/app/backend` — FastAPI + Motor (MongoDB)
- **Production**: Render (backend) + EAS Build (iOS/TestFlight)

## What's been implemented (recent)

### April 2026 — Build 83+ session
- ✅ Build 83 EAS build successful → TestFlight
- ✅ Production DB cleaned: 1500 landmarks / 100 countries (300/20 per continent)
- ✅ Icon system unified (footsteps-outline / shield-checkmark-outline / star / shield-checkmark / star-outline)
- ✅ Pytest suite 205/205 green

### April 2026 — Community refactor + reporting overhaul session
- ✅ Shape-shifting bug fixed: Community Highlight hero → /community → DIRECTLY to /visit-detail
- ✅ Deleted /community-highlights.tsx + /community-highlights/top.tsx
- ✅ TopHighlightsList — numbered top 1-10, gold/silver/bronze badges, scope+continent filter
- ✅ ContentMenu universal component (overlay/subtle/compact), 8 surfaces converted
- ✅ Backend report rate limit (5/hr/user), diary report type
- ✅ RN-Web pitfalls fixed: `data-testid` → `testID`, nested TouchableOpacity → sibling-overlay

### April 2026 — Polish + Admin/Moderator modernisation session (current)
- ✅ **Explore CTA compressed**: Removed compass icon + 3px blue border-left, single-line copy "Track your visits, earn points, top the ranks." (centered)
- ✅ **Admin/reports type-filter UI**: Color-coded chips for User (purple), Photo (blue), Diary (orange), Comment (green), Activity (pink)
- ✅ **REPORT_REASONS expanded**: 15 entries covering all backend reasons (was only 5) — human-readable labels for `inappropriate_diary`, `harassment_diary`, `fake_visit`, `wrong_location`, etc.
- ✅ **Differentiated type icons**: TYPE_ICONS map renders correct icon+color per report_type
- ✅ **Content preview in admin reports**: Backend enriches reports with `content_preview` (photo thumbnail, diary snippet ≤200 chars, comment text ≤300 chars) so moderators can decide without leaving the queue
- ✅ **Audit trail**: `update_admin_report` now stores `reviewed_by_user_id`, `reviewed_by_name`, `reviewed_by_role`. Frontend renders audit row with role-shield icon + reviewer name + date
- ✅ **Destructive ops gated to super-admin**: `recalculate-leaderboard-points` and `strip-verified-points` now require `get_super_admin_user`
- ✅ **NEW endpoints**: `POST /api/admin/make-moderator/{user_id}` + `POST /api/admin/demote-to-user/{user_id}` (both super-admin only, with admin_logs audit)
- ✅ **Improved 403 message**: `get_super_admin_user` now returns descriptive "This action requires Super Admin privileges. Moderators cannot perform destructive operations..."
- ✅ **Role-aware admin header**: `/admin` shows "Super Admin" (gold shield-checkmark) or "Moderator" (silver shield-outline) based on user.role
- ✅ **Documentation**: Created `/app/memory/ADMIN_ROLES.md` with full role matrix, endpoint coverage, audit trail details

## Prioritized Backlog

### P1 — Polish
- ⏳ Cleanup remaining `data-testid` HTML-attrs in visit-detail (line 567/606/621) + feed.tsx (dead reportTarget state)
- ⏳ Seed public visit with diary in preview DB so non-owner diary ContentMenu can be exercised

### P2 — New features
- ⏳ "Mitt år i reise" — Auto-generated yearly summary with shareable cards
- ⏳ Block user UI in ContentMenu user-variant (backend route exists)
- ⏳ Filter "Show only moderators" in /admin/users for quick role overview

### P3 — Operational
- ⏳ Rename GitHub repo: `wanderlist-app` → `wandermark-app`
- ⏳ Deploy legal pages site (Privacy/Terms) — App Store requirement

### P4 — Future
- ⏳ "Nearby travelers" geographical discovery
- ⏳ Data-cleanup session for 12 remaining "activity-like" landmarks

## Key Test Credentials
- Super Admin: `test@wandermark.app` / `Test1234!`
- Pro user: `testpro@wandermark.app` / `Test1234!`

## Key API Endpoints (added/modified)
- `GET /api/community-highlights/top?limit=10&scope=all|month&continent=Europe`
- `POST /api/reports` — supports `report_type=diary`, 5/hr per-user rate limit
- `GET /api/admin/reports` — now enriches with `content_preview` + audit fields
- `PUT /api/admin/reports/{report_id}` — stores `reviewed_by_*` audit fields
- `POST /api/admin/make-moderator/{user_id}` — NEW (super-admin only)
- `POST /api/admin/demote-to-user/{user_id}` — NEW (super-admin only)
- `POST /api/admin/recalculate-leaderboard-points` — NOW super-admin only
- `PUT /api/admin/users/{user_id}/strip-verified` — NOW super-admin only

## Critical Notes
- **3-tier role system**: `admin` (super), `moderator`, `user` (default null/missing)
- **Super-admin only**: role changes, leaderboard recalc, strip verified, bug-reports
- **Moderator scope**: stats, users (ban/tier only), reports moderation, blocks, notifications, analytics
- See `/app/memory/ADMIN_ROLES.md` for complete role matrix
- ContentMenu hides itself when `isOwnContent={true}`
- Backend rate-limit env vars: `RATE_LIMIT_DEFAULT_RPM` (prod 120), `RATE_LIMIT_AUTH_RPM` (prod 20)
- **RN-Web pitfalls**: Use `testID` (camelCase) NOT `data-testid`. Avoid nested `<TouchableOpacity>`.
