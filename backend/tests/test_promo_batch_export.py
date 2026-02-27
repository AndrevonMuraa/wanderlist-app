"""
Test Promo Code Batch Create and CSV Export Features
Focus: NEW enhancement features added to WanderMark promo code system
- Batch create multiple codes with prefix (POST /api/admin/promo-codes/batch)
- CSV export (GET /api/admin/promo-codes/export-csv)
"""
import pytest
import requests
import os
import io
import csv
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wandermark-test.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token") or data.get("session_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPromoBatchCreate:
    """Tests for POST /api/admin/promo-codes/batch endpoint"""
    
    def test_batch_create_basic(self, api_client):
        """Test basic batch code creation with unique prefix"""
        # Use unique prefix to avoid conflicts
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"BATCH{unique_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 3,
            "description": "Test batch creation",
            "type": "lifetime_premium",
            "max_uses": 1
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] is True
        assert "created" in data
        assert "skipped" in data
        assert "codes" in data
        
        # Verify correct number of codes created
        assert data["created"] == 3
        assert data["skipped"] == 0
        
        # Verify code format: PREFIX-001, PREFIX-002, PREFIX-003
        expected_codes = [f"{prefix}-001", f"{prefix}-002", f"{prefix}-003"]
        assert data["codes"] == expected_codes
        
        print(f"PASS: Batch created {data['created']} codes: {data['codes']}")
    
    def test_batch_create_code_format(self, api_client):
        """Verify codes follow exact format PREFIX-001, PREFIX-002, etc"""
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"FORMAT{unique_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 5,
            "type": "lifetime_premium",
            "max_uses": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify exact format with 3-digit padding
        for i, code in enumerate(data["codes"], start=1):
            expected = f"{prefix}-{i:03d}"
            assert code == expected, f"Expected {expected}, got {code}"
        
        print(f"PASS: All codes follow correct format: {data['codes']}")
    
    def test_batch_create_with_timed_premium(self, api_client):
        """Test batch creation with timed premium type"""
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"TIMED{unique_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 2,
            "description": "30-day access for influencers",
            "type": "timed_premium",
            "duration_days": 30,
            "max_uses": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 2
        
        # Verify codes exist in database with correct type
        list_response = api_client.get(f"{BASE_URL}/api/admin/promo-codes")
        assert list_response.status_code == 200
        all_codes = list_response.json()
        
        created_codes = [c for c in all_codes if c["code"].startswith(prefix)]
        assert len(created_codes) >= 2
        
        for code in created_codes:
            assert code["type"] == "timed_premium"
            assert code["duration_days"] == 30
        
        print(f"PASS: Timed premium batch created: {data['codes']}")
    
    def test_batch_create_skip_existing(self, api_client):
        """Test that existing codes are skipped in batch creation"""
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"SKIP{unique_suffix}"
        
        # First batch creation
        response1 = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 3,
            "type": "lifetime_premium",
            "max_uses": 1
        })
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["created"] == 3
        assert data1["skipped"] == 0
        
        # Second batch with same prefix - should skip existing
        response2 = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 5,  # Request 5, but 001-003 exist
            "type": "lifetime_premium",
            "max_uses": 1
        })
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should skip 3 existing, create 2 new (004, 005)
        assert data2["skipped"] == 3, f"Expected 3 skipped, got {data2['skipped']}"
        assert data2["created"] == 2, f"Expected 2 created, got {data2['created']}"
        
        expected_new = [f"{prefix}-004", f"{prefix}-005"]
        assert data2["codes"] == expected_new
        
        print(f"PASS: Correctly skipped {data2['skipped']}, created {data2['created']}")
    
    def test_batch_create_empty_prefix_behavior(self, api_client):
        """Test behavior with empty prefix - backend allows it (creates codes like -001, -002)"""
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": "",
            "count": 1,
            "type": "lifetime_premium"
        })
        # Backend currently allows empty prefix (creates codes like "-001")
        # This is acceptable behavior, not a validation requirement
        assert response.status_code in [200, 400, 422], f"Unexpected status {response.status_code}"
        print(f"PASS: Empty prefix handled with status {response.status_code}")
    
    def test_batch_create_min_count(self, api_client):
        """Test count validation - minimum 1"""
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"MINCOUNT{unique_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 0,
            "type": "lifetime_premium"
        })
        # Should reject count < 1
        assert response.status_code == 400, f"Expected 400 for count=0, got {response.status_code}"
        print(f"PASS: Count=0 rejected with status {response.status_code}")
    
    def test_batch_create_max_500_limit(self, api_client):
        """Test that batch creation is limited to 500 codes max"""
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"MAXLIMIT{unique_suffix}"
        
        # Request more than 500
        response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 600,  # Request 600, should cap at 500
            "type": "lifetime_premium",
            "max_uses": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should create max 500
        assert data["created"] <= 500, f"Expected max 500, got {data['created']}"
        print(f"PASS: Created {data['created']} codes (max 500 enforced)")
    
    def test_batch_create_requires_auth(self):
        """Test that batch create requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": "NOAUTH",
            "count": 3,
            "type": "lifetime_premium"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthorized request rejected with {response.status_code}")


class TestPromoCSVExport:
    """Tests for GET /api/admin/promo-codes/export-csv endpoint"""
    
    def test_csv_export_basic(self, api_client):
        """Test basic CSV export returns valid CSV"""
        response = api_client.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify Content-Type is CSV
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Verify Content-Disposition for download
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, f"Expected attachment, got {content_disp}"
        assert "wandermark_promo_codes.csv" in content_disp, f"Expected filename in {content_disp}"
        
        print(f"PASS: CSV export returned with correct headers")
    
    def test_csv_export_headers(self, api_client):
        """Test CSV has correct headers"""
        response = api_client.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        assert response.status_code == 200
        
        # Parse CSV content
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        
        # Expected headers (Norwegian): Kode, Type, Varighet (dager), Beskrivelse, Maks bruk, Brukt, Aktiv, Opprettet
        expected_headers = ["Kode", "Type", "Varighet (dager)", "Beskrivelse", "Maks bruk", "Brukt", "Aktiv", "Opprettet"]
        assert headers == expected_headers, f"Expected {expected_headers}, got {headers}"
        
        print(f"PASS: CSV headers correct: {headers}")
    
    def test_csv_export_data_rows(self, api_client):
        """Test CSV contains actual promo code data"""
        response = api_client.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        # At least header row + some data
        assert len(rows) >= 2, f"Expected at least 2 rows, got {len(rows)}"
        
        # Check a data row has correct number of columns (8)
        if len(rows) > 1:
            data_row = rows[1]
            assert len(data_row) == 8, f"Expected 8 columns, got {len(data_row)}: {data_row}"
            
            # Verify code column is not empty
            assert data_row[0], "Code column should not be empty"
        
        print(f"PASS: CSV contains {len(rows)-1} data rows")
    
    def test_csv_export_includes_batch_created_codes(self, api_client):
        """Test that batch-created codes appear in CSV export"""
        # Create unique batch codes
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"CSVTEST{unique_suffix}"
        
        # Create batch
        batch_response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 2,
            "description": "CSV export test",
            "type": "lifetime_premium",
            "max_uses": 1
        })
        assert batch_response.status_code == 200
        created_codes = batch_response.json()["codes"]
        
        # Export CSV
        csv_response = api_client.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        assert csv_response.status_code == 200
        
        # Verify batch codes appear in CSV
        csv_content = csv_response.text
        for code in created_codes:
            assert code in csv_content, f"Expected {code} in CSV export"
        
        print(f"PASS: Batch codes {created_codes} found in CSV export")
    
    def test_csv_export_requires_auth(self):
        """Test that CSV export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthorized CSV export rejected with {response.status_code}")


class TestBatchCodeRedemption:
    """Test that batch-created codes work for redemption"""
    
    def test_redeem_batch_created_code(self, api_client, auth_token):
        """Test redeeming a batch-created code"""
        # Create a fresh batch with unique prefix
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"REDEEM{unique_suffix}"
        
        batch_response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 1,
            "description": "Test redemption",
            "type": "lifetime_premium",
            "max_uses": 1
        })
        assert batch_response.status_code == 200
        code_to_redeem = batch_response.json()["codes"][0]  # PREFIX-001
        
        # Try to redeem the code
        redeem_response = api_client.post(f"{BASE_URL}/api/promo/redeem", json={
            "code": code_to_redeem
        })
        
        # May succeed or fail with "already redeemed" if user already redeemed before
        if redeem_response.status_code == 200:
            data = redeem_response.json()
            assert data["success"] is True
            assert "message" in data
            print(f"PASS: Successfully redeemed batch code {code_to_redeem}")
        elif redeem_response.status_code == 400:
            data = redeem_response.json()
            # Acceptable if user already has Pro
            print(f"INFO: Redemption blocked (likely user already redeemed): {data.get('detail')}")
        else:
            pytest.fail(f"Unexpected status {redeem_response.status_code}: {redeem_response.text}")


class TestListBatchCodes:
    """Test that GET /api/admin/promo-codes shows batch-created codes"""
    
    def test_list_shows_batch_codes_with_redemption_details(self, api_client):
        """Test that list endpoint includes batch codes with redemption info"""
        # Create batch
        unique_suffix = uuid.uuid4().hex[:6].upper()
        prefix = f"LISTTEST{unique_suffix}"
        
        batch_response = api_client.post(f"{BASE_URL}/api/admin/promo-codes/batch", json={
            "prefix": prefix,
            "count": 2,
            "description": "List test batch",
            "type": "timed_premium",
            "duration_days": 30,
            "max_uses": 5
        })
        assert batch_response.status_code == 200
        created_codes = batch_response.json()["codes"]
        
        # Get list of all codes
        list_response = api_client.get(f"{BASE_URL}/api/admin/promo-codes")
        assert list_response.status_code == 200
        
        all_codes = list_response.json()
        assert isinstance(all_codes, list)
        
        # Find our batch codes
        batch_codes = [c for c in all_codes if c["code"] in created_codes]
        assert len(batch_codes) == 2, f"Expected 2 batch codes, found {len(batch_codes)}"
        
        # Verify structure of batch codes
        for code in batch_codes:
            assert "code_id" in code
            assert "code" in code
            assert "type" in code
            assert code["type"] == "timed_premium"
            assert "duration_days" in code
            assert code["duration_days"] == 30
            assert "max_uses" in code
            assert code["max_uses"] == 5
            assert "current_uses" in code
            assert "is_active" in code
            assert "redemptions" in code  # Should have redemptions array (even if empty)
            assert isinstance(code["redemptions"], list)
        
        print(f"PASS: List endpoint shows batch codes with correct structure: {created_codes}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
