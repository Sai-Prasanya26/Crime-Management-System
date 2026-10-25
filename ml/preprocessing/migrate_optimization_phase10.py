"""
Phase 10: AI-Based Police Resource Optimization Schema Migration.

Creates:
1. optimization_runs: Tracks optimization scenario runs, solver status, objective values,
   audit metadata, applied constraints, and explainability summaries.
2. optimization_allocations: Stores district-level baseline, required, recommended,
   and change quantities resulting from constrained optimization runs.

Safe, idempotent migration.
"""

import sys
import os
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine


def migrate_optimization_schema():
    print("Beginning Phase 10 Optimization Schema Migration...")

    with engine.begin() as conn:
        # 1. Create optimization_runs table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS optimization_runs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                run_id VARCHAR(64) NOT NULL UNIQUE,
                scenario_name VARCHAR(100) NOT NULL,
                scenario_type VARCHAR(50) NOT NULL DEFAULT 'BASELINE_CONSTRAINED',
                state_id INT NULL,
                resource_type_id INT NOT NULL,
                period_year SMALLINT NOT NULL,
                period_month SMALLINT NOT NULL,
                assessment_period DATE NOT NULL,
                risk_version VARCHAR(20) NOT NULL DEFAULT 'risk-v2.0',
                forecast_model_id INT NULL,
                forecast_model_version VARCHAR(50) NULL,
                forecast_origin_date DATE NULL,
                algorithm VARCHAR(50) NOT NULL DEFAULT 'MILP_SCIPY_V2',
                pool_capacity INT NOT NULL,
                allocated_total INT NOT NULL DEFAULT 0,
                remaining_pool INT NOT NULL DEFAULT 0,
                total_demand INT NOT NULL DEFAULT 0,
                shortfall_before INT NOT NULL DEFAULT 0,
                shortfall_after INT NOT NULL DEFAULT 0,
                solver_status VARCHAR(30) NOT NULL DEFAULT 'OPTIMAL',
                objective_value DECIMAL(12, 4) NULL,
                execution_duration_ms INT NOT NULL DEFAULT 0,
                constraints_summary JSON NULL,
                explanation_summary TEXT NULL,
                created_by_user_id INT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_opt_runs_period (period_year, period_month),
                INDEX idx_opt_runs_state_res (state_id, resource_type_id),
                INDEX idx_opt_runs_status (solver_status),
                CONSTRAINT fk_opt_runs_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT,
                CONSTRAINT fk_opt_runs_resource_type FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE RESTRICT,
                CONSTRAINT fk_opt_runs_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("  [OK] Checked/Created table `optimization_runs`.")

        # 2. Create optimization_allocations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS optimization_allocations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                run_id VARCHAR(64) NOT NULL,
                district_id INT NOT NULL,
                baseline_quantity INT NULL,
                required_quantity INT NOT NULL DEFAULT 0,
                recommended_quantity INT NOT NULL DEFAULT 0,
                change_quantity INT NOT NULL DEFAULT 0,
                shortfall_before INT NOT NULL DEFAULT 0,
                shortfall_after INT NOT NULL DEFAULT 0,
                priority_score DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
                risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
                allocation_status VARCHAR(30) NOT NULL DEFAULT 'SATISFIED',
                explanation TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_opt_alloc_run (run_id),
                INDEX idx_opt_alloc_district (district_id),
                UNIQUE KEY uq_opt_alloc_run_district (run_id, district_id),
                CONSTRAINT fk_opt_alloc_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("  [OK] Checked/Created table `optimization_allocations`.")

    print("Phase 10 Optimization Schema Migration successfully completed.")


if __name__ == "__main__":
    migrate_optimization_schema()
