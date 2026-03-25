# WanderMark E2E Test Plan — Build 73
# Test credentials: test@wandermark.app / Test1234!
# Premium test: testpro@wandermark.app / Test1234!
#
# Legend:
#   PASSED        = Tested and passed in previous build
#   FIX APPLIED   = Bug found, fix in code — MUST verify in new build
#   UNTESTED      = Not yet tested

---

## PRE-TEST: App Launch
- [ ] FIX APPLIED: Splash screen shows "WanderMark" with correct app icon (was "Wanderlist")
- [ ] FIX APPLIED: Loading indicator is teal (was purple)
- [ ] App opens without crash
- [ ] Login with test@wandermark.app / Test1234!

---

## 1. EXPLORE TAB

### 1.1 Continents Page
- [ ] 5 continent cards, Oceania shows "& other island paradises"
- [ ] Photo of the Week with "Week XX" badge
- [ ] FIX APPLIED: Continent stats box now has two rows — totals + user progress

### 1.2 Explore Countries
- [ ] 20 countries per continent with flags
- [ ] FIX APPLIED: "destinations" terminology (was "countries")

### 1.3 Landmarks List
- [ ] 15 landmarks per country (10 official + 5 premium)
- [ ] FIX APPLIED: Community Highlights removed
- [ ] FIX APPLIED: Search shows 1500 landmarks (was 1000)
- [ ] FIX APPLIED: Search filter pills inside card (was floating)

### 1.4 Landmark Detail
- [ ] FIX APPLIED: Oceania shows "Oceania & Island Paradises"
- [ ] Community Photos section visible
- [ ] FIX APPLIED: Upvote heart turns red for all users (was premium-only)

### 1.5 Landmark Content Verification
- [ ] FIX APPLIED: No activity names (cruise, balloon, safari, diving)
- [ ] FIX APPLIED: No near-duplicates (Kilimanjaro Summit, Shipwreck Beach x2)
- [ ] FIX APPLIED: "Northern Lights" (was "Northern Lights in Lapland")

---

## 2. MY JOURNEY TAB

### 2.1 Stats Section
- [ ] FIX APPLIED: Rank and Leaderboard boxes swapped (visual balance)
- [ ] All 6 stat boxes tappable, correct icons (globe-outline/flag/location/star)

### 2.2 Share Journey Card
- [ ] FIX APPLIED: Text not cut off (ScrollView added)
- [ ] FIX APPLIED: No decorative border lines
- [ ] FIX APPLIED: Profile page uses same ShareJourneyCard (was crashing with ShareStatsCard)

### 2.3 Overall Progress
- [ ] FIX APPLIED: Three progress wheels — Continents (X/5), Destinations (X/100), Landmarks (X/1500)

### 2.4 Continental Progress
- [ ] FIX APPLIED: Fixed order — Europe, Asia, Africa, Americas, Oceania++
- [ ] FIX APPLIED: "Oceania++" label

### 2.5 Navigation Rows
- [ ] FIX APPLIED: My Landmark Visits + Points Summary use UniversalHeader with logo
- [ ] Next Rank tappable → /ranks

### 2.6 Points Consistency (CRITICAL)
- [ ] FIX APPLIED: All pages show same total points (was inconsistent across Journey/Profile/Leaderboard)
- [ ] FIX APPLIED: Points recalculated from actual data (single source of truth)
- [ ] FIX APPLIED: Country visits all worth 50 pts (was 20 for auto, 50 for manual)

---

## 3. VISIT CREATION & MANAGEMENT

### 3.1 Create Landmark Visit
- [ ] FIX APPLIED: "Add Photo" (library) is primary, "Take Photo" secondary
- [ ] FIX APPLIED: "Add Photo" in dialog opens photo picker (was no-op)
- [ ] FIX APPLIED: "Record Without Photo?" mentions friends vs global leaderboard
- [ ] FIX APPLIED: Keyboard Done bar on diary (iOS InputAccessoryView)

### 3.2 Visit Detail
- [ ] FIX APPLIED: Photo with rounded corners + margin (not bleeding into header)
- [ ] FIX APPLIED: Date field removed
- [ ] FIX APPLIED: Manage Visit replaced with inline [+ Add] thumbnail + separate Delete button
- [ ] FIX APPLIED: Edit Diary uses custom modal (was purple Paper Dialog)
- [ ] FIX APPLIED: Delete navigates to Journey tab (was stale safeGoBack)
- [ ] FIX APPLIED: Delete warning mentions comments, likes

### 3.3 Create Country Visit
- [ ] FIX APPLIED: "Record Without Photo?" dialog with "Add Photo" picker
- [ ] Country visit detail: Date field removed
- [ ] FIX APPLIED: Edit Diary uses custom modal (was purple Paper Dialog)

### 3.4 Country Visit Detail (UNTESTED)
- [ ] FIX APPLIED: "Visited" button → navigates to visit detail (was "Tap to remove")
- [ ] Delete blocked if landmark visits exist
- [ ] FIX APPLIED: Delete uses recalculate_user_points (was incremental)

### 3.5 Visit Deletion — Country Cleanup (CRITICAL)
- [ ] FIX APPLIED: Deleting last landmark removes auto country visit
- [ ] FIX APPLIED: Continent card shows correct count after deletion
- [ ] FIX APPLIED: Journey + Explore refresh via useFocusEffect

### 3.6 Custom Visits — PRO (test with testpro@wandermark.app)
- [ ] FIX APPLIED: Manage Visit redesigned (inline add + separate delete)
- [ ] FIX APPLIED: Delete navigates to Journey (was safeGoBack)
- [ ] FIX APPLIED: Keyboard Done bar + keyboardShouldPersistTaps

---

## 4. CONTENT FLOW (UNTESTED)

### 4.1-4.7 Full chain test
- [ ] Create visit with photo + diary → verify on all pages
- [ ] Update visit → verify changes propagate
- [ ] Delete visit → verify full cleanup
- [ ] Test from second user perspective (test2@wandermark.app)

---

## 5. POINTS & RANKING

### 5.1 Points Summary
- [ ] FIX APPLIED: Uses calculated values (single source of truth)
- [ ] FIX APPLIED: "How Points Work" — correct icons, no duplicates
- [ ] FIX APPLIED: "Your Journey" section with progress bars (was "Your Activity" with 4 boxes)
- [ ] FIX APPLIED: Unverified desc: "personal total only" (was "friends leaderboard only")

### 5.2 Ranks Page
- [ ] FIX APPLIED: Hero text explains verified points
- [ ] FIX APPLIED: Progress shows "X verified points"
- [ ] FIX APPLIED: "Country Visit: +50 pts" (was "New Country Bonus: +20")

### 5.3 About Page
- [ ] FIX APPLIED: "100 Destinations" (was "66 Countries")
- [ ] FIX APPLIED: FAQ points system updated (no duplicates, correct values)
- [ ] FIX APPLIED: "Dual Points System" section updated
- [ ] FIX APPLIED: "destinations" throughout (was "countries")

---

## 6. SOCIAL TAB (UNTESTED)

### 6.1 Feed
- [ ] FIX APPLIED: UniversalHeader + tabs below (was inside gradient)
- [ ] FIX APPLIED: Community heart is tappable (was static View)
- [ ] FIX APPLIED: Heart color: grey=0 likes, red=1+ likes

### 6.2 Friends
- [ ] FIX APPLIED: Keyboard stays open during search (keyboardShouldPersistTaps)
- [ ] FIX APPLIED: returnKeyType="search"

### 6.3 Leaderboard
- [ ] Global: sorted by verified points
- [ ] Friends: sorted by total points

### 6.4 Messages
- [ ] FIX APPLIED: No infinite loading (was stuck when user=null)
- [ ] FIX APPLIED: UniversalHeader (was custom gradient)

---

## 7. PROFILE TAB

### 7.1 Profile
- [ ] FIX APPLIED: Stats reordered — Continents > Countries > Landmarks > Points
- [ ] FIX APPLIED: All 5 elements tappable (4 stats + rank badge)
- [ ] FIX APPLIED: Icons consistent with Journey (coral landmarks, teal countries)
- [ ] FIX APPLIED: Diamond icon gold (#C9A961) for Pro
- [ ] FIX APPLIED: Edit Profile shows initials when no photo (was placeholder URL)
- [ ] FIX APPLIED: Profile Banner removed

### 7.2 Settings
- [ ] FIX APPLIED: Clear Cache removed
- [ ] FIX APPLIED: Weekly Digest + Daily Reminders removed, replaced with Social Activity
- [ ] Change password works
- [ ] Privacy controls intact

### 7.3 About
- [ ] FIX APPLIED: Copy email to clipboard (Privacy Policy + Terms of Service)

---

## 8. SUBSCRIPTION (test with testpro@wandermark.app)
- [ ] FIX APPLIED: "Rank Badges (20 ranks)" (was "Basic Badges up to 100 visits")
- [ ] FIX APPLIED: Promo code box uses app theme colors (was dark navy/orange)
- [ ] FIX APPLIED: Premium landmarks list shows "+ 495 more" with current examples

---

## 9. PHOTOS
- [ ] FIX APPLIED: "By Year" tab removed from My Photos
- [ ] FIX APPLIED: "Years" stat removed, replaced with "Photos | Destinations"

---

## 10-12. ADMIN, EDGE CASES, LEGAL (UNTESTED)
- [ ] Admin panel functions
- [ ] Offline/error handling
- [ ] Privacy Policy + Terms accessible with copy-to-clipboard email

---

## PRODUCTION MIGRATION (after deploy):
```
cd scripts && python3 recalculate_points.py
```

## BUILD INFO:
- buildNumber: 73
- No Render Shell commands needed (recalculate already run)
