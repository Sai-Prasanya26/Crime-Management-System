# Geographic Intelligence — State and District Jurisdiction Profiles Fix Report

## Project Overview
- **Project**: Data-Driven Crime Management System with AI-Based Resource Optimization
- **Repository**: [https://github.com/Sai-Prasanya26/Crime-Management-System](https://github.com/Sai-Prasanya26/Crime-Management-System)
- **Target Page**: Geographic Intelligence (`/districts`)
- **Date**: October 25, 2026

---

## 1. Executive Summary & Root Cause Analysis

### Identified Problem
When navigating to the Geographic Intelligence page (`/districts`), selecting only a State/UT from the Jurisdiction Filter dropdown frequently resulted in blank dashes (`—`) across:
- **Reported Incidents**
- **Population Density**
- **Crime Rate / 100K**

Selecting a specific district also displayed blank values (`—`) for multiple jurisdictions (e.g. reorganized child districts in Telangana, Andhra Pradesh, and any district ranked outside the top 15 in volume or rate).

### Root Cause Audit
1. **Frontend-Only Lookups on Incomplete Ranking Data**:
   - `DistrictsPage.tsx` previously derived its card metrics by calling `topDistricts.items.find(d => d.district_id === selectedDistrictId)` where `topDistricts` was fetched from `analyticsApi.getTopDistricts` with a hard limit of 15.
   - When **only a state** was selected, `selectedDistrictId` was `undefined`. Therefore `selectedDistrictStats` was always `null`. No state-level aggregation endpoint was queried or calculated.
   - When a **district** was selected:
     - If the district ranked outside the top 15 in that state, `selectedDistrictStats` was `undefined`.
     - In current administrative mode, the dropdown lists modern administrative districts (e.g., Telangana IDs `641..673`), whereas `analyticsApi.getTopDistricts` ranked historical Census 2011 district IDs (`1..640`). Because child district IDs never matched historical parent IDs in `topDistricts`, `selectedDistrictStats` was `undefined` for **all 33 districts of Telangana, 26 modern districts of AP**, and other reorganized districts.
2. **Missing Parent Demographics Fallback in Detail Route**:
   - `GET /api/v1/geography/districts/{district_id}` only queried `district.demographics`. For modern child districts, demographics are stored on `parent_district.demographics`, resulting in `null` demographics.
3. **Disconnected Risk Classification**:
   - The UI used a hardcoded check `crime_rate_per_100k > 250 ? High Risk Hotspot : Monitored Area`, defaulting to "Monitored Area" even when no data or matching risk score existed.

---

## 2. Implemented Architecture & Behavioral Solutions

### A. Dedicated Jurisdiction Profile Backend Endpoint
Created `GET /api/v1/geography/jurisdiction-profile` (with alias `/profile`), accepting `state_id`, `district_id`, and `geography_mode` (`current` or `historical`).

1. **State Overview Profile (`state_id` provided, `district_id` omitted)**:
   - **Reported Incidents**: Uses `CrimeRepository.resolve_filter_district_ids` to aggregate incident proceedings attributable to that state across both current admin (36 entities) and historical Census 2011 frameworks (35 entities).
   - **Population**: Aggregates the Census 2011 population baseline (`DistrictDemographics.total_population`) for the matching district entities.
   - **Crime Rate / 100K**: Calculated strictly as:
     $$\text{Crime Rate per 100,000} = \left(\frac{\text{Reported Incidents}}{\text{Population}}\right) \times 100{,}000$$
     Where population is zero, null, or unavailable, rate is preserved as `None` (no arbitrary substitution with 0).
   - **Risk Classification**: Because AI risk assessment models are calibrated and scored at the district level, state-level risk classification is explicitly set to `Not available` with explanatory documentation notes.

2. **District Profile (`district_id` provided)**:
   - **District Validation**: Confirms district exists and validates consistency with `state_id` (returns HTTP 400 if an invalid district-state pairing is submitted).
   - **Parent District & Mapping Lineage**: Automatically derives Census 2011 parent lineage for modern child districts (e.g., Hyderabad ID 644 derives from parent ID 9).
   - **Reported Incidents & Demographics**: Reads exact demographics and incidents. Newly formed districts without Census 2011 baselines (e.g. Aravalli ID 725, Pakyong ID 782, Soreng ID 783) return `null` population and rate with clear explanation.
   - **Calibrated AI Risk Classification**: Matches records against `crime_risk_scores`, retrieving calibrated `overall_risk_score` and `risk_level` (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`). If unassessed, returns `Not available`.

3. **Parent Demographics Fallback**:
   - Updated `GeographyService.get_district_detail` so child districts automatically inherit `parent_district.demographics` when direct demographics are empty.

### B. Reactive Frontend Integration (`DistrictsPage.tsx`)
- **Immediate Heading Updates**: Page title and profile heading immediately update upon state/district selection without waiting for network completion.
- **Stale State Prevention**: When the selected state or district changes, previous profile data is cleared immediately to prevent ghost values from remaining visible.
- **Dedicated Loading & Error State**: Renders an inline spinner during aggregation and an error notice with a **Retry** action upon API failure.
- **Reset Capability**: The Reset Filter action cleanly clears state and district filters, reverting to the default unselected state.
- **Dual Geography Modes**: Honors both `current` (789 modern districts) and `historical` (640 Census 2011 districts) modes based on URL query parameters.

---

## 3. Files Modified

| Component | File Path | Nature of Changes |
| :--- | :--- | :--- |
| **Pydantic Schema** | `backend/app/schemas/geography.py` | Added `JurisdictionProfileResponse` schema with scope, identifiers, demographics, incidents, rates, risk scores, and notes. |
| **Service Layer** | `backend/app/services/geography_service.py` | Implemented `get_jurisdiction_profile` and parent demographics fallback in `get_district_detail`. |
| **API Router** | `backend/app/api/v1/geography.py` | Exposed `/jurisdiction-profile` and `/profile` endpoints with query parameter validation. |
| **Frontend Types** | `frontend/src/types/index.ts` | Added `JurisdictionProfileResponse` TypeScript interface. |
| **Frontend API Client** | `frontend/src/api/geographyApi.ts` | Added `getJurisdictionProfile` client method. |
| **Frontend View** | `frontend/src/pages/DistrictsPage.tsx` | Refactored Jurisdiction Profile card to consume `/jurisdiction-profile`, handle loading/error/retry, prevent stale data, and support state overviews. |
| **Automated Tests** | `backend/tests/test_jurisdiction_profiles.py` | Created 9 automated integration tests covering state-only, district-selected, lineage mapping, missing demographics, validation errors, and geography modes. |

---

## 4. Verification & Automated Test Results

### A. Dedicated Jurisdiction Profile Test Suite
Command: `python -m unittest backend/tests/test_jurisdiction_profiles.py`

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `test_state_overview_andhra_pradesh_current` | Current AP: 7,072 incidents, 49,386,799 pop, 14.32 rate/100k, risk 'Not available' | **PASSED** (200 OK) |
| `test_state_overview_telangana_current` | Current TG: 5,280 incidents, 35,193,978 pop, 15.00 rate/100k, risk 'Not available' | **PASSED** (200 OK) |
| `test_state_overview_historical_ap_bifurcation` | Historical AP: 12,352 incidents (7,072 + 5,280), 84,580,777 pop, 14.60 rate/100k | **PASSED** (200 OK) |
| `test_district_profile_census_district` | Nicobars ID 1: 64 incidents, 36,842 pop, 173.71 rate, HIGH risk (63.62) | **PASSED** (200 OK) |
| `test_district_profile_child_district_lineage` | Modern Hyderabad ID 644 linked to Parent ID 9: 673 incidents, 3,943,323 pop, 17.07 rate, HIGH risk (55.73) | **PASSED** (200 OK) |
| `test_newly_formed_district_missing_census_baseline` | Aravalli ID 725: safely returns `None` for population & rate without substituting 0 | **PASSED** (200 OK) |
| `test_inconsistent_district_and_state_ids_returns_400` | Nicobars (State 1) submitted with State 36 correctly rejected | **PASSED** (400 Bad Request) |
| `test_missing_parameters_returns_400` | Calling profile without `state_id` or `district_id` correctly rejected | **PASSED** (400 Bad Request) |
| `test_district_detail_endpoint_fallback` | `GET /geography/districts/644` returns parent demographics | **PASSED** (200 OK) |

**Result Summary**: 9 / 9 tests passed in 0.577s.

### B. Regression & System Integration Test Suites
- `python -m unittest backend/tests/test_geography_mode_switch.py`: **7/7 passed** (2.66s)
- `python -m unittest backend/tests/test_end_to_end_integration.py`: **12/12 passed** (3.92s)

### C. Frontend Linter & Production Build
- `npm --prefix frontend run lint` (`oxlint`): **Passed** (0 errors across 65 files)
- `npm --prefix frontend run build` (`tsc -b && vite build`): **Passed** (2.88s, clean production bundles)

### D. Database Verification
- `crime_incidents`: 191,679 (intact)
- `districts`: 803 total (640 Census 2011, 789 modern current admin)
- `district_demographics`: 640 (intact)
- `crime_risk_scores`: 3,200 (intact)

---

## 5. Known Limitations
1. **Newly Formed Post-2011 Districts**: Three modern districts (Aravalli, Pakyong, Soreng) were created by state reorganisation without direct parent Census 2011 linkage in national gazettes. As specified, their population and rate display `Not available` with explanatory notes rather than arbitrary estimations.
2. **State-Level Risk Scoring**: AI risk scores are calibrated per district jurisdiction. When a state overview is active, risk level correctly displays `Not available`.
