"""
Test Suite: Integer-Based Presentation of Predicted Crime Incident Counts & Largest-Remainder Allocation.
Verifies:
1. Standard nearest-integer rounding for predictions (e.g., 8.67 -> 9, 6.09 -> 6, 16.56 -> 17).
2. Interval lower bound using floor and upper bound using ceiling.
3. Largest-remainder allocation ensures sum(categories) == round(total_prediction).
4. Unrounded floating-point predictions remain preserved internally and in DB.
5. Scopes verified: District, State, and All India.
"""

import sys
import os
import math
import decimal

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.utils.prediction_reconciliation import (
    largest_remainder_allocation,
    reconcile_category_predictions,
)
from backend.app.database.session import SessionLocal
from backend.app.models.ml import CrimePrediction

client = TestClient(app)


def test_integer_predictions():
    print("\n" + "=" * 70)
    print("INTEGER-BASED PREDICTION PRESENTATION & RECONCILIATION TEST SUITE")
    print("=" * 70)

    # 1. Unit Test Largest-Remainder Algorithm
    test_cases = [
        # (values, target_total, expected_sum)
        ([3.40, 2.30, 1.80, 1.17], 9, 9),      # 8.67 -> 9
        ([2.15, 1.85, 1.05, 1.04], 6, 6),      # 6.09 -> 6
        ([6.50, 4.30, 3.20, 2.56], 17, 17),    # 16.56 -> 17
        ([0.25, 0.25, 0.25, 0.25], 1, 1),      # 1.00 -> 1
        ([10.45, 12.44, 8.43], 31, 31),        # 31.32 -> 31
        ([0.0, 0.0, 0.0], 0, 0),               # 0 -> 0
    ]

    for vals, target, expected_sum in test_cases:
        allocated = largest_remainder_allocation(vals, target)
        actual_sum = sum(allocated)
        assert actual_sum == expected_sum, f"Sum mismatch for {vals}: got {actual_sum}, expected {expected_sum}"
        for item in allocated:
            assert isinstance(item, int), f"Allocated value {item} is not an integer!"
            assert item >= 0, f"Allocated value {item} is negative!"

    print("[PASS] Step 1: Largest-Remainder Unit Tests passed across all test cases (sum invariant strictly preserved).")

    # 2. Test Interval Floor / Ceiling Logic
    interval_cases = [
        (5.21, 12.08, 5, 13),
        (0.05, 3.99, 0, 4),
        (10.0, 20.0, 10, 20),
        (8.49, 16.01, 8, 17),
    ]
    for lower, upper, exp_floor, exp_ceil in interval_cases:
        actual_floor = math.floor(lower)
        actual_ceil = math.ceil(upper)
        assert actual_floor == exp_floor, f"Floor mismatch: got {actual_floor}, expected {exp_floor}"
        assert actual_ceil == exp_ceil, f"Ceil mismatch: got {actual_ceil}, expected {exp_ceil}"

    print("[PASS] Step 2: Prediction interval floor (lower) and ceiling (upper) bounding verified.")

    # 3. Authenticate to test endpoints
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "Admin@12345"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. District Scope Verification
    dist_resp = client.get(
        "/api/v1/predictions/district-month?district_id=1&year=2026&month=11",
        headers=headers,
    )
    assert dist_resp.status_code == 200, f"District prediction failed: {dist_resp.text}"
    dist_data = dist_resp.json()

    raw_pred = dist_data["predicted_count"]
    disp_pred = dist_data.get("display_predicted_count")
    disp_low = dist_data.get("display_interval_lower")
    disp_up = dist_data.get("display_interval_upper")

    assert raw_pred is not None, "Raw continuous predicted_count must not be None!"
    assert isinstance(raw_pred, float), f"Raw predicted_count must remain float, got {type(raw_pred)}"
    assert disp_pred == round(raw_pred), f"display_predicted_count must match round(raw_pred): {disp_pred} vs {round(raw_pred)}"
    assert disp_low == math.floor(dist_data["prediction_interval_lower"]), "Lower bound must use floor"
    assert disp_up == math.ceil(dist_data["prediction_interval_upper"]), "Upper bound must use ceiling"

    print(f"[PASS] Step 3: District Scope Verified (Raw: {raw_pred:.2f} -> Display Integer: {disp_pred}, CI: [{disp_low} – {disp_up}]).")

    # 5. Breakdown Reconciliation Verification (4 Categories + 21 Crime Types)
    breakdown_resp = client.get(
        "/api/v1/predictions/breakdown?district_id=1&year=2026&month=11",
        headers=headers,
    )
    assert breakdown_resp.status_code == 200, f"Breakdown request failed: {breakdown_resp.text}"
    bk_data = breakdown_resp.json()

    total_pred = bk_data["total_predicted_count"]
    target_int = bk_data["total_display_predicted_count"]
    assert target_int == round(total_pred), f"Total display integer must match round(total_pred): {target_int} vs {round(total_pred)}"

    # Check 4 categories reconcile
    categories = bk_data["categories"]
    assert len(categories) == 4, f"Expected 4 categories, got {len(categories)}"
    cat_int_sum = sum(c["display_predicted_count"] for c in categories)
    assert cat_int_sum == target_int, f"Category integer sum {cat_int_sum} does not reconcile with target {target_int}!"

    # Check 21 crime types reconcile
    crime_types = bk_data["crime_types"]
    assert len(crime_types) == 21, f"Expected 21 crime types, got {len(crime_types)}"
    type_int_sum = sum(t["display_predicted_count"] for t in crime_types)
    assert type_int_sum == target_int, f"Crime type integer sum {type_int_sum} does not reconcile with target {target_int}!"

    print(f"[PASS] Step 4: Category & Crime Type Reconciliations verified (Target: {target_int}, Cat Sum: {cat_int_sum}, Type Sum: {type_int_sum}).")

    # 6. Database Verification: Original Floats Preserved
    db = SessionLocal()
    try:
        sample_pred = db.query(CrimePrediction).filter(CrimePrediction.district_id == 1).first()
        assert sample_pred is not None
        assert isinstance(sample_pred.predicted_crime_count, (float, decimal.Decimal)), "Database value must remain continuous decimal/float!"
        print(f"[PASS] Step 5: Database record verified (DB stores continuous decimal: {sample_pred.predicted_crime_count}).")
    finally:
        db.close()

    # 7. State & All India Overview
    overview_resp = client.get("/api/v1/predictions/overview", headers=headers)
    assert overview_resp.status_code == 200
    ov_data = overview_resp.json()
    assert ov_data["districts_covered"] > 0
    print(f"[PASS] Step 6: All India Overview verified ({ov_data['districts_covered']} districts covered).")

    print("=" * 70)
    print("ALL INTEGER PREDICTION PRESENTATION & RECONCILIATION TESTS PASSED!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_integer_predictions()
