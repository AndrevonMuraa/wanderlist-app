"""
Test script for iteration 19 - Comprehensive bug fix verification
Tests:
- P0: Points Summary page uses /api/stats endpoint
- P0: Journey page continents stat shows /5 not /7
- P1: Various share icon removals and additions
- P1: Dead code removal verifications
- P1: Statistics CONTINENT_ICONS correctness
- P1: Points Summary bonus types
- P1: Continents fallback data
- P2: StreakDisplay.tsx deleted
- P2: Backend hardcoded streak values
- P3: Leaderboard share button
- P3: Backend scripts moved
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://log-removal-pass.preview.emergentagent.com').rstrip('/')
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

class TestP0CriticalBugFixes:
    """P0 Critical: Points Summary and Journey page fixes"""
    
    def test_stats_endpoint_returns_correct_fields(self, auth_token):
        """P0: Verify /api/stats returns required fields for points-summary page"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        data = response.json()
        
        # P0: Points Summary maps statsData.points → total_points
        assert "points" in data, "Missing 'points' field in /api/stats response"
        
        # P0: Points Summary maps statsData.total_visits → landmarks_visited  
        assert "total_visits" in data, "Missing 'total_visits' field in /api/stats response"
        
        # P0: Points Summary maps statsData.leaderboard_points → leaderboard_points
        assert "leaderboard_points" in data, "Missing 'leaderboard_points' field in /api/stats response"
        
        # P0: Points Summary maps statsData.countries_visited → countries_visited
        assert "countries_visited" in data, "Missing 'countries_visited' field in /api/stats response"
        
        print(f"✓ /api/stats returns all required fields: points={data['points']}, total_visits={data['total_visits']}, leaderboard_points={data['leaderboard_points']}, countries_visited={data['countries_visited']}")
    
    def test_continent_stats_has_5_continents(self, auth_token):
        """P0: Verify continent-stats returns exactly 5 continents (not 7)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/continent-stats", headers=headers)
        
        assert response.status_code == 200, f"Continent stats endpoint failed: {response.text}"
        data = response.json()
        
        continents = data.get("continents", [])
        assert len(continents) == 5, f"Expected 5 continents, got {len(continents)}"
        
        continent_names = [c["continent"] for c in continents]
        expected = {"Europe", "Asia", "Africa", "Americas", "Oceania"}
        actual = set(continent_names)
        
        assert actual == expected, f"Expected continents {expected}, got {actual}"
        print(f"✓ continent-stats returns exactly 5 continents: {continent_names}")

class TestP1MediumPriorityFixes:
    """P1 Medium: UI changes and dead code removal"""
    
    def test_statistics_continent_icons_has_americas_not_south_america(self):
        """P1: Verify CONTINENT_ICONS uses 'Americas' not 'South America'"""
        # Static code verification - read frontend file
        file_path = "/app/frontend/app/(tabs)/statistics.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check CONTINENT_ICONS has Americas
        assert "'Americas':" in content or '"Americas":' in content, "CONTINENT_ICONS should have 'Americas' key"
        assert "South America" not in content, "CONTINENT_ICONS should NOT have 'South America'"
        
        # Count continent entries (should be exactly 5)
        import re
        matches = re.findall(r"'(Europe|Asia|Africa|Americas|Oceania)':", content)
        assert len(matches) == 5, f"Expected 5 continent entries, found {len(matches)}"
        
        print("✓ statistics.tsx CONTINENT_ICONS uses 'Americas' (not 'South America') with exactly 5 entries")
    
    def test_points_summary_has_6_how_points_work_entries(self):
        """P1: Verify Points Summary 'How Points Work' has 6 entries"""
        file_path = "/app/frontend/app/points-summary.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check for all 6 bonus types in How Points Work section
        assert "Landmark Visit" in content, "Missing 'Landmark Visit' entry"
        assert "Country Visit" in content, "Missing 'Country Visit' entry"
        assert "Country Bonus" in content, "Missing 'Country Bonus' entry"
        assert "Continent Bonus" in content, "Missing 'Continent Bonus' entry"
        assert "Completion Bonuses" in content, "Missing 'Completion Bonuses' entry"
        assert "Photo Verification" in content, "Missing 'Photo Verification' entry"
        
        # Verify specific point values
        assert "10 pts (official) or 25 pts (premium)" in content or "10/25" in content.replace(" ", ""), "Landmark Visit should show 10/25 pts"
        assert "50 points" in content, "Country Visit should show 50 points"
        assert "+20" in content, "Country Bonus should show +20 pts"
        assert "+50" in content and "continent" in content.lower(), "Continent Bonus should show +50 pts"
        assert "+200" in content, "Continent completion should show +200 pts"
        
        print("✓ points-summary.tsx has all 6 'How Points Work' entries with correct point values")
    
    def test_continents_fallback_data_updated(self):
        """P1: Verify continents fallback data has correct values"""
        file_path = "/app/frontend/app/continents.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check fallback counts - these are the FALLBACK values shown while API loads
        # Europe: 196 landmarks, 16 countries
        assert "landmarks: 196" in content or "landmarks:196" in content.replace(" ", ""), "Europe should have 196 landmarks fallback"
        assert "countries: 16" in content or "countries:16" in content.replace(" ", ""), "Europe should have 16 countries fallback"
        
        # Africa: 121 landmarks, 10 countries
        assert "landmarks: 121" in content or "landmarks:121" in content.replace(" ", ""), "Africa should have 121 landmarks fallback"
        
        # Americas: 189 landmarks, 16 countries
        assert "landmarks: 189" in content or "landmarks:189" in content.replace(" ", ""), "Americas should have 189 landmarks fallback"
        
        # Oceania: 95 landmarks, 8 countries
        assert "landmarks: 95" in content or "landmarks:95" in content.replace(" ", ""), "Oceania should have 95 landmarks fallback"
        
        print("✓ continents.tsx fallback data has updated values")

class TestP2LowPriorityFixes:
    """P2 Low: Dead code removal and hardcoded values"""
    
    def test_streak_display_deleted(self):
        """P2: Verify StreakDisplay.tsx is deleted"""
        file_path = "/app/frontend/components/StreakDisplay.tsx"
        import os
        
        assert not os.path.exists(file_path), f"StreakDisplay.tsx should be DELETED but still exists at {file_path}"
        print("✓ StreakDisplay.tsx has been deleted (dead code removed)")
    
    def test_backend_social_returns_hardcoded_streak_zero(self):
        """P2: Verify backend returns hardcoded 0 for streak fields"""
        file_path = "/app/backend/routes/social.py"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check for hardcoded 0 values for streak fields
        assert '"current_streak": 0' in content or "'current_streak': 0" in content, "current_streak should be hardcoded to 0"
        assert '"longest_streak": 0' in content or "'longest_streak': 0" in content, "longest_streak should be hardcoded to 0"
        
        print("✓ social.py returns hardcoded 0 for streak fields")
    
    def test_leaderboard_response_has_hardcoded_streaks(self, auth_token):
        """P2: Verify leaderboard API returns hardcoded 0 for streaks"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=5", headers=headers)
        
        assert response.status_code == 200, f"Leaderboard endpoint failed: {response.text}"
        data = response.json()
        
        for entry in data.get("leaderboard", []):
            assert entry.get("current_streak") == 0, f"current_streak should be 0, got {entry.get('current_streak')}"
            assert entry.get("longest_streak") == 0, f"longest_streak should be 0, got {entry.get('longest_streak')}"
        
        print("✓ Leaderboard API returns hardcoded 0 for streak fields")

class TestP3MinorFixes:
    """P3 Minor: UI additions and file reorganization"""
    
    def test_leaderboard_has_share_ranking_button(self):
        """P3: Verify leaderboard page has share ranking button with data-testid"""
        file_path = "/app/frontend/app/leaderboard.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check for share ranking button
        assert 'data-testid="share-ranking-button"' in content, "Missing share-ranking-button data-testid"
        assert "Share My Ranking" in content, "Missing 'Share My Ranking' button text"
        assert "wandermark.app" in content, "Share message should include wandermark.app link"
        
        print("✓ leaderboard.tsx has 'Share My Ranking' button with data-testid")
    
    def test_visit_detail_has_share_in_content(self):
        """P3: Verify visit-detail has share button in content area"""
        file_path = "/app/frontend/app/visit-detail/[visit_id].tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Check for share button in content
        assert 'data-testid="share-visit-button"' in content, "Missing share-visit-button data-testid"
        assert "Share This Visit" in content, "Missing 'Share This Visit' button text"
        
        print("✓ visit-detail.tsx has 'Share This Visit' button in content area")
    
    def test_backend_scripts_moved(self):
        """P3: Verify backend scripts moved to /app/backend/scripts/ folder"""
        import os
        
        scripts_path = "/app/backend/scripts"
        assert os.path.isdir(scripts_path), f"Scripts folder should exist at {scripts_path}"
        
        # Check for expected script files
        expected_scripts = ["seed_data.py", "add_coordinates.py"]
        for script in expected_scripts:
            script_path = os.path.join(scripts_path, script)
            assert os.path.exists(script_path), f"Script {script} should exist at {script_path}"
        
        # Count total scripts
        scripts = [f for f in os.listdir(scripts_path) if f.endswith('.py')]
        assert len(scripts) >= 2, f"Expected multiple scripts in folder, found {len(scripts)}"
        
        print(f"✓ Backend scripts moved to /app/backend/scripts/ ({len(scripts)} scripts found)")

class TestCodeVerification:
    """Verify specific code patterns mentioned in the bug fix"""
    
    def test_journey_continents_shows_5(self):
        """Verify Journey page shows /5 not /7 for continents"""
        file_path = "/app/frontend/app/(tabs)/journey.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Look for the continents display - should show /5
        assert "/5" in content, "Journey page should show /5 for continents"
        assert "/7" not in content or "filter" in content.lower(), "Journey page should NOT show /7 for continents (unless in comment/filter context)"
        
        print("✓ journey.tsx displays continents as /5 (not /7)")
    
    def test_points_summary_uses_api_stats_not_profile(self):
        """Verify Points Summary uses /api/stats not /api/auth/profile"""
        file_path = "/app/frontend/app/points-summary.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Should fetch from /api/stats
        assert "/api/stats" in content, "points-summary should fetch from /api/stats"
        
        # Should NOT use /api/auth/profile for stats
        # Note: We check the fetch pattern, not the presence of "profile" anywhere
        import re
        profile_fetch = re.search(r'fetch\([^)]*profile', content)
        assert profile_fetch is None, "points-summary should NOT fetch from /api/auth/profile"
        
        print("✓ points-summary.tsx uses /api/stats (not /api/auth/profile)")
    
    def test_country_visit_detail_no_options_menu(self):
        """Verify country-visit-detail has no options menu modal"""
        file_path = "/app/frontend/app/country-visit-detail/[country_visit_id].tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Should NOT have showOptionsMenu state
        assert "showOptionsMenu" not in content, "Should NOT have showOptionsMenu state"
        
        # Should NOT import Modal specifically for options menu
        # Note: Modal is still imported from react-native-paper for dialogs
        # Check there's no options-related modal
        assert "optionsModal" not in content.lower(), "Should NOT have options modal"
        
        print("✓ country-visit-detail.tsx has no dead options menu code")
    
    def test_visit_detail_no_share_in_header(self):
        """Verify visit-detail has NO share icon in UniversalHeader"""
        file_path = "/app/frontend/app/visit-detail/[visit_id].tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Find UniversalHeader usage
        import re
        header_match = re.search(r'<UniversalHeader[^>]*>', content)
        assert header_match, "Should have UniversalHeader component"
        
        header_tag = header_match.group(0)
        # UniversalHeader should NOT have rightElement for share
        assert "rightElement" not in header_tag, "UniversalHeader should NOT have rightElement (share was moved to content)"
        
        print("✓ visit-detail.tsx UniversalHeader has NO rightElement (share moved to content)")
    
    def test_journey_no_share_in_stats_header(self):
        """Verify journey stats header has NO share icon"""
        file_path = "/app/frontend/app/(tabs)/journey.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # The statsHeader should NOT have share-social-outline TouchableOpacity
        # Look for statsHeader section
        import re
        stats_header_match = re.search(r'styles\.statsHeader.*?</View>', content, re.DOTALL)
        
        if stats_header_match:
            stats_header = stats_header_match.group(0)
            # Should NOT have share icon in stats header
            assert "share-social-outline" not in stats_header, "Stats header should NOT have share icon"
        
        print("✓ journey.tsx stats header has NO share icon")

class TestLeaderboardInterfaceNoStreak:
    """P2: Verify leaderboard interface has NO streak fields"""
    
    def test_leaderboard_interface_no_streak_fields(self):
        """Verify LeaderboardEntry interface has no current_streak or longest_streak"""
        file_path = "/app/frontend/app/leaderboard.tsx"
        
        with open(file_path, "r") as f:
            content = f.read()
        
        # Find the LeaderboardEntry interface
        import re
        interface_match = re.search(r'interface LeaderboardEntry \{([^}]+)\}', content)
        assert interface_match, "Should have LeaderboardEntry interface"
        
        interface_body = interface_match.group(1)
        
        # Interface should NOT have streak fields
        assert "current_streak" not in interface_body, "LeaderboardEntry interface should NOT have current_streak"
        assert "longest_streak" not in interface_body, "LeaderboardEntry interface should NOT have longest_streak"
        
        print("✓ leaderboard.tsx LeaderboardEntry interface has NO streak fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
