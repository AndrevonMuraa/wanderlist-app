"""
Backend tests for Email Template Feature:
- GET /api/admin/email-template: Returns template with all fields
- PUT /api/admin/email-template: Updates specific fields, returns merged template
- PUT /api/admin/email-template with empty body: Returns 400 error
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wandermark-admin.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@wandermark.app"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Login returns access_token (not token)
    return data.get("access_token") or data.get("token")


@pytest.fixture
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestGetEmailTemplate:
    """Tests for GET /api/admin/email-template"""

    def test_get_template_returns_all_fields(self, api_client):
        """GET /api/admin/email-template returns template with all required fields"""
        response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        assert response.status_code == 200, f"GET template failed: {response.text}"
        
        template = response.json()
        
        # Verify all required fields are present
        required_fields = [
            "subject", "heading", "subheading", "body_text", 
            "code_label", "steps_title", "steps", "footer_text", "support_text"
        ]
        
        for field in required_fields:
            assert field in template, f"Missing field: {field}"
            assert template[field] is not None, f"Field {field} is None"
        
        # Verify steps is a list
        assert isinstance(template["steps"], list), "steps should be a list"
        assert len(template["steps"]) > 0, "steps list should not be empty"
        
        print(f"GET template returned all {len(required_fields)} required fields")

    def test_get_template_returns_english_content(self, api_client):
        """GET /api/admin/email-template returns English content"""
        response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        assert response.status_code == 200
        
        template = response.json()
        
        # Verify content is in English (check specific expected strings)
        assert "exclusive" in template["subject"].lower() or "premium" in template["subject"].lower(), \
            f"Subject doesn't appear to be English: {template['subject']}"
        assert "invited" in template["heading"].lower() or "you" in template["heading"].lower(), \
            f"Heading doesn't appear to be English: {template['heading']}"
        
        print(f"Template content is in English - Subject: {template['subject']}")

    def test_get_template_requires_auth(self):
        """GET /api/admin/email-template requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/email-template")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GET template correctly requires authentication")


class TestPutEmailTemplate:
    """Tests for PUT /api/admin/email-template"""

    def test_put_template_updates_single_field(self, api_client):
        """PUT /api/admin/email-template updates specific field and returns merged template"""
        # Get original template
        original_response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        original_template = original_response.json()
        original_heading = original_template["heading"]
        
        # Update single field
        test_heading = "Test Heading - Email Preview Feature"
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"heading": test_heading}
        )
        
        assert update_response.status_code == 200, f"PUT template failed: {update_response.text}"
        updated_template = update_response.json()
        
        # Verify field was updated
        assert updated_template["heading"] == test_heading, \
            f"Heading not updated. Expected: {test_heading}, Got: {updated_template['heading']}"
        
        # Verify other fields are still present (merged)
        assert "subject" in updated_template
        assert "subheading" in updated_template
        assert "body_text" in updated_template
        
        # Restore original heading
        api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"heading": original_heading}
        )
        
        print(f"PUT template successfully updated heading and returned merged template")

    def test_put_template_updates_multiple_fields(self, api_client):
        """PUT /api/admin/email-template updates multiple fields"""
        # Get original template to restore later
        original_response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        original_template = original_response.json()
        
        # Update multiple fields
        update_payload = {
            "subject": "Test Subject for Email Preview",
            "heading": "Test Heading",
            "subheading": "Test Subheading"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json=update_payload
        )
        
        assert update_response.status_code == 200, f"PUT template failed: {update_response.text}"
        updated_template = update_response.json()
        
        # Verify all fields were updated
        assert updated_template["subject"] == update_payload["subject"]
        assert updated_template["heading"] == update_payload["heading"]
        assert updated_template["subheading"] == update_payload["subheading"]
        
        # Restore original values
        api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={
                "subject": original_template["subject"],
                "heading": original_template["heading"],
                "subheading": original_template["subheading"]
            }
        )
        
        print(f"PUT template successfully updated multiple fields")

    def test_put_template_updates_steps_array(self, api_client):
        """PUT /api/admin/email-template can update steps array"""
        # Get original template
        original_response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        original_template = original_response.json()
        
        # Update steps
        test_steps = [
            "Download the WanderMark app",
            "Create your account",
            "Go to Settings > Premium",
            "Enter your promo code",
            "Enjoy Premium features!"
        ]
        
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"steps": test_steps}
        )
        
        assert update_response.status_code == 200, f"PUT template failed: {update_response.text}"
        updated_template = update_response.json()
        
        # Verify steps were updated
        assert updated_template["steps"] == test_steps, \
            f"Steps not updated correctly. Expected: {test_steps}, Got: {updated_template['steps']}"
        
        # Restore original steps
        api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"steps": original_template["steps"]}
        )
        
        print(f"PUT template successfully updated steps array")

    def test_put_template_empty_body_returns_400(self, api_client):
        """PUT /api/admin/email-template with empty body returns 400 error"""
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={}
        )
        
        assert update_response.status_code == 400, \
            f"Expected 400 for empty body, got {update_response.status_code}: {update_response.text}"
        
        error_data = update_response.json()
        assert "detail" in error_data, "Error response should contain 'detail'"
        
        print(f"PUT template with empty body correctly returns 400: {error_data['detail']}")

    def test_put_template_requires_auth(self):
        """PUT /api/admin/email-template requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"heading": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PUT template correctly requires authentication")


class TestEmailTemplatePersistence:
    """Tests for email template persistence"""

    def test_template_changes_persist(self, api_client):
        """Verify template changes persist across requests"""
        # Get original template
        original_response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        original_template = original_response.json()
        
        # Update template
        test_footer = f"Test Footer - Persistence Check {os.urandom(4).hex()}"
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"footer_text": test_footer}
        )
        assert update_response.status_code == 200
        
        # Get template again and verify change persisted
        verify_response = api_client.get(f"{BASE_URL}/api/admin/email-template")
        verify_template = verify_response.json()
        
        assert verify_template["footer_text"] == test_footer, \
            f"Change did not persist. Expected: {test_footer}, Got: {verify_template['footer_text']}"
        
        # Restore original
        api_client.put(
            f"{BASE_URL}/api/admin/email-template",
            json={"footer_text": original_template["footer_text"]}
        )
        
        print(f"Template changes persist correctly across requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
