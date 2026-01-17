# WanderList - Essential Baseline (v4.30)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.30.0 - STABLE ✅  
**Status:** Dual Points System, Custom Visits, Photo Collection Complete  
**Last Build:** January 17, 2026  
**Next Version:** v4.31 - Future Features

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, 528 landmarks, test data populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (108 landmarks, 8 countries) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🎨 **v4.30 Design System**

### "Ocean to Sand" Gradient (STANDARD)
- **Colors:** `#26C6DA` → `#00BFA5` → `#FFE082` (cyan to teal to warm sand)
- **Direction:** Horizontal (left to right)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** ALL headers across the app (mandatory)

### Universal Header (STANDARD)
- **Layout:** Single row - Close/Back left, Title center-left, WanderList branding right
- **Branding:** 🌍 WanderList in dark text (#2A2A2A)
- **Sticky:** All headers stick to top while scrolling
- **Height:** Consistent across all pages
- **Component:** `UniversalHeader.tsx` for sub-pages

### Continent Cards
- **Height:** 140px
- **Text Background:** Semi-transparent accent color overlay (40% opacity) for better text visibility
- **Europe Image:** Welsh castle with ocean (updated in v4.30)
- **Accent colors:** Europe (turquoise), Asia (orange), Africa (golden), Americas (green), Oceania (blue)

### Color Palette
- Primary: `#00BFA5` (Teal)
- Secondary: `#26C6DA` (Cyan)
- Accent: `#E8DCC8` (Warm sand)
- Golden Stars: `#FFD700`
- Success/Visited: `#4CAF50` (Green)

---

## 💰 **Dual Points System (NEW v4.30)**

### Two Point Types
| Point Type | Description | When Awarded |
|------------|-------------|--------------|
| `points` | Personal/total points | Always (all visits) |
| `leaderboard_points` | Public leaderboard | Only with photos |

### Points Logic
| Action | Personal Points | Leaderboard Points |
|--------|----------------|-------------------|
| Landmark visit WITH photo | ✅ +10 pts | ✅ +10 pts |
| Landmark visit WITHOUT photo | ✅ +10 pts | ❌ 0 pts |
| Country visit WITH photo | ✅ +50 pts | ✅ +50 pts |
| Country visit WITHOUT photo | ✅ +50 pts | ❌ 0 pts |
| Custom visits | ❌ 0 pts | ❌ 0 pts |

### Key Behaviors
- Photos are **OPTIONAL** for all visits
- Confirmation dialog shown when submitting without photos
- Leaderboard uses `leaderboard_points` for rankings
- User stats show both point values

---

## 🌍 **User Created Visits (NEW v4.30)**

### Purpose
Allow users to record visits to countries/landmarks NOT in the database.

### Entry Points
1. **Journey Page** → "Custom Visits" section → "Add Visit" button
2. **Explore Page** → "Can't find your destination?" link at bottom

### API Endpoints
- `POST /api/user-created-visits` - Create custom visit
- `GET /api/user-created-visits` - List user's custom visits
- `DELETE /api/user-created-visits/{id}` - Delete custom visit

### Data Structure
```json
{
  "country_name": "Monaco",           // Required
  "landmark_name": "Prince's Palace", // Optional
  "photos": [],                       // Optional
  "diary_notes": "...",               // Optional
  "visibility": "public|friends|private"
}
```

### Key Behaviors
- **NO POINTS** awarded for custom visits
- Appears in Activity Feed (respects privacy)
- Country required, landmark optional
- Photos optional

---

## 📸 **Photo Collection (NEW v4.30)**

### Purpose
Aggregate all user photos into one reminiscence-friendly page.

### Entry Point
- **Journey Page** → "My Photos" card

### API Endpoint
- `GET /api/photos/collection` - Returns all photos with metadata

### Features
- **Stats Banner:** X Photos • X Countries • X Years
- **Filter Tabs:** All | By Country | By Year | By Type
- **Photo Grid:** 3-column Instagram-style layout
- **Fullscreen Viewer:** Tap photo to view, swipe between photos
- **Type Indicators:** Colored badges (landmark/country/custom)
- **"View Visit" Button:** Navigate to original visit

### Data Sources
Photos aggregated from:
- `/api/visits` (landmark visit photos)
- `/api/country-visits` (country visit photos)  
- `/api/user-created-visits` (custom visit photos)

---

## 🔒 **Privacy System**

### Privacy Levels
| Icon | Color | Level | Who Can See |
|------|-------|-------|-------------|
| 🌐 | Green | Public | Everyone |
| 👥 | Blue | Friends | Only friends |
| 🔒 | Red | Private | Only you |

### Applies To
- Landmark visits
- Country visits
- Custom visits
- Activity feed items

---

## 📱 **Navigation Structure (v4.30)**

### Bottom Tabs
```
├── Explore (continents.tsx) - Main entry
├── My Journey (journey.tsx) - Stats, visits, photos
├── Social (social.tsx) - Activity feed
└── Profile (profile.tsx) - Settings
```

### Journey Page Sections
```
My Journey:
├── Your Stats (points, streak)
├── Overall Progress
├── Next Milestone
├── Recent Visits
├── My Country Visits → /my-country-visits
├── My Photos → /photo-collection (NEW)
└── Custom Visits (with Add Visit button) (NEW)
```

### Explore Page
```
Explore:
├── Continent Cards
└── "Can't find your destination?" → Custom Visit Modal (NEW)
```

### Profile Page (Simplified)
```
Profile:
├── About WanderList
├── Settings
└── Logout
```
Note: "My Country Visits" moved to Journey page in v4.30

---

## 📁 **Key Files (v4.30)**

### Frontend - New/Modified
```
/app/frontend/app/
├── photo-collection.tsx          # NEW - Photo gallery
├── continents.tsx                # MODIFIED - "Can't find" link + modal
├── (tabs)/journey.tsx            # MODIFIED - My Photos, Custom Visits sections
├── (tabs)/profile.tsx            # MODIFIED - Removed My Country Visits
├── country-visit-detail/[country_visit_id].tsx  # MODIFIED - Removed redundant share icon

/app/frontend/components/
├── AddUserCreatedVisitModal.tsx  # NEW - Custom visit modal
├── AddCountryVisitModal.tsx      # MODIFIED - Photos optional
├── AddVisitModal.tsx             # MODIFIED - Photos optional
```

### Backend - New Endpoints
```
/app/backend/server.py:
├── GET  /api/photos/collection           # NEW - Photo aggregation
├── POST /api/user-created-visits         # NEW - Create custom visit
├── GET  /api/user-created-visits         # NEW - List custom visits
├── DELETE /api/user-created-visits/{id}  # NEW - Delete custom visit
├── GET  /api/country-visits/check/{id}   # NEW - Check visit status
```

### Backend - Modified Endpoints
```
├── POST /api/visits          # MODIFIED - Dual points, photos optional
├── POST /api/country-visits  # MODIFIED - Dual points, photos optional
├── GET  /api/leaderboard     # MODIFIED - Uses leaderboard_points
├── GET  /api/stats           # MODIFIED - Returns both point types
```

---

## 🚨 **CRITICAL PATTERNS**

### 1. BACKEND_URL Configuration
```typescript
// ✅ CORRECT - Always import from config
import { BACKEND_URL } from '../utils/config';
```

### 2. Header Design
```typescript
// ✅ CORRECT - Ocean to Sand gradient
colors={gradients.oceanToSand}
// or
colors={['#26C6DA', '#00BFA5', '#FFE082']}
```

### 3. Modal Design Pattern
All modals must follow this structure:
- Ocean to Sand gradient header
- Close (X) button left
- Title and subtitle
- WanderList branding right
- Form sections with consistent styling
- Gradient submit button

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

## ✅ **v4.30 Verified Working**

- [x] Dual points system (personal vs leaderboard)
- [x] Photos optional for all visits
- [x] User created visits (custom visits)
- [x] Photo collection page with filters
- [x] "Can't find your destination?" on Explore
- [x] My Photos entry on Journey page
- [x] Custom Visits section on Journey page
- [x] Europe card background updated (Welsh castle)
- [x] Continent card text visibility improved
- [x] Redundant share icon removed from country visit detail
- [x] My Country Visits moved from Profile to Journey
- [x] All headers use Ocean to Sand gradient
- [x] Consistent modal designs

---

## 🔴 **Known Issues**

1. **Google OAuth** - Broken (`403: disallowed_useragent`)
   - Workaround: Use email/password login
   - Fix requires: User's Google Cloud credentials

---

## 📋 **Future Considerations**

- Subscription Center UI
- User Travel Preferences
- In-app Support & Help section
- Google OAuth fix (needs credentials)
