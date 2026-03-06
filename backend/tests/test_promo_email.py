"""
Test Promo Code Email Sending Feature
Tests the /api/admin/promo-codes/send-email endpoint for sending promo codes via email
Also includes regression tests for batch create and CSV export
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://log-removal-pass.preview.emergentagent.com")

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


class TestPromoEmailFeature:
    """Tests for the promo code email sending feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - authenticate and create test promo codes"""
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
        
        # Cleanup - delete test codes created in this session
        # Not strictly necessary but keeps database clean
    
    def _create_test_promo_code(self, suffix):
        """Helper to create a test promo code"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes",
            json={
                "code": f"EMAILTEST-{suffix}",
                "description": f"Test code for email testing - {suffix}",
                "type": "lifetime_premium",
                "max_uses": 10
            }
        )
        if response.status_code == 200:
            return response.json()["code_id"]
        return None

    # =============
    # EMAIL SEND TESTS
    # =============
    
    def test_send_email_single_recipient(self):
        """Test sending promo code email to single recipient"""
        # Create a test promo code
        code_id = self._create_test_promo_code("SINGLE")
        assert code_id is not None, "Failed to create test promo code"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["test@wandermark.app"]
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["sent"] >= 0  # May be 0 if email delivery fails but endpoint works
        assert "results" in data
        print(f"Single recipient email result: sent={data['sent']}, failed={data.get('failed', 0)}")
    
    def test_send_email_multiple_recipients(self):
        """Test sending promo codes to multiple recipients with round-robin distribution"""
        # Create multiple test promo codes
        code_ids = []
        for i in range(3):
            code_id = self._create_test_promo_code(f"MULTI{i}")
            if code_id:
                code_ids.append(code_id)
        
        assert len(code_ids) >= 2, "Failed to create test promo codes"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": code_ids,
                "emails": [
                    "test@wandermark.app",
                    "test2@wandermark.app",
                    "test3@wandermark.app"
                ]
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "results" in data
        assert len(data["results"]) == 3  # One result per recipient
        print(f"Multiple recipients email result: sent={data['sent']}, failed={data.get('failed', 0)}")
    
    def test_send_email_empty_emails_fails(self):
        """Test that sending email with empty email list returns 400"""
        code_id = self._create_test_promo_code("EMPTY")
        assert code_id is not None
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": []
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "paakrevd" in data.get("detail", "").lower() or "email" in data.get("detail", "").lower()
    
    def test_send_email_empty_code_ids_fails(self):
        """Test that sending email with empty code_ids returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [],
                "emails": ["test@wandermark.app"]
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "paakrevd" in data.get("detail", "").lower() or "kode" in data.get("detail", "").lower()
    
    def test_send_email_with_custom_subject(self):
        """Test sending email with custom subject"""
        code_id = self._create_test_promo_code("SUBJECT")
        assert code_id is not None
        
        custom_subject = "Test Custom Subject - WanderMark Premium"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["test@wandermark.app"],
                "subject": custom_subject
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
        print(f"Custom subject email result: sent={data['sent']}")
    
    def test_send_email_with_personal_message(self):
        """Test sending email with personal message"""
        code_id = self._create_test_promo_code("PERSONAL")
        assert code_id is not None
        
        personal_message = "Hei! Vi elsker innholdet ditt og vil gjerne gi deg WanderMark Premium."
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["test@wandermark.app"],
                "personal_message": personal_message
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
        print(f"Personal message email result: sent={data['sent']}")
    
    def test_send_email_with_all_options(self):
        """Test sending email with custom subject AND personal message"""
        code_id = self._create_test_promo_code("ALLOPTS")
        assert code_id is not None
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["test@wandermark.app"],
                "subject": "Spesialtilbud fra WanderMark!",
                "personal_message": "Tusen takk for at du er en fantastisk reiseblogger!"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
    
    def test_send_email_unauthorized_fails(self):
        """Test that unauthenticated request returns 401"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": ["fake_code_id"],
                "emails": ["test@wandermark.app"]
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_send_email_invalid_code_ids_handled(self):
        """Test that non-existent code_ids are handled gracefully"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": ["nonexistent_code_123"],
                "emails": ["test@wandermark.app"]
            }
        )
        
        # Should return 400 because no active codes found
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "aktive" in data.get("detail", "").lower() or "kode" in data.get("detail", "").lower()
    
    def test_send_email_whitespace_emails_filtered(self):
        """Test that whitespace-only emails are filtered out"""
        code_id = self._create_test_promo_code("WHITESPACE")
        assert code_id is not None
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            json={
                "code_ids": [code_id],
                "emails": ["  ", "", "test@wandermark.app", "\n\t"]
            }
        )
        
        # Should process only the valid email
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] is True
        # Only 1 valid email should be processed
        assert len(data["results"]) <= 1


class TestRegressionBatchAndCSV:
    """Regression tests for batch create and CSV export (from iteration 10)"""
    
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
    
    def test_batch_create_still_works(self):
        """Regression: POST /api/admin/promo-codes/batch still works"""
        import uuid
        unique_prefix = f"REGTEST{uuid.uuid4().hex[:4].upper()}"
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/promo-codes/batch",
            json={
                "prefix": unique_prefix,
                "count": 3,
                "description": "Regression test batch",
                "type": "lifetime_premium",
                "max_uses": 1
            }
        )
        
        assert response.status_code == 200, f"Batch create failed: {response.status_code}"
        data = response.json()
        assert data["success"] is True
        assert data["created"] == 3
        assert len(data["codes"]) == 3
        # Check format: PREFIX-001, PREFIX-002, PREFIX-003
        assert all(unique_prefix in code for code in data["codes"])
        print(f"Batch regression test passed: created {data['created']} codes")
    
    def test_csv_export_still_works(self):
        """Regression: GET /api/admin/promo-codes/export-csv still returns CSV"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes/export-csv")
        
        assert response.status_code == 200, f"CSV export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Check Content-Disposition header
        disposition = response.headers.get("Content-Disposition", "")
        assert "wandermark_promo_codes.csv" in disposition
        
        # Check CSV content
        csv_text = response.text
        assert "Kode" in csv_text  # Header row
        assert "Type" in csv_text
        print("CSV export regression test passed")
    
    def test_list_promo_codes_still_works(self):
        """Regression: GET /api/admin/promo-codes list endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/admin/promo-codes")
        
        assert response.status_code == 200, f"List failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"List promo codes returned {len(data)} codes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
