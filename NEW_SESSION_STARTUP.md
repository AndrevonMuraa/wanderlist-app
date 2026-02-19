# 🚀 WanderList - New Session Startup Guide

**Copy this entire message into your new Pro subscription chat:**

---

## 📦 STEP 1: Pull Project from GitHub

```
Hi! Please help me pull my WanderList project from GitHub.

Repository URL: [YOUR-GITHUB-URL-HERE]
Branch: main

After cloning, please:
1. Check that all files are present
2. Verify services status
3. Confirm you can read the key documentation files
```

**Replace `[YOUR-GITHUB-URL-HERE]` with your actual GitHub repository URL** (e.g., `https://github.com/yourusername/wanderlist-app`)

---

## 📚 STEP 2: Read Key Documentation (15 min)

After pulling, the agent should read these files in order:

1. **`/app/PROJECT_STATUS.md`** (10 min)
   - Complete project overview
   - Current state: v4.18, 70% to launch
   - Tech stack, features, testing status

2. **`/app/DEVELOPMENT_ROADMAP.md`** (5 min)
   - Focus on v4.19 section (Landmark Reviews & Ratings)
   - Timeline, implementation details, success metrics

3. **`/app/WORKFLOW_OPTIMIZATION.md`** (skim)
   - Optimized session workflow
   - Development patterns and templates

4. **`/app/test_result.md`** (last 100 lines)
   - Recent testing history and protocols

---

## 🎯 STEP 3: Start Development - v4.19

**Your Task:**
Build **v4.19 - Landmark Reviews & Ratings**

**Estimated Time:** 3-4 hours (following optimized workflow)

**Implementation Plan:**

### **Backend (40 min):**
Add to `/app/backend/server.py`:

**Review Model:**
```python
class Review(BaseModel):
    review_id: str
    landmark_id: str
    user_id: str
    rating: int  # 1-5 stars
    review_text: str
    photos: List[str] = []
    helpful_votes: int = 0
    created_at: datetime
```

**Endpoints to Create:**
1. `POST /api/landmarks/{landmark_id}/reviews` - Submit review
2. `GET /api/landmarks/{landmark_id}/reviews?sort=recent&limit=20` - List reviews
3. `PUT /api/reviews/{review_id}/helpful` - Vote helpful
4. Update `GET /api/landmarks` to include:
   - `average_rating: float`
   - `review_count: int`

**After implementation:**
- Restart: `sudo supervisorctl restart backend`
- Test with `deep_testing_backend_v2` (20 min, comprehensive test plan)

### **Frontend (50 min):**

**Components to Create:**

1. **StarRating Component** (`/app/frontend/components/StarRating.tsx`)
   - Display 1-5 stars
   - Interactive (tap to select rating)
   - Show average rating (half-star support)

2. **ReviewForm Modal** (`/app/frontend/components/ReviewForm.tsx`)
   - Star rating selector
   - Text area (500 char limit)
   - Optional photo upload (up to 3 photos)
   - Submit button

**Screens to Update:**

3. **Landmark Detail Page** (existing screen)
   - Add star rating display (average)
   - Add "Write Review" button
   - Add reviews list section
   - Sort dropdown (Recent, Top Rated, Most Helpful)
   - Helpful vote buttons

**After implementation:**
- Restart: `sudo supervisorctl restart expo`
- Test with `expo_frontend_testing_agent` (20 min, detailed test plan)

### **Documentation (15 min):**
- Update `/app/test_result.md` (task status)
- Update `/app/WANDERLIST_BASELINE_MODEL.md` (add v4.19 section)
- Add agent communication entry

---

## ✅ STEP 4: Quality Gates

Before finishing, verify:
- [ ] Backend tested with agent (target: 90%+ pass rate)
- [ ] Frontend tested with agent (all critical flows work)
- [ ] 5-star rating system functional
- [ ] Review submission works (text + photos)
- [ ] Reviews display on landmark pages
- [ ] Helpful vote system works
- [ ] Sorting options work (Recent, Top Rated, Most Helpful)
- [ ] All documentation updated
- [ ] Services stable (no crashes)
- [ ] Code committed to git
- [ ] Changes pushed to GitHub

---

## 🔑 QUICK REFERENCE

**Services:**
```bash
sudo supervisorctl status              # Check all
sudo supervisorctl restart backend expo # Restart
tail -f /var/log/supervisor/backend.out.log  # Backend logs
tail -f /var/log/supervisor/expo.out.log     # Frontend logs
```

**Test User:**
- Email: `mobile@test.com`
- Password: `test123`
- Tier: Basic (messaging enabled)

**Database:**
- MongoDB running locally
- Connection string in `/app/backend/.env`

**Design System:**
- Primary: `#667eea`
- Use `<Surface>` for cards
- Use `<LinearGradient>` for CTAs
- Follow patterns from Achievement Showcase (v4.17) and Visit Flow (v4.18)

---

## 📊 SUCCESS METRICS

**After this session:**
- ✅ v4.19 complete and tested
- ✅ Users can rate landmarks (1-5 stars)
- ✅ Users can write reviews with photos
- ✅ Reviews display on landmark pages
- ✅ Sorting and helpful votes work
- ✅ All tests passing
- ✅ Ready for v4.20 (Stats Dashboard)

---

## 🎯 OPTIMIZATION TIPS

**From WORKFLOW_OPTIMIZATION.md:**

1. **Batch operations** - Implement all endpoints at once
2. **Use templates** - Copy from similar components
3. **Test early** - Don't wait until 100% done
4. **Follow patterns** - Reuse established designs
5. **Call troubleshoot_agent after 3 failures** - Don't loop
6. **Document as you go** - Update files incrementally

**Session Pattern:**
- 15 min: Startup + confirm with user
- 60 min: Backend development + testing
- 70 min: Frontend development + testing
- 25 min: Documentation + finishing

**Total: ~3 hours for complete feature**

---

## 📝 NEW HANDOVER WORKFLOW

Before calling `finish`, confirm:
1. ✅ Work aligns with WanderList baseline model?
2. ✅ Version summary ready? (v4.19 complete, v4.20 next)
3. ✅ All testing passed?
4. ✅ Changes committed and pushed to GitHub?

Then provide comprehensive finish summary with:
- What was built
- Testing results (backend + frontend)
- Impact statement
- Next action items

---

## 🚀 AFTER v4.19

**Next Features (Phase 4):**
- v4.20: Advanced Stats Dashboard (Week 12, 2-3 hours)
- v4.21: Photo Gallery Management (Week 13, 2 hours)
- v4.22: Search & Discovery (Week 14, 2-3 hours)
- v4.23: Profile Enhancements (Week 15, 2 hours)
- v4.24: Polish & Bug Fixes (Week 16, 3-4 hours)

**Then:**
- Phase 5: Launch Prep (Weeks 17-19)
- Phase 6: Launch (Week 20+)

**Goal:** App Store + Play Store launch in 8-12 weeks

---

## 💡 PROJECT CONTEXT

**WanderList** is a gamified social travel tracking app (70% complete):
- **Stack:** Expo/React Native + FastAPI + MongoDB
- **Content:** 48 countries, 480 landmarks
- **Features:** 18 versions (v1.0-v4.18) complete
- **Status:** Backend 95%, Frontend 85% production-ready
- **Next:** 6 more features to launch

**Recent Completions:**
- v4.17: Achievement Showcase (earned/locked badges, progress bars)
- v4.18: Streamlined Visit Flow (Quick/Detailed modes)

**Your Mission:**
Build v4.19 - Reviews & Ratings to enable trust and discovery

---

## 🎉 READY TO START!

1. Pull project from GitHub
2. Read key docs (15 min)
3. Confirm plan with user
4. Build v4.19 (3-4 hours)
5. Push to GitHub
6. Finish with summary

**Let's build something world-class!** 🚀

---

**End of startup guide. Please confirm you have the project loaded and are ready to proceed.**
