# WanderList - Essential Baseline (v4.26)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.26.0 - STABLE ✅  
**Status:** Major UI/UX Header Redesign Complete  
**Last Build:** January 14, 2026  
**Next Version:** v4.27 - Additional Features

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, 528 landmarks, test data populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (108 landmarks, 8 countries) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🎨 **v4.26 Design System (UPDATED)**

### "Ocean to Sand" Gradient (NEW)
- **Colors:** `#4DB8D8` → `#E8DCC8` (turquoise to warm sand)
- **Direction:** Horizontal (left to right)
- **Theme constant:** `gradients.oceanToSand`
- **Usage:** All headers across the app

### Universal Header (REDESIGNED)
- **Layout:** Single row - Title left, WanderList branding right
- **Branding:** 🌍 WanderList in dark text (#2A2A2A) for visibility
- **Profile Button:** REMOVED from all headers
- **Sticky:** All headers stick to top while scrolling
- **Height:** Consistent `minHeight: 32` on headerRow

### Continent Cards (REDESIGNED)
- **Height:** 140px (reduced from 200px)
- **Accent colors:** Europe (turquoise), Asia (orange), Africa (golden), Americas (green), Oceania (blue)
- **Layout:** Title/description top-left, points top-right, stats bottom-left, arrow bottom-right

### Color Palette
- Primary: `#4DB8D8` (Ocean turquoise)
- Secondary: `#E8DCC8` (Warm sand)
- Golden Stars: `#FFD700`
- Privacy Public: `#27ae60` (Green)
- Privacy Friends: `#3498db` (Blue)
- Privacy Private: `#e74c3c` (Red)

---

## 🔒 **Privacy System (v4.25)**

### Privacy Levels
| Icon | Color | Level | Who Can See |
|------|-------|-------|-------------|
| 🌐 | Green | Public | Everyone |
| 👥 | Blue | Friends | Only friends |
| 🔒 | Red | Private | Only you |

### Filtering Logic
| User Type | Public | Friends | Private |
|-----------|--------|---------|---------|
| Owner | ✅ | ✅ | ✅ |
| Friend | ✅ | ✅ | ❌ |
| Stranger | ❌ | ❌ | ❌ |

### Backend Endpoints
- `PUT /api/auth/privacy` - Update default privacy
- `GET /api/feed` - Privacy-filtered activity feed
- `POST /api/visits` - Includes visibility field

---

## 📱 **Key Pages & Features**

### Navigation Structure
```
Bottom Tabs:
├── Explore (continents.tsx) - Main entry
├── My Journey (journey.tsx) - Stats & progress
├── Social (social.tsx) - Activity feed
└── Profile (profile.tsx) - User settings
```

### Sub-Tab Navigation (Explore)
```
Explore | Bucket List
(My Trips REMOVED in v4.25)
```

### Features Removed in v4.25
- ❌ "My Trips" tab
- ❌ "My Collections" from Profile menu
- ❌ "Best Time" & "Duration" from landmark Quick Info
- ❌ Green progress bars on country cards
- ❌ Pink/purple from Leaderboard

---

## 🚨 **CRITICAL PATTERNS - DO NOT REINTRODUCE**

### 1. BACKEND_URL Configuration
```typescript
// ❌ WRONG - Never do this
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// ✅ CORRECT - Always do this
import { BACKEND_URL } from '../utils/config';
```

### 2. Header Colors
```typescript
// ❌ WRONG - Old style
colors={[theme.colors.primary, theme.colors.primaryDark]}

// ✅ CORRECT - v4.25 style
colors={['#3BB8C3', '#2AA8B3']}
```

### 3. Safari Cache Issues
**Issue:** "Safari cannot open page" despite services running
**Fix:** 
1. Close Safari tab completely
2. Settings → Safari → Clear History and Website Data
3. OR use Private/Incognito mode
**Prevention:** Use Private Browsing during development

---

## 📁 **Key Files**

### Frontend Structure
```
/app/frontend/app/
├── (tabs)/
│   ├── _layout.tsx      # Bottom tab navigation
│   ├── explore.tsx      # Redirects to continents
│   ├── journey.tsx      # My Journey page
│   ├── social.tsx       # Social Hub with privacy icons
│   └── profile.tsx      # Profile (My Collections removed)
├── continents.tsx       # Explore continents
├── explore-countries.tsx # Country cards with flags
├── bucket-list.tsx      # Bucket list
├── settings.tsx         # Privacy settings with legend
├── leaderboard.tsx      # Redesigned (turquoise)
├── landmarks/[country_id].tsx
├── landmark-detail/[landmark_id].tsx
└── country-visit-detail/[country_visit_id].tsx (NEW)
```

### Backend
```
/app/backend/server.py   # All API endpoints
```

### Styles
```
/app/frontend/styles/theme.ts
- Added: accentYellow: '#FFD700'
```

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

# Test backend
curl http://localhost:8001/api/countries
```

---

## ✅ **v4.25 Verified Working**

- [x] Universal turquoise headers (21+ pages)
- [x] WanderList branding links to About
- [x] Golden stars throughout app
- [x] Privacy icons on activity feed
- [x] Privacy settings with legend
- [x] Privacy filtering (owner/friend/stranger)
- [x] Bottom tab bar text visible (no cut-off)
- [x] Navigation flow complete
- [x] Leaderboard redesigned (no pink)
- [x] Profile simplified (no My Collections)
- [x] Landmark Quick Info (only Difficulty)

---

## 🐛 **Known Issues**

1. **Google OAuth** - Returns 403 error (use email/password instead)
2. **Country Visits Feature** - Backend ready, frontend modal exists but needs full integration
3. **Session Continuity** - New agents may see blank project (read this file first!)

---

## 📋 **For Next Session**

If starting a new session:
1. Run `ls -F /app/` to verify project exists
2. Read this file: `/app/WANDERLIST_ESSENTIAL_BASELINE.md`
3. Check services: `sudo supervisorctl status`
4. Test login: `mobile@test.com` / `test123`

**Preview URL:** https://wanderlist-headers.preview.emergentagent.com

---

*Last updated: January 13, 2026 - v4.25 Complete*
