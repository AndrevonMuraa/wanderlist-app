# Critical Fixes & Development Patterns

> **IMPORTANT**: This document MUST be read at the start of EVERY session, including forked sessions.
> These are not suggestions - they are required patterns to prevent recurring issues.

> **NEW**: Also read `/app/WANDERLIST_BASELINE_MODEL.md` for complete app state documentation.

## 🚨 MANDATORY: Read This First on Every Session Start

**FOR AI AGENTS**: Before making ANY code changes, review BOTH documents:
1. This file (CRITICAL_FIXES_AND_PATTERNS.md)
2. `/app/WANDERLIST_BASELINE_MODEL.md` - Complete app state and feature list

---

## 1. BACKEND_URL Configuration Pattern ⚠️ CRITICAL

### ❌ WRONG - DO NOT DO THIS:
```typescript
// DON'T duplicate BACKEND_URL in multiple files
const BACKEND_URL = Platform.OS === 'web' ? '' : process.env.EXPO_PUBLIC_BACKEND_URL;
```

### ✅ CORRECT - ALWAYS DO THIS:
```typescript
// In ANY file that needs BACKEND_URL:
import { BACKEND_URL } from '../utils/config';
// or
import { BACKEND_URL } from '../../utils/config';
```

### Why This Matters:
- **Issue**: When accessed via iPhone/desktop browsers at remote URLs, relative URLs fail
- **Impact**: Login failures, "Load failed" errors, no data loading
- **Solution**: Centralized config with smart detection

### The Centralized Config (`/app/frontend/utils/config.ts`):
```typescript
import { Platform } from 'react-native';

const getBackendURL = () => {
  // For native mobile, always use the external URL
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // For web, check if we're accessing via localhost or remote URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing via localhost, use relative URLs (proxy will handle routing)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    
    // If accessing via remote URL (like emergentagent.com), use full backend URL
    // This handles iPhone browsers accessing the web version
    return process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
  
  // Default fallback
  return '';
};

export const BACKEND_URL = getBackendURL();
```

### Files That MUST Use This Pattern:
- ✅ `/app/frontend/contexts/AuthContext.tsx` - Already fixed
- ✅ `/app/frontend/app/landmarks/[country_id].tsx` - Already fixed
- ✅ `/app/frontend/app/(tabs)/explore.tsx` - Already fixed
- ✅ `/app/frontend/app/(tabs)/profile.tsx` - Already fixed
- ✅ `/app/frontend/app/landmark-detail/[landmark_id].tsx` - Already fixed
- ⚠️ **ANY NEW FILE** that makes API calls MUST import from config

### Checklist When Creating New Features:
- [ ] Does this file make API calls?
- [ ] If yes, import `BACKEND_URL` from `utils/config.ts`
- [ ] Do NOT define a local `BACKEND_URL`
- [ ] Test on both localhost AND remote URL (preview.emergentagent.com)

---

## 2. Cross-Platform Compatibility (Web + Mobile)

### Desktop Browser Support (Chrome, Safari, Firefox on Mac/Windows):
- ✅ All features must work on desktop browsers
- ✅ Use `Platform.OS === 'web'` checks for web-specific code
- ✅ Test viewport sizes: 1440x900 (MacBook), 1920x1080 (Desktop)

### Mobile Browser Support (Safari/Chrome on iPhone/Android):
- ✅ Mobile browsers access the web version, not native
- ✅ They need the full backend URL (not relative)
- ✅ This is handled by the smart detection in `config.ts`

### Testing Requirements:
1. **Localhost** (development):
   - Open http://localhost:3000 in browser
   - Should use relative URLs (proxied to backend)

2. **Remote URL** (preview/production):
   - Open https://leaderboard-dev.preview.emergentagent.com
   - Should use full backend URL
   - Test on iPhone Safari specifically

---

## 3. Premium Content Implementation Pattern

### Backend Requirements:
```python
# In server.py - Landmarks endpoint
@api_router.get("/landmarks")
async def get_landmarks(
    country_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if country_id:
        query["country_id"] = country_id
    
    landmarks = await db.landmarks.find(query).to_list(1000)
    
    # CRITICAL: Add is_locked flag for frontend
    results = []
    for l in landmarks:
        landmark_dict = dict(l)
        if current_user.subscription_tier == "free" and landmark_dict.get("category") == "premium":
            landmark_dict["is_locked"] = True
        else:
            landmark_dict["is_locked"] = False
        results.append(Landmark(**landmark_dict))
    
    return results
```

### Frontend Requirements:
```typescript
// Interface must include is_locked
interface Landmark {
  landmark_id: string;
  name: string;
  category: string;
  is_locked?: boolean;  // REQUIRED
  points?: number;
}

// Rendering must check is_locked
const renderLandmark = ({ item }: { item: Landmark }) => (
  <View>
    <Image
      source={{ uri: item.image_url }}
      blurRadius={item.is_locked ? 8 : 0}  // Blur locked content
    />
    {item.is_locked && (
      <View style={styles.lockOverlay}>
        {/* Lock UI */}
      </View>
    )}
  </View>
);
```

---

## 4. Common Pitfalls & Solutions

### Pitfall 1: "No landmarks found" on remote URL
**Cause**: Using relative URLs when accessing from remote domain  
**Fix**: Use centralized `BACKEND_URL` from config  
**Check**: Import statement at top of file

### Pitfall 2: Login works on localhost but fails on iPhone
**Cause**: Same as above - BACKEND_URL issue  
**Fix**: Ensure ALL files use centralized config  
**Test**: Try login from iPhone Safari browser

### Pitfall 3: Premium content not showing blur/locks
**Cause**: Backend not returning `is_locked` flag OR frontend not checking it  
**Fix**: Verify both backend endpoint and frontend interface  
**Debug**: Check API response with curl/Postman first

### Pitfall 4: Changes not reflecting in browser
**Cause**: Frontend not restarted after code changes  
**Fix**: Always restart frontend: `sudo supervisorctl restart expo`  
**Reminder**: Wait 20-30 seconds for Metro bundler to complete

---

## 5. Session Start Checklist (EVERY SESSION, INCLUDING FORKS)

### Before Making Any Changes:
- [ ] Read this document completely
- [ ] Check if `utils/config.ts` exists and is correct
- [ ] Verify all API-calling files import from config (not define locally)
- [ ] Review last session's issues in `test_result.md`

### When Adding New Features:
- [ ] Will this feature make API calls? → Import BACKEND_URL from config
- [ ] Does this feature need authentication? → Import from AuthContext
- [ ] Is this premium content? → Add `is_locked` logic
- [ ] Test on both localhost AND remote URL

### Before Finishing:
- [ ] Restart frontend: `sudo supervisorctl restart expo`
- [ ] Test on desktop browser (Chrome/MacBook)
- [ ] If possible, test on mobile browser (iPhone Safari)
- [ ] Verify no "Load failed" or "Invalid credentials" errors
- [ ] Update this document if new patterns are discovered

---

## 6. Files to Never Duplicate Logic In

### BACKEND_URL:
- **Only in**: `/app/frontend/utils/config.ts`
- **Import in**: All other files that need it
- **Never**: Define locally in any other file

### Auth Logic:
- **Only in**: `/app/frontend/contexts/AuthContext.tsx`
- **Import in**: Pages that need user data
- **Never**: Duplicate auth fetch logic

### Theme/Styles:
- **Only in**: `/app/frontend/styles/theme.ts`
- **Import in**: All components
- **Never**: Hardcode colors, spacing, or typography

---

## 7. Quick Reference: Import Statements

### For API Calls:
```typescript
import { BACKEND_URL } from '../utils/config';
// or '../../utils/config' depending on folder depth
```

### For Authentication:
```typescript
import { useAuth } from '../contexts/AuthContext';
// Then: const { user, login, logout } = useAuth();
```

### For Theming:
```typescript
import theme from '../styles/theme';
// Then use: theme.colors.primary, theme.spacing.md, etc.
```

---

## 8. Testing Credentials (For Quick Testing)

### Test Accounts:
- **Free User**: `mobile@test.com` / `test123`
- **Purpose**: Testing premium content locks and teasers

### Creating New Test Users:
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "name": "Test", "email": "test@test.com", "password": "test123"}'
```

---

## 9. Known Issues (Already Fixed - Don't Reintroduce!)

### ✅ FIXED: Mobile API Connectivity
- **Was**: App couldn't connect to backend from iPhone browsers
- **Fix**: Smart URL detection in `config.ts`
- **Don't**: Go back to simple Platform.OS check

### ✅ FIXED: Premium Content Not Visible
- **Was**: Locked landmarks not showing blur/overlay
- **Fix**: Proper `is_locked` flag from backend + frontend rendering
- **Don't**: Remove `is_locked` logic

### ✅ FIXED: Duplicate BACKEND_URL Definitions
- **Was**: Multiple files defined their own BACKEND_URL
- **Fix**: Centralized in `config.ts`, all files import
- **Don't**: Add new local BACKEND_URL definitions

---

## 10. Emergency Recovery Commands

### Frontend Not Loading:
```bash
sudo supervisorctl restart expo
# Wait 30 seconds
curl http://localhost:3000
```

### Backend Issues:
```bash
sudo supervisorctl restart backend
# Check logs:
tail -50 /var/log/supervisor/backend.err.log
```

### Clear Metro Cache:
```bash
rm -rf /app/frontend/.metro-cache
sudo supervisorctl restart expo
```

### Database Check:
```python
python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.test_database
    count = await db.landmarks.count_documents({})
    print(f"Landmarks: {count}")
    client.close()
asyncio.run(check())
EOF
```

---

## 📌 REMINDER FOR AI AGENTS

**START OF EVERY SESSION**:
1. ✅ Read this document FIRST
2. ✅ Check for forked environment issues
3. ✅ Verify `config.ts` is correct
4. ✅ Review `test_result.md` for previous issues

**BEFORE MAKING CHANGES**:
1. ✅ Will this introduce duplicate logic?
2. ✅ Am I importing from centralized config/contexts?
3. ✅ Have I tested on both localhost and remote URL?

**AFTER MAKING CHANGES**:
1. ✅ Restart frontend
2. ✅ Test on desktop browser
3. ✅ Update this document if new patterns emerge

---

## Version History

- **v1.0** (2026-01-07): Initial document created
  - Added BACKEND_URL pattern
  - Added premium content implementation
  - Added cross-platform compatibility notes
  - Added testing requirements

---

**This document is living documentation. Update it whenever new patterns or fixes are discovered.**
