# Phase 2 — Application Data Dictionary (Audited & Frozen)

This document defines all fields that will actually be maintained and utilized by the application, database, machine learning pipelines, and decision-support services.

---

## 1. Geography Domain

### Table: `states`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique surrogate identifier for the state. |
| `state_name` | VARCHAR(100) | NO | UNIQUE | Official name of the Indian State / Union Territory (e.g., 'MAHARASHTRA'). |
| `state_code` | VARCHAR(10) | YES | INDEX | Standard ISO/postal abbreviation (e.g., 'MH'). |

### Table: `districts`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique surrogate identifier for the district. |
| `state_id` | INT | NO | FK (`states.id`) | Foreign key linking district to its parent state. |
| `district_name` | VARCHAR(100) | NO | INDEX | Name of the administrative district (e.g., 'Pune'). |
| `census_district_code` | INT | YES | UNIQUE | Official 2011 Census district identification number; used to bind with GeoJSON map boundaries. |

*(Note: Coordinates are not present in raw CSVs and are omitted to avoid fabricating fake lat/long. Map visualization binds via `district_name` / `census_district_code` to GeoJSON features in Phase 15).*

*(Note: The `cities` table has been removed as an audit verified that `City` in the raw data is 100% duplicate of `District name` on all 191,679 rows).*

---

## 2. Demographic Baseline Domain

### Table: `district_demographics`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for demographic record. |
| `district_id` | INT | NO | FK (`districts.id`), UNIQUE | Unique foreign key linking to administrative district. |
| `census_year` | SMALLINT | NO | DEFAULT 2011 | Baseline census enumeration year (Census 2011). |
| `total_population` | BIGINT | NO | - | Total enumerated population in district (used for per-capita rates and policing ratios). |
| `male_population` | BIGINT | NO | - | Total male population count. |
| `female_population` | BIGINT | NO | - | Total female population count. |
| `literate_population` | BIGINT | NO | - | Total literate population count (used for literacy rate calculations). |
| `total_workers` | BIGINT | NO | - | Total engaged labor force count. |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp. |

*(Note: Household counts [urban, rural, total] and religious breakdowns were audited and removed as they are not required by any project feature).*

---

## 3. Crime Taxonomy & Incidents Domain

### Table: `crime_categories`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for crime category/domain. |
| `category_name` | VARCHAR(50) | NO | UNIQUE | Domain designation ('Violent Crime', 'Other Crime', 'Traffic Fatality', 'Fire Accident'). |
| `severity_weight` | DECIMAL(3, 2) | NO | DEFAULT 1.00 | **Project-defined** heuristic severity multiplier (not from raw CSV) used in composite Risk Score calculations; configurable by admin. |

### Table: `crime_types`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for crime sub-type. |
| `category_id` | INT | NO | FK (`crime_categories.id`) | Foreign key linking crime type to broader domain. |
| `crime_code` | VARCHAR(20) | NO | UNIQUE | Standardized legal code (e.g., '110', '128', '276'). |
| `crime_name` | VARCHAR(100) | NO | - | Official crime nomenclature (e.g., 'HOMICIDE', 'BURGLARY', 'ROBBERY'). |
| `severity_level` | ENUM | NO | DEFAULT 'MEDIUM' | **Project-defined** categorical severity rank ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') based on IPC legal principles; configurable by admin. |

### Table: `crime_incidents`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Primary surrogate key for incident record. |
| `report_number` | VARCHAR(50) | NO | UNIQUE | Unique agency case tracking number (e.g., 'NR00191394'). |
| `district_id` | INT | NO | FK (`districts.id`) | Foreign key linking incident to administrative district. |
| `crime_type_id` | INT | NO | FK (`crime_types.id`) | Foreign key linking to standardized crime type. |
| `incident_date` | DATE | NO | INDEX | Date when the crime occurred. |
| `incident_time` | TIME | NO | - | Time of occurrence (24-hour format). |
| `reported_date` | DATE | NO | - | Date when incident was formally reported. |
| `victim_age` | SMALLINT | YES | - | Age of victim in years (filtered for positive integers < 120). |
| `victim_gender` | ENUM | NO | DEFAULT 'UNKNOWN' | Gender classification: 'M', 'F', 'OTHER', 'UNKNOWN'. |
| `weapon_used` | VARCHAR(50) | YES | - | Weapon involved: 'FIREARM', 'KNIFE', 'BLUNT OBJECT', 'POISON', 'EXPLOSIVES', 'OTHER'. Missing values are preserved as NULL (unknown/unrecorded). |
| `police_deployed_count`| SMALLINT | NO | DEFAULT 0 | **Historical single-incident response presence** (officers dispatched to this specific past scene). Not to be confused with ongoing district inventory. |
| `case_status` | ENUM | NO | DEFAULT 'OPEN' | Clearance state: 'OPEN', 'CLOSED'. |
| `closed_date` | DATE | YES | - | Closure date (null while case is open). |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Ingestion timestamp into MySQL. |

---

## 4. Police Resource & Cost Management Domain

### Table: `resource_types`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for resource type. |
| `resource_name` | VARCHAR(100) | NO | UNIQUE | Descriptive title ('Police Officers', 'Patrol Vehicles', 'Investigation Teams', 'Surveillance Units'). |
| `unit_of_measure` | VARCHAR(30) | NO | - | Accounting unit ('Personnel', 'Vehicles', 'Teams', 'Units'). |
| `description` | TEXT | YES | - | Operational role and deployment guidelines. |
| `is_active` | BOOLEAN | NO | DEFAULT TRUE | Operational availability flag. |

### Table: `resource_costs`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for cost configuration. |
| `resource_type_id` | INT | NO | FK (`resource_types.id`) | Target resource type. |
| `unit_cost` | DECIMAL(12, 2) | NO | - | Operational cost per unit per planning period (in INR). Configurable by admin. |
| `effective_from` | DATE | NO | - | Date when this unit cost schedule becomes active. |
| `effective_to` | DATE | YES | - | Expiration date of cost schedule (NULL if currently active). |
| `is_active` | BOOLEAN | NO | DEFAULT TRUE | Active cost schedule indicator. |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Configuration creation timestamp. |

### Table: `district_resources`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique identifier for district resource inventory. |
| `district_id` | INT | NO | FK (`districts.id`) | District where resources are stationed. |
| `resource_type_id` | INT | NO | FK (`resource_types.id`) | Resource type. |
| `available_quantity`| INT | NO | DEFAULT 0 | **Current operational inventory** stationed in the district, configured by administrators. |
| `period_year` | SMALLINT | NO | - | Active inventory year. |
| `period_month` | SMALLINT | NO | - | Active inventory month (1 to 12). |
| `updated_at` | TIMESTAMP | NO | ON UPDATE CURRENT_TIMESTAMP | Last inventory update timestamp. |

---

## 5. Machine Learning, Predictions & Evaluation Domain

### Table: `ml_models`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique model registry identifier. |
| `model_name` | VARCHAR(100) | NO | - | Model title (e.g., 'DistrictCrimeForecaster'). |
| `model_type` | VARCHAR(50) | NO | - | Formulation type ('REGRESSION', 'TIME_SERIES', 'CLASSIFIER'). |
| `version` | VARCHAR(20) | NO | - | Semantic version string ('v1.0.0'). |
| `algorithm` | VARCHAR(100) | NO | - | Underlying algorithm ('RandomForestRegressor', 'GradientBoosting', 'ARIMA'). |
| `evaluation_metrics` | JSON | NO | - | Performance metrics: `{"mae": 3.42, "rmse": 4.88, "r2": 0.86}`. |
| `training_date` | DATETIME | NO | - | Training execution timestamp. |
| `dataset_snapshot` | VARCHAR(100) | NO | - | Reference to dataset window utilized for training. |
| `artifact_path` | VARCHAR(255) | NO | - | Filesystem location of serialized `.joblib` model artifact. |
| `is_active` | BOOLEAN | NO | DEFAULT FALSE | Designates whether this model is actively serving predictions. |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Registry entry creation timestamp. |

### Table: `crime_predictions`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Unique prediction record key. |
| `district_id` | INT | NO | FK (`districts.id`) | Target district for predicted crime. |
| `crime_type_id` | INT | YES | FK (`crime_types.id`) | Target crime type (NULL represents aggregate total crime). |
| `model_id` | INT | NO | FK (`ml_models.id`) | Model version utilized for inference. |
| `prediction_date` | DATE | NO | INDEX | Target prediction period date (e.g. first of forecast month). |
| `predicted_crime_count` | DECIMAL(10, 2) | NO | - | Model forecasted volume of crime incidents. |
| `confidence_lower` | DECIMAL(10, 2) | YES | - | Lower bound of 95% confidence interval. |
| `confidence_upper` | DECIMAL(10, 2) | YES | - | Upper bound of 95% confidence interval. |
| `generated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Inference execution timestamp. |

---

## 6. Crime Risk Assessment Domain

### Table: `crime_risk_scores`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Unique risk score identifier. |
| `district_id` | INT | NO | FK (`districts.id`) | Evaluated administrative district. |
| `period_year` | SMALLINT | NO | - | Evaluation year. |
| `period_month` | SMALLINT | NO | - | Evaluation month (1-12). |
| `overall_risk_score`| DECIMAL(5, 2) | NO | - | Normalized composite risk index (0.00 to 100.00). |
| `risk_level` | ENUM | NO | - | Categorical risk grade: 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'. |
| `severity_index` | DECIMAL(5, 2) | NO | - | Weighted incident severity score component. |
| `trend_index` | DECIMAL(5, 2) | NO | - | Longitudinal velocity score component (momentum). |
| `volume_index` | DECIMAL(5, 2) | NO | - | Per-capita crime density score component. |
| `population_density_factor` | DECIMAL(5, 2) | NO | - | Demographic exposure coefficient. |
| `calculation_version` | VARCHAR(20) | NO | DEFAULT 'v1.0' | Algorithmic scoring formula revision identifier. |
| `generated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Risk evaluation generation timestamp. |

---

## 7. Resource Optimization & Budget Estimation Domain

### Table: `resource_recommendations`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Unique recommendation record identifier. |
| `district_id` | INT | NO | FK (`districts.id`) | Beneficiary district. |
| `resource_type_id` | INT | NO | FK (`resource_types.id`) | Allocated resource category. |
| `period_year` | SMALLINT | NO | - | Target planning year. |
| `period_month` | SMALLINT | NO | - | Target planning month (1-12). |
| `available_quantity`| INT | NO | - | Current inventory on record from `district_resources`. |
| `recommended_quantity` | INT | NO | - | AI optimization recommendation based on risk and predicted crime load. |
| `shortfall_quantity` | INT | NO | - | Computed discrepancy (`recommended - available`). Positive indicates deficit. |
| `optimization_rationale` | TEXT | YES | - | Explainable AI rationale for operational auditing. |
| `model_id` | INT | YES | FK (`ml_models.id`) | Forecasting model providing underlying predictions. |
| `generated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Optimization calculation timestamp. |

### Table: `budget_estimations`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Unique budget calculation identifier. |
| `district_id` | INT | NO | FK (`districts.id`) | Beneficiary district. |
| `resource_type_id` | INT | NO | FK (`resource_types.id`) | Costed resource category. |
| `period_year` | SMALLINT | NO | - | Planning budget year. |
| `period_month` | SMALLINT | NO | - | Planning budget month. |
| `recommended_units`| INT | NO | - | Recommended unit count to fund. |
| `unit_cost` | DECIMAL(12, 2) | NO | - | Active cost basis per unit from `resource_costs`. |
| `estimated_total_cost` | DECIMAL(14, 2) | NO | - | Estimated operational budget (`recommended_units * unit_cost`). |
| `currency` | VARCHAR(10) | NO | DEFAULT 'INR' | Currency denomination code. |
| `cost_config_id` | INT | NO | FK (`resource_costs.id`) | Specific cost policy applied. |
| `generated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Budget generation timestamp. |

---

## 8. Authentication, Authorization & Audit Domain

### Table: `users`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique user identifier. |
| `username` | VARCHAR(50) | NO | UNIQUE | Unique alphanumeric login username. |
| `email` | VARCHAR(100) | NO | UNIQUE | Official contact email address. |
| `password_hash` | VARCHAR(255) | NO | - | Secure salted hash (Bcrypt / Argon2). |
| `full_name` | VARCHAR(100) | NO | - | Personnel full legal name. |
| `role` | ENUM | NO | DEFAULT 'ANALYST' | Role-based permission level: 'ADMIN', 'ANALYST', 'OFFICER'. |
| `is_active` | BOOLEAN | NO | DEFAULT TRUE | Account state flag. |
| `last_login_at` | DATETIME | YES | - | Last recorded successful login. |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp. |
| `updated_at` | TIMESTAMP | NO | ON UPDATE CURRENT_TIMESTAMP | Account modification timestamp. |

### Table: `audit_logs`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | BIGINT | NO | PK, AUTO_INCREMENT | Unique audit entry key. |
| `user_id` | INT | YES | FK (`users.id`) | Actor executing operation (NULL for automated system tasks). |
| `action` | VARCHAR(50) | NO | - | Executed command: 'LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'RETRAIN_MODEL', 'EXPORT_REPORT'. |
| `entity_type` | VARCHAR(50) | NO | - | Affected module: 'USER', 'RESOURCE_COST', 'ML_MODEL', 'REPORT'. |
| `entity_id` | VARCHAR(50) | YES | - | Identifier of the modified entity. |
| `details` | JSON | YES | - | Audit payload containing before/after states or parameters. |
| `ip_address` | VARCHAR(45) | YES | - | Client IPv4/IPv6 address. |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Audit log recording timestamp. |

---

## 9. Reports Domain

### Table: `generated_reports`
| Field Name | Type | Nullable | Constraints | Description |
|---|---|---|---|---|
| `id` | INT | NO | PK, AUTO_INCREMENT | Unique report record identifier. |
| `report_title` | VARCHAR(150) | NO | - | Descriptive report headline. |
| `report_type` | ENUM | NO | - | Category: 'DISTRICT_INTELLIGENCE', 'RESOURCE_OPTIMIZATION', 'BUDGET_ESTIMATION', 'EXECUTIVE_SUMMARY'. |
| `generated_by_user_id` | INT | NO | FK (`users.id`) | Operator who triggered report generation. |
| `district_id` | INT | YES | FK (`districts.id`) | District scope (NULL if state or national summary). |
| `period_year` | SMALLINT | NO | - | Reporting period year. |
| `period_month` | SMALLINT | YES | - | Reporting period month. |
| `file_path` | VARCHAR(255) | NO | - | Internal disk storage path to generated PDF artifact. |
| `file_size_bytes` | INT | NO | - | PDF document size in bytes. |
| `generated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP | Report creation timestamp. |
