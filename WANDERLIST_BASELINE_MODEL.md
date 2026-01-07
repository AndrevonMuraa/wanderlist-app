# WanderList App - Baseline Model & State Preservation System

> **CRITICAL**: This document MUST be read at the start of EVERY session and EVERY fork.
> It defines the current stable state of the app and ensures continuity across sessions.

---

## 🎯 PURPOSE

This baseline model ensures:
1. ✅ All implemented features are documented and preserved
2. ✅ Fork sessions start with complete understanding of app state
3. ✅ No features or improvements are lost between sessions
4. ✅ Login and preview functionality always works
5. ✅ Both web and mobile previews are stable
6. ✅ Bug fixes are tracked and not reintroduced

---

## 📊 CURRENT APP STATE (Baseline v3.0)

### Production Status: **STABLE - Production Ready with Full Feature Set + Global Expansion**

**Last Updated:** January 7, 2026 (Session 3)
**Version:** 3.0.0
**Total Countries:** 48 (Europe: 10, Asia: 10, Africa: 10, Americas: 10, Oceania: 8)
**Total Landmarks:** 480 (336 official + 144 premium)
**New Features:** Global content expansion, Comprehensive progress tracking system, CircularProgress & ProgressBar components

---

## 🏗️ CORE ARCHITECTURE

### Tech Stack
- **Frontend:** Expo (React Native) - Web + Mobile
- **Backend:** FastAPI (Python 3.11+)
- **Database:** MongoDB
- **Authentication:** JWT + Google OAuth
- **File Storage:** Base64 in MongoDB (images)

### Project Structure
```
/app
├── backend/
│   ├── server.py (main API)
│   ├── seed_data.py (database seeding)
│   └── premium_landmarks.py (100 premium landmarks)
├── frontend/
│   ├── app/ (expo-router file-based routing)
│   ├── components/
│   ├── contexts/ (AuthContext)
│   ├── utils/ (config.ts - CRITICAL)
│   └── styles/
└── [documentation files]
```

---

## ✅ IMPLEMENTED FEATURES (Current Baseline)

### 1. **Authentication System** ✅
**Status:** WORKING (Web + Mobile)

**Features:**
- Email/Password registration & login
- Google OAuth (configured for forked environment)
- JWT token-based authentication
- Username system (privacy protection)
- Secure token storage (SecureStore for native, localStorage for web)

**Files:**
- `/app/frontend/contexts/AuthContext.tsx`
- `/app/frontend/app/(auth)/login.tsx`
- `/app/frontend/app/(auth)/register.tsx`
- `/app/backend/server.py` (auth endpoints)

**Testing:**
- Test account: `mobile@test.com` / `test123`
- Google OAuth: Configured but needs environment-specific redirect URLs

---

### 2. **Three-Tier Subscription System** ✅
**Status:** BACKEND COMPLETE, FRONTEND PARTIAL

**Tiers:**
- **Free:** 10 visits/month, 5 friends max, no messaging, friends leaderboard only
- **Basic ($4.99/mo):** Unlimited visits, 25 friends, messaging, friends leaderboard
- **Premium ($9.99/mo):** All Basic + premium landmarks + global leaderboard

**Backend Implementation:**
- ✅ User model has `subscription_tier` field
- ✅ Visit limits enforced (10/month for free)
- ✅ Friend limits enforced (5 for free, 25 for basic)
- ✅ Messaging restricted to Basic+
- ✅ Premium content filtering
- ✅ Leaderboard filtering (verified visits only for global)
- ✅ Admin endpoint: `POST /api/admin/set-tier`
- ✅ Stats endpoint: `GET /api/visits/stats`

**Frontend Implementation:**
- ✅ UpgradeModal component created
- ✅ Premium content teasers (blur, locks, badges)
- ✅ Premium banner on landmarks page
- ⏳ Visit/friend counters (pending)
- ⏳ Error handling for 403 → UpgradeModal (pending)
- ⏳ Subscription management screen (pending)
- ⏳ Payment integration (pending)

---

### 3. **Premium Content System** ✅
**Status:** COMPLETE

**Features:**
- 100 premium landmarks seeded across all countries
- Norway: 5 premium (Trolltunga, Lofoten, Atlantic Ocean Road, Sognefjord, Tromsø Cathedral)
- Blurred images with lock overlays for free users
- Gold gradient premium badges
- Premium banner showing locked content count
- 25 points per premium landmark (vs 10 for official)

**Backend:**
- Landmarks filtered by `subscription_tier`
- `is_locked` flag returned for frontend
- Premium landmarks have `category: "premium"`

**Frontend:**
- Visual teasers implemented
- Tap on locked landmark shows upgrade modal
- Premium banner shows "X Premium Landmarks Available"

---

### 4. **Visit Verification System** ✅
**Status:** COMPLETE

**Features:**
- **Verified Visits:** With photo proof
  - Count for global/official leaderboards
  - Maintain ranking integrity
- **Unverified Visits:** Without photo
  - Only count for friends leaderboard
  - Allow retroactive trip logging

**Backend:**
- `Visit` model has `verified` field (boolean)
- `photo_base64` is optional
- Automatically set based on photo presence
- Leaderboard filters by verification status

---

### 5. **Landmark System** ✅
**Status:** COMPLETE

**Features:**
- 298 landmarks across 20 countries
- Each landmark has exactly 1 image (simplified)
- Categories: "official" (248) and "premium" (50 seeded, but only Norway active with 5)
- Points system: Official (10pts), Premium (25pts)
- Immersive detail page with background image
- Compact coordinate display
- Facts and cultural information
- Floating "Mark as Visited" button

**Special Landmark:**
- Northern Lights (interactive map showing sighting locations)

**Design:**
- Full-screen background image
- Frosted glass content cards
- Compact coordinate display (40px height)
- Quick info cards (duration, best time, difficulty)

---

### 6. **Social Features** ✅
**Status:** COMPLETE (Basic)

**Friends System:**
- Add friends by email
- Accept/reject requests
- Friend limits by tier
- Friends list page (redesigned with turquoise theme)
- Display usernames (not emails) for privacy

**Messaging System (Basic+ Only):**
- Send messages to friends
- View message history
- Free users see upgrade prompt
- Endpoints: `POST /api/messages`, `GET /api/messages/{friend_id}`

**Leaderboard:**
- Friends leaderboard (all tiers) - shows ALL visits
- Global leaderboard (Premium only) - shows verified visits only
- Username display for privacy
- Rank and visit count

---

### 7. **Navigation & UI** ✅
**Status:** COMPLETE

**Tab Navigation:**
- Explore (countries & landmarks)
- Journey (user's visits)
- Leaderboard (friends or global)
- Profile (user info & settings)

**Design System:**
- Turquoise/teal primary color (#20B2AA)
- Frosted glass UI elements
- Immersive background images on detail pages
- Consistent spacing (8pt grid)
- Platform-aware styling

**Key Components:**
- UpgradeModal (subscription upsell)
- MapComponents (platform-specific)
- Floating action buttons
- Premium badges and overlays

---

### 8. **Progress Tracking System** ✅
**Status:** COMPLETE (Added in Session 3)

**Overview:**
Comprehensive gamification system that tracks and visualizes user exploration progress across all levels: overall, continental, per-country, and per-landmark.

**Backend Implementation:**
- **New Endpoint:** `GET /api/progress`
- Returns real-time progress statistics
- Calculates: overall %, continental breakdown, per-country progress
- Efficient query aggregation from visits collection

**Frontend Components:**
- **CircularProgress** (`/components/CircularProgress.tsx`):
  - Apple Watch-style progress rings
  - SVG-based using react-native-svg
  - Displays percentage with label/sublabel
  
- **ProgressBar** (`/components/ProgressBar.tsx`):
  - Horizontal animated progress bars
  - Color-coded (gray → orange → green)
  - Optional label and percentage display

**Integration Points:**

**Profile Page ("Your Journey" Dashboard):**
- Large circular progress ring (overall completion)
- Continental progress cards with icons
- Progress bars for each continent
- "X/Y countries visited" counters
- Sorted by completion percentage

**Explore Page (Country Cards):**
- Mini progress indicators on all cards
- "0/10 landmarks" counter (always visible)
- Small progress bar at bottom
- Green checkmark for 100% complete
- Color coding: Gray (0%) → Orange (1-99%) → Green (100%)

**Landmark List Pages:**
- Progress header card at top
- "Your Progress" with X/Y counter
- Animated progress bar
- 🎉 Celebration message at 100%
- Progress bar changes to green when complete

**User Experience:**
- Real-time progress updates
- Visual feedback encourages exploration
- Gamification increases engagement
- Clear progress across all screens

**Dependencies:**
- `react-native-svg@15.15.1` (for CircularProgress)

**Files:**
- Backend: `/app/backend/server.py` (progress endpoint)
- Components: `/app/frontend/components/CircularProgress.tsx`, `ProgressBar.tsx`
- Pages: Profile, Explore, Landmarks (all updated)

---

### 9. **Data Models (Complete List)** ✅

**Backend Models:**
- `User` - user_id, email, username, subscription_tier, points, etc.
- `Landmark` - landmark_id, name, country_id, category, is_locked, verified, points
- `Visit` - visit_id, user_id, landmark_id, photo_base64 (optional), verified, visited_at
- `Country` - country_id, name, continent
- `Friend` - friendship_id, user_id, friend_id, status
- `Message` - message_id, sender_id, receiver_id, content
- `Badge` - badge_id, name, description (defined, not implemented)
- `Challenge` - challenge_id, name, type (defined, not implemented)

---

## ⏳ PLANNED BUT NOT IMPLEMENTED

### Phase 2 Features (Not in Baseline):
- ❌ Badge/Achievement system (models exist, no endpoints)
- ❌ Challenge system (models exist, no endpoints)
- ❌ Streak tracking
- ❌ Activity feed
- ❌ Likes & comments on visits
- ❌ Trip planning
- ❌ AI recommendations

**Decision:** These are future enhancements, not part of baseline.

---

## 🔧 CRITICAL CONFIGURATION PATTERNS

### 1. **BACKEND_URL Configuration** (MANDATORY)

**Problem:** Web vs mobile need different API URLs
**Solution:** Centralized in `/app/frontend/utils/config.ts`

```typescript
// ALL files MUST import from here
import { BACKEND_URL } from '../utils/config';

// NEVER define locally:
// ❌ const BACKEND_URL = Platform.OS === 'web' ? '' : '...';
```

**Files Using This:**
- AuthContext.tsx
- All (tabs)/*.tsx files
- landmark-detail/[landmark_id].tsx
- landmarks/[country_id].tsx

**Why Critical:** Without this, mobile browser access fails with "Load failed" errors.

---

### 2. **Platform-Specific Components** (MANDATORY)

**react-native-maps** must be isolated from web:

```typescript
// Use wrapper components:
import { MapView, Marker } from '../../components/MapComponents';

// Files:
// - MapComponents.native.tsx (imports react-native-maps)
// - MapComponents.web.tsx (empty exports)
```

**Why Critical:** Web crashes if react-native-maps is imported directly.

---

### 3. **Environment Variables** (PROTECTED)

**Never Modify:**
- `EXPO_PACKAGER_PROXY_URL`
- `EXPO_PACKAGER_HOSTNAME`
- `MONGO_URL`

**Can Modify:**
- `EXPO_PUBLIC_BACKEND_URL` (but use config.ts instead)

---

## 🐛 BUG FIXES APPLIED (Don't Reintroduce)

### 1. **Duplicate Landmarks** ✅ FIXED
**Issue:** Premium landmarks existed twice (official + premium copies)
**Fix:** Removed duplicates, kept premium versions
**Prevention:** Seed script now checks for existing landmarks

### 2. **Username System Backward Compatibility** ✅ FIXED
**Issue:** Old users without usernames caused crashes
**Fix:** Made username `Optional[str]` in backend models
**Prevention:** Always use optional for new required fields

### 3. **Mobile API Connectivity** ✅ FIXED
**Issue:** iPhone browsers couldn't connect to backend
**Fix:** Smart URL detection in config.ts (localhost vs remote)
**Prevention:** Always use centralized BACKEND_URL

### 4. **Web Crashes from Native Modules** ✅ FIXED
**Issue:** react-native-maps crashed web version
**Fix:** Platform-specific file extensions (.native.tsx, .web.tsx)
**Prevention:** Always wrap native modules

### 5. **Image Display Issues** ✅ FIXED
**Issue:** Multiple images per landmark caused complexity
**Fix:** Simplified to 1 image per landmark
**Database:** All 298 landmarks updated

### 6. **Friends Page Purple Theme** ✅ FIXED
**Issue:** Inconsistent design
**Fix:** Updated to turquoise LinearGradient
**Prevention:** Use theme.colors.primary consistently

---

## 🧪 TESTING CHECKLIST (Every Session Start)

### Pre-Development Checks:
- [ ] Read `/app/CRITICAL_FIXES_AND_PATTERNS.md`
- [ ] Read this baseline document
- [ ] Check `/app/test_result.md` for previous issues
- [ ] Verify services running: `sudo supervisorctl status`

### Login & Auth Testing:
- [ ] Create new account (registration works)
- [ ] Login with email/password
- [ ] Test account available: `mobile@test.com` / `test123`
- [ ] Token persists across page refreshes

### Core Functionality:
- [ ] Browse countries (explore page loads)
- [ ] View landmarks for Norway (15 total: 10 official + 5 premium)
- [ ] Premium landmarks show lock overlays (free users)
- [ ] Tap locked landmark → UpgradeModal appears
- [ ] Navigate to landmark detail (immersive background works)
- [ ] Coordinates display correctly (compact design)

### Cross-Platform:
- [ ] Test on desktop browser (Chrome/MacBook)
- [ ] Test on mobile browser (Safari/iPhone) if possible
- [ ] Web: Login works with relative URLs
- [ ] Mobile: Login works with full backend URL

---

## 📋 SESSION START PROTOCOL (MANDATORY)

### Every Session (Including Forks):

**1. Read Documentation (5 minutes)**
```
1. /app/CRITICAL_FIXES_AND_PATTERNS.md
2. /app/WANDERLIST_BASELINE_MODEL.md (this file)
3. /app/test_result.md
```

**2. Verify Current State (3 minutes)**
```bash
# Check services
sudo supervisorctl status

# Check database
python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.test_database
    users = await db.users.count_documents({})
    landmarks = await db.landmarks.count_documents({})
    visits = await db.visits.count_documents({})
    print(f"Users: {users}, Landmarks: {landmarks}, Visits: {visits}")
    client.close()
asyncio.run(check())
EOF

# Test login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile@test.com","password":"test123"}'
```

**3. Review Last Session Work**
- Check git log for recent changes
- Read any new documentation files
- Verify no regressions

**4. Restart Services if Needed**
```bash
sudo supervisorctl restart expo
sudo supervisorctl restart backend
```

---

## 🔒 PROTECTED FILES (Never Modify Without Reason)

### Configuration:
- `/app/frontend/metro.config.js`
- `/app/frontend/app.json` (except permissions)
- `/app/frontend/package.json` (main field)
- `/app/frontend/.env` (framework variables)
- `/app/backend/.env` (MONGO_URL)

### Core Utilities:
- `/app/frontend/utils/config.ts` (can enhance, don't break)
- `/app/frontend/contexts/AuthContext.tsx` (critical)

### If You Must Modify:
1. Create backup first
2. Test thoroughly
3. Document changes
4. Add to this baseline document

---

## 📊 METRICS & MONITORING

### Key Performance Indicators:
- **Database:** 298 landmarks, ~20 users expected
- **Response Time:** <500ms for API calls
- **Bundle Size:** Web bundle ~2-3MB
- **Supported Platforms:** iOS 13+, Android 8+, Modern Browsers

### Known Limitations:
- Google OAuth needs redirect URL update per fork
- Ngrok tunnel changes between sessions (mobile preview)
- MongoDB connection limited to localhost

---

## 🚀 DEPLOYMENT READINESS

### Production Blockers (Before Launch):
- [ ] Payment integration (Stripe/RevenueCat)
- [ ] Production MongoDB (Atlas)
- [ ] Real image hosting (not base64)
- [ ] Error monitoring (Sentry)
- [ ] Analytics (PostHog/Mixpanel)
- [ ] Push notifications
- [ ] App store listings

### Current State: **MVP READY FOR BETA TESTING**
- Core features work
- Monetization backend complete
- UI polished and stable
- Can onboard beta users

---

## 📝 CHANGELOG (Baseline Evolution)

### v1.0.0 (Current - January 2026)
- Initial baseline established
- Core features documented
- Bug fixes catalogued
- Testing protocols defined

### Future Versions:
- v1.1.0 - Payment integration complete
- v1.2.0 - Badge system implemented
- v2.0.0 - AI features added

---

## 🆘 EMERGENCY RECOVERY

### If App Breaks:
1. Check this baseline document
2. Review CRITICAL_FIXES_AND_PATTERNS.md
3. Check if protected files were modified
4. Restore from git if needed
5. Call troubleshoot_agent

### If Features Missing:
1. Check this document for implementation status
2. Review test_result.md for removal context
3. Check git history
4. May need to reimplement (use documentation)

---

## 🎯 FOR FORK SESSIONS: START HERE

### New Session Initialization:

**1. Orient Yourself (10 minutes)**
- Read this entire document
- Read CRITICAL_FIXES_AND_PATTERNS.md
- Run testing checklist above

**2. Verify Baseline (5 minutes)**
- Test login: `mobile@test.com` / `test123`
- Browse to Norway → see 5 premium locked landmarks
- Verify services running

**3. Understand Current Work (5 minutes)**
- Read test_result.md
- Check any TODO comments in code
- Review user's last messages

**4. Proceed with New Work**
- Now you're ready to build new features
- Always refer back to this baseline
- Update this document if major changes made

---

## 💡 BEST PRACTICES

### When Adding Features:
1. ✅ Update this baseline document
2. ✅ Add to CRITICAL_FIXES_AND_PATTERNS.md if it's a pattern
3. ✅ Test on both web and mobile (or note limitation)
4. ✅ Update session testing checklist
5. ✅ Document in relevant feature-specific .md file

### When Fixing Bugs:
1. ✅ Add to "Bug Fixes Applied" section
2. ✅ Explain prevention strategy
3. ✅ Test that fix persists across restarts

### When Refactoring:
1. ✅ Update architecture section
2. ✅ Update file structure if changed
3. ✅ Test all affected features

---

## ✨ QUALITY GATES (Must Pass)

Before finishing any session:

- [ ] All baseline features still work
- [ ] Login functional (test account works)
- [ ] No console errors on page load
- [ ] Services restart cleanly
- [ ] Documentation updated
- [ ] test_result.md updated
- [ ] This baseline updated if needed

---

**END OF BASELINE MODEL v1.0**

*This document is living documentation. Every significant change to the app should be reflected here.*
*Treat this as the source of truth for app state across all sessions and forks.*
