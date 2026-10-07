"""
Official State Police Resources Test Suite.

Verifies:
1. 36/36 Active States and UTs covered for Police Officers (resource_type_id=1).
2. Exact official national totals:
   - Sanctioned: 2,623,225
   - Actual: 2,091,488
   - Vacancies: 531,737
3. Patrol Vehicles verified states (Andhra Pradesh, Arunachal Pradesh, Assam).
4. All quantities are non-negative (>= 0).
5. Uniqueness constraint: no duplicate (state_id, resource_type_id, reference_year) rows.
6. Crime incident integrity: crime_incidents count remains strictly 191,679.
7. District resources integrity: district_resources has 0 rows (no synthetic/fake availability).
8. API security: GET /api/v1/resources/states and /coverage require authentication (401 Unauthorized).
9. API GET /api/v1/resources/states filtering by state_id, resource_type_id, and pagination.
10. API GET /api/v1/resources/coverage structure, metadata, category coverage across all 4 resource types, and methodology notes.
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.resources import StateResource, ResourceType
from backend.app.models.geography import State
from backend.app.models.crime import CrimeIncident

client = TestClient(app)


class TestStatePoliceResources(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Authenticate as admin to obtain JWT token for API tests."""
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "admin", "password": "Admin@12345"},
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        cls.token = login_resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_all_36_states_covered_for_police_officers(self):
        """Verify all 36 active States/UTs have official police officer records."""
        db = SessionLocal()
        try:
            records = (
                db.query(StateResource)
                .filter(StateResource.resource_type_id == 1)
                .all()
            )
            self.assertEqual(len(records), 36, "Expected exactly 36 State/UT records for Police Officers")

            state_ids = {r.state_id for r in records}
            self.assertEqual(len(state_ids), 36, "Expected 36 unique state_ids")

            active_states = db.query(State).filter(State.is_active == True).all()
            self.assertEqual(len(active_states), 36, "Expected exactly 36 active states in database")
            self.assertEqual(state_ids, {s.id for s in active_states}, "All active states must have officer records")
        finally:
            db.close()

    def test_02_exact_national_totals(self):
        """Verify exact BPR&D / MHA national totals for police personnel."""
        db = SessionLocal()
        try:
            records = (
                db.query(StateResource)
                .filter(StateResource.resource_type_id == 1)
                .all()
            )
            total_sanctioned = sum(r.sanctioned_quantity for r in records if r.sanctioned_quantity is not None)
            total_actual = sum(r.actual_quantity for r in records if r.actual_quantity is not None)
            total_vacant = sum(
                (r.sanctioned_quantity - r.actual_quantity)
                for r in records
                if r.sanctioned_quantity is not None and r.actual_quantity is not None
            )

            self.assertEqual(total_sanctioned, 2623225, "Sanctioned national total must match MHA Lok Sabha Q2239: 2,623,225")
            self.assertEqual(total_actual, 2091488, "Actual national total must match MHA Lok Sabha Q2239: 2,091,488")
            self.assertEqual(total_vacant, 531737, "Vacant national total must match MHA Lok Sabha Q2239: 531,737")
            self.assertEqual(total_sanctioned - total_actual, total_vacant, "Sanctioned minus Actual must equal Vacancy")
        finally:
            db.close()

    def test_03_patrol_vehicles_data(self):
        """Verify verified patrol vehicle records exist for Andhra Pradesh, Arunachal Pradesh, and Assam."""
        db = SessionLocal()
        try:
            vehicle_records = (
                db.query(StateResource)
                .filter(StateResource.resource_type_id == 2)
                .all()
            )
            self.assertEqual(len(vehicle_records), 3, "Expected 3 verified state vehicle records")

            state_names = {r.state.state_name for r in vehicle_records}
            self.assertIn("ANDHRA PRADESH", state_names)
            self.assertIn("ARUNACHAL PRADESH", state_names)
            self.assertIn("ASSAM", state_names)

            for rec in vehicle_records:
                self.assertGreater(rec.available_quantity, 0, f"Available vehicles for {rec.state.state_name} must be > 0")
        finally:
            db.close()

    def test_04_quantities_non_negative(self):
        """Verify all quantities are non-negative across all records."""
        db = SessionLocal()
        try:
            all_records = db.query(StateResource).all()
            self.assertGreater(len(all_records), 0)
            for rec in all_records:
                self.assertGreaterEqual(rec.available_quantity, 0, f"Available quantity < 0 in record {rec.id}")
                if rec.actual_quantity is not None:
                    self.assertGreaterEqual(rec.actual_quantity, 0, f"Actual quantity < 0 in record {rec.id}")
                if rec.sanctioned_quantity is not None:
                    self.assertGreaterEqual(rec.sanctioned_quantity, 0, f"Sanctioned quantity < 0 in record {rec.id}")
        finally:
            db.close()

    def test_05_no_duplicate_records(self):
        """Verify uniqueness of (state_id, resource_type_id, reference_year)."""
        db = SessionLocal()
        try:
            result = db.execute(
                text("""
                    SELECT state_id, resource_type_id, reference_year, COUNT(*) as cnt
                    FROM state_resources
                    GROUP BY state_id, resource_type_id, reference_year
                    HAVING COUNT(*) > 1
                """)
            ).fetchall()
            self.assertEqual(len(result), 0, "No duplicate (state_id, resource_type_id, reference_year) rows allowed")
        finally:
            db.close()

    def test_06_crime_incidents_unmodified(self):
        """Verify historical crime incidents count remains strictly 191,679."""
        db = SessionLocal()
        try:
            incident_count = db.query(CrimeIncident).count()
            self.assertEqual(incident_count, 191679, "Crime incidents count must remain strictly 191,679")
        finally:
            db.close()

    def test_07_district_resources_empty(self):
        """Verify district_resources table has 0 rows (no fake/synthetic district availability created)."""
        db = SessionLocal()
        try:
            count = db.execute(text("SELECT COUNT(*) FROM district_resources")).scalar()
            self.assertEqual(count, 0, "district_resources must remain unpopulated with 0 rows")
        finally:
            db.close()

    def test_08_api_authentication_required(self):
        """Verify state resource APIs return 401 Unauthorized when unauthenticated."""
        resp1 = client.get("/api/v1/resources/states")
        self.assertEqual(resp1.status_code, 401, "Expected 401 for unauthenticated /api/v1/resources/states")

        resp2 = client.get("/api/v1/resources/coverage")
        self.assertEqual(resp2.status_code, 401, "Expected 401 for unauthenticated /api/v1/resources/coverage")

    def test_09_api_get_state_resources_filters(self):
        """Verify GET /api/v1/resources/states returns valid items and supports filters."""
        # 1. Fetch all state resources
        resp = client.get("/api/v1/resources/states", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertGreaterEqual(data["total"], 39)
        self.assertEqual(len(data["items"]), data["total"])

        # Check item structure
        sample = data["items"][0]
        self.assertIn("id", sample)
        self.assertIn("state_id", sample)
        self.assertIn("state_name", sample)
        self.assertIn("resource_type_id", sample)
        self.assertIn("resource_name", sample)
        self.assertIn("unit_of_measure", sample)
        self.assertIn("source_name", sample)
        self.assertIn("source_publication", sample)

        # 2. Filter by resource_type_id=1 (Police Officers)
        resp_officers = client.get(
            "/api/v1/resources/states?resource_type_id=1",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_officers.status_code, 200)
        data_officers = resp_officers.json()
        self.assertEqual(data_officers["total"], 36)
        for item in data_officers["items"]:
            self.assertEqual(item["resource_type_id"], 1)
            self.assertEqual(item["resource_name"], "Police Officers")

        # 3. Filter by resource_type_id=2 (Patrol Vehicles)
        resp_vehicles = client.get(
            "/api/v1/resources/states?resource_type_id=2",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_vehicles.status_code, 200)
        data_vehicles = resp_vehicles.json()
        self.assertEqual(data_vehicles["total"], 3)
        for item in data_vehicles["items"]:
            self.assertEqual(item["resource_type_id"], 2)
            self.assertEqual(item["resource_name"], "Patrol Vehicles")

        # 4. Filter by state_id (pick first state)
        first_state_id = sample["state_id"]
        resp_state = client.get(
            f"/api/v1/resources/states?state_id={first_state_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_state.status_code, 200)
        data_state = resp_state.json()
        for item in data_state["items"]:
            self.assertEqual(item["state_id"], first_state_id)

        # 5. Test pagination
        resp_page = client.get(
            "/api/v1/resources/states?skip=0&limit=10",
            headers=self.auth_headers,
        )
        self.assertEqual(resp_page.status_code, 200)
        data_page = resp_page.json()
        self.assertEqual(len(data_page["items"]), 10)
        self.assertGreaterEqual(data_page["total"], 39)

    def test_10_api_get_resource_coverage(self):
        """Verify GET /api/v1/resources/coverage returns correct status and breakdown."""
        resp = client.get("/api/v1/resources/coverage", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # State-level coverage metrics
        self.assertEqual(data["total_active_states"], 36)
        self.assertEqual(data["total_state_resource_records"], 39)
        self.assertEqual(data["geography_level"], "STATE")

        # Category coverage (all 4 resource types configured in resource_types)
        categories = data["categories"]
        self.assertEqual(len(categories), 4)

        officer_cat = next((c for c in categories if c["resource_name"] == "Police Officers"), None)
        self.assertIsNotNone(officer_cat)
        self.assertEqual(officer_cat["states_covered"], 36)
        self.assertEqual(officer_cat["coverage_percentage"], 100.0)
        self.assertEqual(officer_cat["total_sanctioned"], 2623225)
        self.assertEqual(officer_cat["total_actual"], 2091488)
        self.assertEqual(officer_cat["total_vacancies"], 531737)
        self.assertEqual(len(officer_cat["missing_state_names"]), 0)

        vehicle_cat = next((c for c in categories if c["resource_name"] == "Patrol Vehicles"), None)
        self.assertIsNotNone(vehicle_cat)
        self.assertEqual(vehicle_cat["states_covered"], 3)
        self.assertAlmostEqual(vehicle_cat["coverage_percentage"], 8.33, places=2)

        inv_cat = next((c for c in categories if c["resource_name"] == "Investigation Teams"), None)
        self.assertIsNotNone(inv_cat)
        self.assertEqual(inv_cat["states_covered"], 0)
        self.assertEqual(inv_cat["coverage_percentage"], 0.0)

        surv_cat = next((c for c in categories if c["resource_name"] == "Surveillance Units"), None)
        self.assertIsNotNone(surv_cat)
        self.assertEqual(surv_cat["states_covered"], 0)
        self.assertEqual(surv_cat["coverage_percentage"], 0.0)

        # Methodology notes
        self.assertIn("methodology_notes", data)
        self.assertGreater(len(data["methodology_notes"]), 0)


if __name__ == "__main__":
    unittest.main()
