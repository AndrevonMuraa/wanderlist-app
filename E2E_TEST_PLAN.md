# WanderMark E2E Test Plan — Build 82

## Test Accounts
| Account | Email | Password | Role | Tier |
|---|---|---|---|---|
| Admin (superadmin) | test@wandermark.app | Test1234! | admin | free |
| Pro User | testpro@wandermark.app | Test1234! | user | free |
| Moderator | mod@wandermark.app | Test1234! | moderator | free |

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

## 3. Journey Tab
- [ ] Overall progress card shows correct stats
- [ ] My landmark visits → 4-column stats (Visited | Verified | Total pts | Verified pts)
- [ ] My destination visits → same 4-column stats
- [ ] My photos → photo grid loads
- [ ] Points summary → loads without delay, sections in correct order
- [ ] Ranks page → loading spinner then content (no stale flash)

## 4. Social Tab
- [ ] Feed section with "Explore community" link
- [ ] Friends section (komprimert whitespace)
- [ ] Leaderboard preview
- [ ] Click user in feed → user-profile
- [ ] Click user in leaderboard → user-profile

## 5. Leaderboard (Full Page)
- [ ] Category chips (Points/Landmarks/Destinations) with colored icons
- [ ] Global: Shows "Verified" label, counts only verified visits
- [ ] Friends: Shows category name, counts all visits
- [ ] No Time Period filter (removed)
- [ ] Kompakt rank box (#1 of X travelers)
- [ ] Entry cards: full username visible, komprimert
- [ ] Share ranking → card renders within bounds
- [ ] Click entry → user-profile

## 6. User Profile
- [ ] Stats, destinations explored, recent photos
- [ ] Friend request flow (Add → Pending → Accept → Friends)
- [ ] Message button visible only for friends
- [ ] Block button → confirm dialog → user blocked
- [ ] Blocked user: friend/message buttons hidden

## 7. Visit Detail (Landmark)
- [ ] Photo action sheet (Take Photo / Choose from Library / Cancel)
- [ ] PhotoViewer: pinch-to-zoom, smooth scroll
- [ ] Share button → ShareVisitCard modal
- [ ] Privacy respected in share (share_diary)
- [ ] Adding/removing photo triggers cache invalidation
- [ ] Diary save shows "Diary limit" alert for basic users at limit

## 8. Visit Detail (Destination)
- [ ] Same photo action sheet
- [ ] Same ShareVisitCard
- [ ] Cache invalidation on photo changes

## 9. Edit Profile
- [ ] Username: keyboard with "Done" button
- [ ] Bio: "Done" text button below field
- [ ] Location: keyboard with "Done" button
- [ ] Save button works

## 10. About & Help
- [ ] Key Features: all 7 items with correct icons/colors, navigate to correct screens
- [ ] Point system → /points-summary
- [ ] Custom visits → /custom-visits (not Journey)
- [ ] Rank system → /ranks (no crash)
- [ ] Leaderboard → /leaderboard
- [ ] FAQ: "Custom visits" in photos list
- [ ] "Total points = verified + unverified" text present
- [ ] "Report an issue" → modal opens, can type, add screenshot, cancel, submit
- [ ] Bug report submitted successfully

## 11. Community Photos
- [ ] All users see all photos (not just 3)
- [ ] Diary locked for basic users
- [ ] Click user name → user-profile
- [ ] Upvoting works

## 12. Subscription
- [ ] Updated feature list (no "Photo of the Week", "Community Photo Preview")
- [ ] Shows "Basic traveler" and "+ Pro traveler" labels
- [ ] Promo code input: keyboard with "Done"

## 13. Privacy
- [ ] Settings → Privacy: 3 levels (Public/Friends/Private)
- [ ] Visit visibility respected in community feed
- [ ] User profile photos filtered by privacy
- [ ] Visit detail access control (friends-only blocked for non-friends)

---

## ADMIN TESTING

### 14. Admin Panel (login as test@wandermark.app — superadmin)
- [ ] Admin dashboard accessible from Profile → settings gear
- [ ] Users list loads
- [ ] Can update user role (set moderator/admin)
- [ ] Can delete user (superadmin only)
- [ ] Reports tab: User reports visible
- [ ] Bug reports tab: Bug reports visible with description, screenshots count
- [ ] Blocks tab: Block list visible (if any blocks exist)
- [ ] Promo codes: Create, view, delete
- [ ] Push notifications: Send test notification
- [ ] Test-toggle subscription: Works (admin only)

### 15. Moderator Panel (login as mod@wandermark.app)
- [ ] Admin dashboard accessible
- [ ] Users list loads
- [ ] CANNOT delete users (403)
- [ ] CANNOT change user roles (403)
- [ ] CANNOT see bug reports tab (403 on API)
- [ ] CAN see user reports and blocks
- [ ] Test-toggle: works (admin/mod both have access)

### 16. Role Differentiation Verification
- [ ] Superadmin (test@wandermark.app): Full access to all admin features
- [ ] Moderator (mod@wandermark.app): Limited access (no role changes, no user deletion, no bug reports)
- [ ] Regular user (testpro@wandermark.app): No admin access at all

---

## Share Testing

### 17. Share Functions
- [ ] Landmark visit → ShareVisitCard with photo (if available)
- [ ] Destination visit → ShareVisitCard
- [ ] Custom visit → Share + Delete buttons, ShareVisitCard
- [ ] Journey → ShareJourneyCard (stats card)
- [ ] Profile → ShareJourneyCard
- [ ] Leaderboard → ShareRankCard (no overflow)

---

## Anti-Cheat Verification

### 18. Global Leaderboard Integrity
- [ ] Points: Only leaderboard_points (verified) counted
- [ ] Landmarks: Only visits with verified=true counted
- [ ] Destinations: Only visits with verified=true counted
- [ ] Adding a visit WITHOUT photo: Does NOT appear on global leaderboard
- [ ] Adding a photo to visit: NOW appears on global leaderboard
