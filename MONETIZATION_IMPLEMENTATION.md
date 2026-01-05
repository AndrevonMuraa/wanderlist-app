# WanderList Three-Tier Monetization - Implementation Guide

## ✅ COMPLETED

### Phase 1: Core Infrastructure
- [x] Added `subscription_tier` field to User model
- [x] Added Badge, UserBadge, Challenge models
- [x] Updated UserPublic to include subscription_tier

## 🚧 IN PROGRESS

### Database Updates Needed
```python
# Update all existing users to have subscription_tier
db.users.update_many({}, {"$set": {"subscription_tier": "free"}})

# Create indexes
db.visits.create_index([("user_id", 1), ("visited_at", -1)])
db.user_badges.create_index([("user_id", 1)])
```

### Backend Features to Implement

#### 1. Visit Limit System
```python
# GET /api/visits/count/monthly
# Check if user can add visit based on tier
async def can_add_visit(user: User) -> bool:
    if user.subscription_tier != "free":
        return True
    
    # Count visits this month
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    count = await db.visits.count_documents({
        "user_id": user.user_id,
        "visited_at": {"$gte": start_of_month}
    })
    
    return count < 10
```

#### 2. Friend Limit System
```python
# Check before adding friend
async def can_add_friend(user: User) -> tuple[bool, int]:
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user.user_id, "status": "accepted"},
            {"friend_id": user.user_id, "status": "accepted"}
        ]
    })
    
    limits = {"free": 5, "basic": 25, "premium": float('inf')}
    max_friends = limits[user.subscription_tier]
    
    return friend_count < max_friends, friend_count
```

#### 3. Regional Leaderboard
```python
# GET /api/leaderboard?scope=regional&continent=Europe
async def get_leaderboard(scope: str, continent: Optional[str] = None):
    if scope == "regional" and user.subscription_tier == "free":
        raise HTTPException(403, "Regional leaderboard requires Basic or Premium")
    
    if scope == "global" and user.subscription_tier != "premium":
        raise HTTPException(403, "Global leaderboard requires Premium")
```

#### 4. Badge System Endpoints
```python
# GET /api/badges - List all available badges
# GET /api/badges/user/{user_id} - Get user's earned badges
# POST /api/badges/check - Check if user earned any new badges
```

#### 5. Challenge System Endpoints
```python
# GET /api/challenges - Get active challenges for user's tier
# GET /api/challenges/{challenge_id}/progress - Get user's progress
# POST /api/challenges/{challenge_id}/claim - Claim reward
```

#### 6. Subscription Management
```python
# POST /api/subscription/upgrade - Upgrade to Basic/Premium
# POST /api/subscription/downgrade - Downgrade tier
# GET /api/subscription/features - Get tier comparison
```

### Frontend Features to Implement

#### 1. Upgrade Modal Component
```typescript
// components/UpgradeModal.tsx
// Shows when user hits limit
// Displays tier comparison
// Links to payment flow
```

#### 2. Tier Badge Display
```typescript
// Update Profile screen to show tier badge
// "Free", "Basic", or "Premium" with appropriate styling
```

#### 3. Feature Restriction Checks
```typescript
// Before adding visit:
const canAddVisit = await checkVisitLimit();
if (!canAddVisit) {
  showUpgradeModal('visit_limit');
}

// Before adding friend:
const canAddFriend = await checkFriendLimit();
if (!canAddFriend) {
  showUpgradeModal('friend_limit');
}
```

#### 4. Badge Collection Screen
```typescript
// app/badges.tsx
// Grid of all badges
// Show locked/unlocked state
// Display progress for incomplete badges
```

#### 5. Challenges Screen
```typescript
// app/challenges.tsx
// List active challenges
// Show progress bars
// "Claim Reward" button when complete
```

#### 6. Subscription Management Screen
```typescript
// app/subscription.tsx
// Current tier display
// Feature comparison table
// Upgrade/manage buttons
```

## 📋 IMPLEMENTATION PRIORITY

### Week 1: Core Limits & Gates
1. Visit limit system (backend + frontend)
2. Upgrade modal UI
3. Tier display on profile
4. Friend limit enforcement

### Week 2: Badge System
1. Seed badge database
2. Badge checking logic
3. Badge collection screen
4. Badge awarding on actions

### Week 3: Challenges & Regional Leaderboards
1. Challenge database seeding
2. Challenge progress tracking
3. Regional leaderboard API
4. Challenge UI

### Week 4: Payment Integration
1. Stripe/RevenueCat setup
2. Subscription purchase flow
3. Subscription management
4. Webhook handling

### Week 5: Advanced Features
1. PDF export
2. Photo filters
3. AI travel planning
4. Analytics dashboard

## 🎮 BADGE IDEAS (Seed Data)

### Free Tier Badges
- "First Steps" - Visit your first landmark
- "Photographer" - Upload your first photo
- "Social" - Add your first friend
- "Explorer" - Visit 5 landmarks
- "Adventurer" - Visit 10 landmarks
- "Traveler" - Visit landmarks in 3 countries
- "Writer" - Add 10 diary notes

### Basic Tier Badges
- "Regional Champion" - Top 10 in continental leaderboard
- "Dedicated" - 7-day login streak
- "Curator" - Suggest your first landmark
- "Country Collector" - Visit all landmarks in one country
- "Continent Hopper" - Visit landmarks on 3 continents

### Premium Tier Badges
- "Global Legend" - Top 100 in global leaderboard
- "Marathon" - 30-day login streak
- "Influencer" - Get 100 upvotes on suggestions
- "Completionist" - Visit 100 landmarks
- "World Traveler" - Visit landmarks on all 6 continents

## 🎯 CHALLENGE IDEAS (Seed Data)

### Basic Tier Challenges (Monthly)
- "Temple Tour" - Visit 5 temples
- "Beach Bum" - Visit 3 coastal landmarks
- "History Buff" - Visit 5 historical sites
- "Modern Marvels" - Visit 3 modern landmarks
- "Natural Wonders" - Visit 5 natural landmarks

### Premium Tier Challenges (Weekly)
- "Speed Run" - Visit 3 landmarks in one day
- "Photo Perfect" - Upload 10 photos this week
- "Social Butterfly" - Add 3 new friends
- "Community Leader" - Get 20 upvotes on suggestions
- "Streak Master" - 7-day login streak

## 💾 DATABASE SCHEMA

### visits collection - Add monthly tracking
```javascript
{
  visit_id: "visit_123",
  user_id: "user_456",
  landmark_id: "landmark_789",
  photo_base64: "...",
  comments: "...",
  diary_notes: "...",
  visited_at: ISODate("2024-01-15"),
  month_year: "2024-01"  // For easy monthly counting
}
```

### badges collection
```javascript
{
  badge_id: "first_steps",
  name: "First Steps",
  description: "Visit your first landmark",
  icon: "🥾",
  tier_required: "free",
  category: "achievement",
  criteria: {
    type: "visit_count",
    target: 1
  },
  created_at: ISODate()
}
```

### user_badges collection
```javascript
{
  user_badge_id: "ub_123",
  user_id: "user_456",
  badge_id: "first_steps",
  earned_at: ISODate("2024-01-15"),
  progress: "1/1"
}
```

### challenges collection
```javascript
{
  challenge_id: "temple_tour_jan_2024",
  name: "Temple Tour",
  description: "Visit 5 temples this month",
  start_date: ISODate("2024-01-01"),
  end_date: ISODate("2024-01-31"),
  tier_required: "basic",
  reward_badge_id: "temple_master",
  criteria: {
    type: "category_visits",
    category: "temple",
    target_count: 5
  },
  created_at: ISODate()
}
```

### user_challenges collection
```javascript
{
  user_challenge_id: "uc_123",
  user_id: "user_456",
  challenge_id: "temple_tour_jan_2024",
  progress: 3,  // 3 out of 5
  completed: false,
  claimed: false,
  started_at: ISODate(),
  completed_at: null
}
```

## 🎨 UI/UX COMPONENTS NEEDED

### UpgradeModal
- Trigger points: visit limit, friend limit, feature restriction
- Show tier comparison
- Highlight blocked feature
- CTA: "Upgrade to Basic/Premium"

### TierBadge Component
- Small: Profile icon, leaderboard
- Large: Subscription screen
- Colors: Free (gray), Basic (blue), Premium (gold)

### BadgeCard Component
- Show badge icon, name, description
- Locked/unlocked state
- Progress bar for incomplete
- Shine animation when earned

### ChallengeCard Component
- Challenge name, description
- Progress bar
- Time remaining
- "Claim Reward" button
- Tier badge indicator

### FeatureComparisonTable
- 3 columns (Free, Basic, Premium)
- Checkmarks/X marks
- Highlight differences
- Used in subscription screen

## 📱 USER FLOWS

### Visit Limit Flow (Free User)
1. User marks 10th visit this month
2. Modal appears: "Monthly limit reached!"
3. Show: "You've used all 10 free visits this month"
4. CTA: "Upgrade to Basic for unlimited visits - $2.99/mo"
5. Button: "Upgrade Now" → Subscription screen
6. Button: "Maybe Later" → Dismiss

### Badge Earned Flow
1. User completes action (e.g., 5th visit)
2. Check if any badges earned
3. Show celebration modal with badge
4. Add badge to user's collection
5. Show in profile badge grid

### Challenge Progress Flow
1. User visits landmark
2. Check if landmark counts toward active challenges
3. Update challenge progress
4. If complete, show "Challenge Complete!" modal
5. Award badge/reward
6. Update challenges screen

## 🔐 TIER CHECKING HELPERS

```python
# Helper functions to add to server.py

def check_tier_access(user: User, required_tier: str) -> bool:
    """Check if user has access to tier-gated feature"""
    tier_hierarchy = {"free": 0, "basic": 1, "premium": 2}
    user_level = tier_hierarchy.get(user.subscription_tier, 0)
    required_level = tier_hierarchy.get(required_tier, 0)
    return user_level >= required_level

async def get_visit_limit_info(user: User) -> dict:
    """Get user's visit limit info"""
    if user.subscription_tier != "free":
        return {"has_limit": False, "used": 0, "limit": None}
    
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    used = await db.visits.count_documents({
        "user_id": user.user_id,
        "visited_at": {"$gte": start_of_month}
    })
    
    return {"has_limit": True, "used": used, "limit": 10, "remaining": max(0, 10 - used)}

async def get_friend_limit_info(user: User) -> dict:
    """Get user's friend limit info"""
    friend_count = await db.friends.count_documents({
        "$or": [
            {"user_id": user.user_id, "status": "accepted"},
            {"friend_id": user.user_id, "status": "accepted"}
        ]
    })
    
    limits = {"free": 5, "basic": 25, "premium": None}
    limit = limits[user.subscription_tier]
    has_limit = limit is not None
    
    return {
        "has_limit": has_limit,
        "used": friend_count,
        "limit": limit,
        "remaining": max(0, limit - friend_count) if has_limit else None
    }
```

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Database migration: Add subscription_tier to all users
- [ ] Seed badges database
- [ ] Seed initial challenges
- [ ] Update existing is_premium logic to use subscription_tier
- [ ] Test tier restrictions
- [ ] Test upgrade flows
- [ ] Configure payment provider (Stripe/RevenueCat)
- [ ] Set up webhook endpoints
- [ ] Test subscription lifecycle
- [ ] Add analytics tracking
- [ ] Update privacy policy/terms

## 📈 METRICS TO TRACK

- Free to Basic conversion rate
- Basic to Premium conversion rate
- Visit limit hit rate
- Friend limit hit rate
- Most common upgrade trigger
- Badge completion rate
- Challenge participation rate
- Average revenue per user (ARPU)
- Churn rate by tier
- Feature usage by tier

---

**Note:** This is a comprehensive guide. Implementation will be done in phases based on priority and complexity.
