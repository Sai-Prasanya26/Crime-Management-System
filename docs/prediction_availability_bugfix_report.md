# Bug Fix Report: Crime Predictions Availability for Districts and Months

**Document:** `docs/prediction_availability_bugfix_report.md`  
**Date:** October 28, 2026  
**System:** Data-Driven Crime Management System  
**Module:** Phase 8 / Crime Predictions (`/predictions`)

---

## 1. Executive Summary

An investigation was conducted into reports of crime predictions returning as "Unavailable" or "Insufficient historical baseline data" across various districts and months on the Crime Predictions page.

### Key Discoveries:
1. **Administrative Lineage Gap (Primary Bug)**: The system maintains 803 total districts in the database (640 Census 2011 districts with full historical time-series incident data, and 163 modern reorganized administrative districts). While the frontend district selector lists current administrative districts (e.g., all 33 districts of Telangana, 17 in Rajasthan, 15 in Andhra Pradesh), the prediction repository queried `crime_predictions` and `crime_incidents` directly by the child `district_id`. Because predictions and historical caseloads are anchored to Census 2011 jurisdictions, child districts (such as Hyderabad ID 644 in Telangana) returned zero historical incidents and zero predictions, triggering a false "Insufficient Baseline" error even though complete forecasts existed for their Census parent (ID 9).
2. **Horizon Boundary (Genuine Limitation)**: The production HGBR model was trained and calibrated under an operational 3-month walk-forward horizon (November 2026 – January 2027) with Split Conformal calibration intervals. Queries for future months beyond January 2027 (e.g., April 2027) or unprojected intermediate months (April 2026 – October 2026) are outside this horizon and cannot be fabricated.
3. **Month Selector Usability Gap**: The frontend selector previously listed months 1–12 indiscriminately for any year without indicating whether the month was supported or beyond the forecast horizon.

---

## 2. Root Cause Audit (Addressing Specific Inquiries)

| Investigation Item | Finding & Root Cause Analysis |
| :--- | :--- |
| **1. Forecasts Stored for Districts** | Forecasts are stored in `crime_predictions` for all **640 Census 2011 districts** across 18 monthly periods (7,680 historical evaluation records for 2025, 1,920 past forecasts for Jan–Mar 2026, and 1,920 forward forecasts for Nov 2026–Jan 2027; total 11,520 rows). |
| **2. District Mapping Mismatch** | **Confirmed Bug.** Modern administrative child districts (e.g., Hyderabad ID 644, Alluri Sitharama Raju ID 674, South East Delhi ID 761) have `is_census_2011 = 0` and point to Census parents via `parent_district_id`. `PredictionRepository.get_district_month_prediction` and `get_actual_vs_predicted` did not resolve `parent_district_id`, causing queries on `crime_predictions` and `crime_incidents` to match 0 rows. |
| **3. API Query Parameter Alignment** | The API correctly accepts `district_id`, `year`, and `month`. The failure was internal to the repository query logic, which failed to map current administrative IDs to their underlying Census 2011 predictive baseline. |
| **4. Date Format Consistency** | Formats are consistent: SQL uses `DATE` (`YYYY-MM-01`), the API converts `year` and `month` integers into `YYYY-MM-01`, and the frontend formats display periods as `YYYY-MM`. |
| **5. Forecast Horizon Scope** | The operational forward forecasting model supports an active **3-month operational horizon** (November 2026 – January 2027). Months beyond January 2027 (e.g., April 2027) cannot be validly predicted without retraining or autoregressive extrapolation without ground truth. Fabricating numbers beyond this horizon is strictly forbidden. |
| **6. Nature of Missing Results** | Results for child districts in Nov 2026–Jan 2027 were missing due to a **query mapping bug**; results for April 2027 were missing due to a **genuine forecast-horizon restriction**; results for unmapped districts with no incident history (e.g., Aravalli ID 725) are missing due to **insufficient historical baseline data**. |

---

## 3. Implemented Fixes

### A. Automatic Census 2011 Parent Resolution (`backend/app/repositories/prediction_repository.py`)
- Updated `get_district_month_prediction()`:
  - Detects if a queried district has `parent_district_id` and `is_census_2011 = False`.
  - Automatically resolves queries on `crime_incidents` (historical baseline, actuals) and `crime_predictions` (stored forecasts) to the parent jurisdiction `eff_did`.
  - Transparently returns `parent_district_id`, `parent_district_name`, and `is_derived_from_parent: True`.
  - Contextualizes human-readable explanations to indicate: `(analytics resolve to Census 2011 baseline '<Parent Name>')`.
  - For unmapped districts with zero baseline history (e.g., Aravalli), cleanly returns `is_available: False`, `crime_level: "Insufficient Baseline"`, and an honest explanatory message without fabricated numbers.
- Updated `get_actual_vs_predicted()`:
  - Resolves `eff_did = parent_district_id` so that the 30-month timeline chart renders historical actuals (2024–2025) and forward forecasts (2026–2027) for child districts.
- Updated `list_predictions()`:
  - Resolves `eff_did` when filtering by district.

### B. Schema Alignment (`backend/app/schemas/predictions.py` & `frontend/src/api/predictionApi.ts`)
- Added optional fields to `DistrictMonthPredictionResponse` and TypeScript interface:
  - `parent_district_id?: Optional[int]`
  - `parent_district_name?: Optional[str]`
  - `is_derived_from_parent?: Optional[bool]`

### C. Improved Month & Year Selector (`frontend/src/pages/PredictionsPage.tsx`)
- Grouped month options using `<optgroup>`:
  - **Supported Forecasts & Records**: Only months with valid data for the selected year.
  - **Outside Forecast Horizon (Unavailable)**: Explicitly labeled (e.g. `April (Outside Horizon)`), preventing users from mistaking unsupported months for supported ones.
- Automatic Year Synchronization (`handleYearChange`):
  - When switching to 2027, automatically resets to month 1 (`January - Active Forecast`).
  - When switching to 2026, automatically resets out-of-bounds months (4–10) to 11 (`November - Active Forecast`).
- Visible Lineage & Horizon Indicators:
  - Added a compact horizon footer note beneath the selector controls.
  - Added a `Census 2011 baseline (<Parent>)` metadata badge in the result header when viewing a reorganized district.

---

## 4. Test Results Across Districts & States

The following test suite was executed against the database and API:

| District | State | Census / Lineage | Month Tested | `is_available` | Type | Value | Trend | Status / Note |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Hyderabad (9)** | AP / Historical | Census 2011 Parent | Nov 2026 | `True` | `FORECAST` | 9.37 | `Similar` | Direct Census 2011 record |
| **Hyderabad (644)** | Telangana | Child of ID 9 | Nov 2026 | `True` | `FORECAST` | 9.37 | `Similar` | Resolved to parent (ID 9) |
| **Hyderabad (644)** | Telangana | Child of ID 9 | Dec 2026 | `True` | `FORECAST` | 9.18 | `Higher` | Resolved to parent (ID 9) |
| **Hyderabad (644)** | Telangana | Child of ID 9 | Jan 2027 | `True` | `FORECAST` | 8.64 | `Higher` | Resolved to parent (ID 9) |
| **Hyderabad (644)** | Telangana | Child of ID 9 | Apr 2027 | `False` | `UNAVAILABLE` | — | `Unavailable` | Outside 3-month forecast horizon |
| **New Delhi (404)** | Delhi | Census 2011 | Nov 2026 | `True` | `FORECAST` | 1.37 | `Lower` | Direct Census 2011 record |
| **South East Delhi (761)** | Delhi | Child of South Delhi (408) | Nov 2026 | `True` | `FORECAST` | 5.51 | `Higher` | Resolved to parent (ID 408) |
| **South East Delhi (761)** | Delhi | Child of South Delhi (408) | Apr 2027 | `False` | `UNAVAILABLE` | — | `Unavailable` | Outside 3-month forecast horizon |
| **Mumbai (348)** | Maharashtra | Census 2011 | Nov 2026 | `True` | `FORECAST` | 8.22 | `Lower` | Direct Census 2011 record |
| **Aravalli (725)** | Gujarat | Unmapped / No Parent | Nov 2026 | `False` | `UNAVAILABLE` | — | `Insufficient Baseline` | Handled gracefully with explanatory note |

---

## 5. Verification & Code Quality

- **Database Preservation**:
  - `crime_incidents`: **191,679** (unchanged)
  - `crime_predictions`: **11,520** (unchanged)
  - `districts`: **803** (unchanged)
  - Zero database schema migrations or data alterations performed.
- **Backend Test Suite**:
  - `test_crime_prediction_pipeline`: **15 passed, 0 failures** in 4.63s.
  - `test_crime_forecasting_reliability`: **14 passed, 0 failures** in 8.39s.
  - Total: **29 backend tests passing**.
- **Frontend Quality**:
  - `oxlint`: **0 errors** across 66 files.
  - `tsc -b && vite build`: **0 errors**, production bundle built successfully in 5.53s.

---

## 6. Unresolved Limitations

1. **Fixed 3-Month Forecast Horizon**: The model pipeline is formally trained and evaluated for an operational 3-month forward horizon (November 2026 – January 2027). Months from February 2027 onwards are genuine horizon boundaries; predicting them without autoregressive drift or retraining would produce uncalibrated estimates. The system now truthfully displays "Prediction unavailable for this month" for these periods.
2. **Unmapped Reorganized Districts**: Three recent administrative districts (`Aravalli` in Gujarat, `Pakyong` and `Soreng` in Sikkim) do not have a parent district mapped in the database. The system now gracefully informs the user that baseline records are unavailable, preventing application errors or fabricated numbers.
