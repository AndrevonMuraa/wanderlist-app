# Map Features Implementation Plan

## Overview
Adding two major mapping features to WanderList:
1. **Northern Lights Location Tracking** - Users can specify where in Norway they saw the aurora
2. **Landmark Location Maps** - All landmarks display their location on an interactive map

## Feature 1: Northern Lights Location Tracking

### User Story
"As a user who saw the Northern Lights, I want to specify which city/region in Norway I was in, so I can remember and share my exact viewing location."

### Requirements
- ✅ City/region selection (not exact GPS for privacy)
- ✅ Only for "Northern Lights" landmark
- ✅ Optional field when logging a visit
- ✅ Community map showing all sightings (Basic & Premium users only)
- ❌ Free users cannot see community map (upgrade prompt)

### Norwegian Regions/Cities for Selection
**Dropdown options:**
- Tromsø (Most popular aurora viewing city)
- Alta
- Svalbard
- Lofoten Islands
- Bodø
- Narvik
- Kirkenes
- Finnmark
- Troms
- Nordland
- Other (free text input)

### Database Changes
✅ **DONE:** Added `visit_location` field to Visit model

### Backend API Endpoints Needed
1. `GET /api/northern-lights/sightings` - Get community sightings map data
   - Requires: Basic or Premium subscription
   - Returns: Array of {location, count, recent_photo, visited_at}
   
2. Update `POST /api/visits` - Already handles visit_location field

### Frontend Components Needed
1. **Location Picker** (add-visit page for Northern Lights)
   - Dropdown/Picker with Norwegian regions
   - Conditional rendering (only show for Northern Lights)
   
2. **Community Sightings Map** (landmark-detail page for Northern Lights)
   - Map showing pins for each location
   - Cluster markers if multiple sightings in same location
   - Tap pin to see photo and details
   - Subscription gate (Basic/Premium only)

---

## Feature 2: Landmark Location Maps

### User Story
"As a user browsing landmarks, I want to see exactly where each landmark is located on a map, so I can plan my visit and understand its geographic context."

### Requirements
- ✅ All 200 landmarks have GPS coordinates
- ✅ Interactive map on landmark detail page
- ✅ Map shows landmark pin with name
- ✅ Works on web, iOS, and Android
- ✅ Available to all users (no subscription required)

### Database Changes
✅ **DONE:** Added `latitude` and `longitude` fields to Landmark model

### GPS Coordinates to Add
Need to populate coordinates for all 200 landmarks across 20 countries:
- Norway (10 landmarks)
- France (10 landmarks)
- Italy (10 landmarks)
- Japan (10 landmarks)
- Egypt (10 landmarks)
- Peru (10 landmarks)
- Australia (10 landmarks)
- USA (10 landmarks)
- UK (10 landmarks)
- China (10 landmarks)
- Spain (10 landmarks)
- Greece (10 landmarks)
- Thailand (10 landmarks)
- India (10 landmarks)
- Brazil (10 landmarks)
- Mexico (10 landmarks)
- UAE (10 landmarks)
- Germany (10 landmarks)
- Canada (10 landmarks)
- South Africa (10 landmarks)

### Frontend Components Needed
1. **LandmarkMap Component** (landmark-detail page)
   - Display map with single marker at landmark location
   - Show landmark name in marker callout
   - Allow zoom/pan
   - Responsive sizing

---

## Technical Implementation

### Dependencies to Install
```bash
# React Native Maps
yarn add react-native-maps

# Expo Location (for future features)
npx expo install expo-location
```

### File Structure
```
frontend/
├── components/
│   ├── LandmarkMap.tsx          # Single landmark map
│   ├── NorthernLightsSightings.tsx  # Community sightings map
│   └── LocationPicker.tsx       # Region dropdown for Northern Lights
├── app/
│   ├── landmark-detail/[landmark_id].tsx  # Add maps here
│   └── add-visit/[landmark_id].tsx        # Add location picker here
```

### Implementation Steps

#### Step 1: Install Dependencies ✅
```bash
cd /app/frontend
yarn add react-native-maps
```

#### Step 2: Add GPS Coordinates to seed_data.py
- Research and add lat/long for all 200 landmarks
- Start with Norwegian landmarks (already have data)
- Use Google Maps / OpenStreetMap for accurate coordinates

#### Step 3: Backend API Endpoints
- Create Northern Lights sightings endpoint
- Add subscription check middleware
- Aggregate visit_location data

#### Step 4: Frontend Components
- Create reusable map components
- Add to landmark detail pages
- Add location picker to visit creation
- Implement subscription gating

#### Step 5: Testing
- Test maps on web preview
- Test on mobile (if possible)
- Verify subscription gating works
- Test Northern Lights location selection

---

## UI/UX Design

### Landmark Map (All Landmarks)
```
┌─────────────────────────────────────┐
│  [Back Button]  Landmark Name       │
├─────────────────────────────────────┤
│                                     │
│        [Image Gallery]              │
│                                     │
├─────────────────────────────────────┤
│  📍 Location                        │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │         [MAP VIEW]            │ │
│  │           📍                  │ │
│  │                               │ │
│  └───────────────────────────────┘ │
├─────────────────────────────────────┤
│  About                              │
│  Description text...                │
└─────────────────────────────────────┘
```

### Northern Lights Community Map (Basic/Premium Only)
```
┌─────────────────────────────────────┐
│  Northern Lights - Community Map    │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │    Norway Map                 │ │
│  │      📍 Tromsø (45)           │ │
│  │         📍 Alta (12)          │ │
│  │      📍 Lofoten (28)          │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Recent Sightings:                  │
│  🌌 Tromsø - 2 days ago            │
│  🌌 Alta - 5 days ago              │
└─────────────────────────────────────┘
```

### Location Picker (Northern Lights Visit)
```
┌─────────────────────────────────────┐
│  Log Your Northern Lights Visit     │
├─────────────────────────────────────┤
│  [Photo Upload]                     │
│                                     │
│  Where did you see the aurora?      │
│  ┌─────────────────────────────┐   │
│  │ Select Location ▼           │   │
│  └─────────────────────────────┘   │
│    • Tromsø                         │
│    • Alta                           │
│    • Svalbard                       │
│    • Lofoten Islands                │
│    • Other...                       │
│                                     │
│  Comments (optional)                │
│  ┌─────────────────────────────┐   │
│  │ Amazing colors tonight!     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Submit Visit]                     │
└─────────────────────────────────────┘
```

---

## Subscription Gating Logic

```typescript
// Check if user can access community map
const canViewCommunityMap = (userTier: string): boolean => {
  return userTier === 'basic' || userTier === 'premium';
};

// Show upgrade prompt for free users
if (!canViewCommunityMap(user.subscription_tier)) {
  return (
    <UpgradePrompt 
      feature="Northern Lights Community Map"
      requiredTier="Basic"
    />
  );
}
```

---

## Data Privacy Considerations

### Northern Lights Sightings
- ✅ City/region only (not exact GPS) - protects user privacy
- ✅ No personal information displayed on community map
- ✅ Only shows aggregated data (location + count)
- ✅ Recent photo shown but no user identity

### Landmark Locations
- ✅ Public landmarks only - no privacy concerns
- ✅ Static GPS coordinates (not user-generated)

---

## Performance Considerations

### Map Loading
- Lazy load maps (only when section visible)
- Cache map tiles for offline viewing
- Optimize marker rendering for community map

### Data Fetching
- Cache Northern Lights sightings data (refresh every 24h)
- Paginate large datasets if needed

---

## Future Enhancements

1. **Heat Map** - Show Northern Lights intensity/frequency by region
2. **Best Viewing Times** - Show aurora forecasts integrated with community data
3. **User Profiles** - Show all locations where a user saw Northern Lights
4. **Export Map** - Download personal aurora sighting map as image
5. **Navigation** - "Get Directions" button to open in Google/Apple Maps

---

## Implementation Status

### Completed ✅
- [x] Database schema updates (latitude, longitude, visit_location)
- [x] Backend models updated
- [x] API endpoints ready to handle location data

### In Progress 🚧
- [ ] Install react-native-maps
- [ ] Add GPS coordinates for all 200 landmarks
- [ ] Create map components
- [ ] Implement Northern Lights location picker
- [ ] Create community sightings map
- [ ] Add subscription gating

### Not Started ⏳
- [ ] Testing on mobile devices
- [ ] Performance optimization
- [ ] Analytics tracking for feature usage

---

## Estimated Effort

- **Total Time:** 4-6 hours
- **Backend:** 30 minutes (mostly done)
- **GPS Data Collection:** 1-2 hours
- **Frontend Components:** 2-3 hours
- **Testing & Polish:** 1 hour

---

## Questions for User

1. Should Northern Lights community map show actual photos or just data points?
2. Do you want to add more interactive features to the maps (directions, nearby landmarks)?
3. Should free users see a "teaser" of the community map before being asked to upgrade?

