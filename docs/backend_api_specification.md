# Phase 4 — Backend Data-Access, Analytics & REST API Specification

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Database**: MySQL (`crime_management_db`) — 17 Frozen Normalized Tables  
**Framework**: FastAPI, SQLAlchemy 2.x, Pydantic v2, Uvicorn  
**Dataset Scale**: 191,679 Verified Crime Incidents, 35 States, 640 Districts  

---

## 1. Architectural Architecture

The Phase 4 backend implements a clean, layered enterprise architecture:

```text
React Frontend (Vite)
       │ HTTP / REST JSON
       ▼
API Routers (`backend/app/api/v1/`)
       │
Service Layer (`backend/app/services/`)
       │
Repository Layer (`backend/app/repositories/`)
       │ SQLAlchemy 2.0 ORM Queries
       ▼
MySQL 8.0 Database (`crime_management_db`)
```

- **Zero Mock Data**: Every number, percentage, count, and demographic metric is calculated live from the relational database via optimized SQL aggregation queries.
- **Strict Typing**: All responses are validated against Pydantic v2 models.
- **Query Optimization**: Leverages B-Tree indexes on `state_id`, `district_id`, `crime_type_id`, `incident_date`, and `case_closed`.

---

## 2. Server Base URLs & Documentation

| Resource | URL |
| :--- | :--- |
| **API Base URL** | `http://127.0.0.1:8000/api/v1` |
| **Interactive Swagger UI** | `http://127.0.0.1:8000/docs` (redirects to `/api/v1/docs`) |
| **ReDoc Documentation** | `http://127.0.0.1:8000/redoc` (redirects to `/api/v1/redoc`) |
| **OpenAPI Schema (JSON)** | `http://127.0.0.1:8000/api/v1/openapi.json` |

---

## 3. System & Health Endpoints

### 3.1. Root Health Check
- **Endpoint**: `GET /health`
- **Description**: Lightweight health probe for load balancers / monitoring.
- **Response `200 OK`**:
```json
{
  "status": "ok"
}
```

### 3.2. Detailed Health & DB Probe
- **Endpoint**: `GET /api/v1/health`
- **Description**: Probes active database connectivity with `SELECT 1;`.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 4. Geography Endpoints

### 4.1. List All States
- **Endpoint**: `GET /api/v1/geography/states`
- **Summary**: Retrieve all Indian States and Union Territories.
- **Response `200 OK`**:
```json
{
  "total": 35,
  "items": [
    {
      "id": 1,
      "state_name": "ANDAMAN AND NICOBAR ISLANDS",
      "state_code": "AN"
    },
    {
      "id": 2,
      "state_name": "ANDHRA PRADESH",
      "state_code": "AP"
    }
  ]
}
```

### 4.2. List Districts
- **Endpoint**: `GET /api/v1/geography/districts`
- **Query Parameters**:
  - `state_id` *(optional, integer)*: Filter districts belonging to a specific state.
- **Response `200 OK`**:
```json
{
  "total": 640,
  "items": [
    {
      "id": 1,
      "state_id": 1,
      "state_name": "ANDAMAN AND NICOBAR ISLANDS",
      "district_name": "Nicobars",
      "census_district_code": 638
    }
  ]
}
```

### 4.3. District Detail & Demographics
- **Endpoint**: `GET /api/v1/geography/districts/{district_id}`
- **Path Parameters**:
  - `district_id` *(required, integer, ge=1)*: District primary key.
- **Description**: Joins the district with its Census 2011 demographic profile.
- **Response `200 OK`**:
```json
{
  "id": 1,
  "state_id": 1,
  "state_name": "ANDAMAN AND NICOBAR ISLANDS",
  "district_name": "Nicobars",
  "census_district_code": 638,
  "demographics": {
    "census_year": 2011,
    "total_population": 36842,
    "male_population": 20727,
    "female_population": 16115,
    "literate_population": 25332,
    "total_workers": 17125
  }
}
```
- **Error Response `404 Not Found`**:
```json
{
  "detail": "District with ID 99999 not found"
}
```

---

## 5. Crime Analytics Endpoints

### 5.1. Crime Intelligence Overview
- **Endpoint**: `GET /api/v1/analytics/overview`
- **Query Parameters**:
  - `state_id` *(optional, integer)*
  - `district_id` *(optional, integer)*
  - `start_date` *(optional, date: YYYY-MM-DD)*
  - `end_date` *(optional, date: YYYY-MM-DD)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "total_incidents": 191679,
  "total_districts": 640,
  "total_states": 35,
  "total_crime_types": 21,
  "total_crime_categories": 4,
  "cases": {
    "closed": 93490,
    "open": 98189,
    "clearance_rate_pct": 48.77
  },
  "earliest_incident_date": "2020-01-01",
  "latest_incident_date": "2025-12-31",
  "filtered_by_state_id": null,
  "filtered_by_district_id": null
}
```

### 5.2. Longitudinal Crime Trends
- **Endpoint**: `GET /api/v1/analytics/trends`
- **Query Parameters**:
  - `interval` *(optional, string: `year` | `month` | `day`, default: `month`)*
  - `state_id` *(optional, integer)*
  - `district_id` *(optional, integer)*
  - `start_date` *(optional, date: YYYY-MM-DD)*
  - `end_date` *(optional, date: YYYY-MM-DD)*
- **Response `200 OK` (Example: `interval=year`)**:
```json
{
  "interval": "year",
  "total_points": 6,
  "items": [
    { "period": "2020", "incident_count": 31920 },
    { "period": "2021", "incident_count": 32014 },
    { "period": "2022", "incident_count": 32105 },
    { "period": "2023", "incident_count": 31890 },
    { "period": "2024", "incident_count": 31950 },
    { "period": "2025", "incident_count": 31800 }
  ]
}
```

### 5.3. Crime Distribution by Domain / Category
- **Endpoint**: `GET /api/v1/analytics/by-category`
- **Query Parameters**:
  - `state_id`, `district_id`, `start_date`, `end_date` *(optional)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "total_incidents": 191679,
  "items": [
    {
      "category_id": 4,
      "category_name": "Other Crime",
      "severity_weight": 1.0,
      "incident_count": 114076,
      "percentage": 59.51
    },
    {
      "category_id": 1,
      "category_name": "Violent Crime",
      "severity_weight": 1.5,
      "incident_count": 52019,
      "percentage": 27.14
    },
    {
      "category_id": 2,
      "category_name": "Fire Accident",
      "severity_weight": 1.2,
      "incident_count": 17521,
      "percentage": 9.14
    },
    {
      "category_id": 3,
      "category_name": "Traffic Fatality",
      "severity_weight": 1.1,
      "incident_count": 8063,
      "percentage": 4.21
    }
  ]
}
```

### 5.4. Crime Distribution by Legal Crime Type
- **Endpoint**: `GET /api/v1/analytics/by-type`
- **Query Parameters**:
  - `category_id` *(optional, integer)*: Filter to a specific domain (e.g. violent only).
  - `state_id`, `district_id`, `start_date`, `end_date` *(optional)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "total_incidents": 191679,
  "items": [
    {
      "crime_type_id": 17,
      "crime_code": "CR-017",
      "crime_name": "ILLEGAL POSSESSION",
      "category_name": "Other Crime",
      "severity_level": "MEDIUM",
      "incident_count": 11627,
      "percentage": 6.07
    },
    {
      "crime_type_id": 13,
      "crime_code": "CR-013",
      "crime_name": "PUBLIC MISCONDUCT",
      "category_name": "Other Crime",
      "severity_level": "LOW",
      "incident_count": 10565,
      "percentage": 5.51
    }
  ]
}
```

### 5.5. Hourly Distribution & Peak Patrol Hour
- **Endpoint**: `GET /api/v1/analytics/hourly`
- **Query Parameters**:
  - `state_id`, `district_id` *(optional)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "peak_hour": 18,
  "items": [
    { "hour": 0, "incident_count": 7820, "percentage": 4.08 },
    { "hour": 18, "incident_count": 10760, "percentage": 5.61 }
  ]
}
```

### 5.6. Victim Demographics Breakdown
- **Endpoint**: `GET /api/v1/analytics/demographics`
- **Query Parameters**:
  - `state_id`, `district_id` *(optional)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "gender_distribution": {
    "F": 107326,
    "M": 63974,
    "UNKNOWN": 20379
  },
  "age_distribution": {
    "0-18": 24579,
    "19-35": 47002,
    "36-50": 40980,
    "51-65": 40187,
    "65+": 38931
  },
  "average_age": 44.5
}
```

### 5.7. Weapon Involvement Distribution
- **Endpoint**: `GET /api/v1/analytics/weapons`
- **Query Parameters**:
  - `state_id`, `district_id` *(optional)*
- **Response `200 OK` (Live DB Verified)**:
```json
{
  "total_incidents": 191679,
  "items": [
    { "weapon_name": "KNIFE", "incident_count": 32293, "percentage": 16.85 },
    { "weapon_name": "FIREARM", "incident_count": 31920, "percentage": 16.65 },
    { "weapon_name": "BLUNT OBJECT", "incident_count": 31885, "percentage": 16.63 },
    { "weapon_name": "POISON", "incident_count": 31881, "percentage": 16.63 },
    { "weapon_name": "EXPLOSIVES", "incident_count": 31853, "percentage": 16.62 },
    { "weapon_name": "OTHER", "incident_count": 31847, "percentage": 16.61 }
  ]
}
```

### 5.8. Top Crime-Prone Districts (Volume vs. Rate)
- **Endpoint**: `GET /api/v1/analytics/top-districts`
- **Query Parameters**:
  - `metric` *(string: `volume` | `rate`, default: `volume`)*
  - `limit` *(integer: 1 to 100, default: 10)*
  - `state_id` *(optional, integer)*
- **Response `200 OK` (Volume Ranking)**:
```json
{
  "metric": "volume",
  "items": [
    {
      "district_id": 398,
      "district_name": "Thane",
      "state_name": "MAHARASHTRA",
      "incident_count": 1283,
      "total_population": 11060148,
      "crime_rate_per_100k": 11.6
    }
  ]
}
```
- **Response `200 OK` (Per-Capita Rate Ranking, per 100,000 citizens)**:
```json
{
  "metric": "rate",
  "items": [
    {
      "district_id": 257,
      "district_name": "Dibang Valley",
      "state_name": "ARUNACHAL PRADESH",
      "incident_count": 70,
      "total_population": 8004,
      "crime_rate_per_100k": 874.56
    }
  ]
}
```

---

## 6. Verification and Test Results

Automated test suite `backend/tests/test_api_endpoints.py` executes 12 integration suites verifying:
1. Exact row count parity (`191,679` incidents).
2. Category count parity (`4` categories, sum equals `191,679`).
3. Year aggregate sum equality (`191,679`).
4. 24 continuous hourly bins (`0` to `23` hours).
5. Demographics gender and age group consistency.
6. 404 response handling for non-existent district lookups.
7. Database connection resilience on health probe.

**Result**: 100% tests passing against live MySQL database.
