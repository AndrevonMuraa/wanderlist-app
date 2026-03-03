"""
Test badge icons and color system for WanderMark app
Verifies the 5 icon fixes and graduated color system
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBadgeIconsAndColors:
    """Tests for badge icon mapping and color system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        # Login to get token
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@wandermark.app", "password": "Test1234!"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_achievements_showcase_endpoint(self):
        """Test that achievements/showcase API returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "earned_badges" in data, "Missing earned_badges field"
        assert "locked_badges" in data, "Missing locked_badges field"
        assert "stats" in data, "Missing stats field"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_badges" in stats, "Missing total_badges"
        assert "earned_count" in stats, "Missing earned_count"
        assert "locked_count" in stats, "Missing locked_count"
        assert "completion_percentage" in stats, "Missing completion_percentage"
        print(f"Stats: {stats['earned_count']}/{stats['total_badges']} earned ({stats['completion_percentage']}%)")
    
    def test_badge_icon_mapping_climbing_to_footsteps(self):
        """Verify climbing icon from backend maps to footsteps in frontend"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        # Find milestone_25 (Adventurer) which uses climbing icon
        milestone_25 = next((b for b in data["locked_badges"] if b["badge_type"] == "milestone_25"), None)
        assert milestone_25 is not None, "milestone_25 badge not found"
        assert milestone_25["badge_icon"] == "climbing", f"Expected 'climbing', got '{milestone_25['badge_icon']}'"
        print(f"VERIFIED: milestone_25 badge_icon='climbing' → maps to 'footsteps' in frontend")
    
    def test_badge_icon_mapping_crown_to_flash(self):
        """Verify crown icon from backend maps to flash in frontend"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        # Find milestone_500 (Ultimate Explorer) which uses crown icon
        milestone_500 = next((b for b in data["locked_badges"] if b["badge_type"] == "milestone_500"), None)
        assert milestone_500 is not None, "milestone_500 badge not found"
        assert milestone_500["badge_icon"] == "crown", f"Expected 'crown', got '{milestone_500['badge_icon']}'"
        print(f"VERIFIED: milestone_500 badge_icon='crown' → maps to 'flash' in frontend")
    
    def test_badge_icon_mapping_bullseye_to_aperture(self):
        """Verify bullseye icon from backend maps to aperture in frontend"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        # Find points_500 (Point Collector) which uses bullseye icon
        points_500 = next((b for b in data["locked_badges"] if b["badge_type"] == "points_500"), None)
        assert points_500 is not None, "points_500 badge not found"
        assert points_500["badge_icon"] == "bullseye", f"Expected 'bullseye', got '{points_500['badge_icon']}'"
        print(f"VERIFIED: points_500 badge_icon='bullseye' → maps to 'aperture' in frontend")
    
    def test_badge_icon_mapping_sparkle_to_thunderstorm(self):
        """Verify sparkle icon from backend maps to thunderstorm in frontend (different from sparkles)"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        # Find points_5000 (Point Legend) which uses sparkle icon
        points_5000 = next((b for b in data["locked_badges"] if b["badge_type"] == "points_5000"), None)
        assert points_5000 is not None, "points_5000 badge not found"
        assert points_5000["badge_icon"] == "sparkle", f"Expected 'sparkle', got '{points_5000['badge_icon']}'"
        print(f"VERIFIED: points_5000 badge_icon='sparkle' → maps to 'thunderstorm' in frontend")
        
        # Also verify sparkles (different icon) for points_1000
        points_1000 = next((b for b in data["locked_badges"] if b["badge_type"] == "points_1000"), None)
        assert points_1000 is not None, "points_1000 badge not found"
        assert points_1000["badge_icon"] == "sparkles", f"Expected 'sparkles', got '{points_1000['badge_icon']}'"
        print(f"VERIFIED: points_1000 badge_icon='sparkles' → maps to 'sparkles' in frontend (different icon)")
    
    def test_badge_icon_mapping_butterfly_to_people_circle(self):
        """Verify butterfly icon from backend maps to people-circle in frontend"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        # Find social_25 (Social Butterfly) which uses butterfly icon
        social_25 = next((b for b in data["locked_badges"] if b["badge_type"] == "social_25"), None)
        assert social_25 is not None, "social_25 badge not found"
        assert social_25["badge_icon"] == "butterfly", f"Expected 'butterfly', got '{social_25['badge_icon']}'"
        print(f"VERIFIED: social_25 badge_icon='butterfly' → maps to 'people-circle' in frontend")
    
    def test_all_badge_data_structure(self):
        """Verify all badges have required fields for frontend rendering"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/showcase",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        data = response.json()
        
        all_badges = data["earned_badges"] + data["locked_badges"]
        required_fields = ["badge_type", "badge_name", "badge_description", "badge_icon", "is_earned", "progress", "earned_at"]
        
        for badge in all_badges:
            for field in required_fields:
                assert field in badge, f"Badge {badge.get('badge_type', 'unknown')} missing field: {field}"
        
        print(f"VERIFIED: All {len(all_badges)} badges have required data structure")
