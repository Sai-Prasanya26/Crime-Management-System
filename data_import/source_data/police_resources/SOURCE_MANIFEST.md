# Official Police Resource Data Manifest & Institutional Provenance

This manifest documents all official datasets integrated into the Data-Driven Crime Management System with AI-Based Resource Optimization.

## 1. Governance & Strict Verification Rules

1. **Rule of No Fabrication**: No official counts are ever fabricated, extrapolated, or proportionally divided down to lower geographic tiers.
2. **Standard Provenance Taxonomy**:
   - `OFFICIAL_DISTRICT`: Verified district-level police department publication or CAG performance audit.
   - `OFFICIAL_STATE`: Verified state-level publication by Bureau of Police Research & Development (BPR&D) or Ministry of Home Affairs (MHA).
   - `OFFICIAL_POLICE_DEPARTMENT`: Official disclosure published on an active state or commissionerate police portal.
   - `OFFICIAL_GOVERNMENT_DATASET`: Central statutory open data repository (NCRB / Data.gov.in).
   - `DERIVED_FROM_OFFICIAL_DATA`: Explicit mathematical derivation from verified official counts (e.g. `vacancy = sanctioned - actual`).
   - `MODEL_ESTIMATED`: Algorithmic demand calculation produced by the AI Resource Optimization Engine.
   - `UNRECORDED`: Authoritative ground-truth count is not currently available in published official inventories.
3. **Null Handling Invariant**: When `actual_count IS NULL`, `resource_gap` is strictly `NULL`. Unrecorded values are NEVER treated as zero.

---

## 2. Integrated Datasets

### A. BPR&D Police Organizations Data (Priority 1)
- **Directory**: `data_import/source_data/police_resources/bprd/`
- **Files**:
  - `bprd_dopo_state_resources.csv`: Police personnel strength (sanctioned 2,623,225; actual 2,091,488; vacant 531,737) as of 01.01.2020. Lok Sabha Unstarred Question No. 2239 (AU2239.pdf).
  - `bprd_police_stations_outposts_2024.csv`: State-wise Police Stations (17,535 nationwide) and Police Outposts (9,405 nationwide) as on 01.01.2024. BPR&D DoPO / Dataful Dataset 20145.
  - `bprd_specialized_police_stations_2024.csv`: Women Police Stations, Cyber Crime Police Stations, Anti-Corruption, Economic Offences as on 01.01.2024. BPR&D DoPO / Dataful Dataset 20144.
  - `bprd_state_vehicles_2024.csv`: Total motorized fleet (202,925 vehicles nationwide), heavy-duty trucks, medium buses, light utility jeeps, motorcycles, and boats as on 01.01.2024. BPR&D DoPO / Dataful Dataset 20140 & 20141.

### B. NCRB Infrastructure Data (Priority 2)
- **Directory**: `data_import/source_data/police_resources/ncrb/`
- **File**: `ncrb_police_infrastructure_ci_2022.csv`
- **Publisher**: National Crime Records Bureau (NCRB), Ministry of Home Affairs.
- **Publication**: *Crime in India 2022* - Police Infrastructure.
- **Coverage**: All 36 States and UTs.

### C. Open Government Data Platform (Priority 3)
- **Directory**: `data_import/source_data/police_resources/data_gov/`
- **File**: `data_gov_police_modernization_cctns.csv`
- **Publisher**: Ministry of Home Affairs / data.gov.in.
- **Coverage**: All 36 States and UTs.

### D. Official State Police Department Disclosures (Priority 4)
- **Directory**: `data_import/source_data/police_resources/state_police/`
- **File**: `official_district_police_strength.csv`
- **Official Records Included**:
  - Visakhapatnam District Police (`visakhapatnam.appolice.gov.in`)
  - Hyderabad City Police Commissionerate (`hyderabadpolice.gov.in`)
  - Mumbai Police Commissionerate (`mumbaipolice.gov.in` / CAG Audit)
  - Pune Police Commissionerate (`punepolice.gov.in`)
  - Bengaluru City Police (`ksp.karnataka.gov.in`)
  - Chennai City Police (`tnpolice.gov.in`)
  - New Delhi Police (`delhipolice.gov.in` / CAG Performance Audit)
  - Kolkata Police (`kolkatapolice.gov.in`)
  - Lucknow Commissionerate (`uppolice.gov.in`)
  - Gautam Buddha Nagar (Noida) Commissionerate (`uppolice.gov.in`)
  - Thiruvananthapuram City Police (`keralapolice.gov.in`)
  - Ernakulam (Kochi) City Police (`keralapolice.gov.in`)
  - Ahmadabad City Police (`police.gujarat.gov.in`)
  - Surat City Police (`police.gujarat.gov.in`)
  - Jaipur Commissionerate (`police.rajasthan.gov.in`)
  - Ludhiana Commissionerate (`punjabpolice.gov.in`)
  - Amritsar Commissionerate (`punjabpolice.gov.in`)
- **Status for All Other 640 Districts**: `UNRECORDED` with `actual_count = NULL`, `gap_count = NULL`, and `required_count = MODEL_ESTIMATED`.
