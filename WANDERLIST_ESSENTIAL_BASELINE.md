# WanderList - Essential Baseline (v4.70)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.70.0 - STABLE ✅  
**Status:** Production Ready with WanderList Pro Subscription  
**Last Build:** January 18, 2026  
**Next Phase:** User Testing & Deployment

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **562 landmarks** (427 official + 135 premium), All duplicates removed  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.70 Changes (Latest)**

### Premium Landmarks Expansion (+60 landmarks)
- **28 countries received premium content** - Previously had 0 premium landmarks
- **New premium landmarks added:**
  - Oceania (7 countries): Cook Islands, Fiji, Samoa, Tonga, Vanuatu, French Polynesia, New Zealand
  - Americas (5 countries): Argentina, Chile, Colombia, Costa Rica, Ecuador
  - Africa (8 countries): Botswana, Kenya, Mauritius, Morocco, Namibia, Seychelles, Tanzania, Tunisia
  - Asia (5 countries): Indonesia, Malaysia, Singapore, South Korea, Vietnam
  - Europe (3 countries): Netherlands, Portugal, Switzerland
- **Total premium landmarks:** 135 (was 75)
- **premium_landmarks.py updated** - Now contains 94 unique premium landmarks

### Image Fields Removed
- **All `image_url` and `images` fields removed** from landmarks database
- Backend model updated - `image_url` now optional
- Landmark detail page uses icon-based design (no images)

### UI/UX Fixes (5 issues resolved)
1. **Social Feed** - Points now display as "+0 pts" instead of just "0"
2. **Journey Rank** - Shows "N/A" instead of "#-" when not ranked
3. **Profile Avatar** - Displays user initials (was already working with DefaultAvatar)
4. **Profile Stats** - Landmarks count now matches Journey page (uses `progressStats.overall.visited`)
5. **Explore Cards** - Continent stats dynamically updated from API

### Updated Stats by Continent
- Europe: **115 landmarks**, 10 countries, 37 premium
- Asia: **120 landmarks**, 10 countries, 30 premium
- Africa: **117 landmarks**, 10 countries, 24 premium
- Americas: **116 landmarks**, 10 countries, 28 premium
- Oceania: **94 landmarks**, 8 countries, 16 premium

---

## 💎 **Subscription System**

### Tiers
| Feature | Free | Pro ($3.99/mo or $29.99/yr) |
|---------|------|------------------------------|
| Official Landmarks (427) | ✅ | ✅ |
| Premium Landmarks (135) | 🔒 Locked | ✅ Unlocked |
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
- **7,645 total points** from 562 landmarks
- Official: 427 × 10 = 4,270 points
- Premium: 135 × 25 = 3,375 points

---

## 🏆 **Milestone System (562 landmarks)**

| Landmarks | % | Badge Name | Icon |
|-----------|---|------------|------|
| 10 | 1.8% | Explorer | 🗺️ |
| 25 | 4.4% | Adventurer | 🧗 |
| 50 | 8.9% | Globetrotter | 🌍 |
| 100 | 17.8% | World Traveler | ✈️ |
| 200 | 35.6% | Seasoned Traveler | 🧭 |
| 350 | 62.3% | Legend | 🏆 |
| 500 | 89.0% | Ultimate Explorer | 👑 |

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
- `/landmark-detail/[landmark_id]` - Landmark details (icon-based, no images)
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
# Premium landmarks are in premium_landmarks.py - contains 94 unique landmarks
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
| `/app/frontend/app/(tabs)/profile.tsx` | User profile (REFACTORED - uses DefaultAvatar) |
| `/app/frontend/app/(tabs)/social.tsx` | Social feed (FIXED - points display) |
| `/app/frontend/app/(tabs)/journey.tsx` | Journey stats (FIXED - rank display) |
| `/app/frontend/app/continents.tsx` | Continent cards (DYNAMIC from API) |
| `/app/frontend/app/landmark-detail/[landmark_id].tsx` | Landmark detail (icon-based, no images) |
| `/app/frontend/hooks/useSubscription.ts` | Subscription state management |
| `/app/frontend/components/ProFeatureLock.tsx` | Upgrade prompt modal |
| `/app/frontend/components/DefaultAvatar.tsx` | Avatar with user initials |
| `/app/frontend/components/UniversalHeader.tsx` | Reusable page header |
| `/app/frontend/utils/theme.ts` | Design system constants |
| `/app/frontend/utils/config.ts` | API configuration |
| `/app/frontend/utils/rankSystem.ts` | Rank thresholds (7,645 pts max) |

### Backend
| File | Purpose |
|------|---------|
| `/app/backend/server.py` | Main FastAPI application (image_url optional) |
| `/app/backend/premium_landmarks.py` | Premium landmark definitions (94 unique, no image_urls) |
| `/app/backend/seed_data.py` | Database seeding (PROTECTED - auto-skips duplicates) |
| `/app/backend/seed_data_expansion.py` | Expanded content seeding |

---

## ✅ **Session Checklist for New Fork**

1. [ ] Run `sudo supervisorctl status` - Verify services running
2. [ ] Check database has data: `curl http://localhost:8001/api/countries` (should return 48 countries)
3. [ ] If database empty, run seed scripts (duplicates auto-skipped)
4. [ ] Test login with `mobile@test.com` / `test123`
5. [ ] Verify all 5 tabs load correctly
6. [ ] Check continent cards show dynamic stats (562 landmarks, ~7645 points total)
7. [ ] Verify Profile page shows correct landmark count
8. [ ] Check landmark detail page shows icon (not image)

### Quick Database Verification
```bash
cd /app/backend && python3 -c "
from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
db = client.test_database
print(f'Countries: {db.countries.count_documents({})}')
print(f'Landmarks: {db.landmarks.count_documents({})}')
print(f'Premium: {db.landmarks.count_documents({\"category\": \"premium\"})}')
print(f'Users: {db.users.count_documents({})}')
"
# Expected: Countries: 48, Landmarks: 562, Premium: 135, Users: 3+
```

---

## 📝 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 4.70 | Jan 18, 2026 | +60 premium landmarks (28 countries), UI/UX fixes (5 issues), removed image fields, updated documentation |
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
| Total Landmarks | 562 |
| Official Landmarks | 427 |
| Premium Landmarks | 135 |
| Total Points Available | 7,645 |
| Total Countries | 48 |
| Total Continents | 5 |
| Legend Rank Threshold | 5,000 points |
| Max Milestone Badge | 500 landmarks |

---

*Last Updated: January 18, 2026 - v4.70*
