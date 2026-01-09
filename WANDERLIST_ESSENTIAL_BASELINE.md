# WanderList - Essential Baseline (Streamlined for Pro Subscription)

> **Purpose:** Critical information that's hard to auto-summarize in forks
> **Read this:** At session start if forked, or when encountering issues

---

## 📊 **Current State**

**Version:** 4.19.0  
**Status:** Production Ready (100%)  
**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, 580 landmarks, test data populated  

**Test Account:**
- Email: `mobile@test.com` 
- Password: `test123`
- Tier: Premium (for testing all features)
- Quick Login: ⚡ button on login page

---

## 🚨 **CRITICAL BUG FIXES - DO NOT REINTRODUCE**

### **1. BACKEND_URL Configuration (CRITICAL)**
**Pattern:** ALWAYS import from centralized config
```typescript
// ❌ WRONG - Never do this
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// ✅ CORRECT - Always do this
import { BACKEND_URL } from '../utils/config';
```

**Why:** Remote URL access fails without centralized config  
**Files Fixed:** journey.tsx, social.tsx, continent/[continent].tsx, explore-countries.tsx  
**Location:** `/app/frontend/utils/config.ts`

---

### **2. Landmark Count Filter (DATA BUG)**
**Issue:** Countries API was excluding premium landmarks from count  
**Fix:** Remove `category: "official"` filter  
```python
# ✅ CORRECT in /api/countries endpoint
count = await db.landmarks.count_documents({"country_id": country["country_id"]})
# NOT: count_documents({"country_id": x, "category": "official"})
```
**Impact:** Africa showed 100 instead of 110 landmarks

---

### **3. Backend Visits Variable (CRASH BUG)**
**Issue:** `NameError: name 'visits' is not defined` in check_and_award_badges()  
**Fix:** Line ~2984 in server.py:
```python
# ✅ Must fetch visits list, not just count
visits = await db.visits.find({"user_id": user_id}).to_list(1000)
visit_count = len(visits)
```

---

### **4. Deployment Mode (INFRASTRUCTURE)**
**Issue:** Expo stuck in STARTING with ngrok tunnel conflicts  
**Fix:** `/etc/supervisor/conf.d/supervisord.conf`
```bash
# ✅ CORRECT for web deployment
command=yarn expo start --web --port 3000
# NOT: --tunnel (that's for mobile dev only)
```

---

### **5. Database Name (CONFIGURATION)**
**Critical:** Database is `test_database`, NOT `wanderlist`
```bash
# ✅ CORRECT
mongosh test_database

# ❌ WRONG
mongosh wanderlist  # This is empty!
```
**Check:** `grep DB_NAME /app/backend/.env`

---

## 🏗️ **Key Architecture Decisions**

### **Navigation Structure:**
- **4 Bottom Tabs:** My Journey, Explore, Social, Profile
- **Persistent Tab Bar:** Added to all major pages via PersistentTabBar component
- **Detail Pages:** Have back buttons + tabs

### **Image Storage:**
- **Base64 in MongoDB** for visit photos
- **URLs for landmark images** (Unsplash)

### **Subscription Tiers:**
- Free: 10 visits/month, 5 friends, friends leaderboard only
- Basic: Unlimited visits, 25 friends, messaging
- Premium: All Basic + premium landmarks + global leaderboard

---

## 🎨 **Design System**

**Primary Color:** Turquoise/Teal (#20B2AA)  
**Pattern:** Gradient headers on all major pages  
**Touch Targets:** Minimum 44x44px (iOS standard)  
**Spacing:** 8pt grid system  

---

## 📦 **Critical Utilities Created (Use These)**

**Performance:**
- `utils/performance.ts` - API caching, debounce, throttle
- `components/OptimizedImage.tsx` - Lazy loading images

**UX:**
- `utils/haptics.ts` - 6 types of haptic feedback
- `utils/toast.ts` - Toast notifications
- `components/PersistentTabBar.tsx` - Always-visible tabs
- `components/EnhancedEmptyState.tsx` - Beautiful empty states

**Quality:**
- `utils/errorMessages.ts` - User-friendly errors
- `utils/accessibility.ts` - A11y helpers
- `components/LoadingSpinner.tsx` - Loading states

---

## 🧪 **Testing Quick Reference**

**Services:**
```bash
sudo supervisorctl status
sudo supervisorctl restart expo
sudo supervisorctl restart backend
```

**Database:**
```bash
mongosh test_database  # Not "wanderlist"!
```

**API Test:**
```bash
curl http://localhost:8001/api/countries -H "Authorization: Bearer $TOKEN"
```

---

## 📝 **Content Updates (v4.19)**

**Enhanced:**
- 20 top landmarks with story-driven descriptions
- 15+ achievement badges with motivating copy
- Welcome/onboarding screen created
- Empty states made encouraging

---

## 🎯 **Next Steps After This Session**

1. **Final Testing** - Verify all features work
2. **App Store Prep** - Screenshots, description, privacy policy
3. **Launch** - TestFlight → Production

---

**This streamlined baseline captures what's hard to auto-summarize. Everything else will be handled by Emergent's intelligent fork system!**
