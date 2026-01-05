# Premium Landmarks & Point System Implementation Plan

## Overview
Add 100 exclusive premium landmarks (5 per country) accessible only to Premium tier users, with a complex point system including completion bonuses.

## Point System Design

### Base Points
- **Official landmarks**: 10 points each
- **Premium landmarks**: 25 points each

### Completion Bonuses
- **Country Completion**: +50 points (visit all landmarks in one country)
- **Continent Completion**: +200 points (visit all landmarks in one continent)

### Maximum Possible Points
- Official landmarks: 200 × 10 = 2,000 points
- Premium landmarks: 100 × 25 = 2,500 points
- Country bonuses: 20 × 50 = 1,000 points
- Continent bonuses: 6 × 200 = 1,200 points
- **Total Maximum**: 6,700 points

## Backend Changes

### 1. Database Schema Updates

#### Landmarks Collection
```python
{
    "landmark_id": str,
    "name": str,
    "country_id": str,
    "category": "official" | "premium",  # NEW: "premium" category
    "points": 10 | 25,  # NEW: points field
    "description": str,
    "image_url": str,
    ...
}
```

#### Visits Collection
```python
{
    "visit_id": str,
    "user_id": str,
    "landmark_id": str,
    "points_earned": int,  # NEW: points earned for this visit
    "photo_base64": str,
    ...
}
```

#### User Stats (Virtual/Calculated)
```python
{
    "total_points": int,  # Base points from visits
    "bonus_points": int,  # Completion bonuses
    "grand_total_points": int,  # total_points + bonus_points
    "countries_completed": List[str],
    "continents_completed": List[str]
}
```

### 2. API Endpoints to Modify

#### `/api/landmarks` - GET
- **Change**: Filter premium landmarks based on user tier
- **Logic**: 
  - Free/Basic users: Only show `category="official"`
  - Premium users: Show both `category="official"` and `category="premium"`
- **UI Indication**: Return a `locked` flag for premium landmarks when user is not premium

#### `/api/visits` - POST
- **Change**: Calculate and store points when visit is logged
- **Logic**:
  1. Get landmark info to determine points (10 or 25)
  2. Store points_earned in visit document
  3. Check for completion bonuses
  4. Return updated point totals

#### `/api/stats` - GET
- **New Fields**:
  ```python
  {
      "total_points": int,
      "bonus_points": int,
      "grand_total_points": int,
      "countries_completed": List[str],
      "continents_completed": List[str],
      "next_country_bonus": Optional[str],  # Next country close to completion
      "next_continent_bonus": Optional[str]  # Next continent close to completion
  }
  ```

#### `/api/leaderboard` - GET
- **Change**: Sort by `grand_total_points` instead of `visit_count`
- **New Response**:
  ```python
  {
      "user_id": str,
      "name": str,
      "picture": str,
      "total_points": int,  # NEW: replace visit_count
      "rank": int
  }
  ```

### 3. Helper Functions to Add

```python
async def calculate_user_points(user_id: str) -> dict:
    """Calculate total points including bonuses for a user"""
    # Get all visits with points
    # Calculate country completion bonuses
    # Calculate continent completion bonuses
    # Return totals
    
async def check_completion_bonuses(user_id: str, new_landmark_id: str) -> dict:
    """Check if new visit triggers any completion bonuses"""
    # Check if country is now complete
    # Check if continent is now complete
    # Return bonus info
    
async def get_country_progress(user_id: str, country_id: str) -> dict:
    """Get progress toward completing a country"""
    # Return visited/total for country
```

## Frontend Changes

### 1. Explore Screen Updates
- **Premium Landmarks Section**: Add a "Premium Landmarks" tab/section
- **Lock Icons**: Show lock icon for premium landmarks if user is not premium
- **Upgrade Prompt**: Tapping locked landmark shows upgrade modal

### 2. Leaderboard Screen Updates
- **Display Points**: Show total points instead of visit count
- **Point Badges**: Visual indicators for high achievers
- **Sorting**: Sort by `grand_total_points`

### 3. Profile/Journey Screen Updates
- **Points Display**: Prominent display of total points
- **Progress Bars**: Show progress toward completion bonuses
- **Breakdown**: Show points breakdown:
  - Base points from visits
  - Country completion bonuses
  - Continent completion bonuses
- **Achievement Tracking**: List completed countries/continents

### 4. Landmark Detail Screen Updates
- **Points Badge**: Show how many points landmark is worth (10 or 25)
- **Premium Badge**: Visual indicator for premium landmarks
- **Lock State**: If locked, show "Premium Only" with upgrade button

### 5. New Components Needed

#### PointsBadge Component
```jsx
<PointsBadge points={25} isPremium={true} />
```

#### ProgressCard Component
```jsx
<ProgressCard
  title="Country Completion"
  current={15}
  total={20}
  bonus={50}
  nextTarget="Complete France for +50 points"
/>
```

#### UpgradeModal Component
```jsx
<UpgradeModal
  visible={showUpgrade}
  feature="Premium Landmarks"
  description="Access 100 exclusive landmarks and earn 25 points each!"
  onClose={() => setShowUpgrade(false)}
/>
```

## Implementation Steps

### Phase 1: Backend Foundation ✅
1. ✅ Create premium_landmarks.py with 100 landmarks
2. Update Landmark model to include `points` field
3. Update Visit model to include `points_earned` field
4. Update Leaderboard Entry model to use `total_points`
5. Update seed_data.py to:
   - Add `points: 10` to all official landmarks
   - Import and seed premium landmarks with `points: 25`

### Phase 2: Backend API Updates
1. Modify `/api/landmarks` to filter by user tier
2. Update `/api/visits` POST to calculate and store points
3. Enhance `/api/stats` to include point calculations
4. Update `/api/leaderboard` to sort by points
5. Add completion bonus calculation helpers

### Phase 3: Frontend Data Layer
1. Update TypeScript interfaces for new fields
2. Update API calls to handle points data
3. Add point calculation utilities

### Phase 4: Frontend UI Updates
1. Update Explore screen with premium landmark filtering
2. Update Leaderboard to show points
3. Update Profile/Journey to display points prominently
4. Add PointsBadge component
5. Add ProgressCard component
6. Add UpgradeModal component

### Phase 5: Testing & Polish
1. Test premium landmark visibility rules
2. Test point calculations and bonuses
3. Test leaderboard sorting
4. Test upgrade prompts
5. Visual polish and animations

## Database Migration

Since this is adding new fields, no migration needed for existing data:
- Existing landmarks will get `points: 10` via seed script
- New premium landmarks will be added with `points: 25`
- Existing visits can have `points_earned` calculated retroactively

## Next Steps
1. Update server.py with new models and logic
2. Update seed_data.py to include premium landmarks
3. Run seed script to populate database
4. Update frontend screens systematically
