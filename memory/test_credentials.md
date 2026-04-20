# WanderMark test credentials

## Active accounts (use for testing)

### Admin (superadmin)
- **Email**: `test@wandermark.app`
- **Password**: `Test1234!`
- Role: superadmin — has full admin panel access
- `user_id`: `user_dd46a314f120`

### Pro user (most test data)
- **Email**: `testpro@wandermark.app`
- **Password**: `Test1234!`
- Has multiple visits, photos, diary entries — good for feed/compare/overlap testing
- `user_id`: `user_6ef7ed0c470a`
- Username: `protester`
- `subscription_tier`: `pro` (confirmed/patched Apr-2026 — prior seed had free)

### Moderator
- **Email**: `mod@wandermark.app`
- **Password**: `Test1234!`
- Role: moderator — can moderate reports
- `user_id`: `user_d2cee3abc41d`

### Social Tester (admin's only friend in seed)
- **user_id**: `user_ff9a3f370f6b`

## Backend URL
- Preview: `https://friends-hub-v2.preview.emergentagent.com`
- All endpoints prefixed with `/api/`

## Notes
- Admin (test@) is friends ONLY with Social Tester (`user_ff9a3f370f6b`) — NOT with testpro. Verify via `GET /api/friends`.
- Admin currently has 0 shared-landmark visits in seed — happy-path compare tests require seeding a shared visit first.
- For compare-page testing: admin (test@) → /compare/{shared_landmark_id}/user_ff9a3f370f6b
- Sentry is ACTIVE (DSN configured) — test events appear in aarum/wandermark-api project.
