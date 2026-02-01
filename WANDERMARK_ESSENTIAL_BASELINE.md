# WanderMark - Essential Baseline (v1.1.0)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 1.1.0 - STABLE ✅  
**Status:** Feature Complete - App Store Ready  
**Last Build:** June 2025  
**Next Phase:** Social Logins Completion & App Store Submission

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **560 landmarks** (427 official + 133 premium), All duplicates removed  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v1.0.0 Changes (Latest Session)**

### App Store Readiness Complete
- **Privacy Policy page** (`/privacy-policy`) - 10 comprehensive sections
- **Terms of Service page** (`/terms-of-service`) - 13 sections including subscriptions
- **Legal links** on Login page (Privacy Policy • Terms of Service)
- **Legal section** in Settings page with navigation to both pages
- **App Store Metadata** document created (`/app/APP_STORE_METADATA.md`)
- **Screenshot Guide** created (`/app/SCREENSHOT_GUIDE.md`)
- **Feature Graphic** generated (1024×500px) for Google Play

### UI/UX Fixes
- **Profile Edit Button**: Fixed touch target (was 2px, now 28x28px with hitSlop)
  - Solid turquoise background with white pencil icon
  - No longer overlaps with rank badge
- **Username Text**: Reduced from 24px to 18px for better fit
- **Version Numbers**: Unified to v1.0.0 across About and Settings pages
- **Continent Icons**: Updated to use Ionicons matching My Journey page
  - Europe: `business-outline` (🏛️)
  - Asia: `earth-outline` (🌏)
  - Africa: `sunny-outline` (☀️)
  - Americas: `leaf-outline` (🌿)
  - Oceania: `water-outline` (🌊)
- **Bucket List Header**: Fixed vertical alignment to match Explore page
- **Bucket List Tabs**: Fixed styling to match Explore page (padding, font size)
- **Tab Navigation**: Fixed bottom tab bar disappearing when switching Explore/Bucket List
  - Changed `router.push` to `router.replace` for proper navigation

### Backend Fix
- **Continent Progress Bars**: Fixed incorrect values (was showing landmarks, now shows countries)
  - Backend now returns `visited_countries` count
  - Progress calculated as countries visited / total countries
  - Example: "3/10 visited" means 3 countries with landmarks visited

---

## 🆕 **v4.85-v4.86 Changes (Previous Session)**

### App Icon & Splash Screen Created
- **New app icon** (1024×1024) with Globe Lines design:
  - Globe with latitude/longitude lines
  - White "W" letter centered
  - Gold location pin (#C9A961)
  - Ocean to Sand gradient background
- **New splash screen** (1284×2778) - Decorative style:
  - White container with turquoise globe icon
  - "WanderMark" title + tagline
  - Decorative background circles
- **Android adaptive icon** configured with turquoise background

### Branding Component Created
- **New component:** `/app/frontend/components/BrandedGlobeIcon.tsx`
  - `BrandedGlobeIcon` - Full icon with gradient, globe lines, W, and pin
  - `HeaderBranding` - Compact version for headers (globe + "WanderMark" text)
- **SVG-based** globe with latitude/longitude lines using `react-native-svg`

### Headers Updated Across All Pages (17+ pages)
All headers now use the new `HeaderBranding` component at `size={18}`:

**Main Tab Pages:**
- `(tabs)/journey.tsx` - My Journey
- `(tabs)/social.tsx` - Social Hub
- `(tabs)/profile.tsx` - Profile

**Explore Flow:**
- `continents.tsx` - Explore Continents (reference design)
- `explore-countries.tsx` - Country List
- `landmarks/[country_id].tsx` - Landmarks

**Sub-Pages:**
- `feed.tsx` - Activity Feed (with back button + white title)
- `about.tsx` - About & Help (hero icon also updated to branded globe)
- `settings.tsx` - Settings
- `bucket-list.tsx` - Bucket List
- `notifications.tsx` - Notifications
- `friends.tsx` - Friends
- `leaderboard.tsx` - Leaderboard
- `my-country-visits.tsx` - My Country Visits
- `ranks.tsx` - Ranks
- `subscription.tsx` - Subscription
- `analytics.tsx` - Analytics

**Reusable Components:**
- `components/UniversalHeader.tsx` - Updated with HeaderBranding

### Login Page Branding
- Large branded globe icon (size 90) on login screen
- Replaces old generic earth icon

### app.json Configuration Updated
- **App name:** "frontend" → "WanderMark"
- **Slug:** "frontend" → "wanderlist"
- **Scheme:** "frontend" → "wanderlist"
- **Splash background:** `#4DB8D8` (turquoise)
- **Android adaptive icon background:** `#4DB8D8`
- **iOS permissions added:**
  - `NSCameraUsageDescription`: "Take photos of landmarks you visit"
  - `NSPhotoLibraryUsageDescription`: "Save and share your travel photos"
- **Android permissions added:** CAMERA, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE

### Comprehensive Testing Completed
- **Backend:** 9/9 tests passed (100%)
  - Authentication, database integrity, points system, premium restrictions
  - Countries API with `total_points`, achievements, leaderboard
  - Duplicate landmark verification
- **Frontend:** 10/10 tests passed (100%)
  - Login, navigation, explore flow, points display
  - Stats consistency, premium features, responsive design

---

## 🎨 **Design System**

### Theme Colors (from `/app/frontend/styles/theme.ts`)
| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Turquoise) | `#4DB8D8` | Headers, buttons, accents |
| Secondary (Sand) | `#E8DCC8` | Gradient end, backgrounds |
| Accent (Gold) | `#C9A961` | Location pins, premium indicators |

### "Ocean to Sand" Gradient (STANDARD)
- **Colors:** `#4DB8D8` → `#7DCBE3` → `#C9CAAE` → `#E8DCC8`
- **Direction:** Horizontal or diagonal (135deg for icon)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** ALL headers across the app (mandatory)

### Standard Header Style
```javascript
// Header Container
header: {
  paddingHorizontal: 16,
  paddingBottom: 16,  // or theme.spacing.md
}

// Header Row
headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 32,
}

// Back Button (circular with light background)
backButton: {
  width: 36, height: 36, borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.2)',
  justifyContent: 'center', alignItems: 'center',
  marginRight: 12,
}

// Title (white, left-aligned on sub-pages)
headerTitle: {
  fontSize: 22, fontWeight: '700', color: '#fff', flex: 1,
}

// Branding (right side of header)
<HeaderBranding size={18} textColor="#2A2A2A" />
```

### Branded Globe Icon Usage
```typescript
// Import
import BrandedGlobeIcon, { HeaderBranding } from '../components/BrandedGlobeIcon';

// In headers (size 18, matches Explore page)
<HeaderBranding size={18} textColor="#2A2A2A" />

// For login/hero sections (larger)
<BrandedGlobeIcon size={90} showPin={true} showW={true} />
```

### Premium/Pro Colors
- **Primary Purple:** `#764ba2`
- **Secondary Purple:** `#667eea`
- **Pro Gradient:** `['#667eea', '#764ba2']`

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
- `/` - Login/Register (with branded globe icon)
- `/(tabs)/explore` - Main continent exploration
- `/(tabs)/journey` - Personal travel stats
- `/(tabs)/social` - Social hub & activity feed preview
- `/(tabs)/bucket-list` - Saved landmarks
- `/(tabs)/profile` - User profile & settings
- `/explore-countries?continent=X` - Countries in continent (shows accurate points)
- `/landmarks/[country_id]` - Landmarks in country
- `/landmark-detail/[landmark_id]` - Landmark details (icon-based, no images)
- `/feed` - Full activity feed (sub-page with back button)
- `/settings` - App settings
- `/friends` - Friend management
- `/subscription` - WanderMark Pro page
- `/continents` - Continent selection with dynamic stats
- `/about` - About & Help (with branded hero icon)

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
# Premium landmarks in premium_landmarks.py - 133 unique landmarks
# NOTE: Duplicate detection built-in - safe to re-run
```

---

## 🐛 **Known Issues**

### Google OAuth (NOT WORKING)
- **Error:** `403: disallowed_useragent`
- **Status:** Not fixed - requires user's Google Cloud credentials
- **Workaround:** Use email/password login or Quick Test Login

---

## 📂 **Key Files Reference**

### Frontend - Branding
| File | Purpose |
|------|---------|
| `/app/frontend/components/BrandedGlobeIcon.tsx` | Globe icon + HeaderBranding components |
| `/app/frontend/app/(auth)/login.tsx` | Login page with branded icon |
| `/app/frontend/components/UniversalHeader.tsx` | Reusable header with branding |
| `/app/frontend/app.json` | App config (name, icons, splash) |

### Frontend - Pages
| File | Purpose |
|------|---------|
| `/app/frontend/app/(tabs)/profile.tsx` | User profile (refactored) |
| `/app/frontend/app/(tabs)/social.tsx` | Social hub (points display fixed) |
| `/app/frontend/app/(tabs)/journey.tsx` | Journey stats (rank display fixed) |
| `/app/frontend/app/feed.tsx` | Activity feed sub-page |
| `/app/frontend/app/explore-countries.tsx` | Country list (uses `total_points` from API) |
| `/app/frontend/app/continents.tsx` | Continent cards (dynamic from API) |
| `/app/frontend/app/landmark-detail/[landmark_id].tsx` | Landmark detail (icon-based) |
| `/app/frontend/utils/rankSystem.ts` | Rank thresholds (7,595 pts max) |

### Frontend - Assets
| File | Purpose |
|------|---------|
| `/app/frontend/assets/images/icon.png` | App icon (1024×1024) |
| `/app/frontend/assets/images/adaptive-icon.png` | Android adaptive icon |
| `/app/frontend/assets/images/splash-image.png` | Splash screen (1284×2778) |

### Backend
| File | Purpose |
|------|---------|
| `/app/backend/server.py` | Main API (Country model has `total_points`) |
| `/app/backend/premium_landmarks.py` | Premium definitions (133 unique, no duplicates) |
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
9. [ ] Verify all headers show globe branding (size 18)
10. [ ] Check login page shows branded globe icon

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
| 4.86 | Jan 20, 2026 | Privacy Policy page, Terms of Service page, Legal links on login, Legal section in Settings, Bundle ID & Package Name, enhanced permissions |
| 4.85 | Jan 20, 2026 | App icon & splash, branding component, headers updated (17+ pages), app.json config |
| 4.80 | Jan 18, 2026 | +58 premium landmarks, points system alignment, duplicate cleanup, 5 UI/UX fixes |
| 4.70 | Jan 18, 2026 | Premium expansion attempt, image removal, documentation |
| 4.60 | Jan 18, 2026 | Profile refactoring, duplicate cleanup, seed data protection |
| 4.50 | Jan 18, 2026 | Duplicate cleanup, header standardization |
| 4.40 | Jan 18, 2026 | WanderMark Pro subscription, premium landmarks |

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
| HeaderBranding Size | 18 (standard across all pages) |

---

## 🚀 **App Store Readiness**

### Completed ✅
- [x] App icon (1024×1024)
- [x] Splash screen
- [x] Android adaptive icon
- [x] App name configured ("WanderMark")
- [x] iOS permission descriptions (Camera, Photo Library, Photo Library Add)
- [x] Android permissions (Camera, Storage, Media Images)
- [x] Bundle Identifier (iOS): `com.wanderlist.app`
- [x] Package Name (Android): `com.wanderlist.app`
- [x] Privacy Policy page (`/privacy-policy`)
- [x] Terms of Service page (`/terms-of-service`)
- [x] Legal links on Login page
- [x] Legal section in Settings page
- [x] Android versionCode: 1
- [x] App Store Metadata document (`/app/APP_STORE_METADATA.md`)
- [x] Screenshot Guide (`/app/SCREENSHOT_GUIDE.md`)
- [x] Feature Graphic (1024×500px) (`/app/frontend/assets/images/feature-graphic.png`)
- [x] Version unified to v1.0.0

### Remaining for App Store Submission
- [ ] Privacy Policy hosted URL (replace placeholder `https://wanderlist.app/privacy`)
- [ ] Terms of Service hosted URL (replace placeholder `https://wanderlist.app/terms`)
- [ ] Sign in with Apple (required if offering Google OAuth) OR remove Google OAuth
- [ ] Capture high-resolution screenshots on physical device/simulator
- [ ] Age rating questionnaire

### Legal Pages Structure
| Page | Route | Purpose |
|------|-------|---------|
| Privacy Policy | `/privacy-policy` | Data collection, usage, controls |
| Terms of Service | `/terms-of-service` | Usage agreement, subscriptions, liability |

### App Store Metadata
See `/app/APP_STORE_METADATA.md` for complete submission content including:
- App descriptions (iOS & Android)
- Keywords and ASO optimization
- Screenshot recommendations (8 scenes)
- In-app purchase configuration
- Review information
- Submission checklist

### Documentation Created This Session
| File | Purpose |
|------|---------|
| `/app/APP_STORE_METADATA.md` | Complete App Store/Play Store submission content |
| `/app/SCREENSHOT_GUIDE.md` | Screenshot capture instructions and recommendations |
| `/app/frontend/assets/images/feature-graphic.png` | Android promotional banner (1024×500) |
| `/app/frontend/assets/feature-graphic.html` | Feature graphic design template |

---

## 📝 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 20, 2026 | App Store ready: Legal pages, metadata docs, feature graphic, UI fixes (edit button, icons, tabs, navigation, progress bars) |
| 4.86 | Jan 20, 2026 | Privacy Policy page, Terms of Service page, Legal links on login, Legal section in Settings, Bundle ID & Package Name, enhanced permissions |
| 4.85 | Jan 20, 2026 | App icon & splash, branding component, headers updated (17+ pages), app.json config |

---

*Last Updated: January 20, 2026 - v1.0.0*
