# WanderMark E2E Test Plan — Build 83

## Test Accounts
| Account | Email | Password | Role | Tier |
|---|---|---|---|---|
| Admin (superadmin) | test@wandermark.app | Test1234! | admin | pro |
| Pro User | testpro@wandermark.app | Test1234! | user | pro |
| Moderator | mod@wandermark.app | Test1234! | moderator | free |
| Free Msg Test | freetestuser_msg@wandermark.app | Free1234! | user | free |
| Social Tester (admin's friend) | — | — | user | free |

---

## 1. Core Navigation
- [ ] All 4 tabs load (Explore, Journey, Social, Profile)
- [ ] Back navigation works from all pushed screens
- [ ] Tab bar visible on tab screens, hidden on pushed screens

## 2. Explore Tab
- [ ] Continent cards load with correct stats
- [ ] "Community highlights" section visible with chevron → /community
- [ ] Community hub loads (trending, recent, popular sections)
- [ ] Destination list loads when clicking a continent
- [ ] Landmarks list loads from destination
- [ ] **Pakistan** appears in Asia (10 landmarks, replaces Kyrgyzstan)
- [ ] Country flags render correctly with aspect-ratio scaling (Switzerland 1:1, Nepal non-rect, Pakistan dark green)

## 3. Journey Tab
- [ ] Overall progress card shows correct stats
- [ ] My landmark visits → 4-column stats (Visited | Verified | Total pts | Verified pts)
- [ ] My destination visits → same 4-column stats
- [ ] My photos → photo grid loads
- [ ] Points summary → loads without delay, sections in correct order
- [ ] Ranks page → loading spinner then content (no stale flash)

## 4. Social Tab (NEW BADGE + SMART REDIRECT — Build 83)
- [ ] Feed section with "Explore community" link
- [ ] Friends section (komprimert whitespace)
- [ ] Leaderboard preview
- [ ] Click user in feed → user-profile
- [ ] Click user in leaderboard → user-profile
- [ ] **Messages section REMOVED** from Social tab (moved to Friends Hub)
- [ ] **Unread badge dot** on Social tab when there are unread messages OR pending friend requests
- [ ] **Smart tab-redirect**: tapping Social tab with unread messages → jumps directly to `/messages` (only if not already on a `/messages*` route)
- [ ] Badge dot is muted `#D4747E` with white/surface ring (not loud red)
- [ ] Badge disappears when all messages are read

## 5. Friends Hub (NEW MESSAGES ENTRY POINT — Build 83)
- [ ] `/friends` loads with My Friends section visible
- [ ] **Messages Inbox card** (testid `friends-messages-inbox`) appears inside the My Friends block → tapping navigates to `/messages`
- [ ] **New-message notification onboarding card** (testid `new-message-notif-prompt`) appears above Messages Inbox on FIRST visit (native only)
  - [ ] "Turn on" → OS permission prompt → on grant: registers Expo push token via `POST /api/push-token`, card disappears, never returns
  - [ ] "Not now" → card disappears, never returns (AsyncStorage key `@wandermark/msg_notif_prompt_dismissed_v1`)
  - [ ] If OS permission already granted before first open → card never shows (silent persist)
  - [ ] On web → card is hidden
- [ ] Friends list still shows leaderboard card, shared places strip, and activity feed above the prompt

## 6. Messaging (NOW FREE FOR ALL — Build 83)
- [ ] **Login as Free user** (`freetestuser_msg@wandermark.app`)
  - [ ] `GET /api/messages/conversations` returns 200 (NOT 403)
  - [ ] Can send a message to a friend via `POST /api/messages` → 200
  - [ ] Can view message history `GET /api/messages/{friend_id}` → 200
- [ ] Free-tier user with 5 friends can use messaging with all 5
- [ ] Push notification received when a friend sends a message (tap → opens inbox to that conversation)
- [ ] Image message fallback preview: "📷 Sent you a photo"

## 7. Notification Settings (FULLY REWIRED — Build 83)
- [ ] Open from Profile → Settings → Notifications
- [ ] Shows 6 real toggles, each with Penthouse DNA styling:
  - [ ] Messages 💬 (`toggle-messages`)
  - [ ] Likes ❤️ (`toggle-likes`)
  - [ ] Comments 💭 (`toggle-comments`)
  - [ ] Friend requests 👥 (`toggle-friend-requests`)
  - [ ] Achievements 🏆 (`toggle-achievements`)
  - [ ] Weekly digest 📬 (`toggle-weekly`)
- [ ] Toggling Messages OFF → `PUT /api/push-settings` with `{messages_enabled: false}` → 200
- [ ] After toggling OFF, no push notification arrives when a friend sends a message
- [ ] Toggling back ON → notifications resume
- [ ] Permission warning banner appears when OS permission is not granted → tap re-requests
- [ ] Optimistic UI: switch flips instantly, rolls back + Alert on network error
- [ ] Switch disabled during inflight save (prevents double-taps)

## 8. Leaderboard (Full Page)
- [ ] Category chips (Points/Landmarks/Destinations) with colored icons
- [ ] Global: Shows "Verified" label, counts only verified visits
- [ ] Friends: Shows category name, counts all visits
- [ ] No Time Period filter (removed)
- [ ] Kompakt rank box (#1 of X travelers)
- [ ] Entry cards: full username visible, komprimert
- [ ] Share ranking → card renders within bounds
- [ ] Click entry → user-profile

## 9. User Profile
- [ ] Stats, destinations explored, recent photos
- [ ] Friend request flow (Add → Pending → Accept → Friends)
- [ ] **Message button VISIBLE for friends REGARDLESS of subscription tier** (Build 83 change)
- [ ] Block button → confirm dialog → user blocked
- [ ] Blocked user: friend/message buttons hidden

## 10. Shareable Comparison Card — "We've both been here" (Build 83)
- [ ] Open a landmark you AND a friend have both visited
- [ ] Compare card visible with both visit dates, photos, and comparative stats
- [ ] "Share" button → renders card via react-native-view-shot → native share sheet
- [ ] Card respects privacy settings of both users
- [ ] No crash when no shared landmarks exist

## 11. Visit Detail (Landmark)
- [ ] Photo action sheet (Take Photo / Choose from Library / Cancel)
- [ ] PhotoViewer: pinch-to-zoom, smooth scroll
- [ ] Share button → ShareVisitCard modal
- [ ] Privacy respected in share (share_diary)
- [ ] **Upload rejected for >5MB images** (413 Payload Too Large, friendly error)
- [ ] **Upload auto-resized for 2-5MB images** (silent, quality preserved)
- [ ] Upload accepted for <2MB images without recompression
- [ ] Diary save shows "Diary limit" alert for free users at 10/month

## 12. Visit Detail (Destination)
- [ ] Same photo action sheet
- [ ] Same ShareVisitCard
- [ ] Cache invalidation on photo changes

## 13. Edit Profile
- [ ] Username: keyboard with "Done" button
- [ ] Bio: "Done" text button below field
- [ ] Location: keyboard with "Done" button
- [ ] Save button works
- [ ] Profile image upload also enforces 5MB ceiling + auto-resize

## 14. About & Help
- [ ] Key Features: all 7 items with correct icons/colors
- [ ] Point system → /points-summary
- [ ] Custom visits → /custom-visits
- [ ] Rank system → /ranks
- [ ] Leaderboard → /leaderboard
- [ ] FAQ: "Custom visits" in photos list
- [ ] "Total points = verified + unverified" text present
- [ ] "Report an issue" → modal opens, can type, add screenshot, cancel, submit
- [ ] Bug report submitted successfully

## 15. Community Photos
- [ ] All users see all photos (not just 3)
- [ ] Diary locked for basic users
- [ ] Click user name → user-profile
- [ ] Upvoting works

## 16. Subscription (REBALANCED TIERS — Build 83)
- [ ] Free tier now shows: **5 friends**, **3 photos/visit**, **10 diary entries/month**
- [ ] Free tier: **messaging is UNLIMITED** (no Pro gate)
- [ ] Pro features: increased limits + community highlights preview
- [ ] Marketing copy reflects new limits (NOT old 3/1/5)
- [ ] Promo code input: keyboard with "Done"
- [ ] "Basic traveler" and "+ Pro traveler" labels present

## 17. Privacy
- [ ] Settings → Privacy: 3 levels (Public/Friends/Private)
- [ ] Visit visibility respected in community feed
- [ ] User profile photos filtered by privacy
- [ ] Visit detail access control (friends-only blocked for non-friends)

---

## ADMIN TESTING

### 18. Admin Dashboard — COMMAND CENTER (Build 83 redesign)
Login as `test@wandermark.app` (superadmin):
- [ ] Admin dashboard accessible from Profile → settings gear
- [ ] **New compact "Command Center" layout** (AdminSystemHealth.tsx)
- [ ] Real-time refresh button works
- [ ] **Image normalization stats card** visible — shows passthrough / resized / rejected counts from `/api/admin/image-normalization-stats`
- [ ] Clickable metric tiles navigate to detail views
- [ ] Sentry observability counters render (if events exist)
- [ ] Users list loads
- [ ] Can update user role (set moderator/admin)
- [ ] Can delete user (superadmin only)
- [ ] Reports tab: User reports visible
- [ ] Bug reports tab: Bug reports visible with description, screenshots count
- [ ] Blocks tab: Block list visible (if any blocks exist)
- [ ] Promo codes: Create, view, delete
- [ ] Push notifications: Send test notification
- [ ] Test-toggle subscription: Works (admin only)

### 19. Moderator Panel
Login as `mod@wandermark.app`:
- [ ] Admin dashboard accessible
- [ ] Users list loads
- [ ] CANNOT delete users (403)
- [ ] CANNOT change user roles (403)
- [ ] CANNOT see bug reports tab (403 on API)
- [ ] CAN see user reports and blocks
- [ ] Test-toggle: works (admin/mod both have access)

### 20. Role Differentiation Verification
- [ ] Superadmin (test@wandermark.app): Full access to all admin features
- [ ] Moderator (mod@wandermark.app): Limited access (no role changes, no user deletion, no bug reports)
- [ ] Regular user (testpro@wandermark.app): No admin access at all

---

## Share Testing

### 21. Share Functions
- [ ] Landmark visit → ShareVisitCard with photo (if available)
- [ ] Destination visit → ShareVisitCard
- [ ] Custom visit → Share + Delete buttons, ShareVisitCard
- [ ] Journey → ShareJourneyCard (stats card)
- [ ] Profile → ShareJourneyCard
- [ ] Leaderboard → ShareRankCard (no overflow)
- [ ] **Shared-landmark comparison → ShareComparisonCard** (Build 83 NEW)

---

## Anti-Cheat Verification

### 22. Global Leaderboard Integrity
- [ ] Points: Only leaderboard_points (verified) counted
- [ ] Landmarks: Only visits with verified=true counted
- [ ] Destinations: Only visits with verified=true counted
- [ ] Adding a visit WITHOUT photo: Does NOT appear on global leaderboard
- [ ] Adding a photo to visit: NOW appears on global leaderboard

---

## Technical / Observability

### 23. Rate Limiting (Build 83 fix)
- [ ] Hitting `/api/auth/login` >20 times in 60s returns **HTTP 429** (not 500)
- [ ] Hitting any endpoint >120 times in 60s returns 429 with body `{"detail": "Too many requests..."}`
- [ ] Backend logs show NO `ExceptionGroup` stacktraces from `rate_limit.py`

### 24. Image Normalization
- [ ] Upload 2-5MB image → accepted, resized to 1600px, Sentry breadcrumb fires
- [ ] Upload >5MB image → 413 response, Sentry warning fires
- [ ] Upload <2MB image → accepted as-is, passthrough counter increments
- [ ] Admin dashboard shows all three counts updating live

### 25. Sentry Integration
- [ ] Intentionally trigger a test error → appears in Sentry within 1 min
- [ ] Breadcrumbs include route, user_id, and image-normalization events
- [ ] Fails gracefully if SENTRY_DSN is missing (no app crash)
