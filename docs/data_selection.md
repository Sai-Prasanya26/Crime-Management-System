# Phase 2 — Raw Data Selection & Column Classification (Audited)

Every column from the raw source files is classified below into exactly one of five categories:
- **KEEP**: Required for core application functionality, analytics, ML features, or decision support.
- **TRANSFORM**: Useful, but normalized into relational entities or lookup keys rather than stored as free text.
- **DERIVED**: Computed dynamically in services or ML pipelines (not stored as raw CSV copies).
- **OPTIONAL**: Excluded from the core schema to prevent bloat.
- **REJECT**: Irrelevant, duplicate, redundant, or unstandardized.

---

## 1. Primary Crime Dataset: `crime_dataset_nationwide.csv` (17 Columns)

**Audit Test Applied to Every Column:** *"Would the project lose a required capability if this field were removed?"*

| Column Name | Decision | Required Project Feature | Final DB Table / Column | Technical Justification |
|---|---|---|---|---|
| `Report Number` | **KEEP** | Req 23 (Reports), Req 25 (Audit/History), Case Lookup | `crime_incidents.report_number` (VARCHAR(50) UNIQUE) | Essential primary incident tracking identifier for incident retrieval, deduplication during ETL, and citation in PDF audit reports. |
| `State name` | **TRANSFORM** | Req 7 (Location-wise analysis), Req 18 (Cascading filters) | `states.state_name` (VARCHAR(100) UNIQUE) | Normalized into master `states` table to avoid repeating 191,679 string copies. |
| `District name` | **TRANSFORM** | Req 7 (Location analysis), Req 9 (Prediction), Req 11 (Risk score), Req 13 (Optimization), Req 15 (Budget), Req 19 (Map) | `districts.district_name` (VARCHAR(100)) linked to `states` | Core administrative geographic unit for district-level risk scoring, ML time-series forecasting, and police allocation. |
| `City` | **REJECT** | None (100% Redundant) | None | **Audited Finding**: For all 191,679 rows, `City` is 100% identical to `District name` (`Total same: 191,679, Diff: 0`). Storing `City` duplicates `District name` on every single row. |
| `Crime Code` | **TRANSFORM** | Req 6 (Crime type analysis), Req 4 (Analytics) | `crime_types.crime_code` (VARCHAR(20) UNIQUE) | Standardized legal classification code for incident classification, high-speed joins, and filtering. |
| `Crime Description` | **TRANSFORM** | Req 6 (Crime type analysis), Req 17 (Interactive charts) | `crime_types.crime_name` (VARCHAR(100)) | Human-readable crime title (e.g. HOMICIDE, BURGLARY, THEFT) normalized into `crime_types`. |
| `Crime Domain` | **TRANSFORM** | Req 6 (Domain analysis), Req 11 (Risk scoring severity) | `crime_categories.category_name` (VARCHAR(50) UNIQUE) | Broad domain grouping (Violent, Property, Traffic, Fire) normalized into `crime_categories` with project-defined severity weights. |
| `Date Reported` | **KEEP** | Req 4 (Analytics), Req 25 (Audit), Reporting lag | `crime_incidents.reported_date` (DATE) | Required for reporting lag analytics (delay between crime occurrence and reporting) and compliance timelines. |
| `Date of Occurrence`| **KEEP** | Req 8 (Time-wise analysis), Req 9 (ML Prediction), Req 10 (Trend forecasting), Req 20 (ML Training) | `crime_incidents.incident_date` (DATE) | Primary temporal feature for time-series forecasting, longitudinal trend analysis, and seasonal risk calculation. |
| `Time of Occurrence`| **KEEP** | Req 8 (Time-wise analysis), Req 13 (Shift optimization) | `crime_incidents.incident_time` (TIME) | Required for temporal distribution analytics (peak crime hours, day vs night shifts, patrol scheduling). |
| `Victim Age` | **KEEP** | Req 5 (Crime statistics), Vulnerable population analysis | `crime_incidents.victim_age` (SMALLINT NULL) | Demographic vulnerability analysis and descriptive crime analytics. |
| `Victim Gender` | **TRANSFORM** | Req 5 (Crime statistics), Gender-disaggregated stats | `crime_incidents.victim_gender` (ENUM('M', 'F', 'OTHER', 'UNKNOWN')) | Standardized single-character representation for demographic crime summaries. |
| `Weapon Used` | **KEEP** | Req 5 (Crime statistics), Weapon involvement risk | `crime_incidents.weapon_used` (VARCHAR(50) NULL) | Preserved across 6 discrete categories; missing values preserved as `NULL` (unknown/unrecorded). |
| `Police Deployed` | **KEEP** | Req 4 (Historical crime analytics), Operational load | `crime_incidents.police_deployed_count` (SMALLINT NOT NULL) | Historical response footprint representing officers dispatched to a specific past incident. |
| `Case Closed` | **TRANSFORM** | Req 5 (Crime statistics), Clearance rates | `crime_incidents.case_status` (ENUM('OPEN', 'CLOSED')) | Normalized clearance flag for computing solved vs unsolved case rates. |
| `Date Case Closed` | **TRANSFORM** | Req 5 (Crime statistics), Resolution duration | `crime_incidents.closed_date` (DATE NULL) | Closure duration calculation. Null when case is open. |
| `Data Source` | **REJECT** | None | None | Static metadata string constant repeated on all 191,679 rows. Documented in project specs; storing in DB wastes storage. |

**Audit Summary for `crime_dataset_nationwide.csv`**:
- **Total Columns**: 17
- **Required / Retained**: **15 Columns**
- **Rejected**: **2 Columns** (`City` due to 100% district duplication; `Data Source` due to static metadata).

---

## 2. Secondary Crime Dataset: `crime_dataset_india.csv` (14 Columns)

**Dataset Status: REJECTED (Reference Only)**

All 14 columns are rejected because this dataset provides only 29 isolated municipal cities without any State or District hierarchy, uses non-standard date formats (`DD-MM-YYYY HH:MM`), contains 5,790 null weapons, and duplicates records from the nationwide dataset.

---

## 3. Census Dataset: `india-districts-census-2011.csv` (118 Columns)

### Retained Columns (Exactly 8 Columns)

| Column Name | Decision | Required Project Feature | Final DB Table / Column | Technical Justification |
|---|---|---|---|---|
| `District code` | **KEEP** | Req 7 (Geography), Req 19 (Map matching) | `districts.census_district_code` (INT UNIQUE NULL) | Official Census of India district code; enables reliable linking to district boundary GeoJSON polygons. |
| `State name` | **TRANSFORM** | Req 7 (Geographic hierarchy) | `states.state_name` | Maps to normalized `states` table. |
| `District name` | **TRANSFORM** | Req 7 (Geographic hierarchy) | `districts.district_name` | Maps to normalized `districts` table. |
| `Population` | **KEEP** | Req 4, 5 (Per-capita rates), Req 11 (Risk score), Req 13 (Policing ratio) | `district_demographics.total_population` (BIGINT) | Essential denominator for per-capita crime rates (crimes/100,000 citizens) and police-to-population ratios. |
| `Male` | **KEEP** | Req 5 (Demographic context) | `district_demographics.male_population` (BIGINT) | Baseline demographic gender structure. |
| `Female` | **KEEP** | Req 5 (Demographic context) | `district_demographics.female_population` (BIGINT) | Baseline demographic gender structure. |
| `Literate` | **KEEP** | Req 5 (Socio-demographic analytics) | `district_demographics.literate_population` (BIGINT) | Literacy rate computation for socio-demographic risk correlation. |
| `Workers` | **KEEP** | Req 5 (Labor force context) | `district_demographics.total_workers` (BIGINT) | Total engaged labor force count for district employment profiling. |

### Rejected Census Columns (110 Columns)

All 110 remaining columns are strictly **REJECTED**:
1. **Household Counts (3 columns)**: `Urban_Households`, `Rural_Households`, `Households` — **REJECTED**. Not required by any project feature. Per-capita crime analysis and police allocation ratios are based on resident population (`Population`), not household counts.
2. **Religious Breakdowns (8 columns)**: `Hindus`, `Muslims`, `Christians`, `Sikhs`, `Buddhists`, `Jains`, `Others_Religions`, `Religion_Not_Stated` — **REJECTED**. Unethical and irrelevant for objective police resource allocation.
3. **Economic / Power Parity (11 columns)**: `Power_Parity_Less_than_Rs_45000` through `Power_Parity_Above_Rs_545000` — **REJECTED**. Irrelevant for operational crime prediction.
4. **Household Amenities & Latrines (15 columns)**: `Type_of_latrine_facility_*`, `Having_bathing_facility_*`, `Type_of_fuel_used_for_cooking_*` — **REJECTED**. Zero relevance to crime analytics or police logistics.
5. **Water Source & Fuel Details (12 columns)**: `Main_source_of_drinking_water_*`, `Location_of_drinking_water_source_*` — **REJECTED**.
6. **Asset Ownership Details (11 columns)**: `Households_with_Bicycle`, `Households_with_Car_Jeep_Van`, `Households_with_Television`, `Households_with_Telephone_Mobile_Phone_*` — **REJECTED**. Redundant noise.
7. **Detailed Caste & Worker Sub-types (30 columns)**: `SC`, `ST`, `Cultivator_Workers`, `Agricultural_Workers`, `Household_Workers`, `Main_Workers`, `Marginal_Workers` — **REJECTED**. Excess granularity not needed for resource planning.
8. **Detailed Age Group & Couple Breakdowns (20 columns)**: `Age_Group_0_29`, `Married_couples_*` — **REJECTED**. Core population already provides needed density metrics.

---

## 4. Final Data Selection Reconciliation Table

| Raw Source Dataset | Total Raw Columns | Retained Columns | Rejected Columns | Primary Reason for Rejections |
|---|---:|---:|---:|---|
| **`crime_dataset_nationwide.csv`** | 17 | **15** | 2 | `City` is 100% duplicate of `District name`; `Data Source` is static metadata. |
| **`crime_dataset_india.csv`** | 14 | **0** | 14 | Lacks State/District hierarchy; unstandardized formats; duplicate reference only. |
| **`india-districts-census-2011.csv`** | 118 | **8** | 110 | Excluded household counts, religion, amenities, asset ownership, and economic brackets. |
