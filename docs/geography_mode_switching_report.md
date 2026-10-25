# Geography Mode Switching: Architectural Report & Validation

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Repository:** https://github.com/Sai-Prasanya26/Crime-Management-System  
**Date:** October 25, 2026  
**Commit Target:** `Fix geography mode switching in crime analytics dashboard`

---

## 1. Executive Summary & Root Cause Analysis

### Problem Description
The Crime Intelligence Overview dashboard featured a geography layer toggle button allowing users to switch between:
1. **Current Admin (36 Entities)**: 28 States + 8 Union Territories = 36 modern jurisdictions, 789 modern administrative districts.
2. **Historical (Census 2011)**: 35 States & UTs, 640 Census 2011 districts.

Previously, clicking between these options toggled local state inside `DashboardFilters.tsx` and reset the state and district dropdown selections, but:
1. `geography_mode` was never emitted in `onFilterChange` or captured by `FilterParams`.
2. Parent dashboard components (`DashboardPage`, `CrimeAnalyticsPage`, `TrendsPage`) did not pass `geography_mode` to backend API endpoints (`/analytics/overview`, `/analytics/trends`, `/analytics/by-category`, etc.).
3. The 5th KPI card remained hardcoded to `"Active Jurisdictions: 640 (35 States & UTs)"`, creating a visual and conceptual mismatch when in Current Admin mode.
4. When selecting a state (such as Andhra Pradesh), modern administrative bifurcation (Andhra Pradesh vs. Telangana) was not conditioned on the chosen geographic layer.

### Root Cause
- `FilterParams` interface in `frontend/src/types/index.ts` only specified `{ state_id?, district_id?, start_date?, end_date? }`, omitting `geography_mode`.
- The FastAPI analytics endpoints in `backend/app/api/v1/analytics.py` did not accept `geography_mode`.
- `CrimeRepository.resolve_filter_district_ids()` unconditionally resolved modern state boundaries through `DistrictGeographyMapping`, meaning historical undivided Andhra Pradesh (23 districts) could never be inspected under Census 2011 baseline.

---

## 2. Technical Architecture & Implementation

### 2.1 Dual-Layer Geographic Resolution Logic
Every incident in `crime_incidents` (191,679 total rows) is grounded in Census 2011 district reporting boundaries (district IDs 1 through 640). The dual-layer geography engine resolves queries transparently:

```
+---------------------------------------------------------------------------------------------------+
|                                         USER SELECTION                                            |
|                               (DashboardFilters: Current vs Historical)                           |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                        +-------------------------+-------------------------+
                        |                                                   |
           [geography_mode="current"]                          [geography_mode="historical"]
                        |                                                   |
     +------------------+------------------+             +------------------+------------------+
     |                                     |             |                                     |
[National Level]                    [State Level: AP]  [National Level]                    [State Level: AP]
     |                                     |             |                                     |
Total States: 36                    Mapped to 13       Total States: 35                    All 23 Census 2011
Total Districts: 789                historical parents Total Districts: 640                districts of
Incidents: 191,679                  Incidents: 7,072   Incidents: 191,679                  undivided AP
Label: Administrative Entities      Districts: 28      Label: Census 2011 Districts        Incidents: 12,352
Value: 36 States & UTs              (Modern AP)        Value: 640 Districts                Districts: 23
```

### 2.2 Mathematical Consistency of State Bifurcation
- **Historical Undivided Andhra Pradesh (Census 2011)**: All 23 historical districts = **12,352 incidents**.
- **Modern Andhra Pradesh (Current Admin)**: 13 post-bifurcation parent districts = **7,072 incidents** (across 28 modern administrative districts).
- **Modern Telangana (Current Admin)**: 10 post-bifurcation parent districts = **5,280 incidents** (across 33 modern administrative districts).
- **Integrity Check**:
  $$\text{Modern AP (7,072)} + \text{Modern Telangana (5,280)} = \text{Historical Undivided AP (12,352)}$$
  $$\Delta = 0\text{ (Exact match, 0 discrepancy)}$$

### 2.3 Backend API Enhancements
All 8 analytical endpoints in `backend/app/api/v1/analytics.py` now accept `geography_mode: str = Query("current", pattern="^(current|historical)$")`:
1. `GET /api/v1/analytics/overview`
2. `GET /api/v1/analytics/trends`
3. `GET /api/v1/analytics/by-category`
4. `GET /api/v1/analytics/by-type`
5. `GET /api/v1/analytics/hourly`
6. `GET /api/v1/analytics/demographics`
7. `GET /api/v1/analytics/weapons`
8. `GET /api/v1/analytics/top-districts`

The `CrimeOverviewResponse` schema was augmented with structured jurisdiction metadata:
```python
class CrimeOverviewResponse(BaseModel):
    total_incidents: int
    total_districts: int
    total_states: int
    total_crime_types: int
    total_crime_categories: int
    cases: CaseStatusBreakdown
    earliest_incident_date: str
    latest_incident_date: str
    filtered_by_state_id: Optional[int] = None
    filtered_by_district_id: Optional[int] = None
    geography_mode: str = "current"
    jurisdiction_label: str = "Administrative Entities"
    jurisdiction_value: str = "36 States & UTs"
    jurisdiction_subtext: str = "789 Modern Administrative Districts"
```

### 2.4 Frontend Enhancements
1. **`frontend/src/types/index.ts`**:
   - Extended `FilterParams` with `geography_mode?: 'current' | 'historical'`.
   - Updated `CrimeOverviewResponse` with jurisdiction metadata fields.
2. **`frontend/src/components/filters/DashboardFilters.tsx`**:
   - Synchronized internal `geoView` state with parent `filters.geography_mode`.
   - Emitted `geography_mode: nextView` upon toggling layer.
   - Preserved `geography_mode` upon filter reset.
   - Enhanced toggle button with high-contrast active state indicators (Navy blue for Current Admin, Amber for Census 2011).
3. **`frontend/src/pages/DashboardPage.tsx`**:
   - Initialized filters with `geography_mode` from URL search parameters.
   - Dynamically updated URL query string via `useSearchParams` for direct link sharing and bookmarking.
   - Updated 5th KPI card to render dynamic jurisdiction title, value, and subtitle:
     - **Current Admin**: Title: *"Administrative Entities"*, Value: *"36 States & UTs"*, Subtitle: *"789 Modern Administrative Districts (28 States, 8 UTs)"*.
     - **Historical (Census 2011)**: Title: *"Census 2011 Districts"*, Value: *"640 Districts"*, Subtitle: *"35 Census 2011 States & UTs"*.
     - **Filtered by State**: Title: *"Administrative Districts"* or *"Census 2011 Districts"*, Value: `"{count} Districts"`, Subtitle: `"{State Name} ({Mode})"`.
   - Added an informative contextual banner clearly distinguishing the active administrative and historical baseline frameworks.
4. **`frontend/src/pages/CrimeAnalyticsPage.tsx` & `frontend/src/pages/TrendsPage.tsx`**:
   - Fully synchronized `geography_mode` into analytics queries and URL parameters.

---

## 3. Verification & Automated Test Results

### 3.1 Dedicated Regression Test Suite (`test_geography_mode_switch.py`)
A dedicated suite covering 7 targeted test scenarios was executed against the live MySQL database:
1. `test_national_overview_current_mode`: Verified 36 states/UTs, 789 modern districts, 191,679 incidents.
2. `test_national_overview_historical_mode`: Verified 35 states/UTs, 640 Census districts, 191,679 incidents.
3. `test_national_overview_default_mode`: Verified default fallback to current mode.
4. `test_ap_bifurcation_and_telangana_resolution`: Verified 7,072 + 5,280 == 12,352.
5. `test_trends_geography_mode_propagation`: Verified longitudinal sums match geographic boundaries.
6. `test_top_districts_mode_propagation`: Verified Hyderabad (ID 9) transfer between undivided AP, modern AP, and modern Telangana.
7. `test_breakdowns_mode_propagation`: Verified category, type, and weapon distributions adjust accurately.

**Result: 7 / 7 PASSED (100% success)**

### 3.2 Full Backend Regression Test Suite
Executed the entire unittest discovery across all backend modules:
- Total tests executed: **180**
- Test suites: Authentication, RBAC, Dual-Layer Geography, Official Crime Statistics, Predictions, Forecasting Reliability, Risk Engine, Resource Optimization, Budget Estimation, End-to-End Integration, Geography Switching.
- **Result: 180 / 180 PASSED (0 failures, 0 errors, 100% success)**

### 3.3 Frontend Lint & Build
- `npm run lint`: **0 errors** (22 benign compiler warnings, 0 syntax/type errors).
- `npm run build`: **Built cleanly in 3.21s** with production assets generated.

---

## 4. Conclusion

The geography-mode switching functionality is fully operational, mathematically verified, and integrated end-to-end across backend services and frontend dashboards. Both geographic frameworks are preserved with rigorous data lineage.
