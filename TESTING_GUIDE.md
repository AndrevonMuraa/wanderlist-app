# Testing Guide - WanderList App

## 🚨 Important: Authentication Required

All app features require authentication. You must log in before you can see any content.

## Testing on iPhone Web Browser

### Step 1: Access the App
Open Safari or Chrome on your iPhone and navigate to the app URL.

### Step 2: Create an Account or Log In

**Option A: Create New Account (Recommended for testing)**
1. Click "Don't have an account? Sign up"
2. Fill in the registration form:
   - **Username**: Choose a unique username (e.g., `testuser123`)
   - **Name**: Your display name (e.g., `Test User`)
   - **Email**: test email (e.g., `test123@example.com`)
   - **Password**: Any password (e.g., `Test123!`)
3. Click "Sign up"
4. You'll be automatically logged in

**Option B: Use Existing Test Account**
If a test account already exists:
- **Email**: `premium@test.com`
- **Password**: `Test123!`

### Step 3: Test Premium Features

Once logged in, you should see:

1. **Explore Page**
   - List of countries with landmark counts
   - Search functionality

2. **Navigate to Norway** (or any country)
   - Click on a country card
   - You should see the **Premium Banner** at the top:
     - "5 Premium Landmarks Available"
     - "Earn up to 125 bonus points"
   
3. **View Premium Landmarks**
   - Scroll through the landmarks list
   - **Official landmarks**: Clear, unlocked
   - **Premium landmarks**: 
     - ✨ **Blurred image** with reduced opacity
     - 🔒 **Large gold lock icon with glow**
     - 💎 **Gold gradient badge** (top-right)
     - ⭐ **Enhanced points display** (25 pts with diamond)
     - 📝 **"Unlock Premium" CTA text**

4. **Tap a Locked Landmark**
   - Upgrade modal should appear
   - Shows Basic ($4.99) and Premium ($9.99) tiers
   - Lists all features

## Common Issues

### Issue: "No landmarks found"
**Solution**: You're not logged in. Go back to the login page and sign in.

### Issue: "0 Landmarks" showing for countries
**Solution**: 
1. Check if you're logged in (look for user icon in top-right)
2. Try pulling down to refresh the page
3. Hard refresh the browser (Safari: Settings → Clear History and Website Data)

### Issue: Changes not appearing
**Solution**:
1. Hard refresh: Hold Shift + click Reload (Desktop)
2. On iPhone: Close all Safari tabs and reopen
3. Clear browser cache
4. Try incognito/private mode

### Issue: "Not authenticated" error
**Solution**: Your session expired. Log out and log back in.

## Testing Different User Tiers

### Test as FREE User (Default)
- All new accounts are FREE tier
- See blurred premium content
- Can tap to view upgrade modal
- Official landmarks: 10 points
- Premium landmarks: Locked

### Test as PREMIUM User (Requires Admin Access)
To upgrade a user to premium for testing:

**Method 1: Using curl (from terminal)**
```bash
curl -X POST http://localhost:8001/api/admin/set-tier \
  -H "Content-Type: application/json" \
  -d '{"user_id": "YOUR_USER_ID_HERE", "tier": "premium"}'
```

**Method 2: Request upgrade via support**
Contact the developer to manually upgrade your test account.

**What changes when premium:**
- No blurred landmarks
- No lock overlays
- Premium banner disappears
- All landmarks accessible
- Premium landmarks worth 25 points each

## Premium Features to Test

### Visual Elements
1. ✅ Premium banner with gradient (gold → orange)
2. ✅ Blurred images on locked content
3. ✅ Lock icon with glow effect
4. ✅ "Unlock Premium" CTA overlay
5. ✅ Gold gradient badge (PREMIUM)
6. ✅ Enhanced points display
7. ✅ "Worth 25 points!" highlight

### Interactions
1. ✅ Tap premium banner → Opens upgrade modal
2. ✅ Tap locked landmark → Opens upgrade modal
3. ✅ Tap "Upgrade to Basic" → (Payment flow to be integrated)
4. ✅ Tap "Upgrade to Premium" → (Payment flow to be integrated)
5. ✅ Tap "Maybe Later" → Closes modal

## Expected Behavior

### Norway Landmarks (Example)
**Official Landmarks (10):** Unlocked for all users
1. The Old Town of Fredrikstad - 10 pts
2. Preikestolen (Pulpit Rock) - 10 pts
3. Bryggen - 10 pts
4. Nidaros Cathedral - 10 pts
5. Geirangerfjord - 10 pts
6. Northern Lights - 10 pts
7. Viking Ship Museum - 10 pts
8. Vigeland Sculpture Park - 10 pts
9. Ålesund Art Nouveau - 10 pts
10. Bergen Funicular - 10 pts

**Premium Landmarks (5):** Locked for free users
1. 🔒 Trolltunga - 25 pts
2. 🔒 Lofoten Islands - 25 pts
3. 🔒 Atlantic Ocean Road - 25 pts
4. 🔒 Sognefjord - 25 pts
5. 🔒 Tromsø Arctic Cathedral - 25 pts

**Premium Banner should show:**
"5 Premium Landmarks Available"
"Unlock exclusive content • Earn up to 125 bonus points"

## Troubleshooting Checklist

- [ ] Are you logged in? (Check for user icon/name)
- [ ] Is the auth token valid? (Try logging out and back in)
- [ ] Is JavaScript enabled in your browser?
- [ ] Are you in incognito/private mode? (Try regular mode)
- [ ] Have you cleared browser cache recently?
- [ ] Is your internet connection stable?
- [ ] Are you accessing the correct URL?

## Browser Compatibility

✅ **Supported:**
- Safari (iOS 14+)
- Chrome (iOS)
- Firefox (iOS)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

⚠️ **Limitations:**
- Some blur effects may render differently on older iOS versions
- Gradient animations might be limited on low-end devices

## Getting Help

If you encounter issues not covered here:
1. Check the browser console for errors (Desktop: F12)
2. Try creating a new test account
3. Test on a different browser or device
4. Report the issue with specific steps to reproduce
