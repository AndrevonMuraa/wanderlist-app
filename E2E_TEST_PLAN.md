# WanderMark E2E Test Plan — Next Build
# Previous build tested: 70 | This plan: buildNumber 71+
# Test credentials: test@wandermark.app / Test1234!
# Secondary: test2@wandermark.app / Test1234!
#
# Legend:
#   PASSED        = Tested in build 70 and passed — quick re-verify only
#   FIX APPLIED   = Bug found in build 70, fix implemented — MUST verify in new build
#   UNTESTED      = Not yet tested at all

---

## PRE-TEST: App Launch
- [ ] App opens without crash (PASSED)
- [ ] Welcome/onboarding screen shows "1,500 Landmarks" and "100 countries" (PASSED)
- [ ] Login with test@wandermark.app / Test1234! succeeds (PASSED)
- [ ] FIX APPLIED: Loading indicator is teal/turquoise (was purple)

---

## 1. EXPLORE TAB

### 1.1 Continents Page (PASSED)
- [ ] 5 continent cards visible: Europe, Asia, Africa, Americas, Oceania
- [ ] Each card shows: 20 Countries | 300 Landmarks | 4,500 pts
- [ ] Oceania card shows "Oceania" (large) + "& other island paradises" (smaller, below)
- [ ] Photo of the Week displays with "Week XX" badge
- [ ] Tapping a continent navigates to country list

### 1.2 Explore Countries — bugs found, fixes applied
- [ ] Shows exactly 20 countries with flag images (PASSED)
- [ ] Flags are visible for ALL countries (PASSED)
- [ ] FIX APPLIED: Sort row removed (was cluttered, sokefeltet er tilstrekkelig)
- [ ] FIX APPLIED: Filter pills layout (all/visited/unvisited) — check om visuell bug under sokefeltet er fikset
- [ ] FIX APPLIED: Header hvit stripe — check om den er borte
- [ ] Tap a country navigates to landmark list (PASSED)

### 1.3 Explore Countries — Oceania Special (PASSED)
- [ ] Section header: "Oceania and other Island Paradises"
- [ ] Geographic Oceania countries first, "other" islands after
- [ ] Hawaii state flag, Guam flag correct

### 1.4 Landmarks List — bugs found, fixes applied
- [ ] Shows 15 landmarks: 10 official + 5 premium (PASSED for official, premium visibility needs re-check)
- [ ] FIX APPLIED: Premium landmarks visible for all users (was reported as missing — verify)
- [ ] FIX APPLIED: Community Highlights section removed (was cluttering design)
- [ ] No coordinates, no pre-filled images (PASSED)
- [ ] Tap a landmark navigates to detail (PASSED)

### 1.5 Landmark Detail — bug found, fix applied
- [ ] Shows landmark name, description, country, continent (PASSED)
- [ ] FIX APPLIED: Oceania landmarks show "Oceania & Island Paradises" (was just "Oceania")
- [ ] "Mark as Visited" button visible if not visited (PASSED)
- [ ] If already visited: shows visit info (PASSED)
- [ ] Community Photos section visible (PASSED)

### 1.6 Landmark Search (PASSED — quick re-verify)
- [ ] Search "norway" — returns 15 results
- [ ] Search "eiffel" — returns Eiffel Tower
- [ ] Premium results show PREMIUM badge

### 1.7 Landemerke-innhold — fixes applied to production DB
- [ ] FIX APPLIED: Egypt — "Colossi of Memnon", "Aswan Botanical Island" (was "Luxor Hot Air Balloon", "Nile Cruise")
- [ ] FIX APPLIED: Switzerland — "Gorner Gorge" (was "Glacier Express")
- [ ] FIX APPLIED: Mongolia — "Altai Tavan Bogd Mountains" (was "Eagle Hunters")
- [ ] FIX APPLIED: Greece — "Vikos Gorge" (was duplicate "Zakynthos Shipwreck Beach")
- [ ] FIX APPLIED: Finland — "Koli National Park" (was duplicate "Northern Lights Lapland")
- [ ] FIX APPLIED: Tanzania — no "Kilimanjaro Summit" duplicate, no "Tree Lions"
- [ ] Stikkprov 5+ land: ingen duplikater eller aktivitets-ord

---

## 2. MY JOURNEY TAB — partially tested

### 2.1 Stats Section (PASSED)
- [ ] Header with share icon, 6 stat boxes, all tappable

### 2.2 Share Journey Card — bugs found, fixes applied
- [ ] FIX APPLIED: "Share Your Journey" tekst ikke avkuttet pa toppen
- [ ] FIX APPLIED: "Instagram, WhatsApp..." tekst ikke avkuttet pa bunnen
- [ ] FIX APPLIED: Dekorative linjer fjernet (var uproporsjonale)
- [ ] FIX APPLIED: Kortet fyller modal bredden korrekt
- [ ] Points, rank, stats korrekt (PASSED)
- [ ] "Share to Social Media" fungerer (PASSED)

### 2.3 Overall Progress (PASSED)
- [ ] Circular progress correct X/1500

### 2.4 Navigation Rows — fixes applied
- [ ] "My Country Visits" navigates (PASSED)
- [ ] FIX APPLIED: "My Landmark Visits" — bruker UniversalHeader (var hvit stripe + mangler logo)
- [ ] FIX APPLIED: "Points Summary" — bruker UniversalHeader (var hvit stripe + mangler logo)
- [ ] "My Photos" navigates (PASSED)
- [ ] "Custom Visits" navigates (PASSED)

### 2.5 Next Rank Section — bug found
- [ ] FIX APPLIED: Poeng oppdateres korrekt nar besok fjernes (var inkonsistent)

---

## 3. VISIT CREATION & MANAGEMENT

### 3.1 Create Landmark Visit — multiple bugs found, fixes applied
- [ ] "Mark as Visited" on unvisited landmark (PASSED)
- [ ] FIX APPLIED: "Add Photo" (library) er na primaerknapp (var kamera)
- [ ] FIX APPLIED: "Take Photo Instead" er sekundaer lenke under
- [ ] Can add diary notes (PASSED)
- [ ] FIX APPLIED: Tastatur har "Done"-knapp for diary (var utilgjengelig)
- [ ] Share diary toggle works (PASSED)
- [ ] Points awarded correctly (PASSED)
- [ ] Activity created in feed (PASSED)
- [ ] FIX APPLIED: "Record Without Photo?" dialog — "Add Photo" fungerer korrekt

### 3.2 Visit Detail — multiple bugs found, fixes applied
- [ ] FIX APPLIED: Foto vises med bedre proporsjoner (var avkuttet/forsvant i header)
- [ ] FIX APPLIED: Dato-felt fjernet (var misvisende for besok med flere bilder)
- [ ] FIX APPLIED: Header bruker UniversalHeader (var hvit stripe + feil dimensjoner)
- [ ] Diary text visible (PASSED)
- [ ] FIX APPLIED: Delete-advarsel nevner na ogsa kommentarer og likes (var ufullstendig)
- [ ] Deletion deducts points (PASSED, men se 3.5 for fullstendig test)

### 3.3 Create Country Visit (testing startet, ikke fullfort)
- [ ] Navigate to country — "Mark Country as Visited" (UNTESTED)
- [ ] Can add photos and diary (UNTESTED)
- [ ] Points awarded 50 pts (UNTESTED)
- [ ] If already visited — upgrades with new photos/diary (UNTESTED)

### 3.4 Country Visit Detail (UNTESTED)
- [ ] Photos and diary displayed
- [ ] Delete blocked if landmark visits exist
- [ ] Delete warning if no landmarks
- [ ] Deletion deducts points

### 3.5 Visit Deletion — Country Cleanup (FIX APPLIED — critical backend bug)
Siste landmark i et land slettes — verifiser full opprydding:
- [ ] Opprett besok i nytt land (f.eks. Japan — "Mount Fuji")
- [ ] Verifiser Japan vises som besokt land (auto country visit)
- [ ] Slett landmark-besoket
- [ ] FIX APPLIED: Japan forsvinner fra "My Country Visits" (auto country visit fjernet)
- [ ] FIX APPLIED: Continent-kort viser korrekt antall (var +1 etter sletting)
- [ ] FIX APPLIED: Flaggkort viser 0/15 progress (var 1/15 etter sletting)
- [ ] FIX APPLIED: Bonuspoeng (20 country + 50 continent) trukket fra

### 3.6 Custom Visits — PRO only (UNTESTED)
- [ ] /custom-visits page shows full list
- [ ] "Add Custom Visit" button works
- [ ] Can create visit with country name + landmarks + photos + diary
- [ ] Edit and delete work
- [ ] Non-pro users see PRO lock

---

## 4. BRUKERINNHOLD-FLYT (UNTESTED — full content chain)

Test at bruker-generert innhold vises pa ALLE relevante sider.

### 4.1 Opprett test-besok
Velg et ubesokt landemerke (f.eks. "Eiffel Tower" i Frankrike).
- [ ] Opprett besok MED bilde (fra library) + dagboktekst + share_diary=ON + visibility=public

### 4.2 Sjekk at besoket vises overalt:

**A. Landmark Detail** — "Visited" status + bilde i Community Photos
**B. My Landmark Visits** — i listen med navn, land, dato
**C. My Country Visits** — landet vises som besokt (auto)
**D. My Photos** — bildet i galleriet med landmark-info
**E. Activity Feed** — aktivitet med bilde + dagbok-indikator
**F. Stats + Progress** — teller og poeng oppdatert
**G. Leaderboard** — verified poeng oppdatert

### 4.3 Oppdater besoket
- [ ] Legg til ekstra bilde via visit detail
- [ ] Sjekk My Photos og feed oppdatert

### 4.4 Dagbok-synlighet
- [ ] share_diary=ON: synlig for venner
- [ ] share_diary=OFF: IKKE synlig for andre

### 4.5 Country visit oppgradering
- [ ] Legg til bilder/dagbok pa auto country visit
- [ ] Bilder i My Photos, activity oppdatert

### 4.6 Slett-flyt
- [ ] Bilde borte fra My Photos
- [ ] Activity borte fra feed
- [ ] Landmark viser "Mark as Visited" igjen
- [ ] Poeng trukket fra Stats + Leaderboard
- [ ] Auto country visit fjernet (backend-fix)

### 4.7 Venners perspektiv (test2@wandermark.app)
- [ ] Besok synlig i feed, kan like/kommentere
- [ ] Community Photos viser bildet

---

## 5. POINTS & RANKING SYSTEM (UNTESTED)

### 5.1 Points Summary Page
- [ ] FIX APPLIED: Bruker UniversalHeader med logo
- [ ] Total points = landmark + country + bonuses
- [ ] Verified vs unverified breakdown correct

### 5.2 Ranks Page — fix applied
- [ ] All 20 ranks visible, current rank highlighted
- [ ] FIX APPLIED: Hero text forklarer at ranks baseres pa verified points
- [ ] FIX APPLIED: Progress viser "X verified points" (var "points earned")

### 5.3 Verified vs Unverified
- [ ] WITH photo = verified, WITHOUT = unverified
- [ ] Deleting verified visit removes from both

---

## 6. SOCIAL TAB (UNTESTED)

### 6.1 Activity Feed
- [ ] Activities from friends, privacy filter, like/comment

### 6.2 Friends
- [ ] Search (debounced), send/accept/reject, remove

### 6.3 Leaderboard
- [ ] Sorted by verified points, friends-only filter

### 6.4 Messages (PRO only)
- [ ] Send/receive, non-pro upgrade prompt

---

## 7. PROFILE TAB (UNTESTED)

- [ ] Name, username, bio, rank badge
- [ ] Edit profile, settings, change password
- [ ] About: "1,500 Landmarks", "100 countries", 20 ranks

---

## 8. COMMUNITY FEATURES (UNTESTED)

- [ ] Community photos on landmarks and countries
- [ ] Upvoting for ALL users
- [ ] Photo of the Week with "Week XX" badge

---

## 9. PREMIUM/SUBSCRIPTION (UNTESTED)

- [ ] Free vs Pro feature list correct
- [ ] Premium landmarks, custom visits, messages locked for free

---

## 10. ADMIN PANEL (UNTESTED)

- [ ] Dashboard, users, reports, analytics, notifications, promo codes

---

## 11. EDGE CASES (UNTESTED)

- [ ] Offline, error boundary, empty states, back navigation

---

## 12. LEGAL & COMPLIANCE (UNTESTED)

- [ ] Privacy Policy + Terms accessible, account deletion works

---

## FIXES IN THIS BUILD (changes since build 70):

### Backend (live now):
- Visit deletion: auto country visit + bonus points cleanup
- Production DB: ~90 activity/duplicate landmarks fixed

### Frontend (in new build):
- Loading indicator: purple -> teal
- My Landmark Visits + Points Summary: UniversalHeader with logo
- Visit detail: date removed, photo height improved, delete warning updated, diary Done key
- Landmark list: Community Highlights removed
- Photo picker: library primary, camera secondary
- Share Journey Card: proportions + decorative line fixed
- Ranks page: verified points explanation
- Landmark detail: Oceania -> "Oceania & Island Paradises"

### KNOWN ITEMS (not bugs):
- Preview environment: "Server Error" on web expected
- No pre-filled images or coordinates on landmarks (by design)
- ~15 near-duplicate detections are false positives (different parks sharing a word)
