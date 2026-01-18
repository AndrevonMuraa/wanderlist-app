# WanderList - Essential Baseline (v4.50)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.50.0 - STABLE ✅  
**Status:** Production Ready with WanderList Pro Subscription  
**Last Build:** January 18, 2026  
**Next Phase:** User Testing & Deployment

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **492 landmarks** (389 official + 103 premium), Oceania fully populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.50 Changes (Latest)**

### Database Cleanup & Fixes
- **Duplicate landmarks removed** - All 52+ duplicate entries cleaned up
- **Uluru/Ayers Rock** - Now single entry (no more duplicates)
- **Oceania fully populated** - All 8 countries now have landmarks:
  - Australia: 12 landmarks
  - New Zealand: 10 landmarks
  - Fiji: 5 landmarks
  - French Polynesia: 5 landmarks
  - Cook Islands: 3 landmarks
  - Samoa: 3 landmarks
  - Vanuatu: 3 landmarks
  - Tonga: 3 landmarks

### Premium Landmarks Sorting
- **Official landmarks always appear first** in all listing views
- **Premium landmarks appear at the bottom** after official ones
- Sorting maintained across all sort options (name, points, upvotes)

### Settings Page Cleanup
- **Removed Email Notifications** - Only Push Notifications toggle remains
- **Removed Language Selector** - App only has one language (English)
- **Header fixed** - Now matches standard app header style with branding

### Profile Page Cleanup
- **Removed "Your Plan Limits"** section completely
- Cleaner profile view without redundant upgrade prompts
- 12 unused style definitions removed (~70 lines of code)

### Header Standardization
All pages now have consistent headers with:
- **Circular back button** with light background (`rgba(255,255,255,0.2)`)
- **Page title** next to back button
- **Earth icon + "WanderList" branding** on right side (links to About page)

Pages updated for consistent headers:
- Settings, Friends, Notifications, Explore Countries
- Landmarks, About, Subscription, Feed
- All message and detail pages

### Landmark Detail Page
- **Removed "Quick Info" (difficulty)** feature completely
- Cleaner landmark detail view
- Removed unused helper functions and styles

### Code Cleanup
- Removed duplicate style definitions across multiple files:
  - bucket-list.tsx
  - notifications.tsx
  - explore-countries.tsx
  - profile.tsx
- Fixed syntax errors from corrupted edits
- Balanced brace structures in StyleSheet definitions

---

## 💎 **Subscription System**

### Tiers
| Feature | Free | Pro ($3.99/mo or $29.99/yr) |
|---------|------|------------------------------|
| Official Landmarks (389) | ✅ | ✅ |
| Premium Landmarks (103) | 🔒 Locked | ✅ Unlocked |
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

---

## 🏆 **Milestone System (492 landmarks)**

| Landmarks | % | Badge Name | Icon |
|-----------|---|------------|------|
| 10 | 2.0% | Explorer | 🗺️ |
| 25 | 5.1% | Adventurer | 🧗 |
| 50 | 10.2% | Globetrotter | 🌍 |
| 100 | 20.3% | World Traveler | ✈️ |
| 200 | 40.7% | Seasoned Traveler | 🧭 |
| 350 | 71.1% | Legend | 🏆 |
| 480 | 97.6% | Ultimate Explorer | 👑 |

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
python3 seed_data.py              # Base countries/landmarks
python3 seed_data_expansion.py    # Expanded content (48 countries)
# Premium landmarks are in premium_landmarks.py - auto-seeded
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
| `/app/frontend/hooks/useSubscription.ts` | Subscription state management |
| `/app/frontend/components/ProFeatureLock.tsx` | Upgrade prompt modal |
| `/app/frontend/components/UniversalHeader.tsx` | Reusable page header |
| `/app/frontend/utils/theme.ts` | Design system constants |
| `/app/frontend/utils/config.ts` | API configuration |

### Backend
| File | Purpose |
|------|---------|
| `/app/backend/server.py` | Main FastAPI application |
| `/app/backend/premium_landmarks.py` | Premium landmark definitions |
| `/app/backend/seed_data_expansion.py` | Database seeding script |

---

## ✅ **Session Checklist for New Fork**

1. [ ] Run `sudo supervisorctl status` - Verify services running
2. [ ] Check database has data: `curl http://localhost:8001/api/countries` (after login)
3. [ ] If database empty, run seed scripts
4. [ ] Test login with `mobile@test.com` / `test123`
5. [ ] Verify all 5 tabs load correctly
6. [ ] Check Settings page loads (was recently fixed)
7. [ ] Check Profile page loads (was recently fixed)

---

## 📝 **Version History**

| Version | Date | Changes |
|---------|------|---------|
| 4.50 | Jan 18, 2026 | Duplicate cleanup, header standardization, settings/profile cleanup, Oceania landmarks |
| 4.40 | Jan 18, 2026 | WanderList Pro subscription, premium landmarks, UI redesigns |
| 4.30 | Jan 17, 2026 | Activity feed, friends leaderboard, bug fixes |
| 4.20 | Jan 16, 2026 | Points system, milestone badges |
| 4.10 | Jan 15, 2026 | Country visits, photo uploads |
| 4.00 | Jan 14, 2026 | Initial stable release |

---

*Last Updated: January 18, 2026*
