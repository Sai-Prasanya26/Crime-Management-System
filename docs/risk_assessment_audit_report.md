# Crime Risk Intelligence Module — Comprehensive Audit, Jurisdiction Fix, and Verification Report

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module**: Explainable Crime Risk Assessment Workspace (`/risk`)  
**Methodology Engine**: Production Explainable Scoring (`risk-v2.0`) & Legacy Reference (`risk-v1.0`)  
**Audit Date**: October 27, 2026  
**Auditor**: Advanced Agentic Coding Pair Programmer (DeepMind)  

---

## 1. Executive Summary

This audit report details the full investigation, architectural root cause identification, and resolution of the jurisdictional discrepancy on the **Crime Risk Intelligence** workspace (`/risk`).

### The Identified Defect
Previously, the State / UT selector dropdown on the Risk Assessment page rendered the option:
```html
<option value="">All States (35)</option>
```
This omitted modern administrative jurisdictions. The modern administrative geography of India comprises **36 jurisdictions: 28 States and 8 Union Territories**.

### Core Root Causes
1. **Frontend View Parameter Misalignment**: In `frontend/src/pages/RiskAssessmentPage.tsx`, `loadInitialData()` hardcoded `geographyApi.getStates('historical')` instead of `'current'`.
2. **Census 2011 Historical Definition**: In `backend/app/repositories/geography_repository.py`, the `historical` view filter (`State.id <= 35`) strictly serves Census 2011 jurisdictions, which contained 35 entities (undivided Andhra Pradesh, undivided Jammu & Kashmir, separate Daman & Diu, separate Dadra & Nagar Haveli). Modern jurisdictions—specifically **Telangana** (State ID 36, formed in 2014) and **Ladakh** (UT ID 37, formed in 2019)—were excluded, while **Daman & Diu** (State ID 9, merged in 2020) was counted as active.
3. **Backend District Resolution Gap**: The underlying risk score records (`crime_risk_scores`) are calculated and persisted at the 640 Census 2011 district baseline. The initial implementation in `RiskRepository.list_risk_scores`, `get_district_risk`, and `get_risk_trends` joined directly on `districts.state_id = :sid`. Because Census 2011 districts for Telangana have historical `state_id = 2` (Andhra Pradesh) and Ladakh districts have historical `state_id = 14` (J&K), querying `state_id = 36` or `37` yielded 0 rows.

### Resolution Summary
- **Frontend Active State Loading**: Updated `RiskAssessmentPage.tsx` to call `geographyApi.getStates('current')` and `geographyApi.getDistricts(selectedStateId, 'current')`.
- **Authoritative Labeling**: Updated the dropdown placeholder to display `All States & UTs ({states.length || 36})`.
- **Dual-Layer Geography Resolution**: Integrated `CrimeRepository.resolve_filter_district_ids(db, state_id, district_id, geography_mode="current")` into `RiskRepository.list_risk_scores`, `RiskRepository.get_district_risk`, and `RiskRepository.get_risk_trends`.
- **Modern State Metadata Mapping**: Added SQL `LEFT JOIN` on `district_geography_mapping` in `list_risk_scores`, `get_district_risk`, and `get_overview` to resolve `COALESCE(cs.id, s.id)` and `COALESCE(cs.state_name, s.state_name)`. Telangana districts correctly present as `state_id = 36`, `TELANGANA`, and Ladakh districts as `state_id = 37`, `LADAKH`.
- **Standardized Filter Toolbar**: Standardized the filter bar to single-row responsive horizontal alignment matching `/districts` and `/analytics`.
- **Automated Regression Suite**: Expanded `backend/tests/test_explainable_risk_scoring.py` to 19 tests, including tests for all 36 active jurisdictions, dual-layer district resolution, and honest empty states. All 19 tests pass cleanly.

---

## 2. Jurisdiction Audit & Database Analysis

### 2.1 States Table Schema & Records

The MySQL database `crime_management_db` contains 37 total rows in the `states` table:

| State ID Range | Historical vs Modern Status | `is_active` | Description |
| :--- | :--- | :--- | :--- |
| **1 – 8** | Census 2011 / Modern | `True` | States & UTs 1 through 8 (including merged Dadra & Nagar Haveli and Daman & Diu as ID 8) |
| **9** | Census 2011 Legacy | `False` | DAMAN AND DIU (Merged with Dadra and Nagar Haveli into ID 8 in 2020) |
| **10 – 35** | Census 2011 / Modern | `True` | States & UTs 10 through 35 |
| **36** | Modern State | `True` | TELANGANA (Carved out of Andhra Pradesh in 2014) |
| **37** | Modern Union Territory | `True` | LADAKH (Carved out of Jammu and Kashmir in 2019) |

- **Total Active Jurisdictions (`is_active = True`)**: Exactly 36 (28 States and 8 Union Territories).
- **Census 2011 Panel (`id <= 35`)**: Exactly 35 jurisdictions.

### 2.2 Dual-Layer Geography & District Mapping Architecture

The 640 baseline districts evaluated for risk scores map cleanly to the 36 modern jurisdictions through `district_geography_mapping`:

```
┌────────────────────────────────────────────────────────┐
│               Modern Administrative Layer              │
│       36 Current Jurisdictions (28 States, 8 UTs)       │
│      789 Modern Administrative Districts (LGD Codes)    │
└───────────────────────────▲────────────────────────────┘
                            │
            district_geography_mapping
            (Parent-Child & Cross-State Lineage)
                            │
┌───────────────────────────▼────────────────────────────┐
│             Census 2011 Statistical Baseline           │
│        640 Demographically Standardized Districts       │
│          191,679 Verified Crime Incidents (2020-2025)   │
│             crime_risk_scores Persisted Evaluations     │
└────────────────────────────────────────────────────────┘
```

#### Telangana Lineage
- **Modern State**: TELANGANA (State ID 36)
- **Modern Administrative Districts**: 33 Districts (IDs 641 – 673)
- **Census 2011 Parent Baseline**: 10 Historical Districts:
  - `4`: Adilabad
  - `9`: Hyderabad
  - `10`: Karimnagar
  - `11`: Khammam
  - `14`: Mahbubnagar
  - `15`: Medak
  - `16`: Nalgonda
  - `17`: Nizamabad
  - `19`: Rangareddy
  - `24`: Warangal
- **Resulting Behavior**: Filtering by Telangana (`state_id = 36`) returns all 10 historical districts, displaying `TELANGANA` as the state name and `36` as the state ID.

#### Ladakh Lineage
- **Modern Union Territory**: LADAKH (State ID 37)
- **Modern Administrative Districts**: 2 Districts (Kargil ID 687, Leh ID 688)
- **Census 2011 Parent Baseline**: 2 Historical Districts:
  - `198`: Kargil
  - `203`: Leh(Ladakh)
- **Resulting Behavior**: Filtering by Ladakh (`state_id = 37`) returns both districts with `LADAKH` as the state name and `37` as the state ID.

#### Andhra Pradesh Lineage
- **Modern State**: ANDHRA PRADESH (State ID 2)
- **Census 2011 Historical Districts**: 23 Districts (undivided)
- **Modern Residual Historical Districts**: Exactly 13 Districts (excluding the 10 carved out for Telangana).
- **Resulting Behavior**: Filtering by Andhra Pradesh returns exactly 13 districts, completely segregating modern AP from Telangana.

---

## 3. Explainable Risk Scoring Methodology & Mathematical Formulation

The module operates on **Methodology Version `risk-v2.0`**, enforcing clear separation between historical baseline evaluation and active future forecasting.

### 3.1 Mathematical Formulations

#### A. Forecast Mode (`score_type = 'FORECAST'`)
Used for future planning periods (e.g., November 2026, December 2026, January 2027):

$$\text{Composite Risk} = 0.30 \times P_{\text{forecast}} + 0.20 \times P_{\text{severity}} + 0.30 \times P_{\text{rate}} + 0.20 \times P_{\text{trend}}$$

Where:
1. $P_{\text{forecast}}$: Percentile rank of predicted incident volume from the active production Histogram Gradient Boosting Regressor (`HGBR v1.0`, `model_id = 1`, `forecast_origin_date = 2026-10-01`).
2. $P_{\text{severity}}$: Percentile rank of the official crime-category severity index, weighted by statutory harm:
   - Violent Crime: $1.50$
   - Fire Accident: $1.20$
   - Traffic Fatality: $1.10$
   - Other Crime: $1.00$
3. $P_{\text{rate}}$: Percentile rank of annualized incidents per 100,000 population using Census 2011 baseline:
   $$\text{Rate} = \frac{\text{Predicted Count} \times 12}{\text{Census 2011 Population}} \times 100{,}000$$
4. $P_{\text{trend}}$: Percentile rank of short-term crime momentum across 3-month moving windows with Laplace smoothing:
   $$\text{Trend Ratio} = \min\left( \frac{\text{Volume}_{t-3 \to t}}{\text{Volume}_{t-6 \to t-3} + 1.0},\; 3.0 \right)$$

#### B. Historical Mode (`score_type = 'HISTORICAL'`)
Used for verified historical actuals (e.g., December 2025):

$$\text{Composite Risk} = 0.25 \times P_{\text{volume}} + 0.25 \times P_{\text{severity}} + 0.25 \times P_{\text{rate}} + 0.25 \times P_{\text{trend}}$$

Where:
- $P_{\text{volume}}$: Percentile rank of verified incident volume in the target month from authentic crime incident records.
- No forecast component is used ($P_{\text{forecast}} = \text{null}$).

### 3.2 Percentile Rank Normalization & Tie-Breaking

To prevent distributional distortion and eliminate arbitrary scale compression, raw metrics are mapped to $[0, 100]$ using mid-rank percentile normalization:

$$P_i = \frac{\text{rank}(v_i) - 1.0}{N - 1.0} \times 100.0$$

- **Ties Handling**: Handled via average / mid-rank (`scipy.stats.rankdata(values, method="average")`). If multiple districts share an identical metric value, all receive the exact same average percentile rank.
- **Monotonic Preservation**: Strict ordering is preserved; higher raw hazard strictly produces equal or higher percentile rank.
- **Division-by-Zero Safety**: When $N \le 1$, percentiles safely evaluate to $0.0$.

### 3.3 Risk Band Calibrations

Calculated composite scores ($0.00 \le \text{Score} \le 100.00$) map to four analytical action bands:

| Band | Score Range | Color Token | Strategic Meaning & Operational Action |
| :--- | :--- | :--- | :--- |
| **LOW** | $0.00 \le \text{Score} < 35.00$ | Emerald (`bg-emerald-50`, `text-emerald-700`) | Baseline surveillance; normal patrol scheduling |
| **MODERATE** | $35.00 \le \text{Score} < 50.00$ | Blue (`bg-blue-50`, `text-blue-700`) | Elevated vigilance; standard reserve deployment |
| **HIGH** | $50.00 \le \text{Score} < 65.00$ | Amber (`bg-amber-50`, `text-amber-700`) | Proactive resource reinforcement; tactical crime patrols |
| **CRITICAL** | $65.00 \le \text{Score} \le 100.00$ | Rose (`bg-rose-50`, `text-rose-700`) | Immediate strategic intervention; specialized strike units |

---

## 4. Frontend & Backend Architectural Flow

### 4.1 Filter Toolbar Standardization

The filter bar on `/risk` was upgraded to adhere to the standardized single-row design established across `/districts`, `/analytics`, and `/dashboard`:

```tsx
<div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 rounded-lg border border-[#D9E1EA] bg-white p-3 shadow-2xs">
  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
    {/* State / UT Selector (36 Jurisdictions) */}
    <select id="state-filter" ... className="h-10 ... rounded border border-[#D9E1EA] ...">
      <option value="">All States &amp; UTs ({states.length || 36})</option>
      ...
    </select>

    {/* Cascading District Selector */}
    <select id="district-filter" disabled={!selectedStateId} ... className="h-10 ...">
      <option value="">{selectedStateId ? `All Districts (${districts.length})` : 'Select State First'}</option>
      ...
    </select>

    {/* Risk Band Selector */}
    <select id="risk-level-filter" ... className="h-10 ...">
      <option value="">All Risk Categories</option>
      <option value="CRITICAL">Critical (≥ 65)</option>
      <option value="HIGH">High (50 – 64.99)</option>
      <option value="MODERATE">Moderate (35 – 49.99)</option>
      <option value="LOW">Low (< 35)</option>
    </select>
  </div>

  {/* Dynamic Reset Button */}
  {(selectedStateId || selectedDistrictId || selectedRiskLevel) && (
    <button type="button" onClick={handleResetFilters} className="inline-flex h-10 ... text-[#C53B3B] bg-red-50/80 ...">
      <RotateCcw className="h-3.5 w-3.5" />
      <span>Reset Filters</span>
    </button>
  )}
</div>
```

### 4.2 Cascading & Reset Lifecycle

1. **State Selection**:
   - Updates `selectedStateId`.
   - Automatically resets `selectedDistrictId = undefined`.
   - Triggers `geographyApi.getDistricts(selectedStateId, 'current')`.
   - Resets table page to `currentPage = 1`.
2. **District Selection**:
   - Enabled only when `selectedStateId` is active.
   - Automatically filters table to the selected district.
3. **Reset Action**:
   - Clears `selectedStateId`, `selectedDistrictId`, and `selectedRiskLevel`.
   - Restores the full 640-district national view.
4. **Honest Empty States**:
   - If a filter combination contains no matching districts (or an unassessed jurisdiction), the workspace renders a clean `EmptyState` component (`"No Risk Records Found - No districts match the selected geographic or risk criteria"`). It never hallucinates records or substitutes null metrics with zero.

### 4.3 Explainability Modal / Drawer

Clicking **Explain** on any district record opens the full explainability profile:
- **Composite Risk Score**: High-precision score and assigned action band.
- **Primary Risk Driver**: Dynamically identified factor with the highest weighted point contribution (e.g., `Forecast Incident Volume`, `Per-Capita Incident Rate`, `Severity Profile`, or `Trend Momentum`).
- **Natural Language Narrative**: Human-readable synthesis detailing the exact drivers and operational context.
- **Decomposed Factor Cards**: Showing raw metric value, percentile rank, methodology weight, and weighted points for every component.
- **Provenance Attributes**: Calculation version (`risk-v2.0`), model name (`HistogramGradientBoostingRegressor`), model version (`v1.0.0`), and forecast anchor origin date (`2026-10-01`).

---

## 5. Verification & Test Suite Execution

The backend explainability test suite in `backend/tests/test_explainable_risk_scoring.py` was expanded to verify all 19 functional criteria:

| Test ID | Test Name | Target Behavior | Result |
| :--- | :--- | :--- | :--- |
| `test_01` | Formula Reproducibility | Deterministic mathematical scoring for both historical and forecast modes | **PASS** |
| `test_02` | Score Range [0, 100] | Every overall score and component index bounded strictly in $[0, 100]$ | **PASS** |
| `test_03` | Risk Band Thresholds | Exact threshold validation for LOW (<35), MODERATE (35-50), HIGH (50-65), CRITICAL ($\ge$65) | **PASS** |
| `test_04` | Normalization Edge Cases | Monotonic percentile rank order and mid-rank tie breaking | **PASS** |
| `test_05` | Missing Forecast Handling | Historical score mode strictly suppresses forecast components without error | **PASS** |
| `test_06` | Zero Crime Division-by-Zero | Districts with 0 crimes receive neutral/zero scores safely | **PASS** |
| `test_07` | Unsupported Geography | Demographics validation; invalid district queries return 404 | **PASS** |
| `test_08` | Invalid Period Validation | Malformed period dates safely rejected | **PASS** |
| `test_09` | Historical vs Forecast Separation | Clear separation of forecast indices between historical and forecast records | **PASS** |
| `test_10` | Forecast Model Provenance | Verifies `model_id`, `model_version`, and `forecast_origin_date` | **PASS** |
| `test_11` | Idempotent Upsert | Rerunning risk assessment preserves exact 640 unique records per period | **PASS** |
| `test_12` | Transaction Rollback | Simulated batch failure cleanly rolls back without data pollution | **PASS** |
| `test_13` | RBAC Authorization | `/calculate` requires ANALYST or ADMIN; unauthenticated is 401; OFFICER is 403 | **PASS** |
| `test_14` | Incident Data Integrity | Asserts all 191,679 authentic historical crime records remain untouched | **PASS** |
| `test_15` | All 36 Active Jurisdictions | Confirms exactly 36 active States/UTs returned by `GET /states?view=current` | **PASS** |
| `test_16` | State Filtering for Modern States | Resolves Telangana (36) to 10 districts, Ladakh (37) to 2 districts, AP (2) to 13 districts | **PASS** |
| `test_17` | Dual-Layer District Detail | Modern ID 644 and historical ID 9 both resolve to Hyderabad profile | **PASS** |
| `test_18` | Honest Empty State | Querying non-existent geography returns empty list (`total: 0`) cleanly | **PASS** |
| `test_19` | Modern State Longitudinal Trends | Multi-period trajectory calculations work for modern jurisdictions | **PASS** |

### Execution Command & Result
```bash
python -m unittest backend/tests/test_explainable_risk_scoring.py
```
```
----------------------------------------------------------------------
Ran 19 tests in 4.090s

OK
```

### Full Quality Verifications
- **Frontend Linter (`oxlint`)**: Passed with 0 errors across all 66 files.
- **Frontend TypeScript Build (`tsc -b && vite build`)**: Passed with 0 errors (`✓ built in 2.67s`).
- **Jurisdiction Profile Tests (`test_jurisdiction_profiles.py`)**: Passed all 13 tests.
- **Geography Mode Tests (`test_geography_mode_switch.py`)**: Passed all 7 tests.

---

## 6. Analytical Integrity & Security Checklist

- [x] **Zero Incident Alteration**: Exactly 191,679 historical incident records preserved without modification.
- [x] **Zero Population Alteration**: Census 2011 population records (district demographics) preserved without modification.
- [x] **Genuine 36 Jurisdictions**: No synthetic states were created or hardcoded; active jurisdictions are dynamically derived from `State.is_active == True` (28 states, 8 UTs).
- [x] **Dual-Layer Geographic Integrity**: Modern state IDs (Telangana 36, Ladakh 37) and modern district IDs cleanly map to baseline districts without database foreign-key conflicts.
- [x] **Deterministic Idempotency**: Persistent risk assessments use `ON DUPLICATE KEY UPDATE` anchored by `(district_id, period_year, period_month, calculation_version)`.
- [x] **RBAC Protected**: Score recalculation endpoints require `ADMIN` or `ANALYST` role authorization.
- [x] **Explainability Standard**: Every score provides mathematical breakdown, percentile rank, methodology weight, primary driver identification, and human-readable explanation narrative.

---

## 7. Changed Files Summary

1. `frontend/src/pages/RiskAssessmentPage.tsx`:
   - Switched state fetching to `geographyApi.getStates('current')`.
   - Switched district fetching to `geographyApi.getDistricts(selectedStateId, 'current')`.
   - Standardized single-row horizontal filter toolbar.
   - Added `All States & UTs ({states.length || 36})` option label.
   - Cleared `selectedDistrictId` on state change.
2. `backend/app/repositories/risk_repository.py`:
   - Updated `list_risk_scores`, `get_district_risk`, and `get_risk_trends` to resolve `state_id` and `district_id` through `CrimeRepository.resolve_filter_district_ids(..., geography_mode="current")`.
   - Added `LEFT JOIN` on `district_geography_mapping` in `list_risk_scores`, `get_district_risk`, and `get_overview` to resolve modern state metadata for Telangana and Ladakh.
3. `backend/app/api/v1/risk.py`:
   - Made `calculation_version: Optional[str] = Query(None)` to prevent defaulting to mismatched calculation versions when omitted.
4. `backend/app/services/risk_service.py`:
   - Updated `CALCULATION_VERSION = "risk-v2.0"`.
5. `backend/tests/test_explainable_risk_scoring.py`:
   - Added tests 15 through 19 covering 36 jurisdictions, modern state filters, dual-layer district lookup, empty states, and trends.
6. `docs/risk_assessment_audit_report.md`:
   - Created this comprehensive audit report.
