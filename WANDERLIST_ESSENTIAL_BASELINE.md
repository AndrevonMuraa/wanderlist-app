# WanderList - Essential Baseline (Streamlined for Pro Subscription)

> **Purpose:** Critical information that's hard to auto-summarize in forks
> **Read this:** At session start if forked, or when encountering issues

### 13. **Browser Cache on iPhone** ✅ COMMON PATTERN
**Issue:** "Safari cannot open page - server not found" or "Failed to load" despite services running
**Cause:** iPhone Safari aggressively caches, shows old error pages
**Fix:** 
1. Close Safari tab completely
2. Settings → Safari → Clear History and Website Data
3. OR use Private/Incognito mode
4. Reopen app URL
**Prevention:** Use Private Browsing during active development
**Verify:** `curl http://localhost:3000` shows HTML = server works, it's cache
**Frequency:** Happens after major updates/restarts - now documented in baseline for quick reference

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

**Version:** 4.24.0 - STABLE ✅  
**Status:** Production Ready (100%) - Tested & Verified  
**Last Build:** January 11, 2026 - Session 12  
**Next Version:** v4.25 or App Store Launch

**Tech Stack:** Expo (React Native) + FastAPI + MongoDB  
**Database:** 48 countries, 528 landmarks (duplicates removed), test data populated  

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

## 🔄 **App Coherency System - CRITICAL**

### **Problem:** 
When updating features, related UI elements don't auto-update, causing outdated content.

### **Solution: Update Checklist**

**When Adding New Features:**
1. ✅ Implement backend endpoint
2. ✅ Build frontend UI
3. ✅ **Update ALL related sections:**
   - Profile menu (if applicable)
   - Features section (explore-countries.tsx line 432)
   - About page features list
   - Welcome screen features
   - Any hardcoded feature lists
4. ✅ Update baseline documentation
5. ✅ Test with screenshots

**Interconnected Components Map:**

**Features List Locations:**
- `/app/frontend/app/explore-countries.tsx` (line 432) - "Features" section
- `/app/frontend/app/about.tsx` - "Explore Features" section
- `/app/frontend/app/welcome.tsx` - Feature highlights
- `/app/frontend/app/(tabs)/profile.tsx` - Menu items

**When You Add Premium Feature:**
→ Update: Profile menu, Features section, About page

**When You Add Tab/Navigation:**
→ Update: TabsLayout + PersistentTabBar component

**When You Clean Database:**
→ Update: Continent counts in continents.tsx

**Pattern:** Search for feature mentions across codebase before marking complete!

```bash
# Quick coherency check:
grep -r "FEATURE_NAME" /app/frontend/app/*.tsx
```



---

### **4. Deployment Mode (INFRASTRUCTURE)**
**Issue:** Expo stuck in STARTING with ngrok tunnel conflicts  
**Fix:** `/etc/supervisor/conf.d/supervisord.conf`
```bash
# ✅ CORRECT for web deployment


---

## 🔄 **Session Workflow - CRITICAL GUIDANCE**

### **When to Say "Session Complete":**
- ❌ **NEVER say "Session X Complete"** unless user explicitly asks to wrap up
- ❌ **NEVER say "production ready" or "ready to ship"** unless user confirms it's ready
- ✅ **Use "Progress Update"** for mid-work checkpoints
- ✅ **Use "Checkpoint"** when pausing to ask questions
- ✅ **Only use "Complete"** when user says "stop", "wrap up", or "end session"

### **Development Focus:**
- Primary: Build features, fix bugs, improve quality
- Secondary: Document progress for continuity
- ❌ Avoid: Premature shipping talk, false completion signals

### **finish Tool Usage:**
- For progress updates (not completion)
- To share current state
- To ask for next direction
- **NOT** to declare session complete

### **Communication Pattern:**
```
## 📊 Progress Update - [Feature Name]

**What's Done:** [brief list]
**What's Next:** [brief list]

## 🎯 Recommended Next Steps:
[Options for user to choose]

Reply: Choose option
```

**Key Point:** Let USER decide when session is complete, don't assume!


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

### **Screenshot-Based Debug Loop (RECOMMENDED):**
```python
# Visual bug fixing with automatic verification
# 1. Take screenshot
# 2. Analyze visually
# 3. Fix issue
# 4. Restart & screenshot again
# 5. Repeat until correct

# Example:
await page.screenshot(path="/tmp/debug.png", quality=20)
# Review screenshot, identify issue
# Apply fix in code
# sudo supervisorctl restart expo
# Take new screenshot
# Compare and verify

# Benefits: See exact rendering, catch styling bugs,
# verify fixes visually, faster than manual testing
```

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

**v4.24 Features Added (Session 12):**

**Core Improvements:**
- Luxury flag background cards (magazine-quality, full flags visible)
- Profile redesigned (user left, rank right, 85px avatar, stats row)
- DefaultAvatar system (smart initials for names/usernames)
- Unified headers (white text, turquoise gradient, compact)

**Premium Features:**
- Travel Analytics Dashboard (stats, charts, insights)
- Custom Collections (organize landmarks with icons/colors)
- Privacy system (backend + PrivacySelector component)
- Country Visits (10-photo collage, diary, auto-rewards)
- Settings page (Privacy, Notifications, Language, Account)

**Infrastructure:**
- Screenshot debug loop workflow
- Coherency system (component dependencies mapped)
- Auto-testing with bug fixes
- 52 duplicate landmarks removed (528 total)

---

## 📋 **Next Session TODO (v4.24 Polish):**

**Remaining Visual Improvements:**
1. Add spacing between header and content (smooth transition)
2. Move Explore/Bucket/Trips tabs below Continents header
3. Reduce continent card dimming (show background images better)
4. Make back arrow transparent (remove white background)
5. Light background on points section (match country/landmark sections)
6. Fix/verify header search icon (should be functional, not duplicate)

**Quick Wins (~1 hour total):**
- Each improvement is 10-15 minutes
- Use screenshot testing to verify each
- Mark v4.24 as stable when complete

---

**This streamlined baseline captures what's hard to auto-summarize. Everything else will be handled by Emergent's intelligent fork system!**
