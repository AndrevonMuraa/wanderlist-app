"""
Test Promo Code Email History Feature
Tests the /api/admin/promo-codes/email-history endpoint
Also includes regression tests for send-email, list promo codes, and batch create
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wandermark-v1.preview.emergentagent.com")

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestEmailHistoryFeature:
    """Tests for the email history endpoint GET /api/admin/promo-codes/email-history"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - authenticate as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping tests")
        
        yield
    
    # ==========================
    # EMAIL HISTORY GET TESTS
    # ==========================
    
    def test_email_history_returns_list(self):
        """GET /api/admin/promo-codes/email-history returns a list of email logs"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Email history returned {len(data)} logs")
    
    def test_email_history_has_required_fields(self):
        """Each email log has required fields: log_id, sent_by, sender_name, total_emails, sent, failed, subject, code_names, results"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No email logs exist yet to verify fields")
        
        # Check first log has all required fields
        log = data[0]
        required_fields = ["log_id", "sent_by", "sender_name", "total_emails", "sent", "failed", "subject", "code_names", "results", "created_at"]
        for field in required_fields:
            assert field in log, f"Missing required field: {field}"
        
        print(f"Verified log has all fields: {list(log.keys())}")
    
    def test_email_history_sender_info_populated(self):
        """Email logs have sender_name and sender_email populated from user lookup"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No email logs exist")
        
        log = data[0]
        # sender_name should be populated (not "Ukjent" if user exists)
        assert "sender_name" in log
        assert log["sender_name"] is not None
        # For our test user, sender_email should be present
        if "sender_email" in log:
            assert isinstance(log["sender_email"], str)
        
        print(f"Sender info: name={log['sender_name']}, email={log.get('sender_email', 'N/A')}")
    
    def test_email_history_code_names_populated(self):
        """Email logs have code_names array populated with actual code strings"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No email logs exist")
        
        log = data[0]
        assert "code_names" in log
        assert isinstance(log["code_names"], list)
        # code_names should contain actual code strings (not code_ids)
        if len(log["code_names"]) > 0:
            assert "-" in log["code_names"][0] or log["code_names"][0].isupper(), "Code names should be actual promo codes"
        
        print(f"Code names in log: {log['code_names']}")
    
    def test_email_history_results_array_structure(self):
        """Each email log has results array with email, code, status for each recipient"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No email logs exist")
        
        log = data[0]
        assert "results" in log
        assert isinstance(log["results"], list)
        
        if len(log["results"]) > 0:
            result = log["results"][0]
            assert "email" in result, "Result should have email"
            assert "code" in result, "Result should have code"
            assert "status" in result, "Result should have status (sent/failed)"
        
        print(f"Results structure verified: {len(log['results'])} recipients in first log")
    
    def test_email_history_sorted_by_date_desc(self):
        """Email history is sorted by created_at descending (newest first)"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) < 2:
            pytest.skip("Need at least 2 logs to verify sorting")
        
        # Check first log is newer than second
        from datetime import datetime
        date1 = datetime.fromisoformat(data[0]["created_at"].replace("Z", "+00:00") if "Z" in data[0]["created_at"] else data[0]["created_at"])
        date2 = datetime.fromisoformat(data[1]["created_at"].replace("Z", "+00:00") if "Z" in data[1]["created_at"] else data[1]["created_at"])
        
        assert date1 >= date2, "Logs should be sorted by created_at descending"
        print(f"Sorting verified: {data[0]['created_at']} >= {data[1]['created_at']}")
    
    def test_email_history_requires_admin_auth(self):
        """GET /api/admin/promo-codes/email-history requires admin authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.get(f"{BASE_URL}/api/admin/promo-codes/email-history")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized request correctly rejected")


class TestRegressionEmailAndPromoCodes:
    """Regression tests for related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
        
        yield
    
    def test_send_email_endpoint_still_works(self):
        """Regression: POST /api/admin/promo-codes/send-email returns correct structure"""
        # Create a unique test code
        unique_code = f"HISTTEST{uuid.uuid4().hex[:6].upper()}"
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes",
            json={
                "code": unique_code,
                "description": "History test code",
                "type": "lifetime_premium",
                "max_uses": 10
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test code")
        
        code_id = create_response.json()["code_id"]
        
        # Send email
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["historytest@wandermark.app"]
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "sent" in data
        assert "failed" in data
        assert "results" in data
        print(f"Send email regression: sent={data['sent']}, failed={data['failed']}")
    
    def test_list_promo_codes_still_works(self):
        """Regression: GET /api/admin/promo-codes returns list"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"List promo codes regression: {len(data)} codes")
    
    def test_batch_create_still_works(self):
        """Regression: POST /api/admin/promo-codes/batch returns correct structure"""
        unique_prefix = f"HISTBATCH{uuid.uuid4().hex[:4].upper()}"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/batch",
            json={
                "prefix": unique_prefix,
                "count": 2,
                "description": "History test batch",
                "type": "lifetime_premium",
                "max_uses": 1
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data
        assert "created" in data
        assert "codes" in data
        print(f"Batch create regression: {data['created']} codes created")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
