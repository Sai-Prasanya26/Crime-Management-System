# Official Police Resource Data Manifest & Institutional Provenance

This manifest documents all official datasets integrated into the Data-Driven Crime Management System with AI-Based Resource Optimization.

## 1. Governance & Strict Verification Rules

1. **Rule of No Fabrication**: No official counts are ever fabricated, extrapolated, or proportionally divided down to lower geographic tiers.
2. **Standard Provenance Taxonomy**:
   - `OFFICIAL_DISTRICT`: Verified district-level police department publication, NIC district portal, or CAG performance audit.
   - `OFFICIAL_STATE`: Verified state-level publication by Bureau of Police Research & Development (BPR&D) or Ministry of Home Affairs (MHA).
   - `OFFICIAL_POLICE_DEPARTMENT`: Official disclosure published on an active state or commissionerate police portal.
   - `OFFICIAL_GOVERNMENT_DATASET`: Central statutory open data repository (NCRB / Data.gov.in / Lok Sabha questions).
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

### D. Official District & Commissionerate Police Disclosures (Priority 4)
- **Directory**: `data_import/source_data/police_resources/state_police/`
- **File**: `official_district_police_strength.csv`
- **Official Records Included**: 114 verified district records covering 71 unique districts across 32 States & UTs.
- **Categories Covered**:
  - `PERSONNEL` (21 districts): Visakhapatnam, Hyderabad, Mumbai, Pune, Thane, Nagpur, Bangalore, Chennai, New Delhi, Kolkata, Lucknow, Gautam Buddha Nagar, Thiruvananthapuram, Ernakulam, Ahmadabad, Surat, Jaipur, Ludhiana, Amritsar, Chandigarh, Lakshadweep.
  - `INFRASTRUCTURE - Police Stations` (62 districts): Visakhapatnam, Krishna, Hyderabad, Rangareddy, Mumbai, Thane, Nagpur, Bangalore, Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Kolkata, Haora, Barddhaman, North Twenty Four Parganas, Hugli, Darjiling, Kanpur Nagar, Varanasi, Agra, Ghaziabad, Kozhikode, Kollam, Thrissur, Kannur, Vadodara, Rajkot, Jaipur, Jodhpur, Ludhiana, Jalandhar, Gurgaon, Faridabad, Bhopal, Indore, Raipur, Ranchi, Dhanbad, Purbi Singhbhum, Bokaro, Patna, Kamrup Metropolitan, Cuttack, Khordha, Shimla, Jammu, Srinagar, North Goa, South Goa, West Tripura, East Khasi Hills, Imphal West, Aizawl, Dimapur, Papum Pare, East District (Gangtok), Pondicherry, South Andaman, Chandigarh, Lakshadweep.
  - `INFRASTRUCTURE - Police Outposts` (7 districts): Chandigarh, Shimla, Ranchi, Dhanbad, Purbi Singhbhum, Bokaro, Aizawl.
  - `INFRASTRUCTURE - Women Police Stations` (10 districts): Faridabad, Shimla, Jammu, West Tripura, Dimapur, Imphal West, East Khasi Hills, North Twenty Four Parganas, Jalandhar, Ludhiana.
  - `INVESTIGATION - Cyber Crime Units` (7 districts): Kanpur Nagar, Varanasi, Agra, Shimla, Srinagar, Haora, North Twenty Four Parganas, Khordha.
  - `INVESTIGATION - Economic Offences Wings` (2 districts): Kanpur Nagar, Varanasi.
  - `SPECIALIZED - Anti-Human Trafficking Units` (3 districts): North Goa, South Goa, Jammu.
  - `EMERGENCY - Emergency Response Teams (Dial 112 MDT)` (1 district): Thane / Navi Mumbai.
- **Status for All Other 569 Districts**: Strictly maintained as `UNRECORDED` with `actual_count = NULL`, `gap_count = NULL`, and `required_count = MODEL_ESTIMATED`.

---

## 3. Storage Hierarchy
Source documents and excerpts are cataloged by State and Category under `data_import/source_data/police_resources/<state_name>/<category>/`:
- `andhra_pradesh/`: personnel, infrastructure
- `arunachal_pradesh/`: infrastructure
- `assam/`: infrastructure
- `bihar/`: infrastructure
- `chandigarh/`: personnel, infrastructure
- `chhattisgarh/`: infrastructure
- `goa/`: infrastructure, specialized
- `gujarat/`: personnel, infrastructure
- `haryana/`: infrastructure
- `himachal_pradesh/`: infrastructure, investigation
- `jammu_and_kashmir/`: infrastructure, investigation, specialized
- `jharkhand/`: infrastructure
- `karnataka/`: personnel, infrastructure
- `kerala/`: personnel, infrastructure
- `lakshadweep/`: personnel, infrastructure
- `madhya_pradesh/`: infrastructure
- `maharashtra/`: personnel, infrastructure, emergency
- `manipur/`: infrastructure
- `meghalaya/`: infrastructure
- `mizoram/`: infrastructure
- `nagaland/`: infrastructure
- `nct_of_delhi/`: personnel
- `odisha/`: infrastructure, investigation
- `puducherry/`: infrastructure
- `punjab/`: personnel, infrastructure
- `rajasthan/`: personnel, infrastructure
- `sikkim/`: infrastructure
- `tamil_nadu/`: personnel, infrastructure
- `telangana/`: personnel, infrastructure
- `tripura/`: infrastructure
- `uttar_pradesh/`: personnel, infrastructure, investigation
- `west_bengal/`: personnel, infrastructure, investigation
