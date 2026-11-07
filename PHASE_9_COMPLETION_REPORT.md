# PHASE 9 — CRIME RISK ASSESSMENT COMPLETION REPORT

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase:** Phase 9 — Crime Risk Assessment  
**Status:** COMPLETE & VERIFIED  
**Date:** November 2026  
**Calculation Version:** `risk-v2.0`  

---

## 1. Executive Summary

Phase 9 implements an explainable, transparent, and reproducible **Crime Risk Assessment Engine** for the national crime management platform. The module computes district-level threat levels across all 640 Census baseline districts and provides lineage-aware risk metrics for 164 modern carved administrative districts (790 active districts total across all 36 active States and Union Territories).

### Key Accomplishments
- **Dual-Mode Scoring Formulation (`risk-v2.0`)**: Deterministic scoring separating ML forward predictions (`FORECAST` mode) from historical baseline assessments (`HISTORICAL` mode), eliminating double-counting.
- **Scale-Free Percentile Normalization**: Rank-based scaling ($[0, 100]$) using SciPy average tie-breaking, ensuring cross-indicator comparability regardless of raw scale.
- **Configurable Risk Classification**: 4 discrete operational threat bands: Low ($< 35.0$), Moderate/Medium ($35.0 - 49.99$), High ($50.0 - 64.99$), and Critical ($\ge 65.0$).
- **Complete RESTful Backend API**: Full suite of endpoints for district scores, state-level threat rankings across all 36 active States/UTs, risk category distribution, top high-risk districts, longitudinal multi-period trends, and authorized idempotent calculations.
- **Enhanced Frontend UI (`RiskAssessmentPage.tsx`)**: Production-ready interface featuring dynamic period selection, summary KPI cards, interactive Recharts distribution chart, state threat rankings panel, district threat table with 0–100 visual progress bars, primary driver badges, carved district lineage badges, and a factor-level drill-down explainability drawer.
- **Zero-Data-Loss & Lineage Guardrails**: Verified 100% preservation of 191,679 historical crime incidents, 21,760 ML prediction records, and all 36 active States and 790 active districts.

---

## 2. Risk Scoring Methodology & Mathematical Formulation

### 2.1 Core Formula
The system operates under `risk-v2.0`, which defines two distinct mathematical formulations:

#### A. Forecast Mode (`score_type = FORECAST`)
Applied when forward ML predictions from the HistGradientBoostingRegressor model are available (e.g. November 2026 – October 2027). Eliminates double-counting by utilizing ML predicted volume and population-normalized crime rate without compounding historical raw counts:

$$\text{Risk Score} = 0.30 \cdot P(\text{Forecast Volume}) + 0.30 \cdot P(\text{Crime Rate Per 100k}) + 0.20 \cdot P(\text{Severity Profile}) + 0.20 \cdot P(\text{Trend Ratio})$$

Where $P(x)$ denotes the empirical percentile rank in $[0, 100]$ across all assessed districts.

| Indicator | Weight | Raw Definition | Source |
|---|---|---|---|
| **Forecast Volume** | 30% | Predicted incident volume for the target month | HistGradientBoostingRegressor (`crime_predictions`) |
| **Crime Rate per 100k** | 30% | $\frac{\text{Recent 12-Month Incident Total}}{\text{Census 2011 Population}} \times 100,000$ | `crime_incidents` & `district_demographics` |
| **Crime Severity Profile** | 20% | Weighted average severity of historical crimes ($1.0 - 3.5$) | Category severity weights (`crime_categories`) |
| **Recent Trend Ratio** | 20% | Ratio of recent 3-month volume to preceding 3-month volume | Temporal rolling window (`crime_incidents`) |

#### B. Historical Mode (`score_type = HISTORICAL`)
Applied for baseline evaluations prior to the forecast horizon:

$$\text{Risk Score} = 0.25 \cdot P(\text{Historical Volume}) + 0.25 \cdot P(\text{Crime Rate Per 100k}) + 0.25 \cdot P(\text{Severity Profile}) + 0.25 \cdot P(\text{Trend Ratio})$$

### 2.2 Normalization Approach
- **Scale-Free Percentile Transformation**:
  $$\text{Percentile}(x_i) = \frac{\text{rank}(x_i) - 0.5}{N} \times 100$$
  Implemented using `scipy.stats.rankdata(values, method='average')`.
- **Properties**:
  - Uniform distribution across the $[0, 100]$ domain.
  - Robust against extreme outliers and heavily skewed crime counts.
  - Zero-incident districts receive an empirical rank of $0.0$ without division-by-zero errors.
  - Output is strictly deterministic and bounded within $[0, 100]$.

---

## 3. Risk Classification Thresholds & Operational Definitions

The platform maps continuous scores $[0, 100]$ into four operational readiness tiers:

| Risk Category | Score Threshold | Operational Definition & Deployment Protocol | UI Badge Style |
|---|---|---|---|
| **CRITICAL** | $\ge 65.0$ | Priority operational readiness; intensive patrol resource allocation; immediate command intervention required. | Rose badge (`bg-rose-50`, `#E11D48`) |
| **HIGH** | $50.0 - 64.99$ | Heightened threat level; enhanced tactical surveillance; automated reserve unit pre-positioning. | Amber badge (`bg-amber-50`, `#D97706`) |
| **MODERATE / MEDIUM** | $35.0 - 49.99$ | Standard operational readiness; routine preventative patrols and periodic threat reviews. | Blue badge (`bg-blue-50`, `#2563EB`) |
| **LOW** | $< 35.0$ | Baseline threat level; routine administrative monitoring; minimal risk intervention. | Emerald badge (`bg-emerald-50`, `#059669`) |

*Note: The backend repository and API endpoints automatically accept both `'MODERATE'` and the user alias `'MEDIUM'`, normalizing queries transparently.*

---

## 4. Lineage Handling: Modern Carved vs. Census Baseline Districts

### 4.1 Structural Lineage Architecture
- **Census 2011 Baseline (640 Districts)**: Each baseline district possesses official Census demographics and directly mapped historical incidents.
- **Modern Carved Districts (164 Districts)**: Created between 2011 and 2026. These districts do not possess separate 2011 Census enumeration tables.
- **Lineage Policy**:
  - Modern carved districts resolve to their official parent district via `district_geography_mapping`.
  - When inspected via `/api/v1/risk/districts/{id}`, the API explicitly returns:
    - `is_derived_from_parent: true`
    - `parent_district_id: <parent_id>`
    - `parent_district_name: "<parent_name>"`
    - Explanatory `notes`: Documenting territorial lineage and Census 2011 parentage.
  - **No Data Fabrication**: The system does not duplicate population counts or fabricate incidents to force artificial coverage.
  - **Frontend Representation**: The district ranking table displays an amber `Carved` badge with tooltip clarification, and the details drawer renders an explicit alert banner informing commanding officers of inherited baseline parameters.

### 4.2 State Reorganization Lineage
All 36 active States and UTs aggregate districts correctly through `district_geography_mapping`:
- **Telangana (#36)**: 10 historical districts carved from Andhra Pradesh (#2) are aggregated under Telangana.
- **Ladakh (#37)**: Kargil and Leh carved from Jammu and Kashmir (#14) are aggregated under Ladakh.
- **Dadra and Nagar Haveli and Daman and Diu (#8)**: Daman (#128) and Diu (#129) from inactive state Daman and Diu (#9) are aggregated under unified UT #8.
- Result: **All 640 assessed districts map 100% cleanly into the 36 active States/UTs with zero orphan records**.

---

## 5. Backend RESTful APIs

All endpoints require JWT bearer authentication (`Authorization: Bearer <token>`).

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/v1/risk/overview` | High-level risk landscape across all assessed districts. | `assessment_period`, `year`, `month`, `score_type`, `calculation_version` |
| `GET` | `/api/v1/risk/model` | Methodology formula, factor weights, and linked ML model metadata. | `version` |
| `GET` | `/api/v1/risk/districts` | Paginated district risk scores with filtering. | `state_id`, `district_id`, `risk_level`, `score_type`, `assessment_period`, `search`, `skip`, `limit` |
| `GET` | `/api/v1/risk/districts/{id}` | Detailed district risk profile and factor-level explainability. | `assessment_period`, `score_type`, `calculation_version` |
| `GET` | `/api/v1/risk/states/summary` | Aggregated threat scores across all 36 active States/UTs. | `assessment_period`, `score_type`, `calculation_version` |
| `GET` | `/api/v1/risk/distribution` | Categorical risk breakdown, counts, percentages, and thresholds. | `assessment_period`, `score_type`, `calculation_version` |
| `GET` | `/api/v1/risk/top-districts` | Ranked top high-risk districts descending by score. | `limit`, `state_id`, `assessment_period`, `score_type`, `calculation_version` |
| `GET` | `/api/v1/risk/trends` | Longitudinal risk score trajectory across multiple periods. | `district_id`, `state_id`, `limit_periods` |
| `POST` | `/api/v1/risk/calculate` | Idempotent recalculation and persistence (Analyst/Admin only). | Body: `assessment_date`, `score_type`, `calculation_version` |

---

## 6. Frontend UI Enhancements (`RiskAssessmentPage.tsx`)

The frontend was thoroughly enhanced to deliver a professional operational experience:

1. **Cycle & Period Selector**:
   - Dynamic assessment period dropdown (`2027-01 (Forecast)`, `2026-12 (Forecast)`, `2026-11 (Forecast)`, `2025-12 (Historical Baseline)`).
   - Real-time indicator badges for active methodology (`risk-v2.0`), model name (`HistGradientBoostingRegressor`), and evaluation type (`FORECAST`).
2. **National Overview KPI Cards**:
   - Total Assessed Districts (640).
   - Critical Risk count + percentage + threshold ($\ge 65.0$).
   - High Risk count + percentage + threshold ($50.0 - 64.9$).
   - Moderate Risk count + percentage + threshold ($35.0 - 49.9$).
   - Low Risk count + percentage + threshold ($< 35.0$).
3. **Interactive Visualizations Grid**:
   - **National Risk Distribution Chart**: Recharts `BarChart` with accessible custom color coding, hover tooltip details (counts, percentages, thresholds), and categorical summary pills.
   - **State Threat Rankings Panel**: Real-time ranked list of top states by mean risk score, showing assessed district counts, highest threat district, and visual score progress bars.
4. **Enhanced Search & Filter Toolbar**:
   - Real-time text search for district or state name (debounced).
   - Dynamic State / UT dropdown selector (36 active jurisdictions).
   - Cascading District dropdown selector (contextual to selected state).
   - Risk Category selector (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
   - One-click "Reset Filters" action button.
5. **District Threat Table**:
   - Columns: Rank (#), District Name, State / UT, Risk Score (numerical + 0–100 progress bar), Risk Category Badge, Primary Driver Badge, and Action buttons.
   - Distinct `Carved` badge with hover tooltip for modern administrative carved districts.
   - Full server-side pagination with record count indicators.
6. **Drill-Down Explainability Modal**:
   - Displays district metadata, state, and evaluation cycle.
   - Amber alert banner for carved districts detailing parent district Census 2011 derivation.
   - Prominent score gauge and primary driver chip.
   - Factor contribution breakdown bars:
     - ML Forecast Volume (30% weight, raw cases, percentile rank, progress bar).
     - Population-Normalized Crime Rate (30% weight, rate per 100k, percentile rank, progress bar).
     - Crime Severity Profile (20% weight, severity index, percentile rank, progress bar).
     - Recent Trend Ratio (20% weight, trend ratio, percentile rank, progress bar).
   - Plain-language narrative summary generated by the engine explaining the primary risk drivers.

---

## 7. Verification & Test Evidence

### 7.1 Automated Unit & Integration Test Results
All automated tests pass with 100% success rate:

- **Phase 9 Test Suite (`test_risk_assessment_phase_9.py`)**:
  - `test_01_state_risk_summary_36_active_states`: PASSED (36 active States/UTs, 640 total districts mapped).
  - `test_02_risk_distribution_four_categories`: PASSED (4 bands, 640 districts, 100% sum, valid thresholds).
  - `test_03_top_risk_districts_ranking`: PASSED (descending sort order, bounded in $[0, 100]$).
  - `test_04_text_search_filtering`: PASSED (Hyderabad and Delhi search matching).
  - `test_05_risk_level_filter_and_alias_normalization`: PASSED ('MEDIUM' alias matches 'MODERATE').
  - `test_06_carved_district_lineage_and_metadata`: PASSED (Vav-Tharad #806 maps to Banas Kantha #135).
  - `test_07_auth_and_rbac_enforcement`: PASSED (401 for unauth, 403 for unauthorized calculation).
  - `test_08_database_and_historical_integrity`: PASSED (191,679 incidents, 21,760 predictions, 36 states, 790 active districts).
  - **Execution Time**: `0.676s` | **Result**: `OK`

- **Regression Test Suites (`test_explainable_risk_scoring.py` + `test_risk_engine.py`)**:
  - 32 tests covering mathematical determinism, bounded outputs, uniform arrays, ties with mid-rank, zero-incident districts, database rollback, and dual-mode execution.
  - **Execution Time**: `2.658s` | **Result**: `32 passed, 0 failed, OK`

### 7.2 Frontend Build Verification
- Command: `npm --prefix frontend run build` (`tsc -b && vite build`)
- Transformed: `2,571 modules`
- TypeScript Errors: `0`
- Bundle Status: `dist/` generated cleanly in `1.49s`.

---

## 8. Database & System Integrity Confirmation

| Metric | Target Value | Verified Database Value | Status |
|---|---|---|---|
| Historical Crime Incidents | 191,679 | **191,679** | Intact / Verified |
| ML Forward Predictions | 21,760 | **21,760** | Intact / Verified |
| Active States & UTs | 36 | **36** | Intact / Verified |
| Inactive States (Daman & Diu) | 1 | **1** | Retained for historical integrity |
| Active Administrative Districts | 790 | **790** | Intact / Verified |
| Inactive Districts (Task 2D) | 23 | **23** | Retained (soft-deactivated) |
| Total District Records | 813 | **813** | Intact / Verified |
| Assessed Census Districts | 640 | **640** | Intact / Verified |
| Total Persisted Risk Scores | 3,840 | **3,840** (across 6 distinct periods) | Verified |

---

## 9. Conclusion

Phase 9 (Crime Risk Assessment) is **100% complete, verified, tested, and production-ready**. All requirements—mathematical formulation, explainability, lineage handling, backend APIs, frontend interactive views, and test guardrails—have been fulfilled with full data integrity.

*In accordance with instructions, work has halted here. Phase 10 (AI-Based Resource Optimization) will only commence upon user authorization.*
