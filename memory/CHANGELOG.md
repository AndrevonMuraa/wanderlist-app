# WanderMark Changelog

## May 18, 2026 — Explore "Your World Progress" Card (Build 88)

### UX uplift
- **Replaced passive "Track your visits, earn points, top the ranks." strip** on Explore tab with new **"Your World Progress"** card
- Card mirrors the "Destination Progress" pattern from continent pages → consistent visual DNA across the hierarchy
- 3 rows with semantic icons + colored progress bars:
  - 🌍 **Continents Started** (Ocean teal `#3BB8C3`) — X/5 continents with ≥1 destination visit
  - 🚩 **Destinations Visited** (Sky blue `#4DB8D8`) — sum across all 5 continents / 100 total
  - ⭐ **Points** (Amber `#FFA726`) — totalPoints / 22 500
- Top-right amber `★ pts` badge identical to country-page badge

### Data sources (no new endpoints)
- `/api/continent-stats` — aggregated client-side for continents started + destinations visited + grand totals
- `/api/progress` — `totalPoints` field (authoritative, same source as Profile)
- Parallel fetch via `Promise.all` + `cachedFetch` (5 min cache)

### Why this lifts the app
- New users see "0/100 destinations · 22 500 points to earn" — sparks curiosity
- Experienced users see top-level mastery progress at a glance
- Hierarchical consistency: Explore (global) → Continent (countries) → Country (landmarks)

### Files touched
- `/app/frontend/app/continents.tsx` — added `GlobalProgress` interface, dual fetch, progress card render, matching styles. Removed `guideCta` block + styles.
- `/app/frontend/app.json` — iOS `buildNumber: 87 → 88`

### Verified
- Smoke test on preview env with testpro@: card renders correctly with live prod data (3/5 · 7/100 · 290/22 500)
- Backend logs confirm `/api/continent-stats` + `/api/progress` called in parallel on tab focus

---

## May 5, 2026 — Code Health Audit & Data Repair (Build 85)

### Critical fixes
- **Repaired 33 legacy visits** with null/missing `landmark_name`, `country_name`, `points_earned`, `verified` — root cause of "★ pts"-bug visible in iOS Build 84
- Backfilled `role: "user"` on **14 users** missing the field
- Re-ran `recalculate_user_points` for 7 affected users (test@: 160→170 pts, testpro@: null→290 pts)
- Made `recalculate_user_points` defensive: `(v.get("points_earned") or 0)` instead of `.get(k, 0)` — handles both null AND missing
- Added defensive `$ifNull` for `points_earned` in `/visits/list` aggregation (falls back to landmark.points)
- Defensive `or 0` in `/points/breakdown` for both visits + country_visits

### Frontend
- Replaced `data-testid` → `testID` across **57 files** — was non-functional on iOS native, blocking automated UI tests on the platform we're shipping to App Store
- Fixed brand string: `WANDERLIST` → `WANDERMARK` in `terms-of-service.tsx` line 309 (App Store requirement)

### Cleanup
- **Dropped legacy `friendships` collection** (0 docs, replaced by `friends` long ago)
- Archived **33 one-shot fix scripts** to `/app/backend/scripts/_archive/` (kept 8 active essential scripts)
- Updated EAS build config: bumped iOS buildNumber 84 → 85, fixed dead URL in `eas.json`/`utils/config.ts`
- Backend on Render: fixed deploy by removing unused `emergentintegrations`, pinning `typer==0.24.0`, relaxing `google-auth==2.49.0`, adding `--extra-index-url` flag, locking Python to 3.11.11 via `.python-version`

### Documentation
- **NEW**: `/app/memory/SOURCES_OF_TRUTH.md` — canonical map of data dependencies, points formula, verification logic, sharp-edge gotchas. Future fork-agents MUST read this before touching points/visits/leaderboard code.
- **NEW**: `/app/backend/tests/test_data_integrity.py` — 9 invariants that fail loudly if any of these regressions return

### Tests
- 9/9 NEW data integrity tests PASS
- 3/3 security dashboard PASS
- 10/10 admin security PASS
- 26/26 moderation PASS
- 11/11 two-factor PASS
- 9/9 lockdown PASS
- 2/2 brute-force PASS
- **Total: 70/70 verified PASS this iteration**

### Migration Script
- `python -m scripts.repair_legacy_visits` — idempotent, safe to re-run on Render production after deploy

---

## May 2, 2026 — Security Dashboard verified
- Backend pytest 3/3 + frontend screenshot confirmed
- Full backend regression: 307/307 product tests PASS (testing_agent_v3_fork iteration_33)
- Cleaned stale preview URL in 10 legacy test files

---

## April 28, 2026 onwards
See `/app/memory/PRD.md` for full architectural history (Build 83 + DB cleanup, Community refactor, Moderation, Support Inbox, Year-in-Travel, Admin Hardening, TOTP 2FA, Lockdown, Security Dashboard).
