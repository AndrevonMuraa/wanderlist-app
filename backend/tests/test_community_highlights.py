"""
Test Community Highlights Feature
- GET /api/countries/{id}/community-highlights
- Returns top 3 most photographed landmarks with photo counts, visitor counts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://audit-phase1.preview.emergentagent.com').rstrip('/')

# Test credentials
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
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestCommunityHighlights:
    """Community Highlights API tests"""

    def test_community_highlights_returns_top_3(self, auth_headers):
        """Test that community highlights returns top 3 landmarks for France"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have highlights key
        assert "highlights" in data
        highlights = data["highlights"]
        
        # Should return 3 or fewer items
        assert len(highlights) <= 3
        
        # Should have expected fields for each highlight
        if len(highlights) > 0:
            h = highlights[0]
            assert "landmark_id" in h
            assert "landmark_name" in h
            assert "total_photos" in h
            assert "visitor_count" in h
            assert "sample_photo" in h
            
            # total_photos should be integer >= 1
            assert isinstance(h["total_photos"], int)
            assert h["total_photos"] >= 1
            
            # visitor_count should be integer >= 1
            assert isinstance(h["visitor_count"], int)
            assert h["visitor_count"] >= 1
            
            # landmark_name should be a non-empty string
            assert isinstance(h["landmark_name"], str)
            assert len(h["landmark_name"]) > 0

    def test_community_highlights_sorted_by_photos(self, auth_headers):
        """Test that highlights are sorted by total_photos DESC"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        highlights = data["highlights"]
        
        # Verify descending order by total_photos
        if len(highlights) >= 2:
            for i in range(len(highlights) - 1):
                assert highlights[i]["total_photos"] >= highlights[i + 1]["total_photos"], \
                    f"Highlights not sorted: {highlights[i]['total_photos']} < {highlights[i+1]['total_photos']}"

    def test_community_highlights_empty_country(self, auth_headers):
        """Test that empty array is returned for countries with no community photos"""
        response = requests.get(
            f"{BASE_URL}/api/countries/vatican/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "highlights" in data
        assert data["highlights"] == []

    def test_community_highlights_nonexistent_country(self, auth_headers):
        """Test API behavior for non-existent country ID"""
        response = requests.get(
            f"{BASE_URL}/api/countries/nonexistent_xyz/community-highlights",
            headers=auth_headers
        )
        # Should return 200 with empty highlights (graceful handling)
        assert response.status_code == 200
        data = response.json()
        assert data["highlights"] == []

    def test_community_highlights_sample_photo_format(self, auth_headers):
        """Test that sample_photo is a valid URL or None"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for h in data["highlights"]:
            sample_photo = h.get("sample_photo")
            if sample_photo is not None:
                # Should be a string (URL or base64)
                assert isinstance(sample_photo, str)
                # Should have some content
                assert len(sample_photo) > 0

    def test_community_highlights_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights"
        )
        assert response.status_code == 401

    def test_first_highlight_is_most_photographed(self, auth_headers):
        """Test that first item is the most photographed landmark"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        highlights = data["highlights"]
        
        if len(highlights) > 0:
            first = highlights[0]
            # First should have highest or equal photo count compared to others
            for h in highlights[1:]:
                assert first["total_photos"] >= h["total_photos"]


class TestCommunityHighlightsIntegration:
    """Integration tests for community highlights with related endpoints"""

    def test_highlights_landmark_ids_are_valid(self, auth_headers):
        """Test that landmark_ids from highlights are real landmarks"""
        response = requests.get(
            f"{BASE_URL}/api/countries/france/community-highlights",
            headers=auth_headers
        )
        assert response.status_code == 200
        highlights = response.json()["highlights"]
        
        for h in highlights:
            # Verify landmark exists
            landmark_response = requests.get(
                f"{BASE_URL}/api/landmarks/{h['landmark_id']}",
                headers=auth_headers
            )
            assert landmark_response.status_code == 200, \
                f"Landmark {h['landmark_id']} not found"
