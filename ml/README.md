# Machine Learning Pipeline Architecture

This module implements the predictive time-series machine learning architecture for the Data-Driven Crime Management System.

---

## 1. Overview & Data Provenance

- **Primary Source of Truth**: MySQL database (`crime_management_db`).
- **Entity Scope**: 640 Census 2011 historical districts (`districts` where `is_census_2011 = 1`).
- **Incident Scope**: 191,679 historical crime incidents from `crime_incidents` (2020-01-01 to 2025-12-31).
- **Demographics Scope**: Census 2011 district demographic profiles from `district_demographics` (640 records).
- **Balanced Panel Grid**: 640 districts $\times$ 72 months = **46,080 rows**.
  - Active incident months: 42,753
  - Zero-incident months: 3,327 (preserved as `incident_count = 0`)

---

## 2. Directory Layout & Pipeline Modules

```
ml/
├── data/                                         # Working ML datasets (ignored by git)
│   ├── .gitkeep
│   ├── district_month_panel.parquet              # Full 46,080 panel grid
│   └── panel_features_2020_2025.parquet          # Clean 38,400 feature modeling dataset
├── preprocessing/
│   ├── __init__.py
│   └── panel_builder.py                          # SQL aggregation -> 46,080 Cartesian panel
├── feature_engineering/
│   ├── __init__.py
│   └── feature_pipeline.py                       # Lags, rolling stats, demographics, split assignment
├── training/                                     # Model training scripts (Phase 8C)
│   └── __init__.py
├── evaluation/                                   # Model evaluation & metrics (Phase 8D)
│   └── __init__.py
├── inference/                                    # Serving wrappers (Phase 9)
│   └── __init__.py
├── saved_models/                                 # Serialized model artifacts (.joblib)
│   └── .gitkeep
└── README.md                                     # Pipeline documentation
```

---

## 3. Feature Dictionary & Leakage Risk Assessment

The feature matrix contains **25 engineered predictor columns** and 1 isolated target column.

| Feature Name | Feature Type | Description | Leakage Risk & Prevention |
|---|---|---|---|
| `district_id` | Geographic Identifier | Census 2011 historical district ID ($1 \dots 640$) | Safe (Static identifier) |
| `state_id` | Geographic Identifier | State or Union Territory identifier | Safe (Static identifier) |
| `year` | Temporal Calendar | Observation calendar year (2021 to 2025) | Safe (Known at forecast time) |
| `month` | Temporal Calendar | Observation month of year ($1 \dots 12$) | Safe (Known at forecast time) |
| `quarter` | Temporal Calendar | Observation quarter of year ($1 \dots 4$) | Safe (Known at forecast time) |
| `year_index` | Temporal Trend | Monotonic year counter ($0 \dots 5$) | Safe (Known at forecast time) |
| `sin_month` | Cyclical Harmonic | $\sin(2\pi \cdot \text{month} / 12)$ | Safe (Cyclical seasonal representation) |
| `cos_month` | Cyclical Harmonic | $\cos(2\pi \cdot \text{month} / 12)$ | Safe (Cyclical seasonal representation) |
| `lag_1` | Autoregressive Lag | Incident count at month $t-1$ | Safe (Strictly backward-looking via `shift(1)`) |
| `lag_2` | Autoregressive Lag | Incident count at month $t-2$ | Safe (Strictly backward-looking via `shift(2)`) |
| `lag_3` | Autoregressive Lag | Incident count at month $t-3$ | Safe (Strictly backward-looking via `shift(3)`) |
| `lag_12` | Seasonal Lag | Incident count at month $t-12$ (same month prior year) | Safe (Strictly backward-looking via `shift(12)`) |
| `rolling_mean_3` | Trailing Moving Average | Mean incident count over $[t-3, t-2, t-1]$ | Safe (`shift(1)` applied before rolling) |
| `rolling_mean_6` | Trailing Moving Average | Mean incident count over $[t-6 \dots t-1]$ | Safe (`shift(1)` applied before rolling) |
| `rolling_mean_12` | Trailing Moving Average | Mean incident count over $[t-12 \dots t-1]$ | Safe (`shift(1)` applied before rolling) |
| `rolling_std_6` | Trailing Volatility | Standard deviation over $[t-6 \dots t-1]$ | Safe (`shift(1)` applied before rolling) |
| `total_population` | Static Demographic | Census 2011 district total population | Safe (Historical baseline) |
| `male_population` | Static Demographic | Census 2011 district male population | Safe (Historical baseline) |
| `female_population` | Static Demographic | Census 2011 district female population | Safe (Historical baseline) |
| `literate_population` | Static Demographic | Census 2011 district literate population | Safe (Historical baseline) |
| `total_workers` | Static Demographic | Census 2011 district worker population | Safe (Historical baseline) |
| `gender_ratio` | Static Demographic | Female population / Male population | Safe (Historical baseline) |
| `literacy_rate` | Static Demographic | Literate population / Total population | Safe (Historical baseline) |
| `worker_ratio` | Static Demographic | Total workers / Total population | Safe (Historical baseline) |
| `historical_crime_rate_per_100k` | Trailing Crime Rate | $(\text{rolling\_mean\_12} / \text{total\_population}) \times 100,000$ | Safe (Uses strictly prior-12-months volume) |
| **`target_incident_count`** | **TARGET VARIABLE** | Actual incident count for predicted month $t$ | **ISOLATED** (Never present in feature set $X$) |

### Explicitly Excluded Post-Incident Attributes (Leakage Prevention)
The following attributes from the raw database records are strictly excluded from the ML feature set because they are determined during or after an incident occurs:
- `police_deployed_count`: Reactive tactical deployment dispatched after incident reporting.
- `case_status`: Judicial investigation status determined weeks or months later.
- `closed_date`: Date case closed by law enforcement/judiciary.
- `reported_date`: Date FIR filed.
- `report_number`: Post-incident unique administrative case identifier.
- `victim_age`, `victim_gender`, `weapon_used`: Micro-level individual properties of uncommitted future incidents do not exist at forecast time.

---

## 4. Warm-Up Handling & Dataset Partitioning

- **Warm-Up Period (Calendar Year 2020)**:
  - Because `lag_12` and `rolling_mean_12` require 12 prior months of historical data, months in 2020 (periods 2020-01 to 2020-12) cannot have valid 12-month lag values.
  - Exactly $640 \text{ districts} \times 12 \text{ months} = \mathbf{7,680 \text{ rows}}$ are labeled as `WARMUP` and dropped from the supervised learning matrix.
- **Clean Modeling Dataset (2021 to 2025)**:
  - Total modeling observations: $46,080 - 7,680 = \mathbf{38,400 \text{ rows}}$ with **0 missing values**.
- **Chronological Data Splits**:
  - **TRAIN**: 2021-01 to 2023-12 (36 months $\times$ 640 districts = **23,040 rows**, 60.0%)
  - **VALIDATION**: 2024-01 to 2024-12 (12 months $\times$ 640 districts = **7,680 rows**, 20.0%)
  - **TEST**: 2025-01 to 2025-12 (12 months $\times$ 640 districts = **7,680 rows**, 20.0%)
- **Walk-Forward Validation Folds**:
  - *Fold 1*: Train 2021–2022 (15,360 rows) $\rightarrow$ Validate 2023 (7,680 rows)
  - *Fold 2*: Train 2021–2023 (23,040 rows) $\rightarrow$ Validate 2024 (7,680 rows)
  - *Fold 3*: Train 2021–2024 (30,720 rows) $\rightarrow$ Test 2025 (7,680 rows)

---

## 5. Pipeline Execution Instructions

To rebuild the panel and re-generate the feature dataset from MySQL:

```bash
# 1. Build balanced district-month panel
python -m ml.preprocessing.panel_builder

# 2. Run feature engineering pipeline and generate clean parquet dataset
python -m ml.feature_engineering.feature_pipeline

# 3. Run automated data quality and leakage test suite
python backend/tests/test_ml_preprocessing.py
```
