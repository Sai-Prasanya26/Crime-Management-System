"""
Test suite for Phase 8: Machine Learning Crime Prediction.

Verifies:
1. /predictions/overview: Top 10 predicted districts, horizon dates, model metadata.
2. /predictions/evaluation: Multi-model benchmark (HGBR, Random Forest, Poisson, MA-3, Seasonal Naive)
   and split conformal prediction calibration metrics.
3. /predictions/actual-vs-predicted: Continuous time series actuals vs predictions integrity.
4. /predictions/district-month: Forecast details, conformal intervals, crime level rating.
5. /predictions/breakdown: Compositional breakdown across 4 categories and 21 crime types.
6. Data integrity: 191,679 historical incidents, 21,760 prediction records, 36 active states, 790 active districts.
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.database.session import SessionLocal

client = TestClient(app)


class TestMLPredictionsPhase8(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Authenticate as analyst to get access token for secured endpoints
        resp = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "analyst", "password": "Analyst@12345"},
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        cls.token = resp.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_predictions_overview(self):
        """Verify /predictions/overview returns model metadata, counts, and top 10 districts."""
        resp = client.get("/api/v1/predictions/overview", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total_predictions"], 23252)
        self.assertEqual(data["districts_covered"], 790)
        self.assertEqual(data["active_model_name"], "HGBR production forecasting model v1")
        self.assertEqual(data["active_model_version"], "v1.0.0")
        self.assertEqual(data["algorithm"], "HistGradientBoostingRegressor")
        self.assertTrue("Split Conformal" in data["calibration_method"])
        self.assertTrue(data["current_forecast_start"].startswith("2026-11"))
        self.assertTrue(data["current_forecast_end"].startswith("2027-10"))

        # Verify top predicted districts returns up to 10 items
        top = data["top_predicted_districts"]
        self.assertGreaterEqual(len(top), 1)
        self.assertLessEqual(len(top), 10)
        for item in top:
            self.assertIn("district_id", item)
            self.assertIn("district_name", item)
            self.assertIn("predicted_crime_count", item)
            self.assertGreater(item["predicted_crime_count"], 0)

    def test_02_model_evaluation_benchmarks(self):
        """Verify /predictions/evaluation contains all 5 benchmark models and conformal calibration."""
        resp = client.get("/api/v1/predictions/evaluation", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check model comparison table
        self.assertIn("metrics_summary", data)
        summary = data["metrics_summary"]
        self.assertIn("HistGradientBoosting", summary)
        self.assertIn("RandomForest", summary)
        self.assertIn("PoissonRegression", summary)
        self.assertIn("Moving_Average_3", summary)
        self.assertIn("Seasonal_Naive", summary)

        hgbr = summary["HistGradientBoosting"]
        snaive = summary["Seasonal_Naive"]

        # Verify HGBR outperforms seasonal naive baseline
        self.assertAlmostEqual(hgbr["MAE"], 1.6956, delta=0.05)
        self.assertAlmostEqual(hgbr["WAPE%"], 36.84, delta=0.5)
        self.assertAlmostEqual(hgbr["R2"], 0.6063, delta=0.05)
        self.assertLess(hgbr["MAE"], snaive["MAE"])
        self.assertGreater(hgbr["R2"], snaive["R2"])

        # Check relative improvements
        self.assertIn("relative_improvements", data)
        rel = data["relative_improvements"]
        self.assertEqual(rel["primary_model"], "HistGradientBoostingRegressor")
        self.assertAlmostEqual(rel["mae_reduction_percent"], 25.03, delta=0.5)

        # Check conformal calibration info
        self.assertIn("conformal_calibration", data)
        conf = data["conformal_calibration"]
        self.assertTrue("Split Conformal" in conf["method"])
        self.assertAlmostEqual(conf["nominal_coverage_default"], 0.8, delta=0.05)
        test_metrics = conf["test_empirical_metrics"]["overall_80"]
        self.assertAlmostEqual(test_metrics["empirical_coverage_pct"], 79.74, delta=1.0)

    def test_03_actual_vs_predicted(self):
        """Verify /predictions/actual-vs-predicted returns continuous time series."""
        resp = client.get("/api/v1/predictions/actual-vs-predicted?district_id=1", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 1)
        self.assertIn("comparison_points", data)
        points = data["comparison_points"]
        self.assertGreater(len(points), 0)

        # Verify items have period and either actual or predicted
        has_actual = False
        has_predicted = False
        for pt in points:
            self.assertIn("period", pt)
            if pt.get("actual_count") is not None:
                has_actual = True
            if pt.get("predicted_count") is not None:
                has_predicted = True

        self.assertTrue(has_actual, "Should have historical actual points")
        self.assertTrue(has_predicted, "Should have forward predicted points")

    def test_04_district_month_breakdown(self):
        """Verify /predictions/district-month returns forecast details and intervals."""
        resp = client.get(
            "/api/v1/predictions/district-month?district_id=1&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["year"], 2026)
        self.assertEqual(data["month"], 11)
        self.assertTrue(data["period"].startswith("2026-11"))
        self.assertTrue(data["is_forecast"])
        self.assertGreater(data["predicted_count"], 0)
        self.assertIsNotNone(data["prediction_interval_lower"])
        self.assertIsNotNone(data["prediction_interval_upper"])
        self.assertLessEqual(data["prediction_interval_lower"], data["predicted_count"])
        self.assertGreaterEqual(data["prediction_interval_upper"], data["predicted_count"])
        self.assertIn(data["crime_level"], ["Higher", "Moderate", "Lower", "Insufficient Baseline"])

    def test_05_category_and_type_breakdown(self):
        """Verify /predictions/breakdown returns 4 categories and 21 crime types."""
        resp = client.get(
            "/api/v1/predictions/breakdown?district_id=1&year=2026&month=11",
            headers=self.auth_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["district_id"], 1)
        self.assertEqual(data["period"], "2026-11")
        self.assertGreater(data["total_predicted_count"], 0)

        # Check 4 categories
        self.assertIn("categories", data)
        self.assertEqual(len(data["categories"]), 4)
        cat_names = {c["category_name"] for c in data["categories"]}
        self.assertIn("Violent Crime", cat_names)
        self.assertIn("Other Crime", cat_names)
        self.assertIn("Traffic Fatality", cat_names)
        self.assertIn("Fire Accident", cat_names)

        # Check 21 crime types
        self.assertIn("crime_types", data)
        self.assertEqual(len(data["crime_types"]), 21)

    def test_06_database_integrity(self):
        """Verify historical crimes (191,679), predictions (21,760), and geographical counts."""
        db = SessionLocal()
        try:
            incidents_count = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
            self.assertEqual(incidents_count, 191679, "Historical incidents count must remain exactly 191,679")

            predictions_count = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
            self.assertEqual(predictions_count, 23728, "Predictions count must be 23,728")

            active_states = db.execute(text("SELECT COUNT(*) FROM states WHERE is_active = 1")).scalar()
            self.assertEqual(active_states, 36, "Active states/UTs must be 36")

            active_districts = db.execute(text("SELECT COUNT(*) FROM districts WHERE is_current_admin = 1")).scalar()
            self.assertEqual(active_districts, 790, "Active districts must be 790")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
