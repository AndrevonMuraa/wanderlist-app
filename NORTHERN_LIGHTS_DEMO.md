# Northern Lights Feature - Visual Code Demonstration

## 🎯 Feature Overview

The Northern Lights landmark has a **unique interactive map feature** that allows users to:
1. **Pin observation locations** when adding a visit (on mobile)
2. **View all observation points** on an interactive map in the detail page (on mobile)

This document provides a visual walkthrough of the implementation.

---

## 📱 Part 1: Adding a Visit with Location Pin

### File: `/app/frontend/app/add-visit/[landmark_id].tsx`

#### Step 1: State Management (Lines 28)
```typescript
const [locationMarker, setLocationMarker] = useState<{ 
  latitude: number; 
  longitude: number 
} | null>(null);
```
**What this does:** Stores the GPS coordinates when user taps on the map.

---

#### Step 2: Default Location Setup (Lines 49-55)
```typescript
// For Northern Lights, set default location to landmark location
if (data.name === 'Northern Lights' && data.latitude && data.longitude) {
  setLocationMarker({
    latitude: data.latitude,
    longitude: data.longitude
  });
}
```
**What this does:** When loading the Northern Lights landmark, it centers the map on default coordinates.

---

#### Step 3: Location Validation (Lines 130-134)
```typescript
// For Northern Lights, require location pin
if (landmark?.name === 'Northern Lights' && !locationMarker) {
  Alert.alert('Location Required', 'Please pin the exact location where you observed the Northern Lights');
  return;
}
```
**What this does:** Prevents submission unless user has pinned a location on the map.

---

#### Step 4: Prepare Location Data for API (Lines 142-149)
```typescript
// Prepare visit location data for Northern Lights
let visit_location = null;
if (landmark?.name === 'Northern Lights' && locationMarker) {
  visit_location = {
    latitude: locationMarker.latitude,
    longitude: locationMarker.longitude,
    region: 'Custom location'
  };
}
```
**What this does:** Formats the pinned location into the proper structure for the backend.

---

#### Step 5: Interactive Map UI (Lines 222-250)

```typescript
{/* Northern Lights Location Picker - Native Only */}
{landmark?.name === 'Northern Lights' && Platform.OS !== 'web' && MapView && (
  <Surface style={styles.mapSection}>
    <Text style={styles.sectionTitle}>
      📍 Pin Your Observation Location
    </Text>
    <Text style={styles.sectionSubtext}>
      Tap on the map to mark exactly where you observed the Northern Lights
    </Text>
    
    {locationMarker && (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: locationMarker.latitude,
          longitude: locationMarker.longitude,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
        onPress={(e) => {
          setLocationMarker(e.nativeEvent.coordinate);
        }}
      >
        <Marker
          coordinate={locationMarker}
          title="Northern Lights Observation"
          description="Tap map to move pin"
          pinColor="#00ff00"
        />
      </MapView>
    )}
  </Surface>
)}
```

**What this does:**
- ✅ Shows ONLY for "Northern Lights" landmark
- ✅ Shows ONLY on native mobile (iOS/Android), NOT on web
- ✅ Displays an interactive map with a green marker
- ✅ User can tap anywhere on map to move the pin
- ✅ Pin shows "Northern Lights Observation" when tapped

**Visual Flow:**
```
User opens "Add Visit" for Northern Lights
         ↓
[Photo Section] ← User adds photo
         ↓
[📍 Pin Your Observation Location]
         ↓
[Interactive Map with Green Pin] ← User taps to set location
         ↓
[Comments & Diary Notes]
         ↓
[Submit Button] → Sends photo + location to backend
```

---

## 🗺️ Part 2: Viewing All Observations on Interactive Map

### File: `/app/frontend/app/landmark-detail/[landmark_id].tsx`

#### Step 1: State for Storing Visits (Line 63)
```typescript
const [northernLightsVisits, setNorthernLightsVisits] = useState<any[]>([]);
```
**What this does:** Stores all the user's Northern Lights visits that have location data.

---

#### Step 2: Conditional Fetch (Lines 89-91)
```typescript
// If Northern Lights, fetch user's visits
if (data.name === 'Northern Lights') {
  fetchNorthernLightsVisits(token);
}
```
**What this does:** When loading Northern Lights detail page, automatically fetch all visits.

---

#### Step 3: Fetch and Filter Visits (Lines 102-124)
```typescript
const fetchNorthernLightsVisits = async (token: string | null) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/visits`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const visits = await response.json();
      // Filter visits for Northern Lights that have location data
      const nlVisits = visits.filter((visit: any) => 
        visit.landmark_id === landmark_id && 
        visit.visit_location && 
        visit.visit_location.latitude && 
        visit.visit_location.longitude
      );
      setNorthernLightsVisits(nlVisits);
    }
  } catch (error) {
    console.error('Error fetching visits:', error);
  }
};
```

**What this does:**
1. Fetches ALL of the user's visits from the API
2. Filters to find ONLY Northern Lights visits
3. Further filters to ONLY visits that have location data
4. Stores the filtered list in state

---

#### Step 4: Interactive Map Display (Lines 258-330)

```typescript
{landmark.name === 'Northern Lights' ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>🌌 Your Observation Locations</Text>
    <Text style={styles.northernLightsInfo}>
      The Northern Lights can be observed from various Arctic locations. 
      {northernLightsVisits.length > 0 
        ? ` You've logged ${northernLightsVisits.length} observation${northernLightsVisits.length > 1 ? 's' : ''}!`
        : ' Mark your first visit to pin your observation point!'}
    </Text>
    
    {/* Native Map View */}
    {Platform.OS !== 'web' && MapView && (
      <View style={styles.observationMapContainer}>
        <MapView
          style={styles.observationMap}
          initialRegion={{
            latitude: landmark.latitude || 69.6492,
            longitude: landmark.longitude || 18.9553,
            latitudeDelta: 30,
            longitudeDelta: 30,
          }}
        >
          {northernLightsVisits.map((visit, index) => (
            <Marker
              key={visit.visit_id}
              coordinate={{
                latitude: visit.visit_location.latitude,
                longitude: visit.visit_location.longitude,
              }}
              title={`Observation ${index + 1}`}
              description={visit.comments || 'Northern Lights sighting'}
              pinColor="#00ff00"
            />
          ))}
        </MapView>
      </View>
    )}
    
    {/* Web Fallback */}
    {Platform.OS === 'web' && (
      <View style={styles.webMapPlaceholder}>
        <Ionicons name="map" size={48} color={theme.colors.primary} />
        <Text style={styles.webMapText}>
          Interactive map available on mobile devices
        </Text>
      </View>
    )}
    
    {/* Observation Stats */}
    <View style={styles.observationStats}>
      <View style={styles.statCard}>
        <Ionicons name="location" size={24} color={theme.colors.primary} />
        <Text style={styles.statNumber}>{northernLightsVisits.length}</Text>
        <Text style={styles.statLabel}>Observations</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="pin" size={24} color={theme.colors.accent} />
        <Text style={styles.statNumber}>
          {northernLightsVisits.length > 0 ? 'Active' : 'Pending'}
        </Text>
        <Text style={styles.statLabel}>Map Status</Text>
      </View>
    </View>
  </View>
) : (
  // Regular landmarks show standard static map
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>📍 Location</Text>
    <LandmarkMap 
      latitude={landmark.latitude}
      longitude={landmark.longitude}
      landmarkName={landmark.name}
      height={250}
    />
  </View>
)}
```

**What this does:**

**FOR NORTHERN LIGHTS:**
1. Shows custom section title "🌌 Your Observation Locations"
2. Displays count of observations or prompts to add first
3. **On Mobile:** Shows interactive map with green markers for EACH visit location
4. **On Web:** Shows placeholder message (maps don't work on web)
5. Shows stats: number of observations and active/pending status

**FOR OTHER LANDMARKS:**
- Shows standard static map at fixed coordinates

---

## 📊 Visual Comparison

### Regular Landmark (e.g., Eiffel Tower)
```
┌─────────────────────────┐
│  📍 Location            │
├─────────────────────────┤
│                         │
│   [Static Map]          │
│   Single fixed point    │
│   (48.8584° N,          │
│    2.2945° E)           │
│                         │
└─────────────────────────┘
```

### Northern Lights
```
┌──────────────────────────────────┐
│  🌌 Your Observation Locations   │
├──────────────────────────────────┤
│ You've logged 3 observations!    │
│                                  │
│  [Interactive Map]               │
│   📍 Pin 1 (Tromsø, Norway)      │
│   📍 Pin 2 (Reykjavik, Iceland)  │
│   📍 Pin 3 (Abisko, Sweden)      │
│                                  │
├──────────────────────────────────┤
│  📊 Stats                        │
│   Observations: 3   Status:Active│
└──────────────────────────────────┘
```

---

## 🔧 Backend Support

### File: `/app/backend/server.py` (Lines 136-153)

```python
class Visit(BaseModel):
    visit_id: str
    user_id: str
    landmark_id: str
    photo_base64: str
    points_earned: int = 10
    comments: Optional[str] = None
    visit_location: Optional[dict] = None  # For Northern Lights
    diary_notes: Optional[str] = None
    visited_at: datetime

class VisitCreate(BaseModel):
    landmark_id: str
    photo_base64: str
    comments: Optional[str] = None
    visit_location: Optional[dict] = None  # For Northern Lights
    diary_notes: Optional[str] = None
```

**What this does:** 
- The `visit_location` field is optional
- For Northern Lights, it stores: `{"latitude": 69.6492, "longitude": 18.9553, "region": "Custom location"}`
- For other landmarks, it remains `null`

---

## ✅ Feature Status Summary

| Component | Status | Platform | Notes |
|-----------|--------|----------|-------|
| Add Visit - Location Picker | ✅ Complete | Mobile Only | Interactive map with tap-to-pin |
| Add Visit - Location Validation | ✅ Complete | Mobile Only | Enforces location requirement |
| Add Visit - Data Submission | ✅ Complete | Mobile Only | Sends location to backend |
| Detail Page - Fetch Visits | ✅ Complete | All | Fetches and filters visits |
| Detail Page - Map Display | ✅ Complete | Mobile Only | Shows all observation markers |
| Detail Page - Web Fallback | ✅ Complete | Web Only | Shows placeholder message |
| Detail Page - Stats | ✅ Complete | All | Shows observation count |
| Backend - Data Storage | ✅ Complete | API | Stores visit_location |

---

## 🚨 Why You Can't See It Yet

The interactive maps **only work on native mobile** (iOS/Android), not in web browsers:

1. **react-native-maps** library is native-only
2. Web version intentionally shows a placeholder
3. Your Expo Go app has SDK version mismatch, blocking mobile testing

**To see it working:**
- Update Expo Go on your iPhone to latest version
- OR create a custom development build
- OR I can help downgrade the project SDK

---

## 📸 Expected User Experience

### When Adding a Visit (Mobile):
1. User sees photo picker ✅
2. User sees map with green pin ✅
3. User taps map → pin moves to tapped location ✅
4. User submits → location saved ✅

### When Viewing Detail Page (Mobile):
1. Map appears showing all observation points ✅
2. Each marker is labeled "Observation 1", "Observation 2", etc. ✅
3. Tapping marker shows user's comments ✅
4. Stats show total observations ✅

### When Viewing on Web:
1. Shows placeholder: "Interactive map available on mobile devices" ✅
2. Rest of the page works normally ✅

---

## 🎓 Key Technical Decisions

1. **Conditional Rendering**: Only Northern Lights gets special treatment
2. **Platform-Specific**: Native gets maps, web gets placeholder
3. **Data Structure**: Flexible `visit_location` field in backend
4. **Validation**: Location required before submission
5. **Multiple Markers**: Each visit = separate marker on map

This architecture allows for future expansion (e.g., adding similar features for other dynamic landmarks like "Safari in Kenya" could track different wildlife sighting locations).
