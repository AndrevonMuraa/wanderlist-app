# WanderMark E2E Test Plan — Build 74
# Test credentials: test@wandermark.app / Test1234!
# Premium test: testpro@wandermark.app / Test1234!
#
# Legend:
#   PASSED        = Tested and passed in previous build
#   FIX APPLIED   = Bug found, fix in code — MUST verify in new build
#   NEW           = New feature, never tested
#   UNTESTED      = Not yet tested

---

## PRE-TEST: App Launch
- [ ] PASSED: Splash screen shows "WanderMark" with correct app icon
- [ ] App opens without crash
- [ ] Login with test@wandermark.app / Test1234!

---

## 1. EXPLORE TAB

### 1.1 Continents Page
- [ ] PASSED: 5 continent cards, Oceania shows "& other island paradises"

### 1.2 Explore Destinations (was "Explore Countries")
- [ ] FIX APPLIED: Header says "Explore Destinations" (was "Explore Countries")
- [ ] NEW: "Your Progress" dashboard with 3 progress bars (Destinations/Landmarks/Points) + earned pts badge
- [ ] NEW: Section subtitles show points ("20 destinations • 300 landmarks • 4,500 pts")
- [ ] Progress dashboard updates dynamically after visits change

### 1.3 Landmarks List
- [ ] PASSED: 15 landmarks per country (10 official + 5 premium)
- [ ] PASSED: Search shows 1500 landmarks

### 1.4 Landmark Detail
- [ ] PASSED: Community Photos section visible
- [ ] PASSED: Upvote heart turns red for all users

---

## 2. MY JOURNEY TAB

### 2.1 Stats Section
- [ ] All 6 stat boxes tappable, correct icons
- [ ] FIX APPLIED: Landmark icon is coral (#E87850) — matches stats box

### 2.2 My Landmark Visits (redesigned)
- [ ] NEW: List layout with thumbnails (was grid with camera icons)
- [ ] NEW: Stats box with colored icons (Visits/Verified/Points) — dynamically calculated
- [ ] NEW: Sort chips: Recent | Country | Points
- [ ] NEW: Animated card fade-in
- [ ] NEW: Verified badge overlay on thumbnail
- [ ] NEW: "Start Exploring" CTA on empty state
- [ ] Header says "Landmarks" (was "My Landmark Vi...")
- [ ] FIX APPLIED: Thumbnail shows actual photo (was always camera icon)
- [ ] FIX APPLIED: Verified count is dynamic (was showing stale stored value)

### 2.3 My Country Visits → "Destinations" (redesigned)
- [ ] NEW: List layout with flag thumbnails (was broken grid)
- [ ] NEW: Stats box with colored icons (Visited/Photos/Points)
- [ ] NEW: Sort chips: Recent | Continent | Points
- [ ] NEW: Animated card fade-in
- [ ] Header says "Destinations"

### 2.4 Overall Progress
- [ ] PASSED: Three progress wheels — Continents, Destinations, Landmarks

### 2.5 Next Rank
- [ ] FIX APPLIED: Says "more verified points needed" (was "more points needed")
- [ ] Tappable → navigates to /ranks

### 2.6 Points Summary (major upgrade)
- [ ] NEW: Tappable Verified/Unverified rows with chevron → expand to show itemized breakdown
- [ ] NEW: Each landmark in breakdown is tappable → navigates to visit-detail
- [ ] NEW: Each destination visit is tappable → navigates to country-visit-detail
- [ ] NEW: Continent bonuses shown in verified breakdown
- [ ] NEW: "Earning Potential" section replacing "Your Journey" — shows pts/max with progress bars
- [ ] NEW: Landmarks row tappable → my-landmark-visits
- [ ] NEW: Destinations row tappable → my-country-visits
- [ ] NEW: "Next Milestone" card with next rank + pts needed
- [ ] Back navigation from visit-detail returns to Points Summary

### 2.7 Points Consistency (CRITICAL)
- [ ] FIX APPLIED: All pages show same total points
- [ ] FIX APPLIED: /api/progress includes continent bonuses
- [ ] FIX APPLIED: Default values synced (0, not 10/15)
- [ ] Run recalculate_points.py on Render Shell before testing

### 2.8 Custom Visits
- [ ] Custom Visits page loads without crash
- [ ] NEW: Country name autocomplete with 100 DB destinations
- [ ] NEW: Green "Linked to X" badge when DB country matched
- [ ] Free text still works for non-DB countries

---

## 3. VISIT CREATION & MANAGEMENT

### 3.1 Create Landmark Visit
- [ ] PASSED: "Add Photo" is primary, "Take Photo" secondary
- [ ] PASSED: Keyboard Done bar on diary

### 3.2 Visit Detail (major upgrade)
- [ ] NEW: "Add Photo to Verify" CTA for visits without photos (teal dashed box)
- [ ] NEW: Long-press thumbnail to remove individual photo
- [ ] NEW: Warning when removing last photo ("will change to unverified")
- [ ] NEW: Info card shows shield icon — orange "Unverified" / green "Verified"
- [ ] NEW: "Add a photo to earn verified points" hint for unverified
- [ ] FIX APPLIED: "+Add" button hidden for basic users at photo limit (1)
- [ ] FIX APPLIED: Backend recalculates points after photo changes
- [ ] Verified↔Unverified transitions correctly when photos added/removed

### 3.3 Country Visit Detail
- [ ] NEW: "Your Custom Landmarks" section (PRO) — shows linked custom visit landmarks
- [ ] Custom landmarks tappable → custom-visit-detail
- [ ] Section only appears when custom landmarks exist for this country

### 3.4 Privacy (CRITICAL)
- [ ] FIX APPLIED: Private visits return 404 for non-owners
- [ ] FIX APPLIED: Friends-only visits check friendship status
- [ ] FIX APPLIED: Diary hidden from non-owners when share_diary=false
- [ ] Test with test2@wandermark.app viewing test@wandermark.app's private visit

---

## 4. SOCIAL TAB

### 4.1 Feed
- [ ] FIX APPLIED: Community tab is default (was Friends)
- [ ] FIX APPLIED: Community tab placed first (left)

### 4.2 Messages
- [ ] FIX APPLIED: "View All" sends basic users to /subscription (was showing old upgrade modal)

### 4.3 Leaderboard (major upgrade)
- [ ] NEW: Top 10 shown in standard view (was showing all 100)
- [ ] NEW: "Your Position" card for users ranked #11+ with gap to #10
- [ ] NEW: "Show Full Rankings" button expands to compact Top 100
- [ ] NEW: Compact mode: half-height rows, no rank badges
- [ ] NEW: User's own row highlighted with teal background
- [ ] NEW: "Show Less" collapses back to Top 10
- [ ] NEW: Expanded state resets when switching Global/Friends/category
- [ ] FIX APPLIED: Rank always based on verified_points (was using total on Friends)
- [ ] FIX APPLIED: "Destinations" label (was "Countries")

---

## 5. PROFILE TAB

### 5.1 Profile
- [ ] FIX APPLIED: "Basic Traveler" (was "Free user")
- [ ] FIX APPLIED: "Premium Traveler" (was "Pro user")
- [ ] FIX APPLIED: Diamond icon teal #1E8A8A (was gold #C9A961)
- [ ] NEW: Rank badge shows "X pts to {NextRank}" undertekst
- [ ] Points stat tappable → Points Summary
- [ ] Rank badge tappable → Ranks page

### 5.2 Ranks Page
- [ ] FIX APPLIED: No flash of "Newcomer" badge (hidden until loaded)
- [ ] NEW: Next unlockable rank shows progress bar + "X pts to unlock • Y%"

### 5.3 Subscription
- [ ] NEW: "500 Premium Landmarks (12,500 extra pts)" — shows point value

### 5.4 About
- [ ] FIX APPLIED: Stats box spacing fixed (30,000+ not cut off)

---

## 6. TERMINOLOGY CONSISTENCY
- [ ] FIX APPLIED: "Countries" → "Destinations" everywhere (i18n + hardcoded)
- [ ] FIX APPLIED: "Free user" → "Basic Traveler"
- [ ] FIX APPLIED: "Pro user" → "Premium Traveler"
- [ ] Check: Leaderboard, Profile, Journey, Explore, About, Subscription

---

## 7. BACKEND (auto-deployed via Render)
- [ ] FIX APPLIED: /api/visits/{id} enforces visibility + strips diary
- [ ] FIX APPLIED: /api/country-visits/{id} enforces visibility + strips diary
- [ ] FIX APPLIED: /api/visits PUT recalculates points after photo changes
- [ ] NEW: /api/points/breakdown returns itemized point sources
- [ ] NEW: /api/user-created-visits/by-country/{id} returns linked custom landmarks
- [ ] NEW: /api/countries/names returns lightweight autocomplete data
- [ ] Custom visit creation auto-matches country_name to DB countries

---

## BUILD INFO:
- buildNumber: 74 (bump before build!)
- Run on Render Shell: `cd scripts && python3 recalculate_points.py`
