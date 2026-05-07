# WanderMark — E2E Manual Test Plan (Build 86)

> Paste this entire file into a new GitHub Issue. Tick checkboxes as you go.
> Tests are organised by **persona** so a single tester can complete a full pass.
> Re-seed the DB anytime with `python -m scripts.seed_e2e_data`.

## Pre-flight
- [ ] Render production DB has been seeded with `python -m scripts.seed_e2e_data` (verify via `/admin/users` showing 7 e2e accounts)
- [ ] Backend health check `GET /api/health` → 200
- [ ] iOS Build 86 installed on a real device via TestFlight
- [ ] App opens to login screen with no crash
- [ ] Sentry receives a startup breadcrumb (verify in Sentry → `wandermark-frontend`)

---

## Test Accounts (post-seed)

| Persona | Email | Password | Role | Tier | Expected state |
|---|---|---|---|---|---|
| Super Admin | `test@wandermark.app` | `Test1234!` | admin | pro | Trusted, 2 visits, full admin panel |
| Pro (heavy) | `testpro@wandermark.app` | `Test1234!` | user | pro | Trusted, ~28 visits, 370 pts |
| Pro #2 | `testpro2@wandermark.app` | `Test1234!` | user | pro | ~12 visits, 120 pts |
| Free | `testfree@wandermark.app` | `Test1234!` | user | free | 8 visits, 60 pts, 3 tickets, 8 reports |
| Suspended | `testsuspended@wandermark.app` | `Test1234!` | user | free | Login OK, /me 403 |
| Brand new | `testnew@wandermark.app` | `Test1234!` | user | free | 0 visits, 0 friends |
| Moderator | `mod@wandermark.app` | `Test1234!` | mod | free | Limited admin panel |

---

## 0. Auth & onboarding

### Brand-new user — `testnew@wandermark.app`
- [ ] Login succeeds
- [ ] Empty-state hero on Journey: "Start your first journey"
- [ ] Empty Explore feed shows continent cards but no "Recently visited"
- [ ] Profile shows `0 visits · 0 friends · 0 points`
- [ ] No leaderboard rank shown (no spinner stuck)
- [ ] No Trusted Traveler badge
- [ ] Year-in-Travel banner is hidden (or shows "no memories yet")

### Brand-new user — register flow (manual)
- [ ] Register → Privacy + Terms checkbox is REQUIRED before "Sign Up" enables
- [ ] Tapping "Privacy" link opens `/privacy-policy` (live markdown)
- [ ] Tapping "Terms" link opens `/terms-of-service` (live markdown)
- [ ] Sign Up creates account → lands on Explore tab
- [ ] Sign In with Apple button visible & functional (real Apple ID)

### Suspended — `testsuspended@wandermark.app`
- [ ] Login returns 200 with token (no crash)
- [ ] `/auth/me` returns 403 with friendly suspension banner
- [ ] App shows blocking screen "Account suspended until ..." with Contact Support link
- [ ] Tapping "Contact Support" opens mail / in-app ticket compose
- [ ] User cannot navigate past the blocking screen

### Brute-force / lockout
- [ ] Wrong password 3× in a row → 4th attempt returns `423 Locked` with cool-down message
- [ ] Successful login resets the counter (verify by trying 1 wrong then 1 correct)

### Forgot password
- [ ] `Forgot password?` link sends magic email
- [ ] Reset link opens `/reset-password?token=...` correctly
- [ ] New password works on next login

---

## 1. Free-tier persona — `testfree@wandermark.app`

### Free limits & paywalls
- [ ] Friends list shows 2 friends (testpro + testpro2) — gating banner if >5 attempts
- [ ] Try to upload 4th photo to a single visit → blocked with "Upgrade to Pro" CTA
- [ ] Try to write 11th diary entry this month → blocked with "Diary limit" alert
- [ ] **Messaging IS unlocked for free** — open conversation with testpro, send message
- [ ] Tapping any "Pro" lock CTA navigates to `/subscription`

### Subscription screen
- [ ] Shows current plan: "Basic traveler"
- [ ] Pro tier card lists: 5 → unlimited friends, 3 → 10 photos/visit, 10 → unlimited diary, all community highlights
- [ ] Subscription length, exact price, auto-renewal disclosure visible
- [ ] **Privacy Policy** + **Terms of Use (EULA)** links visible directly under purchase CTA — both open the live markdown viewers
- [ ] "Restore Purchases" button works and shows result
- [ ] Promo code input keyboard has "Done" button

### Reports & moderation feedback
- [ ] Reporter (testfree) sees their 8 reports' status under Profile → My reports (if surface exists)
- [ ] Filing a new report on any visit → success toast + optimistic add to list

### Support tickets
- [ ] Profile → Support → see 3 open tickets
- [ ] Tap a ticket → shows iMessage-style thread with user's body
- [ ] Send a follow-up reply from user side → appears immediately

### Friend requests
- [ ] Friends tab shows pending OUTGOING request to admin
- [ ] Cancelling the pending request works
- [ ] Adding admin via search → outgoing request resent

---

## 2. Pro-tier persona — `testpro@wandermark.app`

### Heavy traveller surfaces
- [ ] Journey: 28+ verified visits, 370+ points, 4-column stats correct
- [ ] Explore: continent stats reflect Europe heavy concentration
- [ ] Map view: pins distributed across all 5 continents
- [ ] Year-in-Travel banner appears in Community feed
- [ ] Tap banner → full Stories carousel renders all 8 slides + share card
- [ ] Time-traveller slide includes the 1990s ancient visit (3650 days ago)

### Privacy levels in feed
- [ ] Public visits visible to admin (non-friend)
- [ ] Friends-only visits visible to testpro2 + testfree (friends), hidden from admin
- [ ] Private visits invisible everywhere except own Profile

### Trusted Traveler
- [ ] Profile shows TrustBadge with "Earned" state (testpro has 28+ verified, ≥1 friend → all 6 criteria pass)
- [ ] Tap badge → bottom sheet with criteria checklist all green
- [ ] Comments by testpro across feed show TrustBadge inline after name

### Custom visits
- [ ] Custom visits screen shows 4 entries (grandmother's village, café, beach, cabin)
- [ ] Tap → custom-visit-detail loads with photos
- [ ] Share button works (no overflow on the share card)

### Pro-only features
- [ ] Unlimited diary entries (verify: write entry #11 in a month — succeeds)
- [ ] Unlimited friends (verify: add 6th friend via search — succeeds)
- [ ] Up to 10 photos/visit (try 4th photo upload — succeeds)
- [ ] All community highlights unlocked

### Hidden visit (banner UX)
- [ ] One of testpro's seeded visits is `hidden=true` — open it
- [ ] Amber banner "⚠️ Hidden by moderator" visible at top with reason
- [ ] Banner links to community guidelines page
- [ ] Same visit returns 404 when admin or testpro2 opens it via deep link

### Photos & uploads
- [ ] Upload <2MB photo → accepted, no resize indicator
- [ ] Upload 2-5MB photo → silently resized, accepted
- [ ] Upload >5MB photo → 413 with friendly toast
- [ ] PhotoViewer pinch-zoom + fullscreen works without black bleed (SmartImage fallback)

### Year-in-Travel push
- [ ] Profile → Notification Settings → "Year in travel" toggle ON
- [ ] Trigger dispatch via dev tool / repeat call (server idempotent)
- [ ] Push received with title `✨ Your 2025 recap is ready`
- [ ] Tap push (cold start + warm start) → deep-links into recap

---

## 3. Pro #2 persona — `testpro2@wandermark.app`

### Friend-driven feed
- [ ] Community feed shows posts from testpro + testfree (friends)
- [ ] Friends-only visits from testpro are visible (friend access)
- [ ] Cannot see admin or moderator visits unless public
- [ ] Pending friend request to admin visible in outbox

### Compare flow
- [ ] Open landmark visited by both testpro2 & testpro → "We've both been here" card
- [ ] ShareComparisonCard renders within bounds
- [ ] Native share sheet opens
- [ ] Comparison respects each user's privacy

### Leaderboard
- [ ] Global leaderboard: testpro at top of pro/free testers
- [ ] Friends leaderboard: testpro2 sees self + testpro + testfree
- [ ] Admin (super-admin) NOT visible in global leaderboard (stealth mode)
- [ ] TrustBadge appears next to testpro on leaderboard rows

---

## 4. Moderator persona — `mod@wandermark.app`

### Reports queue
- [ ] Admin → Reports: see 8 pending reports from testfree
- [ ] Trusted reporter banner appears on testpro/testpro2 reports? (testfree is NOT trusted, so no banner expected)
- [ ] Hide content button works → visit becomes hidden, owner sees banner
- [ ] Restore content works
- [ ] Warn user → user receives `warning_issued` notification
- [ ] After 3 warnings in 30d → auto-suspend 7d (verify via warnings field)

### Support inbox
- [ ] Admin → Tickets: 3 open tickets visible with unread badge
- [ ] Open ticket → reply → sends → user receives `moderator_message` push (signed "WanderMark Safety Team")
- [ ] Close ticket flips status → moves to Closed filter

### Moderator restrictions (verify 403s)
- [ ] PUT user role → 403
- [ ] DELETE user → 403
- [ ] PUT `/admin/users/{id}/tier` → 403
- [ ] Bug reports tab → 403
- [ ] Cannot access `/admin/2fa-setup` (super-admin only)
- [ ] Cannot access `/admin/lockdown`
- [ ] Cannot access `/admin/store-readiness`
- [ ] Cannot access `/admin/photo-health`
- [ ] Cannot access `/admin/security-dashboard`

---

## 5. Super-admin persona — `test@wandermark.app`

### Admin dashboard
- [ ] Command Center loads with all System Health tiles
- [ ] Photo Health tile shows "0 broken · clean · Xm ago"
- [ ] Sentry observability counters update on test events
- [ ] Image normalization stats card live counts

### Tier change with quota
- [ ] Upgrade testfree → pro: works, audit log entry created (`tier_change`)
- [ ] Downgrade back to free: works
- [ ] Verify `/admin/tier-quota` shows count incremented
- [ ] Bulk tier-change > 25/day returns 429
- [ ] Quota reset endpoint raises cap when called with `{limit: 50}`

### 2FA enrolment
- [ ] `/admin/2fa-setup` shows QR + manual key
- [ ] Enter authenticator 6-digit code → confirm → backup codes revealed once
- [ ] Copy-all backup codes → confirm reveal-once panel never reappears
- [ ] Logout → next login requires 2FA code (login screen flips to "Verify & Login")
- [ ] One backup code consumed for login → no longer valid for re-use
- [ ] Disable 2FA requires fresh TOTP/backup code (cannot disable with password alone)

### Emergency lockdown
- [ ] `/admin/lockdown` → tap red "Freeze all admin actions"
- [ ] Status flips red, all 13 high-risk endpoints return 503 with `{admin_lockdown: true}`
- [ ] Try to hide a visit → blocked with toast
- [ ] Reads still work — admin can browse audit logs
- [ ] Disable lockdown REQUIRES TOTP code (no fallback)
- [ ] Wrong code rejected; valid code lifts lockdown
- [ ] Audit log shows `lockdown_enabled` + `lockdown_disabled` events

### Store Readiness dashboard
- [ ] Hero: "Ready to submit" / "Ready — with warnings" / "N blockers"
- [ ] Server checks: 9 rows pass/warn/fail with status pills
- [ ] Build & environment: 4 rows
- [ ] Pull-to-refresh works
- [ ] "Manual checklist" card visible with App Store Connect tasks
- [ ] Watchdog card shows "All clear · next scan in Xh" or current state
- [ ] Tap "Run watchdog now" → state refreshes immediately
- [ ] If a check fails for >24h → super-admin receives `store_readiness_alert` push + in-app notif

### Photo Health
- [ ] `/admin/photo-health` auto-scans → shows result
- [ ] If broken URLs found: "Repair N" button → confirm → receipt rendered
- [ ] Daily auto-scan card shows last run summary
- [ ] "Run scheduler now" triggers manual cycle

### Security Dashboard
- [ ] 2FA coverage card shows X / Y staff enrolled
- [ ] Active lockouts (brute-force) list updates live
- [ ] Lockdown status card reflects current state
- [ ] Last 10 admin actions list with timestamps + IPs
- [ ] 30-day action counts chart renders

### Stealth mode (verify on user-facing surfaces)
- [ ] Friend search by `mod` or `test admin` → admin user NOT in results
- [ ] Public leaderboard categories → admin NOT in list (4 endpoints)
- [ ] Moderator-message notifications all signed `WanderMark Safety Team`
- [ ] Support ticket replies show `from_name: WanderMark Safety Team`

### Trust Center grandfather
- [ ] `POST /admin/trust/grandfather` returns evaluated count
- [ ] Re-running is idempotent

---

## 6. Cross-cutting flows

### Push notifications
- [ ] Year recap push: `type=year_recap_ready` deep-links to recap (cold + warm)
- [ ] Photo health alert push: `type=photo_health_alert` → `/admin/photo-health`
- [ ] Store readiness alert push: `type=store_readiness_alert` → `/admin/store-readiness`
- [ ] Trusted Traveler earned push: `type=trusted_traveler_earned` → notifications screen
- [ ] Notification settings toggles persist round-trip
- [ ] Permission denied: in-app banner offers re-request

### Privacy & data export
- [ ] Settings → Privacy → 3 levels work for new visits
- [ ] Account deactivation → 30-day grace period notice
- [ ] Cancel deactivation within grace → account reactivated on next login
- [ ] Profile → Export my data → ZIP includes visits, photos, diary

### Trust Center (live markdown)
- [ ] `/privacy-policy` renders live markdown with provenance badge ("Live · just updated" / "Last synced X" / "Bundled with app")
- [ ] Pull-to-refresh forces a fresh fetch
- [ ] Disable wifi → still renders cached/bundled copy
- [ ] `/terms-of-service` same checks
- [ ] When `EXPO_PUBLIC_TRUST_CENTER_URL` is set → "Live" badge after fetch

### Rate limiting
- [ ] 10× failed login attempts on one IP / minute → 429
- [ ] 120 req/min on any endpoint → 429 with friendly body
- [ ] Backend logs show NO `ExceptionGroup` traces

### Sentry
- [ ] Trigger a deliberate error (e.g., dev-only `Throw` button) → appears in Sentry within 1 min
- [ ] Breadcrumbs include user_id, route, push events
- [ ] Sentry DSN unset → app still boots

### Anti-cheat / leaderboard integrity
- [ ] Add a visit WITHOUT photo → does NOT appear on global leaderboard
- [ ] Add photo to that visit → NOW appears on global leaderboard
- [ ] Verified pts on global = sum of `points_earned` where `verified=true` (no nulls)
- [ ] Friends leaderboard counts ALL visits (verified + unverified)

### App Store compliance
- [ ] `usesNonExemptEncryption: false` → no encryption-export prompt at upload
- [ ] Build number = 86, version increments correctly
- [ ] Camera/Photo permission strings appear in iOS prompts
- [ ] Privacy Manifest `PrivacyInfo.xcprivacy` present in IPA
- [ ] Reviewer demo creds added to App Store Connect "App Review" section

---

## 7. Regression smoke test (1-minute pass)
- [ ] Login as testpro → Explore → Journey → Social → Profile (all tabs load)
- [ ] Open a visit detail → photo viewer → back
- [ ] Open the leaderboard → tap a user → user-profile loads
- [ ] Open notifications → tap one → routes correctly
- [ ] Logout → login as another persona → no leaked state from prior session

---

## 8. Known caveats (don't open as bugs)
- Web build: PushTapRouter is a no-op
- LogBox suppresses three SDK 54 deprecations (`shadow*`, `textShadow*`, `pointerEvents`) — to be migrated for SDK 56
- Suspension UI text shown to user is the friendly fallback ("Violation of community guidelines"); precise reason is in DB for audit
- Trusted Traveler grandfather job has 0 currently qualified test users — testpro is set via seed override

---

## After the pass
- [ ] Comment on this issue with `git rev` of the build tested
- [ ] File any failures as separate issues + link back here
- [ ] Once 100% green: tag release `v1.0.0-rc.86`, then submit to App Store Connect

> Wipe e2e seed data after the pass: `python -m scripts.seed_e2e_data --wipe`
