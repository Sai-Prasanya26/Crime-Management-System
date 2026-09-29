# Phase 3B: Data Cleaning, Transformation & Database Import Pipeline

This directory contains the reproducible ingestion pipeline that cleans, validates, normalizes, and loads the approved raw datasets into `crime_management_db`.

## Pipeline Architecture

```text
Raw Source Datasets
├── data_import/raw/crime_dataset_nationwide.csv (191,679 rows)
└── data_import/raw/india-districts-census-2011.csv (640 rows)
                    │
                    ▼
          import_pipeline.py
                    │
   ┌────────────────┼────────────────┐
   │                │                │
   ▼                ▼                ▼
States &        Demographics      Crime Taxonomy &
Districts       (Census 2011)     Incidents (191,679)
(35 & 640)         (640)          (4 Domains, 21 Types)
```

## Scripts

- **`import_pipeline.py`**: Complete automated ETL script.
  - Truncates existing tables in dependency order.
  - Normalizes 35 States and 640 Districts.
  - Maps official Census District Codes from Census 2011.
  - Ingests 640 demographic profiles (Population, Male, Female, Literate, Workers).
  - Establishes master crime domains and legal types with project-defined severity weights and tiers.
  - Ingests all 191,679 historical incident records in high-performance batches.
  - Inserts master resource types and baseline configurable cost policies.

## Execution

From the project root:

```powershell
backend\.venv\Scripts\python.exe data_import\import_pipeline.py
```

## Summary Statistics

| Table Name | Source Dataset | Rows Ingested | Key Characteristics |
|---|---|---:|---|
| `states` | `crime_dataset_nationwide.csv` | **35** | Standardized uppercase state names |
| `districts` | `crime_dataset_nationwide.csv` | **640** | Linked to `states`; mapped to Census codes |
| `district_demographics` | `india-districts-census-2011.csv` | **640** | Total population: 1,210,854,977; 5 core metrics |
| `crime_categories` | `crime_dataset_nationwide.csv` | **4** | Violent Crime (1.5), Fire Accident (1.2), Traffic (1.1), Other (1.0) |
| `crime_types` | `crime_dataset_nationwide.csv` | **21** | Standardized legal crime codes with severity ranks |
| `resource_types` | Master Configuration | **4** | Police Officers, Patrol Vehicles, Investigation Teams, Surveillance Units |
| `resource_costs` | Master Configuration | **4** | Baseline active cost schedules in INR |
| `crime_incidents` | `crime_dataset_nationwide.csv` | **191,679** | 2020-01-01 to 2025-12-31; 93,490 closed, 98,189 open |
| `district_resources` | Application Runtime | **0** | Zero fake data |
| `ml_models` | ML Training Pipeline | **0** | Zero fake models |
| `crime_predictions` | ML Inference Pipeline | **0** | Zero fake predictions |
| `crime_risk_scores` | Risk Engine Service | **0** | Zero fake scores |
| `resource_recommendations` | Optimization Service | **0** | Zero fake recommendations |
| `budget_estimations` | Budget Service | **0** | Zero fake budgets |
| `users` | Auth Registration | **0** | Zero fake users |
| `audit_logs` | Audit Middleware | **0** | Clean baseline |
| `generated_reports` | Report Generator | **0** | Clean baseline |
| **Total Ingested** | - | **193,027** | Execution time: ~44 seconds |
