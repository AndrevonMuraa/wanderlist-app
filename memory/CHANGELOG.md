## June 2026 — visits.py dead-code fix + seed schema fix + lint cleanup ✅

### P0 — `POST /api/visits` lost its whole tail block
Root cause: a large block (milestone activity → `check_and_award_badges` → rank-up notification → `country_completed` / `continent_completed` response flags) had been misplaced **after** the `return` in `get_points_breakdown`, i.e. unreachable dead code referencing undefined names (`visibility`, `old_rank`, `visit`, ...). `add_visit` simply returned the raw visit doc.
Impact (silent, no crash): milestone activities were never created, badges were never re-awarded on visit creation, rank-up notifications never fired, and the frontend celebration logic in `app/add-visit/[landmark_id].tsx` (which reads `result.continent_completed` / `country_completed`) could never trigger.
Fix:
- Moved the block back to the end of `add_visit`; deleted the dead copy.
- Removed `response_model=Visit` from `POST /visits` — Pydantic was stripping the extra flags (`ranked_up`, `new_rank`, `country_completed`, `continent_completed`, `completed_country_name`, `completed_continent`) from the response.
- Verified live: `POST /api/visits` now returns `ranked_up`, `country_completed`, `continent_completed`.

### P0 — E2E seed wrote malformed documents (also present in Render PROD)
- `scripts/seed_e2e_data.py` wrote `country_visits` with a `country` key instead of `country_id` / `country_name` / `continent` / `points_earned` / `has_photos` / `source`, and `user_created_visits` with `user_visit_id` / `name` / `country` / `diary_notes` instead of `user_created_visit_id` / `country_name` / `country_id` / `landmarks[]` / `diary`.
- Consequence: `recalculate_user_points` crashed with `KeyError: 'country_id'` for seeded personas, and seeded country/custom visits were invisible to the app.
- Fixed the seed script to match real schema (looks country up by name in `countries`), plus defensive `.get("country_id")` in `utils/helpers.py` (3 places) so legacy malformed docs can never crash point recompute again.
- **ACTION REQUIRED**: re-run the seed on Render prod after deploy to replace the malformed docs.

### P1 — 99 blocking ruff errors cleared
- Replaced `from ._social_common import *` with explicit imports in `routes/feed.py`, `stats.py`, `leaderboard.py`, `friends.py`, `messages.py` (F403/F405).
- `routes/admin.py`: added missing `import httpx` (F821 — admin broadcast push would have crashed).
- `routes/collections.py`: added missing `Landmark` import (F821 — collection landmark listing would have crashed).
- `routes/community.py` + `routes/visits.py`: `{"$ne": None, "$ne": ""}` (silently dropped duplicate key) → `{"$nin": [None, ""]}` (F601 — diary filters were only applying the last condition).
- `routes/country_visits.py`: 2× bare `except` → `except Exception` (E722).
- `ruff check --select F821,F405,F403,F601,E722 .` → All checks passed.

### Test-infra fixes
- `scripts/seed_year_recap_test.py`: now upsert-based + excludes already-used landmarks + populates `landmark_name`/`country_name`/`points_earned`/`verified` (was crashing on the unique `(user_id, landmark_id)` index and breaking `test_data_integrity`).
- `tests/test_moderation_iteration31.py`: `seeded_visit` fixture now picks a landmark the pro user has NOT visited (was colliding with the unique index).

### Test results (all green)
year-in-travel 8/8, photo-health 6/6, store-readiness 3/3, admin-security 10/10, moderation 26/26, lockdown 9/9, 2FA 11/11, e2e-status 5/5, seed-idempotency 19/19, admin-productivity 17/17, security-dashboard 3/3, visit-crud 17/17, data-integrity 9/9, feed-parity 10/10, comprehensive 24/24.

### Build
- `frontend/app.json` `buildNumber` 88 → **89**.

---


# WanderMark Changelog

## May 18, 2026 (later) — Seed script duplicate-key fix + index hardening

### Bug (P0)
`scripts/seed_e2e_data.py` crashed on production Render Shell with `DuplicateKeyError` on the `visits.user_id_1_landmark_id_1` unique index. Root cause: `pick_landmark()` always returned the first landmark from `LANDMARK_FALLBACKS_BY_CONTINENT` for a given continent, and `seed_visits_for()` inserted without checking for existing user+landmark pairs. Users like `testpro@` had real historical visits (not tagged `_seed_source: "e2e"`) that overlapped with the seed's picks — but the `wipe_seed()` step only removes tagged docs, so real visits remained and caused collisions on re-seed.

### Fix (verified)
- `pick_landmark(db, continent, exclude_ids)` — new `exclude_ids` param filters out landmarks the user already has (both from fallback list AND `$nin`-based DB fallback)
- `seed_visits_for()` now:
  1. Pre-loads all existing `landmark_id`s for the user (seed + real historical)
  2. Passes them as `exclude_ids` on every pick
  3. Tracks in-loop picks (`taken` set) to avoid picking same landmark twice per plan
  4. Wraps `insert_one` in try/except `DuplicateKeyError` as a final safety net
- Fully idempotent — verified via testing_agent under 3 collision scenarios (18/18 pass, iteration_35.json)

### Adjacent hardening
- `utils/db.py::create_indexes()` — refactored from one giant try/except to per-index try/except. Previously an `IndexKeySpecsConflict` on visits(user_id,landmark_id) silently aborted the remaining ~20 index creations. Now every index is attempted independently and skips are logged individually. Prevents silent under-indexing on prod DBs seeded before the unique index existed.

### Docs
- `/app/memory/test_credentials.md` — documented super-admin 2FA gate (login returns 403 requires_2fa_setup by design)

### Files
- `/app/backend/scripts/seed_e2e_data.py`
- `/app/backend/utils/db.py`
- `/app/backend/tests/test_seed_idempotency_iteration35.py` (new regression suite)
- `/app/memory/test_credentials.md`

---

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
