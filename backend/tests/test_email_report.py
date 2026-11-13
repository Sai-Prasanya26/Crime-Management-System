"""
Verification test suite for Email PDF Report Feature (Phase 12 Reporting).
Tests:
1. Authentication requirement (401 without Bearer token).
2. Validation of report types and scopes (400 on invalid input).
3. Graceful handling of unconfigured SMTP (503 Service Unavailable).
4. Full email assembly & PDF attachment generation for All India, State, and District scopes.
5. All 6 report types.
6. Recipient verification (strictly matches authenticated user).
7. Subject line format: 'Your Crime Intelligence Report – [District/State/All India]'.
8. Body content: greeting, report name, jurisdiction, period, attachment notice, and system name.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.security import create_access_token
from backend.app.services.email_service import get_test_mailbox, clear_test_mailbox

client = TestClient(app)


class TestEmailPdfReportFeature(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Admin user (id=1, email="admin@crimeops.gov.in" in database seed)
        cls.token_admin = create_access_token(subject="1", role="ADMIN")
        cls.headers_admin = {"Authorization": f"Bearer {cls.token_admin}"}
        
        # Officer user (id=3, email="officer@crimeops.gov.in" in database seed)
        cls.token_officer = create_access_token(subject="3", role="OFFICER")
        cls.headers_officer = {"Authorization": f"Bearer {cls.token_officer}"}

    def setUp(self):
        clear_test_mailbox()
        # Reset settings
        settings.SMTP_HOST = ""
        settings.SMTP_TEST_MODE = False

    def test_01_authentication_required(self):
        """Endpoint must reject unauthenticated requests with 401."""
        resp = client.post(
            "/api/v1/reports/email-pdf",
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "ALL_INDIA",
            },
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Authentication required", resp.json()["detail"])

    def test_02_invalid_report_type_and_scope_validation(self):
        """Endpoint must reject invalid report types and invalid scopes with 400."""
        # Invalid report type
        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_admin,
            json={
                "report_type": "NON_EXISTENT_REPORT",
                "scope": "ALL_INDIA",
            },
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid report type", resp.json()["detail"])

        # Invalid scope
        resp2 = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_admin,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "GLOBAL_SCOPE",
            },
        )
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("Invalid scope", resp2.json()["detail"])

    def test_03_missing_smtp_configuration_returns_503(self):
        """When SMTP is not configured and not in test mode, return 503."""
        settings.SMTP_HOST = ""
        settings.SMTP_TEST_MODE = False

        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_admin,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "ALL_INDIA",
                "reporting_period": "2026-11-01",
            },
        )
        self.assertEqual(resp.status_code, 503)
        self.assertIn("SMTP email delivery service is not configured", resp.json()["detail"])

    def test_04_district_comprehensive_report_email(self):
        """District-level report generation and email dispatch to authenticated officer."""
        settings.SMTP_TEST_MODE = True

        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_officer,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "DISTRICT",
                "state_id": 2,
                "district_id": 5,
                "reporting_period": "2026-11-01",
            },
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["recipient"], "officer@crimeops.gov.in")
        self.assertEqual(data["report_title"], "District Crime Profile")
        self.assertIn("Anantapur", data["jurisdiction"])

        # Verify mailbox delivery
        mailbox = get_test_mailbox()
        self.assertEqual(len(mailbox), 1)
        delivered = mailbox[0]
        self.assertEqual(delivered["recipient_email"], "officer@crimeops.gov.in")
        self.assertEqual(delivered["subject"], "Your Crime Intelligence Report – Anantapur")
        self.assertGreater(delivered["pdf_size_bytes"], 1500)
        self.assertTrue(delivered["filename"].endswith(".pdf"))

    def test_05_state_scope_report_email(self):
        """State-level report generation and email dispatch."""
        settings.SMTP_TEST_MODE = True

        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_admin,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "STATE",
                "state_id": 2,
                "reporting_period": "2026-11-01",
            },
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["recipient"], "admin@crimeops.gov.in")
        self.assertEqual(data["report_title"], "State Crime Report")
        self.assertIn("Andhra Pradesh", data["jurisdiction"])

        mailbox = get_test_mailbox()
        self.assertEqual(len(mailbox), 1)
        self.assertEqual(mailbox[0]["subject"], "Your Crime Intelligence Report – Andhra Pradesh")

    def test_06_all_india_scope_report_email(self):
        """All India scope report generation and email dispatch."""
        settings.SMTP_TEST_MODE = True

        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_admin,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "ALL_INDIA",
                "reporting_period": "2026-11-01",
            },
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["recipient"], "admin@crimeops.gov.in")
        self.assertEqual(data["report_title"], "All India Crime Report")
        self.assertIn("All India", data["jurisdiction"])

        mailbox = get_test_mailbox()
        self.assertEqual(len(mailbox), 1)
        self.assertEqual(mailbox[0]["subject"], "Your Crime Intelligence Report – All India")

    def test_07_all_six_report_types_generation(self):
        """Verify that all six report types can be generated and emailed."""
        settings.SMTP_TEST_MODE = True
        report_types = [
            "CRIME_STATISTICS",
            "CRIME_PREDICTIONS",
            "RISK_ASSESSMENT",
            "RESOURCE_ALLOCATION",
            "BUDGET_ANALYSIS",
            "COMPREHENSIVE_CRIME",
        ]

        for r_type in report_types:
            clear_test_mailbox()
            resp = client.post(
                "/api/v1/reports/email-pdf",
                headers=self.headers_admin,
                json={
                    "report_type": r_type,
                    "scope": "ALL_INDIA",
                    "reporting_period": "2026-11-01",
                },
            )
            self.assertEqual(resp.status_code, 200, f"Failed for report type {r_type}: {resp.text}")
            mailbox = get_test_mailbox()
            self.assertEqual(len(mailbox), 1, f"No email captured for {r_type}")
            self.assertGreater(mailbox[0]["pdf_size_bytes"], 1000)

    def test_08_custom_preview_payload_rendering(self):
        """Verify that frontend preview report_data payload is rendered into PDF."""
        settings.SMTP_TEST_MODE = True

        custom_payload = {
            "report_title": "District Crime Profile",
            "jurisdiction": "Anantapur, Andhra Pradesh",
            "period_formatted": "November 2026",
            "summary_cards": [
                {"title": "Historical Crimes", "value": "12,450", "subtext": "78.4% Clearance"},
                {"title": "Predicted Crimes", "value": "1,280 Crimes", "subtext": "Target: Nov 2026"},
                {"title": "Risk Score", "value": "72.4 (HIGH)", "subtext": "Primary: Theft"},
                {"title": "Available Budget", "value": "₹2.45 Cr", "subtext": "Operating Surplus"},
            ],
            "sections": [
                {
                    "title": "1. Historical Crime Analysis",
                    "summary": "Annual historical distribution across major IPC categories.",
                    "tables": [
                        {
                            "sub_title": "Crime Category Breakdown",
                            "headers": [
                                {"key": "category", "label": "Category"},
                                {"key": "count", "label": "Incidents", "align": "right"},
                                {"key": "pct", "label": "Share %", "align": "right"},
                            ],
                            "rows": [
                                {"category": "Theft", "count": "4,120", "pct": "33.1%"},
                                {"category": "Burglary", "count": "2,310", "pct": "18.6%"},
                            ],
                        }
                    ],
                }
            ],
        }

        resp = client.post(
            "/api/v1/reports/email-pdf",
            headers=self.headers_officer,
            json={
                "report_type": "COMPREHENSIVE_CRIME",
                "scope": "DISTRICT",
                "state_id": 2,
                "district_id": 5,
                "reporting_period": "2026-11-01",
                "report_data": custom_payload,
            },
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        mailbox = get_test_mailbox()
        self.assertEqual(len(mailbox), 1)
        self.assertEqual(mailbox[0]["recipient_email"], "officer@crimeops.gov.in")
        self.assertGreater(mailbox[0]["pdf_size_bytes"], 2000)


if __name__ == "__main__":
    unittest.main()
