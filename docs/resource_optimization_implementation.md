# Resource Optimization Engine Implementation Specification

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase**: Phase 10B — Resource Optimization Engine + APIs  
**Methodology Version**: `resource-v1.0`  
**Assessment Horizon**: `2026-01-01`  
**Status**: **Production Implemented & Empirically Verified**  

---

## 1. System Architecture & Role Distinction

The Resource Optimization Engine operates as a deterministic, explainable public safety decision-support layer:

$$\text{Production Forecasts (HGBR v1.0.0)} + \text{Risk-v1.0 Scores} + \text{Census Demographics} + \text{Resource Costs} \longrightarrow \text{Resource Requirements} \longrightarrow \text{Allocation & Budget Estimation}$$

### Critical Separation of Concerns:
- **Machine Learning Layer**: Predicts jurisdictional monthly crime volume (`crime_predictions`).
- **Risk Assessment Engine**: Evaluates multidimensional threat intensity on $[0, 100]$ (`crime_risk_scores`).
- **Resource Optimization Engine**: Translates predictive and risk intelligence into deployable asset requirements, deficit priorities, and budgetary estimations without black-box opacity.

---

## 2. Frozen Methodology: `resource-v1.0`

### 1. Dimensionless Risk Multiplier ($M_{\text{risk}}(d)$)
Normalizes the district's operational risk score around the national median ($\mu = 50.00$):

$$M_{\text{risk}}(d) = \frac{\text{OverallRiskScore}_d}{50.00}$$

### 2. Police Officers Requirement ($Q_{\text{officers}}(d)$)
Anchored in population scale and modulated by risk intensity. Minimum floor of 5 officers:

$$Q_{\text{officers}}(d) = \max\left(5, \; \text{round}\left( \left( 10 + 5 \cdot \frac{\text{Population}_d}{1,000,000} \right) \cdot M_{\text{risk}}(d) \right)\right)$$

### 3. Patrol Vehicles Requirement ($Q_{\text{vehicles}}(d)$)
Enforces standard patrol doctrine pairing $1$ vehicle per $3$ deployable officers. Minimum floor of 2 vehicles:

$$Q_{\text{vehicles}}(d) = \max\left(2, \; \text{round}\left( \frac{Q_{\text{officers}}(d)}{3.0} \right)\right)$$

### 4. Investigation Teams Requirement ($Q_{\text{invest}}(d)$)
Caseload-driven investigation squad requirement based on forecasted monthly crime volume ($\hat{y}_d$) and category severity ($\text{SeverityIndex}_d$). Standard capacity of 2.0 cases/month per team. Minimum floor of 1 team:

$$Q_{\text{invest}}(d) = \max\left(1, \; \text{round}\left( \frac{\hat{y}_d}{2.0} \cdot \frac{\text{SeverityIndex}_d}{1.15} \right)\right)$$

### 5. Surveillance Units Requirement ($Q_{\text{surv}}(d)$)
Force-multiplying situational awareness assets allocated to high-risk tiers and positive crime momentum ($\text{TrendIndex}_d \ge 50$):

$$Q_{\text{surv}}(d) = \min(8, \; \max(1, \; \text{Base}_{\text{tier}} + \text{TrendBoost}))$$

$$\text{Base}_{\text{tier}} = \begin{cases} 6 & \text{CRITICAL} \\ 4 & \text{HIGH} \\ 2 & \text{MODERATE} \\ 1 & \text{LOW} \end{cases}, \quad \text{TrendBoost} = \begin{cases} 2 & \text{TrendIndex} \ge 65.0 \\ 1 & 50.0 \le \text{TrendIndex} < 65.0 \\ 0 & \text{TrendIndex} < 50.0 \end{cases}$$

---

## 3. Operational Inventory & Availability Handling

### Status of Source Data:
An empirical audit confirmed that `district_resources` contains **0 records**. Current standing police inventories (officers, patrol cruisers, detectives, cameras) are not recorded in the source datasets.

### Strict Data Integrity Guarantees:
1. **Zero Fabrication**: The system does **not** insert or simulate fake inventory numbers.
2. **Exclusion of `police_deployed_count`**: In `crime_incidents`, `police_deployed_count` represents post-incident response squad counts (mean $\mu = 12.52$ officers/incident). Summing or using this as standing district inventory is strictly prohibited.
3. **Explicit Dual-Mode Tracking**:
   - **When unrecorded**:
     - `available_quantity = NULL`
     - `has_availability_data = False`
     - `availability_status = "UNRECORDED"`
     - `shortfall_quantity = required_quantity` (explicitly flagged as **Gross Operational Demand**)
     - `surplus_quantity = 0`
   - **When verified inventory is entered**:
     - `available_quantity = A`
     - `has_availability_data = True`
     - `availability_status = "VERIFIED"`
     - $\text{shortfall} = \max(\text{required} - A, 0)$
     - $\text{surplus} = \max(A - \text{required}, 0)$

---

## 4. Priority Tiering & Continuous Priority Scoring

### Priority Tiers:
- **Tier 1 (CRITICAL)**: $\text{RiskLevel} = \text{CRITICAL}$ and $\text{shortfall} > 0$
- **Tier 2 (HIGH)**: $\text{RiskLevel} = \text{HIGH}$ and $\text{shortfall} > 0$
- **Tier 3 (MODERATE)**: $\text{RiskLevel} = \text{MODERATE}$ and $\text{shortfall} > 0$
- **Tier 4 (LOW)**: $\text{RiskLevel} = \text{LOW}$ or $\text{shortfall} = 0$

### Continuous Priority Score ($P$):
$$P = \text{OverallRiskScore}_d \cdot \left( 0.70 + 0.30 \cdot \frac{\text{shortfall}}{\max(\text{required}, 1)} \right)$$

Bounded to $[0.00, 100.00]$ and rounded to 2 decimal places.

---

## 5. Constrained Greedy Priority Allocation

To support realistic decision-making when central or state leadership has a finite pool of additional resources $C_r$ (e.g. 500 officers):

1. Eligible jurisdictions with positive shortfalls are ranked by Priority Tier ($\text{CRITICAL} \to \text{HIGH} \to \text{MODERATE} \to \text{LOW}$) and intra-tier Priority Score descending.
2. Allocations are made greedily: $\text{Allocated}_{r, d} = \min(\text{shortfall}_{r, d}, C_{\text{remaining}})$.
3. Deducts until pool is depleted, tracking satisfied districts and unmet shortfall.
4. **Unconstrained Default**: When no pool constraint is configured, the system exposes gross operational demand without fabricating an arbitrary capacity limit.

---

## 6. Budget Intelligence Handoff

Every recommendation record links to verified unit costs in `resource_costs`:
- Police Officers: ₹50,000 / month
- Patrol Vehicles: ₹35,000 / month
- Investigation Teams: ₹120,000 / month
- Surveillance Units: ₹25,000 / month

$$\text{EstimatedTotalCost} = \text{RecommendedQuantity} \times \text{UnitCost}$$

Persisted in `budget_estimations` with foreign key lineage to `cost_config_id`.

---

## 7. Database Migration & Schema Enhancements

To support backward-compatible unrecorded availability and priority metrics, `resource_recommendations` was enhanced via `database/migrations/migrate_phase_10b.py`:
- `required_quantity`: `INT NOT NULL DEFAULT 0`
- `available_quantity`: `INT NULL DEFAULT NULL` (allows `NULL` for unrecorded states)
- `surplus_quantity`: `INT NOT NULL DEFAULT 0`
- `has_availability_data`: `TINYINT(1) NOT NULL DEFAULT 0`
- `availability_status`: `VARCHAR(20) NOT NULL DEFAULT 'UNRECORDED'`
- `priority_tier`: `VARCHAR(20) NOT NULL DEFAULT 'LOW'`
- `priority_score`: `DECIMAL(5, 2) NOT NULL DEFAULT 0.00`
- `calculation_version`: `VARCHAR(20) NOT NULL DEFAULT 'resource-v1.0'`
- Unique constraint: `(district_id, resource_type_id, period_year, period_month, calculation_version)`.

---

## 8. Authenticated API Endpoints

All endpoints are registered under `/api/v1/resources` and require JWT authentication:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/resources/overview` | Executive KPIs, demand by resource type, unrecorded availability status, budget totals. |
| `GET` | `/api/v1/resources/model` | Frozen `resource-v1.0` methodology parameters, formulas, and operational rules. |
| `GET` | `/api/v1/resources` | Paginated list of recommendations with filters (`state_id`, `district_id`, `resource_type_id`, `priority_tier`, `risk_level`). |
| `GET` | `/api/v1/resources/{district_id}` | Full explainability profile and 4-resource schedule for a specific district. |
| `POST` | `/api/v1/resources/allocate` | Constrained Greedy Tiered Priority Allocation simulator for a given capacity pool $C_r$. |

---

## 9. Verification & Data Integrity

- **Assessed Districts**: $640$ historical districts
- **Total Recommendations**: $2,560$ ($640 \times 4$)
- **Total Budget Estimations**: $2,560$ ($640 \times 4$)
- **Duplicates**: $0$
- **Unrecorded Availability Count**: $2,560$ ($100\%$)
- **Total Required Assets**:
  - Police Officers: $13,190$ ($\mu = 20.61$, range: $5\text{--}87$)
  - Patrol Vehicles: $4,396$ ($\mu = 6.87$, range: $2\text{--}29$)
  - Investigation Teams: $1,423$ ($\mu = 2.22$, range: $1\text{--}9$)
  - Surveillance Units: $2,567$ ($\mu = 4.01$, range: $1\text{--}8$)
- **Total Nationwide Monthly Budget**: **₹1,048,295,000.00** (~₹104.83 Crores)
- **Unit Test Coverage**: **57 / 57 PASSED** across all backend test modules.
