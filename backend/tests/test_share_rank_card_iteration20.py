"""
Test Suite for ShareRankCard Feature (Iteration 20)
Tests: /api/auth/me, /api/stats, /api/leaderboard endpoints
Required for visual share card functionality in leaderboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestShareRankCardAPIs:
    """Backend APIs required for ShareRankCard feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_returns_user_info(self):
        """Test login endpoint returns user info with name/username"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify user object exists
        assert "user" in data
        user = data["user"]
        
        # Verify name and username fields exist (required for ShareRankCard)
        assert "name" in user or "username" in user, "User must have name or username"
        print(f"✓ Login returns user with name: {user.get('name')}, username: {user.get('username')}")
    
    def test_auth_me_returns_name_fields(self, auth_token):
        """/api/auth/me should return name and username for ShareRankCard userName prop"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET /api/auth/me failed: {response.text}"
        data = response.json()
        
        # Verify name and username fields
        assert "name" in data, "Response missing 'name' field"
        assert "username" in data, "Response missing 'username' field"
        
        # At least one should be non-empty for display
        has_display_name = bool(data.get("name")) or bool(data.get("username"))
        assert has_display_name, "User should have at least a name or username"
        
        print(f"✓ /api/auth/me returns name: '{data.get('name')}', username: '{data.get('username')}'")
    
    def test_stats_returns_points_data(self, auth_token):
        """/api/stats should return points and leaderboard_points for ShareRankCard value prop"""
        response = requests.get(
            f"{BASE_URL}/api/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET /api/stats failed: {response.text}"
        data = response.json()
        
        # Verify points fields exist (required for ShareRankCard userValue)
        assert "points" in data, "Response missing 'points' field"
        
        # leaderboard_points should exist for points category
        assert "leaderboard_points" in data, "Response missing 'leaderboard_points' field"
        
        # For visits category
        assert "total_visits" in data, "Response missing 'total_visits' field"
        
        # For countries category
        assert "countries_visited" in data, "Response missing 'countries_visited' field"
        
        print(f"✓ /api/stats returns points: {data.get('points')}, leaderboard_points: {data.get('leaderboard_points')}, total_visits: {data.get('total_visits')}, countries_visited: {data.get('countries_visited')}")
    
    def test_leaderboard_returns_rank_data(self, auth_token):
        """/api/leaderboard should return user_rank and total_users for ShareRankCard props"""
        response = requests.get(
            f"{BASE_URL}/api/leaderboard",
            params={"time_period": "all_time", "category": "points", "friends_only": "false"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET /api/leaderboard failed: {response.text}"
        data = response.json()
        
        # Verify required fields for ShareRankCard
        assert "user_rank" in data, "Response missing 'user_rank' field"
        assert "total_users" in data, "Response missing 'total_users' field"
        assert "leaderboard" in data, "Response missing 'leaderboard' field"
        
        # total_users should be a positive integer
        assert isinstance(data["total_users"], int), "total_users should be an integer"
        assert data["total_users"] >= 0, "total_users should be non-negative"
        
        print(f"✓ /api/leaderboard returns user_rank: {data.get('user_rank')}, total_users: {data.get('total_users')}, leaderboard entries: {len(data.get('leaderboard', []))}")
    
    def test_leaderboard_categories(self, auth_token):
        """Test all leaderboard categories work (points, visits, countries)"""
        categories = ["points", "visits", "countries"]
        
        for category in categories:
            response = requests.get(
                f"{BASE_URL}/api/leaderboard",
                params={"time_period": "all_time", "category": category, "friends_only": "false"},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200, f"GET /api/leaderboard?category={category} failed: {response.text}"
            data = response.json()
            assert "leaderboard" in data, f"Category {category} missing leaderboard"
            print(f"✓ Leaderboard category '{category}' works correctly")
    
    def test_leaderboard_time_periods(self, auth_token):
        """Test all leaderboard time periods work (all_time, monthly, weekly)"""
        time_periods = ["all_time", "monthly", "weekly"]
        
        for period in time_periods:
            response = requests.get(
                f"{BASE_URL}/api/leaderboard",
                params={"time_period": period, "category": "points", "friends_only": "false"},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200, f"GET /api/leaderboard?time_period={period} failed: {response.text}"
            data = response.json()
            assert "leaderboard" in data, f"Time period {period} missing leaderboard"
            print(f"✓ Leaderboard time period '{period}' works correctly")


class TestShareRankCardStaticCodeAnalysis:
    """Static code verification for ShareRankCard component"""
    
    def test_share_rank_card_file_exists(self):
        """Verify ShareRankCard.tsx exists"""
        import os
        path = "/app/frontend/components/ShareRankCard.tsx"
        assert os.path.exists(path), f"ShareRankCard.tsx not found at {path}"
        print(f"✓ ShareRankCard.tsx exists")
    
    def test_share_rank_card_imports(self):
        """Verify required imports in ShareRankCard.tsx"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        required_imports = [
            "react-native-view-shot",
            "expo-sharing",
            "expo-linear-gradient",
            "react-native-paper"
        ]
        
        for imp in required_imports:
            assert imp in content, f"Missing import: {imp}"
            print(f"✓ Import found: {imp}")
    
    def test_share_rank_card_props_interface(self):
        """Verify ShareRankCard has correct props interface"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        required_props = ["visible", "onDismiss", "rank", "totalUsers", "category", "value", "userName"]
        
        for prop in required_props:
            assert prop in content, f"Missing prop: {prop}"
            print(f"✓ Prop found: {prop}")
    
    def test_share_rank_card_gradient_colors(self):
        """Verify dark gradient colors (0f172a→1e293b→334155)"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        assert "#0f172a" in content, "Missing gradient color #0f172a"
        assert "#1e293b" in content, "Missing gradient color #1e293b"
        assert "#334155" in content, "Missing gradient color #334155"
        print("✓ Dark gradient colors present (0f172a→1e293b→334155)")
    
    def test_share_rank_card_medal_colors(self):
        """Verify medal colors: gold (#FFD700), silver (#C0C0C0), bronze (#CD7F32), purple (#a78bfa)"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        # Check medal color logic
        assert "rank === 1" in content and "#FFD700" in content, "Missing gold for rank 1"
        assert "rank === 2" in content and "#C0C0C0" in content, "Missing silver for rank 2"
        assert "rank === 3" in content and "#CD7F32" in content, "Missing bronze for rank 3"
        assert "#a78bfa" in content, "Missing purple for other ranks"
        print("✓ Medal colors correct: gold #1, silver #2, bronze #3, purple others")
    
    def test_share_rank_card_visual_elements(self):
        """Verify key visual elements exist"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        # Medal circle with podium icon
        assert "medalCircle" in content, "Missing medalCircle style"
        assert 'name="podium"' in content, "Missing podium icon"
        
        # Rank number display
        assert "rankNumber" in content, "Missing rankNumber element"
        
        # Stats row with 3 columns
        assert "statsRow" in content, "Missing statsRow"
        assert "statBlock" in content, "Missing statBlock"
        
        # CTA
        assert "wandermark.app" in content, "Missing CTA URL"
        
        print("✓ All visual elements present: medalCircle, podium, rankNumber, statsRow, CTA")
    
    def test_share_rank_card_share_functionality(self):
        """Verify share functionality uses captureRef and Sharing.shareAsync"""
        with open("/app/frontend/components/ShareRankCard.tsx", "r") as f:
            content = f.read()
        
        assert "captureRef" in content, "Missing captureRef"
        assert "Sharing.shareAsync" in content, "Missing Sharing.shareAsync"
        assert "handleShare" in content, "Missing handleShare function"
        assert 'format: \'png\'' in content or "format: 'png'" in content, "Should capture as PNG"
        
        print("✓ Share functionality implemented with captureRef and Sharing.shareAsync")


class TestLeaderboardIntegration:
    """Test leaderboard.tsx integration with ShareRankCard"""
    
    def test_leaderboard_imports_share_rank_card(self):
        """Verify leaderboard.tsx imports ShareRankCard"""
        with open("/app/frontend/app/leaderboard.tsx", "r") as f:
            content = f.read()
        
        assert "import ShareRankCard" in content, "Missing ShareRankCard import"
        print("✓ Leaderboard imports ShareRankCard")
    
    def test_leaderboard_state_variables(self):
        """Verify state variables for ShareRankCard"""
        with open("/app/frontend/app/leaderboard.tsx", "r") as f:
            content = f.read()
        
        assert "showShareRank" in content, "Missing showShareRank state"
        assert "userValue" in content, "Missing userValue state"
        assert "userName" in content, "Missing userName state"
        print("✓ State variables present: showShareRank, userValue, userName")
    
    def test_leaderboard_fetches_user_data(self):
        """Verify leaderboard fetches user data from /api/auth/me and /api/stats"""
        with open("/app/frontend/app/leaderboard.tsx", "r") as f:
            content = f.read()
        
        assert "/api/auth/me" in content, "Missing /api/auth/me fetch"
        assert "/api/stats" in content, "Missing /api/stats fetch"
        assert "setUserName" in content, "Missing setUserName call"
        assert "setUserValue" in content, "Missing setUserValue call"
        print("✓ Leaderboard fetches user data from /api/auth/me and /api/stats")
    
    def test_leaderboard_share_ranking_button(self):
        """Verify 'Share My Ranking' button with data-testid"""
        with open("/app/frontend/app/leaderboard.tsx", "r") as f:
            content = f.read()
        
        assert "Share My Ranking" in content, "Missing 'Share My Ranking' text"
        assert 'data-testid="share-ranking-button"' in content, "Missing data-testid on share button"
        assert "setShowShareRank(true)" in content, "Button should open ShareRankCard modal"
        print("✓ 'Share My Ranking' button present with data-testid")
    
    def test_leaderboard_renders_share_rank_card(self):
        """Verify ShareRankCard is rendered with correct props"""
        with open("/app/frontend/app/leaderboard.tsx", "r") as f:
            content = f.read()
        
        assert "<ShareRankCard" in content, "Missing ShareRankCard component"
        assert "visible={showShareRank}" in content, "Missing visible prop"
        assert "onDismiss=" in content, "Missing onDismiss prop"
        assert "rank={" in content, "Missing rank prop"
        assert "totalUsers={" in content, "Missing totalUsers prop"
        assert "category={" in content, "Missing category prop"
        assert "value={" in content, "Missing value prop"
        assert "userName={" in content, "Missing userName prop"
        print("✓ ShareRankCard rendered with all required props")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
