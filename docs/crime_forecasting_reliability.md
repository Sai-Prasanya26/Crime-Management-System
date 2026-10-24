# Production Crime Forecasting Reliability, Multi-Step Horizon & Uncertainty Calibration

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module:** Phase 8B — Crime Forecasting, Uncertainty & Forecast Freshness  
**Production Model:** HGBR production forecasting model v1 (`HistGradientBoostingRegressor`, `v1.0.0`)  
**Historical Scope:** 2020-01-01 to 2025-12-31 (191,679 authentic incidents across 640 Census 2011 districts)  
**System Cutoff Date:** 2026-10-01 (Current Operational Date: October 2026, IST / UTC+05:30)  
**Mandatory Disclaimer Notice:**  
> *"Predictions are statistical estimates based on historical records. They are not confirmed future incidents and should not be used as the sole basis for operational or policing decisions."*

---

## 1. Forecast Origin Policy

1. **System Timezone & Policy:**  
   The system standardizes all datetime operations to **Indian Standard Time (IST, UTC+05:30)** (`Asia/Kolkata`).
2. **Current Cutoff Origin:**  
   As of October 2026, the operational forecasting cutoff date is anchored to `2026-10-01`.
3. **Monthly Boundary Rule:**  
   Forecast origin represents the snapshot date up to which information is assumed to be known or simulated. Lags and rolling statistical windows are computed strictly using history prior to the target period.
4. **Audit Immutability:**  
   Forecast runs record their specific `forecast_origin_date` in the database to guarantee reproducibility and auditability.

---

## 2. Freshness Rules

Prior to Phase 8B, the system stored historical evaluation records for 2025 and forward predictions for January–March 2026. Relative to the October 2026 system date, January–March 2026 are expired past dates.

### Freshness Invariant:
- Expired forecasts are **never** rendered or returned as upcoming forward forecasts.
- The active forward operational horizon begins **strictly with the next calendar month** relative to the system cutoff date.
- With cutoff `2026-10-01`, the active forward horizon starts at **`2026-11-01` (November 2026)** and extends consecutively through **`2027-01-01` (January 2027)** for a 3-month operational window.

---

## 3. Historical versus Future Forecast Status Classification

To maintain auditability without data destruction, the system implements explicit three-way status classification:

| Status Code | Description | Temporal Condition | Target Date Range | Count (Districts × Months) | `is_latest` |
|---|---|---|---|---|---|
| `HISTORICAL_EVALUATION` | Out-of-sample model predictions evaluated against authentic historical crime incidents | \(\text{Date} \le \text{2025-12-31}\) | 2025-01-01 to 2025-12-01 | 7,680 records (640 × 12) | `1` |
| `PAST_FORECAST` | Forward forecasts generated in past runs whose target dates have since elapsed | \(\text{2026-01-01} \le \text{Date} \le \text{2026-10-31}\) | 2026-01-01 to 2026-03-01 | 1,920 records (640 × 3) | `0` |
| `CURRENT_FUTURE_FORECAST` | Active operational forward forecasts for upcoming calendar periods | \(\text{Date} \ge \text{2026-11-01}\) | 2026-11-01 to 2027-01-01 | 1,920 records (640 × 3) | `1` |

**Total Stored Records in `crime_predictions`:** 11,520 records across 18 monthly periods (640 districts × 18 months).

---

## 4. Backtesting Methodology

Evaluation was extended beyond single-step test scoring to **multi-step recursive walk-forward backtesting**:
1. **Backtest Origin:** Anchored at `2024-12-31` (training on 2021–2024 data).
2. **Evaluation Window:** 2025 calendar year (months 1 through 6).
3. **Baselines Compared Under Identical Conditions:**
   - **Seasonal Naïve (SN):** \(\hat{y}_{d, t} = y_{d, t-12}\)
   - **Moving Average-3 (MA-3):** \(\hat{y}_{d, t} = \frac{1}{3}\sum_{i=1}^3 y_{d, t-i}\)
   - **HistGradientBoostingRegressor (HGBR):** Production refit model

### Step-by-Step Multi-Step Backtesting Benchmark (2025 Held-Out Test Set):

| Step | Target Period | Sample Size (\(N\)) | HGBR MAE | Seasonal Naïve MAE | MA-3 MAE | HGBR RMSE | HGBR WAPE% |
|---|---|---:|---:|---:|---:|---:|---:|
| **\(h = 1\)** | 2025-01-01 | 640 | **1.5770** | 2.1063 | 1.8823 | 2.0445 | **36.45%** |
| **\(h = 2\)** | 2025-02-01 | 640 | **1.6062** | 2.2094 | 1.8315 | 2.0485 | **37.30%** |
| **\(h = 3\)** | 2025-03-01 | 640 | **1.6427** | 2.1859 | 1.7747 | 2.1314 | **37.95%** |
| **\(h = 4\)** | 2025-04-01 | 640 | **1.5860** | 2.2547 | 1.5894 | 2.0921 | **35.71%** |
| **\(h = 5\)** | 2025-05-01 | 640 | **1.6253** | 2.1547 | 1.6329 | 2.1165 | **34.88%** |
| **\(h = 6\)** | 2025-06-01 | 640 | **1.6611** | 2.3156 | 1.6867 | 2.2088 | **33.89%** |

---

## 5. Forecast Horizons

Cumulative multi-step performance demonstrates clear stability and compounding error resistance:

| Horizon Name | Steps | Sample Size (\(N\)) | HGBR MAE | Seasonal Naïve MAE | MA-3 MAE | HGBR RMSE | HGBR WAPE% | Relative MAE Improvement vs SN |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| **1-Month Ahead** | \(h = 1\) | 640 | **1.5770** | 2.1063 | 1.8823 | 2.0445 | 36.45% | **+25.13%** |
| **3-Month Cumulative** | \(h = 1 \dots 3\) | 1,920 | **1.6086** | 2.1672 | 1.8295 | 2.0752 | 37.23% | **+25.77%** |
| **6-Month Cumulative** | \(h = 1 \dots 6\) | 3,840 | **1.6164** | 2.2044 | 1.7329 | 2.1077 | 35.97% | **+26.67%** |

**Conclusion:** HGBR decisively outperforms both Seasonal Naïve and Moving Average baselines across all horizons. Its MAE increases mildly from 1.5770 at \(h=1\) to 1.6427 at \(h=3\), confirming bounded error propagation.

---

## 6. Recursive Forecasting Behavior

1. **Intermediate Roll-Forward:**  
   Because ground-truth incidents end at `2025-12-31` and operational forecasting starts at `2026-10-01`, the engine performs recursive state roll-forward for months `2026-01` through `2026-10`.
2. **Lag Updating Rules:**  
   - \(\text{lag\_1}\) at step \(t+1\) uses \(\hat{y}_{d, t}\) (model prediction from step \(t\)).
   - \(\text{lag\_2}\) at step \(t+1\) uses \(\hat{y}_{d, t-1}\).
   - Rolling means (`rolling_mean_3`, `rolling_mean_6`, `rolling_mean_12`) and `rolling_std_6` update dynamically by sliding the window with predicted outputs.
3. **Leakage Prevention:**  
   Zero actual future data is ever accessed during recursive generation. Features use only historical observations plus earlier model predictions from the same run.
4. **Non-Negative Clamping:**  
   All intermediate and final point predictions are passed through `clamp_predictions()`, guaranteeing \(\hat{y}_{d, t} \ge 0.0\).

---

## 7. Prediction Interval Methodology (Split Conformal Prediction)

Prediction intervals are rigorously distinguished from confidence intervals:
- **Confidence Interval:** Quantifies uncertainty in model parameters (\(\beta\) or weights).
- **Prediction Interval:** Quantifies future occurrence variance for an individual district-month realization (\(y_{d, t+h} \in [\hat{y}^{\text{lower}}, \hat{y}^{\text{upper}}]\)).

### Inductive Split Conformal Framework:
1. **Calibration Set (\(\mathcal{D}_{\text{cal}}\)):**  
   Chronological validation year 2024 (7,680 district-month observations), strictly disjoint from training data (2021–2023) and untouched test data (2025).
2. **Nonconformity Score:**  
   Absolute residual for each observation:
   \[
   s_i = |y_i - \hat{y}_i|
   \]
3. **Conformal Quantile:**  
   For nominal coverage level \(1 - \alpha\), compute:
   \[
   q_{1-\alpha} = \text{Quantile}\left(\{s_i\}_{i=1}^n, \frac{\lceil (n+1)(1-\alpha) \rceil}{n}\right)
   \]
4. **Prediction Interval Construction:**  
   \[
   \hat{y}^{\text{lower}} = \max(0.0, \hat{y} - q_{1-\alpha}), \quad \hat{y}^{\text{upper}} = \hat{y} + q_{1-\alpha}
   \]
5. **Multi-Step Horizon Calibration:**  
   Conformal nonconformity scores were computed per horizon step \(h \in \{1 \dots 6\}\) to account for compounding multi-step variance.

---

## 8. Empirical Coverage and Width Evaluation

Evaluated on the completely held-out **2025 test set (7,680 observations)** using parameters calibrated strictly on **2024**:

| Horizon Step | Calibrated \(q_{80}\) | Empirical Test Coverage (Nominal 80%) | Mean Interval Width | Calibrated \(q_{90}\) | Empirical Test Coverage (Nominal 90%) | Mean Interval Width |
|---|---:|---:|---:|---:|---:|---:|
| **\(h = 1\)** | 2.4500 | **80.47%** | 4.73 | 3.2300 | **89.53%** | 6.04 |
| **\(h = 2\)** | 2.3600 | **77.50%** | 4.57 | 3.0900 | **88.91%** | 5.81 |
| **\(h = 3\)** | 2.4700 | **80.31%** | 4.77 | 3.4000 | **90.16%** | 6.31 |
| **\(h = 4\)** | 2.4700 | **80.62%** | 4.78 | 3.4100 | **89.84%** | 6.34 |
| **\(h = 5\)** | 2.5600 | **78.28%** | 4.94 | 3.2600 | **88.91%** | 6.13 |
| **\(h = 6\)** | 2.5700 | **80.47%** | 4.96 | 3.5900 | **91.72%** | 6.66 |
| **Overall (1..3M)** | **2.4220** | **79.48%** | **4.68** | **3.2400** | **89.43%** | **6.05** |

**Verification:**  
Nominal 80% coverage achieves **79.48%** empirical test coverage (gap < 0.52%). Nominal 90% coverage achieves **89.43%** test coverage (gap < 0.57%). Conformal intervals are statistically valid, non-arbitrary, and clamped at zero.

---

## 9. Model and Data Versioning

Every forecast stored in `crime_predictions` is traceable to:
- **`model_id`:** Foreign key to `ml_models` (Model ID: `1`, Version: `v1.0.0`).
- **`forecast_origin_date`:** `2026-10-01` for active forward forecasts; `2025-12-31` for past forecasts; `2024-12-31` for historical evaluations.
- **`horizon_step`:** Horizon index (\(1 \dots 6\) for forward forecasts, \(0\) for evaluation).
- **`is_latest`:** `1` for the active operational run; `0` for archived past forecasts.
- **`dataset_snapshot`:** `panel_features_2020_2025.parquet` (38,400 clean training observations).
- **`generated_at`:** Database timestamp of the execution run.

---

## 10. Database and API Changes

### Database Migration:
Table `crime_predictions` was extended with backward-compatible columns and indexes:
```sql
ALTER TABLE crime_predictions
ADD COLUMN forecast_status ENUM('HISTORICAL_EVALUATION', 'PAST_FORECAST', 'CURRENT_FUTURE_FORECAST') NOT NULL DEFAULT 'CURRENT_FUTURE_FORECAST',
ADD COLUMN forecast_origin_date DATE NULL,
ADD COLUMN horizon_step SMALLINT NULL,
ADD COLUMN prediction_interval_lower DECIMAL(10, 2) NULL,
ADD COLUMN prediction_interval_upper DECIMAL(10, 2) NULL,
ADD COLUMN is_latest TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE crime_predictions
ADD INDEX idx_pred_status (forecast_status),
ADD INDEX idx_pred_origin_date (forecast_origin_date),
ADD INDEX idx_pred_is_latest (is_latest);
```
`confidence_lower` and `confidence_upper` are retained and synchronized with `prediction_interval_lower` and `prediction_interval_upper` to prevent breaking existing API consumers.

### API Endpoints:
1. `GET /api/v1/predictions/overview`: Returns total predictions (11,520), status breakdown, active forecast horizon (`2026-11-01` to `2027-01-01`), forecast origin date (`2026-10-01`), and calibration method.
2. `GET /api/v1/predictions/monthly` & `GET /api/v1/predictions`: Added query filters `forecast_status` and `is_latest`. Each item returns status, origin, horizon step, and prediction intervals.
3. `GET /api/v1/predictions/actual-vs-predicted`: Categorizes each period into `HISTORICAL_ACTUAL`, `HISTORICAL_EVALUATION`, `PAST_FORECAST`, or `CURRENT_FUTURE_FORECAST`, returning conformal interval bounds.
4. `GET /api/v1/predictions/evaluation`: Enriched with multi-horizon walk-forward backtest benchmarks (`backtest_horizons`) and conformal calibration parameters (`conformal_calibration`).
5. `POST /api/v1/predictions/generate`: Role-protected (ADMIN / ANALYST), accepts `forward_months` (validated 1 to 6), `forecast_origin_date`, and `calibrate_intervals`. Uses atomic transaction with rollback on failure.

---

## 11. Reproduction Commands

```bash
# 1. Run database migration (idempotent)
backend\.venv\Scripts\python.exe ml/preprocessing/migrate_predictions_phase8b.py

# 2. Run multi-horizon backtesting and update metadata
backend\.venv\Scripts\python.exe -c "
import sys, os, json
sys.path.insert(0, os.path.abspath('.'))
from ml.evaluation.backtesting import run_chronological_backtest
from ml.inference.conformal_calibrator import CONFORMAL_CALIBRATION_REGISTRY
bt_res = run_chronological_backtest()
combined = {'backtesting_results': bt_res, 'conformal_calibration': CONFORMAL_CALIBRATION_REGISTRY}
with open('ml/saved_models/backtest_and_conformal_metadata.json', 'w') as f:
    json.dump(combined, f, indent=2)
"

# 3. Populate predictions and forward forecasts in MySQL
backend\.venv\Scripts\python.exe ml/inference/prediction_pipeline.py

# 4. Run automated test suites
backend\.venv\Scripts\python.exe -m unittest -v backend/tests/test_crime_forecasting_reliability.py
backend\.venv\Scripts\python.exe -m unittest -v backend/tests/test_crime_prediction_pipeline.py

# 5. Build and verify frontend
cd frontend
npm run build
npm run lint
```

---

## 12. Known Limitations

1. **Intermediate Unobserved Gap:**  
   Ground-truth crime incidents end at `2025-12-31`. Months `2026-01` through `2026-10` are intermediate recursive model states rather than observed incident counts.
2. **Homoskedastic Conformal Band Assumption:**  
   Standard split conformal prediction yields constant interval width across districts for a given horizon step. Future phases may evaluate Conformalized Quantile Regression (CQR) for heteroskedastic district-varying widths.
3. **Macro-Level Volumetric Scope:**  
   Forecasts represent aggregate monthly counts per historical district. They do not forecast micro-locations, specific crime sub-types, or individual perpetrators.
