# Phase 1: Read-Only Audit Report — Complete District Coverage and Backend Data Expansion

**Date of Audit:** October 29, 2026  
**Auditor:** Antigravity AI Engineering Team  
**Scope:** Complete read-only audit of MySQL database (`crime_management_db`), backend services, data ingestion pipelines, ML forecasting engines, and external official sources (Local Government Directory - LGD, Census of India 2011, BPR&D DoPO 2024, State Gazette Notifications).

---

## 1. Current District Count for Every Active State and UT in Database

The database holds 37 total jurisdictions in the `states` table:
- **36 Active Jurisdictions:** 28 States and 8 Union Territories.
- **1 Inactive Legacy Record:** State ID 9 (`DAMAN AND DIU`, merged into State ID 8 `DADRA AND NAGAR HAVELI AND DAMAN AND DIU` under the Dadra and Nagar Haveli and Daman and Diu Merger Act, 2019, effective Jan 26, 2020).

### District Master Table Overview:
- **Total District Records in Table:** **803 rows** (IDs 1 through 805)
- **Census 2011 Baseline Districts (`is_census_2011 = 1`):** **640 rows**
  - Active in current administration: 626 rows
  - Inactive / Historical only (`is_current_admin = 0`): 14 rows (10 AP districts transferred to Telangana; 2 Daman & Diu districts transferred to merged UT; 2 J&K districts transferred to Ladakh)
- **Current Administrative Districts (`is_current_admin = 1`):** **789 rows**
  - Original 2011 districts unchanged: 626 rows
  - Carved / Modern administrative additions: 163 rows

### State-by-State Breakdown:
| State ID | State / UT Name | Entity Type | Census 2011 in DB | Current Admin in DB | Official LGD / Gazette | Notes & Administrative Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| 1 | ANDAMAN AND NICOBAR ISLANDS | UT | 3 | 3 | 3 | Exactly matches LGD (Nicobars, North & Middle Andaman, South Andaman) |
| 2 | ANDHRA PRADESH | STATE | 23 | 28 | 28 | 13 Census 2011 + 13 carved in 2022 + 2 LGD notified (Markapuram, Polavaram) |
| 3 | ARUNACHAL PRADESH | STATE | 16 | 27 | 27 | 16 Census 2011 + 11 carved (includes Keyi Panyor & Bichom notified Feb 2024) |
| 4 | ASSAM | STATE | 27 | 35 | 35 | 27 Census 2011 + 8 carved (includes Bajali, Tamulpur, Majuli, etc.) |
| 5 | BIHAR | STATE | 38 | 38 | 38 | Exactly matches LGD (boundaries unchanged since 2011) |
| 6 | CHANDIGARH | UT | 1 | 1 | 1 | Exactly matches LGD |
| 7 | CHHATTISGARH | STATE | 18 | 33 | 33 | 18 Census 2011 + 15 carved districts |
| 8 | DADRA AND NAGAR HAVELI AND DAMAN AND DIU | UT | 1 | 3 | 3 | Merged UT (Dadra and Nagar Haveli ID 127, Daman ID 689, Diu ID 690) |
| [9] | DAMAN AND DIU (INACTIVE) | UT | 2 | 0 | 0 | Inactive legacy state (IDs 128, 129 preserved for historical FK integrity) |
| 10 | GOA | STATE | 2 | 2 | 2 | Exactly matches official state / Census (North Goa, South Goa) |
| 11 | GUJARAT | STATE | 26 | 33 | 34 | **Missing 1 district:** Vav-Tharad (notified Sept 24, 2025, from Banaskantha) |
| 12 | HARYANA | STATE | 21 | 22 | 23 | **Missing 1 district:** Hansi (notified Dec 19, 2025, from Hisar) |
| 13 | HIMACHAL PRADESH | STATE | 12 | 12 | 12 | Exactly matches LGD |
| 14 | JAMMU AND KASHMIR | UT | 22 | 20 | 20 | Exactly matches LGD (22 in 2011 less Kargil & Leh transferred to Ladakh) |
| 15 | JHARKHAND | STATE | 24 | 24 | 24 | Exactly matches LGD |
| 16 | KARNATAKA | STATE | 30 | 31 | 31 | Exactly matches LGD (includes Vijayanagara created Oct 2021) |
| 17 | KERALA | STATE | 14 | 14 | 14 | Exactly matches LGD |
| 18 | LAKSHADWEEP | UT | 1 | 1 | 1 | Exactly matches LGD |
| 19 | MADHYA PRADESH | STATE | 50 | 55 | 55 | Exactly matches LGD (includes Mauganj, Pandhurna, Maihar, Niwari, Agar Malwa) |
| 20 | MAHARASHTRA | STATE | 35 | 36 | 36 | Exactly matches LGD (includes Palghar created Aug 2014) |
| 21 | MANIPUR | STATE | 9 | 16 | 16 | Exactly matches LGD (includes 7 carved districts) |
| 22 | MEGHALAYA | STATE | 7 | 12 | 12 | Exactly matches LGD (includes 5 carved districts) |
| 23 | MIZORAM | STATE | 8 | 11 | 11 | Exactly matches LGD (includes Hnahthial, Khawzawl, Saitual) |
| 24 | NAGALAND | STATE | 11 | 16 | 17 | **Missing 1 district:** Meluri (notified Nov 2, 2024, from Phek) |
| 25 | NCT OF DELHI | UT | 9 | 11 | 11 | Canonical 11 revenue districts (LGD contains 13 with municipal split areas) |
| 26 | ODISHA | STATE | 30 | 30 | 30 | Exactly matches LGD |
| 27 | PUDUCHERRY | UT | 4 | 4 | 4 | Exactly matches LGD / Census (Puducherry, Karaikal, Mahe, Yanam) |
| 28 | PUNJAB | STATE | 20 | 23 | 23 | Exactly matches LGD (includes Malerkotla, Fazilka, Pathankot) |
| 29 | RAJASTHAN | STATE | 33 | 50 | 41 | DB holds 50 (from 2023 reorg); Cabinet abolished 9 in Dec 2024 (41 active) |
| 30 | SIKKIM | STATE | 4 | 6 | 6 | Exactly matches LGD (includes Pakyong, Soreng) |
| 31 | TAMIL NADU | STATE | 32 | 38 | 38 | Exactly matches LGD (includes 6 carved districts) |
| 32 | TRIPURA | STATE | 4 | 8 | 8 | Exactly matches LGD (includes 4 carved districts) |
| 33 | UTTAR PRADESH | STATE | 71 | 75 | 75 | Exactly matches LGD (includes Amethi, Hapur, Sambhal, Shamli) |
| 34 | UTTARAKHAND | STATE | 13 | 13 | 13 | Exactly matches LGD |
| 35 | WEST BENGAL | STATE | 19 | 23 | 23 | Exactly matches LGD (includes Alipurduar, Jhargram, Kalimpong, Paschim Bardhaman) |
| 36 | TELANGANA | STATE | 0 | 33 | 33 | Exactly matches LGD (33 districts formed under 2014 Act and 2016 reorg) |
| 37 | LADAKH | UT | 0 | 2 | 7 | **Missing 5 districts:** Nubra, Sham, Changthang, Zanskar, Drass (notified April 2026) |

---

## 2. Missing Districts Compared with Official Local Government Directory (LGD)

Through cross-referencing with the official Local Government Directory (`lgdirectory.gov.in`) and state gazette notifications, exactly **8 newly recognized districts** are missing from the active database layer:

1. **Vav-Tharad (Gujarat - State ID 11)**:
   - **Parent District:** Banaskantha (Census 2011 ID: 471)
   - **Headquarters:** Tharad
   - **Official Notification:** Gujarat Revenue Department Notification No. GHM/2025/210/M/RD/RCO/e-file/15/2025/5360/L1, dated September 24, 2025 (Effective: October 2, 2025).
   - **Composition:** 8 talukas (Deodar, Lakhani, Tharad, Rah, Vav, Dharnidhar, Suigam, Bhabhar).

2. **Hansi (Haryana - State ID 12)**:
   - **Parent District:** Hisar (Census 2011 ID: 77)
   - **Headquarters:** Hansi
   - **Official Notification:** Haryana Government Gazette Notification dated December 19, 2025 (operationalized December 22, 2025).
   - **Composition:** Sub-divisions Hansi and Narnaund; tehsils Hansi, Narnaund, Bass.

3. **Meluri (Nagaland - State ID 24)**:
   - **Parent District:** Phek (Census 2011 ID: 469)
   - **Headquarters:** Meluri
   - **Official Notification:** Nagaland State Cabinet Notification dated November 2, 2024 (Inaugurated February 21, 2025).

4. **Nubra (Ladakh - State ID 37)**:
   - **Parent District:** Leh (Ladakh) (Census 2011 ID: 203 / Modern ID: 688)
   - **Headquarters:** Diskit
   - **Official Notification:** MHA Clearance August 2024; Ladakh Administration Gazette Notification dated April 27, 2026.

5. **Sham (Ladakh - State ID 37)**:
   - **Parent District:** Leh (Ladakh) (Census 2011 ID: 203 / Modern ID: 688)
   - **Headquarters:** Khaltse
   - **Official Notification:** Gazette Notification dated April 27, 2026.

6. **Changthang (Ladakh - State ID 37)**:
   - **Parent District:** Leh (Ladakh) (Census 2011 ID: 203 / Modern ID: 688)
   - **Headquarters:** Nyoma
   - **Official Notification:** Gazette Notification dated April 27, 2026.

7. **Zanskar (Ladakh - State ID 37)**:
   - **Parent District:** Kargil (Census 2011 ID: 198 / Modern ID: 687)
   - **Headquarters:** Padum
   - **Official Notification:** Gazette Notification dated April 27, 2026.

8. **Drass (Ladakh - State ID 37)**:
   - **Parent District:** Kargil (Census 2011 ID: 198 / Modern ID: 687)
   - **Headquarters:** Drass-Ranbirpura
   - **Official Notification:** Gazette Notification dated April 27, 2026.

### Additional Existing Hierarchy Corrections Needed:
Three existing carved districts in the database currently have `parent_district_id = NULL` and should be mapped to their authentic Census 2011 parents:
- ID 725 `Aravalli` (Gujarat) $\rightarrow$ Parent: ID 491 (`Saban Kantha`)
- ID 782 `Pakyong` (Sikkim) $\rightarrow$ Parent: ID 536 (`East`)
- ID 783 `Soreng` (Sikkim) $\rightarrow$ Parent: ID 539 (`West`)

---

## 3. District Renames, Mergers, Splits, and Historical Mappings

1. **State-Level Structural Transformations:**
   - **Telangana Formation (2014):** 10 historical Andhra Pradesh districts transferred to newly created State 36, then reorganized in 2016 into 33 districts.
   - **Jammu & Kashmir Reorganisation (2019):** Former State 14 bifurcated into UT of J&K (20 districts) and UT of Ladakh (2 districts in 2019; expanded to 7 districts in April 2026).
   - **UT Merger (2020):** Dadra & Nagar Haveli merged with Daman & Diu (State 8). State 9 deactivated.
   - **Andhra Pradesh Reorganisation (2022):** 13 historical districts reorganized into 26 active districts (+2 LGD entries = 28).

2. **Historical Mappings Infrastructure (`district_geography_mapping`):**
   - Contains **786 active records** bridging modern administrative districts to Census 2011 historical roots:
     - `SAME`: 626 mappings (districts whose territorial boundaries have remained unchanged since Census 2011).
     - `TRANSFERRED`: 10 mappings (Andhra Pradesh $\rightarrow$ Telangana).
     - `SPLIT` / `REORGANIZED`: 150 mappings (modern child districts mapped with lineage to their Census 2011 predecessor).

---

## 4. Existing District IDs, Primary Keys, Foreign Keys, and Relationship Integrity

### Sacrosanct Ranges:
- **IDs 1 through 640:** **STRICTLY SACROSANCT**. These 640 primary keys represent the Census 2011 geographic baseline. All historical crime incident records (191,679 rows), demographic baselines (640 rows), ML longitudinal panel features (46,080 rows), and baseline predictions reference this exact ID range.
- **IDs 641 through 805:** Modern administrative and child districts established during Phase 7B. Must be preserved to avoid breaking existing foreign keys.
- **IDs 806 onwards:** Reserved for newly recognized districts added during Phase 2 expansion.

### Foreign Key Constraints Referencing `districts(id)`:
1. `crime_incidents.district_id` $\rightarrow$ `districts.id` (`crime_incidents_ibfk_1`)
2. `district_demographics.district_id` $\rightarrow$ `districts.id` (`district_demographics_ibfk_1`)
3. `crime_predictions.district_id` $\rightarrow$ `districts.id` (`crime_predictions_ibfk_1`)
4. `crime_risk_scores.district_id` $\rightarrow$ `districts.id` (`crime_risk_scores_ibfk_1`)
5. `district_resources.district_id` $\rightarrow$ `districts.id` (`district_resources_ibfk_1`)
6. `resource_recommendations.district_id` $\rightarrow$ `districts.id` (`resource_recommendations_ibfk_1`)
7. `budget_estimations.district_id` $\rightarrow$ `districts.id` (`budget_estimations_ibfk_1`)
8. `budget_estimation_items.district_id` $\rightarrow$ `districts.id` (`fk_budget_items_district`)
9. `optimization_allocations.district_id` $\rightarrow$ `districts.id` (`fk_opt_alloc_district`)
10. `official_crime_statistics.district_id` $\rightarrow$ `districts.id` (`fk_ocs_district`)
11. `generated_reports.district_id` $\rightarrow$ `districts.id` (`generated_reports_ibfk_2`)
12. `districts.parent_district_id` $\rightarrow$ `districts.id` (`fk_districts_parent`)
13. `district_geography_mapping.historical_district_id` $\rightarrow$ `districts.id` (`fk_dgm_historical`)
14. `district_geography_mapping.current_district_id` $\rightarrow$ `districts.id` (`fk_dgm_current`)

---

## 5. District Data Coverage Across Tables

| Table Name | Total Rows | Distinct Districts Covered | District ID Range | Data Nature |
|:---|:---:|:---:|:---:|:---|
| `crime_incidents` | 191,679 | 640 | 1 – 640 | Historical incident time series (2020-01-01 to 2025-12-31) |
| `district_demographics` | 640 | 640 | 1 – 640 | Official Census 2011 Primary Census Abstract |
| `crime_predictions` | 21,760 | 640 | 1 – 640 | 34 monthly periods (12 hist eval, 10 past forecasts, 12 operational future forecasts) |
| `crime_risk_scores` | 3,840 | 640 | 1 – 640 | Multi-criteria quarterly risk scores |
| `district_resources` | 4,510 | 640 | 1 – 640 | Official BPR&D/Police departmental disclosures & baseline tracking |
| `resource_recommendations` | 2,560 | 640 | 1 – 640 | AI optimization requirement baselines |
| `budget_estimations` | 2,560 | 640 | 1 – 640 | Strategic budgeting cost baselines |
| `budget_estimation_items` | 1,426 | 23 | 4 – 26 | Granular budget line items |
| `optimization_allocations` | 7,201 | 53 | 1 – 69 | Resource allocation schedule records |
| `district_geography_mapping` | 786 | 640 (hist) / 786 (curr) | 1 – 803 | Dual-layer lineage mapping table |
| Modern Carved (`id > 640`) | 163 | 0 (direct) | 641 – 805 | Resolved dynamically to Census 2011 parent via `parent_district_id` |

---

## 6. Classification of Data Provenance (Official, Derived, Estimated, Synthetic, Unavailable)

1. **Official Government Data:**
   - **Local Government Directory (LGD):** Official codes, state-district hierarchical associations, gazette notifications.
   - **Census of India 2011 (PCA):** Population, sex ratio, literacy, worker distributions for the 640 baseline districts.
   - **BPR&D DoPO 2024:** Official police stations, outposts, specialized units, and vehicle counts at state and documented district levels.
   - **Departmental Police Disclosures:** Data in `district_resources` tagged `OFFICIAL_DISTRICT` or `OFFICIAL_STATE`.

2. **Derived / Analytical Data:**
   - **Operational Predictions (`crime_predictions`):** Generated by production HistGradientBoostingRegressor (Poisson loss), calibrated with split conformal inference bounds.
   - **Parent-Derived Child Metrics:** Reorganized districts dynamically resolve baseline volume, risk ratings, and forecasts from their Census 2011 parent, returning explicit provenance flags (`is_derived_from_parent = True`).
   - **Risk Assessment:** Derived through multi-criteria scoring algorithms.
   - **Resource Recommendations:** Derived via linear programming optimization based on workload and service-level constraints.

3. **Synthetic / Simulation Data:**
   - **Crime Incidents (`crime_incidents`):** 191,679 records across 2020–2025. While calibrated to NCRB aggregate volumes and seasonal distributions, individual FIR incidents are synthetic/semi-synthetic time-series records generated for academic simulation and model benchmarking, terminating on Dec 31, 2025.
   - No incident records exist for 2026 or 2027.

4. **Unavailable Data (Strictly Maintained as NULL):**
   - **Post-2011 District Demographics:** The 2021 Census of India was postponed and has not been conducted. Official census-grade demographic enumerations for bifurcated districts do not exist. In compliance with data integrity mandates, demographics for newly carved districts are kept NULL or accessed via parent resolution, rather than inventing unverified population counts.
   - **Unreported Police Inventories:** Where police departments have not disclosed fleet or officer numbers, records are tagged `UNRECORDED` with count values set to `NULL`.

---

## 7. Backend Services, Queries, and ML Pipelines Depending on District Master Data

1. **Backend Repositories & Services:**
   - `geography_repository.py` & `geography_service.py`: Querying active states and districts with mode filtering (`mode='current'` vs `mode='census_2011'`).
   - `prediction_repository.py` & `prediction_service.py`: Parent district resolution (`parent_district_id`) for reorganized districts; series lookups; overview metrics.
   - `crime_repository.py` & `crime_analytics_service.py`: Jurisdiction profiling, top jurisdictions ranking, and temporal trend aggregations.
   - `risk_service.py` & `risk_repository.py`: Multi-criteria risk scoring across district entities.
   - `optimization_service.py`, `resource_repository.py`, and `budget_service.py`: Resource demand allocation, shortfall calculation, and expenditure modeling.

2. **Machine Learning Pipeline:**
   - `ml/data/panel_features_2020_2025.parquet`: Panel feature matrix of 46,080 rows (640 districts $\times$ 72 months).
   - `ml/inference/prediction_pipeline.py`: Iterative recursive forecasting across 640 longitudinal histories.
   - `ml/inference/conformal_calibrator.py`: Finite-sample nonconformity score lookup across horizon steps $h=1 \dots 12$.

3. **Automated Test Suites:**
   - `test_crime_forecasting_reliability.py` (14 tests)
   - `test_crime_prediction_pipeline.py` (15 tests)
   - `test_geography_mode_switch.py`
   - `test_api_endpoints.py`
   - `test_official_resource_verification.py`
   - `test_jurisdiction_profiles.py`

---

## Conclusion and Recommendations for Phase 2 Implementation

1. **Preserve Baseline:** Keep all existing 803 rows in `districts` untouched.
2. **Add Missing Recognized Districts:** Insert the 8 verified missing districts starting at ID 806 (`Vav-Tharad`, `Hansi`, `Meluri`, `Nubra`, `Sham`, `Changthang`, `Zanskar`, `Drass`) with `is_census_2011 = FALSE`, `is_current_admin = TRUE`, and explicit `parent_district_id` linking to their Census 2011 parent.
3. **Correct Existing Unmapped Parents:** Update `Aravalli` (to parent ID 491), `Pakyong` (to parent ID 536), and `Soreng` (to parent ID 539).
4. **Update Geography Mapping Table:** Add corresponding `SPLIT` entries into `district_geography_mapping`.
5. **No Frontend Modifications:** Preserve all frontend UI, components, styling, and navigation strictly without change.

