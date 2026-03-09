# WanderMark E2E Test Plan — EAS/TestFlight Build
# Version: buildNumber 70 | March 2026
# Test credentials: test@wandermark.app / Test1234!
# Secondary: test2@wandermark.app / Test1234!

---

## PRE-TEST: App Launch
- [ ] App opens without crash
- [ ] Welcome/onboarding screen shows "1,500 Landmarks" and "100 countries"
- [ ] Login with test@wandermark.app / Test1234! succeeds
- [ ] Loading indicator is teal/turquoise (not purple)

---

## 1. EXPLORE TAB

### 1.1 Continents Page
- [ ] 5 continent cards visible: Europe, Asia, Africa, Americas, Oceania
- [ ] Each card shows: 20 Countries | 300 Landmarks | 4,500 pts
- [ ] Oceania card shows "Oceania" (large) + "& other island paradises" (smaller, below)
- [ ] Progress bars look identical across all 5 cards (same style/thickness)
- [ ] Card title sections are vertically aligned (same height)
- [ ] Photo of the Week displays with "Week XX" badge
- [ ] Tapping a continent navigates to country list

### 1.2 Explore Countries (e.g. tap Europe)
- [ ] Shows exactly 20 countries with flag images
- [ ] Flags are visible for ALL countries (no blank cards)
- [ ] Sort options work: Name, Points, Country
- [ ] Tap a country navigates to landmark list

### 1.3 Explore Countries — Oceania Special
- [ ] Section header: "Oceania and other Island Paradises" (not truncated)
- [ ] Geographic Oceania countries appear first (Australia, NZ, Fiji...)
- [ ] "Other" islands appear after (Maldives, Hawaii, Seychelles...)
- [ ] Hawaii shows Hawaii state flag (not US flag)
- [ ] Guam shows Guam flag

### 1.4 Landmarks List (e.g. tap Norway)
- [ ] Shows 15 landmarks: 10 official + 5 premium
- [ ] Premium landmarks show diamond icon / gold styling
- [ ] No coordinates shown on any landmark
- [ ] No pre-filled images on landmarks
- [ ] Tap a landmark navigates to detail

### 1.5 Landmark Detail
- [ ] Shows landmark name, description, country, continent
- [ ] "Mark as Visited" button visible (if not visited)
- [ ] If already visited: shows visit info, no duplicate visit button
- [ ] Community Photos section visible
- [ ] No latitude/longitude displayed

### 1.6 Landmark Search
- [ ] Search "norway" → returns 15 results (10 official + 5 premium)
- [ ] Search "eiffel" → returns Eiffel Tower
- [ ] Premium results show PREMIUM badge
- [ ] Sort and filter options work
- [ ] Tap result navigates to landmark detail

---

## 2. MY JOURNEY TAB

### 2.1 Stats Section
- [ ] Header shows "Stats" (centered) with share icon (top-right)
- [ ] 6 stat boxes with distinct icon colors:
  - Countries (teal flag): correct count (4)
  - Landmarks (coral pin): correct count (5)
  - Total Points (gold star): correct count (110)
  - Continents (green globe): correct count (1)
  - Leaderboard (gold trophy): shows rank #
  - Rank (dynamic icon): shows "Newcomer", tappable → /ranks
- [ ] All 6 stat boxes are tappable and navigate to correct pages
- [ ] Share icon opens Share Journey Card modal

### 2.2 Share Journey Card
- [ ] Countries, Landmarks, Continents use correct merged counts
- [ ] Points shown = total points (110)
- [ ] Rank badge shows rank based on VERIFIED points (0 = Newcomer)
- [ ] "Share to Social Media" button works

### 2.3 Overall Progress
- [ ] "Overall Progress" header is centered
- [ ] Circular progress shows correct: X/1500 landmarks
- [ ] Percentage is accurate

### 2.4 Navigation Rows
- [ ] "My Country Visits" → navigates to country visits list
- [ ] "My Landmark Visits" → navigates to landmark visits list
- [ ] "Points Summary" → navigates to points breakdown
- [ ] "My Photos" → navigates to photo collection
- [ ] "Custom Visits" → navigates to /custom-visits (not inline list)
  - Shows PRO badge if not premium
  - Shows count of custom visits if any exist

### 2.5 Next Rank Section
- [ ] Shows next rank name with required points
- [ ] Progress bar reflects verified points progress
- [ ] Milestone badge icon visible

---

## 3. VISIT CREATION & MANAGEMENT

### 3.1 Create Landmark Visit
- [ ] "Mark as Visited" on unvisited landmark
- [ ] Can add photos (camera/gallery)
- [ ] Can add diary notes
- [ ] Share diary toggle works
- [ ] Points awarded correctly (10 official / 25 premium)
- [ ] Activity created in feed
- [ ] Cannot visit same landmark twice (shows "Already visited" error)

### 3.2 Visit Detail
- [ ] Photos displayed correctly
- [ ] Diary text visible
- [ ] Edit button allows modifying photos/diary
- [ ] Delete warning: "This will remove the landmark as visited and delete all associated photos, diary entries and points"
- [ ] Deletion properly deducts points + leaderboard_points
- [ ] Deletion removes activity, comments, likes, photo_upvotes

### 3.3 Create Country Visit
- [ ] Navigate to country → "Mark Country as Visited"
- [ ] Can add photos and diary
- [ ] Points awarded (50 pts)
- [ ] If country already visited → upgrades with new photos/diary (no duplicate)

### 3.4 Country Visit Detail
- [ ] Photos and diary displayed
- [ ] Delete blocked if landmark visits exist: "Cannot remove — you have X landmark visit(s)"
- [ ] Delete warning if no landmarks: "This will remove the country as visited..."
- [ ] Deletion properly deducts points + leaderboard_points

### 3.5 Custom Visits (PRO only)
- [ ] /custom-visits page shows full list
- [ ] "Add Custom Visit" button works
- [ ] Can create visit with country name + landmarks + photos + diary
- [ ] Multiple custom visits per country allowed
- [ ] Edit and delete work from custom-visit-detail
- [ ] Non-pro users see PRO lock

---

## 4. POINTS & RANKING SYSTEM

### 4.1 Points Summary Page
- [ ] Total points = landmark visits + country visits + bonuses
- [ ] Verified vs unverified breakdown correct
- [ ] Country Bonus: "+20 pts for first landmark in new country"
- [ ] Continent Bonus: "+50 pts for first country on new continent"  
- [ ] Completion: "+50 per country, +200 per continent"
- [ ] Country Visit: "50 points for each country visited"

### 4.2 Ranks Page
- [ ] Shows all 20 ranks in compact horizontal layout
- [ ] No lock overlay — all badge icons visible
- [ ] Current rank highlighted with "YOU" tag
- [ ] Points based on VERIFIED points (leaderboard_points)
- [ ] Title: "Path to Transcendent"
- [ ] Subtitle: "Advance through 20 ranks"

### 4.3 Badge System
- [ ] Badges = rank achievements (20 total, one per rank)
- [ ] Dynamically awarded/removed based on verified points
- [ ] Newcomer badge awarded at 0 verified points

### 4.4 Verified vs Unverified
- [ ] Visit WITH photo = verified (adds to leaderboard_points)
- [ ] Visit WITHOUT photo = unverified (only total points)
- [ ] Rank determined by verified points only
- [ ] Leaderboard sorted by verified points
- [ ] Deleting a verified visit removes from both points AND leaderboard_points

---

## 5. SOCIAL TAB

### 5.1 Activity Feed
- [ ] Shows activities from friends (visits, country visits)
- [ ] Privacy filter works (public/friends/private)
- [ ] Photo thumbnail visible for visits with photos
- [ ] Like toggle works (heart icon)
- [ ] Comments visible and addable
- [ ] Comment permission respected (everyone/friends/nobody)

### 5.2 Friends
- [ ] Search for users works
- [ ] Send friend request
- [ ] Accept/reject pending requests
- [ ] Remove friend
- [ ] Friend count reflected in profile

### 5.3 Leaderboard
- [ ] Global leaderboard sorted by leaderboard_points (verified)
- [ ] Friends-only filter works
- [ ] User's rank displayed

### 5.4 Messages (PRO only)
- [ ] Conversation list loads
- [ ] Send/receive messages with friends
- [ ] Non-pro users see upgrade prompt

---

## 6. PROFILE TAB

### 6.1 Profile Display
- [ ] Name, username, bio displayed
- [ ] Rank badge shows correct rank (based on verified points)
- [ ] Stats row: visits, friends count
- [ ] Edit profile works (name, bio, picture)

### 6.2 Settings
- [ ] Privacy settings (default visit privacy)
- [ ] Comment permission settings
- [ ] Notification settings
- [ ] Change password
- [ ] Delete account (with confirmation)

### 6.3 About Page
- [ ] Shows "1,500 Landmarks" and "100 countries"
- [ ] "30,000+ points" achievable
- [ ] 20 ranks listed with correct thresholds
- [ ] Continent Completion Bonus: +200 pts (not +50)

---

## 7. COMMUNITY FEATURES

### 7.1 Community Photos
- [ ] Landmark community photos load (public visits with photos)
- [ ] Country community photos aggregate correctly
- [ ] Upvoting works for ALL users (not premium-only)
- [ ] Upvote count displayed

### 7.2 Photo of the Week
- [ ] Displays on Explore tab
- [ ] Shows "Week XX" badge with current ISO week number
- [ ] Photo, user name, landmark name visible
- [ ] Fallback: newest photo if no upvotes this week

---

## 8. PREMIUM/SUBSCRIPTION

### 8.1 Subscription Page
- [ ] Free features: 1,000 Official Landmarks, 1 Photo per Visit, 5 Friends, Leaderboard, Photo Upvoting, Photo of the Week
- [ ] Pro features: 500 Premium Landmarks, 10 Photos, Unlimited Friends, Custom Visits, Full Gallery, Travel Diary, Direct Messaging
- [ ] No mention of upvoting as premium

### 8.2 Pro Feature Locks
- [ ] Premium landmarks locked for free users
- [ ] Custom visits locked for free users
- [ ] Messages locked for free users
- [ ] Pro badge visible on locked features

---

## 9. ADMIN PANEL

### 9.1 Admin Access
- [ ] Admin dashboard loads (test@wandermark.app has admin role)
- [ ] User management: list, search, view details
- [ ] Report moderation
- [ ] Analytics
- [ ] Notification sending
- [ ] Promo code management

---

## 10. EDGE CASES & ERROR HANDLING

- [ ] Offline behavior: app shows cached data or friendly error
- [ ] Error boundary catches crashes: "Something went wrong" with retry
- [ ] Rate limiting: rapid requests eventually show "Too many requests"
- [ ] Empty states: proper messaging for no visits, no friends, no photos
- [ ] Long text handling: landmark names, diary entries truncate properly
- [ ] Back navigation works from all detail pages

---

## 11. LEGAL & COMPLIANCE

- [ ] Privacy Policy accessible from Profile > About
- [ ] Terms of Service accessible from Profile > About
- [ ] Account deletion works completely
- [ ] Data is cleared on account deletion

---

## KNOWN ITEMS (not bugs):
- Preview environment connects to local/empty MongoDB — "Server Error" on web is expected
- No pre-filled images on landmarks (user-content only)
- No coordinates on landmarks (removed by design)
