# Official Police Resource Data Integration & Methodology

## 1. Executive Summary

This document defines the architecture, provenance, data ingestion pipeline, backend APIs, and frontend integration for **official Indian police resource baseline data**.

In compliance with project integrity principles:
- **Zero synthetic or fabricated resource numbers** are generated.
- **No arbitrary disaggregation**: Official statistics compiled and published by the Bureau of Police Research and Development (BPR&D) and the Ministry of Home Affairs (MHA) exist at the **State/UT aggregate level**. Arbitrarily dividing state-level police strength down to districts would fabricate false ground truth.
- **Explicit separation of concerns**: Official baseline inventories are stored in a dedicated `state_resources` table, while district-level availability in `district_resources` remains unpopulated (0 rows) marked with `UNRECORDED_DISTRICT_INVENTORY`. District gap modeling continues to compute gross algorithmic requirements against this unrecorded state.
- **Data integrity preserved**: All 191,679 verified historical crime incidents (2020–2025) and Census 2011 demographics remain completely untouched.

---

## 2. Authoritative Source Provenance

### 2.1 Police Personnel (Sanctioned, Actual, Vacancies)

| Field | Metadata |
|---|---|
| **Institutional Publisher** | Bureau of Police Research and Development (BPR&D), Ministry of Home Affairs (MHA), Government of India |
| **Publication Title** | *Data on Police Organizations (DoPO) as on 01.01.2020* |
| **Official Disclosure** | Parliament of India, Lok Sabha Unstarred Question No. 2239, Answered on 15.03.2022 |
| **Source URL** | https://sansad.in/getFile/loksabhaquestions/annex/178/AU2239.pdf |
| **Reference Date** | January 1, 2020 |
| **Geographic Resolution** | State / Union Territory aggregate (36 modern administrative entities) |
| **Checksum / File Verification** | Standard Lok Sabha Parliamentary Record Annexure 178/AU2239 |

#### Verified National Totals:
- **Total Sanctioned Police Strength**: `2,623,225`
- **Total Actual Police Strength**: `2,091,488`
- **Total Police Vacancies**: `531,737`
- **State/UT Coverage**: `36 of 36` active States & Union Territories (100.0%)

### 2.2 Police Mobility & Transport Fleet

| Field | Metadata |
|---|---|
| **Institutional Publisher** | Bureau of Police Research and Development (BPR&D), Government of India |
| **Publication Title** | *Data on Police Organizations (DoPO)* / Dataful Dataset 20140 |
| **Source URL** | https://dataful.in/datasets/20140/ |
| **National Fleet Scope** | 202,925 total police transport vehicles nationwide |
| **Verified State Fleet Records** | Andhra Pradesh (9,656), Arunachal Pradesh (1,953), Assam (4,181) |
| **Geographic Resolution** | State aggregate |

### 2.3 Investigation Teams & Surveillance Units

- **Status**: Currently unrecorded in published national statistical registries.
- **System Handling**: Tracked with explicit status `UNRECORDED_INVENTORY` across both database queries and API responses. No fictitious device numbers or operational squads are assumed.

---

## 3. Database Architecture & Schema

### 3.1 Migration & Table Definition

The `state_resources` table was created via migration script `database/migrations/migrate_state_resources.py`:

```sql
CREATE TABLE IF NOT EXISTS state_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    sanctioned_quantity INT NULL,
    actual_quantity INT NULL,
    available_quantity INT NOT NULL DEFAULT 0,
    reference_year SMALLINT NOT NULL,
    source_name VARCHAR(150) NOT NULL,
    source_publication VARCHAR(255) NOT NULL,
    source_url VARCHAR(255) NULL,
    source_geography VARCHAR(50) NOT NULL DEFAULT 'STATE',
    data_as_of DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_state_res_state FOREIGN KEY (state_id) REFERENCES states (id) ON DELETE RESTRICT,
    CONSTRAINT fk_state_res_type FOREIGN KEY (resource_type_id) REFERENCES resource_types (id) ON DELETE RESTRICT,
    CONSTRAINT uq_state_res_period UNIQUE (state_id, resource_type_id, reference_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_state_res_state ON state_resources (state_id);
CREATE INDEX idx_state_res_type ON state_resources (resource_type_id);
CREATE INDEX idx_state_res_year ON state_resources (reference_year);
```

### 3.2 Integrity Invariants

1. **Foreign Key Guarantees**: Every record references an existing valid `states.id` (1–37) and active `resource_types.id`.
2. **Compound Unique Key**: `(state_id, resource_type_id, reference_year)` ensures zero duplicate rows.
3. **No Null Overrides**: Quantities default safely; `actual_quantity` represents the ground-truth on-duty force.
4. **Historical Isolation**: The `crime_incidents` table (191,679 rows) and `district_demographics` table remain completely segregated and unmodified.

---

## 4. Ingestion Pipeline

The ingestion pipeline is implemented in `data_import/import_state_resources.py`:

1. **Input**: Source CSV at `data_import/source_data/police_resources/bprd_dopo_state_resources.csv`.
2. **State Normalization**: Maps government state names (e.g. `DELHI` -> `NCT OF DELHI`, `DADRA AND NAGAR HAVELI AND DAMAN AND DIU`, `LADAKH`, etc.) directly to `states` table primary keys.
3. **Resource Type Resolution**: Links `Police Officers` to `resource_type_id = 1` and `Patrol Vehicles` to `resource_type_id = 2`.
4. **Idempotent Upsert**: Updates existing records or inserts new rows without duplicate key exceptions.
5. **Post-Import Verification**:
   - Asserts all 36 active states exist.
   - Asserts exact national sums match: 2,623,225 sanctioned; 2,091,488 actual; 531,737 vacancies.
   - Asserts non-negative values.
   - Asserts incident count equals 191,679.

---

## 5. Backend REST API Endpoints

### 5.1 `GET /api/v1/resources/states`

Returns the official state-level police resource registry.

- **Authentication**: Bearer JWT required (Admin / Analyst / Officer).
- **Query Parameters**:
  - `state_id` (optional `int`): Filter by state ID.
  - `resource_type_id` (optional `int`): Filter by resource type (e.g. `1` for Police Officers).
  - `skip` (optional `int`, default `0`): Pagination offset.
  - `limit` (optional `int`, default `100`): Maximum records to retrieve.
- **Sample Response**:
  ```json
  {
    "total": 39,
    "items": [
      {
        "id": 1,
        "state_id": 1,
        "state_name": "ANDAMAN AND NICOBAR ISLANDS",
        "resource_type_id": 1,
        "resource_name": "Police Officers",
        "unit_of_measure": "Personnel",
        "sanctioned_quantity": 4988,
        "actual_quantity": 4302,
        "available_quantity": 4302,
        "vacancy_quantity": 686,
        "reference_year": 2020,
        "source_name": "Bureau of Police Research and Development (BPR&D), Ministry of Home Affairs",
        "source_publication": "Data on Police Organizations (DoPO) as on 01.01.2020 / Lok Sabha Unstarred Question No. 2239",
        "source_url": "https://sansad.in/getFile/loksabhaquestions/annex/178/AU2239.pdf",
        "source_geography": "STATE",
        "data_as_of": "2020-01-01"
      }
    ]
  }
  ```

### 5.2 `GET /api/v1/resources/coverage`

Returns the system-wide resource data coverage summary and inventory status.

- **Authentication**: Bearer JWT required.
- **Sample Response**:
  ```json
  {
    "total_active_states": 36,
    "total_state_resource_records": 39,
    "geography_level": "STATE",
    "categories": [
      {
        "resource_type_id": 1,
        "resource_name": "Police Officers",
        "unit_of_measure": "Personnel",
        "reference_year": 2020,
        "data_as_of": "2020-01-01",
        "states_covered": 36,
        "coverage_percentage": 100.0,
        "total_sanctioned": 2623225,
        "total_actual": 2091488,
        "total_available": 2091488,
        "total_vacancies": 531737,
        "missing_state_names": []
      },
      {
        "resource_type_id": 2,
        "resource_name": "Patrol Vehicles",
        "unit_of_measure": "Vehicles",
        "reference_year": 2024,
        "data_as_of": "2024-01-01",
        "states_covered": 3,
        "coverage_percentage": 8.33,
        "total_sanctioned": null,
        "total_actual": null,
        "total_available": 15790,
        "total_vacancies": null,
        "missing_state_names": ["..."]
      }
    ],
    "methodology_notes": [
      "Official police data is published by BPR&D/MHA at State/UT aggregate resolution.",
      "Arbitrary disaggregation of state figures into districts is prohibited to avoid fabricating false ground truth.",
      "District-level operations utilize gross algorithmic demand while district inventories remain UNRECORDED."
    ]
  }
  ```

---

## 6. Frontend User Interface Integration

The Resource Optimization interface in `frontend/src/pages/ResourceOptimizationPage.tsx` integrates the official state baseline alongside district gap modeling:

1. **Dual-Tab Workspace**:
   - **Official State Baseline (36/36)**: Displays authentic, official BPR&D / MHA statistics across all 36 States and UTs.
   - **District Gap Modeling**: Displays algorithmic demand calculations across 640 districts with clear disclaimers that district ground inventory is unrecorded.
2. **Official KPI Summary Cards**:
   - **Total Sanctioned Personnel**: 2,623,225
   - **Actual On-Duty Force**: 2,091,488
   - **National Vacancies**: 531,737
   - **Verified Mobility Fleet**: 15,790 vehicles recorded
3. **Interactive Search & Category Filters**:
   - Filter by All, Police Personnel, or Mobility Fleet.
   - State-name real-time search.
4. **Data Provenance Badges**:
   - Direct links to official source URLs (`AU2239.pdf` and `dataful.in`).
   - Clear citation of publication titles and reference years.

---

## 7. Verification & Quality Assurance

### 7.1 Automated Backend Test Suite

File: `backend/tests/test_state_resources.py`

| Test Case | Description | Result |
|---|---|---|
| `test_01_all_36_states_covered_for_police_officers` | Asserts 36/36 active states have records | PASSED |
| `test_02_exact_national_totals` | Asserts exact 2,623,225 sanctioned / 2,091,488 actual / 531,737 vacancies | PASSED |
| `test_03_patrol_vehicles_data` | Asserts verified vehicle records for AP, Arunachal, Assam | PASSED |
| `test_04_quantities_non_negative` | Asserts all numerical quantities are $\ge 0$ | PASSED |
| `test_05_no_duplicate_records` | Asserts uniqueness constraint on state, type, and year | PASSED |
| `test_06_crime_incidents_unmodified` | Asserts crime incident count remains strictly 191,679 | PASSED |
| `test_07_district_resources_empty` | Asserts `district_resources` table remains 0 rows | PASSED |
| `test_08_api_authentication_required` | Asserts 401 Unauthorized for unauthenticated requests | PASSED |
| `test_09_api_get_state_resources_filters` | Asserts filters, pagination, and data schema | PASSED |
| `test_10_api_get_resource_coverage` | Asserts coverage metrics across all 4 resource categories | PASSED |

### 7.2 Regression Testing
- `backend/tests/test_resource_engine.py`: 15 of 15 tests PASSED.
- `backend/tests/test_risk_engine.py`: 13 of 13 tests PASSED.

### 7.3 Frontend Build
- `npm run build` (`tsc -b && vite build`): PASSED with 0 errors.
