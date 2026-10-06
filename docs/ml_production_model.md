# Production Machine Learning Crime Forecasting Model & Pipeline

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase**: Phase 8D — Production Model Selection & Forecasting Pipeline  
**Model Name**: `HGBR production forecasting model v1`  
**Model Version**: `v1.0.0`  
**Algorithm**: `HistGradientBoostingRegressor` (`scikit-learn`)  
**Production Status**: **Active / Deployed**

---

## 1. Executive Summary & Model Selection Rationale

Following empirical benchmarking across baselines and ensemble candidates in Phase 8C, **`HistGradientBoostingRegressor` (HGBR)** was selected as the primary production forecasting model.

### Key Factors for Selection:
1. **Empirical Superiority**: On the untouched 2025 out-of-sample test set (7,680 observations), HGBR achieved the lowest error across all metrics:
   - **MAE**: `1.6956` (vs. Random Forest `1.7018`, MA-3 `1.8997`, Seasonal Naive `2.2616`)
   - **RMSE**: `2.2465` (vs. Random Forest `2.2629`, MA-3 `2.5084`, Seasonal Naive `3.0170`)
   - **WAPE**: `36.84%` (vs. Random Forest `36.97%`, MA-3 `41.27%`, Seasonal Naive `49.13%`)
   - **$R^2$**: `0.6063` (vs. Random Forest `0.6006`, MA-3 `0.5092`, Seasonal Naive `0.2899`)
2. **Computational Efficiency**: HGBR fit in **0.44 seconds** compared to 1.46 seconds for Random Forest, and serializes to a lightweight artifact (~584 KB vs. ~18.6 MB for Random Forest).
3. **Native Categorical Splitting**: Natively bins categorical state identifiers (`state_id`) with 8-bit histogram representation.

> [!IMPORTANT]
> **Model Selection Evidence vs. Production Refit**:  
> Phase 8C model-selection metrics were obtained from an untouched 2025 out-of-sample test set (trained on 2021–2023).  
> For production deployment, the frozen validated architecture was refit on all available historical data (2021–2025, 38,400 observations) to assimilate the latest operational patterns.  
> *Note: WAPE 36.84% represents historical out-of-sample test performance and is not a guarantee of future real-world precision under structural shifts.*

---

## 2. Model Specifications & Hyperparameters

| Parameter | Value | Rationale |
| :--- | :---: | :--- |
| `learning_rate` | `0.05` | Conservative shrinkage preventing step overshoot |
| `max_iter` | `300` | Maximum boosting rounds (early convergence reached in ~77–144 iterations) |
| `max_leaf_nodes` | `31` | Controls tree complexity and prevents overfitting |
| `min_samples_leaf` | `20` | Guarantees minimum data support in each leaf node |
| `l2_regularization` | `1.0` | Penalizes extreme leaf weights to smooth predictions |
| `random_state` | `42` | Strictly deterministic, reproducible results |
| `categorical_features` | `['state_id']` | Categorical regional baseline (37 states $\le$ 255 category limit) |
| Post-Processing | $\hat{y} = \max(\hat{y}, 0.0)$ | Physically guarantees non-negative crime counts |

---

## 3. Feature Architecture & Authoritative Predictors

The model consumes **25 engineered predictor features** defined in `ml.feature_engineering.feature_pipeline`:

1. **Geographic & Regional Identifiers**:
   - `district_id`: Historical Census district identifier ($1 \dots 640$)
   - `state_id`: Categorical state/UT identifier ($1 \dots 37$)
2. **Calendar & Cyclical Dynamics**:
   - `year`, `month`, `quarter`, `year_index`
   - `sin_month`, `cos_month`: Continuous harmonic cyclical representation
3. **Autoregressive Lags (Strictly Backward-Looking)**:
   - `lag_1`: Volume at $t-1$
   - `lag_2`: Volume at $t-2$
   - `lag_3`: Volume at $t-3$
   - `lag_12`: Volume at $t-12$ (same calendar month of prior year)
4. **Trailing Moving Statistics (Shifted by 1)**:
   - `rolling_mean_3`: 3-month trailing moving average ($\text{mean}(t-3 \dots t-1)$)
   - `rolling_mean_6`: 6-month trailing moving average
   - `rolling_mean_12`: 12-month trailing moving average (annual baseline volume)
   - `rolling_std_6`: 6-month trailing standard deviation (volatility)
5. **Static Census 2011 Demographics & Crime Density**:
   - `total_population`, `male_population`, `female_population`
   - `literate_population`, `total_workers`
   - `gender_ratio`, `literacy_rate`, `worker_ratio`
   - `historical_crime_rate_per_100k`: Trailing annual volume per 100k population

---

## 4. Forecasting Scope & Granularity

- **Target**: `target_incident_count` (total monthly crime incidents in the district).
- **Granularity**: District $\times$ Month ($640$ Census historical districts).
- **Out of Scope**:
  - Individual offender or victim identity prediction
  - Crime-type multiclass breakdown (reserved for separate downstream classifiers)
  - Police officer identity prediction

---

## 5. Artifact Serialization & Model Registry

| Component | Path / Location | Format | Description |
| :--- | :--- | :---: | :--- |
| **Model Weights** | `ml/saved_models/production_hgbr_v1.joblib` | Joblib | Serialized model parameters |
| **Model Metadata** | `ml/saved_models/production_model_metadata_v1.json` | JSON | Complete provenance, hyperparams, and test metrics |
| **Database Registry** | MySQL `ml_models` (Table ID `1`) | RDBMS | Active production flag (`is_active = TRUE`), snapshot |

---

## 6. Database Storage & Idempotent Strategy

Predictions are stored in the MySQL table `crime_predictions`:
- **Unique Constraint**: `uq_pred_district_date_model (district_id, prediction_date, model_id)`
- **Stored Volumes**:
  - Evaluated 2025 monthly test series: $12 \text{ months} \times 640 \text{ districts} = 7,680$ records.
  - Forward operational forecast for January 2026: $1 \text{ month} \times 640 \text{ districts} = 640$ records.
  - **Total**: $8,320$ records.
- **Idempotence**: `ON DUPLICATE KEY UPDATE predicted_crime_count = VALUES(predicted_crime_count), generated_at = NOW()` ensures re-running the population pipeline will never duplicate records.

---

## 7. Backend API Specification

All prediction routes are protected by JWT Bearer authentication (`Depends(get_current_user)`):

### 1. `GET /api/v1/predictions/overview`
Returns high-level statistics across all stored predictions:
- `total_predictions`: `8320`
- `districts_covered`: `640`
- `earliest_period`: `2025-01-01`
- `latest_period`: `2026-01-01`
- `active_model_name`: `HGBR production forecasting model v1`
- `active_model_version`: `v1.0.0`
- `top_predicted_districts`: Top 5 highest projected volume districts for the latest period

### 2. `GET /api/v1/predictions`
Lists predictions with optional filters:
- Parameters:
  - `state_id`: Optional[int]
  - `district_id`: Optional[int]
  - `forecast_period`: Optional[str] (e.g. `2026-01-01`)
  - `model_version`: Optional[str] (e.g. `v1.0.0`)
  - `skip`: int (default `0`)
  - `limit`: int (default `100`, max `1000`)
- Returns `{"total": int, "items": [...]}`

### 3. `GET /api/v1/predictions/{district_id}`
Returns complete longitudinal forecast timeline for a specific district:
- `district_id`, `district_name`, `state_id`, `state_name`
- `series`: List of monthly predictions sorted chronologically

### 4. `GET /api/v1/predictions/model`
Returns active production model information, hyperparameters, and verified Phase 8C test evaluation metrics.

---

## 8. Known Operational Limitations

1. **One-Month Operational Horizon**: Multi-month recursive forecasting beyond 1 month ahead requires iteratively predicting lags; projecting months beyond $t+1$ without fresh data introduces compounding uncertainty.
2. **Static Census Baseline**: Socioeconomic and demographic predictors reflect the Census 2011 decennial survey; rapid recent urbanization is captured indirectly via autoregressive crime volume indicators.
3. **Zero-Inflation in Rural Districts**: Low-volume rural districts frequently observe 0–2 incidents per month; Poisson-type or zero-inflated adjustments may provide finer granularity for sparse areas in future iterations.
