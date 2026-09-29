# Phase 2 — Dataset Analysis & Source Evaluation (Audited)

## 1. Datasets Inspected

Three raw reference datasets located in `data_import/raw/` were systematically analyzed:

1. **`crime_dataset_nationwide.csv`** (35.89 MB, 191,679 rows, 17 columns)
2. **`crime_dataset_india.csv`** (4.71 MB, 40,160 rows, 14 columns)
3. **`india-districts-census-2011.csv`** (0.43 MB, 640 rows, 118 columns)

---

## 2. Quantitative Summary

| Metric | `crime_dataset_nationwide.csv` | `crime_dataset_india.csv` | `india-districts-census-2011.csv` |
|---|---|---|---|
| **File Size** | 35.89 MB | 4.71 MB | 0.43 MB |
| **Total Rows** | 191,679 | 40,160 | 640 |
| **Total Columns** | 17 | 14 | 118 |
| **Geographic Scope** | 35 States, 634 Districts (City is 100% duplicate of District) | 29 Municipal Cities only (Zero States, Zero Districts) | 35 States, 634 Districts |
| **Coordinates** | None (No Lat/Long in dataset) | None | None |
| **Date Range** | 2020-01-01 to 2025-12-31 (6 full years) | 2020-01-01 to 2024-12-31 | Census Year 2011 |
| **Date Format** | Standard ISO `YYYY-MM-DD` | Non-standard `DD-MM-YYYY HH:MM` | N/A |
| **Missing Values** | Only `Date Case Closed` (98,189 nulls for open cases) | `Weapon Used` (5,790 nulls), `Date Case Closed` (20,098 nulls) | Zero nulls across key demographic columns |
| **Weapon Taxonomy** | 6 discrete values (`KNIFE`, `EXPLOSIVES`, `BLUNT OBJECT`, `POISON`, `FIREARM`, `OTHER`); 0 nulls | 5,790 nulls; unstandardized casing | N/A |
| **Taxonomy** | 21 Standardized Crime Codes, 4 Domains | 500 Unstandardized Crime Codes | 118 Demographics/Amenities/Religions |
| **Data Source Attribution** | Explicitly stated: *Synthetic - derived from Kaggle crime distributions and Census 2011* | Not attributed (BOM header present) | Census of India 2011 Official District Level Data |

---

## 3. Dataset Audit & Deep Findings

### 3.1. The "City" Column Redundancy Audit
An exhaustive audit across all 191,679 rows of `crime_dataset_nationwide.csv` revealed that:
$$\text{District name} \equiv \text{City} \quad \text{for } 100\% \text{ of records (191,679 rows)}.$$
The dataset generator merely duplicated the district name into the `City` column. Creating a separate `cities` relational table and storing `city_id` in `crime_incidents` is completely redundant. Geographic hierarchy for the application is therefore properly normalized to **`State` $\rightarrow$ `District`**.

### 3.2. Latitude & Longitude Source Audit
None of the three raw CSV files contain latitude or longitude coordinates. In accordance with strict audit rules:
- No synthetic or fake coordinates are fabricated in MySQL.
- Coordinates are removed from the core relational `districts` schema.
- Interactive choropleth / risk maps in Phase 15 will bind district statistics directly via `district_name` and `census_district_code` to standard India district boundary GeoJSON polygons.

### 3.3. Weapon Used Handling Audit
In `crime_dataset_nationwide.csv`, `Weapon Used` contains exactly 6 categories (`KNIFE`: 32,293, `EXPLOSIVES`: 32,230, `BLUNT OBJECT`: 31,995, `POISON`: 31,882, `FIREARM`: 31,801, `OTHER`: 31,478) with zero missing values.
If any future incident records contain blank/missing values, they will be preserved as `NULL` (indicating "Unknown/Unrecorded"), strictly maintaining the distinction between:
- `NULL`: Unrecorded / Unknown in source
- `'NONE'`: Explicitly confirmed that no weapon was present
- Known weapons: `'FIREARM'`, `'KNIFE'`, `'BLUNT OBJECT'`, etc.
- `'OTHER'`: Explicitly recorded other weapon type.
Missing values will NEVER be assumed or converted to `'NONE'`.

### 3.4. Historical Incident Deployment vs. Operational Resource Inventory
There is a fundamental conceptual separation:
- `crime_incidents.police_deployed_count`: Historical single-incident response presence (officers dispatched to a specific past crime scene).
- `district_resources.available_quantity`: Active operational inventory of personnel and equipment stationed in a district for ongoing and future shifts, managed by department administrators.
These two quantities are never conflated or substituted for one another.

### 3.5. Crime Severity Origin
The raw dataset does **not** provide official severity rankings or weights. Therefore:
- `crime_categories.severity_weight` and `crime_types.severity_level` are **project-defined classifications** based on standard Indian legal / IPC principles (e.g., violent crimes against persons carry higher operational weight than property misdemeanors in composite risk index formulas).
- These weights are fully configurable by administrators and are not falsely represented as official government rankings.

### 3.6. Primary Dataset Decision
- **Authoritative Selected Source**: `crime_dataset_nationwide.csv` is the sole primary crime dataset.
- **Status of `crime_dataset_india.csv`**: **Rejected / Reference only**. It represents an older, partial, un-normalized 29-city subset. Combining them would create massive duplication, geographic gaps, and inconsistent crime taxonomies.
- **Census 2011 Dataset**: Provides the definitive 634-district baseline population and demographic metrics matching the nationwide crime dataset.
