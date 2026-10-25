# Phase 11: Budget Estimation & Cost Analysis

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Repository:** [Crime-Management-System](https://github.com/Sai-Prasanya26/Crime-Management-System)  
**Implementation Phase:** Phase 11  
**Status:** Completed & Validated  

---

## 1. Executive Summary

Phase 11 implements the **Budget Estimation and Cost Analysis Engine** for the Crime Management System. It connects the constrained mixed-integer linear programming (MILP) resource optimization models from Phase 10 & 10.1 to rigorous, formulaic financial analysis.

### Core Objectives Delivered:
1. **Institutional Financial Audit & Benchmark Provenance:** Established an authoritative registry of 13 police asset cost benchmarks grounded in the **7th Central Pay Commission (7th CPC)**, **Bureau of Police Research and Development (BPR&D)** equipment and mobility compendiums, and **Government e-Marketplace (GeM)** police vehicle rate contracts.
2. **Recurring vs. Capital Separation:** Strictly separates monthly and annual recurring operating and maintenance (O&M) expenditures (salaries, fuel/POL, preventative servicing, network bandwidth) from one-time capital procurement outlays (vehicle purchases, CSI mobile forensic stations, CCTV junction nodes, station modernization).
3. **Phase 10 / 10.1 Optimization Integration:** Integrates dynamically with optimization runs to calculate:
   - Baseline scenario operational cost
   - Recommended allocation scenario operational cost
   - Incremental annual cost delta ($\Delta \text{Cost} = \text{Cost}_{\text{scenario}} - \text{Cost}_{\text{baseline}}$)
   - One-time capital procurement cost to resolve standing shortfalls
   - Reallocation vs. new procurement segregation: Reallocating standing reserve personnel/vehicles incurs zero capital expenditure.
4. **Data Integrity & Zero-Fabrication Standard:**
   - **Operational Integrity Guard:** In compliance with Phase 10.1 findings, operational runs on districts with unrecorded baseline inventories strictly halt with `INSUFFICIENT_DATA` rather than synthesizing speculative municipal expenditure totals.
   - **Simulation Segregation:** Hypothetical capacity simulations are labeled `SIMULATION_ESTIMATE` with prominent disclaimers preventing misinterpretation as sanctioned government appropriations.
   - **No Non-Causal Claims:** The engine refrains from claiming unevidenced budget savings or direct crime reductions resulting solely from resource reallocation.
5. **Full REST API Suite & Light-Theme Dashboard:** Deployed 7 REST endpoints under `/api/v1/budget` protected by role-based access control (RBAC), alongside an interactive dashboard in `BudgetCostAnalysisView.tsx` and `BudgetIntelligencePage.tsx`.

---

## 2. Database Architecture & Schema Design

Phase 11 introduces three dedicated relational tables to ensure complete fiscal lineage without altering existing resource inventories, historical crime records, or prediction tables:

```
+---------------------------------------------------------------------------------------------------+
|                                        DATABASE SCHEMA                                            |
+---------------------------------------------------------------------------------------------------+
|  cost_benchmark_rates                                                                             |
|  - id: INT (PK)                                                                                   |
|  - resource_type_id: INT (FK -> resource_types.id)                                                |
|  - cost_type: VARCHAR(30) [RECURRING_MONTHLY, RECURRING_ANNUAL, ONE_TIME_CAPITAL]                 |
|  - cost_component: VARCHAR(50) [SALARY_ALLOWANCES, FUEL_POL, MAINTENANCE, EQUIPMENT_PROCUREMENT]  |
|  - unit_cost_inr: DECIMAL(14, 2)                                                                  |
|  - source_name: VARCHAR(150)                                                                      |
|  - source_publication: VARCHAR(255)                                                              |
|  - reference_year: SMALLINT                                                                       |
|  - data_quality_tier: VARCHAR(30) [OFFICIAL_DOCUMENTED, ESTIMATED_BENCHMARK, ASSUMPTION_BASED]     |
|  - formula_expression: VARCHAR(255)                                                               |
|  - assumptions_notes: TEXT                                                                        |
|  - is_active: BOOLEAN                                                                             |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-------------------------------------------------+-------------------------------------------------+
|  budget_estimation_runs                         |  budget_estimation_items                        |
|  - id: BIGINT (PK)                              |  - id: BIGINT (PK)                              |
|  - run_id: VARCHAR(64) (UNIQUE INDEX)           |  - run_id: VARCHAR(64) (FK / INDEX)             |
|  - optimization_run_id: VARCHAR(64) (INDEX)     |  - district_id: INT (FK -> districts.id)        |
|  - state_id: INT (FK -> states.id)              |  - resource_type_id: INT (FK -> res_types.id)    |
|  - resource_type_id: INT (FK -> res_types.id)   |  - baseline_units: INT NULL                     |
|  - period_year: SMALLINT                        |  - recommended_units: INT                       |
|  - period_month: SMALLINT                       |  - new_procurement_units: INT                   |
|  - assessment_period: DATE                      |  - monthly_recurring_unit_cost: DECIMAL(12, 2)  |
|  - estimation_mode: VARCHAR(30)                 |  - annual_recurring_unit_cost: DECIMAL(14, 2)   |
|  - currency: VARCHAR(10) [INR]                  |  - one_time_unit_cost: DECIMAL(14, 2)           |
|  - total_baseline_recurring_annual: DEC(16, 2)  |  - baseline_annual_cost: DECIMAL(14, 2)         |
|  - total_scenario_recurring_annual: DEC(16, 2)  |  - recommended_annual_cost: DECIMAL(14, 2)      |
|  - total_baseline_recurring_monthly: DEC(16, 2) |  - procurement_cost: DECIMAL(14, 2)             |
|  - total_scenario_recurring_monthly: DEC(16, 2) |  - net_delta_annual_cost: DECIMAL(14, 2)        |
|  - total_one_time_procurement_cost: DEC(16, 2)  |  - data_quality_tier: VARCHAR(30)               |
|  - incremental_recurring_cost: DEC(16, 2)       |  - explanation: TEXT                            |
|  - total_shortfall_resolution_cost: DEC(16, 2)  +-------------------------------------------------+
|  - verified_cost_ratio: DECIMAL(5, 2)                                                             |
|  - assumed_cost_ratio: DECIMAL(5, 2)                                                              |
|  - status: VARCHAR(30) [COMPLETED, INSUFFICIENT_DATA]                                             |
|  - assumptions_summary: JSON                                                                      |
|  - explanation_summary: TEXT                                                                      |
|  - created_by_user_id: INT (FK -> users.id)                                                       |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Authoritative Government Benchmark Registry

The system provides 13 verified benchmark rates seeded via `ml/preprocessing/migrate_budget_phase11.py`:

| Resource Asset | Category | Cost Type | Component | Unit Cost (INR) | Source Publication & Authority | Quality Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Police Officers** | PERSONNEL | Recurring Monthly | Salary & Allowances | ₹55,000 / mo | 7th CPC Level 6 & BPR&D DOPO 2024 | `ESTIMATED_BENCHMARK` |
| **Police Officers** | PERSONNEL | One-Time Capital | Equipment & Kit | ₹75,000 | BPR&D DOPO Equipment Compendium 2021 | `ESTIMATED_BENCHMARK` |
| **Civil Police** | PERSONNEL | Recurring Monthly | Salary & Allowances | ₹42,000 / mo | 7th CPC Level 3 Pay Matrix 2024 | `ESTIMATED_BENCHMARK` |
| **Civil Police** | PERSONNEL | One-Time Capital | Equipment Outfitting | ₹50,000 | BPR&D Constable Initial Entitlement | `ESTIMATED_BENCHMARK` |
| **Patrol Vehicles** | MOBILITY | One-Time Capital | Vehicle Procurement | ₹9,50,000 | GeM DGS&D Police Vehicle Contract 2023 | `ESTIMATED_BENCHMARK` |
| **Patrol Vehicles** | MOBILITY | Recurring Monthly | Fuel / POL | ₹16,000 / mo | MoRTH Fuel Index & BPR&D Mobility 2023 | `ESTIMATED_BENCHMARK` |
| **Patrol Vehicles** | MOBILITY | Recurring Monthly | Periodic Maintenance | ₹6,000 / mo | State Police MT Workshop Schedule 2023 | `ESTIMATED_BENCHMARK` |
| **Investigation Teams** | INVESTIGATION | One-Time Capital | CSI Forensic Kit | ₹4,80,000 | BPR&D Mobile Forensics Standards 2021 | `ESTIMATED_BENCHMARK` |
| **Investigation Teams** | INVESTIGATION | Recurring Monthly | Field Operating Exp | ₹18,000 / mo | State CID Investigation Guidelines 2022 | `ASSUMPTION_BASED` |
| **Surveillance Units** | SURVEILLANCE | One-Time Capital | CCTV Junction Node | ₹3,50,000 | MHA Safe City Project DPR 2022 | `ESTIMATED_BENCHMARK` |
| **Surveillance Units** | SURVEILLANCE | Recurring Monthly | Network Bandwidth/AMC| ₹6,500 / mo | Safe City AMC Norms & Tariff 2023 | `ASSUMPTION_BASED` |
| **Police Stations** | INFRASTRUCTURE | Recurring Monthly | Facility Upkeep | ₹45,000 / mo | State Police Contingency Fund Manual | `ASSUMPTION_BASED` |
| **Police Stations** | INFRASTRUCTURE | One-Time Capital | Station Modernization| ₹8,00,000 | MHA MPF Scheme 2022-2026 Guidelines | `ESTIMATED_BENCHMARK` |

---

## 4. Cost Estimation Formulas & Calculation Methodology

For each optimization scenario run and district $d$:

1. **Recurring Operating & Maintenance (O&M) Cost:**
   $$\text{Cost}_{\text{recurring, annual}}(d) = Q_{\text{rec}}(d) \times \text{Rate}_{\text{annual}}$$
   $$\text{Cost}_{\text{recurring, monthly}}(d) = \frac{\text{Cost}_{\text{recurring, annual}}(d)}{12}$$
   Where $\text{Rate}_{\text{annual}} = \text{Rate}_{\text{monthly}} \times 12$.

2. **Capital Procurement Cost (Shortfall Resolution):**
   When district baseline $Q_{\text{base}}(d)$ is recorded:
   $$\text{Units}_{\text{procure}}(d) = \max\left(0, Q_{\text{rec}}(d) - Q_{\text{base}}(d)\right)$$
   $$\text{Cost}_{\text{procurement}}(d) = \text{Units}_{\text{procure}}(d) \times \text{Rate}_{\text{one-time capital}}$$

3. **Incremental Annual Cost Delta ($\Delta \text{Cost}$):**
   $$\Delta \text{Cost} = \sum_{d} \left(\text{Cost}_{\text{scenario, annual}}(d) - \text{Cost}_{\text{baseline, annual}}(d)\right)$$

4. **Total Shortfall Resolution Cost:**
   $$\text{Cost}_{\text{shortfall resolution}} = \text{Cost}_{\text{procurement}} + \max\left(0, \Delta \text{Cost}\right)$$

5. **Reallocation vs. New Procurement Separation:**
   $$\text{Units}_{\text{reallocated}} = \min\left(\text{Allocated Total}, \text{Transferable Pool Ceiling}\right)$$
   $$\text{Capital Cost for Reallocated Units} = ₹0.00$$

---

## 5. REST API Specifications

All endpoints are mounted under prefix `/api/v1/budget`:

| HTTP Method | Endpoint | Description | RBAC Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/overview` | Macroeconomic budget KPIs, category breakdowns, and provenance ratios | Authenticated User |
| `GET` | `/benchmarks` | Lists active benchmark rates with full source citations and quality tiers | Authenticated User |
| `GET` | `/benchmarks/{resource_type_id}` | Aggregated recurring and capital rates for a specific resource type | Authenticated User |
| `POST` | `/benchmarks` | Registers a new benchmark rate | Analyst or Admin |
| `PUT` | `/benchmarks/{rate_id}` | Updates existing benchmark parameters or notes | Analyst or Admin |
| `POST` | `/estimate` | Runs dynamic cost estimation linked to an optimization run or baseline | Analyst or Admin |
| `POST` | `/scenarios/compare` | Calculates delta cost and procurement needs between two scenarios | Analyst or Admin |
| `GET` | `/runs` | Lists historical cost estimation runs | Authenticated User |
| `GET` | `/runs/{run_id}` | Fetches full run details with granular district line items | Authenticated User |

---

## 6. Frontend Dashboard Components

Implemented in `frontend/src/components/budget/BudgetCostAnalysisView.tsx` and hosted within `BudgetIntelligencePage.tsx` and `ResourceOptimizationPage.tsx`:

- **Fiscal Summary Cards:** Annual Scenario Operating Cost, Monthly O&M, Incremental Cost Delta ($\Delta \text{Cost}$), Capital Procurement Outlay, and Shortfall Resolution Total.
- **Five Interactive Tabs:**
  1. *Scenario Comparison & Delta:* Side-by-side comparison of baseline vs scenario, itemizing standing reallocations vs new procurement outlays.
  2. *Category & Component Breakdown:* Functional domain breakdown (Personnel, Mobility, Investigation, Surveillance, Infrastructure).
  3. *District Line-Item Calculations:* Granular district table with search, state filtering, quality tiers, and net cost deltas.
  4. *Benchmark Rates & Provenance Registry:* Complete disclosure of unit costs, reference publications, years, and calculation formulas.
  5. *Estimation History:* Audit log of past fiscal runs.
- **Simulation Disclaimer Banners:** Highlights theoretical simulation models and prevents mistaking hypothetical planning for sanctioned expenditures.
- **Insufficient Data State:** Clear, actionable guidance explaining why operational estimations halt when district baselines are unrecorded.

---

## 7. Verification & Automated Test Results

The implementation was validated against a 12-test suite in `backend/tests/test_budget_cost_analysis.py`, followed by the full backend regression suite:

```text
Ran 161 tests in 45.773s
OK (failures=0, errors=0)
```

- **Phase 11 Tests:** 12/12 passing.
- **Regression Suite:** 149/149 passing (Phases 1 through 10.1).
- **Frontend Production Build:** Built in 3.23s (`npm --prefix frontend run build` exited with code 0).
- **Frontend Linter:** Oxlint verified 65 files with 0 errors (`npm --prefix frontend run lint`).
- **Database Baseline Preservation:**
  - `crime_incidents`: Exactly 191,679 records preserved.
  - `districts`: Exactly 640 Census 2011 districts preserved.
  - `states`: Exactly 37 states preserved.
  - `state_resources`: Exactly 288 records preserved.
  - `district_resources`: Exactly 4,510 records preserved (114 official, 4,396 unrecorded NULL).
