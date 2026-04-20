# WanderMark test credentials

## Active accounts (use for testing)

### Admin (superadmin)
- **Email**: `test@wandermark.app`
- **Password**: `Test1234!`
- Role: superadmin — has full admin panel access
- `user_id`: `user_2c6cfce45eda` (approx — verify with GET /api/auth/me)

### Pro user (most test data)
- **Email**: `testpro@wandermark.app`
- **Password**: `Test1234!`
- Has multiple visits, photos, diary entries — good for feed/compare/overlap testing
- `user_id`: `user_6ef7ed0c470a`
- Username: `protester`

### Moderator
- **Email**: `mod@wandermark.app`
- **Password**: `Test1234!`
- Role: moderator — can moderate reports

## Backend URL
- Preview: `https://friends-hub-v2.preview.emergentagent.com`
- All endpoints prefixed with `/api/`

## Notes
- Admin + Pro User are friends (verified: `/api/friends` returns Social Tester for admin)
- For compare-page testing: admin (test@) → /compare/{any_shared_landmark_id}/{friend_user_id}
- Sentry is ACTIVE (DSN configured) — test events will appear in aarum/wandermark-api project
