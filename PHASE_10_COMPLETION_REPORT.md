# Phase 10: Crime-Specific AI-Based Preventive Resource Optimization Completion Report

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase:** 10 — Crime-Specific AI-Based Preventive Resource Optimization  
**Date:** November 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 10 completes the **Crime-Specific AI-Based Preventive Resource Optimization** module. Unlike naive resource allocation systems that simply distribute police personnel proportional to aggregate district risk scores or population counts, this module connects directly to:
1. **Phase 8 Hierarchical Crime-Type Predictions:** Incorporating machine learning forecast incident counts across all **21 specific crime types** and **4 major crime categories** (`Violent Crime`, `Other Crime`, `Traffic Fatality`, `Fire Accident`).
2. **Phase 9 Transparent Risk Assessments:** Calibrating allocation triage through empirical district risk scores ($0.0 - 100.0$) and risk tiers (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), ensuring high-threat districts and high-severity offenses receive prioritized coverage under capacity constraints without artificially distorting baseline operational demand.
3. **Four Shared Preventive Resource Pools:** Formulating resource demands and constraints into 4 standing pools:
   - `PERSONNEL`: Police Officers, Patrolling Units, Traffic Police, Beat Constables
   - `MOBILITY`: High-visibility Patrol Vehicles, Interceptors, Highway Patrol Units
   - `INVESTIGATION`: Specialized Investigation Officers, Forensic Teams, Case Officers
   - `SPECIALIZED`: Cyber Crime Officers, Digital Forensics Analysts, Financial Fraud Units
4. **Constrained Mixed-Integer Linear Programming (MILP):** Using SciPy's high-performance integer linear programming solver (`scipy.optimize.milp`), guaranteeing exact, non-fractional integer allocations ($x_{d, c} \in \mathbb{N}_0$) and enforcing strict physical resource conservation ($\sum_{d} x_{d, c} \le C_{s, c}$). Allocations never exceed available standing inventory pools.

---

## 2. Mathematical Formulation & Architecture

### 2.1 Crime-Specific Demand Formulation

For district $d$, predicted crime type $k \in \{1, \dots, 21\}$, and shared resource pool $c \in \{\text{PERSONNEL}, \text{MOBILITY}, \text{INVESTIGATION}, \text{SPECIALIZED}\}$:

Let:
- $\hat{y}_{d, k}$: Expected incident forecast count from Phase 8.
- $\alpha_{k, c}$: Requirement coefficient (resources required per incident).
- $\tau_k$: Activation threshold (minimum incident bundle needed to trigger resource commitment).
- $w_k$: Crime severity weight ($w \ge 1.0$, e.g., Murder = 3.0, Cyber Fraud = 1.8, Thefts = 1.0).
- $\text{Risk}_d$: Phase 9 overall relative risk score ($0 \le \text{Risk}_d \le 100$).

The raw continuous demand $D_{d, k, c}^{\text{raw}}$ is calculated as:
$$D_{d, k, c}^{\text{raw}} = \begin{cases} \alpha_{k, c} \times \hat{y}_{d, k} & \text{if } \hat{y}_{d, k} \ge \tau_k \\ 0 & \text{otherwise} \end{cases}$$

Aggregating across all crime types mapped to pool $c$ in district $d$:
$$D_{d, c} = \left\lceil \sum_{k \in \mathcal{K}_c} D_{d, k, c}^{\text{raw}} \right\rceil$$

Demand $D_{d, c}$ is strictly an integer ($\in \mathbb{N}_0$).

### 2.2 Scipy Integer MILP Formulation

Let $x_{d, c}$ denote the integer decision variable representing units of pool $c$ allocated to district $d$.

#### Objective Function:
$$\text{Maximize } Z = \sum_{d=1}^{N_d} \sum_{c \in \mathcal{C}} \pi_{d, c} \cdot x_{d, c} - \lambda \sum_{d=1}^{N_d} \sum_{c \in \mathcal{C}} (D_{d, c} - x_{d, c})$$

Where the priority coefficient $\pi_{d, c}$ is defined by:
$$\pi_{d, c} = \bar{w}_{d, c} \times \left(1.0 + \frac{\text{Risk}_d}{100.0}\right) \times \gamma_{\text{archetype}}$$

- $\bar{w}_{d, c}$: Weighted severity of crimes demanding pool $c$ in district $d$.
- $\text{Risk}_d / 100.0$: Phase 9 relative risk score priority multiplier (ensures scarce resources flow first to high-threat districts).
- $\gamma_{\text{archetype}}$: Archetype multiplier (e.g., $1.5\times$ for violent offenses in `HIGH_SEVERITY_PRIORITY`, $2.0\times$ for digital units in `CYBER_SPECIALIZED`).
- $\lambda$: Shortage penalty coefficient ($\lambda = 0.1$).

#### Constraints:
1. **Strict Capacity Conservation:**
   $$\sum_{d=1}^{N_d} x_{d, c} \le C_{s, c} \quad \forall c \in \mathcal{C}$$
   Where $C_{s, c}$ is the available standing pool capacity in state $s$:
   $$C_{s, c} = \text{Total Inventory}_{s, c} - \text{Currently Deployed}_{s, c} - \text{Unavailable}_{s, c}$$
2. **Demand Ceiling (No Over-Allocation / Surplus Wastage):**
   $$0 \le x_{d, c} \le D_{d, c} \quad \forall d, c$$
3. **Exact Integrality:**
   $$x_{d, c} \in \mathbb{N}_0 \quad (\text{integrality vector } = \mathbf{1})$$

---

## 3. Crime-to-Resource Mapping Master (21 Crime Types)

The system maintains 51 institutional mapping parameters connecting all 21 crime types across 4 major crime categories:

| Crime Type | Category | Severity | Mapped Resource | Shared Pool | Coefficient | Threshold | Weight | Operational Mitigation Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MURDER** | Violent Crime | CRITICAL | Police Officers | PERSONNEL | 0.80 | 0.00 | 3.0 | Static perimeter cordons, rapid armed intervention teams, and high-visibility armed deterrents. |
| **MURDER** | Violent Crime | CRITICAL | Investigation Teams | INVESTIGATION | 1.00 | 0.00 | 3.0 | Senior homicide detectives, ballistic examiners, and crime-scene forensic documentation units. |
| **RAPE** | Violent Crime | CRITICAL | Police Officers | PERSONNEL | 0.60 | 0.00 | 2.5 | Dedicated anti-harassment patrols, transit hub escorts, and sensitive area foot patrols. |
| **RAPE** | Violent Crime | CRITICAL | Investigation Teams | INVESTIGATION | 1.00 | 0.00 | 2.5 | Specialized Women Protection Cell investigators and forensic medical evidence officers. |
| **KIDNAPPING & ABDUCTION**| Violent Crime | HIGH | Investigation Teams | INVESTIGATION | 0.90 | 0.00 | 2.2 | Anti-kidnapping squads, technical surveillance, cell tower triangulation, and tactical search. |
| **KIDNAPPING & ABDUCTION**| Violent Crime | HIGH | Patrol Vehicles | MOBILITY | 0.50 | 0.00 | 2.0 | Highway perimeter interception units, choke-point checkpoints, and border seal teams. |
| **ROBBERY** | Violent Crime | HIGH | Patrol Vehicles | MOBILITY | 0.40 | 0.05 | 1.8 | High-frequency motorized vehicular sweeps across commercial hubs and vulnerable transit routes. |
| **ROBBERY** | Violent Crime | HIGH | Police Officers | PERSONNEL | 0.50 | 0.05 | 1.8 | Beat patrols and foot presence outside financial branches, jewelry centers, and market hubs. |
| **DACOITY** | Violent Crime | CRITICAL | Police Officers | PERSONNEL | 1.00 | 0.00 | 2.8 | Armed quick-reaction patrols, rural boundary barricades, and heavy tactical deterrence. |
| **DACOITY** | Violent Crime | CRITICAL | Investigation Teams | INVESTIGATION | 1.00 | 0.00 | 2.8 | Organized crime branch investigators and specialized inter-district intelligence teams. |
| **BURGLARY** | Other Crime | MEDIUM | Police Officers | PERSONNEL | 0.25 | 0.10 | 1.2 | Night patrolling, residential colony beat presence, and door-to-door verification units. |
| **THEFT** | Other Crime | LOW | Police Officers | PERSONNEL | 0.15 | 0.20 | 1.0 | Beat constable presence at parking lots, markets, transport termini, and crowded public spaces. |
| **AUTO THEFT** | Other Crime | MEDIUM | Patrol Vehicles | MOBILITY | 0.30 | 0.10 | 1.3 | Automated number plate recognition (ANPR) vehicles, checkpoint sweeps, and exit blockade units. |
| **CHEATING & FRAUD** | Other Crime | MEDIUM | Investigation Teams | INVESTIGATION | 0.40 | 0.05 | 1.4 | Economic offenses wing investigators, banking liaison officers, and financial document auditors. |
| **CYBER FRAUD** | Other Crime | HIGH | Cyber Police Personnel | SPECIALIZED | 0.70 | 0.00 | 2.2 | Cyber forensics lab analysts, digital money-trail tracking specialists, and CDR analyzers. |
| **HACKING & IDENTITY THEFT**| Other Crime| HIGH | Cyber Police Personnel | SPECIALIZED | 0.80 | 0.00 | 2.4 | Reverse-engineering malware analysts, server log auditors, and digital evidence recovery units. |
| **TRAFFIC FATALITY** | Traffic Fatality| HIGH | Traffic Police | PERSONNEL | 0.60 | 0.00 | 2.0 | Speed violation enforcement, DUI interceptors, pedestrian crossing safety officers, and corridor teams. |
| **TRAFFIC FATALITY** | Traffic Fatality| HIGH | Highway Patrol Units | MOBILITY | 0.50 | 0.00 | 2.0 | National and state highway patrol cruisers, automated speed laser gun units, and tow assistance. |
| **HIT & RUN** | Traffic Fatality| HIGH | Highway Patrol Units | MOBILITY | 0.50 | 0.00 | 2.1 | Highway intersection pursuit cruisers, surveillance camera monitoring, and immediate chase response. |
| **FIRE ACCIDENT** | Fire Accident | HIGH | Police Officers | PERSONNEL | 0.40 | 0.00 | 1.8 | Perimeter crowd control, emergency evacuation corridor protection, and ambulance escorts. |

*All mappings are exposed via REST API (`/api/v1/optimization/crime-mappings`), configurable by administrators with instant reset capabilities.*

---

## 4. Standing Resource Inventory Baseline (36 States / UTs)

To prevent arbitrary allocations or double-counting, standing inventories are partitioned into 4 distinct physical categories across all 36 active States/UTs:
1. **Total Sanctioned / Standing Inventory:** Baseline inventory capacity recorded under official reporting standards (144 baseline institutional records).
2. **Currently Deployed / Committed Count:** Resources permanently stationed at police stations, courthouses, or ongoing operational beats.
3. **Unavailable Pool:** Units offline due to maintenance, repairs, training, or statutory leave.
4. **Available Standing Pool:** Physical reserve pool available for preventive deployment:
   $$\text{Available Pool} = \max(0, \text{Total Inventory} - \text{Currently Deployed} - \text{Unavailable})$$

*Auditable and updateable via `GET /api/v1/optimization/inventory` and `PUT /api/v1/optimization/inventory/{id}`.*

---

## 5. Scenario Planning & Strategy Archetypes

The solver provides 5 distinct operational and simulation scenario archetypes:
1. `CRIME_SPECIFIC_OPTIMAL` (Default): Balanced multi-pool MILP optimization maximizing global coverage across all predicted crime types.
2. `HIGH_SEVERITY_PRIORITY`: Prioritizes critical and violent crimes (Murder, Rape, Dacoity), committing tactical personnel and investigation squads to top-threat districts first.
3. `CYBER_SPECIALIZED`: Boosts specialized cyber personnel and digital forensic investigators for high-tech financial fraud and identity theft.
4. `HIGHWAY_SAFETY`: Targets traffic fatalities and hit-and-run hotspots, concentrating mobile cruisers and traffic interceptors along major highway corridors.
5. `CAPACITY_STRESS_TEST`: Simulates a severe capacity reduction (e.g. 50% pool availability) to stress-test triage behavior and identify bottleneck districts.

---

## 6. API Implementation & RBAC Protection

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/optimization/crime-mappings` | List all 21 crime-to-resource mapping master records | Authenticated |
| `PUT` | `/api/v1/optimization/crime-mappings/{id}` | Update requirement coefficient, threshold, weight, or rationale | **ADMIN** |
| `POST`| `/api/v1/optimization/crime-mappings/reset` | Reset mappings to institutional baseline defaults | **ADMIN** |
| `GET` | `/api/v1/optimization/crime-demand` | Calculate district crime-specific demand breakdown | Authenticated |
| `GET` | `/api/v1/optimization/inventory` | List standing inventory records across 36 jurisdictions | Authenticated |
| `PUT` | `/api/v1/optimization/inventory/{id}` | Update inventory total, deployed, or unavailable counts | **ADMIN** |
| `GET` | `/api/v1/optimization/inventory/summary` | Get aggregated inventory totals & available pools | Authenticated |
| `POST`| `/api/v1/optimization/crime-optimize` | Execute Scipy integer MILP optimization | **ANALYST / ADMIN** |

*Unauthorized roles (e.g. `OFFICER`) attempting write or optimization actions receive HTTP 403 Forbidden; unauthenticated requests receive HTTP 401 Unauthorized.*

---

## 7. Frontend User Interface (`CrimeSpecificOptimizationView.tsx`)

The frontend was integrated into `frontend/src/components/optimization/CrimeSpecificOptimizationView.tsx` and toggled directly within `ConstrainedOptimizationView.tsx`:
1. **Interactive Configuration Controls:**
   - State selector covering all 36 active States/UTs.
   - Forecast horizon selector (e.g. `Nov 2026`, `Dec 2026`, etc.).
   - Scenario archetype selector (`CRIME_SPECIFIC_OPTIMAL`, `HIGH_SEVERITY_PRIORITY`, `CYBER_SPECIALIZED`, `HIGHWAY_SAFETY`, `EQUAL_DEFICIT_REDUCTION`).
   - Operational vs Simulation mode toggle.
   - Collapsible capacity override panel with reset button.
2. **5 Top-Level KPI Summary Cards:**
   - Available Standing Pool (summed across 4 pools)
   - Total Crime Demand (calculated from 21 predicted crimes)
   - Total Allocated (strictly $\le$ pool capacity)
   - Unmet Demand / Shortage
   - Overall Coverage Rate (%) with solver execution duration in ms
3. **4 Shared Pool Capacity Cards:**
   - Personnel, Mobility, Investigation, and Specialized progress bars showing demanded, allocated, available capacity, and coverage %.
4. **District Recommendations Table:**
   - District name, resource pool, Phase 9 relative risk score & tier badge (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
   - Top predicted crimes with forecast counts.
   - Demanded, allocated, shortage, coverage %, and status badge (`SATISFIED`, `PARTIAL`, `DEFICIT`, `UNMET`).
   - "Explain" drill-down button on every row.
5. **District Explainability Drill-Down Drawer / Modal:**
   - Plain-language narrative rationale.
   - Resource allocation summary bar.
   - Full Phase 8 predicted crime types table with coefficients, raw demand, and institutional mitigation rationales.
6. **Crime-to-Resource Mapping Master Tab:**
   - Filter by shared pool, view coefficients, edit parameters (Admin modal), and reset defaults.
7. **Standing Resource Inventory Tab:**
   - Comprehensive audit of standing, deployed, unavailable, and available counts with Admin update modal.
8. **Statutory Planning Disclaimer Banner:**
   - Prominent notice on all views emphasizing decision-support status under the Police Act with zero demographic profiling.

---

## 8. Verification & Test Evidence

### 8.1 Automated Test Suite (`test_crime_resource_optimization_phase_10.py`)
Run command: `backend\.venv\Scripts\python.exe -m unittest backend/tests/test_crime_resource_optimization_phase_10.py`

| # | Test Case | Target Requirement | Status |
| :--- | :--- | :--- | :--- |
| 1 | `test_01_crime_mapping_master_retrieval` | 21 crime types mapped to 4 pools with coefficients & rationales | **PASSED** |
| 2 | `test_02_crime_mapping_admin_update_and_reset` | RBAC protection (403 for Officer) and admin reset functionality | **PASSED** |
| 3 | `test_03_standing_inventory_records_and_summary` | Arithmetic validity across 144 records and summary endpoint | **PASSED** |
| 4 | `test_04_district_crime_demand_calculation` | Phase 8 predictions + Phase 9 risk score integer demand generation | **PASSED** |
| 5 | `test_05_crime_specific_milp_optimization_conservation` | Strict capacity conservation ($\sum \le C$) and non-negative integers | **PASSED** |
| 6 | `test_06_scarcity_triage_and_prioritization` | High-risk districts receive prioritized allocation under scarcity | **PASSED** |
| 7 | `test_07_scenario_archetypes_and_capacity_overrides` | Scenario archetypes and custom pool capacity limits | **PASSED** |
| 8 | `test_08_simulation_isolation` | Simulations do not mutate baseline database records | **PASSED** |
| 9 | `test_09_rbac_and_auth_guards` | 401 unauthenticated, 403 unauthorized role, 200 for Analyst/Admin | **PASSED** |
| 10 | `test_10_persistence_and_run_history` | Optimization runs and line items persisted to database | **PASSED** |
| 11 | `test_11_zero_demand_and_edge_cases` | Safe handling of zero capacity without crashes or divisions by zero | **PASSED** |
| 12 | `test_12_regression_and_historical_preservation` | Asserts 191,679 incidents, 36 states, 790 active districts intact | **PASSED** |

**Result: 12 tests ran in 63.923s — OK (100% Passed)**

### 8.2 Frontend Production Build
Run command: `npm --prefix frontend run build`
- TypeScript Compiler: 0 errors
- Modules transformed: 2,572
- Asset generation: Clean production bundles generated in 2.75s
- Status: **PASSED (Exit Code 0)**

### 8.3 Regression Verification Across Completed Phases
1. **Phase 7 (Geographical Intelligence):**
   `test_geographical_intelligence_phase_7.py` -> 7 tests passed in 3.693s (**OK**)
2. **Phase 8 (ML Predictions):**
   `test_ml_predictions_phase_8.py` -> 6 tests passed in 1.299s (**OK**)
3. **Phase 9 (Risk Assessment):**
   `test_risk_assessment_phase_9.py` -> 8 tests passed in 1.297s (**OK**)
   `test_explainable_risk_scoring.py` & `test_risk_engine.py` -> 32 tests passed in 6.495s (**OK**)

---

## 9. Conclusion

Phase 10 is fully implemented, verified, and integrated into the application. The system connects machine learning crime predictions and risk assessments into an explainable, constrained police resource optimization engine. 

As instructed, work has ceased at the completion of Phase 10. Phase 11 (Budget Estimation & Cost Analysis) will only begin upon explicit user authorization.
