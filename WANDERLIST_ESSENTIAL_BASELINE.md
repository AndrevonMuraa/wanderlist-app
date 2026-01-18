# WanderList - Essential Baseline (v4.32)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.32.0 - STABLE ✅  
**Status:** Premium UI Polish, Help System, Navigation Fixes Complete  
**Last Build:** January 18, 2026  
**Next Phase:** Monetization Strategy Design

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **520 landmarks** (deduplicated), test data populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (84 landmarks, 8 countries) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.32 Changes (Latest)**

### Premium Flag Design
- **Glossy shine effect** - White gradient overlay (25% → 5% → transparent)
- **Vignette effect** - Darker edges for depth
- **Texture overlay** - Subtle linen pattern (3% opacity)
- **Edge highlight** - 1px white line at top
- **Enhanced shadows** - Cards float with 4px shadow
- **Flags fill entire card** - No blank space, using `cover` mode
- **Premium typography** - Larger names, letter spacing, gold points color

### Help & Support System
- **Updated About page** → "About & Help" (`/about`)
- **FAQ Section** - 6 expandable questions covering:
  - Points system (dual points explained)
  - Custom visits
  - Privacy settings
  - Photo collection
  - Milestone badges
  - Account deletion
- **Contact Support Form** - Subject + message with send functionality
- **Updated stats** - 520 landmarks, 6,580 points, v4.31

### Navigation Fixes
All back buttons now navigate to correct parent pages:
| Page | Back → |
|------|--------|
| Settings | Profile |
| Friends | Social |
| Edit Profile | Profile |
| Notifications | Profile |
| My Country Visits | Journey |
| Photo Collection | Journey |
| Leaderboard | Social |

### Code Cleanup
- **Removed Trip Planning** (~14KB of unused code)
- Deleted 10 endpoints: `/api/trips/*`
- Removed models: Trip, TripCreate, TripUpdate, TripLandmark, TripPlan

---

## 🎨 **Design System**

### "Ocean to Sand" Gradient (STANDARD)
- **Colors:** `#26C6DA` → `#00BFA5` → `#FFE082` (cyan to teal to warm sand)
- **Direction:** Horizontal (left to right)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** ALL headers across the app (mandatory)

### Premium Flag Cards
```javascript
// Layered effects on flag cards:
1. Base flag image (resizeMode: "cover")
2. Glossy shine gradient (top 60%)
3. Vignette gradient (full coverage)
4. Texture overlay (3% opacity)
5. Edge highlight (1px white line)
6. Name gradient (bottom fade to black)
```

### Universal Header
- Added `onBack` prop for explicit navigation
- Back button uses custom handler when provided
- Falls back to `router.back()` if no handler

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

---

## 🏆 **Milestone System (520 landmarks)**

| Landmarks | % | Badge Name | Icon |
|-----------|---|------------|------|
| 10 | 1.9% | Explorer | 🗺️ |
| 25 | 4.8% | Adventurer | 🧗 |
| 50 | 9.6% | Globetrotter | 🌍 |
| 100 | 19.2% | World Traveler | ✈️ |
| 200 | 38.5% | Seasoned Traveler | 🧭 |
| 350 | 67.3% | Legend | 🏆 |
| 500 | 96.2% | Ultimate Explorer | 👑 |

---

## 🌍 **User Created Visits**

### Features
- **Up to 10 landmarks** per custom visit
- **Per-landmark photos** - Each landmark can have 1 photo
- **Up to 10 country photos** - General trip photos
- **Max 20 total photos** per visit
- No points awarded

### Data Structure
```json
{
  "country_name": "Monaco",
  "landmarks": [
    {"name": "Prince's Palace", "photo": "base64..."},
    {"name": "Monte Carlo Casino", "photo": null}
  ],
  "photos": ["base64...", "base64..."],
  "diary_notes": "Amazing trip!",
  "visibility": "public"
}
```

### Entry Points
1. Journey Page → "Custom Visits" → "Add Visit"
2. Explore Page → "Can't find your destination?"

---

## 📸 **Photo Collection**

### Entry Point
Journey Page → "My Photos" card

### Features
- Stats banner: X Photos • X Countries • X Years
- Filter tabs: All | By Country | By Year | By Type
- 3-column Instagram-style grid
- Fullscreen viewer with swipe

### Data Sources
- Landmark visits (`/api/visits`)
- Country visits (`/api/country-visits`)
- Custom visits (`/api/user-created-visits`)

---

## 📱 **Navigation Structure**

### Bottom Tabs
```
├── Explore (continents.tsx) - Dynamic continent stats
├── My Journey (journey.tsx) - Stats, visits, photos
├── Social (social.tsx) - Activity feed
└── Profile (profile.tsx) - Settings
```

### Key Routes
```
/about          - Help & Support (FAQ, Contact)
/settings       - App settings
/friends        - Friend management
/notifications  - User notifications
/leaderboard    - Global rankings
/achievements   - Badges earned
/photo-collection - Photo gallery
/my-country-visits - Country visit list
/edit-profile   - Profile editor
```

---

## 📁 **Key Files**

### Frontend - Premium UI
```
/app/frontend/app/explore-countries.tsx  # Premium flag cards
/app/frontend/app/about.tsx              # Help & Support
/app/frontend/components/UniversalHeader.tsx  # onBack prop
```

### Backend - Core APIs
```
GET  /api/continent-stats     # Dynamic continent data
POST /api/user-created-visits # Multi-landmark support
GET  /api/photos/collection   # Photo aggregation
```

---

## 📊 **Database Stats**

| Continent | Landmarks | Points | Countries |
|-----------|-----------|--------|-----------|
| Europe | 113 | 1,655 | 10 |
| Asia | 112 | 1,435 | 10 |
| Americas | 110 | 1,430 | 10 |
| Africa | 102 | 1,155 | 10 |
| Oceania | 83 | 905 | 8 |
| **TOTAL** | **520** | **6,580** | **48** |

---

## 🔧 **Service Commands**

```bash
# Restart services
sudo supervisorctl restart backend expo

# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/expo.err.log
tail -f /var/log/supervisor/backend.err.log
```

---

## ✅ **Verified Working (v4.32)**

- [x] Premium flag cards with glossy effects
- [x] Help & Support with FAQ and Contact form
- [x] All back buttons navigate correctly
- [x] Multi-landmark custom visits
- [x] Dynamic continent stats
- [x] Photo collection gallery
- [x] Dual points system
- [x] Updated milestones (520 landmarks)
- [x] Trip planning code removed

---

## 🔴 **Known Issues**

1. **Google OAuth** - Broken (`403: disallowed_useragent`)
   - Workaround: Use email/password login
   - Fix: Requires Google Cloud OAuth credentials

---

## 🔒 **Privacy System**

| Icon | Color | Level | Who Can See |
|------|-------|-------|-------------|
| 🌐 | Green | Public | Everyone |
| 👥 | Blue | Friends | Only friends |
| 🔒 | Red | Private | Only you |

---

## 🚀 **Next Development Phase**

### Monetization Strategy (Upcoming)
Potential areas to explore:
- Premium subscription tiers
- In-app purchases
- Ad integration
- Premium landmarks/content
- Subscription center UI

### Future Features (Backlog)
- User travel preferences
- Trip planning (if re-implemented)
- Enhanced social features
- Offline mode

---

## 📝 **Session Summary (v4.32)**

### Completed This Session:
1. ✅ Multi-landmark custom visits with per-photo support
2. ✅ Dynamic continent stats API endpoint
3. ✅ Removed unused Trip Planning code
4. ✅ Help & Support system (FAQ + Contact)
5. ✅ Fixed all back button navigation
6. ✅ Premium flag design with texture overlays
7. ✅ Country flags fill cards completely
8. ✅ Updated baseline documentation

### Ready for Next Phase:
- Core features complete and polished
- UI has premium feel
- Help system in place
- Ready to design monetization strategy
