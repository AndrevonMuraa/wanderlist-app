# WanderList - Essential Baseline (v4.31)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.31.0 - STABLE ✅  
**Status:** Multi-Landmark Photos, Dynamic Stats, Duplicate Cleanup Complete  
**Last Build:** January 17, 2026  
**Next Version:** v4.32 - Future Features

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **520 landmarks** (cleaned up), test data populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (84 landmarks, 8 countries) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.31 Changes**

### Multi-Landmark Custom Visits
- Custom visits now support **up to 10 landmarks** per country
- Each landmark can have its **own dedicated photo**
- Total photos: 10 country photos + 10 landmark photos = **max 20 per visit**
- Dynamic "+" button to add more landmarks in the modal

### Dynamic Continent Stats
- New endpoint: `GET /api/continent-stats` provides real-time data
- Continent cards now fetch stats from database instead of hardcoded values
- Stats include: landmarks, points, countries, and user progress per continent

### Landmark Cleanup
- Removed **15 duplicate landmarks** (similar names)
- Fixed **2 ID collisions** (Uluru, Churchill)
- Added **12 new authentic landmarks** as replacements
- Updated orphan visits to point to correct landmarks

### Updated Milestone System (520 landmarks)
| Landmarks | % | Badge Name |
|-----------|---|------------|
| 10 | 1.9% | 🗺️ Explorer |
| 25 | 4.8% | 🧗 Adventurer |
| 50 | 9.6% | 🌍 Globetrotter |
| 100 | 19.2% | ✈️ World Traveler |
| **200** | **38.5%** | **🧭 Seasoned Traveler** (NEW) |
| **350** | **67.3%** | **🏆 Legend** (moved from 250) |
| 500 | 96.2% | 👑 Ultimate Explorer |

### Code Cleanup
- Removed unused **Trip Planning endpoints** (~14KB of code)
- Removed unused **Trip models** (Trip, TripCreate, TripUpdate, TripLandmark, etc.)
- Kept BucketList functionality

---

## 🎨 **Design System**

### "Ocean to Sand" Gradient (STANDARD)
- **Colors:** `#26C6DA` → `#00BFA5` → `#FFE082` (cyan to teal to warm sand)
- **Direction:** Horizontal (left to right)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** ALL headers across the app (mandatory)

### Universal Header (STANDARD)
- **Layout:** Single row - Close/Back left, Title center-left, WanderList branding right
- **Branding:** 🌍 WanderList in dark text (#2A2A2A)
- **Sticky:** All headers stick to top while scrolling

### Continent Cards (Updated v4.31)
- **Height:** 140px
- **Text Background:** Semi-transparent accent color overlay (40% opacity)
- **Data Source:** Dynamic from `/api/continent-stats` endpoint
- **Stats shown:** Points, Countries, Landmarks

---

## 💰 **Dual Points System**

### Two Point Types
| Point Type | Description | When Awarded |
|------------|-------------|--------------|
| `points` | Personal/total points | Always (all visits) |
| `leaderboard_points` | Public leaderboard | Only with photos |

### Points Logic
| Action | Personal Points | Leaderboard Points |
|--------|----------------|-------------------|
| Landmark visit WITH photo | ✅ +10/25 pts | ✅ +10/25 pts |
| Landmark visit WITHOUT photo | ✅ +10/25 pts | ❌ 0 pts |
| Country visit WITH photo | ✅ +50 pts | ✅ +50 pts |
| Country visit WITHOUT photo | ✅ +50 pts | ❌ 0 pts |
| Custom visits | ❌ 0 pts | ❌ 0 pts |

---

## 🌍 **User Created Visits (v4.31)**

### Features
- **Up to 10 landmarks** per custom visit (with optional individual photos)
- **Up to 10 country photos** (general trip photos)
- **Max 20 total photos** per visit
- No points awarded for custom visits

### Entry Points
1. **Journey Page** → "Custom Visits" section → "Add Visit" button
2. **Explore Page** → "Can't find your destination?" link

### API Endpoints
- `POST /api/user-created-visits` - Create custom visit
- `GET /api/user-created-visits` - List user's custom visits
- `DELETE /api/user-created-visits/{id}` - Delete custom visit

### Data Structure (v4.31)
```json
{
  "country_name": "Monaco",
  "landmarks": [
    {"name": "Prince's Palace", "photo": "base64..."},
    {"name": "Monte Carlo Casino", "photo": null}
  ],
  "photos": ["base64..."],
  "diary_notes": "...",
  "visibility": "public|friends|private"
}
```

---

## 📸 **Photo Collection**

### Entry Point
- **Journey Page** → "My Photos" card

### Features
- **Stats Banner:** X Photos • X Countries • X Years
- **Filter Tabs:** All | By Country | By Year | By Type
- **Photo Grid:** 3-column Instagram-style layout
- **Fullscreen Viewer:** Tap photo to view, swipe between photos

### Data Sources
Photos aggregated from:
- `/api/visits` (landmark visit photos)
- `/api/country-visits` (country visit photos)  
- `/api/user-created-visits` (custom visit photos + landmark photos)

---

## 📱 **Navigation Structure**

### Bottom Tabs
```
├── Explore (continents.tsx) - Main entry, dynamic continent stats
├── My Journey (journey.tsx) - Stats, visits, photos
├── Social (social.tsx) - Activity feed
└── Profile (profile.tsx) - Settings
```

### Journey Page Sections
```
My Journey:
├── Your Stats (points, streak)
├── Overall Progress (X/520 landmarks)
├── Next Milestone
├── Recent Visits
├── My Country Visits → /my-country-visits
├── My Photos → /photo-collection
└── Custom Visits (with multi-landmark support)
```

---

## 📁 **Key Files**

### Frontend
```
/app/frontend/app/
├── continents.tsx           # Dynamic continent stats from API
├── photo-collection.tsx     # Photo gallery feature
├── (tabs)/journey.tsx       # Multi-landmark display support

/app/frontend/components/
├── AddUserCreatedVisitModal.tsx  # Multi-landmark + per-photo support
```

### Backend
```
/app/backend/server.py:
├── GET  /api/continent-stats        # NEW - Dynamic continent data
├── POST /api/user-created-visits    # Updated - Multi-landmark support
├── GET  /api/photos/collection      # Photo aggregation
```

---

## 🗑️ **Removed Code (v4.31)**

### Trip Planning Feature (Removed)
The following endpoints and models were removed as unused:
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/{trip_id}`
- `PUT /api/trips/{trip_id}`
- `DELETE /api/trips/{trip_id}`
- `POST /api/trips/{trip_id}/landmarks`
- `DELETE /api/trips/{trip_id}/landmarks/{id}`
- `PUT /api/trips/{trip_id}/landmarks/{id}/visited`
- `POST /api/trips/{trip_id}/complete-review`
- `POST /api/trips/{trip_id}/convert-to-visits`

Models removed: `Trip`, `TripCreate`, `TripUpdate`, `TripLandmark`, `TripLandmarkCreate`, `TripPlan`

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

## ✅ **v4.31 Verified Working**

- [x] Multi-landmark custom visits (up to 10 landmarks)
- [x] Per-landmark photos in custom visits
- [x] Dynamic continent stats endpoint
- [x] Continent cards fetch real-time data
- [x] Duplicate landmarks cleaned up (520 total)
- [x] Updated milestone system
- [x] Orphan visits fixed
- [x] Trip planning code removed
- [x] All existing features still working

---

## 🔴 **Known Issues**

1. **Google OAuth** - Broken (`403: disallowed_useragent`)
   - Workaround: Use email/password login
   - Fix: Requires Google Cloud OAuth credentials

---

## 📊 **Database Stats (v4.31)**

| Continent | Landmarks | Points | Countries |
|-----------|-----------|--------|-----------|
| Europe | 113 | 1,655 | 10 |
| Asia | 112 | 1,435 | 10 |
| Americas | 110 | 1,430 | 10 |
| Africa | 102 | 1,155 | 10 |
| Oceania | 83 | 905 | 8 |
| **TOTAL** | **520** | **6,580** | **48** |

---

## 🔒 **Privacy System**

| Icon | Color | Level | Who Can See |
|------|-------|-------|-------------|
| 🌐 | Green | Public | Everyone |
| 👥 | Blue | Friends | Only friends |
| 🔒 | Red | Private | Only you |

Applies to: Landmark visits, Country visits, Custom visits, Activity feed
