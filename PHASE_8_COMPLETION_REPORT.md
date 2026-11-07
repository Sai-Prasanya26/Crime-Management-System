# Phase 8 — Machine Learning Crime Prediction: Completion & Verification Report

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module**: Machine Learning Crime Prediction & Uncertainty Quantification  
**Status**: Completed & Verified  
**Date**: November 2026  
**Active Database**: `crime_management_db` (MySQL)  

---

## 1. Executive Summary

Phase 8 implements, audits, validates, and integrates the **Machine Learning Crime Prediction** subsystem of the Data-Driven Crime Management System. The primary operational objective is to provide high-precision, temporally consistent monthly crime forecasts across all Indian administrative districts, coupled with rigorous split-conformal uncertainty intervals, multi-level compositional breakdowns (4 categories and 21 crime types), and full executive frontend visibility.

### Key Milestones & Production Parameters
- **Production Forecasting Model**: `HistGradientBoostingRegressor` (Version `v1.0.0`, Model ID: 1).
- **Out-of-Sample Test Performance (Test 2025, 7,680 Observations)**:
  - **Mean Absolute Error (MAE)**: **1.6956** crimes/month (25.03% error reduction relative to Seasonal Naïve baseline).
  - **Root Mean Squared Error (RMSE)**: **2.2465**.
  - **Weighted Absolute Percentage Error (WAPE)**: **36.84%** (12.29 percentage-point improvement over Seasonal Naïve).
  - **Coefficient of Determination ($R^2$)**: **0.6063** (vs. 0.2899 baseline).
- **Uncertainty Quantification**: Split Conformal Prediction calibrated on 2024 residuals ($n = 7,680$), yielding **79.74% empirical coverage** against the 80.0% nominal target on the unseen 2025 test set.
- **Operational Forecasting Horizon**: 12 forward months (**2026-11-01 to 2027-10-01**), covering 640 core Census district baselines and modern carved administrative districts via verified lineage mappings.
- **Database Records**:
  - `crime_incidents`: Exactly **191,679** confirmed historical records (completely unchanged; zero data leakage or overwrites).
  - `crime_predictions`: Exactly **21,760** prediction records across 34 periods (7,680 historical evaluation, 6,400 past forecast, 7,680 current future forecast).
  - `states`: **36** active states/UTs (verified under Task 2D).
  - `districts`: **790** active administrative districts (verified under Task 2D).

---

## 2. Audit of Existing Functionality vs Completed Enhancements

| Component | Status Before Phase 8 | Phase 8 Action & Enhancement | Verification Method |
| :--- | :--- | :--- | :--- |
| **Feature Engineering Panel** | Parquet file exists (`panel_features_2020_2025.parquet`) with 46,080 rows. | Audited all 25 predictor columns; confirmed 2020 warmup dropping (7,680 rows) and strict chronological alignment. | Parquet inspection & `test_crime_prediction_pipeline.py` |
| **Model Registry (`ml_models`)** | 1 active model record (`v1.0.0`, HGBR). | Re-benchmarked against 4 candidate models; verified metadata persistence and out-of-sample metrics. | Database query & `/predictions/evaluation` endpoint |
| **Prediction Storage (`crime_predictions`)** | 21,760 rows present. | Verified horizon step indexing (1–12), status partitioning, and conformal bounds (`[lower, upper]`). | SQL validation & database integrity tests |
| **Backend API (`/predictions/overview`)** | Returned top 5 districts; partial horizon metadata. | Enhanced repository to return top 10 projected districts with conformal intervals and horizon boundaries. | Automated test `test_01_predictions_overview` |
| **Backend API (`/predictions/evaluation`)** | Static evaluation data. | Verified 5-model comparative benchmark, 3-fold walk-forward cross-validation, and conformal empirical calibration stats. | Automated test `test_02_model_evaluation_benchmarks` |
| **Frontend Predictions Page (`PredictionsPage.tsx`)** | Missing model benchmark comparison table and overview district forecast ranking table. | Added top KPI summary bar, expandable 5-model evaluation comparison matrix, and full district forecast comparison table with conformal bounds. | Production Vite build (`tsc -b && vite build`) |

---

## 3. Training Dataset Preparation & Feature Engineering

### 3.1 Dataset Aggregation & Leakage Prevention
Historical monthly crime incident aggregations were derived from the `crime_incidents` table (191,679 records) mapped across 640 Census 2011 district profiles.
- **Total Aggregated Grid**: 640 districts $\times$ 72 calendar months (2020-01 to 2025-12) = **46,080 observations**.
- **Warmup Dropping**: Calendar year 2020 (7,680 rows) is dropped from model training to guarantee that all autoregressive lags (up to `lag_12`) and rolling window features (up to 12 months) are populated exclusively with true historical observations rather than imputed zeros.
- **Effective Modeling Dataset**: **38,400 clean observations** (2021-01 to 2025-12).

### 3.2 Chronological Partitioning
Strict chronological time-based splitting is enforced to prevent future-to-past data leakage:
1. **Training Set (2021-01 to 2023-12)**: 36 months $\times$ 640 districts = **23,040 observations**.
2. **Validation / Calibration Set (2024-01 to 2024-12)**: 12 months $\times$ 640 districts = **7,680 observations** (used for hyperparameter selection and split-conformal residual calibration).
3. **Out-of-Sample Test Set (2025-01 to 2025-12)**: 12 months $\times$ 640 districts = **7,680 observations** (held out untouched for final generalized performance evaluation).

### 3.3 Feature Dictionary (25 Predictors)
Every feature is computed using information available strictly prior to the forecast horizon:
1. **Autoregressive Lags (4 features)**:
   - `incident_count_lag_1`: Incidents in month $t-1$.
   - `incident_count_lag_2`: Incidents in month $t-2$.
   - `incident_count_lag_3`: Incidents in month $t-3$.
   - `incident_count_lag_12`: Seasonal lag in month $t-12$ (same month prior year).
2. **Rolling Window Statistics (4 features)**:
   - `incident_count_roll_mean_3`: 3-month trailing moving average (shifted by 1).
   - `incident_count_roll_mean_6`: 6-month trailing moving average (shifted by 1).
   - `incident_count_roll_mean_12`: 12-month trailing moving average (shifted by 1).
   - `incident_count_roll_std_6`: 6-month trailing standard deviation (capturing volatility).
3. **Calendar & Cyclical Encodings (5 features)**:
   - `month_sin`: $\sin(2\pi \cdot \text{month} / 12)$ for circular annual seasonality.
   - `month_cos`: $\cos(2\pi \cdot \text{month} / 12)$ for circular annual seasonality.
   - `year`: Linear calendar trend.
   - `month`: Numerical month index (1–12).
   - `quarter`: Calendar quarter (1–4).
4. **Census Demographic & Geographic Baseline Profiles (12 features)**:
   - `population`, `male_population`, `female_population`, `sex_ratio`, `literacy_rate`, `sc_population`, `st_population`, `total_workers`, `main_workers`, `marginal_workers`, `area_sq_km`, `population_density`.

---

## 4. Multi-Model Comparative Evaluation

### 4.1 Evaluation Metrics & WAPE Formulation
In district-level monthly crime data, sparse activity results in **3,327 zero-incident observations** (43.3% of test cells). Consequently, standard Mean Absolute Percentage Error (MAPE) produces division-by-zero errors. To provide an unbiased, scale-sensitive relative percentage error, **Weighted Absolute Percentage Error (WAPE)** was adopted:
$$\text{WAPE} = \frac{\sum_{i=1}^N |y_i - \hat{y}_i|}{\sum_{i=1}^N y_i} \times 100\%$$

### 4.2 Out-of-Sample Performance Comparison (Test 2025, 7,680 Observations)

| Model Architecture | Model Role | Out-of-Sample MAE | Out-of-Sample RMSE | Out-of-Sample WAPE (%) | Out-of-Sample $R^2$ | Relative MAE Reduction vs. Baseline | Training / Fit Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Seasonal Naïve** | Simple Baseline | 2.2616 | 3.0170 | 49.13% | 0.2899 | Reference Baseline | < 0.01s |
| **Moving Average (MA-3)** | Moving Baseline | 1.8997 | 2.5084 | 41.27% | 0.5092 | 16.00% reduction | < 0.01s |
| **Poisson Regression** | Generalized Linear | 1.8727 | 2.6918 | 40.69% | 0.4348 | 17.20% reduction | 0.07s |
| **Random Forest Regressor** | Tree Ensemble | 1.7018 | 2.2629 | 36.97% | 0.6006 | 24.75% reduction | 4.46s |
| **HistGradientBoostingRegressor** | **Primary Production Model** | **1.6956** | **2.2465** | **36.84%** | **0.6063** | **25.03% reduction** | **0.89s** |

### 4.3 Model Selection Rationale
1. **Accuracy**: `HistGradientBoostingRegressor` achieved the lowest MAE (1.6956), lowest RMSE (2.2465), lowest WAPE (36.84%), and highest explanatory power ($R^2 = 0.6063$).
2. **Computational Speed**: HGBR native histogram binning enables an 80% reduction in training latency relative to Random Forest (0.89s vs. 4.46s), critical for production re-fitting workflows.
3. **Non-linear Interactions**: HGBR automatically models interactions between demographic features (population density, literacy) and temporal features (seasonal lags, cyclical months) without explicit interaction terms.

---

## 5. Split-Conformal Uncertainty Quantification

Rather than assuming parametric Gaussian residual distributions, Phase 8 employs distribution-free **Split Conformal Prediction (Inductive Conformal Inference)**:
1. **Calibration Set**: Calibration on absolute residuals $R_i = |y_i - \hat{y}_i|$ from the held-out 2024 validation period ($n = 7,680$).
2. **Horizon-Specific Quantiles**: Calibrated non-conformity scores $\hat{q}_{1-\alpha}^{(h)}$ were calculated for each forward forecast step $h \in \{1, 2, \dots, 12\}$:
   $$\hat{q}_{1-\alpha}^{(h)} = \text{Quantile}\left(\left\lceil \frac{(n_h + 1)(1 - \alpha)}{n_h} \right\rceil, \{R_{i}^{(h)}\}\right)$$
3. **Interval Generation**:
   $$\hat{C}_{\alpha}(x) = \left[\max\left(0, \hat{y} - \hat{q}_{1-\alpha}^{(h)}\right), \; \hat{y} + \hat{q}_{1-\alpha}^{(h)}\right]$$
4. **Empirical Validation on Unseen Test 2025 Data**:
   - **80% Nominal Target**: Achieved **79.74% empirical coverage** (Average Interval Width: 5.08 crimes).
   - **90% Nominal Target**: Achieved **89.15% empirical coverage** (Average Interval Width: 6.81 crimes).
   - Step-by-step 80% coverage remained consistently bounded between 76.88% and 81.56% across all 12 forward steps.

---

## 6. Operational Forecasting Horizon & Database Verification

### 6.1 Prediction Table Partitioning
The `crime_predictions` table contains **21,760 total rows** categorized by operational lifecycle:
- **`HISTORICAL_EVALUATION`**: **7,680 rows** (2025-01 to 2025-12). Used for continuous validation against actual reported crimes.
- **`PAST_FORECAST`**: **6,400 rows** (2026-01 to 2026-10). Previous operational horizons maintained for auditability.
- **`CURRENT_FUTURE_FORECAST`**: **7,680 rows** (2026-11 to 2027-10). The active 12-month forward planning horizon.

### 6.2 Carved Modern Administrative District Lineage
For newly carved modern administrative districts (such as newly formed districts in Andhra Pradesh, Ladakh, and Arunachal Pradesh verified during Task 2D), predictions are linked to Census 2011 parent district baselines via `district_geography_mapping`. Derived forecasts carry `is_derived_from_parent = True`, displaying explicit lineage badges in the API and UI to maintain administrative transparency.

---

## 7. Backend REST API Architecture & Security

All forecasting endpoints were verified under FastAPI with Pydantic validation and JWT-based role-based access control (RBAC):

| Endpoint | Method | Role | Description | Test Status |
| :--- | :---: | :---: | :--- | :---: |
| `/api/v1/predictions/overview` | GET | Authenticated | High-level system overview, horizon boundaries, active model metadata, top 10 projected districts with conformal intervals. | Verified (200 OK) |
| `/api/v1/predictions/evaluation` | GET | Authenticated | Comprehensive 5-model comparative benchmark, 3-fold cross validation, and conformal calibration diagnostics. | Verified (200 OK) |
| `/api/v1/predictions/actual-vs-predicted` | GET | Authenticated | Longitudinal time series for a district comparing historical actuals against model predictions. | Verified (200 OK) |
| `/api/v1/predictions/district-month` | GET | Authenticated | Specific district-month projected crime volume, conformal intervals, baseline shift, and crime level classification. | Verified (200 OK) |
| `/api/v1/predictions/breakdown` | GET | Authenticated | Compositional breakdown across 4 crime categories and 21 crime types using Empirical Bayes rate shrinkage. | Verified (200 OK) |
| `/api/v1/predictions/monthly` | GET | Authenticated | Paginated district-wise monthly predictions with state and temporal filters. | Verified (200 OK) |
| `/api/v1/predictions/models` | GET | Authenticated | Model registry catalog of active and historical ML model artifacts. | Verified (200 OK) |
| `/api/v1/predictions/train` | POST | ADMIN Only | Triggers model training, feature generation, and artifact persistence. | Verified (403 for Analyst / 200 for Admin) |
| `/api/v1/predictions/generate` | POST | ADMIN / ANALYST | Generates forward predictions, conformal intervals, and persists to database. | Verified (401/403 guarded / 200 authorized) |

---

## 8. Frontend Integration & Build Verification

The React/Vite/TypeScript frontend (`frontend/src/pages/PredictionsPage.tsx`) was enhanced and validated:
1. **Executive KPI Bar**:
   - Total Predictions stored (21,760), Forward Planning Horizon (2026-11 to 2027-10), Active Model (`HGBR v1.0.0`), Out-of-Sample Test MAE (1.70), RMSE (2.25), and WAPE (36.84%).
2. **Model Evaluation & Benchmark Comparison Panel**:
   - Interactive, expandable benchmark table presenting HGBR vs. Random Forest vs. Poisson vs. MA-3 vs. Seasonal Naïve across MAE, RMSE, WAPE%, $R^2$, and relative error reduction.
   - Conformal calibration summary badge (80% nominal $\rightarrow$ 79.74% empirical test coverage).
3. **District Forecast Comparison Table**:
   - Ranks top projected districts across India when no single district is filtered.
   - Shows state, forecast period, predicted crime count, 80% conformal interval range `[lower – upper]`, and a one-click Quick-Inspect button.
   - Displays a `Carved` lineage badge for modern administrative districts.
4. **District Detail & Longitudinal Charting**:
   - Seamless actual vs. predicted composed chart displaying historical actuals, 80% conformal confidence band, and future predicted line.
   - 4-category compositional distribution and 21 crime types breakdown.
5. **Clear Disclaimer & Ethical Notice**:
   - Prominently displays: *"Predictions are statistical estimates based on historical records. They are not confirmed future incidents and should not be used as the sole basis for operational or policing decisions."*
6. **Frontend Production Build**:
   - Command: `npm --prefix frontend run build`
   - Outcome: **Compiled cleanly in 2.88s with zero TypeScript errors or warnings**.

---

## 9. Automated Test Suite Execution Summary

All test suites were executed against the live database environment (`crime_management_db`):

| Test Suite File | Test Count | Execution Time | Result | Key Capabilities Verified |
| :--- | :---: | :---: | :---: | :--- |
| `backend/tests/test_ml_predictions_phase_8.py` | 6 | 0.65s | **PASS (100%)** | Top 10 overview, benchmark comparison, actuals vs predictions, district-month intervals, 4 categories & 21 types, DB row counts. |
| `backend/tests/test_crime_prediction_pipeline.py` | 15 | 15.80s | **PASS (100%)** | Zero-leakage splits, lag generation, HGBR determinism, clamping, conformal bounds, RBAC authorization, DB persistence. |
| `backend/tests/test_prediction_breakdown.py` | 6 | 0.50s | **PASS (100%)** | 4-category hierarchical breakdown, 21 crime types, carved district handling, parameter error handling. |
| `backend/tests/test_state_prediction_filtering.py` | 9 | 0.65s | **PASS (100%)** | State-wise prediction querying, pagination, multi-district aggregation, 404 handling. |
| **Total Automated Tests** | **36** | **17.60s** | **ALL PASS** | Full end-to-end ML pipeline, REST API, security, and data integrity verified. |

---

## 10. Data Integrity & Ethical Disclaimer

1. **Historical Incident Integrity**: The `crime_incidents` table contains **191,679** confirmed records, exactly equal to the count prior to Phase 8.
2. **Geographical Master Data Integrity**: Active states/UTs remain **36** and active districts remain **790** (consistent with the approved Task 2D cleanup).
3. **Ethical AI & Predictive Policing Guardrail**: Machine learning forecasts represent probabilistic expectations conditioned on reported incident history and demographic baselines. Forecasts must be used to assist strategic resource allocation, not to profile populations or substitute for human operational discretion.

---

> [!IMPORTANT]
> **Halting Notification**: Phase 8 Machine Learning Crime Prediction verification, benchmarking, API implementation, and frontend integration are complete. In accordance with system instructions, execution is halted here. **Phase 9 has NOT been started.**
