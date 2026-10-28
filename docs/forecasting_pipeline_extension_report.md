# Crime Predictions: 12-Month Forecasting Pipeline Extension Report

## Executive Summary
The Crime Predictions forecasting engine has been extended from a 3-month horizon to a comprehensive **12-month forward operational horizon** spanning **November 2026 through October 2027** (`2026-11-01` to `2027-10-01`) across all 640 supported districts. In addition, retrospective past forecast records were generated and persisted for the missing months of **January through October 2026** with explicit provenance (`forecast_origin_date: 2025-12-31`, status: `PAST_FORECAST`), preserving the absolute authenticity of actual historical incident records (2020–2025: 191,679 rows) without zero-padding or fabrication.

Step-specific split conformal prediction intervals were empirically calibrated on the 2024 validation residuals and evaluated on the 2025 held-out test set for all 12 forward steps ($h = 1 \dots 12$), ensuring rigorous, non-exploding uncertainty bounds.

---

## 1. Data Integrity and Historical Preservation
- **Historical Observations**: Actual historical crime incident records terminate strictly at `2025-12-31` (191,679 authentic records preserved untouched).
- **No Zero-Padding**: For temporal indices in 2026 and 2027 where actual incident records have not yet been registered, actual incident counts are treated as missing (`None` / `undefined`). At no point are missing actual counts substituted with zero or synthetic incidents.
- **Database Predictions Count**:
  - `HISTORICAL_EVALUATION` (2025-01 to 2025-12, origin `2024-12-31`, $h=0$): **7,680 records** (12 months $\times$ 640 districts)
  - `PAST_FORECAST` (2026-01 to 2026-10, origin `2025-12-31`, $h=1 \dots 10$): **6,400 records** (10 months $\times$ 640 districts)
  - `CURRENT_FUTURE_FORECAST` (2026-11 to 2027-10, origin `2026-10-01`, $h=1 \dots 12$): **7,680 records** (12 months $\times$ 640 districts)
  - **Total Database Predictions**: **21,760 records** across 34 distinct monthly periods.

---

## 2. Multi-Step Recursive Forecasting Architecture
- **Model**: HistGradientBoostingRegressor (HGBR) with Poisson loss (`production_hgbr_v1.joblib`).
- **Feature Pipeline**: Dynamically maintains lag states (`lag_1`, `lag_2`, `lag_3`, `lag_12`), rolling statistics (`rolling_mean_3`, `rolling_mean_6`, `rolling_mean_12`, `rolling_std_6`), temporal harmonics (`sin_month`, `cos_month`), and demographic features across iterative multi-step projections.
- **Leakage Prevention**: Future target values are excluded from feature vectors during recursive state feeding.
- **Horizon Performance Across 12 Steps**:
  - **Overall 12-Month Aggregate**:
    - MAE: 1.6624
    - RMSE: 2.1709
    - WAPE: 36.18%
    - $R^2$: 0.6287
    - Relative Gain vs Seasonal Naive: **26.49%** improvement
  - Performance remains remarkably stable across horizons ($R^2$ 0.6482 at $h=1$ to 0.6274 at $h=12$), avoiding catastrophic recursive compounding.

---

## 3. Conformal Prediction Calibration ($h = 1 \dots 12$)
Empirical nonconformity scores $\alpha_i = |y_i - \hat{y}_i|$ were calculated on the 7,680 validation records from 2024 across each forward step. Finite-sample calibrated quantiles:
$$\hat{q}_{1-\alpha} = \text{Quantile}\left(\{\alpha_i\}_{i=1}^n, \frac{\lceil(n+1)(1-\alpha)\rceil}{n}\right)$$

### Empirical Quantiles:
| Horizon Step | Target Month | 80% Nonconformity Quantile ($q_{0.80}$) | 90% Nonconformity Quantile ($q_{0.90}$) |
|---|---|---|---|
| Step 1 | 2026-11 | 2.44 | 3.22 |
| Step 2 | 2026-12 | 2.36 | 3.07 |
| Step 3 | 2027-01 | 2.46 | 3.38 |
| Step 4 | 2027-02 | 2.47 | 3.40 |
| Step 5 | 2027-03 | 2.56 | 3.25 |
| Step 6 | 2027-04 | 2.57 | 3.57 |
| Step 7 | 2027-05 | 2.71 | 3.62 |
| Step 8 | 2027-06 | 2.79 | 3.63 |
| Step 9 | 2027-07 | 2.67 | 3.42 |
| Step 10 | 2027-08 | 2.55 | 3.40 |
| Step 11 | 2027-09 | 2.47 | 3.27 |
| Step 12 | 2027-10 | 2.63 | 3.53 |

- **Empirical Coverage on Unseen 2025 Test Set**:
  - 80% Nominal: **79.74%** empirical coverage (adheres within expected tolerance)
  - 90% Nominal: **89.15%** empirical coverage
- **Clamping**: Lower bounds are clamped at $\max(0.0, \hat{y} - q)$, preventing impossible negative incident counts.

---

## 4. API and Frontend Enhancements
1. **Schema & Backend Endpoints**:
   - `GenerateTriggerRequest.forward_months`: Extended range `Field(12, ge=1, le=12)`.
   - `DistrictMonthPredictionResponse`: Added `prediction_interval_lower` and `prediction_interval_upper` to the response payload.
   - Updated repository fallback counts: 10 past forecast periods, 12 operational forecast periods.
2. **Frontend UI (`PredictionsPage.tsx`)**:
   - Progressive filtering strictly respected: State selection $\rightarrow$ District selection $\rightarrow$ Year selection $\rightarrow$ Month selection.
   - Month selection dropdown dynamically enables supported months (All 12 months in 2026; Months 1–10 in 2027). Months 11–12 in 2027 are clearly annotated as `(Beyond 12M Horizon)`.
   - Longitudinal chart visualizes actuals only through December 2025; 2026 and 2027 plots model predictions (`current_future`), rendering missing historical counts as empty rather than zero.
   - Prediction results card surfaces the 80% conformal uncertainty interval: `(80% Interval: [lower – upper])`.

---

## 5. Verification and Validation Results
- **Unit Tests**:
  - `backend.tests.test_crime_forecasting_reliability`: 14 tests passed.
  - `backend.tests.test_crime_prediction_pipeline`: 15 tests passed.
  - Total: **29/29 tests passed (OK)** in 43.2 seconds.
- **Frontend Verification**:
  - `oxlint`: 0 errors.
  - `tsc -b && vite build`: Successful production build in 2.95s with 0 errors.
- **Module Isolation**:
  - Zero modifications to Operations modules (`ResourceOptimizationPage`, `BudgetIntelligencePage`, `ReportsPage`, `AdminUsersPage`).
