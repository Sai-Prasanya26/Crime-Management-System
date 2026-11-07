"""
Unit tests for ETL pipeline safety guardrails (Phase A - Fix 1).

Verifies that:
1. check_protected_data_exists identifies protected post-2011 carved administrative districts,
   dual-layer geography mappings, machine learning predictions, and risk scores.
2. Default invocation prevents table truncation (truncate_first=False).
3. Invocation with truncate_first=True without force_truncate=True raises ValueError.
4. Invocation with force_truncate=True when protected data exists raises RuntimeError unless
   allow_protected_destruction=True is explicitly specified.
"""

import unittest
from unittest.mock import MagicMock, patch
from data_import.import_pipeline import check_protected_data_exists, run_pipeline


class TestETLSafetyGuardrails(unittest.TestCase):
    def test_check_protected_data_detects_counts(self):
        """Verifies check_protected_data_exists queries protected tables and aggregates counts."""
        mock_db = MagicMock()
        # Mock execute returning scalars for each of the 4 queries
        mock_db.execute.return_value.scalar.side_effect = [171, 171, 21760, 3840]

        stats = check_protected_data_exists(mock_db)
        self.assertEqual(stats["carved_districts"], 171)
        self.assertEqual(stats["geography_mappings"], 171)
        self.assertEqual(stats["crime_predictions"], 21760)
        self.assertEqual(stats["risk_scores"], 3840)
        self.assertEqual(mock_db.execute.call_count, 4)

    def test_check_protected_data_handles_missing_tables_gracefully(self):
        """Verifies check_protected_data_exists handles missing tables without failing."""
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("Table does not exist")

        stats = check_protected_data_exists(mock_db)
        self.assertEqual(stats["carved_districts"], 0)
        self.assertEqual(stats["geography_mappings"], 0)
        self.assertEqual(stats["crime_predictions"], 0)
        self.assertEqual(stats["risk_scores"], 0)

    @patch("data_import.import_pipeline.SessionLocal")
    @patch("os.path.exists", return_value=True)
    def test_run_pipeline_raises_value_error_if_truncate_without_force_flag(
        self, mock_exists, mock_session_local
    ):
        """Verifies run_pipeline refuses to truncate if force_truncate=False."""
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        with self.assertRaises(ValueError) as ctx:
            run_pipeline(truncate_first=True, force_truncate=False)

        self.assertIn("Destructive truncation blocked", str(ctx.exception))
        self.assertIn("--force-truncate", str(ctx.exception))
        # Ensure no SQL TRUNCATE statement was ever executed
        for call_arg in mock_db.execute.call_args_list:
            sql_text = str(call_arg[0][0])
            self.assertNotIn("TRUNCATE", sql_text.upper())

    @patch("data_import.import_pipeline.check_protected_data_exists")
    @patch("data_import.import_pipeline.SessionLocal")
    @patch("os.path.exists", return_value=True)
    def test_run_pipeline_refuses_truncation_when_protected_data_exists(
        self, mock_exists, mock_session_local, mock_check_protected
    ):
        """Verifies run_pipeline raises RuntimeError when protected data exists without override flag."""
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        mock_check_protected.return_value = {
            "carved_districts": 171,
            "geography_mappings": 171,
            "predictions": 21760,
            "risk_scores": 3840,
        }

        with self.assertRaises(RuntimeError) as ctx:
            run_pipeline(
                truncate_first=True,
                force_truncate=True,
                allow_protected_destruction=False,
            )

        self.assertIn("Destructive truncation blocked by safety guardrails", str(ctx.exception))
        self.assertIn("171 carved districts", str(ctx.exception))
        self.assertIn("--allow-protected-data-destruction", str(ctx.exception))
        # Ensure no SQL TRUNCATE statement was ever executed
        for call_arg in mock_db.execute.call_args_list:
            sql_text = str(call_arg[0][0])
            self.assertNotIn("TRUNCATE", sql_text.upper())


if __name__ == "__main__":
    unittest.main()
