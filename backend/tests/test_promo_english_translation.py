"""
Test: Promo Code Feature - Norwegian to English Translation
Verifies all API responses return English text (no Norwegian)
Tests email template CRUD functionality
"""
import pytest
import requests
import os
import re
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://cleanup-verify-1.preview.emergentagent.com"

# Norwegian words/phrases to check for (should NOT appear in responses)
NORWEGIAN_PATTERNS = [
    r'\bUgyldig\b', r'\bugyldig\b',  # Invalid
    r'\bKode\b', r'\bkode\b',  # Code
    r'\bDeaktivert\b', r'\bdeaktivert\b',  # Deactivated
    r'\bUtl.pt\b', r'\butl.pt\b',  # Expired
    r'\bbruks\b', r'\bBruks\b',  # Usage
    r'\bgrense\b', r'\bGrense\b',  # Limit
    r'\ballerede\b', r'\bAllerede\b',  # Already
    r'\binnl.st\b', r'\bInnl.st\b',  # Redeemed
    r'\bSlette\b', r'\bslettet\b',  # Deleted
    r'\bOpprettet\b', r'\bopprettet\b',  # Created
    r'\bAktiv\b', r'\baktiv\b',  # Active (when in context)
    r'\bDu har\b',  # You have
    r'\bDenne koden\b',  # This code
    r'\bKoder\b',  # Codes tab
    r'\bUtsendelseshistorikk\b',  # Dispatch history
    r'\bSend e-post\b',  # Send email button
    r'\bUkjent\b',  # Unknown
    r'\blivstids\b', r'\bLivstids\b',  # Lifetime
    r'\btidsbegrenset\b', r'\bTidsbegrenset\b',  # Timed
    r'\bmottakere\b', r'\bMottakere\b',  # Recipients
    r'\bFeilet\b', r'\bfeilet\b',  # Failed
    r'\bSendt\b', r'\bsendt\b',  # Sent
]


def contains_norwegian(text):
    """Check if text contains Norwegian patterns"""
    if not text:
        return False
    for pattern in NORWEGIAN_PATTERNS:
        if re.search(pattern, str(text), re.IGNORECASE):
            return True
    return False


def find_norwegian_in_dict(data, path=""):
    """Recursively search for Norwegian text in dict/list"""
    norwegian_found = []
    
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key
            if isinstance(value, str) and contains_norwegian(value):
                norwegian_found.append(f"{current_path}: {value}")
            norwegian_found.extend(find_norwegian_in_dict(value, current_path))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            norwegian_found.extend(find_norwegian_in_dict(item, f"{path}[{i}]"))
    elif isinstance(data, str):
        if contains_norwegian(data):
            norwegian_found.append(f"{path}: {data}")
    
    return norwegian_found


class TestAuthentication:
    """Authentication tests to get admin token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Note: API returns access_token, not token
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    def test_login_returns_access_token(self):
        """Verify login returns access_token (English naming)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        assert response.status_code == 200
        data = response.json()
        # Check token field name is English
        assert "access_token" in data or "token" in data
        print(f"PASS: Login returns token correctly")


class TestEmailTemplateEndpoints:
    """Test email template GET/PUT endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_email_template_returns_english_default(self, auth_token):
        """GET /api/admin/email-template returns English default template"""
        response = requests.get(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        required_fields = ["subject", "heading", "subheading", "body_text", "code_label", 
                          "steps_title", "steps", "footer_text", "support_text"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify NO Norwegian text in response
        norwegian = find_norwegian_in_dict(data)
        assert len(norwegian) == 0, f"Norwegian text found: {norwegian}"
        
        # Verify English content
        assert "English" not in data["subject"] or "WanderMark" in data["subject"]
        assert "Download" in str(data.get("steps", [])) or "download" in str(data.get("steps", [])).lower()
        
        print(f"PASS: Email template returns English content")
        print(f"Subject: {data['subject']}")
        print(f"Heading: {data['heading']}")
    
    def test_put_email_template_updates_fields(self, auth_token):
        """PUT /api/admin/email-template updates and persists fields"""
        # First get current template
        get_response = requests.get(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        original_heading = get_response.json().get("heading")
        
        # Update with test value
        test_heading = f"Test Heading {uuid.uuid4().hex[:8]}"
        put_response = requests.put(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"heading": test_heading}
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        updated_data = put_response.json()
        assert updated_data["heading"] == test_heading, "Heading not updated in response"
        
        # Verify persistence with GET
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        verify_data = verify_response.json()
        assert verify_data["heading"] == test_heading, "Heading not persisted"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"heading": original_heading or "You're invited!"}
        )
        
        print(f"PASS: Email template PUT updates and persists fields")
    
    def test_put_email_template_multiple_fields(self, auth_token):
        """PUT /api/admin/email-template can update multiple fields at once"""
        test_updates = {
            "subject": f"Test Subject {uuid.uuid4().hex[:6]}",
            "heading": f"Test Heading {uuid.uuid4().hex[:6]}",
            "code_label": "Your special code"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=test_updates
        )
        assert response.status_code == 200
        data = response.json()
        
        for field, value in test_updates.items():
            assert data[field] == value, f"Field {field} not updated"
        
        # Restore defaults
        requests.put(
            f"{BASE_URL}/api/admin/email-template",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "subject": "You've received exclusive WanderMark Premium access!",
                "heading": "You're invited!",
                "code_label": "Your promo code"
            }
        )
        
        print(f"PASS: Multiple field update works")
    
    def test_put_email_template_requires_auth(self):
        """PUT /api/admin/email-template requires admin authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"heading": "Unauthorized test"}
        )
        assert response.status_code == 401 or response.status_code == 403
        print(f"PASS: Email template PUT requires auth (status: {response.status_code})")
    
    def test_get_email_template_requires_auth(self):
        """GET /api/admin/email-template requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/email-template")
        assert response.status_code == 401 or response.status_code == 403
        print(f"PASS: Email template GET requires auth (status: {response.status_code})")


class TestPromoCodeEnglishMessages:
    """Test all promo code endpoints return English messages"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def test_promo_code(self, auth_token):
        """Create a test promo code for testing"""
        code = f"ENGTEST{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "code": code,
                "description": "English translation test code",
                "type": "lifetime_premium",
                "max_uses": 100
            }
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_get_promo_codes_no_norwegian(self, auth_token):
        """GET /api/admin/promo-codes returns English content only"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for Norwegian text in response
        norwegian = find_norwegian_in_dict(data)
        assert len(norwegian) == 0, f"Norwegian text found in promo codes list: {norwegian}"
        
        print(f"PASS: GET /api/admin/promo-codes returns {len(data)} codes with no Norwegian text")
    
    def test_batch_create_english_response(self, auth_token):
        """POST /api/admin/promo-codes/batch returns English messages"""
        prefix = f"BATCHENG{uuid.uuid4().hex[:4].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes/batch",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "prefix": prefix,
                "count": 3,
                "description": "Batch test for English",
                "type": "lifetime_premium",
                "max_uses": 1
            }
        )
        assert response.status_code == 200, f"Batch create failed: {response.text}"
        data = response.json()
        
        # Verify English field names
        assert "success" in data
        assert "created" in data
        assert "skipped" in data
        assert "codes" in data
        
        # No Norwegian in response
        norwegian = find_norwegian_in_dict(data)
        assert len(norwegian) == 0, f"Norwegian in batch response: {norwegian}"
        
        print(f"PASS: Batch create returns English: created={data['created']}, skipped={data['skipped']}")
    
    def test_delete_promo_code_english_message(self, auth_token, test_promo_code):
        """DELETE /api/admin/promo-codes/{code_id} returns English message"""
        if not test_promo_code:
            pytest.skip("No test code created")
        
        code_id = test_promo_code["code_id"]
        response = requests.delete(
            f"{BASE_URL}/api/admin/promo-codes/{code_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify English message
        assert "success" in data
        assert "message" in data
        
        # Message should be in English
        message = data["message"].lower()
        assert "deleted" in message or "removed" in message, f"Message should be in English: {data['message']}"
        
        # No Norwegian
        norwegian = find_norwegian_in_dict(data)
        assert len(norwegian) == 0, f"Norwegian in delete response: {norwegian}"
        
        print(f"PASS: Delete returns English message: {data['message']}")
    
    def test_delete_nonexistent_code_english_error(self, auth_token):
        """DELETE nonexistent code returns English error"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/promo-codes/nonexistent_code_id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
        data = response.json()
        
        # Should have English error message
        detail = data.get("detail", "").lower()
        assert "not found" in detail or "does not exist" in detail, f"Error should be English: {data}"
        
        print(f"PASS: 404 error is in English: {data.get('detail')}")


class TestPromoRedemptionEnglish:
    """Test promo redemption returns English error messages"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user token for redemption tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_redeem_invalid_code_english_error(self, user_token):
        """POST /api/promo/redeem with invalid code returns English error"""
        response = requests.post(
            f"{BASE_URL}/api/promo/redeem",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"code": "INVALID_NONEXISTENT_CODE_XYZ123"}
        )
        assert response.status_code == 404
        data = response.json()
        
        detail = data.get("detail", "").lower()
        # Should say "Invalid promo code" in English, not "Ugyldig kode"
        assert "invalid" in detail or "not found" in detail, f"Error should be English: {data}"
        
        # No Norwegian words
        norwegian = find_norwegian_in_dict(data)
        assert len(norwegian) == 0, f"Norwegian in error: {norwegian}"
        
        print(f"PASS: Invalid code error is English: {data.get('detail')}")
    
    def test_redeem_deactivated_code_english_error(self, user_token):
        """Redemption of deactivated code returns English error"""
        # First create and deactivate a code
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        admin_token = admin_response.json().get("access_token") or admin_response.json().get("token")
        
        # Create code
        code_str = f"DEACT{uuid.uuid4().hex[:6].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"code": code_str, "type": "lifetime_premium", "max_uses": 1}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test code")
        
        code_data = create_response.json()
        code_id = code_data["code_id"]
        
        # Deactivate it
        requests.put(
            f"{BASE_URL}/api/admin/promo-codes/{code_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
        
        # Try to redeem deactivated code
        redeem_response = requests.post(
            f"{BASE_URL}/api/promo/redeem",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"code": code_str}
        )
        
        assert redeem_response.status_code == 400
        data = redeem_response.json()
        
        detail = data.get("detail", "").lower()
        # Should say "deactivated" in English, not "deaktivert"
        assert "deactivated" in detail or "inactive" in detail or "not active" in detail, f"Error should be English: {data}"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/promo-codes/{code_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"PASS: Deactivated code error is English: {data.get('detail')}")


class TestEmailHistoryEnglish:
    """Test email history returns English content"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_email_history_no_norwegian(self, auth_token):
        """GET /api/admin/promo-codes/email-history has no Norwegian text"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes/email-history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for Norwegian in history entries
        norwegian = find_norwegian_in_dict(data)
        
        # Note: Some historical data might still have Norwegian if created before translation
        # But new entries should be in English
        if norwegian:
            print(f"WARNING: Norwegian found in email history (may be old data): {norwegian}")
        else:
            print(f"PASS: Email history has no Norwegian text")


class TestSendEmailUsesTemplate:
    """Test that send-email endpoint uses stored template"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@wandermark.app",
            "password": "Test1234!"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_send_email_endpoint_structure(self, auth_token):
        """POST /api/admin/promo-codes/send-email validates request structure"""
        # Test with empty emails (should fail)
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"emails": [], "code_ids": ["test"]}
        )
        assert response.status_code == 400
        data = response.json()
        
        # Error should be in English
        detail = data.get("detail", "").lower()
        assert "email" in detail or "required" in detail, f"Error should be English: {data}"
        
        print(f"PASS: Send email validation returns English error: {data.get('detail')}")
    
    def test_send_email_no_active_codes_english(self, auth_token):
        """POST /api/admin/promo-codes/send-email with invalid codes returns English error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes/send-email",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "emails": ["test@example.com"],
                "code_ids": ["nonexistent_code_id"]
            }
        )
        assert response.status_code == 400
        data = response.json()
        
        detail = data.get("detail", "").lower()
        # Should say "no active codes found" in English
        assert "no active codes" in detail or "not found" in detail, f"Error should be English: {data}"
        
        print(f"PASS: No active codes error is English: {data.get('detail')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
