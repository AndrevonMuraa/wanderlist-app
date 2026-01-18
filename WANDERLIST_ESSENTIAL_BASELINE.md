# WanderList - Essential Baseline (v4.40)

> **Purpose:** Critical information for session continuity
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.40.0 - STABLE ✅  
**Status:** WanderList Pro Subscription Model Implemented  
**Last Build:** January 18, 2026  
**Next Phase:** User Testing & Polish

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, **520 landmarks** (428 official + 92 premium), test data populated  

**Test Accounts:**
| Email | Password | Role |
|-------|----------|------|
| `mobile@test.com` | `test123` | Main user (Free tier, can toggle to Pro) |
| `friend@test.com` | `test123` | Friend user |
| `stranger@test.com` | `test123` | Test user |

---

## 🆕 **v4.40 Changes (Latest)**

### WanderList Pro Subscription Model
Complete freemium model implementation with backend enforcement and frontend UI:

**Tiers:**
| Feature | Free | Pro ($3.99/mo or $29.99/yr) |
|---------|------|------------------------------|
| Official Landmarks (428) | ✅ | ✅ |
| Premium Landmarks (92) | 🔒 Locked | ✅ Unlocked |
| Custom Visits | 🔒 Locked | ✅ Unlimited |
| Photos per Visit | 1 | 10 |
| Friends | 5 max | Unlimited |

**Backend Endpoints:**
- `GET /api/subscription/status` - Get current tier and limits
- `POST /api/subscription/test-toggle` - Toggle between free/pro (dev only)
- `POST /api/subscription/cancel` - Downgrade to free

**Frontend UI:**
- `/subscription` - Beautiful subscription page with feature comparison
- Pro feature lock modal with upgrade CTA
- Photo limit enforcement in visit modals
- Friend limit display and warnings
- Premium landmarks show purple lock icon

### Premium Visual Identity (Purple Theme)
All premium elements now use consistent purple (#764ba2):
- Premium landmark diamond icons
- PREMIUM badges on landmark cards
- Pro feature lock modals
- Upgrade hints and CTAs

### Friends Leaderboard Toggle
- Enhanced Global/Friends segmented control
- Gold gradient for Friends selection
- Proper "No friends on leaderboard" empty state

### Activity Feed Page
- New `/feed` route (was causing "Unmatched Route" error)
- Full activity history with pagination
- Like functionality
- Support for all activity types including `user_created_visit`

### UI Redesigns
**Settings Page:**
- Light theme with white cards
- Colored section icons
- Privacy options with selection state
- Clean toggle switches

**Friends Page:**
- Gradient header
- White card design
- Clean email input with icons
- Friend limit badge (4/5 format)
- Premium badge for pro users

### Bug Fixes
- Fixed Social page leaderboard showing "No rankings yet"
- Fixed Activity Feed "Full list" navigation error
- Changed "My Country Visits" icon from camera to flag

### Removed
- "Premium Features" section from explore-countries footer

---

## 💎 **Subscription System**

### User Model Fields
```python
subscription_tier: str = "free"  # "free" or "pro"
subscription_expires_at: Optional[datetime] = None
```

### Subscription Status Response
```json
{
  "subscription_tier": "free",
  "is_pro": false,
  "expires_at": null,
  "limits": {
    "max_friends": 5,
    "photos_per_visit": 1,
    "can_access_premium_landmarks": false,
    "can_create_custom_visits": false
  },
  "usage": {
    "friends_count": 4,
    "friends_limit": 5,
    "friends_remaining": 1
  }
}
```

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

## 📱 **Navigation Structure**

### Bottom Tabs
```
├── Explore (continents.tsx) - Dynamic continent stats
├── My Journey (journey.tsx) - Stats, visits, photos
├── Social (social.tsx) - Activity feed, leaderboard
└── Profile (profile.tsx) - Settings, subscription
```

### Key Routes
```
/subscription      - WanderList Pro subscription page
/feed              - Full activity feed
/about             - Help & Support (FAQ, Contact)
/settings          - App settings (redesigned)
/friends           - Friend management (redesigned)
/notifications     - User notifications
/leaderboard       - Global/Friends rankings
/achievements      - Badges earned
/photo-collection  - Photo gallery
/my-country-visits - Country visit list
/edit-profile      - Profile editor
```

---

## 📁 **Key Files**

### Subscription System
```
/app/frontend/hooks/useSubscription.ts       # Subscription hook
/app/frontend/components/ProFeatureLock.tsx  # Upgrade modal
/app/frontend/app/subscription.tsx           # Subscription page
/app/backend/server.py                       # Subscription endpoints
```

### Redesigned Pages
```
/app/frontend/app/settings.tsx   # Light theme settings
/app/frontend/app/friends.tsx    # Light theme friends
/app/frontend/app/feed.tsx       # Activity feed (new)
```

### Premium UI
```
/app/frontend/app/landmarks/[country_id].tsx    # Purple premium icons
/app/frontend/app/landmark-detail/[landmark_id].tsx
/app/frontend/app/bucket-list.tsx
/app/frontend/app/landmark-search.tsx
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

**Landmark Types:**
- Official: 428 (accessible to all)
- Premium: 92 (Pro subscribers only)

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

# Toggle subscription (for testing)
curl -X POST http://localhost:8001/api/subscription/test-toggle \
  -H "Authorization: Bearer <token>"
```

---

## ✅ **Verified Working (v4.40)**

- [x] WanderList Pro subscription backend
- [x] Subscription page UI
- [x] Pro feature lock modals
- [x] Photo upload limits (1 for free, 10 for pro)
- [x] Friend limits (5 for free, unlimited for pro)
- [x] Premium landmarks locked for free users
- [x] Custom visits locked for free users
- [x] Purple premium visual identity
- [x] Friends leaderboard toggle
- [x] Activity feed page
- [x] Settings page (light theme)
- [x] Friends page (light theme)
- [x] Social leaderboard data fix
- [x] Flag icon for country visits

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

### Immediate (P0)
- User testing of subscription flow
- Verify all Pro restrictions work correctly
- Test photo limits in visit modals

### Future Features (Backlog)
- Payment integration (Stripe/Apple Pay)
- User travel preferences
- Enhanced social features
- Offline mode
- Push notifications

---

## 📝 **Session Summary (v4.40)**

### Completed This Session:
1. ✅ WanderList Pro subscription model (backend + frontend)
2. ✅ Pro feature lock modals with upgrade CTA
3. ✅ Photo upload limits enforcement
4. ✅ Friend limits with warning badges
5. ✅ Purple premium visual identity
6. ✅ Friends leaderboard toggle
7. ✅ Activity feed page (/feed)
8. ✅ Settings page redesign (light theme)
9. ✅ Friends page redesign (light theme)
10. ✅ Social leaderboard data fix
11. ✅ Country visits flag icon
12. ✅ Removed premium features section

### Testing Notes:
- Use `/api/subscription/test-toggle` to switch between free/pro
- Test user: `mobile@test.com` / `test123`
- Current tier shown on Profile page and Subscription page
