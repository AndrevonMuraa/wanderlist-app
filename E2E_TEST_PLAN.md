# WanderMark E2E Test Plan — Next Build
# Previous build tested: 70 | This plan: buildNumber 71+
# Test credentials: test@wandermark.app / Test1234!
# Secondary: test2@wandermark.app / Test1234!
#
# Legend:
#   RETESTED  = Previously tested, bugs found AND fixed — verify fix in new build
#   UNTESTED  = Not yet tested — first-time verification needed

---

## PRE-TEST: App Launch
- [ ] App opens without crash
- [ ] Welcome/onboarding screen shows "1,500 Landmarks" and "100 countries"
- [ ] Login with test@wandermark.app / Test1234! succeeds
- [ ] RETESTED: Loading indicator is teal/turquoise (was purple — fixed in index.tsx)

---

## 1. EXPLORE TAB

### 1.1 Continents Page (RETESTED — passed in build 70)
- [ ] 5 continent cards visible: Europe, Asia, Africa, Americas, Oceania
- [ ] Each card shows: 20 Countries | 300 Landmarks | 4,500 pts
- [ ] Oceania card shows "Oceania" (large) + "& other island paradises" (smaller, below)
- [ ] Photo of the Week displays with "Week XX" badge
- [ ] Tapping a continent navigates to country list

### 1.2 Explore Countries (RETESTED — sort row removed)
- [ ] Shows exactly 20 countries with flag images
- [ ] Flags are visible for ALL countries (no blank cards)
- [ ] RETESTED: Sort row is removed (only search + filter remain)
- [ ] Tap a country navigates to landmark list

### 1.3 Explore Countries — Oceania Special (RETESTED — passed)
- [ ] Section header: "Oceania and other Island Paradises"
- [ ] Geographic Oceania countries appear first (Australia, NZ, Fiji...)
- [ ] "Other" islands appear after (Maldives, Hawaii, Seychelles...)
- [ ] Hawaii shows Hawaii state flag (not US flag)
- [ ] Guam shows Guam flag

### 1.4 Landmarks List (RETESTED)
- [ ] Shows 15 landmarks: 10 official + 5 premium
- [ ] Premium landmarks visible with diamond icon (also for free users, shown as locked)
- [ ] No coordinates shown on any landmark
- [ ] No pre-filled images on landmarks
- [ ] Tap a landmark navigates to detail
- [ ] RETESTED: Community Highlights section removed (cleaner design)

### 1.5 Landmark Detail (RETESTED — Oceania fix)
- [ ] Shows landmark name, description, country, continent
- [ ] RETESTED: Oceania landmarks show "Oceania & Island Paradises" (not just "Oceania")
- [ ] "Mark as Visited" button visible (if not visited)
- [ ] If already visited: shows visit info, no duplicate visit button
- [ ] Community Photos section visible

### 1.6 Landmark Search
- [ ] Search "norway" — returns 15 results (10 official + 5 premium)
- [ ] Search "eiffel" — returns Eiffel Tower
- [ ] Premium results show PREMIUM badge
- [ ] Tap result navigates to landmark detail

### 1.7 Landemerke-innhold verifisering (RETESTED — duplikater + aktiviteter fikset)
Verifiser at innholdet er oppryddet:
- [ ] Egypt: "Colossi of Memnon" og "Aswan Botanical Island" (IKKE "Luxor Hot Air Balloon")
- [ ] Switzerland: "Gorner Gorge" (IKKE "Glacier Express")
- [ ] Mongolia: "Altai Tavan Bogd Mountains" (IKKE "Eagle Hunters")
- [ ] Greece: "Vikos Gorge" (IKKE "Zakynthos Shipwreck Beach" duplikat)
- [ ] Finland: "Koli National Park" (IKKE "Northern Lights Lapland" duplikat)
- [ ] Stikkprov 5+ land: Ingen duplikater eller aktivitets-ord (cruise, balloon, safari, diving, train, festival)

---

## 2. MY JOURNEY TAB (RETESTED — build 70)

### 2.1 Stats Section
- [ ] Header shows "Stats" (centered) with share icon (top-right)
- [ ] 6 stat boxes with distinct icon colors, all tappable
- [ ] Share icon opens Share Journey Card modal

### 2.2 Share Journey Card (RETESTED — proportions fixed)
- [ ] RETESTED: Card fills modal properly (no cut-off text at top/bottom)
- [ ] RETESTED: No disproportionate decorative lines
- [ ] Countries, Landmarks, Continents use correct merged counts
- [ ] Points shown = total points
- [ ] Rank badge shows rank based on VERIFIED points
- [ ] "Share to Social Media" button works

### 2.3 Overall Progress
- [ ] Circular progress shows correct: X/1500 landmarks
- [ ] Percentage is accurate

### 2.4 Navigation Rows
- [ ] "My Country Visits" — navigates to country visits list
- [ ] "My Landmark Visits" — navigates (RETESTED: now uses UniversalHeader with logo)
- [ ] "Points Summary" — navigates (RETESTED: now uses UniversalHeader with logo)
- [ ] "My Photos" — navigates to photo collection
- [ ] "Custom Visits" — navigates to /custom-visits

### 2.5 Next Rank Section
- [ ] Shows next rank name with required points
- [ ] RETESTED: Points deducted correctly after visit removal (was inconsistent)

---

## 3. VISIT CREATION & MANAGEMENT

### 3.1 Create Landmark Visit (RETESTED — multiple fixes)
- [ ] "Mark as Visited" on unvisited landmark
- [ ] RETESTED: "Add Photo" from library is now primary button (was camera)
- [ ] "Take Photo Instead" is secondary option below
- [ ] Can add diary notes
- [ ] RETESTED: Diary keyboard has "Done" return key (was missing)
- [ ] Share diary toggle works
- [ ] Points awarded correctly (10 official / 25 premium)
- [ ] Activity created in feed
- [ ] RETESTED: "Record Without Photo?" dialog — "Add Photo" dismisses dialog correctly

### 3.2 Visit Detail (RETESTED — multiple fixes)
- [ ] RETESTED: Photos display with proper proportions (was cut off/too tall)
- [ ] RETESTED: Date field removed (was misleading for multi-photo visits)
- [ ] Diary text visible
- [ ] RETESTED: Delete warning mentions photos, diary, comments, likes, and points
- [ ] Deletion properly deducts points + leaderboard_points
- [ ] Deletion removes activity, comments, likes, photo_upvotes

### 3.3 Create Country Visit (RETESTED — started in build 70)
- [ ] Navigate to country — "Mark Country as Visited"
- [ ] Can add photos and diary
- [ ] Points awarded (50 pts)
- [ ] If country already visited — upgrades with new photos/diary (no duplicate)

### 3.4 Country Visit Detail (UNTESTED)
- [ ] Photos and diary displayed
- [ ] Delete blocked if landmark visits exist: "Cannot remove — you have X landmark visit(s)"
- [ ] Delete warning if no landmarks: "This will remove the country as visited..."
- [ ] Deletion properly deducts points + leaderboard_points

### 3.5 Visit Deletion — Country Cleanup (RETESTED — critical backend fix)
Denne testen verifiserer at sletting av siste landmark i et land rydder opp korrekt:
- [ ] Opprett et besok i et nytt land (f.eks. Japan — "Mount Fuji")
- [ ] Verifiser at Japan vises som besokt land (auto country visit)
- [ ] Slett landmark-besoket
- [ ] RETESTED: Japan forsvinner fra "My Country Visits" (auto-opprettet country visit fjernet)
- [ ] RETESTED: Continent-kortet viser korrekt antall besoke land (ikke +1 som for)
- [ ] RETESTED: Flaggkort viser 0/15 progress (ikke 1/15 som for)
- [ ] RETESTED: Bonuspoeng (20 country + 50 continent) trukket fra

### 3.6 Custom Visits — PRO only (UNTESTED)
- [ ] /custom-visits page shows full list
- [ ] "Add Custom Visit" button works
- [ ] Can create visit with country name + landmarks + photos + diary
- [ ] Edit and delete work from custom-visit-detail
- [ ] Non-pro users see PRO lock

---

## 4. BRUKERINNHOLD-FLYT (UNTESTED — full content chain)

Test at bruker-generert innhold vises pa ALLE relevante sider.

### 4.1 Opprett test-besok
Velg et ubesokt landemerke (f.eks. "Eiffel Tower" i Frankrike).
- [ ] Opprett besok MED bilde (velg fra library) + dagboktekst + share_diary=ON + visibility=public

### 4.2 Sjekk at besoket vises overalt:

**A. Landmark Detail Page**
- [ ] Viser "Visited" status
- [ ] Bilde vises i Community Photos

**B. My Landmark Visits**
- [ ] Besoket vises i listen med landmark-navn, land, dato
- [ ] Tap apner visit detail med bilde + dagbok

**C. My Country Visits**
- [ ] Landet vises som besokt (auto-opprettet)

**D. My Photos**
- [ ] Bildet vises i fotogalleriet med korrekt landmark-info

**E. Activity Feed (Social)**
- [ ] Aktivitet synlig med bilde-thumbnail og dagbok-indikator

**F. Stats + Progress**
- [ ] Landmarks-teller, poeng og progress oppdatert

**G. Leaderboard**
- [ ] Leaderboard-poeng oppdatert (bilde = verified)

### 4.3 Oppdater besoket
- [ ] Legg til ekstra bilde via visit detail
- [ ] Sjekk My Photos og feed oppdatert

### 4.4 Dagbok-synlighet
- [ ] share_diary=ON: Dagbok synlig for venner
- [ ] share_diary=OFF: Dagbok IKKE synlig for andre

### 4.5 Country visit oppgradering
- [ ] Legg til bilder og dagbok pa auto-opprettet country visit
- [ ] Bilder i My Photos, activity oppdatert

### 4.6 Slett-flyt
Slett landmark-besoket:
- [ ] Bilde borte fra My Photos
- [ ] Activity borte fra feed
- [ ] Landmark viser "Mark as Visited" igjen
- [ ] Poeng trukket fra Stats + Leaderboard
- [ ] Auto country visit fjernet (backend-fix)

### 4.7 Venners perspektiv (test2@wandermark.app)
- [ ] test1 sitt besok synlig i test2 sin feed
- [ ] Kan like og kommentere
- [ ] Community Photos viser test1 sitt bilde

---

## 5. POINTS & RANKING SYSTEM (UNTESTED)

### 5.1 Points Summary Page
- [ ] RETESTED: Bruker UniversalHeader med WanderMark-logo
- [ ] Total points = landmark visits + country visits + bonuses
- [ ] Verified vs unverified breakdown correct
- [ ] Country Bonus: +20 pts, Continent Bonus: +50 pts
- [ ] Completion: +50 per country, +200 per continent

### 5.2 Ranks Page (RETESTED — verified points forklaring)
- [ ] Shows all 20 ranks in compact layout
- [ ] Current rank highlighted with "YOU" tag
- [ ] RETESTED: Hero text forklarer at ranks er basert pa verified points
- [ ] RETESTED: Progress viser "X verified points" (ikke bare "points earned")

### 5.3 Verified vs Unverified
- [ ] Visit WITH photo = verified (leaderboard_points)
- [ ] Visit WITHOUT photo = unverified (only total points)
- [ ] Deleting a verified visit removes from both

---

## 6. SOCIAL TAB (UNTESTED)

### 6.1 Activity Feed
- [ ] Shows activities from friends
- [ ] Privacy filter works (public/friends/private)
- [ ] Photo thumbnail visible, like/comment works

### 6.2 Friends
- [ ] Search works (username-basert, debounced)
- [ ] Send/accept/reject requests, remove friend

### 6.3 Leaderboard
- [ ] Sorted by leaderboard_points (verified)
- [ ] Friends-only filter works

### 6.4 Messages (PRO only)
- [ ] Conversation list, send/receive messages
- [ ] Non-pro: upgrade prompt

---

## 7. PROFILE TAB (UNTESTED)

### 7.1 Profile Display
- [ ] Name, username, bio, rank badge correct
- [ ] Edit profile works

### 7.2 Settings
- [ ] Privacy, comment, notification settings
- [ ] Change password, delete account

### 7.3 About Page
- [ ] Shows "1,500 Landmarks" and "100 countries"
- [ ] 20 ranks listed with correct thresholds

---

## 8. COMMUNITY FEATURES (UNTESTED)

- [ ] Community photos load on landmarks and countries
- [ ] Upvoting works for ALL users
- [ ] Photo of the Week displays with "Week XX" badge

---

## 9. PREMIUM/SUBSCRIPTION (UNTESTED)

- [ ] Free vs Pro feature list correct on subscription page
- [ ] Premium landmarks locked for free users
- [ ] Custom visits and messages locked for free users

---

## 10. ADMIN PANEL (UNTESTED)

- [ ] Dashboard, user management, reports, analytics, notifications, promo codes

---

## 11. EDGE CASES (UNTESTED)

- [ ] Offline behavior: cached data or friendly error
- [ ] Error boundary: "Something went wrong" with retry
- [ ] Empty states: no visits, no friends, no photos
- [ ] Back navigation works from all detail pages

---

## 12. LEGAL & COMPLIANCE (UNTESTED)

- [ ] Privacy Policy + Terms accessible from About
- [ ] Account deletion works completely

---

## FIXES IN THIS BUILD (summary of changes since build 70):

### Backend (live — no build needed):
- Visit deletion now cleans up auto country visits + bonus points
- ~90 landmark duplicates/activity names fixed on production DB

### Frontend (requires new build):
- Loading indicator: purple -> teal
- My Landmark Visits + Points Summary: UniversalHeader with logo
- Visit detail: date removed, photo height improved, delete warning updated, diary keyboard Done button
- Landmark list: Community Highlights removed
- Photo picker: "Add Photo" (library) is now primary, camera secondary
- Share Journey Card: proportions fixed, decorative line removed
- Ranks page: verified points explanation improved
- Landmark detail: Oceania shows "Oceania & Island Paradises"

### KNOWN ITEMS (not bugs):
- Preview environment: "Server Error" on web is expected (local empty MongoDB)
- No pre-filled images on landmarks (user-content only)
- No coordinates on landmarks (by design)
- Near-duplicate detection catches ~15 false positives (different parks sharing a word) — these are NOT duplicates
