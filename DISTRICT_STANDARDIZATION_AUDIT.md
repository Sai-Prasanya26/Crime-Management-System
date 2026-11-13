# Project-Wide District Standardization & Database Audit Report

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Database**: MySQL (`crime_management_db`)  
**Scope**: Canonical District Standardization (790 Active Administrative Districts)  
**Execution Phase**: PHASE 1 — READ-ONLY COMPREHENSIVE AUDIT & RECONCILIATION PLAN  
**Date**: November 8, 2026  
**Status**: AUDIT COMPLETE (Read-Only Verified; Zero Database Mutations Applied)

---

## 1. Executive Summary: The 790 District Reality

The MySQL database contains three distinct geographic scopes that have evolved across project development phases:
1. **640 Districts**: The official decennial **Census 2011** enumeration panel. This panel serves as the demographic and longitudinal training foundation for Phase 8 ML forecasting and Phase 9 risk percentiles.
2. **790 Districts**: The current **active administrative jurisdictions** recognized across India's 36 States and Union Territories following historical state bifurcations (e.g. Telangana 2014, Ladakh 2019, Daman & Diu merger 2020, and subsequent district carving).
3. **813 District Records**: The total rows in the `districts` table (IDs `1` through `814`, with ID `803` omitted from sequence), consisting of **790 active districts** and **23 inactive/historical districts**.

```
                        ┌────────────────────────────────────────────────────────┐
                        │              TOTAL DISTRICT RECORDS (813)              │
                        └───────────────────────────┬────────────────────────────┘
                                                    │
                   ┌────────────────────────────────┴───────────────────────────────┐
                   ▼                                                                ▼
┌──────────────────────────────────────┐                         ┌──────────────────────────────────────┐
│       ACTIVE DISTRICTS (790)         │                         │       INACTIVE DISTRICTS (23)        │
│       `is_current_admin = 1`         │                         │        `is_current_admin = 0`        │
└──────────────────┬───────────────────┘                         └──────────────────┬───────────────────┘
                   │                                                                │
     ┌─────────────┴─────────────┐                                    ┌─────────────┴─────────────┐
     ▼                           ▼                                    ▼                           ▼
┌──────────────────┐    ┌──────────────────┐                    ┌──────────────────┐    ┌──────────────────┐
│ Active Census    │    │ Modern Carved    │                    │ Reorganized /    │    │ Superseded State │
│ Baseline (626)   │    │ Districts (164)  │                    │ Transferred (14) │    │ Proposals (9)    │
│ `is_census_2011=1`    │ `is_census_2011=0`                    │ `is_census_2011=1`    │ `is_census_2011=0`
│ `parent_id=NULL` │    │ `parent_id!=NULL`│                    │ (e.g., Old AP,   │    │ (Rajasthan       │
│                  │    │                  │                    │ J&K, Daman/Diu)  │    │ interim reviews) │
└──────────────────┘    └──────────────────┘                    └──────────────────┘    └──────────────────┘
```

---

## 2. Phase 1 — Detailed Database Audit Findings

### Audit Item 1: All 813 District Records and Their Statuses
- **SQL Query**:
  ```sql
  SELECT 
      is_current_admin, 
      is_census_2011, 
      COUNT(*) AS count, 
      MIN(id) AS min_id, 
      MAX(id) AS max_id 
  FROM districts 
  GROUP BY is_current_admin, is_census_2011;
  ```
- **Audit Findings**:
  | `is_current_admin` | `is_census_2011` | Record Count | ID Range | Description |
  |:---:|:---:|:---:|:---:|---|
  | `1` (Active) | `1` (Census) | **626** | `1` – `640` | Original Census 2011 districts that remain active administrative units |
  | `1` (Active) | `0` (Carved) | **164** | `641` – `814` | Post-2011 carved / bifurcated districts currently active in states |
  | `0` (Inactive) | `1` (Census) | **14** | `4` – `203` | Census 2011 historical districts transferred / reorganized into new states/UTs |
  | `0` (Inactive) | `0` (Carved) | **9** | `765` – `781` | Interim proposal districts in Rajasthan held in administrative review |
  | **TOTAL** | — | **813** | `1` – `814` | Total records in MySQL `districts` table |

---

### Audit Item 2: The Exact 790 Active Canonical Districts
- **SQL Query**:
  ```sql
  SELECT COUNT(*) AS active_canonical_districts 
  FROM districts 
  WHERE is_current_admin = 1;
  ```
  *Result*: **790**
- **Composition**:
  - **626 Primary Census Districts**: Historical districts that have undergone no territorial dissolution.
  - **164 Modern Carved Districts**: Real, functioning districts established by statutory state gazettes between 2014 and 2023.
  - **State Distribution**: Covers all 36 States and Union Territories (e.g., 75 in Uttar Pradesh, 38 in Bihar, 36 in Maharashtra, 33 in Telangana, 31 in Karnataka, 26 in Andhra Pradesh, etc.).

---

### Audit Item 3: Inactive and Historical District Records
- **SQL Query**:
  ```sql
  SELECT d.id, d.district_name, s.state_name, d.is_census_2011, d.is_current_admin, d.parent_district_id
  FROM districts d
  JOIN states s ON d.state_id = s.id
  WHERE d.is_current_admin = 0
  ORDER BY d.id;
  ```
  *Result*: **23 records**

- **Detailed Listing of 23 Inactive Districts**:
  1. **14 Historical Census 2011 Districts** (`is_census_2011 = 1, is_current_admin = 0`):
     - `ID 4`: **Adilabad** (Andhra Pradesh, pre-2014) &rarr; Transferred & bifurcated into Telangana (`IDs 641, 652, 655, 662`).
     - `ID 9`: **Hyderabad** (Andhra Pradesh, pre-2014) &rarr; Transferred to Telangana as canonical active district `ID 644`.
     - `ID 10`: **Karimnagar** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 645, 650, 664, 665`).
     - `ID 11`: **Khammam** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 642, 651`).
     - `ID 14`: **Mahbubnagar** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 648, 654, 659, 661, 671`).
     - `ID 15`: **Medak** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 656, 667, 668`).
     - `ID 16`: **Nalgonda** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 660, 669, 673`).
     - `ID 17`: **Nizamabad** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 649, 663`).
     - `ID 19`: **Rangareddy** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 657, 666, 670`).
     - `ID 24`: **Warangal** (Andhra Pradesh, pre-2014) &rarr; Reorganized into Telangana (`IDs 643, 646, 647, 653, 658, 672`).
     - `ID 128`: **Daman** (Daman & Diu UT) &rarr; Merged into Dadra and Nagar Haveli and Daman and Diu (`ID 689`).
     - `ID 129`: **Diu** (Daman & Diu UT) &rarr; Merged into Dadra and Nagar Haveli and Daman and Diu (`ID 690`).
     - `ID 198`: **Kargil** (Jammu & Kashmir State) &rarr; Transferred to Union Territory of Ladakh (`ID 687`).
     - `ID 203`: **Leh (Ladakh)** (Jammu & Kashmir State) &rarr; Transferred to Union Territory of Ladakh (`ID 688`).
  2. **9 Superseded Non-Census Proposals** (`is_census_2011 = 0, is_current_admin = 0`):
     - `IDs 765, 770, 771, 772, 773, 774, 777, 780, 781`: *Anupgarh, Dudu, Gangapur City, Jaipur Rural, Jodhpur Rural, Kekri, Neem Ka Thana, Sanchore, Shahpura* (Rajasthan interim proposals).

---

### Audit Item 4: Parent-Child Lineage for 164 Reorganized/Carved Districts
- **SQL Query**:
  ```sql
  SELECT 
      s.state_name, 
      COUNT(*) AS carved_count 
  FROM districts d 
  JOIN states s ON d.state_id = s.id 
  WHERE d.is_current_admin = 1 AND d.parent_district_id IS NOT NULL 
  GROUP BY s.state_name 
  ORDER BY carved_count DESC;
  ```
  *Result*: **164 districts across 24 States/UTs**

- **State Breakdown of Modern Carved Districts**:
  - Telangana: **33** districts (IDs `641`–`673`, carved from the 10 old AP districts)
  - Andhra Pradesh: **15** districts (bifurcations in East Godavari, Guntur, Krishna, etc.)
  - Chhattisgarh: **15** districts (Gaurela-Pendra-Marwahi, Mohla-Manpur, Sarangarh, etc.)
  - Arunachal Pradesh: **12** districts (Kamle, Pakke Kessang, Shi Yomi, Lepa Rada, etc.)
  - Assam: **8** districts (Bajali, Biswanath, Charaideo, Hojai, Majuli, South Salmara, etc.)
  - Gujarat: **8** districts (Aravalli, Botad, Chhota Udepur, Devbhumi Dwarka, Gir Somnath, Mahisagar, Morbi)
  - Ladakh: **8** districts (Kargil, Leh, Zanskar, Drass, Sankoo, Nubra, Sham, Changthang)
  - Rajasthan: **8** districts (Balotra, Beawar, Deeg, Didwana-Kuchaman, Kotputli-Behror, Khairthal-Tijara, Phalodi, Salumbar)
  - Manipur: **7** districts (Bishnupur, Chandel, Churachandpur, Imphal East, Imphal West, Senapati, Tamenglong)
  - Nagaland: **6** districts (Noklak, Chümoukedima, Niuland, Tseminyü, Shamator)
  - Tamil Nadu: **6** districts (Chengalpattu, Kallakurichi, Ranipet, Tenkasi, Tirupathur, Mayiladuthurai)
  - Madhya Pradesh: **5** districts (Agar Malwa, Niwari, Mauganj, Maihar, Pandhurna)
  - Meghalaya: **5** districts (Eastern West Khasi Hills, North Garo Hills, South West Garo Hills, etc.)
  - Tripura: **4** districts (Gomati, Khowai, Sepahijala, Unakoti)
  - Uttar Pradesh: **4** districts (Amethi, Hapur, Sambhal, Shamli)
  - West Bengal: **4** districts (Alipurduar, Kalimpong, Jhargram, Paschim Bardhaman)
  - Mizoram: **3** districts (Hnahthial, Khawzawl, Saitual)
  - Punjab: **3** districts (Fazilka, Pathankot, Malerkotla)
  - Dadra & Nagar Haveli and Daman & Diu: **2** districts (Daman, Diu)
  - Haryana: **2** districts (Charkhi Dadri, Nuh)
  - NCT of Delhi: **2** districts (Shahdara, South East Delhi)
  - Sikkim: **2** districts (Pakyong, Soreng)
  - Karnataka: **1** district (Vijayanagara)
  - Maharashtra: **1** district (Palghar)

- **Referential Integrity**: 100% of these 164 carved districts have valid `parent_district_id` foreign keys linking back to their parent Census 2011 district.

---

### Audit Item 5: Census 2011 Demographic Baselines
- **SQL Query**:
  ```sql
  SELECT 
      census_year, 
      COUNT(DISTINCT district_id) AS distinct_districts,
      COUNT(*) AS total_records,
      SUM(total_population) AS total_population_sum
  FROM district_demographics
  GROUP BY census_year;
  ```
  *Result*: **640 districts | 640 records | Total Population: 1,210,854,977 (1.21 Billion)**
- **Audit Findings**:
  - The `district_demographics` table contains demographic records strictly for district IDs `1` through `640`.
  - District IDs `641` through `814` currently have **0 direct records** in `district_demographics`.
  - For per-capita rate calculations, these 164 carved districts rely on the documented `parent_district_id` pointer.

---

### Audit Item 6: Historical Crime Incidents (191,679 Records)
- **SQL Query**:
  ```sql
  SELECT 
      COUNT(*) AS total_incidents,
      COUNT(DISTINCT district_id) AS distinct_districts,
      MIN(incident_date) AS min_date,
      MAX(incident_date) AS max_date,
      MIN(district_id) AS min_dist_id,
      MAX(district_id) AS max_dist_id
  FROM crime_incidents;
  ```
  *Result*: **191,679 incidents | 640 distinct districts | Dates: 2020-01-01 to 2025-12-31**

- **Administrative Reconciliation**:
  ```sql
  SELECT 
      d.is_current_admin,
      d.is_census_2011,
      COUNT(*) AS incident_count,
      COUNT(DISTINCT ci.district_id) AS distinct_districts
  FROM crime_incidents ci
  JOIN districts d ON ci.district_id = d.id
  GROUP BY d.is_current_admin, d.is_census_2011;
  ```
  | Administrative Status | Incident Count | District Count | Details |
  |---|:---:|:---:|---|
  | **Active Canonical Districts** (`is_current_admin = 1`) | **186,032** | 626 | Directly mapped to active canonical districts |
  | **Inactive Historical Districts** (`is_current_admin = 0`) | **5,647** | 14 | Mapped to the 14 historical Census 2011 districts |
  | **Orphaned / Unmapped Incidents** | **0** | 0 | Zero orphaned foreign keys |
  | **TOTAL** | **191,679** | **640** | Exactly matches historical repository ground truth |

- **Distribution of 5,647 Incidents in Inactive Districts**:
  - `Adilabad (ID 4)`: 387
  - `Hyderabad (ID 9)`: 673
  - `Karimnagar (ID 10)`: 460
  - `Khammam (ID 11)`: 500
  - `Mahbubnagar (ID 14)`: 562
  - `Medak (ID 15)`: 524
  - `Nalgonda (ID 16)`: 600
  - `Nizamabad (ID 17)`: 400
  - `Rangareddy (ID 19)`: 770
  - `Warangal (ID 24)`: 404
  - `Daman (ID 128)`: 80
  - `Diu (ID 129)`: 76
  - `Kargil (ID 198)`: 105
  - `Leh(Ladakh) (ID 203)`: 106

---

### Audit Item 7: Crime Prediction Records (21,760 Records)
- **SQL Query**:
  ```sql
  SELECT 
      model_id,
      forecast_status,
      COUNT(*) AS total_predictions,
      COUNT(DISTINCT district_id) AS distinct_districts,
      MIN(district_id) AS min_dist_id,
      MAX(district_id) AS max_dist_id,
      MIN(prediction_date) AS min_pred_date,
      MAX(prediction_date) AS max_pred_date
  FROM crime_predictions
  GROUP BY model_id, forecast_status;
  ```
  *Result*: **21,760 total predictions across 640 districts**
  - `HISTORICAL_EVALUATION` (2025-01-01 to 2025-12-01): **7,680 records** (640 districts × 12 months)
  - `PAST_FORECAST` (2026-01-01 to 2026-10-01): **6,400 records** (640 districts × 10 months)
  - `CURRENT_FUTURE_FORECAST` (2026-11-01 to 2027-10-01): **7,680 records** (640 districts × 12 months)
- **Breakdown**:
  - 21,284 predictions belong to the 626 active Census districts.
  - 476 predictions belong to the 14 inactive Census districts.
  - 0 predictions currently exist for the 164 carved districts (IDs `641`–`814`).

---

### Audit Item 8: Phase 9 Risk Assessment Records
- **SQL Query**:
  ```sql
  SELECT 
      calculation_version,
      score_type,
      period_year,
      period_month,
      COUNT(DISTINCT district_id) AS distinct_districts,
      COUNT(*) AS total_records
  FROM crime_risk_scores
  GROUP BY calculation_version, score_type, period_year, period_month
  ORDER BY calculation_version, score_type, period_year, period_month;
  ```
  *Result*: Every evaluated period contains **640 records** covering district IDs `1` through `640`.
  - `risk-v1.0` FORECAST 2026-01: **640 records**
  - `risk-v2.0` HISTORICAL 1999-01: **640 records**
  - `risk-v2.0` HISTORICAL 2025-12: **640 records**
  - `risk-v2.0` FORECAST 2026-11: **640 records**
  - `risk-v2.0` FORECAST 2026-12: **640 records**
  - `risk-v2.0` FORECAST 2027-01: **640 records**
  - Total records in `crime_risk_scores`: **3,840 records**.
  - All 164 carved active districts currently lack physical records in this table.

---

### Audit Item 9: Geography Mappings & Coordinate Coverage
- **District Geography Mapping Table**:
  - Total records: **799 mapping rows**
  - `SAME`: **515**
  - `SPLIT`: **136**
  - `MERGED`: **2**
  - `TRANSFERRED`: **11**
  - `REORGANIZED`: **135**
- **Frontend SVG Coordinates (`frontend/src/data/districtCoordinates.ts`)**:
  - Total entries: **813 entries**
  - `verified: true`: **649 districts** (including 75 in UP, 36 in Maharashtra, Delhi, etc.)
  - Unverified / interpolated centroid anchors: **164 districts**

---

### Audit Item 10: All Foreign Key Constraints Involving District IDs
The MySQL schema enforces **19 foreign-key constraints** on `districts.id`:
1. `budget_calculation_history.district_id -> districts.id`
2. `budget_estimation_items.district_id -> districts.id`
3. `budget_estimations.district_id -> districts.id`
4. `budget_scenarios.district_id -> districts.id`
5. `crime_incidents.district_id -> districts.id`
6. `crime_predictions.district_id -> districts.id`
7. `crime_risk_scores.district_id -> districts.id`
8. `district_budget_allocations.district_id -> districts.id`
9. `district_demographics.district_id -> districts.id`
10. `district_geography_mapping.current_district_id -> districts.id`
11. `district_geography_mapping.historical_district_id -> districts.id`
12. `district_resources.district_id -> districts.id`
13. `districts.parent_district_id -> districts.id`
14. `districts.state_id -> states.id`
15. `generated_reports.district_id -> districts.id`
16. `official_crime_statistics.district_id -> districts.id`
17. `optimization_allocations.district_id -> districts.id`
18. `resource_inventory_records.district_id -> districts.id`
19. `resource_recommendations.district_id -> districts.id`

**Safety Guarantee**: Any standardization migration must never delete or renumber rows in `districts` without cascading foreign-key updates.

---

## 3. District Mapping & Disposition Plan (790 Canonical Coverage)

| Cohort | District ID Range | Total Districts | Historical Census Status | Admin Status | Standardization Strategy |
|---|:---:|:---:|:---:|:---:|---|
| **A. Active Census Districts** | `1` – `640` (excluding 14 inactive) | **626** | `is_census_2011 = 1` | `is_current_admin = 1` | **RETAIN AS CANONICAL**. Full authentic population, incidents, predictions, and risk scores. |
| **B. Modern Carved Districts** | `641` – `814` (excluding 9 inactive) | **164** | `is_census_2011 = 0` | `is_current_admin = 1` | **RETAIN AS CANONICAL**. Inherit parent population via `parent_district_id` with `is_derived = true`. Generate predictions & risk scores. |
| **C. Inactive Census Districts** | `4, 9, 10, 11, 14, 15, 16, 17, 19, 24, 128, 129, 198, 203` | **14** | `is_census_2011 = 1` | `is_current_admin = 0` | **PRESERVE FOR AUDIT / HISTORICAL QUERY**. Map incidents to 1:1 active successors or mark as historical baseline. |
| **D. Inactive Proposals** | `765, 770, 771, 772, 773, 774, 777, 780, 781` | **9** | `is_census_2011 = 0` | `is_current_admin = 0` | **PRESERVE AS INACTIVE ARCHIVE**. Excluded from active 790 canonical roster. |
| **TOTALS** | `1` – `814` | **813** | — | **790 Active** / **23 Inactive** | **Exact 790 Active Canonical Cohort Established**. |

---

## 4. Reconciliation Plan for Dependent Modules

### Phase 3 — Census & Population Data Reconciliation
1. **Preserve Authentic Census 2011 Records**: Keep the 640 authentic records in `district_demographics` intact.
2. **Standardize Population Inheritance for 164 Carved Districts**:
   - For each carved district $d$ with `parent_district_id = p`:
     - Provide an explicit derived demographic reference:
       $$\text{Derived Population}_d = \text{Census Population}_p \times \text{Mapping Percentage}$$
       *(or assign 100% parent benchmark with explicit `is_derived: true` / `is_inherited: true` flag)*.
   - Never display inherited parent population as independently measured district population.
   - Ensure crime rates per 100k indicate `(Derived Census 2011 Baseline)` in UI metadata.

### Phase 4 — Historical Crime Incidents Reconciliation (191,679 Records)
1. **Zero Incidents Deleted**: All 191,679 unique records remain in `crime_incidents`.
2. **Reconcile the 5,647 Incidents in 14 Inactive Districts**:
   - Where a 1:1 territorial succession exists (e.g., Old AP Hyderabad `ID 9` &rarr; Telangana Hyderabad `ID 644`, Old Daman `ID 128` &rarr; Merged Daman `ID 689`, Old Diu `ID 129` &rarr; Merged Diu `ID 690`, Old Kargil `ID 198` &rarr; Ladakh Kargil `ID 687`, Old Leh `ID 203` &rarr; Ladakh Leh `ID 688`):
     - Safely update incident `district_id` to the active canonical ID.
   - Where a parent was split into multiple children (e.g. Old Warangal `ID 24` split into 6 districts):
     - Maintain original incident association with primary urban/headquarter successor district, or preserve parent ID with cross-reference in analytics view.
3. **Reconcile National & State Totals**:
   - National total: Exactly **191,679 unique incidents**.
   - State totals: Transfer incidents from pre-bifurcated parent states (e.g. AP &rarr; Telangana) to accurately reflect current state totals.

### Phase 5 — Crime Prediction Coverage
1. **Coverage Expansion**:
   - For the 164 active carved districts, generate forecasts from the active production HGBR model anchored at forecast origin `2026-10-01` using historical series inherited from their respective parent jurisdictions.
   - Total forecast records will scale from 21,760 to **$790 \text{ districts} \times 34 \text{ months} = 26,860 \text{ predictions}$**.
2. **Flagging**: Predictions generated via parent inheritance are clearly flagged with `is_derived_from_parent: true`.

### Phase 6 — Crime Risk Assessment Coverage
1. **Evaluate All 790 Active Districts**:
   - Re-execute the Phase 9 explainable risk scoring engine for all active periods (`2026-11-01`, `2026-12-01`, `2027-01-01`, `2025-12-01`) across **$N = 790$ active canonical districts**.
   - Formula remains strictly identical:
     $$\text{Risk Score} = 0.30 \times P_{\text{forecast}} + 0.20 \times P_{\text{severity}} + 0.30 \times P_{\text{rate}} + 0.20 \times P_{\text{trend}}$$
   - National percentiles are calculated on $N = 790$.
   - Update `crime_risk_scores` to contain 790 rows per period.
2. **Dashboard Synchronization**: The Risk Assessment KPI card and district register will immediately display **790 Assessed Districts**.

### Phase 7 — Dependent Modules Alignment
1. **Crime Dashboard & Analytics**: Aggregations query `districts WHERE is_current_admin = 1` (790).
2. **Geographic Intelligence (Phase 7)**: Choropleth and district dots display 790 active districts.
3. **Crime Predictions (Phase 8)**: Dropdowns and forecast charts cover 790 active districts.
4. **Crime Risk Assessment (Phase 9)**: KPI cards show 790 assessed districts; table lists 790 districts sorted by risk score.
5. **Resource Optimization (Phase 10)**: Optimization allocations compute over 790 active units.
6. **Budget Intelligence (Phase 11)**: Budget allocations align with 790 canonical districts.
7. **Reports (Phase 12)**: Report generators reference 790 canonical districts.

---

## 5. Strict Verification & Migration Safety Rules

1. **Database Backup**: Execute a full mysqldump before any data transformations:
   ```bash
   mysqldump -u root -p crime_management_db > backup_crime_management_db_pre_790_standardization.sql
   ```
2. **Zero Incident Deletion**: Incident count must remain exactly **191,679**.
3. **Read-Only Gate**: No write operations performed until explicit user approval of this audit and plan.
