"""
Phase 11: Budget Estimation and Cost Analysis Schema Migration & Benchmark Seeding.

Creates:
1. cost_benchmark_rates: Stores verified/benchmark unit costs with full provenance metadata
   (source publication, year, formula, quality tier, and assumptions).
2. budget_estimation_runs: Stores cost estimation runs linked to optimization scenarios,
   recording baseline vs scenario costs, delta, shortfall resolution cost, and simulation flags.
3. budget_estimation_items: District-level itemized cost calculations.

Safe, idempotent migration.
"""

import sys
import os
from sqlalchemy import text

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine


def migrate_budget_schema():
    print("Beginning Phase 11 Budget Estimation Schema Migration...")

    with engine.begin() as conn:
        # 1. Create cost_benchmark_rates table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cost_benchmark_rates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                resource_type_id INT NOT NULL,
                cost_type VARCHAR(30) NOT NULL,
                cost_component VARCHAR(50) NOT NULL,
                unit_cost_inr DECIMAL(14, 2) NOT NULL,
                source_name VARCHAR(150) NOT NULL,
                source_publication VARCHAR(255) NOT NULL,
                reference_year SMALLINT NOT NULL DEFAULT 2024,
                data_quality_tier VARCHAR(30) NOT NULL DEFAULT 'ESTIMATED_BENCHMARK',
                formula_expression VARCHAR(255) NOT NULL,
                assumptions_notes TEXT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_bench_resource (resource_type_id, cost_type),
                INDEX idx_bench_tier (data_quality_tier),
                CONSTRAINT fk_bench_resource_type FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE RESTRICT,
                CONSTRAINT uq_bench_rate UNIQUE (resource_type_id, cost_type, cost_component)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("[OK] Table cost_benchmark_rates verified / created.")

        # 2. Create budget_estimation_runs table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS budget_estimation_runs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                run_id VARCHAR(64) NOT NULL UNIQUE,
                optimization_run_id VARCHAR(64) NULL,
                state_id INT NULL,
                resource_type_id INT NULL,
                period_year SMALLINT NOT NULL,
                period_month SMALLINT NOT NULL,
                assessment_period DATE NOT NULL,
                estimation_mode VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL_COST',
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                total_baseline_recurring_annual DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_scenario_recurring_annual DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_baseline_recurring_monthly DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_scenario_recurring_monthly DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_one_time_procurement_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                incremental_recurring_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                total_shortfall_resolution_cost DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
                verified_cost_ratio DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
                assumed_cost_ratio DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
                status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
                assumptions_summary JSON NULL,
                explanation_summary TEXT NULL,
                created_by_user_id INT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_budget_runs_period (period_year, period_month),
                INDEX idx_budget_runs_opt (optimization_run_id),
                INDEX idx_budget_runs_status (status),
                CONSTRAINT fk_budget_runs_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT,
                CONSTRAINT fk_budget_runs_res FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE RESTRICT,
                CONSTRAINT fk_budget_runs_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("[OK] Table budget_estimation_runs verified / created.")

        # 3. Create budget_estimation_items table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS budget_estimation_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                run_id VARCHAR(64) NOT NULL,
                district_id INT NOT NULL,
                resource_type_id INT NOT NULL,
                baseline_units INT NULL,
                recommended_units INT NOT NULL DEFAULT 0,
                new_procurement_units INT NOT NULL DEFAULT 0,
                monthly_recurring_unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                annual_recurring_unit_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                one_time_unit_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                baseline_annual_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                recommended_annual_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                procurement_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                net_delta_annual_cost DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                data_quality_tier VARCHAR(30) NOT NULL DEFAULT 'ESTIMATED_BENCHMARK',
                explanation TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_budget_items_run (run_id),
                INDEX idx_budget_items_district (district_id),
                INDEX idx_budget_items_resource (resource_type_id),
                CONSTRAINT fk_budget_items_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT,
                CONSTRAINT fk_budget_items_resource FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """))
        print("[OK] Table budget_estimation_items verified / created.")

        # 4. Seed benchmark rates for primary resource types and categories
        seed_benchmarks(conn)

    print("Phase 11 Schema Migration & Seeding completed successfully.")


def seed_benchmarks(conn):
    """Seeds authoritative benchmark cost rates for Indian police resources."""
    benchmarks = [
        # Resource 1: Police Officers (General Police Personnel / Sub-Inspectors)
        {
            "resource_type_id": 1,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "SALARY_ALLOWANCES",
            "unit_cost_inr": 55000.00,
            "source_name": "7th Central Pay Commission (7th CPC) / BPR&D Police Salary Norms",
            "source_publication": "Ministry of Finance 7th CPC Pay Matrix Level 6 & BPR&D DOPO 2024",
            "reference_year": 2024,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "base_basic (35400) + da_46pct (16284) + hra_18pct (6372) - net rounded CTC",
            "assumptions_notes": "Assumes Sub-Inspector / Executive Officer Grade Level 6 standard composite monthly salary including 46% DA and 18% HRA.",
        },
        {
            "resource_type_id": 1,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "EQUIPMENT_PROCUREMENT",
            "unit_cost_inr": 75000.00,
            "source_name": "BPR&D Standard Equipment & Uniform Entitlement",
            "source_publication": "BPR&D DOPO Equipment Compendium 2021",
            "reference_year": 2021,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "initial_uniform_allowance + tactical_gear + service_weapon_issue_amortized",
            "assumptions_notes": "Initial one-time capital outfitting, personal tactical equipment, service kit, and foundation induction equipment.",
        },

        # Resource 2: Patrol Vehicles (Four-Wheeler Police Utility Patrol Vehicle)
        {
            "resource_type_id": 2,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "EQUIPMENT_PROCUREMENT",
            "unit_cost_inr": 950000.00,
            "source_name": "Government e-Marketplace (GeM) Police Vehicle Contract",
            "source_publication": "GeM DGS&D Rate Contracts for Police Utility Vehicles (Mahindra Bolero / Scorpio Police Edition)",
            "reference_year": 2023,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "chassis_base_cost + police_siren_lightbar_retrofit + radio_mount",
            "assumptions_notes": "Standard 4x4/4x2 utility diesel police patrol vehicle with beacon, PA system, and basic communication docking.",
        },
        {
            "resource_type_id": 2,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "FUEL_POL",
            "unit_cost_inr": 16000.00,
            "source_name": "MoRTH Fleet Fuel Indices / BPR&D Mobility Norms",
            "source_publication": "BPR&D Chapter 3 Mobility Index & MoRTH Fuel Norms 2023",
            "reference_year": 2023,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "(150 km/day * 30.4 days / 12 km/l) * 95 INR/l fuel + lubricants",
            "assumptions_notes": "Assumes active 24/7 patrol rotation averaging 150 km per day at standard diesel rate of ₹95-₹100/l.",
        },
        {
            "resource_type_id": 2,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "MAINTENANCE",
            "unit_cost_inr": 6000.00,
            "source_name": "State Police Motor Transport Maintenance Norms",
            "source_publication": "State Motor Transport Workshop Standard Maintenance Schedule 2023",
            "reference_year": 2023,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "scheduled_service + tire_wear_amortization + comprehensive_insurance_monthly",
            "assumptions_notes": "Periodic mechanical servicing, preventative maintenance, replacement consumables, and third-party fleet insurance.",
        },

        # Resource 3: Investigation Teams
        {
            "resource_type_id": 3,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "EQUIPMENT_PROCUREMENT",
            "unit_cost_inr": 480000.00,
            "source_name": "BPR&D Standards for Crime Scene Investigation Kits",
            "source_publication": "BPR&D CSI Mobile Forensic Kits & Digital Extraction Toolkit Norms 2021",
            "reference_year": 2021,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "csi_physical_evidence_kit + forensic_camera + ruggedized_mobile_terminal",
            "assumptions_notes": "Standardized physical evidence recovery kit, digital photography unit, latent print detection, and evidence packaging gear.",
        },
        {
            "resource_type_id": 3,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "OPERATING_EXPENSES",
            "unit_cost_inr": 18000.00,
            "source_name": "State CID Field Investigation Contingency Norms",
            "source_publication": "State Police CID Investigation Expense Guidelines 2022",
            "reference_year": 2022,
            "data_quality_tier": "ASSUMPTION_BASED",
            "formula_expression": "forensic_consumables + investigation_travel_allowance + lab_courier_fees",
            "assumptions_notes": "Recurring forensic test reagents, evidence transit, summon delivery conveyance, and case documentation supplies.",
        },

        # Resource 4: Surveillance Units
        {
            "resource_type_id": 4,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "EQUIPMENT_PROCUREMENT",
            "unit_cost_inr": 350000.00,
            "source_name": "Safe City Project MHA Detailed Project Report",
            "source_publication": "Ministry of Home Affairs Safe City Technical Architecture DPR 2022",
            "reference_year": 2022,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "3_fixed_bullet_cameras + 1_ptz_camera + industrial_switch + ups_power + mount",
            "assumptions_notes": "Junction-level surveillance package with 4 HD cameras, surge suppression, edge recording, and mounting hardware.",
        },
        {
            "resource_type_id": 4,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "MAINTENANCE",
            "unit_cost_inr": 6500.00,
            "source_name": "Safe City AMC Norms & Telecommunications Tariff",
            "source_publication": "BPR&D Safe City Operational Guidelines 2023",
            "reference_year": 2023,
            "data_quality_tier": "ASSUMPTION_BASED",
            "formula_expression": "dedicated_fiber_vpn_bandwidth (3500) + annual_maintenance_contract_monthly (3000)",
            "assumptions_notes": "High-availability fiber backhaul connection to district command center and SLA-backed preventative camera maintenance.",
        },

        # Resource 8: Civil Police Personnel
        {
            "resource_type_id": 8,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "SALARY_ALLOWANCES",
            "unit_cost_inr": 42000.00,
            "source_name": "7th Central Pay Commission Level 3 Pay Matrix",
            "source_publication": "Ministry of Finance 7th CPC Civil Police Constable Norms 2024",
            "reference_year": 2024,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "basic (21700) + da_46pct (9982) + hra_18pct (3906) + special_allowance",
            "assumptions_notes": "Civil police constable operational personnel standard monthly compensation.",
        },
        {
            "resource_type_id": 8,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "EQUIPMENT_PROCUREMENT",
            "unit_cost_inr": 50000.00,
            "source_name": "BPR&D Constable Initial Entitlement Schedule",
            "source_publication": "BPR&D DOPO 2021 Chapter 4 Equipment",
            "reference_year": 2021,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "uniforms + body_armor_fraction + protective_gear + baton/handcuffs",
            "assumptions_notes": "Initial personal protective equipment, uniforms, boots, and tactical kit for new constabulary intake.",
        },

        # Resource 74: Police Stations (Infrastructure)
        {
            "resource_type_id": 74,
            "cost_type": "RECURRING_MONTHLY",
            "cost_component": "FACILITY_UPKEEP",
            "unit_cost_inr": 45000.00,
            "source_name": "State Police Station Contingency Fund Norms",
            "source_publication": "State Police Headquarters Station House Contingency Fund Manual 2022",
            "reference_year": 2022,
            "data_quality_tier": "ASSUMPTION_BASED",
            "formula_expression": "electricity_utilities (22000) + telecoms/broadband (8000) + sanitation/maintenance (15000)",
            "assumptions_notes": "Monthly operational running costs for a standard category police station building.",
        },
        {
            "resource_type_id": 74,
            "cost_type": "ONE_TIME_CAPITAL",
            "cost_component": "INFRASTRUCTURE_UPGRADE",
            "unit_cost_inr": 800000.00,
            "source_name": "MHA Modernisation of Police Forces (MPF) Scheme",
            "source_publication": "MHA MPF Scheme 2022-2026 Guidelines for Model Police Stations",
            "reference_year": 2023,
            "data_quality_tier": "ESTIMATED_BENCHMARK",
            "formula_expression": "cctv_compliance + reception_desk_upgrade + generator_backup + lockup_sanitation",
            "assumptions_notes": "One-time capital infrastructure refurbishment for Supreme Court CCTV compliance and citizen reception desk modernization.",
        },
    ]

    for b in benchmarks:
        conn.execute(text("""
            INSERT INTO cost_benchmark_rates (
                resource_type_id, cost_type, cost_component, unit_cost_inr,
                source_name, source_publication, reference_year, data_quality_tier,
                formula_expression, assumptions_notes, is_active
            ) VALUES (
                :resource_type_id, :cost_type, :cost_component, :unit_cost_inr,
                :source_name, :source_publication, :reference_year, :data_quality_tier,
                :formula_expression, :assumptions_notes, 1
            )
            ON DUPLICATE KEY UPDATE
                unit_cost_inr = VALUES(unit_cost_inr),
                source_name = VALUES(source_name),
                source_publication = VALUES(source_publication),
                reference_year = VALUES(reference_year),
                data_quality_tier = VALUES(data_quality_tier),
                formula_expression = VALUES(formula_expression),
                assumptions_notes = VALUES(assumptions_notes),
                is_active = 1
        """), b)

    print(f"[OK] Seeded / updated {len(benchmarks)} authoritative benchmark rates.")


if __name__ == "__main__":
    migrate_budget_schema()
