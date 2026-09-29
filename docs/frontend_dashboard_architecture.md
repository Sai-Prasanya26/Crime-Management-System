# Phase 5 — Frontend Analytics Dashboard Architecture

**Project**: Data-Driven Crime Management System with AI-Based Resource Optimization  
**Frontend Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Recharts, Lucide React, Axios  
**Backend Integration**: FastAPI REST Endpoints at `http://127.0.0.1:8000/api/v1`  
**Database**: MySQL 8.0 (`crime_management_db`) — 191,679 Verified Crime Records  

---

## 1. Overview & Objectives

Phase 5 delivers a responsive, enterprise-grade Crime Intelligence Dashboard that directly consumes the real Phase 4 backend REST APIs. The user interface provides real-time descriptive analytics across 640 districts and 35 Indian States & UTs with zero mock data and zero hardcoded figures.

---

## 2. Directory Structure

```text
frontend/src/
├── api/
│   ├── client.ts              # Axios instance with baseURL and error interceptor
│   ├── geographyApi.ts        # Service for /geography/states & /districts
│   ├── analyticsApi.ts        # Service for all 8 /analytics endpoints
│   └── index.ts               # Barrel export
│
├── types/
│   └── index.ts               # Strict TypeScript models matching backend Pydantic schemas
│
├── components/
│   ├── common/
│   │   ├── StatCard.tsx       # KPI Card with icons, values, and trends
│   │   ├── LoadingState.tsx   # Loading spinner and query state indicators
│   │   ├── ErrorState.tsx     # Retryable error boundary alert
│   │   └── EmptyState.tsx     # Zero-match criteria fallback card
│   │
│   ├── filters/
│   │   ├── DashboardFilters.tsx # Dynamic State & District dropdown cascade
│   │   └── DateRangeFilter.tsx  # Flexible date picker and quick-range presets
│   │
│   ├── charts/
│   │   ├── CrimeTrendChart.tsx         # Longitudinal time-series AreaChart (Year/Month toggle)
│   │   ├── CrimeCategoryChart.tsx      # Crime Domain Donut chart with severity weights
│   │   ├── CrimeTypeChart.tsx          # Top statutory offenses with severity tier bars
│   │   ├── HourlyDistributionChart.tsx # 24-hr diurnal curve with peak patrol hour badge
│   │   ├── VictimDemographicsChart.tsx # Age cohorts bar chart + gender split donut
│   │   ├── WeaponDistributionChart.tsx # Weapon classification horizontal bars
│   │   └── TopDistrictsTable.tsx       # Ranked districts with Volume vs Rate/100k toggle
│   │
│   └── layout/
│       ├── Sidebar.tsx         # Fixed brand navigation & planned phases roadmap
│       ├── Header.tsx          # Live DB connection badge & manual data refresh
│       └── DashboardLayout.tsx # Responsive shell container
│
└── pages/
    ├── LandingPage.tsx        # Phase 1 project overview with direct Dashboard CTA
    ├── DashboardPage.tsx      # Unified Crime Intelligence Command Center
    ├── TrendsPage.tsx         # Dedicated longitudinal crime time-series analysis
    └── DistrictsPage.tsx      # Geographic jurisdiction risk & Census demographics
```

---

## 3. Implemented Views & Analytical Capabilities

### 3.1. Unified Command Center (`/dashboard`)
1. **Key Performance Indicators**:
   - **Total Reported Crimes**: `191,679` verified incidents spanning `2020-01-01` to `2025-12-31`.
   - **Case Clearance Rate**: `48.8%` (`93,490` solved cases).
   - **Active / Open Investigations**: `98,189` cases pending court disposition.
   - **Jurisdictions Covered**: `640` districts across `35` Indian States & Union Territories.
   - **Diurnal Peak Window**: `18:00 hrs` (5.61% of all reported crimes).
2. **Longitudinal Incident Curve**:
   - Dynamic AreaChart with gradient shading displaying annual and monthly trends.
3. **Crime Domain Distribution**:
   - Donut chart displaying the 4 core domains: Other Crime (59.5%), Violent Crime (27.1%), Fire Accident (9.1%), and Traffic Fatality (4.2%) with statutory severity multipliers (`1.0x` to `1.5x`).
4. **Hourly Patrol Scheduling Curve**:
   - 24-hour diurnal profile highlighting the `18:00` peak hour for resource allocation.
5. **Top Legal Crime Types**:
   - Ranking of statutory offenses with IPC codes and severity level badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
6. **High-Risk Jurisdictions Ranking**:
   - Toggle between absolute volume (e.g. Thane: `1,283`) and per-capita crime rate per 100k citizens normalized by Census 2011 population (e.g. Dibang Valley: `874.56` per 100k).
7. **Victim Demographics**:
   - Age cohort distribution (`0-18`, `19-35`, `36-50`, `51-65`, `65+`), average victim age (`44.5 years`), and gender breakdown.
8. **Weapon Involvement**:
   - Recorded frequencies for knife, firearm, blunt object, poison, explosives, and other weapons.

### 3.2. Longitudinal Trends Page (`/trends`)
- Deep-dive temporal analysis with interval toggles (Yearly, Monthly, Daily).
- Instant metric cards showing range volume, peak period, and interval count.

### 3.3. Jurisdiction Risk & Demographics Page (`/districts`)
- Interactive state filter and district profile viewer.
- Real-time display of Census 2011 demographic data (`total_population`, `male_population`, `female_population`, `literate_population`, `total_workers`) directly from `district_demographics`.

---

## 4. Environment Configuration

- Template: `frontend/.env.example`
- Local: `frontend/.env` (excluded from git)
- Base URL:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

## 5. Verification & Testing

- **TypeScript Compilation**: `tsc -b` passes with zero errors.
- **Production Bundle**: `vite build` completed in `726ms`.
- **Linter**: `oxlint` executed with zero errors.
- **Backend Parity**: All endpoints verified against active MySQL database.
