# WanderList - Essential Baseline (v4.60)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.60.0 - STABLE ✅  
**Status:** Production Ready with WanderList Pro Subscription  
**Last Build:** January 18, 2026  
**Next Phase:** User Testing & Deployment

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **502 landmarks** (427 official + 75 premium), All duplicates removed  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.60 Changes (Latest)**

### Major Code Refactoring
- **Profile page (`profile.tsx`) refactored** - Reduced from 1,172 lines to 581 lines (~50% reduction)
  - Removed 70+ unused style definitions
  - Moved all inline styles to StyleSheet
  - Organized styles into logical sections with comments
  - Removed unused imports (CircularProgress, ProgressBar, RankProgress, etc.)

### Database Cleanup (COMPREHENSIVE)
- **109+ duplicate landmarks removed** - Complete database cleanup
- **502 total landmarks** now (all unique, no duplicates)
- **Li River duplicate fixed** - Kept "Li River Karst Mountains" (official)
- **Cusco duplicate fixed** - Removed duplicate "Cusco Historic Center"
- **All continents verified:**
  - Europe: 107 landmarks, 1,505 points, 10 countries
  - Americas: 107 landmarks, 1,355 points, 10 countries
  - Asia: 106 landmarks, 1,300 points, 10 countries
  - Africa: 101 landmarks, 1,130 points, 10 countries
  - Oceania: 81 landmarks, 855 points, 8 countries

### Seed Data Protection (IMPORTANT)
- **`seed_data.py` updated** with automatic duplicate detection
- When re-seeding, duplicates are automatically skipped
- 66 overlapping premium landmarks identified and blocked
- Clear logging when duplicates are skipped during seeding

### Premium Landmarks Cleanup
- **`premium_landmarks.py` cleaned** - Removed 66 duplicate entries
- **Before:** 100 premium landmarks (many duplicates)
- **After:** 34 unique premium landmarks across 17 countries
- File now well-documented with comments

### Dynamic Continent Stats
- **Continent cards now fetch from API** (`/api/continent-stats`)
- Hardcoded values are fallbacks only (shown briefly while loading)
- Real-time landmark counts, points, and progress
- Auto-updates if landmarks are added/removed

### Rank System Updated (ACHIEVABLE)
- **Legend rank now achievable** - Reduced from 10,000 to 5,000 points
- Total available points: 6,145 (from 502 landmarks)
- All ranks are now achievable:
  - Explorer: 0-499 points
  - Adventurer: 500-1,499 points
  - Voyager: 1,500-2,999 points
  - Globetrotter: 3,000-4,999 points
  - Legend: 5,000+ points ✅

### Backend Testing Verified
- **95.7% test pass rate** (22/23 tests)
- All critical flows working:
  - Authentication ✅
  - Landmark visiting ✅
  - Points calculation ✅
  - Badge/achievement unlocking ✅
  - Data integrity ✅

---

## 💎 **Subscription System**

### Tiers
| Feature | Free | Pro ($3.99/mo or $29.99/yr) |
|---------|------|------------------------------|
| Official Landmarks (427) | ✅ | ✅ |
| Premium Landmarks (75) | 🔒 Locked | ✅ Unlocked |
| Custom Visits | 🔒 Locked | ✅ Unlimited |
| Photos per Visit | 1 | 10 |
| Friends | 5 max | Unlimited |

### Backend Endpoints
- `GET /api/subscription/status` - Get current tier and limits
- `POST /api/subscription/test-toggle` - Toggle between free/pro (dev only)
- `POST /api/subscription/cancel` - Downgrade to free

### Frontend Hook
```typescript
import { useSubscription } from '../hooks/useSubscription';

const { isPro, canAccessPremiumLandmarks, canCreateCustomVisits, maxPhotosPerVisit } = useSubscription();
```

---

## 🎨 **Design System**

### "Ocean to Sand" Gradient (STANDARD)
- **Colors:** `#26C6DA` → `#00BFA5` → `#FFE082` (cyan to teal to warm sand)
- **Direction:** Horizontal (left to right)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** ALL headers across the app (mandatory)

### Standard Header Style
```javascript
// Back Button (circular with light background)
backButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.2)',
  justifyContent: 'center',
  alignItems: 'center',
}

// Branding (right side of header)
brandingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
}
brandingTextDark: {
  fontSize: 13,
  fontWeight: '700',
  color: '#2A2A2A',
}
```

### Premium/Pro Colors
- **Primary Purple:** `#764ba2`
- **Secondary Purple:** `#667eea`
- **Pro Gradient:** `['#667eea', '#764ba2']`
- **Pro Background:** `rgba(118, 75, 162, 0.1)`

### Card Design (Light Theme)
```javascript
{
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
}
```

---

## 💰 **Dual Points System**

### Two Point Types
| Point Type | Description | When Awarded |
|------------|-------------|--------------|
| `points` | Personal/total points | Always (all visits) |
| `leaderboard_points` | Public leaderboard | Only with photos |

### Points Values
| Action | Personal | Leaderboard |
|--------|----------|-------------|
| Official landmark (+photo) | +10 | +10 |
| Official landmark (no photo) | +10 | 0 |
| Premium landmark (+photo) | +25 | +25 |
| Premium landmark (no photo) | +25 | 0 |
| Country visit (+photo) | +50 | +50 |
| Country visit (no photo) | +50 | 0 |
| Custom visits | 0 | 0 |

### Total Points Available
- **6,145 total points** from 502 landmarks
- Official: 427 × 10 = 4,270 points
- Premium: 75 × 25 = 1,875 points

---

## 🏆 **Milestone System (502 landmarks)**

| Landmarks | % | Badge Name | Icon |
|-----------|---|------------|------|
| 10 | 2.0% | Explorer | 🗺️ |
| 25 | 5.0% | Adventurer | 🧗 |
| 50 | 10.0% | Globetrotter | 🌍 |
| 100 | 19.9% | World Traveler | ✈️ |
| 200 | 39.8% | Seasoned Traveler | 🧭 |
| 350 | 69.7% | Legend | 🏆 |
| 500 | 99.6% | Ultimate Explorer | 👑 |

---

## 📱 **Navigation Structure**

### Bottom Tabs
```
Explore (map) → Journey (compass) → Social (people) → Bucket List (bookmark) → Profile (person)
```

### Key Routes
- `/` - Login/Register
- `/(tabs)/explore` - Main continent exploration
- `/(tabs)/journey` - Personal travel stats
- `/(tabs)/social` - Activity feed & leaderboard
- `/(tabs)/bucket-list` - Saved landmarks
- `/(tabs)/profile` - User profile & settings
- `/explore-countries?continent=X` - Countries in continent
- `/landmarks/[country_id]` - Landmarks in country
- `/landmark-detail/[landmark_id]` - Landmark details
- `/settings` - App settings (privacy, notifications)
- `/friends` - Friend management
- `/subscription` - WanderList Pro page
- `/feed` - Full activity feed
- `/about` - About WanderList
- `/continents` - Continent selection with dynamic stats

---

## 🔧 **Critical Configuration**

### Environment Variables
**NEVER MODIFY:**
- `EXPO_PACKAGER_PROXY_URL`
- `EXPO_PACKAGER_HOSTNAME`
- `MONGO_URL`

### Service Commands
```bash
sudo supervisorctl restart backend  # Restart FastAPI
sudo supervisorctl restart expo     # Restart Expo
sudo supervisorctl status           # Check services
```

### Database Seeding
```bash
cd /app/backend
python3 seed_data.py              # Base countries/landmarks (auto-skips duplicates)
python3 seed_data_expansion.py    # Expanded content (48 countries)
# Premium landmarks are in premium_landmarks.py - auto-seeded
# NOTE: Duplicate detection is built-in - safe to re-run
```

---

## 🐛 **Known Issues**

### Google OAuth (NOT WORKING)
- **Error:** `403: disallowed_useragent`
- **Status:** Not fixed - requires user's Google Cloud credentials
- **Workaround:** Use email/password login

### Web Preview Notes
- Some RN styles may render slightly differently on web
- Use Expo Go app for accurate mobile testing

---

## 📂 **Key Files Reference**

### Frontend
| File | Purpose |
|------|---------|
| `/app/frontend/app/(tabs)/profile.tsx` | User profile (REFACTORED - 581 lines) |
| `/app/frontend/app/continents.tsx` | Continent cards (DYNAMIC from API) |
| `/app/frontend/hooks/useSubscription.ts` | Subscription state management |
| `/app/frontend/components/ProFeatureLock.tsx` | Upgrade prompt modal |
| `/app/frontend/components/UniversalHeader.tsx` | Reusable page header |
| `/app/frontend/utils/theme.ts` | Design system constants |
| `/app/frontend/utils/config.ts` | API configuration |
| `/app/frontend/utils/rankSystem.ts` | Rank thresholds (UPDATED) |

### Backend
| File | Purpose |
|------|---------|
| `/app/backend/server.py` | Main FastAPI application |
| `/app/backend/premium_landmarks.py` | Premium landmark definitions (CLEANED - 34 unique) |
| `/app/backend/seed_data.py` | Database seeding (PROTECTED - auto-skips duplicates) |
| `/app/backend/seed_data_expansion.py` | Expanded content seeding |

---

## ✅ **Session Checklist for New Fork**

1. [ ] Run `sudo supervisorctl status` - Verify services running
2. [ ] Check database has data: `curl http://localhost:8001/api/countries` (should return 48 countries)
3. [ ] If database empty, run seed scripts (duplicates auto-skipped)
4. [ ] Test login with `mobile@test.com` / `test123`
5. [ ] Verify all 5 tabs load correctly
6. [ ] Check continent cards show dynamic stats (502 landmarks, 6145 points total)
7. [ ] Verify Profile page loads correctly (recently refactored)
8. [ ] Check Settings page loads (recently cleaned)

### Quick Database Verification
```bash
cd /app/backend && python3 -c "
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
db = client.test_database
print(f'Countries: {db.countries.count_documents({})}')
print(f'Landmarks: {db.landmarks.count_documents({})}')
print(f'Users: {db.users.count_documents({})}')
"
# Expected: Countries: 48, Landmarks: 502, Users: 3+
```

---

## 📝 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 4.60 | Jan 18, 2026 | Profile refactoring, comprehensive duplicate cleanup, seed data protection, dynamic continent stats, rank system update |
| 4.50 | Jan 18, 2026 | Duplicate cleanup, header standardization, settings/profile cleanup, Oceania landmarks |
| 4.40 | Jan 18, 2026 | WanderList Pro subscription, premium landmarks, UI redesigns |
| 4.30 | Jan 17, 2026 | Activity feed, friends leaderboard, bug fixes |
| 4.20 | Jan 16, 2026 | Points system, milestone badges |
| 4.10 | Jan 15, 2026 | Country visits, photo uploads |
| 4.00 | Jan 14, 2026 | Initial stable release |

---

## 🔑 **Critical Numbers to Remember**

| Metric | Value |
|--------|-------|
| Total Landmarks | 502 |
| Official Landmarks | 427 |
| Premium Landmarks | 75 |
| Total Points Available | 6,145 |
| Total Countries | 48 |
| Total Continents | 5 |
| Legend Rank Threshold | 5,000 points |
| Max Milestone Badge | 500 landmarks |

---

*Last Updated: January 18, 2026 - v4.60*
