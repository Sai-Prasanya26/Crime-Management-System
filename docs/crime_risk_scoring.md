# Explainable Crime Risk Scoring Engine (risk-v2.0)

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module:** Risk Intelligence Engine  
**Version:** `risk-v2.0` (with full legacy compatibility for `risk-v1.0`)  
**Status:** Production  
**Date:** October 2026  

---

> [!IMPORTANT]
> **Mandatory Analytical Disclaimer:**  
> The crime risk scores produced by this engine are relative statistical planning indicators designed solely to assist law enforcement administrators in operational readiness, logistical planning, and multi-district resource allocation.  
> - A risk score is **NOT** an individual person's risk score.  
> - A risk score is **NOT** a guarantee, confirmation, or deterministic forecast that a crime will occur at any specific venue or time.  
> - Risk levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) are heuristic administrative priority tiers and are **NOT** official statutory classifications or legal designations.

---

## 1. Risk Score Objective

The primary objective of the Explainable Crime Risk Scoring Engine is to provide an objective, reproducible, and fully interpretable quantitative metric on a continuous scale of $[0, 100]$ representing the relative operational crime hazard of a given administrative district during a specified calendar month.

In earlier phases, crude volume or population numbers failed to account for severity differences (e.g. homicide vs vandalism) or short-term momentum (rapid surges vs steady rates). Phase 9 unifies historical incident observations, official severity weights from crime classification standards, demographic baselines, and validated machine learning forecasts (Phase 8B) into an interpretable 4-component index.

---

## 2. Mathematical Formulations & Component Weights

To avoid double-counting correlated measures (such as raw historical incident volume and forward predicted volume), the engine operates in two strictly separated operational modes:

### Mode 1: Historical Evaluation Mode (`score_type = 'HISTORICAL'`)
Used for retrospective audit, historical evaluation, and empirical monitoring across past months (2020–2025):

$$\text{Risk}_{\text{HISTORICAL}} = 0.25 \cdot I_{\text{vol}} + 0.25 \cdot I_{\text{sev}} + 0.25 \cdot I_{\text{rate}} + 0.25 \cdot I_{\text{trend}}$$

Where:
- $I_{\text{vol}}$: Observed Incident Volume Percentile ($25\%$ weight)
- $I_{\text{sev}}$: Crime Severity Profile Percentile ($25\%$ weight)
- $I_{\text{rate}}$: Per-Capita Crime Rate Percentile ($25\%$ weight)
- $I_{\text{trend}}$: Trailing Trend Momentum Percentile ($25\%$ weight)

$$\sum w_i = 0.25 + 0.25 + 0.25 + 0.25 = 1.00$$

### Mode 2: Future Operational Forecast Mode (`score_type = 'FORECAST'`)
Used for forward operational planning horizons (e.g. November 2026 – January 2027) where active Phase 8B `CURRENT_FUTURE_FORECAST` machine learning outputs exist:

$$\text{Risk}_{\text{FORECAST}} = 0.30 \cdot I_{\text{fc}} + 0.20 \cdot I_{\text{sev}} + 0.30 \cdot I_{\text{rate}} + 0.20 \cdot I_{\text{trend}}$$

Where:
- $I_{\text{fc}}$: Machine Learning Forecast Volume Percentile ($30\%$ weight)
- $I_{\text{sev}}$: Baseline Crime Severity Profile Percentile ($20\%$ weight)
- $I_{\text{rate}}$: Projected Per-Capita Rate Percentile ($30\%$ weight)
- $I_{\text{trend}}$: Trailing Trend Momentum Percentile ($20\%$ weight)

$$\sum w_i = 0.30 + 0.20 + 0.30 + 0.20 = 1.00$$

*(Note: In forecast mode, historical raw volume is not double-counted alongside predicted volume. Forward workload projections drive volume and rate, while historical observations establish severity and trend context).*

### Legacy Compatibility (`calculation_version = 'risk-v1.0'`)
Preserved for audit consistency and existing tests:

$$\text{Risk}_{\text{v1.0}} = 0.30 \cdot I_{\text{fc}} + 0.20 \cdot I_{\text{vol}} + 0.30 \cdot I_{\text{rate}} + 0.20 \cdot I_{\text{trend}}$$

---

## 3. Component Definitions & Data Provenance

| Component | Code Identifier | Mathematical Metric | Data Source | Provenance & Rules |
|---|---|---|---|---|
| **Crime Volume Index** | `volume_index` / `forecast_index` | $C_d$ (Observed) or $\hat{y}_d$ (Forecast) | `crime_incidents` (HISTORICAL) or `crime_predictions` (FORECAST) | In FORECAST mode, requires `forecast_status = 'CURRENT_FUTURE_FORECAST'` and `is_latest = 1` from active model `production_hgbr_v1`. |
| **Severity Index** | `severity_index` | $\bar{w}_d = \frac{\sum_{i \in d} w_i}{N_d}$ | Official weights in `crime_categories.severity_weight` | Uses documented category weights: Violent Crime ($1.50$), Fire Accident ($1.20$), Traffic Fatality ($1.10$), Other Crime ($1.00$). Neutral default is $1.00$ for $0$ incidents. |
| **Trend Index** | `trend_index` | $\tau_d = \min\left(\frac{C_{\text{recent}}(d)}{C_{\text{prior}}(d) + 1.0}, 3.0\right)$ | Trailing 3M vs Prior 3M windows in `crime_incidents` | Laplace $+1.0$ smoothing eliminates division-by-zero; capped at $3.0$ to prevent outlier distortion. |
| **Population Rate Index** | `rate_index` / `population_density_factor` | $\rho_d = \frac{\text{Volume}_d}{P_{2011}(d)} \times 100{,}000$ | `district_demographics` (Census 2011 baseline) | Per-capita annualized rate per 100,000 residents. Demographics are explicitly labeled as Census 2011 baseline, never current population. Land area is not assumed. |

---

## 4. Normalization Methodology

To prevent extreme outliers in a handful of high-density metropolitan districts from compressing the entire national scale, components are normalized using **Mid-Rank Percentile Ranking**:

$$\text{rank}_{\text{pct}}(x_d) = \frac{\text{mid-rank}(x_d) - 1}{N - 1} \times 100$$

### Normalization Properties:
1. **Strict Range Invariant:** $\text{rank}_{\text{pct}}(x_d) \in [0.00, 100.00]$ for all districts.
2. **Deterministic Tie Handling:** Equal values receive the average mid-rank, ensuring identical scores for identical observations.
3. **Monotonic Order Preservation:** If $x_a > x_b$, then $\text{rank}_{\text{pct}}(x_a) > \text{rank}_{\text{pct}}(x_b)$.
4. **Uniform Population Baseline:** Ranking is computed across all 640 historical Census 2011 districts simultaneously.
5. **No Single-Outlier Skew:** A district with 500 incidents does not force a district with 50 incidents to 0.01; both receive appropriate relative percentile ranks.

---

## 5. Weights and Rationale

| Mode | Factor | Weight | Rationale |
|---|---|:---:|---|
| **HISTORICAL** | Volume Index | $25\%$ | Reflects the absolute incident load managed by district police stations. |
| | Severity Index | $25\%$ | Distinguishes between property crime and high-harm offenses (homicides, violent crimes). |
| | Population Rate | $25\%$ | Balances sheer volume against per-capita burden, highlighting smaller districts with disproportionate crime frequency. |
| | Trend Momentum | $25\%$ | Identifies emerging surges versus cooling operational sectors. |
| **FORECAST** | Forecast Volume | $30\%$ | Primary forward-looking indicator from validated production machine learning pipeline. |
| | Severity Index | $20\%$ | Contextualizes projected count with historical crime severity profile of the jurisdiction. |
| | Projected Rate | $30\%$ | Evaluates projected demand relative to baseline population scale without double-counting volume. |
| | Trend Momentum | $20\%$ | Reflects momentum entering the forecast horizon. |

---

## 6. Calibrated Risk Bands & Administrative Action

The continuous $[0, 100]$ score is mapped into 4 administrative priority tiers:

```
[0.00] ──────── LOW ──────── (35.00) ────── MODERATE ────── (50.00) ────── HIGH ────── (65.00) ────── CRITICAL ────── [100.00]
```

| Risk Level | Score Range | Distribution (National) | Operational Guidance |
|---|:---:|:---:|---|
| `LOW` | $[0.00, 35.00)$ | Lowest ~20% of districts | Baseline routine patrol; standard preventative readiness. |
| `MODERATE` | $[35.00, 50.00)$ | Middle ~35% of districts | Typical caseload; normal station staffing and routine maintenance. |
| `HIGH` | $[50.00, 65.00)$ | Upper ~35% of districts | Elevated severity or rising volume; enhanced targeted patrols and supervisory oversight. |
| `CRITICAL` | $[65.00, 100.00]$ | Top ~10–15% of districts | Maximum relative threat; priority for specialized units, inter-district reinforcement, and emergency equipment. |

---

## 7. Missing-Data & Edge-Case Policy

1. **Zero Incident Counts:** If a district records zero incidents in a window:
   - Volume count $= 0 \implies \text{percentile} \ge 0.0$ (mid-rank among zero-count districts).
   - Severity defaults to baseline neutral weight ($1.00$).
   - Trend ratio with Laplace smoothing evaluates cleanly to $0 / (C_{\text{prior}} + 1.0) = 0.0$.
2. **Missing Demographic Records:** If a district lacks positive Census 2011 population ($P \le 0$ or null), calculation halts with an explicit `HTTP 500` error. The engine strictly refuses to invent population figures.
3. **Missing Forecasts:** In `FORECAST` mode, if any district lacks an active production prediction for the target date, execution terminates safely with an `HTTP 400` error detailing missing districts. No synthetic forecast is ever generated.
4. **Unsupported Dates / Periods:** Dates must follow the strict `YYYY-MM-DD` ISO format. Invalid strings trigger immediate `HTTP 400 Bad Request`.

---

## 8. Separation of Historical vs Forecast Scores

Historical risk assessments and forward forecasts are strictly segregated:
- **`score_type = 'HISTORICAL'`**:
  - `forecast_index`: `NULL`
  - `model_id` / `model_version`: `NULL`
  - `forecast_origin_date`: `NULL`
  - Explanation explicitly identifies data source as verified crime incidents.
- **`score_type = 'FORECAST'`**:
  - `forecast_index`: populated with normalized prediction percentile.
  - `model_id`: links to active model in `ml_models` (e.g. ID 1).
  - `model_version`: `'v1.0.0'`.
  - `forecast_origin_date`: e.g. `'2026-10-01'`.
  - Explanation explicitly names the ML model, version, and forecast anchor date.

---

## 9. Database & API Changes

### Database Schema Extensions (`crime_risk_scores`):
```sql
ALTER TABLE crime_risk_scores
    ADD COLUMN score_type ENUM('HISTORICAL', 'FORECAST') NOT NULL DEFAULT 'FORECAST',
    ADD COLUMN forecast_origin_date DATE NULL,
    ADD COLUMN explanation_summary TEXT NULL;

CREATE INDEX idx_risk_score_type ON crime_risk_scores (score_type, period_year, period_month);
```

### Verified Score Counts in MySQL:
```text
Total Crime Risk Scores: 3,200 records (640 districts × 5 distinct evaluation periods)
  ├── 2025-12-01:   640 records (score_type = 'HISTORICAL', version = 'risk-v2.0')
  ├── 2026-01-01:   640 records (score_type = 'FORECAST',   version = 'risk-v1.0' legacy)
  ├── 2026-11-01:   640 records (score_type = 'FORECAST',   version = 'risk-v2.0' active forward)
  ├── 2026-12-01:   640 records (score_type = 'FORECAST',   version = 'risk-v2.0' active forward)
  └── 2027-01-01:   640 records (score_type = 'FORECAST',   version = 'risk-v2.0' active forward)
```

### API Endpoints:
- `GET /api/v1/risk/overview`: Overview summary, risk level distribution, and top critical districts with score_type and period filtering.
- `GET /api/v1/risk/districts` & `GET /api/v1/risk`: Paginated district registry with state, district, risk level, score type, and period filtering.
- `GET /api/v1/risk/districts/{district_id}` & `GET /api/v1/risk/{district_id}`: Full explainable detail profile with component breakdowns and synthesized plain-language narrative.
- `GET /api/v1/risk/trends`: Multi-period longitudinal risk trajectory tracking average threat scores and critical district counts over time.
- `GET /api/v1/risk/model`: Formal methodology metadata, weights, and model provenance.
- `POST /api/v1/risk/calculate`: Admin/Analyst protected endpoint to compute and persist risk scores atomically inside a transaction.

---

## 10. Verification & Test Suite Results

### Phase 9 Test Suite (`backend/tests/test_explainable_risk_scoring.py`):
All 14 tests passed (`OK`):
1. `test_01_formula_reproducibility`: Deterministic mathematical outputs for Historical ($65.0$) and Forecast ($70.0$) vectors.
2. `test_02_score_range_0_to_100`: All scores and component indices strictly in $[0, 100]$.
3. `test_03_risk_band_assignment`: Low, Moderate, High, Critical boundary thresholds confirmed.
4. `test_04_normalization_edge_cases`: Uniform arrays yield $50.0$; mid-rank ties handled correctly.
5. `test_05_missing_component_handling`: Historical records strictly enforce `NULL` forecast index.
6. `test_06_zero_crime_counts`: Zero counts evaluate cleanly without division-by-zero.
7. `test_07_unsupported_geography`: Demographics strictly positive; unknown district ID returns `404`.
8. `test_08_invalid_periods`: Rejects malformed dates with `400 Bad Request`.
9. `test_09_historical_versus_future_forecast_separation`: 640 historical and 1,920 forecast records strictly segregated.
10. `test_10_forecast_model_provenance`: Verifies model ID 1, version `v1.0.0`, and origin `2026-10-01`.
11. `test_11_duplicate_score_prevention`: Idempotent re-run leaves record count at exactly 640.
12. `test_12_database_transaction_rollback`: Corrupt record rolled back safely without polluting MySQL.
13. `test_13_api_authorization`: `/calculate` endpoint enforces RBAC (Admin 200, Officer 403, Unauth 401).
14. `test_14_historical_incident_integrity`: Verifies all 191,679 historical crime incidents remain strictly untouched.

### Full Regression Suite:
```text
Ran 128 tests in 49.119s
OK
```
All existing authentication, district, state, resource management, risk assessment, and prediction tests pass without regression.

### Frontend Production Build & Lint:
```text
vite v8.3.1 building client environment for production...
✓ 2568 modules transformed.
dist/index.html                     1.03 kB │ gzip:   0.54 kB
dist/assets/index-DTgSATpb.css     71.78 kB │ gzip:  12.76 kB
dist/assets/index-DcVlZOLa.js   1,135.71 kB │ gzip: 294.81 kB
✓ built in 7.58s
```
Linting: `0 errors, 25 warnings`.

---

## 11. Limitations & Appropriate Interpretation

1. **Relative vs Absolute Risk:** Percentile ranks measure a district's risk *relative to all 640 Indian districts* during the evaluated timeframe. A score of 50 does not mean a 50% probability of crime; it signifies that the district sits at the national median across weighted components.
2. **Census 2011 Baseline:** Demographic rates use official Census 2011 population as a fixed historical baseline. Substantial real-world population growth since 2011 means per-capita rates reflect relative historical burdens rather than real-time per-capita rates.
3. **Macro-Level Geography:** Risk scores evaluate aggregate administrative districts. Micro-hotspots (specific neighborhoods, intersections, or police beats) are not modeled.
4. **Non-Causal Interpretation:** Scores quantify observed and projected caseloads. They do not model root socio-economic causality and must never be cited as causal explanations for crime.
