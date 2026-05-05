# WanderMark — Sources of Truth & Data Dependencies

> **Why this document exists:** When fork-agents (or future engineers) modify code without understanding the data dependency graph, they introduce subtle bugs that take days to track down. This is the canonical map.

## 🎯 Critical Rule

**Never write directly to MongoDB collections from a script that bypasses the canonical create endpoint.** Doing so skips the side-effects (points calculation, activity feed, notifications, achievements). If you must seed data, use the API endpoint, OR mirror its full effect.

---

## 📊 Points System — The Big One

### Source of Truth
**`landmarks` collection** is the canonical source for landmark point values. 1500 landmarks, every one has `points: int` (typically 10 for official, 25 for premium).

### Cached Values (must stay in sync)
| Field | Where | Updated by |
|---|---|---|
| `visits.points_earned` | per visit | Set on visit creation (`POST /visits`). Never auto-recomputed. |
| `users.points` | per user | `recalculate_user_points()` in `utils/helpers.py` |
| `users.leaderboard_points` | per user | Same recompute, only verified visits count |
| `country_visits.points_earned` | per country visit | Set on creation; 50 (manual), 20 (auto_landmark) |

### Triggers — when does recompute fire?
✅ `POST /visits` — landmark visit created → `$inc users.points` directly
✅ `PUT /visits/{id}` — when photos change → calls `recalculate_user_points()`
✅ `DELETE /visits/{id}` — calls `recalculate_user_points()`
✅ `POST /country-visits` (manual) → `$inc users.points`
✅ Auto country/continent bonuses fire from inside `POST /visits`
✅ `POST /admin/recalculate-leaderboard-points` — admin-only nuclear option

❌ When `landmark.points` changes in admin → existing visits keep old value
❌ When seed scripts insert visits directly → no recompute

### Data Integrity Invariants
For every visit document, these MUST be set (use [`/app/backend/tests/test_visit_data_integrity.py`](../backend/tests/test_visit_data_integrity.py) to verify):
- `landmark_name` (string, never null)
- `country_name` (string, never null)
- `points_earned` (int ≥ 0, never null)
- `verified` (bool, never null)

For every user document:
- `role` ∈ `{"user", "moderator", "admin"}` (never missing)
- `subscription_tier` ∈ `{"free", "pro"}`

### Points Sources Breakdown (computed by `recalculate_user_points`)
```
total_points =
   sum(visits.points_earned)                          # 10–25 each
   + sum(country_visits.points_earned)               # 20 (auto) or 50 (manual)
   + len(continents_visited) × 50                    # first-destination bonus
   + 50 × (countries where ALL landmarks visited)    # destination completion
   + 200 × (continents where ALL countries visited)  # continent completion

leaderboard_points = same formula, but only counting `verified` rows.
```

---

## 🛡 Verification System

### Source of Truth
A visit is **verified** ⟺ `len(photos) > 0` (or legacy `photo_base64` is set). The actual `verified: bool` field on the visit is a CACHED value.

### Truth Computation
```python
verified = len(visit.photos or []) > 0 or bool(visit.photo_base64)
```

This logic lives in 3 places — they MUST agree:
1. `routes/visits.py:113` — `update_visit` write path
2. `routes/visits.py:43-46` — `/visits/list` aggregation `$addFields`
3. Frontend: shows `Verified` badge if `item.verified === true`

### Side-effects of becoming verified
- Counts toward `users.leaderboard_points` (global ranking)
- Eligible for "Photo of the week" community feature
- Counts for `verified_destination_completion` / `verified_continent_completion` bonuses
- Trust-event logged

---

## 👥 Friends / Social Graph

**Canonical collection: `friends`** — schema:
```
{ friendship_id, user_id, friend_id, status: "accepted" | "pending", created_at }
```

A `friends` doc is created **once** for the request direction (user_id → friend_id). Both directions are checked at read time.

❌ `friendships` (with extra "s") is a legacy collection — DROPPED on May 5, 2026.

### Reads
- `routes/friends.py` — list, accept, reject
- `routes/feed.py` — friends-only feed filter
- `routes/leaderboard.py` — friends-only leaderboard
- `routes/compare.py` — comparison features
- `utils/social_stats.py` — group stats

---

## 🔐 Auth & Roles

### Roles (string field on `users`)
- `user` — default for new accounts
- `moderator` — can hide/warn/suspend
- `admin` — moderator powers + system access (super-admin tier)

### Role gates
- `get_current_user()` — any authenticated user, enforces suspension
- `get_admin_user()` — `role in {admin, moderator}`
- `get_super_admin_user()` — `role == admin` only (writes to subscription_tier, lockdown, security dashboard)

### 2FA
- Stored on user: `totp_secret`, `totp_enabled`, `totp_grace_started_at`, `totp_backup_codes`
- 7-day grace from first super-admin login → forced enrollment
- Login flow returns `requires_2fa: true` in detail when enabled

### Lockdown
- `system_flags.admin_lockdown: bool` — global circuit breaker
- `assert_not_locked_down` dependency injected into every high-risk write endpoint
- Super-admins can still bypass via stealth-mode reads

---

## 📁 Code Organization

### Route helpers
- `routes/_social_common.py` — shared imports + TTL cache for 5 social-related routers (`stats`, `leaderboard`, `feed`, `friends`, `messages`). The `_` prefix signals "private". Don't move.

### Scripts
- `/app/backend/scripts/` — active maintenance scripts
- `/app/backend/scripts/_archive/` — one-shot fixes from past releases (33 files as of May 2026). Don't delete; future bug investigations may need them as reference.

### Active scripts (as of May 2026)
| Script | Purpose |
|---|---|
| `seed_data.py` | Initial seed for fresh DB |
| `seed_expansion.py` | Extra landmark seed |
| `seed_year_recap_test.py` | Test data for testpro@ Year-in-Travel |
| `recalculate_points.py` | Manual recompute (CLI wrapper) |
| `repair_legacy_visits.py` | Fix visits with null/missing critical fields |
| `verify_requirements.py` | Verify all packages install cleanly |
| `countries_data.py` | Country reference data |
| `premium_landmarks.py` | Premium tier landmark seed |

---

## 🚨 Known Sharp Edges

1. **`v.get("points_earned", 0)` — does NOT default null to 0**, only missing keys.
   Use `(v.get("points_earned") or 0)` to handle both null AND missing.

2. **MongoDB `_id`** is BSON ObjectId, not JSON-serializable. ALWAYS exclude with `{"_id": 0}` projection in `find()` calls.

3. **EAS env injection** — `process.env.EXPO_PUBLIC_BACKEND_URL` is replaced at build time. If `eas.json` doesn't have it set, builds use `utils/config.ts` fallback. Both must point to the same live backend.

4. **Preview pod URL rotation** — `*.preview.emergentagent.com` URLs can change between sessions. For long-lived TestFlight builds, use the Render URL.

5. **Rate limiting** — `slowapi` enforces 10 req/min per IP on `/auth/login`. Pytest single-shot runs trip this. Run auth-heavy test files in isolation, or share a session-scoped login fixture.

---

## 📜 Migration History

| Date | Migration | Affected |
|---|---|---|
| May 5, 2026 | `repair_legacy_visits.py` — backfilled `landmark_name`, `country_name`, `points_earned`, `verified` on 33 visits + role on 14 users | testpro@, test@, 5 fake users |
| May 5, 2026 | Dropped `friendships` collection (legacy, 0 docs) | None |
| May 5, 2026 | Archived 33 one-shot fix scripts → `scripts/_archive/` | None (cleanup) |
| Apr 2026 | Indexes added for `users.email`, `users.locked_until`, `admin_logs.created_at`, `support_tickets`, `tier_quota` | All collections |
| Apr 2026 | TOTP 2FA fields added to user schema | `users` |

---

**Last updated:** May 5, 2026 by data integrity audit
