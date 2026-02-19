# WanderList - Screenshot Guide

> **Purpose:** Instructions for capturing App Store screenshots
> **Last Updated:** January 20, 2026

---

## 📱 **Required Screenshot Sizes**

### iOS App Store
| Device | Resolution | Notes |
|--------|------------|-------|
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 px | Required |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 px | Required |
| iPhone 5.5" (8 Plus) | 1242 × 2208 px | Optional |
| iPad Pro 12.9" | 2048 × 2732 px | If supporting iPad |

### Google Play Store
| Device | Resolution | Notes |
|--------|------------|-------|
| Phone | 1080 × 1920 px (min) | Required |
| 7" Tablet | 1200 × 1920 px | Optional |
| 10" Tablet | 1800 × 2560 px | Optional |

---

## 📸 **10 Recommended Screenshots**

Based on App Store best practices, capture these screens in order:

### Screenshot 1: Welcome/Login
- **Screen:** `/` (Login page)
- **Shows:** Branded globe icon, "Welcome to WanderList" title
- **Caption:** "Track Your World Adventures"

### Screenshot 2: Explore Continents
- **Screen:** `/(tabs)/explore` (after login)
- **Shows:** 5 continent cards with stats
- **Caption:** "5 Continents to Explore"

### Screenshot 3: Countries Grid
- **Screen:** `/explore-countries?continent=europe`
- **Shows:** Country cards with flags and point values
- **Caption:** "48 Countries Await"

### Screenshot 4: Landmarks List
- **Screen:** `/landmarks/france`
- **Shows:** Landmark list with visit status
- **Caption:** "560+ Iconic Landmarks"

### Screenshot 5: My Journey Stats
- **Screen:** `/(tabs)/journey`
- **Shows:** Stats grid, progress circle, milestone
- **Caption:** "Track Your Progress"

### Screenshot 6: Social Hub
- **Screen:** `/(tabs)/social`
- **Shows:** Activity feed with visits
- **Caption:** "Connect with Travelers"

### Screenshot 7: Profile
- **Screen:** `/(tabs)/profile`
- **Shows:** User stats, rank badge, menu items
- **Caption:** "Your Travel Profile"

### Screenshot 8: WanderList Pro
- **Screen:** `/subscription`
- **Shows:** Free vs Pro comparison
- **Caption:** "Unlock Premium Features"

### Screenshot 9: Leaderboard
- **Screen:** `/leaderboard`
- **Shows:** Time filters, category filters, rankings
- **Caption:** "Compete Globally"

### Screenshot 10: Bucket List
- **Screen:** Bucket List tab on explore page
- **Shows:** Saved landmarks for future trips
- **Caption:** "Plan Your Adventures"

---

## 🎨 **Screenshot Best Practices**

### Do's ✅
- Use real data (logged in user with visits)
- Show the app in "populated" state
- Highlight key features
- Use consistent device frames
- Add marketing text overlays (optional)

### Don'ts ❌
- Don't show empty states (unless intentional)
- Don't show test credentials
- Don't include status bar unless required
- Don't use low-quality images

---

## 🖼️ **Adding Marketing Overlays**

Consider adding text overlays to screenshots:

### Design Guidelines
- **Font:** SF Pro Display (iOS) or Roboto (Android)
- **Size:** 48-72px for headlines
- **Color:** Match app theme (#4DB8D8 turquoise, #2A2A2A text)
- **Position:** Top or bottom third of screen
- **Background:** Optional semi-transparent overlay

### Example Captions
| Screenshot | Caption |
|------------|---------|
| Welcome | "Your Travel Companion" |
| Continents | "Explore 5 Continents" |
| Countries | "48 Countries • 560 Landmarks" |
| Landmarks | "Discover & Conquer" |
| Journey | "Track Every Adventure" |
| Social | "Share the Journey" |
| Profile | "Earn Badges & Ranks" |
| Pro | "Go Pro. Go Further." |

---

## 🛠️ **How to Capture High-Quality Screenshots**

### Option 1: Using Expo on Physical Device
1. Run the app on iPhone/Android
2. Use device screenshot (Power + Volume)
3. Export full resolution images

### Option 2: Using Simulator/Emulator
1. **iOS Simulator:**
   ```bash
   xcrun simctl io booted screenshot screenshot.png
   ```

2. **Android Emulator:**
   ```bash
   adb exec-out screencap -p > screenshot.png
   ```

### Option 3: Using Expo Web Preview
1. Open Chrome DevTools
2. Toggle Device Mode (Cmd+Shift+M)
3. Select device preset
4. Take screenshot (Cmd+Shift+P → "Capture screenshot")

---

## 📦 **Final Export Checklist**

Before submitting to stores:

- [ ] All screenshots are high resolution (no compression)
- [ ] Screenshots show app in logged-in state
- [ ] No test data visible (use real-looking demo data)
- [ ] All text is readable
- [ ] Screenshots tell a story (feature progression)
- [ ] Device frames added (optional but recommended)
- [ ] Marketing text is concise and compelling
- [ ] Screenshots match current app version

---

## 🎬 **App Preview Video (Optional)**

### iOS App Store
- **Duration:** 15-30 seconds
- **Resolution:** Same as screenshot sizes
- **Format:** H.264, .mov or .mp4

### Google Play Store
- **Duration:** 30 seconds - 2 minutes
- **Resolution:** 1080p recommended
- **Format:** YouTube link

### Suggested Video Flow
1. App icon → Splash screen (2s)
2. Login/Welcome (3s)
3. Explore continents (3s)
4. Drill into country → landmarks (5s)
5. Mark landmark as visited (5s)
6. View progress/stats (3s)
7. Social features (3s)
8. End card with download CTA (3s)

---

## 📁 **File Naming Convention**

Use this naming format for organization:

```
wanderlist_[platform]_[device]_[number]_[scene].png

Examples:
wanderlist_ios_6.7_01_welcome.png
wanderlist_ios_6.7_02_continents.png
wanderlist_android_phone_01_welcome.png
```

---

*Screenshots captured during development are available in the app preview. For App Store submission, recapture at full resolution using the methods above.*
