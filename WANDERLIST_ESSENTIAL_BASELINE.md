# WanderList - Essential Baseline (v4.80)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.80.0 - STABLE ✅  
**Status:** Production Ready with WanderList Pro Subscription  
**Last Build:** January 18, 2026  
**Next Phase:** User Testing & Deployment

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **560 landmarks** (427 official + 133 premium), All duplicates removed  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.80 Changes (Latest)**

### Premium Landmarks Expansion
- **58 new unique premium landmarks** added to 28 countries that previously had 0 premium
- **Regions enhanced:**
  - Oceania (7): Cook Islands, Fiji, Samoa, Tonga, Vanuatu, French Polynesia, New Zealand
  - Americas (5): Argentina, Chile, Colombia, Costa Rica, Ecuador
  - Africa (8): Botswana, Kenya, Mauritius, Morocco, Namibia, Seychelles, Tanzania, Tunisia
  - Asia (5): Indonesia, Malaysia, Singapore, South Korea, Vietnam
  - Europe (3): Netherlands, Portugal, Switzerland

### Duplicate Cleanup
- **2 duplicate premium landmarks removed:**
  - "Salt Cathedral of Zipaquirá" (Colombia) - duplicate of official version
  - "Uluru (Ayers Rock)" (Australia) - duplicate of official version
- Comprehensive similarity analysis performed (exact match, normalized names, keyword search)

### Points System Alignment
- **Backend `/api/countries` now returns `total_points`** per country
- Points correctly calculated as: `(official × 10) + (premium × 25)`
- **Frontend updated** to display accurate points on country cards
- Stats header shows total available points instead of user's earned points

### UI/UX Fixes (5 issues)
1. **Social Feed** - Points display changed from "0" to "+0 pts" format
2. **Journey Rank** - Shows "N/A" instead of "#-" when not ranked
3. **Profile Avatar** - Displays user initials correctly
4. **Profile Stats** - Landmarks count now matches Journey (uses correct API field)
5. **Explore Cards** - Dynamic continent stats from API

### Image Fields Removed
- All `image_url` and `images` fields removed from landmarks database
- Backend model updated - `image_url` now optional
- Landmark detail page uses clean icon-based design

### Updated Stats by Continent
| Continent | Countries | Landmarks | Official | Premium | Points |
|-----------|-----------|-----------|----------|---------|--------|
| Europe | 10 | 115 | 78 | 37 | 1,705 |
| Asia | 10 | 120 | 90 | 30 | 1,650 |
| Africa | 10 | 117 | 93 | 24 | 1,530 |
| Americas | 10 | 116 | 88 | 28 | 1,580 |
| Oceania | 8 | 92 | 78 | 14 | 1,130 |

---

## 💎 **Subscription System**

### Tiers
| Feature | Free | Pro ($3.99/mo or $29.99/yr) |
|---------|------|------------------------------|
| Official Landmarks (427) | ✅ | ✅ |
| Premium Landmarks (133) | 🔒 Locked | ✅ Unlocked |
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
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.2)',
  justifyContent: 'center', alignItems: 'center',
}

// Branding (right side of header)
brandingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 }
brandingTextDark: { fontSize: 13, fontWeight: '700', color: '#2A2A2A' }
```

### Premium/Pro Colors
- **Primary Purple:** `#764ba2`
- **Secondary Purple:** `#667eea`
- **Pro Gradient:** `['#667eea', '#764ba2']`

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

### Total Points Available
- **7,595 total points** from 560 landmarks
- Official: 427 × 10 = 4,270 points
- Premium: 133 × 25 = 3,325 points

---

## 🏆 **Milestone System (560 landmarks)**

| Landmarks | % | Badge Name | Icon |
|-----------|---|------------|------|
| 10 | 1.8% | Explorer | 🗺️ |
| 25 | 4.5% | Adventurer | 🧗 |
| 50 | 8.9% | Globetrotter | 🌍 |
| 100 | 17.9% | World Traveler | ✈️ |
| 200 | 35.7% | Seasoned Traveler | 🧭 |
| 350 | 62.5% | Legend | 🏆 |
| 500 | 89.3% | Ultimate Explorer | 👑 |

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
- `/explore-countries?continent=X` - Countries in continent (shows accurate points)
- `/landmarks/[country_id]` - Landmarks in country
- `/landmark-detail/[landmark_id]` - Landmark details (icon-based, no images)
- `/settings` - App settings
- `/friends` - Friend management
- `/subscription` - WanderList Pro page
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
# Premium landmarks in premium_landmarks.py - 92 unique landmarks
# NOTE: Duplicate detection built-in - safe to re-run
```

---

## 🐛 **Known Issues**

### Google OAuth (NOT WORKING)
- **Error:** `403: disallowed_useragent`
- **Status:** Not fixed - requires user's Google Cloud credentials
- **Workaround:** Use email/password login

---

## 📂 **Key Files Reference**

### Frontend
| File | Purpose |
|------|---------|
| `/app/frontend/app/(tabs)/profile.tsx` | User profile (refactored) |
| `/app/frontend/app/(tabs)/social.tsx` | Social feed (points display fixed) |
| `/app/frontend/app/(tabs)/journey.tsx` | Journey stats (rank display fixed) |
| `/app/frontend/app/explore-countries.tsx` | Country list (uses `total_points` from API) |
| `/app/frontend/app/continents.tsx` | Continent cards (dynamic from API) |
| `/app/frontend/app/landmark-detail/[landmark_id].tsx` | Landmark detail (icon-based) |
| `/app/frontend/utils/rankSystem.ts` | Rank thresholds (7,595 pts max) |

### Backend
| File | Purpose |
|------|---------|
| `/app/backend/server.py` | Main API (Country model has `total_points`) |
| `/app/backend/premium_landmarks.py` | Premium definitions (92 unique, no duplicates) |
| `/app/backend/seed_data.py` | Database seeding (auto-skips duplicates) |

---

## ✅ **Session Checklist for New Fork**

1. [ ] Run `sudo supervisorctl status` - Verify services running
2. [ ] Check database: `curl http://localhost:8001/api/countries` (should return 48 countries)
3. [ ] If database empty, run seed scripts (duplicates auto-skipped)
4. [ ] Test login with `mobile@test.com` / `test123`
5. [ ] Verify all 5 tabs load correctly
6. [ ] Check continent cards show dynamic stats (~560 landmarks, ~7595 points)
7. [ ] Verify country cards show accurate points (not hardcoded)
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
# Expected: Countries: 48, Landmarks: 560, Premium: 133, Users: 3+
```

---

## 📝 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 4.80 | Jan 18, 2026 | +58 premium landmarks, points system alignment, duplicate cleanup, 5 UI/UX fixes |
| 4.70 | Jan 18, 2026 | Premium expansion attempt, image removal, documentation |
| 4.60 | Jan 18, 2026 | Profile refactoring, duplicate cleanup, seed data protection |
| 4.50 | Jan 18, 2026 | Duplicate cleanup, header standardization |
| 4.40 | Jan 18, 2026 | WanderList Pro subscription, premium landmarks |

---

## 🔑 **Critical Numbers to Remember**

| Metric | Value |
|--------|-------|
| Total Landmarks | 560 |
| Official Landmarks | 427 |
| Premium Landmarks | 133 |
| Total Points Available | 7,595 |
| Total Countries | 48 |
| Total Continents | 5 |
| Legend Rank Threshold | 5,000 points |
| Max Milestone Badge | 500 landmarks |

---

*Last Updated: January 18, 2026 - v4.80*
