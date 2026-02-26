# WanderMark - Product Requirements Document

## Original Problem Statement
Build a travel engagement app (WanderMark) with content management, admin features, community engagement, and marketing tools. The app should be English-only for all UI and API content.

## Core Requirements
- Full-stack React Native (Expo SDK 54) + FastAPI + MongoDB
- Admin panel for content management
- Community features (Photo Gallery, Photo of the Week, Travel Diary, Community Feed)
- Promo code system for marketing
- Editable email template for promo code emails

## Architecture
- **Backend**: Modular FastAPI with routes in `backend/routes/`, models in `backend/models/all.py`, utils in `backend/utils/`
- **Frontend**: Expo Router (file-based routing) at `frontend/app/`
- **Database**: MongoDB via `MONGO_URL` env variable

## What's Been Implemented

### Backend Refactoring ✅
- Migrated monolithic `server.py` into modular route files
- Routes: auth, admin, promo, etc.

### Promo Code System ✅
- Admin: create single/batch codes, deactivate, delete, export CSV
- Email dispatch via Resend integration
- Email dispatch history
- User redemption via subscription page
- **Editable email template** (GET/PUT /api/admin/email-template)

### Norwegian → English Translation ✅ (Feb 26, 2026)
- All UI text in `promo-codes.tsx` translated to English
- All UI text in `subscription.tsx` translated to English
- All backend error messages in `promo.py` translated to English
- Email template content translated to English
- Date formats changed from `nb-NO` to `en-US`

### Editable Email Template ✅ (Feb 26, 2026)
- Backend: `email_templates` collection in MongoDB
- GET /api/admin/email-template returns current template
- PUT /api/admin/email-template updates template fields
- Template fields: subject, heading, subheading, body_text, code_label, steps_title, steps[], footer_text, support_text
- Send-email endpoint uses stored template
- Admin UI: new "Email Template" tab in promo-codes page

### UI Layout ✅
- "Photo of the Week" moved to bottom of Explore page

### Landing Page Redesign — Compete Section (Feb 26, 2026)
- Replaced "Earn Achievements" with "Compete & Climb" in feature cards
- Added new "Compete with Travelers Worldwide" showcase section with dark gradient
- Shows rank tiers (Explorer, Adventurer, Legend) with medal icons
- Points breakdown: Visit +100pts, Photo +50pts, Diary +75pts, Streak +25pts
- Updated Quick Start step 3 to "Compete & Rise"

### Custom Visits Community Improvements (Feb 26, 2026)
- P1: Community feed now includes custom visits (source='custom') merged with landmark visits
- P2: PATCH /api/user-created-visits/{id}/visibility — change visibility after creation (public/friends/private)
- P3: GET /api/community/custom-visits — dedicated paginated endpoint for browsing all public custom visits

### Email Preview & Reset Feature (Feb 26, 2026)
- "Preview email" button in template editor opens full-screen modal
- Renders the email HTML template with sample data (EXAMPLE-CODE, lifetime Premium)
- Shows subject line in a preview bar
- Uses iframe on web, WebView on native
- "Reset to default" button restores template to factory settings (with confirmation dialog)
- Fixed tab rendering bug: template tab no longer shows history content
- Added error/retry state when template fetch fails

## Key API Endpoints
- POST /api/auth/login → {access_token}
- GET/POST /api/admin/promo-codes
- POST /api/admin/promo-codes/batch
- DELETE /api/admin/promo-codes/{code_id}
- GET /api/admin/promo-codes/export (CSV)
- POST /api/admin/promo-codes/send-email
- GET /api/admin/promo-codes/email-history
- GET/PUT/DELETE /api/admin/email-template
- PATCH /api/user-created-visits/{id}/visibility
- GET /api/community/custom-visits
- POST /api/promo-codes/redeem

## DB Collections
- `promo_codes`: code, type, duration_days, max_uses, current_uses, is_active, created_at
- `promo_redemptions`: code_id, user_id, redeemed_at
- `promo_email_logs`: log_id, code_ids, emails, subject, results, sent, failed
- `email_templates`: template_id="promo_email", subject, heading, subheading, body_text, etc.

## 3rd Party Integrations
- Expo SDK 54, Apple Authentication, Resend (email), RevenueCat (IAP), Cloudflare (DNS/email)

## Test Credentials
- Email: test@wandermark.app / Password: Test1234! (admin role)

## Backlog
- **P0**: New EAS Build for device testing
- **P2**: Verify RevenueCat, statistics sharing on device
