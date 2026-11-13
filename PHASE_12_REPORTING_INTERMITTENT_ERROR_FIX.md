# Phase 12: Intermittent Reporting Page Data-Loading Failure — Root Cause Investigation & Resilient Architecture Fix

**Document Version:** 1.0.0  
**Status:** COMPLETE & VERIFIED  
**Date:** November 11, 2026  
**Audience:** CMS Engineering, Systems Architecture & Operations  

---

## 1. Executive Summary

During operational use of the Phase 12 Reporting page, intermittent data-loading failures were observed in the browser:
1. `"Failed to load intelligence data"`
2. `"Unable to connect to the server. Please start the backend."`
3. In other instances, the report preview silently collapsed and displayed: `"No records found matching the active filters."`

A deep-dive investigation was conducted across the FastAPI backend, MySQL database queries, and the React client architecture. The root causes were identified, isolated, and permanently resolved without altering underlying ML models, optimization solvers, or budget formulas.

All 21 reporting API endpoints across the three reporting scopes (**All India**, **State / UT**, and **District**) now pass with 100% `200 OK` status, and the frontend production build passes with zero errors.

---

## 2. Root-Cause Investigation & Technical Breakdown

### Root Cause 1: 10-Second Client Timeout vs. Multi-District Aggregation Latency
- **Mechanism:** In [frontend/src/api/client.ts](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/api/client.ts), Axios was configured with `timeout: 10000` (10 seconds).
- **Measurement:** Cold-cache multi-district aggregations across all 790 active districts—specifically `/api/v1/budget/full-overview` (14.37s – 15.14s) and `/api/v1/budget/districts/summary` (9.64s – 10.00s)—exceeded 10 seconds.
- **Impact:** Axios aborted the HTTP request with `ECONNABORTED` right at the 10.0-second mark before the backend finished responding.

### Root Cause 2: False "Server Disconnection" Error Translation
- **Mechanism:** When Axios aborted due to timeout (`ECONNABORTED`), the response object was null (`!error.response`).
- **Impact:** The response interceptor in `client.ts` had a generic fallback:
  ```ts
  if (!error.response) {
    return Promise.reject(new Error("Unable to connect to the server. Please start the backend."));
  }
  ```
  This falsely informed users that the backend service had stopped or crashed, even though FastAPI was fully healthy and actively processing the intensive query.

### Root Cause 3: Single-Promise Cascade Failure ("All-or-Nothing" Collapse)
- **Mechanism:** In [frontend/src/pages/ReportsPage.tsx](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/ReportsPage.tsx), report compilation was orchestrated via a single monolithic `Promise.all([overview, category, trends, prediction, risk, demand, budget])`.
- **Impact:** If any single non-critical endpoint failed (e.g. prediction took 10.5 seconds or required authentication), the entire `Promise.all` rejected, destroying the report state and rendering an empty preview.

### Root Cause 4: Masked Error State as False "No records found"
- **Mechanism:** When `Promise.all` failed, `comprehensiveData` was set to `null`.
- **Impact:** The page template fell back to the single-report table view where `singleTableRows = []`. The conditional check `rows.length === 0` rendered `"No records found matching the active filters."`, disguising an active API failure as an empty dataset.

### Root Cause 5: Asynchronous State / District Dropdown Race Condition
- **Mechanism:** Selecting a new State initiated an asynchronous district list fetch. However, `selectedDistrictId` remained set to the district from the *previous* state for one render cycle.
- **Impact:** Triggering "Generate Report" before the district list completed fired queries with mismatched parameters (e.g. State 3 with District 5 from State 2), causing 404/422 responses.

### Root Cause 6: Authentication Boundary Between Public & Protected Routes
- **Public Analytics Routes (200 OK without token):**
  - `/api/v1/analytics/overview`
  - `/api/v1/analytics/by-category`
  - `/api/v1/analytics/trends`
  - `/api/v1/geography/states/crime-summary`
- **Protected Intelligence Routes (Require JWT Bearer Token, 401 without token):**
  - `/api/v1/predictions/*`
  - `/api/v1/risk/*`
  - `/api/v1/optimization/*`
  - `/api/v1/budget/*`
- When unauthenticated users visited the page, partial 401 responses caused confusing error dialogues instead of informing the user to sign in for classified intelligence projections.

---

## 3. Engineering Fixes Implemented

### 1. Client Timeout & Fine-Grained Error Classifier (`frontend/src/api/client.ts`)
1. **Extended Timeout:** Increased client timeout from `10000ms` (10s) to `30000ms` (30s) to provide comfortable headroom for national 790-district budget aggregations.
2. **Explicit Error Classification:**
   - `ECONNABORTED` / Timeout: `"Request timed out while analyzing data. The server is processing complex calculations. Please retry."`
   - Real Network Failure: `"Unable to connect to the backend server. Please verify the backend service is running on port 8000."`
   - 401 Unauthorized: `"Authentication session expired or required. Please log in to access intelligence data."`
   - 403 Forbidden: `"Access forbidden. Required operational role not assigned."`
   - 404 Not Found: `"Requested analytical record or district was not found."`
   - 500+ Internal Error: `"Internal server error while compiling report data. Please retry."`

### 2. Section-Level Resilience & Fault Isolation (`frontend/src/pages/ReportsPage.tsx`)
1. **Section Isolation:** Each section (`historical`, `prediction`, `risk`, `resources`, `budget`) now carries its own `{ status: 'success' | 'error', error: string | null }`.
2. **Non-Blocking Promise Orchestration:** Sections are fetched independently using safe `.catch()` fallbacks. A transient failure or timeout in one section does **not** wipe out the other four sections.
3. **Inline Section Error Banners:** Failed sections display a clean amber alert with a dedicated `Retry` action, allowing the user to retry that specific section without reloading the page.
4. **Separation of Error and Empty States:**
   - Network / API errors render an explicit `<ErrorState>` card with a Retry button.
   - `"No records found for the selected jurisdiction and reporting period."` is strictly displayed only when the API call succeeded and returned zero records.
5. **Synchronous District Reset:** State dropdown `onChange` immediately calls `setSelectedDistrictId(undefined)` synchronously to prevent cross-state parameter leakage.
6. **Request Sequence Guarding:** Added `activeRequestId = useRef<number>(0)` to discard delayed or out-of-order network responses from rapid filter changes.
7. **Read-Only Solver Endpoints:** In `RESOURCE_ALLOCATION` report, replaced mutation solver POST `/optimization/crime-optimize` with read-only query `/optimization/crime-demand` and state summaries.

---

## 4. End-to-End Verification & Latency Benchmarks

All 21 reporting API endpoints were profiled under an authenticated session using the live database and ML pipeline:

| Reporting Scope | Endpoint Tested | HTTP Status | Response Time | Payload Size |
|:---|:---|:---:|:---:|:---:|
| **All India** | `GET /api/v1/analytics/overview` | `200 OK` | 1.67s | 605 B |
| **All India** | `GET /api/v1/analytics/by-category` | `200 OK` | 0.53s | 589 B |
| **All India** | `GET /api/v1/analytics/trends?interval=year` | `200 OK` | 0.48s | 390 B |
| **All India** | `GET /api/v1/risk/overview?assessment_period=2026-11-01` | `200 OK` | 0.29s | 19.7 KB |
| **All India** | `GET /api/v1/risk/states/summary?assessment_period=2026-11-01` | `200 OK` | 0.06s | 9.4 KB |
| **All India** | `GET /api/v1/budget/full-overview?year=2026&month=11` | `200 OK` | 15.14s | 4.8 KB |
| **All India** | `GET /api/v1/geography/states/crime-summary` | `200 OK` | 0.65s | 6.5 KB |
| **State / UT** | `GET /api/v1/analytics/overview?state_id=2` | `200 OK` | 0.12s | 570 B |
| **State / UT** | `GET /api/v1/analytics/by-category?state_id=2` | `200 OK` | 0.10s | 582 B |
| **State / UT** | `GET /api/v1/analytics/trends?interval=year&state_id=2` | `200 OK` | 0.04s | 384 B |
| **State / UT** | `GET /api/v1/budget/districts/summary?state_id=2&limit=100` | `200 OK` | 10.00s | 181.9 KB |
| **State / UT** | `GET /api/v1/risk/districts?state_id=2&limit=100` | `200 OK` | 0.04s | 54.6 KB |
| **State / UT** | `GET /api/v1/predictions/monthly?state_id=2&limit=100` | `200 OK` | 0.06s | 15.6 KB |
| **District** | `GET /api/v1/analytics/overview?district_id=5` | `200 OK` | 0.05s | 554 B |
| **District** | `GET /api/v1/analytics/by-category?district_id=5` | `200 OK` | 0.03s | 575 B |
| **District** | `GET /api/v1/analytics/trends?interval=year&district_id=5` | `200 OK` | 0.02s | 372 B |
| **District** | `GET /api/v1/predictions/district-month?district_id=5` | `200 OK` | 0.03s | 1.4 KB |
| **District** | `GET /api/v1/predictions/breakdown?district_id=5` | `200 OK` | 0.31s | 10.1 KB |
| **District** | `GET /api/v1/risk/districts/5` | `200 OK` | 0.03s | 2.8 KB |
| **District** | `GET /api/v1/optimization/crime-demand?district_id=5` | `200 OK` | 0.38s | 141.6 KB |
| **District** | `GET /api/v1/budget/district/5?year=2026&month=11` | `200 OK` | 0.38s | 6.5 KB |

**Verification Script Output (`backend/scripts/verify_reports_phase_12.py`):**
```
=== TESTING ALL 6 REPORT TYPES + JURISDICTIONAL OVERVIEWS ===
1. Comprehensive District Report (Anantapur): All 8 sub-queries 200 OK? True
   Police Budget Req: 13928800.0
   Available Budget: 25000000.0
   Net Balance: 11071200.0
   Partner Agency Cost (Health): 6420000.0
   Resource Pools: 10
   Historical Incidents: 453, Clearance: 47.02%
   Predicted Crimes: 8.67, 80% CI: [6.23 - 11.11]
   Risk Score: 50.47 (HIGH)
2. Crime Statistics Report: status=200, count=21
3. Crime Prediction Report: status=200, count=10
4. Crime Risk Assessment Report: status=200, count=10
5. Resource Allocation Report: status=200, total_crimes=8.67
6. Budget Analysis Report: status=200, total_districts=28
7. State-Wise Jurisdictional Overview: status=200, states_count=36
8. District Threat Profile Dossier: status=200, top_districts=10
=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===
```

**Frontend Production Build Output (`npm run build --prefix frontend`):**
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 2573 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             1.34 kB │ gzip:   0.62 kB
dist/assets/index-ra8a8mtC.css             74.08 kB │ gzip:  13.34 kB
dist/assets/rolldown-runtime-hePW80VL.js    0.71 kB │ gzip:   0.42 kB
dist/assets/icons-Bdq8NEJE.js              21.47 kB │ gzip:   7.42 kB
dist/assets/vendor-56BnzFOK.js            297.69 kB │ gzip:  97.10 kB
dist/assets/charts-CrCTplGN.js            430.06 kB │ gzip: 121.28 kB
dist/assets/index-HloSaLNn.js             624.65 kB │ gzip: 137.94 kB
✓ built in 4.11s
```

---

## 5. Summary of Modified Codebase Files

1. [frontend/src/api/client.ts](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/api/client.ts):
   - Timeout raised from 10,000ms to 30,000ms.
   - Comprehensive error classifier handling `ECONNABORTED`, real connection failures, 401 session expirations, 403 authorization rejections, 404 missing records, and 500 server errors.
2. [frontend/src/pages/ReportsPage.tsx](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/frontend/src/pages/ReportsPage.tsx):
   - Section-level error and status tracking (`status: 'success' | 'error'`).
   - Monolithic `Promise.all` replaced with isolated queries and granular `.catch()` fallbacks.
   - Request sequence guard (`activeRequestId`) preventing stale out-of-order renders.
   - Synchronous state/district dropdown reset preventing cross-state query collisions.
   - Inline retry actions per section.
   - Genuine separation of error alerts from empty results.
3. [backend/scripts/diagnose_reports_phase_12.py](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/scripts/diagnose_reports_phase_12.py):
   - Diagnostic script profiling endpoint availability and CORS response headers.
4. [backend/scripts/profile_reporting_endpoints.py](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/scripts/profile_reporting_endpoints.py):
   - Comprehensive latency benchmarking script for all 21 endpoints across All India, State, and District scopes.
5. [backend/scripts/verify_reports_phase_12.py](file:///c:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/backend/scripts/verify_reports_phase_12.py):
   - End-to-end automated verification script covering all 6 report types.
