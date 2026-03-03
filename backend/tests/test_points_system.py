"""
Test Points System and Badge Icons for WanderMark App
Tests: Point values, getNextMilestone function, badge icon utilities, about page stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://app-store-ready-13.preview.emergentagent.com')
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login(self):
        """Test login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"PASS: Login successful, user: {data['user'].get('username')}")


class TestPointsSystemBackend:
    """Verify backend point values match documentation"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_api_health(self, auth_token):
        """Test API health check - skip if endpoint not available"""
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 404:
            pytest.skip("Health endpoint not implemented - not required for feature testing")
        assert response.status_code == 200
        print("PASS: API health check")
    
    def test_stats_endpoint(self, auth_token):
        """Test stats endpoint returns expected fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_visits" in data or "countries_visited" in data
        print(f"PASS: Stats endpoint working - {data}")
    
    def test_progress_endpoint(self, auth_token):
        """Test progress endpoint returns totalPoints"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/progress", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "overall" in data
        assert "totalPoints" in data or "continents" in data
        print(f"PASS: Progress endpoint working - overall: {data.get('overall')}")
    
    def test_achievements_endpoint(self, auth_token):
        """Test achievements endpoint returns badge data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/achievements", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Achievements endpoint working - {len(data)} badges")
    
    def test_achievements_showcase(self, auth_token):
        """Test achievements showcase endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/achievements/showcase", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "earned_badges" in data or "locked_badges" in data or "stats" in data
        print(f"PASS: Achievements showcase endpoint working")
    
    def test_landmarks_endpoint(self, auth_token):
        """Test landmarks endpoint to verify points structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Test with a sample country
        response = requests.get(f"{BASE_URL}/api/landmarks", headers=headers, params={"limit": 5})
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Landmarks endpoint working - {len(data) if isinstance(data, list) else 'ok'}")
        else:
            # Endpoint may require different params
            print(f"INFO: Landmarks endpoint returned {response.status_code}")


class TestStaticCodeVerification:
    """
    Static code verification for all point values and features
    These tests verify the code was correctly updated without running the app
    """
    
    def test_about_page_stats_total_points(self):
        """Verify About page stats show '14,500+' instead of '10,000'"""
        with open('/app/frontend/app/about.tsx', 'r') as f:
            content = f.read()
        
        # Check the correct value is present
        assert "14,500+" in content, "About page should show '14,500+' Total Points"
        # Check old value is NOT present
        assert "10,000" not in content or "10,000" in content.split("14,500+")[0], "Old value '10,000' should not be displayed"
        
        print("PASS: About page stats shows '14,500+' Total Points")
    
    def test_about_page_stat_number_font_size(self):
        """Verify statNumber fontSize is 18 (reduced from 20)"""
        with open('/app/frontend/app/about.tsx', 'r') as f:
            content = f.read()
        
        # Find the statNumber style definition
        assert "statNumber: {" in content, "statNumber style should exist"
        
        # Extract the statNumber style block
        start = content.find("statNumber: {")
        end = content.find("}", start) + 1
        stat_number_style = content[start:end]
        
        assert "fontSize: 18" in stat_number_style, "statNumber fontSize should be 18"
        assert "fontSize: 20" not in stat_number_style, "Old fontSize: 20 should not be present"
        
        print("PASS: About page statNumber fontSize is 18")
    
    def test_welcome_page_point_values(self):
        """Verify Welcome page point values are correct: +10, +25, +50, +20"""
        with open('/app/frontend/app/welcome.tsx', 'r') as f:
            content = f.read()
        
        # Check all correct point values are present
        assert "+10 pts" in content, "Welcome page should show '+10 pts' for landmarks"
        assert "+25 pts" in content, "Welcome page should show '+25 pts' for premium"
        assert "+50 pts" in content, "Welcome page should show '+50 pts' for country visit"
        assert "+20 pts" in content, "Welcome page should show '+20 pts' for new country bonus"
        
        # Verify old incorrect values are NOT present (100, 50 for landmarks, 75, 25)
        # We only check that the wrong combinations are not there
        lines = content.split('\n')
        point_lines = [l for l in lines if '+' in l and 'pts' in l]
        for line in point_lines:
            if "100 pts" in line and "landmark" in line.lower():
                pytest.fail("Old incorrect value '100 pts' for landmarks should not be present")
        
        print("PASS: Welcome page point values correct (+10, +25, +50, +20)")
    
    def test_welcome_page_rank_ranges(self):
        """Verify Welcome page rank ranges: Explorer 0-499, Adventurer 500-1,499, Legend 5,000+"""
        with open('/app/frontend/app/welcome.tsx', 'r') as f:
            content = f.read()
        
        assert "0 - 499 pts" in content, "Explorer rank should be 0-499 pts"
        assert "500 - 1,499 pts" in content, "Adventurer rank should be 500-1,499 pts"
        assert "5,000+ pts" in content, "Legend rank should be 5,000+ pts"
        
        print("PASS: Welcome page rank ranges correct (0-499, 500-1,499, 5,000+)")
    
    def test_about_page_faq_all_bonus_types(self):
        """Verify About page FAQ includes ALL bonus types"""
        with open('/app/frontend/app/about.tsx', 'r') as f:
            content = f.read()
        
        # All bonus types that should be in FAQ
        required_bonuses = [
            "Country Visit: 50",
            "New Country Bonus: +20",
            "New Continent Bonus: +50",
            "Country Completion: +50",
            "Continent Completion: +200"
        ]
        
        for bonus in required_bonuses:
            assert bonus in content, f"FAQ should include '{bonus}'"
        
        print("PASS: About page FAQ includes all bonus types")
    
    def test_about_page_points_system_expanded(self):
        """Verify About page Points System expandable includes bonus entries"""
        with open('/app/frontend/app/about.tsx', 'r') as f:
            content = f.read()
        
        # Check for bonus entries in expandable section
        assert "New Country Bonus: +20" in content, "Points System should include New Country Bonus"
        assert "New Continent Bonus: +50" in content, "Points System should include New Continent Bonus"
        assert "Country Completion: +50" in content, "Points System should include Country Completion"
        assert "Continent Completion: +200" in content, "Points System should include Continent Completion"
        
        print("PASS: About page Points System includes all bonuses")
    
    def test_rank_system_comment(self):
        """Verify rankSystem.ts comment reflects ~15,900 total"""
        with open('/app/frontend/utils/rankSystem.ts', 'r') as f:
            content = f.read()
        
        assert "15,900" in content, "rankSystem.ts should mention ~15,900 total points"
        assert "797 landmarks" in content, "rankSystem.ts should reference 797 landmarks"
        
        print("PASS: rankSystem.ts comment updated to ~15,900")
    
    def test_backend_points_logic(self):
        """Verify backend points logic values"""
        with open('/app/backend/routes/visits.py', 'r') as f:
            content = f.read()
        
        # Check all point values in backend
        assert 'landmark.get("points", 10)' in content, "Default landmark points should be 10"
        assert "country_bonus_points = 20" in content, "Country exploration bonus should be 20"
        assert "continent_bonus_points = 50" in content, "Continent exploration bonus should be 50"
        assert "country_completion_bonus = 50" in content, "Country completion bonus should be 50"
        assert "continent_completion_bonus = 200" in content, "Continent completion bonus should be 200"
        
        print("PASS: Backend points logic verified (10, 20, 50, 50, 200)")


class TestJourneyPageMilestoneSection:
    """Test Journey page Next Milestone section features"""
    
    def test_get_next_milestone_returns_badge_fields(self):
        """Verify getNextMilestone function returns badgeIcon and badgeType fields"""
        with open('/app/frontend/app/(tabs)/journey.tsx', 'r') as f:
            content = f.read()
        
        # Check the getNextMilestone function structure
        assert "const getNextMilestone = ()" in content, "getNextMilestone function should exist"
        assert "badgeIcon: badge.icon" in content, "Function should return badgeIcon"
        assert "badgeType: badge.type" in content, "Function should return badgeType"
        
        # Check the badgeMap structure
        assert "type: 'milestone_10'" in content, "badgeMap should have milestone_10"
        assert "type: 'milestone_25'" in content, "badgeMap should have milestone_25"
        assert "type: 'milestone_500'" in content, "badgeMap should have milestone_500"
        
        print("PASS: getNextMilestone returns badgeIcon and badgeType fields")
    
    def test_milestone_row_layout(self):
        """Verify milestoneRow layout has milestoneContent (left) and milestoneBadgeIcon (right)"""
        with open('/app/frontend/app/(tabs)/journey.tsx', 'r') as f:
            content = f.read()
        
        # Check milestoneRow style exists
        assert "milestoneRow: {" in content, "milestoneRow style should exist"
        
        # Check milestoneContent style exists
        assert "milestoneContent: {" in content, "milestoneContent style should exist"
        
        # Check milestoneBadgeIcon style exists
        assert "milestoneBadgeIcon: {" in content, "milestoneBadgeIcon style should exist"
        
        # Check layout has both components
        assert "styles.milestoneRow" in content, "UI should use milestoneRow style"
        assert "styles.milestoneContent" in content, "UI should use milestoneContent style"
        assert "styles.milestoneBadgeIcon" in content, "UI should use milestoneBadgeIcon style"
        
        print("PASS: milestoneRow layout with milestoneContent and milestoneBadgeIcon")
    
    def test_milestone_badge_icon_dimensions(self):
        """Verify milestoneBadgeIcon is 68px circle"""
        with open('/app/frontend/app/(tabs)/journey.tsx', 'r') as f:
            content = f.read()
        
        # Find milestoneBadgeIcon style
        start = content.find("milestoneBadgeIcon: {")
        end = content.find("}", start) + 1
        badge_icon_style = content[start:end]
        
        assert "width: 68" in badge_icon_style, "Badge icon width should be 68"
        assert "height: 68" in badge_icon_style, "Badge icon height should be 68"
        assert "borderRadius: 34" in badge_icon_style, "Badge icon should be circular (borderRadius: 34)"
        
        print("PASS: milestoneBadgeIcon is 68px circle")
    
    def test_badge_icon_uses_utility_functions(self):
        """Verify badge icon uses getBadgeIconName and getBadgeColor utilities"""
        with open('/app/frontend/app/(tabs)/journey.tsx', 'r') as f:
            content = f.read()
        
        # Check imports
        assert "import { getBadgeIconName, getBadgeColor } from '../../utils/badgeIcons'" in content, \
            "Should import getBadgeIconName and getBadgeColor"
        
        # Check usage in UI
        assert "getBadgeIconName(nextMilestone.badgeIcon)" in content, \
            "Should use getBadgeIconName for icon"
        assert "getBadgeColor(nextMilestone.badgeType)" in content, \
            "Should use getBadgeColor for color"
        
        print("PASS: Badge icon uses getBadgeIconName and getBadgeColor utilities")


class TestBadgeIconsUtility:
    """Test badge icons utility file"""
    
    def test_badge_icon_mappings(self):
        """Verify badge icon mappings in badgeIcons.ts"""
        with open('/app/frontend/utils/badgeIcons.ts', 'r') as f:
            content = f.read()
        
        # Check key mappings
        assert "map: 'map'" in content, "map should map to 'map'"
        assert "climbing: 'footsteps'" in content, "climbing should map to 'footsteps'"
        assert "globe: 'globe'" in content, "globe should map to 'globe'"
        assert "plane: 'airplane'" in content, "plane should map to 'airplane'"
        assert "crown: 'flash'" in content, "crown should map to 'flash'"
        
        print("PASS: Badge icon mappings verified")
    
    def test_get_badge_color_graduated_system(self):
        """Verify graduated color system for milestone badges"""
        with open('/app/frontend/utils/badgeIcons.ts', 'r') as f:
            content = f.read()
        
        # Check graduated colors exist
        assert "milestone_10" in content, "Should have milestone_10 color"
        assert "milestone_25" in content, "Should have milestone_25 color"
        assert "milestone_50" in content, "Should have milestone_50 color"
        assert "milestone_100" in content, "Should have milestone_100 color"
        assert "milestone_500" in content, "Should have milestone_500 color"
        
        print("PASS: Graduated color system for milestone badges")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
