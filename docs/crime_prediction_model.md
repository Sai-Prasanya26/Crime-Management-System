# Production Machine Learning Crime Forecasting Model Documentation

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Module:** Phase 8A — Historical Crime Prediction ML Pipeline  
**Model Name:** HGBR production forecasting model v1 (`HistGradientBoostingRegressor`)  
**Model Version:** `v1.0.0`  
**Dataset Snapshot:** `panel_features_2020_2025.parquet` (38,400 clean modeling rows, 46,080 total grid observations)  
**Historical Scope:** 2020-01-01 through 2025-12-31 (191,679 verified historical incidents)  
**Geographic Scope:** 640 Census 2011 Historical Districts across 36 active States/UTs  
**Mandatory Disclaimer Notice:**  
> *"Predictions are statistical estimates based on historical records. They are not confirmed future incidents and should not be used as the sole basis for operational or policing decisions."*

---

## 1. Prediction Objective

The primary objective of this machine learning pipeline is to forecast **aggregate monthly crime counts at the district level** (\(\hat{y}_{d, t}\)) to support strategic resource planning, risk assessment, and operational allocation across Indian policing jurisdictions.

The model is strictly:
- **Macro-level and volumetric:** Forecasts monthly incident totals per district.
- **Occurrence-based:** Predicts when and where crime volume is statistically likely to occur based on calendar months.
- **Non-individualized:** Does NOT predict individual victims, suspects, criminal behavior, recidivism, or micro-level incident attributes.

---

## 2. Historical Data Source and Date Range

- **Source Database:** MySQL table `crime_incidents` (191,679 authentic records).
- **Date Range:** 2020-01-01 to 2025-12-31 (exactly 6 complete calendar years / 72 monthly periods).
- **Annual Distribution:**
  - 2020: 28,521 incidents
  - 2021: 29,579 incidents
  - 2022: 31,590 incidents
  - 2023: 32,710 incidents
  - 2024: 33,928 incidents
  - 2025: 35,351 incidents
  - **Total:** 191,679 incidents
- **Zero Synthetic Data Rule:** Zero fabricated incidents, zero synthetic labels, and zero synthetic timestamps were used. Every incident record maps to a verified historical occurrence.

---

## 3. Aggregation Level

The raw incident records are converted into a balanced, cross-sectional time series panel grid:
- **Spatial Resolution:** Historical District (\(d \in \{1, \dots, 640\}\)).
- **Temporal Resolution:** Calendar Month (\(t \in \{\text{2020-01-01}, \dots, \text{2025-12-01}\}\)).
- **Total Panel Grid:** \(640 \text{ districts} \times 72 \text{ months} = 46,080 \text{ observations}\).
- **Active Incident Cells:** 42,753 district-month cells (\(y_{d,t} > 0\)).
- **Zero-Incident Cells:** 3,327 district-month cells (\(y_{d,t} = 0\)).
- **Target Variable:** `target_incident_count` (\(y_{d,t} \in \mathbb{Z}_{\ge 0}\)).

---

## 4. Geographic Mapping Rules

1. **Census 2011 Historical District Baseline:** All 191,679 historical crime incidents map directly to the 640 Census 2011 districts (`is_census_2011 = 1`) in the `districts` table.
2. **Current Administrative Alignment:** Modern post-2011 bifurcated districts (803 total administrative districts in `districts`) map to their parent Census 2011 districts via `parent_district_id` and `district_geography_mapping`.
3. **Consistency:** Incidents are never arbitrarily reassigned or merged across unrelated administrative boundaries.

---

## 5. Feature Definitions (25 Engineered Predictors)

All 25 features are strictly backward-looking and available at prediction time:

| Feature Name | Category | Description |
|---|---|---|
| `district_id` | Identifier | Numeric Census 2011 district identifier (1 to 640) |
| `state_id` | Identifier | Categorical State/UT identifier (1 to 37) |
| `year` | Temporal | Calendar year of prediction period (e.g. 2025, 2026) |
| `month` | Temporal | Calendar month (1 to 12) |
| `quarter` | Temporal | Calendar quarter (1 to 4) |
| `year_index` | Trend | Relative year index since start (\(\text{year} - 2020\)) |
| `sin_month` | Cyclical | \(\sin(2\pi \cdot \text{month} / 12)\) |
| `cos_month` | Cyclical | \(\cos(2\pi \cdot \text{month} / 12)\) |
| `lag_1` | Autoregressive | Incident volume from preceding month (\(t - 1\)) |
| `lag_2` | Autoregressive | Incident volume from 2 months prior (\(t - 2\)) |
| `lag_3` | Autoregressive | Incident volume from 3 months prior (\(t - 3\)) |
| `lag_12` | Seasonal Autoregressive | Incident volume from same month of prior calendar year (\(t - 12\)) |
| `rolling_mean_3` | Trailing Moving Average | Unweighted mean of preceding 3 months (\(t-1, t-2, t-3\)) |
| `rolling_mean_6` | Trailing Moving Average | Unweighted mean of preceding 6 months (\(t-1, \dots, t-6\)) |
| `rolling_mean_12` | Trailing Moving Average | Unweighted mean of preceding 12 months (\(t-1, \dots, t-12\)) |
| `rolling_std_6` | Volatility | Standard deviation of volume across preceding 6 months |
| `total_population` | Static Baseline | Total Census 2011 population for historical district |
| `male_population` | Static Baseline | Male Census 2011 population |
| `female_population` | Static Baseline | Female Census 2011 population |
| `literate_population` | Static Baseline | Literate Census 2011 population |
| `total_workers` | Static Baseline | Total working population |
| `gender_ratio` | Demographic Ratio | \(\text{female\_population} / \text{male\_population}\) |
| `literacy_rate` | Demographic Ratio | \(\text{literate\_population} / \text{total\_population}\) |
| `worker_ratio` | Demographic Ratio | \(\text{total\_workers} / \text{total\_population}\) |
| `historical_crime_rate_per_100k` | Historical Baseline Rate | Trailing 12-month average crime rate per 100,000 citizens |

---

## 6. Leakage Prevention Architecture

Strict guardrails guarantee zero target leakage:
1. **Window Shifting:** All rolling windows and lag terms are constructed using `.shift(1)` so the target month \(t\) is never included in any calculation.
2. **Post-Incident Exclusion:** Fields available only after an incident report is filed or resolved are completely excluded from the dataset:
   - `case_status`, `closed_date`, `police_deployed_count`, `reported_date`, `report_number`, `victim_age`, `victim_gender`, `weapon_used`.
3. **Static Demographics Demarcation:** Census 2011 demographics are explicitly labelled as historical baseline indicators and remain static across all months.
4. **Target Isolation:** The target variable `target_incident_count` is strictly isolated and never present in `FEATURE_COLUMNS`.

---

## 7. Models Compared

Five distinct model families were implemented and compared under identical conditions:

1. **Seasonal Naïve Baseline:**
   - \(\hat{y}_{d,t} = y_{d,t-12}\) (using `lag_12`).
   - Pure annual seasonal persistence; zero learned parameters.
2. **Trailing Moving Average Baseline (MA-3):**
   - \(\hat{y}_{d,t} = \frac{1}{3} \sum_{i=1}^3 y_{d,t-i}\) (using `rolling_mean_3`).
   - Short-term trend persistence; zero learned parameters.
3. **Poisson Regressor (Count Model):**
   - Generalized Linear Model with Poisson error distribution and log-link function. Standardized continuous predictors; \(\alpha=1.0\).
4. **Random Forest Regressor:**
   - Bagging ensemble of 100 decorrelated decision trees (`max_depth=12`, `min_samples_leaf=2`, `random_state=42`).
5. **HistGradientBoostingRegressor (Selected Production Winner):**
   - Histogram-based gradient boosting optimized for tabular data.
   - Native categorical binning for `state_id`.
   - Hyperparameters: `learning_rate=0.05`, `max_iter=300`, `max_leaf_nodes=31`, `min_samples_leaf=20`, `l2_regularization=1.0`, `random_state=42`.

---

## 8. Chronological Split Strategy

Random train/test splits were strictly prohibited to avoid look-ahead bias and autocorrelation leakage.

- **Warm-Up Period (2020):** 7,680 rows (\(640 \times 12\)). Reserved solely to populate 12-month lags and rolling windows; excluded from supervised training.
- **Training Set (2021–2023):** 23,040 rows (\(640 \times 36\)). Supervised model fitting.
- **Validation Set (2024):** 7,680 rows (\(640 \times 12\)). Hyperparameter tuning and feature selection.
- **Untouched Out-of-Sample Test Set (2025):** 7,680 rows (\(640 \times 12\)). Held-out evaluation benchmark.
- **Production Refit Set (2021–2025):** 38,400 rows (\(640 \times 60\)). Trained on all post-warmup data for operational deployment.

### Walk-Forward Expanding Window Validation Results

| Fold | Training Window | Eval Window | Eval Rows | SN MAE | MA-3 MAE | Poisson MAE | RF MAE | HGBR MAE |
|---|---|---|---:|---:|---:|---:|---:|---:|
| **Fold 1** | 2021–2022 | 2023 | 7,680 | 2.1919 | 1.8199 | 1.7596 | 1.6269 | **1.6226** |
| **Fold 2** | 2021–2023 | 2024 | 7,680 | 2.2471 | 1.8589 | 1.8091 | 1.6540 | **1.6505** |
| **Fold 3** | 2021–2024 | 2025 | 7,680 | 2.2616 | 1.8997 | 1.8627 | 1.7045 | **1.6957** |

---

## 9. Evaluation Results (Held-Out 2025 Test Split — 7,680 Observations)

| Model Architecture | MAE | RMSE | WAPE% | \(R^2\) | Fit Time (s) |
|---|---:|---:|---:|---:|---:|
| **HistGradientBoostingRegressor** | **1.6956** | **2.2465** | **36.84%** | **0.6063** | 1.08s |
| **RandomForestRegressor** | 1.7018 | 2.2629 | 36.97% | 0.6006 | 3.40s |
| **PoissonRegression** | 1.8727 | 2.6918 | 40.69% | 0.4348 | 0.06s |
| **Moving Average (MA-3)** | 1.8997 | 2.5084 | 41.27% | 0.5092 | 0.00s |
| **Seasonal Naïve (Lag 12)** | 2.2616 | 3.0170 | 49.13% | 0.2899 | 0.00s |

All predictions were clamped to \(\ge 0.0\) before metric calculation. Zero denominators were handled safely using WAPE (\(\sum |y - \hat{y}| / \sum y\)).

---

## 10. Baseline Comparison

- **HGBR vs. Seasonal Naïve:**
  - Absolute MAE reduction: \(2.2616 - 1.6956 = 0.5660\) incidents/month.
  - Relative MAE reduction: **25.03% improvement**.
  - WAPE error reduction: **12.29 percentage points lower**.
  - Variance explained (\(R^2\)): **+0.3164 increase** (from 0.2899 to 0.6063).
- **HGBR vs. Moving Average (MA-3):**
  - Relative MAE reduction: **10.74% improvement**.
  - WAPE error reduction: **4.43 percentage points lower**.
- **HGBR vs. Poisson Regression:**
  - Relative MAE reduction: **9.46% improvement**.
  - WAPE error reduction: **3.85 percentage points lower**.

---

## 11. Selected Model and Justification

**HistGradientBoostingRegressor** was selected as the sole active production model because:
1. **Superior Predictive Accuracy:** Consistently achieved the lowest MAE (1.6956), lowest RMSE (2.2465), and highest \(R^2\) (0.6063) across all evaluation splits and walk-forward folds.
2. **Computational Efficiency:** 3.1\(\times\) faster training than Random Forest (1.08s vs. 3.40s).
3. **Artifact Size:** Lightweight model artifact (328 KB vs. 18.6 MB for Random Forest).
4. **Tabular Robustness:** Native handling of non-linear feature interactions between autoregressive lags, trailing crime rates, and static demographics.

---

## 12. Artifact Storage and Versioning

- **Artifact Directory:** `ml/saved_models/`
- **Production Artifact:** `production_hgbr_v1.joblib` (328,496 bytes)
- **Experimental Artifacts:** `experimental_hgbr_v1.joblib`, `experimental_random_forest_v1.joblib`, `experimental_poisson_v1.joblib`
- **Metadata Registry:** `production_model_metadata_v1.json`, `training_metadata_v1.json`
- **Database Model Registry:** Table `ml_models` (Model ID: 1, `version: v1.0.0`, `is_active: 1`)
- **Forecast Storage:** Table `crime_predictions` (9,600 rows spanning 15 monthly periods)

---

## 13. API Endpoints

All prediction routes are protected by JWT Bearer authentication:

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/v1/predictions/overview` | Authenticated | Pipeline metrics, period ranges, top projected districts |
| `GET` | `/api/v1/predictions/models` | Authenticated | All registered models and evaluation metrics |
| `GET` | `/api/v1/predictions/model` | Authenticated | Active model hyperparameters and verified provenance |
| `GET` | `/api/v1/predictions/evaluation` | Authenticated | 5-model evaluation table and walk-forward CV |
| `GET` | `/api/v1/predictions/actual-vs-predicted` | Authenticated | Paired actual vs predicted monthly caseload points |
| `GET` | `/api/v1/predictions/monthly` | Authenticated | Paginated monthly volume forecasts with filters |
| `GET` | `/api/v1/predictions` | Authenticated | Root prediction query endpoint |
| `GET` | `/api/v1/predictions/{district_id}` | Authenticated | Longitudinal forecast series for a specific district |
| `POST` | `/api/v1/predictions/train` | **ADMIN** | Triggers model training/refit and registry update |
| `POST` | `/api/v1/predictions/generate` | **ADMIN / ANALYST** | Generates future multi-step operational forecasts |

---

## 14. Forecast Limitations

1. **Macro Volumetric Granularity:** Forecasts are monthly aggregate counts at district level. They do not predict exact addresses, specific dates/times, victim attributes, or individual suspects.
2. **Autoregressive Uncertainty:** Multi-step forward forecasts (months 2 and 3) utilize recursive inputs from preceding forecast steps, which increases uncertainty compoundingly beyond 3 months.
3. **Static Baseline Demographics:** Demographic features reflect the official Census 2011 baseline and do not capture intra-decadal population migrations.
4. **Confidence Bounds:** Quantile prediction intervals are not statistically parameterized for point forecasts and are left as `NULL` in the database to prevent misleading precision.

---

## 15. Reproduction and Local Retraining Instructions

### Step 1: Rebuild District-Month Panel
```bash
python ml/preprocessing/panel_builder.py
```
*Queries MySQL, constructs the 46,080-row grid, and saves `ml/data/district_month_panel.parquet`.*

### Step 2: Generate Feature Matrix
```bash
python ml/feature_engineering/feature_pipeline.py
```
*Engineers 25 features, checks leakage assertions, and saves `ml/data/panel_features_2020_2025.parquet`.*

### Step 3: Train & Compare Baselines
```bash
python ml/training/train_forecaster.py
python ml/evaluation/compare_models.py
```
*Trains Seasonal Naïve, MA-3, Poisson, Random Forest, and HGBR across walk-forward folds and saves metadata.*

### Step 4: Refit Production Model & Populate Database
```bash
python ml/training/train_production_model.py
python ml/inference/prediction_pipeline.py
```
*Refits on 2021–2025, registers model in `ml_models`, and populates 9,600 predictions into `crime_predictions`.*

### Step 5: Execute Test Suite
```bash
python -m unittest discover backend/tests
```
*Executes all automated backend tests.*

---

## 16. Multi-Step Forecasting & Conformal Uncertainty Extension (Phase 8B)

For detailed documentation on:
- 3-way forecast status classification (`HISTORICAL_EVALUATION`, `PAST_FORECAST`, `CURRENT_FUTURE_FORECAST`)
- Multi-step recursive walk-forward backtesting across horizons \(h=1, 3, 6\)
- Inductive split conformal prediction intervals calibrated on 2024 residuals
- Fresh forward operational horizon starting with the next calendar month (November 2026 – January 2027)

See the dedicated documentation: [`docs/crime_forecasting_reliability.md`](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/docs/crime_forecasting_reliability.md).

