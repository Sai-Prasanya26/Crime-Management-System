# Phase 10: AI-Based Police Resource Optimization & Allocation

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module:** Phase 10 — Constrained Operational Police Resource Allocation Engine  
**Release Version:** `opt-v2.0-milp`  
**Date:** October 2026  

---

## 1. Executive Summary & Objective

Phase 10 implements a mathematically sound, constraint-aware, and explainable **Mixed-Integer Linear Programming (MILP)** optimization engine. The system recommends how verified standing police operational resources (e.g., active on-duty personnel and patrol vehicles) can be distributed across 640 Indian districts to minimize modeled demand shortfall and operational risk.

### Core Principles Enforced:
1. **Absolute Resource Conservation:** Recommended allocations never exceed verified available standing pools ($\sum_{d} x_d \le A_{\text{pool}}$).
2. **Zero Synthetic Quantities:** No invented personnel counts, vehicle numbers, or synthetic budgets.
3. **Strict Invariant on Missing Data:** Unrecorded ground inventories strictly maintain `actual_count = NULL` and `gap_count = NULL`. Missing data is never treated as zero.
4. **Jurisdictional & Constitutional Separation:** Police administration under the Indian Constitution (Seventh Schedule, Entry 2, List II) is a state subject. Allocations are modeled per state jurisdiction; state totals are never arbitrarily distributed across disparate states or national totals.
5. **Separation of Operational Domains:** Retrospective crime incident deployment (`police_deployed_count`), standing inventory availability (`state_resources`, `district_resources`), normative required demand, and algorithmic recommendations are kept completely distinct.
6. **Non-Causal Planning Tool:** Recommendations are decision-support indicators for senior leadership, not autonomous deployment orders or promises of crime prevention. Demographic profiling is strictly prohibited.

---

## 2. Institutional Inventory Verification & Discrepancy Resolution

### Table Counts & Data Status Audit

| Table Entity | Physical Database Rows | Verified Non-Null Records | Unrecorded Rows | Governing Sources & Citations |
| :--- | :---: | :---: | :---: | :--- |
| **`state_resources`** | **288** | 288 (100%) | 0 | **BPR&D Data on Police Organizations (DoPO)** as on 01.01.2020 & 01.01.2024; Lok Sabha Unstarred Question No. 2239. |
| **`district_resources`** | **4,510** | 114 (2.5%) | 4,396 (97.5%) | Verified State Police Departmental Gazettes & Annual Administrative Disclosures (UP, TN, AP, KA, MH, DL). |
| **`resource_types`** | **120** | 120 (Catalog) | — | Standardized master catalog across 8 operational functional categories. |

### Explanation of the Phase 7D vs. Phase 9 Reporting Discrepancy
In Phase 9 summary documentation, the state resources count was mistakenly cited as **4,320**, and the district resources count was cited as **4,480**.
Physical database auditing confirms the root cause of this reporting difference:
1. **`state_resources` (288 actual vs. 4,320 reported):**
   There are 36 active States/UTs in India. The system tracks 8 official BPR&D categories with verified state-level data (`POLICE_PERSONNEL_ACTUAL`, `PATROL_VEHICLES`, `POLICE_VEHICLES_TOTAL`, `ECONOMIC_OFFENCES_UNITS`, `POLICE_STATIONS`, `POLICE_OUTPOSTS`, `CYBER_POLICE_STATIONS`, `WOMEN_POLICE_STATIONS`).
   $$36 \text{ States/UTs} \times 8 \text{ Official Resource Types} = 288 \text{ physical rows}$$
   The master taxonomy defines 120 potential resource types. The figure 4,320 was the theoretical unpopulated Cartesian product ($36 \times 120 = 4,320$) erroneously cited instead of the actual physical row count (288).
2. **`district_resources` (4,510 actual vs. 4,480 reported):**
   In early Phase 7B/7C implementation, the initial matrix contained 4,480 rows ($640 \text{ districts} \times 7 \text{ resource types} = 4,480$, with 21 official disclosures and 4,459 unrecorded).
   In Phase 7D, 30 additional verified district-level disclosures from state departmental gazettes were ingested, increasing official non-null records from 21 to 114 and total table rows to 4,510 ($114 \text{ official} + 4,396 \text{ unrecorded} = 4,510$).
   The Phase 9 summary report had cited the earlier pre-Phase 7D audit figure (4,480) instead of the post-Phase 7D verified count (4,510).
3. **Integrity Conclusion:**
   Neither table was modified or degraded. The database has maintained physical row counts of **288** and **4,510** throughout.

---

## 3. Resource Eligibility & Operational Taxonomy

Not all police assets are transferable. Physical buildings cannot be moved, and specialized units operate from centralized headquarters.

| Resource ID | Resource Code | Category | Verified Standing Pool | Transferability Status | Eligibility for Allocation | Operational Constraints |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | `POLICE_PERSONNEL_ACTUAL` | `PERSONNEL` | 2,091,488 (National, 2020) | High | **ELIGIBLE** | Minimum operational reserve floor ($R_d \ge 20\%$); non-transferable baseline for established stations. |
| **2** | `PATROL_VEHICLES` | `MOBILITY` | 120,135 (National, 2024) | High | **ELIGIBLE** | Minimum 2 vehicles per district; vehicle-to-officer ratio $\approx 1:20$. |
| **23** | `POLICE_VEHICLES_TOTAL` | `MOBILITY` | 234,312 (National, 2024) | Moderate | Informational Only | Includes administrative and logistics vehicles. |
| **56** | `ECONOMIC_OFFENCES_UNITS` | `INVESTIGATION` | 29 Wings (2024) | Low | Centralized | State headquarters units; not disaggregated to general districts. |
| **74** | `POLICE_STATIONS` | `INFRASTRUCTURE` | 16,215 (National, 2024) | Zero | **INELIGIBLE** | Immovable brick-and-mortar facilities. Deficit signals long-term capital construction needs. |
| **75** | `POLICE_OUTPOSTS` | `INFRASTRUCTURE` | 9,453 (National, 2024) | Zero | **INELIGIBLE** | Immovable physical outposts/chowkis. |
| **83** | `CYBER_POLICE_STATIONS` | `INFRASTRUCTURE` | 458 (National, 2024) | Zero | **INELIGIBLE** | Gazetted specialized station infrastructure. |
| **84** | `WOMEN_POLICE_STATIONS` | `INFRASTRUCTURE` | 809 (National, 2024) | Zero | **INELIGIBLE** | Gazetted all-women jurisdictional stations. |

---

## 4. Mathematical Optimization Formulation (MILP)

The resource allocation engine is modeled as a Mixed-Integer Linear Program solved deterministically using `scipy.optimize.milp`.

### Parameters & Inputs
For a given state jurisdiction $s$ containing $N$ Census 2011 districts $d \in \{0, \dots, N-1\}$ and resource type $r \in \{1, 2\}$:
- $A_{s, r} \in \mathbb{Z}_{\ge 0}$: Verified standing resource pool from `state_resources.actual_count`.
- $\text{Pop}_d$: Census 2011 district population baseline.
- $S_{\text{risk}, d} \in [0, 100]$: Phase 9 explainable composite risk score (`risk-v2.0` under `FORECAST` mode).
- $\widehat{V}_d$: Phase 8B multi-step forecast from production XGBoost models (`phase8b_xgb_direct_h1`, `h2`, `h3`).
- $B_{d, r}$: Documented baseline inventory from `district_resources.actual_count` if `OFFICIAL%`, else `None` (unrecorded).

### Normative Required Demand ($D_d$)
1. **Police Personnel ($r=1$):**
   $$D_{d, \text{personnel}} = \max\left(5, \left\lceil \frac{\text{Pop}_d}{100{,}000} \times 181.0 \times \max\left(\frac{S_{\text{risk}, d}}{50.0}, 0.5\right) \right\rceil\right)$$
   *(Based on the BPR&D national norm of ~181 police officers per 100,000 population, modulated by the district's dimensionless risk multiplier).*
2. **Patrol Vehicles ($r=2$):**
   $$D_{d, \text{vehicles}} = \max\left(2, \left\lceil \frac{D_{d, \text{personnel}}}{20.0} \right\rceil\right)$$
   *(Based on the BPR&D operational standard of 1 patrol vehicle per 20 active personnel).*

### Minimum Operational Reserve ($R_d$)
To guarantee that basic emergency response is never compromised in lower-crime districts:
$$R_d = \max(1, \lfloor \rho_{\text{reserve}} \times D_d \rfloor)$$
where $\rho_{\text{reserve}} \in [0.10, 0.50]$ (default $\rho = 0.20$; $\rho = 0.40$ in `RESERVE_HEAVY` scenario).  
If district $d$ has an official verified baseline $B_d$, the reserve constraint is bounded by $R_d = \min(B_d, R_d)$.

---

### Decision Variables
- $x_d \in \mathbb{Z}_{\ge 0}$: Integer quantity of resources recommended for district $d$.
- $y_d \in \mathbb{R}_{\ge 0}$: Modeled unmet shortfall in district $d$, where $y_d = \max(0, D_d - x_d)$.

---

### Objective Function
Minimize the risk-weighted sum of unmet demand shortfalls across all districts:
$$\min \sum_{d=0}^{N-1} w_d \cdot y_d$$
where the district priority weight $w_d$ is defined by the planning policy:
- **`BASELINE_CONSTRAINED`:**
  $$w_d = 1.0 + \gamma_{\text{risk}} \left(\frac{S_{\text{risk}, d}}{100.0}\right)$$
- **`CRITICAL_RISK_PRIORITY`:**
  $$w_d = \begin{cases} 2.5 \times \left(1.0 + \gamma \frac{S_d}{100}\right) & \text{if } \text{RiskLevel} = \text{CRITICAL} \\ 1.5 \times \left(1.0 + \gamma \frac{S_d}{100}\right) & \text{if } \text{RiskLevel} = \text{HIGH} \\ 1.0 + \gamma \frac{S_d}{100} & \text{otherwise} \end{cases}$$
- **`PROPORTIONAL_WORKLOAD`:**
  $$w_d = \left(1.0 + \gamma \frac{S_d}{100}\right) \times \left(1.0 + \frac{\widehat{V}_d}{50.0}\right)$$

---

### Constraints
1. **Resource Conservation (Never exceed verified standing pool):**
   $$\sum_{d=0}^{N-1} x_d \le A_{s, r}$$
2. **Minimum Operational Reserve:**
   $$x_d \ge R_d \quad \forall d \in \{0, \dots, N-1\}$$
3. **Shortfall Linearization:**
   $$x_d + y_d \ge D_d \quad \forall d \in \{0, \dots, N-1\}$$
4. **Anti-Hoarding Upper Bound:**
   $$x_d \le \min\left(A_{s, r}, \max(\lceil 1.5 \times D_d \rceil, R_d)\right)$$
5. **Integrality:**
   $$x_d \in \mathbb{Z}_{\ge 0}, \quad y_d \ge 0$$

---

## 5. Solver Statuses & Infeasibility Handling

The engine handles edge cases without crashing:
- **`OPTIMAL`:** Solution found satisfying all constraints with minimum weighted shortfall.
- **`FEASIBLE`:** Solution reached via deterministic greedy priority fallback if numerical precision thresholds are exceeded.
- **`INFEASIBLE`:** Triggered when the sum of minimum required operational reserves exceeds the verified standing pool ($\sum R_d > A_{s, r}$). The system halts and outputs the exact deficit:
  $$\text{Deficit} = \sum_{d} R_d - A_{s, r}$$
- **`INSUFFICIENT_DATA`:** Triggered if standing pool capacity is unrecorded or zero ($A_{s, r} \le 0$).
- **`INELIGIBLE`:** Triggered if the user attempts to allocate immovable infrastructure (e.g., Police Stations).

---

## 6. Database Integration & Schema

### Migration Script: `ml/preprocessing/migrate_optimization_phase10.py`

#### 1. `optimization_runs`
Stores run metadata, solver diagnostics, capacity metrics, and explainability narratives.
- `id` (BIGINT AUTO_INCREMENT PK)
- `run_id` (VARCHAR(64) UNIQUE, e.g., `OPT-20261101-S2-R1-3A4D3D`)
- `scenario_name` (VARCHAR(100))
- `scenario_type` (VARCHAR(50), e.g., `BASELINE_CONSTRAINED`)
- `state_id` (INT FK to `states.id`)
- `resource_type_id` (INT FK to `resource_types.id`)
- `period_year`, `period_month`, `assessment_period` (DATE)
- `risk_version` (`risk-v2.0`)
- `forecast_model_id`, `forecast_model_version`, `forecast_origin_date`
- `algorithm` (`MILP_SCIPY_V2`)
- `pool_capacity`, `allocated_total`, `remaining_pool`, `total_demand`
- `shortfall_before`, `shortfall_after`
- `solver_status` (`OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, `INSUFFICIENT_DATA`, `INELIGIBLE`)
- `objective_value`, `execution_duration_ms`
- `constraints_summary` (JSON), `explanation_summary` (TEXT)
- `created_by_user_id` (INT FK to `users.id`)
- `created_at` (TIMESTAMP)

#### 2. `optimization_allocations`
Stores district-level allocation line-items.
- `id` (BIGINT AUTO_INCREMENT PK)
- `run_id` (VARCHAR(64) FK to `optimization_runs.run_id`)
- `district_id` (INT FK to `districts.id`)
- `baseline_quantity` (INT NULL — preserved as NULL if unrecorded)
- `required_quantity` (INT)
- `recommended_quantity` (INT)
- `change_quantity` (INT)
- `shortfall_before`, `shortfall_after` (INT)
- `priority_score` (DECIMAL(6, 2)), `risk_score` (DECIMAL(5, 2)), `risk_level` (VARCHAR(20))
- `allocation_status` (`SATISFIED`, `PARTIAL`, `DEFICIT`, `UNMET`)
- `explanation` (TEXT)

---

## 7. REST API Endpoints

All endpoints are mounted under `/api/v1/optimization`:

| Method | Endpoint | Description | Access Control |
| :--- | :--- | :--- | :--- |
| `GET` | `/overview` | Returns high-level optimization summary, verified inventories, eligible categories, and recent runs. | Authenticated Staff |
| `GET` | `/resources` | Audits standing state pools and reconciles the Phase 9 reporting discrepancy. | Authenticated Staff |
| `GET` | `/recommendations` | Paginated district allocations across runs, filterable by state, district, risk band, status. | Authenticated Staff |
| `GET` | `/runs` | List executed optimization runs with capacity utilization and shortfall reduction metrics. | Authenticated Staff |
| `GET` | `/runs/{run_id}` | Full detailed run profile with constraints applied and all district line-items. | Authenticated Staff |
| `POST` | `/run` | Executes constrained MILP optimization under standing pool constraints. | **`require_analyst` (ANALYST / ADMIN)** |
| `POST` | `/scenarios` | Simulates and compares multiple planning scenarios side-by-side. | **`require_analyst` (ANALYST / ADMIN)** |

---

## 8. Verified Scenario Execution Results & Phase 10.1 Governance

### Andhra Pradesh (State 2) — Scenario Analysis & Governance Audit

In Phase 10, an initial mathematical optimization run was executed distributing the verified standing strength of Andhra Pradesh (59,553 officers) across 23 Census districts. In **Phase 10.1**, this scenario was audited and placed under rigorous data integrity governance:

#### 1. Operational Mode Evaluation (Phase 10.1 Strict Guard)
- **Run Type:** Operational Deployment Allocation (`mode = "OPERATIONAL"`, `is_simulation = false`)
- **Jurisdiction:** Andhra Pradesh (23 Census 2011 districts)
- **Verified Standing Force:** **59,553 officers** (Official BPR&D DoPO 2020 aggregate across all wings, headquarters, armed reserve battalions, and stations)
- **District Ground Staffing Coverage:** Only **2 of 23 districts** (Visakhapatnam = 2,890, Hyderabad = 7,420) have official gazetted disclosures. The remaining **21 districts are unrecorded (`actual_count = NULL`)**.
- **Transferable Quota:** No state-level inter-district transferable pool or mobile quota is documented in official gazettes.
- **Phase 10.1 Solver Result:**
  - **Status:** **`INSUFFICIENT_DATA`**
  - **Allocated Total:** **0 officers** (Strict operational halt; system refuses to generate unsupported operational deployments)
  - **Standing Pool Display:** **59,553 officers** (Preserved and displayed separately as verified state-level aggregate only)
  - **Explanation:** *"Operational district allocation halted: Official district-level baseline staffing is unrecorded for 21 of 23 districts in Andhra Pradesh. Furthermore, no official state-level transferable pool or inter-district transfer quota is documented. Under strict Phase 10.1 data integrity standards, state-level standing force totals cannot be assumed to be 100% mobile or reallocated across districts with unrecorded staffing."*

#### 2. Hypothetical Planning Simulation (Phase 10.1 Segregated Mode)
- **Run Type:** Hypothetical Capacity Planning Simulation (`mode = "SIMULATION"`, `is_simulation = true`)
- **Run ID:** `OPT-20261101-S2-R1-SIM`
- **Solver Status:** **`SIMULATION`**
- **Simulation Capacity Envelope:** 59,553 officers (modeled as theoretical upper ceiling)
- **District Allocations:**
  - **Visakhapatnam (District 22):** Verified Baseline: 2,890 (`OFFICIAL_DISTRICT_DISCLOSED`), Recommended: 3,211 (`PARTIAL`), Explanation: *"SIMULATION TARGET: Verified ground baseline is 2,890..."*
  - **Krishna (District 12):** Verified Baseline: `NULL` (`UNRECORDED_DATA_UNAVAILABLE`), Recommended: 3,598 (`PARTIAL`), Explanation: *"SIMULATION ONLY: Official district baseline is unrecorded. Normative demand modeled from population and risk score. Recommended simulation allocation is a theoretical capacity planning figure, NOT actual staffing or an operational deployment order."*
  - **Anantapur (District 12):** Verified Baseline: `NULL` (`UNRECORDED_DATA_UNAVAILABLE`), Recommended: 2,748 (`PARTIAL`)
- **Institutional Simulation Assumptions Enforced:**
  1. *District Baseline Staffing:* Official district-level baseline police deployment is unrecorded for most districts and is strictly NOT inferred from state averages.
  2. *Transferable Pool:* Total state standing force represents cumulative administrative strength; it does NOT constitute an authorized mobile or transferable pool.
  3. *Normative Demands:* District demand figures are theoretical normative models based on BPR&D population benchmarks (181 officers per 100k) and Phase 9 risk scores for capacity simulation only.
  4. *Non-Operational Status:* This simulation output is an advisory policy-modeling indicator and MUST NOT be used as operational deployment orders.

---

## 9. Verification & Automated Test Results

### Test Suite: `backend/tests/test_constrained_resource_optimization.py`
All 21 test cases pass cleanly:

```text
test_01_inventory_integrity_and_reconciliation ... OK (288 state, 4,510 district rows verified)
test_02_missing_null_and_unrecorded_quantities ... OK (Unrecorded counts remain NULL, never 0)
test_03_no_double_counting_state_and_district  ... OK (State pool isolated from district disclosures)
test_04_resource_conservation_guarantee       ... OK (Allocated <= Pool capacity strictly verified)
test_05_resource_eligibility_and_transfer_restrictions ... OK (Stations rejected with INELIGIBLE)
test_06_infeasible_scenarios_handling          ... OK (Reserve > Pool returns INFEASIBLE diagnostic)
test_07_historical_versus_forecast_input_separation ... OK (Uses Phase 9 forecast & Phase 8B models)
test_08_forecast_model_provenance              ... OK (model_version and origin_date persisted)
test_09_assessment_period_validation          ... OK (Malformed date rejected with HTTP 400)
test_10_deterministic_results                 ... OK (Identical inputs produce identical allocations)
test_11_baseline_preservation_and_scenario_isolation ... OK (Inventories untouched during runs)
test_12_authorization_and_rbac                 ... OK (401 unauthenticated, 403 OFFICER, 200 ANALYST)
test_13_database_rollback_on_failure          ... OK (Atomic rollback on persistence failure)
test_14_empty_inventory_and_insufficient_data ... OK (Returns INSUFFICIENT_DATA when pool is 0)
test_15_api_response_validation               ... OK (Validates schemas for all endpoints)
test_16_regression_integrity_of_crime_and_geography ... OK (191,679 crimes & 640 districts untouched)
test_17_operational_mode_halts_on_unrecorded_district_inventories ... OK (Operational AP halts with INSUFFICIENT_DATA)
test_18_transferable_pool_ceiling_enforcement  ... OK (Allocations never exceed transferable pool ceiling)
test_19_hypothetical_simulation_segregation_and_assumptions ... OK (Simulations tagged with 4 assumptions)
test_20_district_baseline_data_status_preservation ... OK (Disclosed official vs unrecorded NULL preserved)
test_21_historical_runs_preservation_and_validity_marker ... OK (Pre-Phase 10.1 runs preserved with validity markers)

----------------------------------------------------------------------
Ran 21 tests in 1.917s
OK
```

### Full Backend Regression Suite
- **Total Tests:** **149 tests** across all test suites (`backend/tests/`).
- **Result:** **149 passed, 0 failed, 0 errors** (`OK`). Zero regressions.

### Frontend Production Build & Linting
- **Build (`npm run build`):** `✓ built in 4.25s` (Exit code 0).
- **Lint (`npm run lint`):** `0 errors, 26 warnings` (Exit code 0).

---

## 10. Operational Guidelines, Ethical Safeguards, & Limitations

1. **Constitutional Framework:** Police is a State Subject under Entry 2, List II of the Seventh Schedule to the Constitution of India. Final deployment authority rests exclusively with state Directorates General of Police and Home Departments.
2. **Planning Indicator Only:** Allocations represent mathematical suggestions based on reported crime caseloads and Census 2011 population figures. They must not be misconstrued as executive deployment orders.
3. **No Individual Profiling:** Under no circumstances should this system be used to allocate surveillance or personnel targeting specific religious, ethnic, caste, or demographic communities.
4. **Data Freshness Prerequisite:** While BPR&D DoPO 2020/2024 provides authoritative baseline strength, operational adoption requires periodic ingestion of real-time gazetted departmental vacancies.

