# WanderList - Essential Baseline (Streamlined for Pro Subscription)

> **Purpose:** Critical information that's hard to auto-summarize in forks
> **Read this:** At session start if forked, or when encountering issues

### 13. **Browser Cache on iPhone** ✅ PATTERN
**Issue:** "Safari cannot open page - server not found" error on iPhone despite services running
**Cause:** iPhone Safari caching old/broken version of the app
**Fix:** Clear Safari cache (Settings → Safari → Clear History and Website Data) OR use Private/Incognito mode
**Prevention:** During active development, use Private Browsing on iPhone for testing
**Test:** curl http://localhost:3000 shows HTML = server is working, it's just cache

### 14. **Analytics Layout Fix** ✅ FIXED (Session 12 - v4.21)
**Issue:** Travel Analytics stat cards rendered off-screen (numbers at x: 461-476px, outside 390px viewport)
**Fix:** Changed from calculated width `(width - theme.spacing.md * 3) / 2` to fixed percentage `width: '48%'`
**Result:** Stat cards now display within viewport, numbers visible
**Prevention:** Use percentage widths for flex grid layouts on mobile, not pixel calculations

---

## 📝 **v4.21 Features Added (Session 12)**

**Premium Features:**
- Travel Analytics Dashboard (stats, charts, insights)
- Custom Collections (organize landmarks with icons/colors)

**User Experience:**
- Photo Gallery Modal (full-screen viewer with swipe)
- Share to Social (4 share types)
- Quick Test Login (⚡ one-tap access)
- Enhanced Loading States (LoadingSpinner)

**Frameworks:**
- Offline support utilities (caching, sync)
- Community features (friend suggestions, trending)

---

## 📊 **Current State**

**Version:** 4.21.0 - STABLE ✅  
**Status:** Production Ready (100%) - Complete with Premium Features  
**Last Stable Build:** January 9, 2026 - Session 12  
**Next Version:** v4.22 or App Store Launch

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

## 🧪 **Automated Testing Pattern**

### **Quick Screenshot Testing:**
```bash
# Use mcp_screenshot_tool to verify features
# Template for testing new features:

await page.set_viewport_size({"width": 390, "height": 844})
await page.goto("URL")
await page.click('text=Quick Test Login')  # Auto-login
await asyncio.sleep(5)

# Navigate and capture
await page.click('text=Feature Name')
await page.screenshot(path="/tmp/feature_test.png", quality=20)
```

### **Common Test Patterns:**

**Screenshot-Based Error Detection (RECOMMENDED):**
```python
# Quick visual verification - catches UI bugs immediately
await page.set_viewport_size({"width": 390, "height": 844})
await page.goto("URL")
await page.click('text=Quick Test Login')
await asyncio.sleep(5)

# Navigate to feature
await page.click('text=Feature Name')
await asyncio.sleep(3)

# Capture screenshot
await page.screenshot(path="/tmp/feature_test.png", quality=20)
print("✅ Screenshot captured - review for visual issues")

# Pattern: Take screenshots of critical pages
# - Login page
# - Main tabs (My Journey, Explore, Social, Profile)
# - New features being developed
# - After major UI changes
# 
# Benefits: Immediate visual feedback, catches rendering bugs,
# documents UI state, helps debug styling issues
```

**Login Flow:**
```python
await page.locator('text=Quick Test Login').click()
await asyncio.sleep(5)  # Wait for redirect
```

**Navigation:**
```python
await page.click('text=Profile')
await page.evaluate("window.scrollTo(0, 400)")  # Scroll
await page.screenshot(path="/tmp/test.png", quality=20)
```

**Error Checking:**
```python
try:
    await page.click('text=Feature')
    print("✅ Feature accessible")
except:
    print("❌ Feature not found")
```

### **Testing Checklist for New Features:**
- [ ] Quick login works
- [ ] Feature accessible from menu
- [ ] Premium badge shows (💎) if premium
- [ ] Bottom tabs visible
- [ ] Content loads properly
- [ ] Back button works
- [ ] No crashes/errors

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
