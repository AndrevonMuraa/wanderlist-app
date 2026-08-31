# WanderMark test credentials

> Last updated: **May 18, 2026** — Build 88+ — populated by `scripts/seed_e2e_data.py`.
> All accounts marked `_seed_source: "e2e"` are namespaced and safe to wipe via
> `python -m scripts.seed_e2e_data --wipe`.

> ⚠️ **Super-admin 2FA gate**: `test@wandermark.app` returns **HTTP 403** with `{"requires_2fa_setup": true}` on login until 2FA is enrolled. This is **by design** (super-admin accounts must have 2FA before use). Password is still `Test1234!` — the credentials are correct. To enroll: visit `/admin/2fa-setup` in the app after regular login. For automated tests that don't need admin, use `testpro@wandermark.app` instead.

## Active accounts

### Super Admin (super-admin)
- **Email**: `test@wandermark.app`
- **Password**: `Test1234!`
- Role: `admin` (super-admin) — full admin panel + 2FA + lockdown
- `user_id`: `user_dd46a314f120`
- `subscription_tier`: `pro`
- `trusted_traveler`: true

### Pro user — heavy traveller (most data)
- **Email**: `testpro@wandermark.app`
- **Password**: `Test1234!`
- `user_id`: `user_6ef7ed0c470a`
- Username: `testpro`
- `subscription_tier`: `pro`
- `trusted_traveler`: true
- ~28 verified visits, 3 country visits, 4 custom visits, 370 pts (post-seed)

### Pro user #2 — friend graph
- **Email**: `testpro2@wandermark.app`
- **Password**: `Test1234!`
- `subscription_tier`: `pro`
- ~12 verified visits, 2 custom visits — friend of testpro + testfree

### Free user — Freemium gate testing
- **Email**: `testfree@wandermark.app`
- **Password**: `Test1234!`
- `subscription_tier`: `free`
- 8 visits, 1 country visit — friend of testpro + testpro2
- Has 3 open support tickets + 8 pending reports as reporter
- Has pending friend request to admin

### Suspended user — moderation/auth flow
- **Email**: `testsuspended@wandermark.app`
- **Password**: `Test1234!`
- Login succeeds, but `/auth/me` returns 403 with suspension banner.
- `suspended_until`: now + 30 days
- `suspended_reason`: "E2E test — suspension flow validation"

### Brand-new user — empty-state flows
- **Email**: `testnew@wandermark.app`
- **Password**: `Test1234!`
- No visits, no friends, no points — exercises empty-state UI everywhere.

### Moderator
- **Email**: `mod@wandermark.app`
- **Password**: `Test1234!`
- Role: `moderator`
- `user_id`: `user_d2cee3abc41d`

## Friend graph (after seed)
- testpro ↔ testpro2 (accepted)
- testpro ↔ testfree (accepted)
- testpro2 ↔ testfree (accepted)
- testfree → admin (pending request)
- testpro2 → admin (pending request)

## Seed artifacts
- 8 pending reports filed by `testfree` against pro/pro2 visits (covers all 4 reasons)
- 3 open support tickets from `testfree` (photo upload / subscription / lost visits)
- 2 visits flagged `hidden=true` (covers the "hidden by moderator" banner UX)

## Backend
- All endpoints prefixed with `/api/`
- MongoDB: `MONGO_URL` from `/app/backend/.env`

## How to (re)seed
```bash
# Local / preview
cd /app/backend && python -m scripts.seed_e2e_data

# Wipe all e2e data (does NOT delete users — only their seeded content)
cd /app/backend && python -m scripts.seed_e2e_data --wipe

# Production Render shell
cd /opt/render/project/src/backend && python -m scripts.seed_e2e_data
```

## Notes
- Sentry DSN configured in preview env — events appear in `aarum/wandermark-api`.
- Suspension reason text shown on UI may differ from DB — UI surfaces the friendly fallback "Violation of community guidelines" for App-Store-friendly tone; the DB still stores the precise reason for audit.
