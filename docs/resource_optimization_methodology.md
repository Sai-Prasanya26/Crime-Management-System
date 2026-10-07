# Crime Resource Optimization Methodology Specification

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase**: Phase 10A — Resource Optimization Methodology & Design  
**Methodology Version**: `resource-v1.0`  
**Status**: **Frozen Methodology Specification** (Ready for Phase 10B Implementation)  

---

## 1. Purpose & Core Principles

The Resource Optimization Engine bridges empirical crime intelligence and operational public safety decision-making. Following the progression:

$$\text{Crime Intelligence} \longrightarrow \text{Risk Assessment} \longrightarrow \text{Resource Requirement} \longrightarrow \text{Resource Availability} \longrightarrow \text{Resource Shortfall} \longrightarrow \text{Recommended Allocation} \longrightarrow \text{Budget Estimation}$$

The system provides an **explainable, deterministic, and capacity-constrained** allocation framework for deployable police resources across 640 historical administrative districts.

### Core Architectural Principles:
1. **Explainability**: Every resource requirement must be mathematically derived from verified indicators (risk score, forecast volume, population scale, trend) without black-box opacity.
2. **Operational Realism**: Allocations must reflect the physical scale of jurisdictions while giving decisive priority to acute threat intensities and emerging crime surges.
3. **No Fabricated Inventories**: The system must operate truthfully when district standing inventory data is unrecorded, avoiding synthetic or guessed availability numbers.
4. **Finite Capacity Optimization**: Rationalizes deployable assets under administrative capacity constraints, guaranteeing that recommendations never exceed available reserve pools.
5. **Auditable Budget Lineage**: Feeds directly into Budget Intelligence using statutory unit costs configured in the database.
6. **Demographic Neutrality**: Strictly excludes personal demographic attributes (victim age, gender, race, religion) to ensure constitutional and ethical fairness.

---

## 2. Existing Resource Data Audit Summary

An empirical audit of the MySQL database and source datasets established the following facts (detailed in [`docs/resource_data_audit.md`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/docs/resource_data_audit.md)):

- **Resource Master Data**:
  - `resource_types`: 4 active records (`Police Officers`, `Patrol Vehicles`, `Investigation Teams`, `Surveillance Units`).
  - `resource_costs`: 4 active unit costs configured in INR (`₹50,000`, `₹35,000`, `₹120,000`, `₹25,000` per month).
- **Operational Inventory**:
  - `district_resources`: Contains **0 rows**. Standing district inventory is unrecorded in source datasets.
  - `police_deployed_count` in `crime_incidents`: Represents an incident-level dispatch load (mean $\mu = 12.52$ officers/event). It does **not** represent total district force inventory and is **prohibited** from being aggregated as available strength.
- **Intelligence Inputs**:
  - `crime_risk_scores`: 640 assessed districts for target period $2026\text{-}01$, with overall risk scores ($\mu = 50.00$, $\sigma = 13.69$) and factor percentiles.
  - `crime_predictions`: 8,320 validated monthly forecasts from the production HGBR model ($\mu = 4.37$ incidents/month).
  - `district_demographics`: Census 2011 decennial population for all 640 districts ($\mu = 1.89\text{M}$ citizens).

---

## 3. Resource Categories

The 4 standardized law enforcement resource types codified in `resource_types`:

| ID | Resource Name | Unit of Measure | Description | Operational Role |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `Police Officers` | `Personnel` | Frontline patrol and law enforcement officers | Presence, rapid emergency response, community deterrence |
| **2** | `Patrol Vehicles` | `Vehicles` | Mobile patrol vehicles and pursuit cruisers | Beat coverage, rapid mobility, visible deterrence |
| **3** | `Investigation Teams` | `Teams` | Specialized criminal investigation units | Formal case processing, forensic evidence, suspect apprehension |
| **4** | `Surveillance Units` | `Units` | CCTV monitoring and aerial surveillance assets | Hotspot situational awareness, force-multiplication |

All 4 resource types are discrete (integer count), deployable, and have verified monthly unit costs.

---

## 4. Resource Cost Audit

The database contains statutory cost configurations in `resource_costs`:

| Cost ID | Resource Type ID | Resource Name | Unit Cost | Billing Period | Currency | Status |
| :-: | :-: | :--- | :---: | :---: | :-: | :-: |
| **1** | 1 | Police Officers | **₹50,000.00** | Monthly per Officer | INR | Active |
| **2** | 2 | Patrol Vehicles | **₹35,000.00** | Monthly per Vehicle | INR | Active |
| **3** | 3 | Investigation Teams | **₹120,000.00** | Monthly per Team | INR | Active |
| **4** | 4 | Surveillance Units | **₹25,000.00** | Monthly per Unit | INR | Active |

### Cost Governance Rules:
1. Costs reflect monthly operational maintenance and personnel compensation.
2. If any resource type lacks an active cost entry in `resource_costs`, unit cost must be reported as `NULL` and flagged as `"Cost data unavailable"`. The system will **never** invent arbitrary prices.

---

## 5. District Availability Audit & Dual Operating Modes

Since `district_resources` is currently unpopulated ($0$ rows), the engine is architected to operate under two formal operating modes:

### Mode A: Unconfigured Baseline (Default State)
- When no records exist in `district_resources` for district $d$ at period $(y, m)$:
  - `available_quantity` is recorded as `0`.
  - `availability_status` is tagged as `"UNRECORDED"`.
  - `shortfall_quantity` equals the gross required demand ($Q_{\text{req}}$).
  - The UI and API annotate the shortfall as `"Gross Requirement (Pending Inventory Entry)"`.
  - **No fake availability is created.**

### Mode B: Authorized Operational Entry
- When authorized command personnel enter verified standing asset counts:
  - `available_quantity` is loaded directly from `district_resources`.
  - `availability_status` is tagged as `"VERIFIED"`.
  - Net shortfall and surplus are computed:
    $$\text{Shortfall}_{r, d} = \max(Q_{\text{req}}(r, d) - A_{r, d}, 0)$$
    $$\text{Surplus}_{r, d} = \max(A_{r, d} - Q_{\text{req}}(r, d), 0)$$

---

## 6. Evaluation of Candidate Methodologies

Five alternative formulations for deriving district resource requirements were empirically evaluated across all 640 districts:

| Candidate Methodology | Formulation | Operational Evaluation | Verdict |
| :--- | :--- | :--- | :---: |
| **Candidate A**: Pure Risk-Proportional | $Q_d \propto \text{RiskScore}_d$ | Ignores physical scale. A district with 8,000 residents and one with 11,000,000 residents with the same risk score receive identical resources. | **REJECTED** |
| **Candidate B**: Pure Forecast-Volume Proportional | $Q_d \propto \hat{y}_d$ | Highly correlated with population ($r = 0.974$). Ignores per-capita crime rate ($r = -0.526$) and trend momentum ($r = 0.070$). Small surge districts get zero assets. | **REJECTED** |
| **Candidate C**: Multiplicative (Risk $\times$ Population) | $Q_d \propto \text{RiskScore}_d \times \text{Pop}_d$ | Catastrophic skewness ($\max/\min > 1,300$). Top 5 mega-cities consume 80% of national resources, starving 635 districts. | **REJECTED** |
| **Candidate D**: Arbitrary Linear Re-weighting | $Q_d = \sum w_i X_i$ | Severe multi-collinearity and double-counting. The risk score already synthesizes forecast, volume, rate, and trend. Adding them again creates arbitrary redundancy. | **REJECTED** |
| **Candidate E**: Scale-Anchored Risk-Modulated Workload (SARM) | $Q_{r, d} = f_r(\text{Scale}_d) \times M_{\text{risk}}(d)$ | Anchors base requirements in physical public safety scale, modulated multiplicatively by risk intensity and trend. Specific drivers for each resource type. | **SELECTED (`resource-v1.0`)** |

---

## 7. Selected Methodology: `resource-v1.0`

The chosen methodology is the **Scale-Anchored Risk-Modulated Workload Model (SARM-v1.0)**.

### Mathematical Foundations:

#### 1. Dimensionless Risk Multiplier ($M_{\text{risk}}(d)$)
The jurisdiction's verified composite operational risk score ($\text{RS}_d \in [0, 100]$ from `risk-v1.0`) is converted into a linear modulation multiplier normalized around the national median ($\mu = 50.00$):

$$M_{\text{risk}}(d) = \frac{\text{OverallRiskScore}_d}{50.00}$$

- At national median risk ($\text{RS} = 50.00$): $M_{\text{risk}} = 1.00$ (baseline requirement).
- For Critical risk ($\text{RS} = 80.00$): $M_{\text{risk}} = 1.60$ ($+60\%$ operational uplift).
- For Low risk ($\text{RS} = 25.00$): $M_{\text{risk}} = 0.50$ ($-50\%$ operational reduction).

---

## 8. Resource-Specific Requirement Logic

Each of the four resource categories is driven by distinct operational mechanics:

### 1. Police Officers ($Q_{\text{officers}}$)
- **Operational Driver**: Frontline patrol and order maintenance require a baseline operational presence scaling with population, amplified by the district's overall risk score.
- **Formula**:
  $$Q_{\text{officers}}(d) = \max\left(5, \; \text{round}\left( \left( 10 + 5 \cdot \frac{\text{Population}_d}{1,000,000} \right) \times M_{\text{risk}}(d) \right)\right)$$
- **Boundary Conditions**: Minimum floor of $5$ officers for any administrative district to maintain baseline coverage.
- **Empirical Distribution ($N = 640$)**:
  - Mean: $20.6$ officers
  - Median: $18.0$ officers
  - Min: $5$ officers (Low risk, small population)
  - Max: $87$ officers (Critical risk, mega-district)

### 2. Patrol Vehicles ($Q_{\text{vehicles}}$)
- **Operational Driver**: Motorized rapid response and beat patrols. In standard policing doctrine, patrol vehicles operate in shifts paired with patrol personnel (ratio of $1$ vehicle per $3$ deployable officers).
- **Formula**:
  $$Q_{\text{vehicles}}(d) = \max\left(2, \; \text{round}\left( \frac{Q_{\text{officers}}(d)}{3.0} \right)\right)$$
- **Boundary Conditions**: Minimum floor of $2$ vehicles per district for continuous patrol continuity.
- **Empirical Distribution ($N = 640$)**:
  - Mean: $6.9$ vehicles
  - Median: $6.0$ vehicles
  - Min: $2$ vehicles
  - Max: $29$ vehicles

### 3. Investigation Teams ($Q_{\text{invest}}$)
- **Operational Driver**: Criminal case investigations are directly driven by **Forecasted Crime Volume ($\hat{y}_d$)** and **Incident Severity ($\text{SeverityIndex}_d$)**. An investigative squad handles a standard monthly caseload of $2.0$ serious cases.
- **Formula**:
  $$Q_{\text{invest}}(d) = \max\left(1, \; \text{round}\left( \frac{\hat{y}_d}{2.0} \times \frac{\text{SeverityIndex}_d}{1.15} \right)\right)$$
  *(where $1.15$ is the national mean severity index across all districts).*
- **Boundary Conditions**: Minimum floor of $1$ specialized investigation team per district.
- **Empirical Distribution ($N = 640$)**:
  - Mean: $2.2$ teams
  - Median: $2.0$ teams
  - Min: $1$ team
  - Max: $9$ teams

### 4. Surveillance Units ($Q_{\text{surv}}$)
- **Operational Driver**: Situational awareness and CCTV/aerial monitoring are force-multipliers allocated to **High-Risk Hotspots** and areas experiencing an **Upward Crime Surge** ($\text{TrendIndex}_d \ge 50$).
- **Formula**:
  $$Q_{\text{surv}}(d) = \text{Base}_{\text{tier}}(\text{RiskLevel}_d) + \text{TrendBoost}(\text{TrendIndex}_d)$$
  Where:
  $$\text{Base}_{\text{tier}} = \begin{cases} 
  6 & \text{if Risk Level} = \text{CRITICAL} \\ 
  4 & \text{if Risk Level} = \text{HIGH} \\ 
  2 & \text{if Risk Level} = \text{MODERATE} \\ 
  1 & \text{if Risk Level} = \text{LOW} 
  \end{cases}$$
  $$\text{TrendBoost} = \begin{cases} 
  2 & \text{if } \text{TrendIndex}_d \ge 65.0 \\ 
  1 & \text{if } 50.0 \le \text{TrendIndex}_d < 65.0 \\ 
  0 & \text{if } \text{TrendIndex}_d < 50.0 
  \end{cases}$$
- **Boundary Conditions**: Range strictly bounded between $1$ and $8$ units.
- **Empirical Distribution ($N = 640$)**:
  - Mean: $4.0$ units
  - Median: $4.0$ units
  - Min: $1$ unit
  - Max: $8$ units

---

## 9. Shortfall & Surplus Mechanics

For any resource type $r \in \{1, 2, 3, 4\}$ in district $d$:

$$\text{Shortfall}_{r, d} = \max(Q_{\text{req}}(r, d) - A_{r, d}, 0)$$
$$\text{Surplus}_{r, d} = \max(A_{r, d} - Q_{\text{req}}(r, d), 0)$$

- **Shortfall $> 0$**: The jurisdiction is in deficit and eligible for resource allocation.
- **Shortfall $= 0$**: The jurisdiction possesses sufficient or surplus assets; priority score is zero.

---

## 10. Operational Priority Scoring

When allocating limited resources, districts must be prioritized by urgency. The **Composite Priority Score ($P_{r, d}$)** incorporates threat severity and deficit proportion:

### 1. Operational Priority Tiers
Districts are grouped into four operational priority tiers aligned with the frozen risk bands:
- **Tier 1 (CRITICAL PRIORITY)**: $\text{RiskLevel} = \text{CRITICAL}$ (Risk Score $\ge 65.0$) AND $\text{Shortfall}_{r, d} > 0$.
- **Tier 2 (HIGH PRIORITY)**: $\text{RiskLevel} = \text{HIGH}$ ($50.0 \le \text{Risk Score} < 65.0$) AND $\text{Shortfall}_{r, d} > 0$.
- **Tier 3 (MODERATE PRIORITY)**: $\text{RiskLevel} = \text{MODERATE}$ ($35.0 \le \text{Risk Score} < 50.0$) AND $\text{Shortfall}_{r, d} > 0$.
- **Tier 4 (LOW PRIORITY)**: $\text{RiskLevel} = \text{LOW}$ (Risk Score $< 35.0$) OR $\text{Shortfall}_{r, d} = 0$.

### 2. Intra-Tier Ranking Score ($P_{r, d}$)
Within each priority tier, jurisdictions are ranked in descending order by the continuous priority score:

$$P_{r, d} = \text{OverallRiskScore}_d \times \left(0.70 + 0.30 \cdot \frac{\text{Shortfall}_{r, d}}{\max(Q_{\text{req}}(r, d), 1)}\right)$$

- If $\text{Shortfall} = Q_{\text{req}}$ (100% unmet), $P_{r, d} = \text{OverallRiskScore}_d$.
- If two districts share the exact same risk score, the jurisdiction with the larger proportion of unmet deficit takes precedence.
- If $\text{Shortfall} = 0$, $P_{r, d} = 0$.

---

## 11. Constrained Allocation Algorithm

When central or state command has a finite reserve pool of deployable resources $C_r$ (e.g., $C_{\text{officers}} = 500$ officers):

### Algorithm: Greedy Tiered Priority Allocation
1. **Input**: Candidate pool capacity $C_r \in \mathbb{Z}^+$, resource type $r$, target period $(y, m)$.
2. **Filter**: Select all districts where $\text{Shortfall}_{r, d} > 0$.
3. **Sort**: Order districts primarily by Priority Tier ($\text{Tier 1} \to \text{Tier 2} \to \text{Tier 3} \to \text{Tier 4}$), and secondarily by $P_{r, d}$ descending.
4. **Initialize**: Set remaining capacity $C_{\text{rem}} = C_r$.
5. **Iterate**: For each district $d$ in sorted order:
   $$\text{Allocated}_{r, d} = \min(\text{Shortfall}_{r, d}, C_{\text{rem}})$$
   $$C_{\text{rem}} \leftarrow C_{\text{rem}} - \text{Allocated}_{r, d}$$
   $$\text{RemainingShortfall}_{r, d} = \text{Shortfall}_{r, d} - \text{Allocated}_{r, d}$$
   If $C_{\text{rem}} == 0$, set $\text{Allocated}_{r, d'} = 0$ for all remaining districts and terminate.
6. **Output**: Recommended allocation vector, remaining shortfalls, and fully satisfied count.

### Theoretical Guarantees:
- **Feasibility**: $\sum_{d=1}^{640} \text{Allocated}_{r, d} \le C_r$.
- **Non-Negativity**: $\text{Allocated}_{r, d} \ge 0$.
- **No Over-Allocation**: $\text{Allocated}_{r, d} \le \text{Shortfall}_{r, d}$.
- **Determinism**: Identical inputs produce identical outputs every execution.

---

## 12. Budget Intelligence Handoff

Every recommended resource allocation translates directly into an estimated budgetary expenditure:

$$\text{EstimatedTotalCost}_{r, d} = \text{RecommendedUnits}_{r, d} \times \text{UnitCost}_r$$

### Integration Rules:
1. **Unit Cost Provenance**: `UnitCost_r` is retrieved from the active record in `resource_costs` matching `resource_type_id`.
2. **Cost Configuration Reference**: Stored in `budget_estimations.cost_config_id` to maintain historical auditability if unit costs change over time.
3. **Currency Enforced**: Indian Rupee (`INR`).
4. **Missing Cost Safeguard**: If `UnitCost_r` is missing or inactive, `EstimatedTotalCost` is `NULL`, and status is logged as `"Cost data unavailable"`.

---

## 13. Governance, Fairness & Limitations

1. **Advisory Decision Support**: Recommendations generated by this engine are intended strictly as analytical decision-support tools for administrative leadership, not autonomous or binding police deployment orders.
2. **Constitutional & Legal Fairness**: The system explicitly bans protected personal traits (victim gender, age, community, religion) from all calculations.
3. **Prevention of Feedback Loops**: Historical police deployment counts from past crimes are strictly excluded from demand derivation to prevent self-fulfilling enforcement bias.
4. **Human Oversight**: Command staff retain full discretion to adjust administrative pool parameters ($C_r$) or enter authorized local availability.

---

## 14. Data Leakage Safeguards

| Input Attribute | Status | Rationale |
| :--- | :---: | :--- |
| Forecasted Crime Volume ($\hat{y}_{d, t}$) | **PERMITTED** | Formulated at $t-1$ using historical panel data only. |
| Trailing Risk Score ($\text{RS}_{d, t}$) | **PERMITTED** | Formulated from verified 12-month trailing windows. |
| Census 2011 Population | **PERMITTED** | Decennial static census baseline. |
| Statutory Unit Costs | **PERMITTED** | Administrative master data. |
| Post-Event Case Status (`case_status`) | **PROHIBITED** | Post-incident resolution outcome (leakage). |
| Incident Police Deployed Count | **PROHIBITED** | Historical dispatch load; not standing inventory (leakage/circularity). |
| Future Incident Records ($> t$) | **PROHIBITED** | Future temporal leakage. |

---

## 15. Implementation Contract for Phase 10B

The backend implementation in Phase 10B must conform to the following contract:

### 1. Engine Architecture
- **Service Name**: `ResourceOptimizationService` (`backend/app/services/resource_service.py`).
- **Calculation Version**: `resource-v1.0`.
- **Target Period**: `2026-01-01` ($640$ districts).

### 2. Inputs Required
- `CrimeRiskScore` for target period ($640$ rows).
- `CrimePrediction` for target period ($640$ rows).
- `DistrictDemographics` ($640$ rows).
- `ResourceType` ($4$ rows).
- `ResourceCost` ($4$ active rows).
- `DistrictResource` (queried; handled cleanly if $0$ rows).
- Administrative capacity constraint pool ($C_r$).

### 3. Database Persistence
- Insert/Update $640 \times 4 = 2,560$ records into `resource_recommendations`.
- Insert/Update $640 \times 4 = 2,560$ records into `budget_estimations`.
- Idempotent execution (upsert logic on unique constraints).

### 4. API Endpoints
- `GET /api/v1/resources/overview`: Summary KPIs, total required, total shortfall, total budget.
- `GET /api/v1/resources/recommendations`: Paginated list of district resource schedules with filters.
- `GET /api/v1/resources/allocation`: Constrained allocation simulator endpoint.
- `GET /api/v1/resources/types`: Active resource types and cost configurations.
