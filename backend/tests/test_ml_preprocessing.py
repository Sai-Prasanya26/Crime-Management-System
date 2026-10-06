"""
Phase 8B: ML Preprocessing & Feature Engineering Test Suite.

Verifies:
1. 640 Census 2011 historical districts matched to incidents
2. Total incidents sum = 191,679 across 2020-2025
3. Complete panel = 46,080 district-month observations
4. Zero-incident months = 3,327, Active = 42,753
5. Strict backward-looking lags and trailing rolling windows (zero leakage)
6. Target isolation: target_incident_count is NOT in features
7. Post-incident attributes excluded from feature columns
8. Demographic join: exactly 1 Census record per district
9. Warm-up handling: exactly 7,680 rows removed, clean dataset = 38,400 rows
10. Chronological splits: Train (23,040) < Validation (7,680) < Test (7,680)
"""

import sys
import os
import unittest
import numpy as np
import pandas as pd

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine
from ml.preprocessing.panel_builder import (
    build_district_month_panel,
    EXPECTED_DISTRICTS_COUNT,
    EXPECTED_TOTAL_MONTHS,
    EXPECTED_PANEL_ROWS,
    EXPECTED_TOTAL_INCIDENTS,
)
from ml.feature_engineering.feature_pipeline import (
    load_census_demographics,
    generate_features,
    prepare_modeling_dataset,
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    FORBIDDEN_LEAKAGE_COLUMNS,
)


class TestMLPreprocessingPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Build panel and feature matrix once for read-only test assertions."""
        cls.panel_df = build_district_month_panel(engine)
        cls.features_df = generate_features(cls.panel_df, engine)
        cls.clean_df, cls.metadata = prepare_modeling_dataset(cls.features_df)

    def test_01_panel_dimensions_and_completeness(self):
        """Assertion 1-4: Complete balanced 46,080 panel with 640 districts and 72 months."""
        self.assertEqual(len(self.panel_df), EXPECTED_PANEL_ROWS)
        self.assertEqual(self.panel_df["district_id"].nunique(), EXPECTED_DISTRICTS_COUNT)
        self.assertEqual(self.panel_df["period"].nunique(), EXPECTED_TOTAL_MONTHS)
        self.assertEqual(self.panel_df["period"].min(), "2020-01-01")
        self.assertEqual(self.panel_df["period"].max(), "2025-12-01")

    def test_02_incident_count_integrity(self):
        """Assertion 5-6: Total incidents sum = 191,679 with zero negative counts."""
        total_incidents = int(self.panel_df["incident_count"].sum())
        self.assertEqual(total_incidents, EXPECTED_TOTAL_INCIDENTS)
        self.assertTrue((self.panel_df["incident_count"] >= 0).all())

        # Check zero vs active cells
        zero_cells = int((self.panel_df["incident_count"] == 0).sum())
        active_cells = int((self.panel_df["incident_count"] > 0).sum())
        self.assertEqual(zero_cells, 3327)
        self.assertEqual(active_cells, 42753)
        self.assertEqual(zero_cells + active_cells, EXPECTED_PANEL_ROWS)

    def test_03_no_duplicate_district_month_keys(self):
        """Assertion 5: Unique (district_id, period) primary composite key."""
        dup_count = self.panel_df.duplicated(subset=["district_id", "period"]).sum()
        self.assertEqual(dup_count, 0)

    def test_04_demographics_join_integrity(self):
        """Assertion 7-8: Exactly 1 positive Census demographic profile per district."""
        df_demo = load_census_demographics(engine)
        self.assertEqual(len(df_demo), EXPECTED_DISTRICTS_COUNT)
        self.assertEqual(df_demo["district_id"].nunique(), EXPECTED_DISTRICTS_COUNT)
        self.assertTrue((df_demo["total_population"] > 0).all())
        self.assertTrue((df_demo["male_population"] > 0).all())
        self.assertTrue((df_demo["female_population"] > 0).all())
        self.assertTrue((df_demo["literate_population"] > 0).all())
        self.assertTrue((df_demo["total_workers"] > 0).all())

    def test_05_strict_backward_looking_lags(self):
        """Assertion 9: No future leakage in autoregressive lag features."""
        # Pick 5 distinct districts and verify lags match historical values exactly
        test_districts = self.features_df["district_id"].unique()[:5]
        for d_id in test_districts:
            sub = self.features_df[self.features_df["district_id"] == d_id].sort_values("period_date").reset_index()
            # For every index t >= 12, check lag_1, lag_2, lag_3, lag_12
            for t in range(12, len(sub)):
                actual_target = sub.loc[t, TARGET_COLUMN]
                # lag_1 must equal target at t-1
                self.assertEqual(sub.loc[t, "lag_1"], sub.loc[t - 1, TARGET_COLUMN])
                # lag_2 must equal target at t-2
                self.assertEqual(sub.loc[t, "lag_2"], sub.loc[t - 2, TARGET_COLUMN])
                # lag_3 must equal target at t-3
                self.assertEqual(sub.loc[t, "lag_3"], sub.loc[t - 3, TARGET_COLUMN])
                # lag_12 must equal target at t-12
                self.assertEqual(sub.loc[t, "lag_12"], sub.loc[t - 12, TARGET_COLUMN])

    def test_06_strict_trailing_rolling_features(self):
        """Assertion 9: Rolling windows are strictly shifted and backward-looking."""
        test_districts = self.features_df["district_id"].unique()[:5]
        for d_id in test_districts:
            sub = self.features_df[self.features_df["district_id"] == d_id].sort_values("period_date").reset_index()
            for t in range(12, len(sub)):
                # rolling_mean_3 must equal mean of [t-3, t-2, t-1]
                expected_rm3 = np.round(np.mean([sub.loc[t - 3, TARGET_COLUMN], sub.loc[t - 2, TARGET_COLUMN], sub.loc[t - 1, TARGET_COLUMN]]), 4)
                self.assertAlmostEqual(sub.loc[t, "rolling_mean_3"], expected_rm3, places=3)
                # rolling_mean_12 must equal mean of [t-12 ... t-1]
                expected_rm12 = np.round(np.mean([sub.loc[t - k, TARGET_COLUMN] for k in range(1, 13)]), 4)
                self.assertAlmostEqual(sub.loc[t, "rolling_mean_12"], expected_rm12, places=3)

    def test_07_target_and_leakage_isolation(self):
        """Assertion 10: Target is isolated; forbidden post-incident columns excluded."""
        self.assertNotIn(TARGET_COLUMN, FEATURE_COLUMNS)
        for col in FORBIDDEN_LEAKAGE_COLUMNS:
            self.assertNotIn(col, FEATURE_COLUMNS)
            self.assertNotIn(col, self.features_df.columns)

    def test_08_warmup_removal_and_modeling_rows(self):
        """Assertion 14: Exactly 7,680 warm-up rows removed; 38,400 clean rows remain."""
        warmup_rows = int((self.features_df["split"] == "WARMUP").sum())
        self.assertEqual(warmup_rows, 7680)
        self.assertEqual(len(self.clean_df), 38400)
        # Clean dataframe must have 0 NaNs across all feature columns
        self.assertEqual(self.clean_df[FEATURE_COLUMNS].isna().sum().sum(), 0)

    def test_09_chronological_splits_and_ordering(self):
        """Assertion 11-13: Train < Validation < Test with zero random shuffling."""
        train_df = self.clean_df[self.clean_df["split"] == "TRAIN"]
        val_df = self.clean_df[self.clean_df["split"] == "VALIDATION"]
        test_df = self.clean_df[self.clean_df["split"] == "TEST"]

        self.assertEqual(len(train_df), 23040)  # 2021-2023: 36 months * 640 districts
        self.assertEqual(len(val_df), 7680)    # 2024: 12 months * 640 districts
        self.assertEqual(len(test_df), 7680)   # 2025: 12 months * 640 districts

        # Temporal boundaries
        self.assertEqual(train_df["year"].min(), 2021)
        self.assertEqual(train_df["year"].max(), 2023)
        self.assertEqual(val_df["year"].min(), 2024)
        self.assertEqual(val_df["year"].max(), 2024)
        self.assertEqual(test_df["year"].min(), 2025)
        self.assertEqual(test_df["year"].max(), 2025)

        # Strict chronological ordering
        self.assertLess(train_df["period"].max(), val_df["period"].min())
        self.assertLess(val_df["period"].max(), test_df["period"].min())

    def test_10_metadata_and_feature_list_structure(self):
        """Verify feature list count and metadata schema."""
        self.assertEqual(len(FEATURE_COLUMNS), 25)
        self.assertEqual(self.metadata["feature_count"], 25)
        self.assertEqual(self.metadata["clean_modeling_rows"], 38400)
        self.assertIn("fold_1", self.metadata["walk_forward_folds"])
        self.assertIn("fold_2", self.metadata["walk_forward_folds"])
        self.assertIn("fold_3", self.metadata["walk_forward_folds"])


if __name__ == "__main__":
    unittest.main()
