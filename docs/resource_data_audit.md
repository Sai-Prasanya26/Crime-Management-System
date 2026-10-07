# Resource Data Audit & Lineage Report

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase**: Phase 10A — Resource Optimization Methodology & Design  
**Date**: October 2026  
**Status**: **Verified Complete (Audit & Read-Only Analysis)**  

---

## 1. Executive Summary

This audit establishes the empirical boundary conditions for the **Resource Optimization** pipeline in the Crime Management System. A fundamental principle of the system is operational integrity: **the platform must never fabricate or present synthetic baseline resource inventories as real observed data**.

This audit inspects:
1. Incident-level raw data from nationwide crime datasets and MySQL `crime_incidents`.
2. Existing schema and table contents for `resource_types`, `resource_costs`, `district_resources`, `resource_recommendations`, and `budget_estimations`.
3. Census demographics and district administrative hierarchies.
4. Distinctions between observed operational dispatches, standing inventory, derived requirements, and administrative configurations.

---

## 2. Table-by-Table Data Audit

| Table Name | Row Count | Source / Nature | Audit Finding & Operational Status |
| :--- | :---: | :--- | :--- |
| `resource_types` | **4** | Pre-seeded Master Data | Fully defined and active. Codifies 4 core law enforcement assets. |
| `resource_costs` | **4** | Pre-seeded Master Data | Fully defined and active. Codifies unit monthly costs in INR. |
| `district_resources` | **0** | Operational Inventory Table | **Completely empty**. No standing district-level asset inventories exist. |
| `resource_recommendations` | **0** | Intelligence Output Table | **Completely empty**. Ready to store recommendations in Phase 10B. |
| `budget_estimations` | **0** | Budget Output Table | **Completely empty**. Ready to store budget estimates in Phase 10B. |
| `crime_incidents` | **191,679** | Verified Source Data | Historical incidents ($2020\text{--}2025$) across 640 districts. |
| `district_demographics` | **640** | Census 2011 Decennial Data | Complete coverage of population across all 640 historical districts. |
| `crime_predictions` | **8,320** | Production ML (HGBR v1.0.0) | Verified monthly forecasts ($2026\text{-}01$ to $2027\text{-}01$). |
| `crime_risk_scores` | **640** | Production Risk Engine (`risk-v1.0`) | Verified multi-factor risk scores and factor percentiles for $2026\text{-}01$. |

---

## 3. Analysis of Raw Dataset Resource Fields

### The `Police Deployed` Column in Incident Data
Both raw source CSV files (`data_import/raw/crime_dataset_india.csv` and `data_import/raw/crime_dataset_nationwide.csv`) contain a column titled `Police Deployed`, which was ingested into `crime_incidents.police_deployed_count`.

#### Statistical Audit of `police_deployed_count`:
- **Total Ingested Incidents**: $191,679$
- **Non-null Count**: $191,679$ ($100\%$ populated)
- **Minimum**: $1$ officer
- **Maximum**: $29$ officers
- **Mean ($\mu$)**: $12.52$ officers
- **Standard Deviation ($\sigma$)**: $7.72$ officers
- **Modal Values**: $9$ ($10,170$ incidents), $15$ ($10,048$ incidents), $10$ ($9,967$ incidents).

#### Critical Semantic Interpretation:
1. **Incident-Level Dispatch Load**: The field `Police Deployed` represents the specific operational squad or patrol team dispatched to respond to a single reported crime event.
2. **NOT Standing District Inventory**: This metric does **not** reflect total available police personnel assigned to a district headquarters or police stations. Summing `police_deployed_count` over time is mathematically and operationally invalid: individual officers respond to multiple incidents over weeks and months, and the count provides zero visibility into shift rosters, administrative staff, traffic divisions, or station staffing.
3. **Prohibition as an Inventory Measure**: Under no circumstances should `police_deployed_count` be aggregated to claim "current available district police strength." Doing so would produce false operational claims and distort resource shortfall calculations.
4. **Data Leakage & Circular Enforcement**: In predictive forecasting and risk assessment, `police_deployed_count` was excluded as a predictive feature because it is a post-incident operational response. Using it to predict crime or drive resource allocation would create an artificial feedback loop (allocating more resources to areas simply because more officers were historically dispatched).

---

## 4. Resource Categories Audit (`resource_types`)

All 4 resource types defined in the database schema are valid, distinct, and deployable:

| ID | Resource Name | Unit of Measure | Description | Count-Based | Deployable | Cost Calculable |
| :-: | :--- | :--- | :--- | :-: | :-: | :-: |
| **1** | `Police Officers` | `Personnel` | Frontline patrol and law enforcement officers | Yes (Integer) | Yes | Yes (50,000 INR) |
| **2** | `Patrol Vehicles` | `Vehicles` | Mobile patrol vehicles and pursuit cruisers | Yes (Integer) | Yes | Yes (35,000 INR) |
| **3** | `Investigation Teams` | `Teams` | Specialized criminal investigation units | Yes (Integer) | Yes | Yes (120,000 INR) |
| **4** | `Surveillance Units` | `Units` | CCTV monitoring and aerial surveillance assets | Yes (Integer) | Yes | Yes (25,000 INR) |

---

## 5. Resource Cost Audit (`resource_costs`)

The database contains 4 verified cost records configured in INR:

| Cost ID | Resource Type ID | Resource Name | Unit Cost (INR) | Effective From | Effective To | Active Status |
| :-: | :-: | :--- | :---: | :---: | :---: | :-: |
| **1** | 1 | Police Officers | **₹50,000.00** / month | 2020-01-01 | NULL (Ongoing) | Active (`true`) |
| **2** | 2 | Patrol Vehicles | **₹35,000.00** / month | 2020-01-01 | NULL (Ongoing) | Active (`true`) |
| **3** | 3 | Investigation Teams | **₹120,000.00** / month | 2020-01-01 | NULL (Ongoing) | Active (`true`) |
| **4** | 4 | Surveillance Units | **₹25,000.00** / month | 2020-01-01 | NULL (Ongoing) | Active (`true`) |

### Operational Cost Governance:
- Costs represent monthly operational, maintenance, and personnel support expenditures.
- If a future resource type is registered without an active cost entry in `resource_costs`, the cost must be marked as `NULL` / `"Cost data unavailable"`. The system will **never** impute arbitrary costs.

---

## 6. District Resource Availability Audit (`district_resources`)

### Status: Zero Records (Empty Table)
An inspection of `district_resources` confirms $0$ rows. 

### Critical Design Decision:
- **Zero Fabrication Rule**: We must **not** seed or populate `district_resources` with simulated or guessed values. Doing so would violate the project's data integrity principles.
- **Support for Dual Operating Modes**:
  1. **Mode A (Unconfigured Baseline)**: When `district_resources` contains no rows for a district-period, the engine sets `available_quantity = 0`, sets `availability_status = "UNRECORDED"`, outputs the gross requirement as $Q_{\text{req}}$, and reports shortfall as gross requirement pending administrative inventory baseline.
  2. **Mode B (Authorized Input Mode)**: When an authorized agency or administrator submits verified asset counts, the engine seamlessly calculates:
     $$\text{Shortfall} = \max(Q_{\text{req}} - \text{Available}, 0)$$
     $$\text{Surplus} = \max(\text{Available} - Q_{\text{req}}, 0)$$

---

## 7. Classification of System Information

| Data Classification | Project Elements | Source of Truth |
| :--- | :--- | :--- |
| **Observed Data** | Historical crime incidents, reported dates, Census 2011 population, administrative boundaries, incident response counts. | MySQL `crime_incidents`, `districts`, `states`, `district_demographics`. |
| **Derived Intelligence** | Monthly crime forecasts, district risk scores, risk levels, factor percentiles, resource requirement indices. | Production HGBR ML model (`crime_predictions`), Risk Engine `risk-v1.0` (`crime_risk_scores`). |
| **Administrative Master Data** | Resource category definitions, statutory operational unit costs. | MySQL `resource_types`, `resource_costs`. |
| **Unavailable Data** | Current standing station-level police strength, vehicle fleet inventories, camera network operational status. | *Unrecorded in source data* (`district_resources` = 0 rows). |
| **Future Operational Inputs** | Authorized baseline inventory entries, administrative pool capacity constraints ($C_r$). | Administrative UI / API inputs (Phase 10B/10C). |

---

## 8. Data Leakage and Governance Audit

### Prohibited Data Elements:
1. **Protected Personal Characteristics**: Victim age, victim gender, religion, minority status, or caste must **never** be used to derive resource requirements.
2. **Post-Event Judicial & Investigation Outcomes**: `case_status`, `closed_date`, arrest counts, or conviction rates must **never** drive prospective resource needs.
3. **Future Information**: Forecasts and risk scores must originate strictly from past historical windows ($t - 1$).
4. **Circular Police Deployment**: `police_deployed_count` from past incidents must **never** be used as a predictor of future resource needs.

---

## 9. Conclusion

The database schema is fully established and structurally sound for resource optimization. The master definitions (`resource_types` and `resource_costs`) are active and verified. The absence of standing inventory data in `district_resources` is documented and incorporated into the design of `resource-v1.0`, ensuring the system functions transparently in both unconfigured baseline mode and authorized operational input mode.
