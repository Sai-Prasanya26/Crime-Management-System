# PHASE 7A — CURRENT DATA, GEOGRAPHY & POPULATION MODERNIZATION AUDIT REPORT

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Phase:** 7A — Complete Technical & Geographic Baseline Audit  
**Status:** Audit Complete — No Database Modifications Executed  
**Database Audited:** `crime_management_db` (MySQL 8.0)  
**Baseline Git Commit:** `9d0a6a3` (*Refine frontend with professional light theme*)

---

## 1. Executive Summary & Current Database Geography Baseline

A forensic audit of `crime_management_db` confirms that the database currently operates on the **Census of India 2011 administrative geography**:

* **Total States/UTs in Database:** **35** (State IDs `1` through `35`)
* **Total Districts in Database:** **640** (Exact match to Census 2011 district master)
* **Total Demographic Records:** **640** rows in `district_demographics` (all pegged to Census Year `2011`)
* **Total Baseline Population:** **1,210,854,977** (Census 2011 enumerated total)
* **Total Historical Crime Incidents:** **191,679** (Spanning `2020-01-01` to `2025-12-31`)
* **Referential Soundness:** `100%` referential integrity across all 191,679 incident rows with 0 orphaned foreign keys.

The current database architecture reflects India's administrative boundaries as they existed on **March 1, 2011**, prior to:
1. The **Andhra Pradesh Reorganisation Act, 2014** (which created the State of Telangana on June 2, 2014).
2. The **Jammu and Kashmir Reorganisation Act, 2019** (which bifurcated J&K into the Union Territory of Jammu & Kashmir and the Union Territory of Ladakh on October 31, 2019).
3. The **Dadra and Nagar Haveli and Daman and Diu (Merger of Union Territories) Act, 2019** (which merged two UTs on January 26, 2020).
4. Substantial post-2011 district carving across almost all Indian states (increasing the national district count from **640 to ~787**).

---

## 2. Official Current India State & Union Territory Master

According to the **National Portal of India** ([india.gov.in](https://www.india.gov.in)) and the **Ministry of Panchayati Raj / Local Government Directory (LGD)** ([lgdirectory.gov.in](https://lgdirectory.gov.in)), the sovereign territory of the Republic of India comprises **36 administrative entities**:
* **28 States**
* **8 Union Territories**

### Official Classification:
* **States (28):** Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa, Gujarat, Haryana, Himachal Pradesh, Jharkhand, Karnataka, Kerala, Madhya Pradesh, Maharashtra, Manipur, Meghalaya, Mizoram, Nagaland, Odisha, Punjab, Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura, Uttar Pradesh, Uttarakhand, West Bengal.
* **Union Territories (8):**
  1. Andaman and Nicobar Islands
  2. Chandigarh
  3. Dadra and Nagar Haveli and Daman and Diu *(Merged Jan 26, 2020)*
  4. Delhi (National Capital Territory)
  5. Jammu and Kashmir *(UT since Oct 31, 2019; with Legislative Assembly)*
  6. Ladakh *(UT since Oct 31, 2019; without Legislature)*
  7. Lakshadweep
  8. Puducherry *(with Legislative Assembly)*

---

## 3. Discrepancies: Missing, Extra, and Obsolete States/UTs in Database

Comparing the official 36-entity master against `database.states`:

| Status in Database | Entity Name | Database State ID | Official Modern Status | Legal / Historical Basis |
| :--- | :--- | :--- | :--- | :--- |
| **MISSING STATE** | **Telangana** | *None* | 29th State created June 2, 2014; currently 28 States exist. | Andhra Pradesh Reorganisation Act, 2014. Its 10 Census 2011 districts are currently placed under `ANDHRA PRADESH` (ID 2). |
| **MISSING UT** | **Ladakh** | *None* | Union Territory created October 31, 2019. | Jammu and Kashmir Reorganisation Act, 2019. Its 2 districts (Leh and Kargil) are currently placed under `JAMMU AND KASHMIR` (ID 14). |
| **SPLIT / OBSOLETE UT** | **Dadra and Nagar Haveli** | `8` | Merged into single UT on Jan 26, 2020. | The Dadra and Nagar Haveli and Daman and Diu (Merger of Union Territories) Act, 2019. |
| **SPLIT / OBSOLETE UT** | **Daman and Diu** | `9` | Merged into single UT on Jan 26, 2020. | Same as above. |
| **OBSOLETE STATUS** | **Jammu and Kashmir** | `14` | Reorganized from State to Union Territory on Oct 31, 2019. | Jammu and Kashmir Reorganisation Act, 2019. |
| **OBSOLETE NAME** | **Orissa** | `26` | Officially renamed to **Odisha** in 2011. | Orissa (Alteration of Name) Act, 2011. |
| **OBSOLETE NAME** | **Pondicherry** | `27` | Officially renamed to **Puducherry** in 2006. | Pondicherry (Alteration of Name) Act, 2006. |

---

## 4. Current District Counts: Official Master vs. Database

Nationally, the district count has expanded from **640 (Census 2011)** to **787 (LGD 2026)**. Below is the state-by-state audit of district counts:

```
State/UT Name                               DB Count (2011)   LGD Modern Count (2026)   Variance
Andhra Pradesh                                   23                     26*             -3 (-10 moved to TG, +13 new)
Arunachal Pradesh                                16                     27              +11 new districts
Assam                                            27                     35              +8 new districts
Bihar                                            38                     38               0 (Completely Stable)
Chhattisgarh                                     18                     33              +15 new districts
Goa                                               2                      2               0 (Completely Stable)
Gujarat                                          26                     33              +7 new districts
Haryana                                          21                     22              +1 new district
Himachal Pradesh                                 12                     12               0 (Completely Stable)
Jharkhand                                        24                     24               0 (Completely Stable)
Karnataka                                        30                     31              +1 new district
Kerala                                           14                     14               0 (Completely Stable)
Madhya Pradesh                                   50                     55              +5 new districts
Maharashtra                                      35                     36              +1 new district
Manipur                                           9                     16              +7 new districts
Meghalaya                                         7                     12              +5 new districts
Mizoram                                           8                     11              +3 new districts
Nagaland                                         11                     16              +5 new districts
Odisha (Orissa)                                  30                     30               0 (Completely Stable)
Punjab                                           20                     23              +3 new districts
Rajasthan                                        33                     50              +17 new districts
Sikkim                                            4                      6              +2 new districts
Tamil Nadu                                       32                     38              +6 new districts
Telangana                                         0                     33              +33 (Missing State)
Tripura                                           4                      8              +4 new districts
Uttar Pradesh                                    71                     75              +4 new districts
Uttarakhand                                      13                     13               0 (Completely Stable)
West Bengal                                      19                     23              +4 new districts
Andaman & Nicobar Islands (UT)                    3                      3               0 (Completely Stable)
Chandigarh (UT)                                   1                      1               0 (Completely Stable)
Dadra & Nagar Haveli and Daman & Diu (UT)         3 (split 1+2)          3               0 (Merged in 2020)
Delhi (NCT) (UT)                                  9                     11              +2 new districts
Jammu & Kashmir (UT)                             22                     20              -2 (Leh & Kargil to Ladakh)
Ladakh (UT)                                       0                      2              +2 (Missing UT)
Lakshadweep (UT)                                  1                      1               0 (Completely Stable)
Puducherry (UT)                                   4                      4               0 (Completely Stable)
---------------------------------------------------------------------------------------------------------
TOTAL                                           640                    787             +147 Districts
```

---

## 5. Missing Districts in Database

The **147 missing districts** in `database.districts` are modern administrative units created by State Gazettes between 2011 and 2024. Examples include:
* **Andhra Pradesh (13 new):** Alluri Sitharama Raju, Anakapalli, Annamayya, Bapatla, Dr. B.R. Ambedkar Konaseema, Eluru, Kakinada, Nandyal, NTR, Palnadu, Parvathipuram Manyam, Sri Sathya Sai, Tirupati.
* **Telangana (23 new formed from 10 parent districts):** Bhadradri Kothagudem, Hanumakonda, Jagtial, Jangaon, Jayashankar Bhupalpally, Jogulamba Gadwal, Kamareddy, Komaram Bheem Asifabad, Mahabubabad, Mancherial, Medchal-Malkajgiri, Mulugu, Nagarkurnool, Narayanpet, Nirmal, Peddapalli, Rajanna Sircilla, Sangareddy, Siddipet, Suryapet, Vikarabad, Wanaparthy, Yadadri Bhuvanagiri.
* **Maharashtra (1 new):** Palghar (carved from Thane in August 2014).
* **Karnataka (1 new):** Vijayanagara (carved from Ballari in October 2021).
* **Punjab (3 new):** Fazilka, Pathankot, Malerkotla.
* **Tamil Nadu (6 new):** Chengalpattu, Kallakurichi, Mayiladuthurai, Ranipet, Tenkasi, Tirupathur.
* **Delhi (2 new):** Shahdara, South East Delhi (reorganized in 2012 from 9 to 11 revenue districts).

---

## 6. Obsolete Districts in Database

No districts in `database.districts` are entirely fictional or deleted from existence; rather, they are **parent / predecessor districts** that have since been carved or subdivided:
* **Parent District Splits:** For example, `Thane` (District ID 328) in Census 2011 contained the territory of modern `Thane` + modern `Palghar`.
* **Kashmir Reorganization:** `Leh(Ladakh)` (District ID 203) and `Kargil` (District ID 198) are obsolete as districts of Jammu & Kashmir, having been transferred to the Union Territory of Ladakh.

---

## 7. Deep-Dive Forensic Audit: Hyderabad

```
               HISTORICAL (CENSUS 2011)             CURRENT ADMINISTRATIVE REALITY (2026)
           ┌──────────────────────────────┐        ┌────────────────────────────────────┐
State:     │ ANDHRA PRADESH (ID 2)        │        │ TELANGANA (State)                  │
District:  │ Hyderabad (District ID 9)    │  ───>  │ Hyderabad (Capital District)       │
Incidents: │ 673 verified incidents       │        │ 673 verified incidents             │
Census:    │ Code: 536 | Pop: 3,943,323   │        │ Code: 536 | Pop: 3,943,323         │
           └──────────────────────────────┘        └────────────────────────────────────┘
```

### Forensic Findings:
1. **Current Ownership:** Under Section 3 of the Andhra Pradesh Reorganisation Act, 2014, Hyderabad is the capital and administrative district of the **State of Telangana**. Andhra Pradesh has zero administrative jurisdiction over Hyderabad.
2. **Current Database State:**
   * In `database.districts`: `id = 9`, `district_name = 'Hyderabad'`, `census_district_code = 536`, `state_id = 2`.
   * In `database.states`: `id = 2` is `'ANDHRA PRADESH'`.
   * **Hyderabad is currently linked to Andhra Pradesh.**
3. **Associated Incident Volume:** Exactly **673 crime incidents** in `crime_incidents` reference `district_id = 9`:
   * 2020: 104 incidents
   * 2021: 100 incidents
   * 2022: 98 incidents
   * 2023: 120 incidents
   * 2024: 132 incidents
   * 2025: 119 incidents
   * Categories: Violent Crime (249), Other Crime (378), Fire Accident (39), Traffic Fatality (7).
4. **Associated Demographics:** Exactly **1 record** in `district_demographics` (`total_population = 3,943,323`, `literate_population = 2,892,155`, `workers = 1,413,297`).
5. **The Systemic Telangana Issue:**
   * It is not only Hyderabad that is misplaced. **All 10 original districts of Telangana** (`Adilabad`, `Hyderabad`, `Karimnagar`, `Khammam`, `Mahbubnagar`, `Medak`, `Nalgonda`, `Nizamabad`, `Rangareddy`, `Warangal`) are currently grouped under `state_id = 2` (`ANDHRA PRADESH`).
   * Total incidents associated with the 10 Telangana districts in DB: **5,280 incidents**.
   * Total Census 2011 population associated with the 10 Telangana districts: **35,193,978 citizens**.
   * If only Hyderabad is moved to Telangana, Telangana would have only 1 district, leaving 9 Telangana districts (and 4,607 incidents) incorrectly filed under Andhra Pradesh.
6. **Referential Integrity Risk:** Because `crime_incidents.district_id` references `districts.id`, updating `districts.state_id` does NOT violate any foreign keys in `crime_incidents` or `district_demographics`. However, doing so immediately shifts **5,280 incidents** and **35.2 million population** from Andhra Pradesh to Telangana in all state-level analytics aggregations.

---

## 8. Andhra Pradesh Current Geography Analysis

In April 2022, the Government of Andhra Pradesh officially gazetted the reorganization of its 13 districts into **26 districts** (aligned primarily along Parliamentary constituency boundaries):

```
OLD 13 DISTRICTS (IN DB)        ──>  MODERN 26 DISTRICTS (GAZETTED APRIL 2022)
1. Srikakulam                   ──>  Srikakulam
2. Vizianagaram                 ──>  Vizianagaram, Parvathipuram Manyam
3. Visakhapatnam                ──>  Visakhapatnam, Anakapalli, Alluri Sitharama Raju
4. East Godavari                ──>  East Godavari, Kakinada, Dr. B.R. Ambedkar Konaseema
5. West Godavari                ──>  West Godavari, Eluru
6. Krishna                      ──>  Krishna, NTR District
7. Guntur                       ──>  Guntur, Bapatla, Palnadu
8. Prakasam                     ──>  Prakasam
9. S.P.S. Nellore               ──>  S.P.S. Nellore
10. Chittoor                    ──>  Chittoor, Tirupati
11. Anantapur                   ──>  Ananthapuramu, Sri Sathya Sai
12. Y.S.R. Kadapa               ──>  YSR Kadapa, Annamayya
13. Kurnool                     ──>  Kurnool, Nandyal
```

* **In Database:** Andhra Pradesh has 23 districts (13 true AP districts + 10 Telangana districts).
* **True Modern AP Incident Count:** The 13 parent AP districts account for **7,072 incidents** and **49,386,799 population** in the database.
* **Modern vs. Historical:** Deleting the 13 parent districts to insert the 26 modern districts would destroy foreign key links for 7,072 incidents unless an explicit incident re-allocation mapping is performed.

---

## 9. Telangana Current Geography Analysis

* **Creation Date:** June 2, 2014 (Andhra Pradesh Reorganisation Act, 2014).
* **Initial Geography:** 10 districts carved from Andhra Pradesh (Adilabad, Hyderabad, Karimnagar, Khammam, Mahbubnagar, Medak, Nalgonda, Nizamabad, Rangareddy, Warangal).
* **Current Administrative Structure:** Under the Telangana District Reorganisation (2016 and 2019), the 10 parent districts were subdivided into **33 revenue districts**.
* **Key Districts Verified:**
  * **Hyderabad:** 100% urban district encompassing core GHMC area.
  * **Medchal-Malkajgiri:** Carved from Rangareddy (surrounding Hyderabad urban agglomeration).
  * **Rangareddy:** Reorganized rural/semi-urban district.
  * **Sangareddy:** Carved from Medak district.
  * **Hanumakonda & Warangal:** Reorganized from former Warangal Urban/Rural.
* **In Database:** Telangana does not exist as a state. Its 10 parent districts exist under State ID `2`.

---

## 10. Latest Official NCRB Report Available

* **Official Source:** National Crime Records Bureau (NCRB), Ministry of Home Affairs, Government of India ([ncrb.gov.in](https://ncrb.gov.in)).
* **Latest Officially Published Edition:** **Crime in India 2024** (published in **May 2026**).
  *(Preceding editions: Crime in India 2023 published in late 2024; Crime in India 2022 published in December 2023).*
* **Report Structure & Granularity:**
  * **Volume 1, 2, and 3:** Covers Cognizable Crimes under Special & Local Laws (SLL) and Bharatiya Nyaya Sanhita (BNS) / Indian Penal Code (IPC).
  * **State/UT Level:** Full coverage for all **36 States and Union Territories**.
  * **City Level:** Dedicated tables for **19 Metropolitan Cities** with population > 2 million (Census 2011).
  * **Additional Tables:** Web tables covering **53 Metropolitan Cities** (> 1 million population) and police districts/commissionerates.
* **Police Performance & Disposal Metrics:**
  * **Police Disposal:** Cases reported, investigated, chargesheeted, final report submitted, chargesheeting rate, police pendency rate.
  * **Court Disposal:** Trials completed, convictions, acquittals, conviction rate, court pendency rate.
* **Key Methodology Finding:** NCRB records aggregate case counts following the **"Principal Offence Rule"** (counting only the most severe charge in a multi-crime FIR).

---

## 11. Availability of Official 2025 Crime Data

* **National Level (NCRB):** **Not yet compiled or published.** NCRB compiles nationwide annual crime statistics with a standard lag of 12 to 18 months. As of September 2026, the official nationwide annual report for calendar year 2025 is currently in the compilation and SCRB reconciliation phase and is scheduled for publication in late 2026 / mid-2027.
* **State / City Police Level:** Certain state police departments (e.g., Kerala Police, Karnataka State Police, Delhi Police) have released provisional, un-audited 2025 annual crime summaries on their respective portals. However, these are state-specific provisional summaries, not standardized national NCRB reports.

---

## 12. Availability of Official 2026 Crime Data

* **National Level:** **Zero official annual NCRB data exists for 2026.**
* **Provisional / Police Dashboard Level:** Limited monthly provisional statistics or press releases are published by select police commissionerates (e.g., Delhi Police quarterly releases, Mumbai Police, Bengaluru City Police).
* **Integrity Mandate:** Official nationwide crime statistics for 2026 do not exist. Any claim of complete, pan-India 2026 district-level crime data would be fabricated.

---

## 13. Available District-Level Crime Data vs. State/City Data

In official Government of India publications, crime statistics exhibit a distinct granularity hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA GRANULARITY HIERARCHY                      │
├────────────────────────────────┬───────────────────────────────────────┤
│ Granularity Level              │ Availability in Official Sources      │
├────────────────────────────────┼───────────────────────────────────────┤
│ National / State / UT (36)     │ 100% complete across all crime heads, │
│                                │ clearance rates, and court outcomes.  │
├────────────────────────────────┼───────────────────────────────────────┤
│ 19 Major Metros (> 2 Million)  │ 100% complete dedicated tables in     │
│                                │ main NCRB report volumes.             │
├────────────────────────────────┼───────────────────────────────────────┤
│ 53 Metros (> 1 Million)        │ Available in NCRB Additional Tables.  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Police Districts (~800)        │ Available in Additional Tables for    │
│                                │ aggregate IPC/SLL totals only.        │
│                                │ (Do not strictly match revenue dists) │
├────────────────────────────────┼───────────────────────────────────────┤
│ Incident-Level Records         │ Protected by Police/CCTNS; NOT        │
│ (Individual FIR timestamp/lat) │ published publicly for whole country. │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 14. Recommended Method for Incorporating Official Crime Statistics

### Critical Structural Decision:
The current `crime_incidents` table (191,679 rows) represents **incident-level descriptive data** (with incident date, time, location coordinates, victim age, gender, weapon, and clearance status).

Official NCRB statistics, by contrast, are **aggregate tabular data** (total reported cases, chargesheet rate, conviction rate per state/year/crime-head).

> [!IMPORTANT]
> **Strict Prohibition:** Official aggregate NCRB numbers must **NEVER** be synthesized into fake individual incident rows in `crime_incidents`. Doing so would fabricate timestamps, victims, and coordinates.

### Recommended Dual-Track Architecture:
1. **Maintain `crime_incidents`** for operational, micro-level descriptive analytics (time-of-day diurnal analysis, weapon breakdown, victim demographics).
2. **Introduce `official_crime_statistics`** in a subsequent phase for macroeconomic government benchmarks (NCRB annual reported cases, chargesheeting rates, and conviction rates by State and Metro City).

---

## 15. Population Data Currently Available

* **Active Database Baseline:** **Census 2011** (`district_demographics` table, 640 districts, total population: 1,210,854,977).
* **Enumerated Census Reality:** The **Census of India 2021 was postponed** due to the COVID-19 pandemic and administrative delays. Field enumeration for the next national decennial census (Census 2027) is currently in planning. Consequently, **Census 2011 remains the most recent complete official door-to-door enumerated census in India**.

---

## 16. Assessment: Does a Newer Consistent District-Level Population Dataset Exist?

* **National Level:** **NO.** Neither the Registrar General of India (RGI) nor the Ministry of Health and Family Welfare (MoHFW) has published an official, uniform district-by-district enumerated population dataset newer than Census 2011.
* **State-Level Official Projections:** The **Report of the Technical Group on Population Projections (2011–2036)**, chaired by the RGI and published by the National Commission on Population (MoHFW) in July 2020, provides official mid-year population projections through 2036 **only at the national and state level**.
* **District Estimates in the Wild:** Available modern district population figures (e.g., 2023 or 2026 "estimates") are mathematical projections produced by academic models (such as the Family Planning Estimation Tool / FPET or NFHS-5 weighting). They are not official government census enumerations.

---

## 17. Recommended Population Strategy

1. **Retain Census 2011 as the Official Ground-Truth Baseline:**
   * It provides complete census-code linkage, literacy counts, gender splits, and workforce counts across all 640 original districts.
2. **Acknowledge Official State Projections:**
   * Where per-capita crime rates are computed at the State level, apply the **MoHFW Technical Group (2020) State Projections** for the relevant analysis year.
3. **Transparent Reporting:**
   * Clearly label per-capita rates in the frontend and API as either *"Census 2011 Enumerated Baseline"* or *"MoHFW 2024 State Projected Baseline"* to maintain academic and operational integrity.

---

## 18. Assessment: Are Database Schema Changes Required?

* **For Phase 7A (Audit):** **NO.** Phase 7A is strictly an audit. Modifying the schema at this stage is strictly prohibited.
* **For Future Implementation (Phase 7B+):** **YES, controlled additive schema enhancements will be required** if the project upgrades to support:
  1. Separation of Telangana and Ladakh.
  2. Coexistence of Census 2011 historical districts and modern administrative districts.
  3. Storage of official NCRB aggregate statistics.

---

## 19. Proposed Future Schema Architecture (For Subsequent Implementation)

To support modern geography without breaking the frozen 17-table schema or invalidating the 191,679 historical incident foreign keys, the following non-breaking additive strategy is proposed:

```
┌────────────────────────────────────────────────────────────────────────┐
│               PROPOSED FUTURE DATA ARCHITECTURE (PHASE 7B+)            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   states (36 Entities)                                                 │
│   ├── id (PK)                                                          │
│   ├── state_name (e.g., TELANGANA, ANDHRA PRADESH, LADAKH)            │
│   ├── state_code (e.g., TG, AP, LA)                                   │
│   ├── entity_type (STATE vs UT)                                       │
│   └── is_active (BOOLEAN)                                              │
│                                                                        │
│   districts (Versioned / Status-Tagged)                                │
│   ├── id (PK)                                                          │
│   ├── state_id (FK -> states.id)                                       │
│   ├── district_name (e.g., Hyderabad, Rangareddy)                      │
│   ├── census_district_code (536)                                       │
│   ├── lgd_code (Local Government Directory Code)                       │
│   ├── is_census_2011 (BOOLEAN: True for the 640 baseline districts)    │
│   └── is_current (BOOLEAN: True for active administrative districts)   │
│                                                                        │
│   crime_incidents (191,679 Historical Rows - UNCHANGED)                │
│   ├── id (PK)                                                          │
│   └── district_id (FK -> districts.id)  <-- Safe!                      │
│                                                                        │
│   official_crime_statistics (New Proposed Table - Macro Data)          │
│   ├── id (PK)                                                          │
│   ├── state_id (FK -> states.id)                                       │
│   ├── city_name / police_district (Optional)                           │
│   ├── report_year (e.g., 2022, 2023, 2024)                             │
│   ├── crime_head / crime_type                                          │
│   ├── reported_cases                                                   │
│   ├── chargesheet_rate                                                 │
│   ├── conviction_rate                                                  │
│   └── source_url ("https://ncrb.gov.in")                               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 20. Complete Country Coverage Matrix (All 28 States & 8 Union Territories)

The table below reconciles all 36 sovereign administrative entities of India, comparing official modern district counts (LGD 2026) with the current contents of `crime_management_db`:

| S.No | State / UT Name | Type | LGD Modern Districts | Database Districts | Database Incidents | Database Population (Census 2011) | Database Audit Status | Authoritative Source |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **1** | **Andhra Pradesh** | State | 26 | 23 | 12,352 | 84,580,777 | **MISMATCH:** Holds 10 TG districts. Reorganized in 2022 into 26 dists. | [ap.gov.in](https://ap.gov.in) / [s3waas.gov.in](https://andhrapradesh.s3waas.gov.in) |
| **2** | **Arunachal Pradesh** | State | 27 | 16 | 1,439 | 1,383,727 | **HISTORICAL:** Census 2011 had 16; 11 new districts carved. | [arunachalpradesh.gov.in](https://arunachalpradesh.gov.in) |
| **3** | **Assam** | State | 35 | 27 | 5,855 | 31,205,576 | **HISTORICAL:** Census 2011 had 27; 8 new districts carved. | [assam.gov.in](https://assam.gov.in) |
| **4** | **Bihar** | State | 38 | 38 | 14,706 | 104,099,452 | **MATCH:** All 38 districts unchanged since 2011. | [bihar.gov.in](https://bihar.gov.in) |
| **5** | **Chhattisgarh** | State | 33 | 18 | 4,551 | 25,545,198 | **HISTORICAL:** Census 2011 had 18; 15 new districts carved. | [cgstate.gov.in](https://cgstate.gov.in) |
| **6** | **Goa** | State | 2 | 2 | 303 | 1,458,545 | **MATCH:** North Goa & South Goa unchanged. | [goa.gov.in](https://goa.gov.in) |
| **7** | **Gujarat** | State | 33 | 26 | 8,697 | 60,439,692 | **HISTORICAL:** Census 2011 had 26; 7 new districts in 2013. | [gujaratindia.gov.in](https://gujaratindia.gov.in) |
| **8** | **Haryana** | State | 22 | 21 | 4,563 | 25,351,462 | **HISTORICAL:** Charkhi Dadri added in 2016. | [haryana.gov.in](https://haryana.gov.in) |
| **9** | **Himachal Pradesh** | State | 12 | 12 | 1,700 | 6,864,602 | **MATCH:** All 12 districts unchanged since 2011. | [himachal.nic.in](https://himachal.nic.in) |
| **10** | **Jharkhand** | State | 24 | 24 | 5,918 | 32,988,134 | **MATCH:** All 24 districts unchanged since 2011. | [jharkhand.gov.in](https://jharkhand.gov.in) |
| **11** | **Karnataka** | State | 31 | 30 | 9,570 | 61,095,297 | **HISTORICAL:** Vijayanagara carved in 2021 from Ballari. | [karnataka.gov.in](https://karnataka.gov.in) |
| **12** | **Kerala** | State | 14 | 14 | 4,798 | 33,406,061 | **MATCH:** All 14 districts unchanged since 2011. | [kerala.gov.in](https://kerala.gov.in) |
| **13** | **Madhya Pradesh** | State | 55 | 50 | 12,623 | 72,626,809 | **HISTORICAL:** 5 new districts carved (Niwari, Mauganj, etc.). | [mp.gov.in](https://mp.gov.in) |
| **14** | **Maharashtra** | State | 36 | 35 | 15,910 | 112,374,333 | **HISTORICAL:** Palghar carved from Thane in 2014. | [maharashtra.gov.in](https://maharashtra.gov.in) |
| **15** | **Manipur** | State | 16 | 9 | 973 | 2,855,794 | **HISTORICAL:** 7 new districts created in Dec 2016. | [manipur.gov.in](https://manipur.gov.in) |
| **16** | **Meghalaya** | State | 12 | 7 | 843 | 2,966,889 | **HISTORICAL:** 5 new districts carved. | [meghalaya.gov.in](https://meghalaya.gov.in) |
| **17** | **Mizoram** | State | 11 | 8 | 644 | 1,097,206 | **HISTORICAL:** 3 new districts functionalized in 2019. | [mizoram.gov.in](https://mizoram.gov.in) |
| **18** | **Nagaland** | State | 16 | 11 | 1,008 | 1,978,502 | **HISTORICAL:** 5 new districts created. | [nagaland.gov.in](https://nagaland.gov.in) |
| **19** | **Odisha** | State | 30 | 30 | 7,110 | 41,974,218 | **NAME UPDATE REQUIRED:** In DB as `ORISSA`. Districts match. | [odisha.gov.in](https://odisha.gov.in) |
| **20** | **Punjab** | State | 23 | 20 | 4,672 | 27,743,338 | **HISTORICAL:** Fazilka, Pathankot, Malerkotla carved. | [punjab.gov.in](https://punjab.gov.in) |
| **21** | **Rajasthan** | State | 50 | 33 | 10,882 | 68,548,437 | **HISTORICAL:** Reorganized in 2023 with 17 new districts. | [rajasthan.gov.in](https://rajasthan.gov.in) |
| **22** | **Sikkim** | State | 6 | 4 | 371 | 610,577 | **HISTORICAL:** Pakyong and Soreng added in 2021. | [sikkim.gov.in](https://sikkim.gov.in) |
| **23** | **Tamil Nadu** | State | 38 | 32 | 10,662 | 72,147,030 | **HISTORICAL:** 6 new districts created. | [tn.gov.in](https://tn.gov.in) |
| **24** | **Telangana** | State | 33 | 0 | *(5,280)* | *(35,193,978)* | **MISSING STATE:** Formed 2014; its 10 parent dists are in AP. | [telangana.gov.in](https://telangana.gov.in) |
| **25** | **Tripura** | State | 8 | 4 | 731 | 3,673,917 | **HISTORICAL:** Reorganized into 8 districts in 2012. | [tripura.gov.in](https://tripura.gov.in) |
| **26** | **Uttar Pradesh** | State | 75 | 71 | 29,313 | 199,812,341 | **HISTORICAL:** Amethi, Hapur, Sambhal, Shamli added. | [up.gov.in](https://up.gov.in) |
| **27** | **Uttarakhand** | State | 13 | 13 | 2,267 | 10,086,292 | **MATCH:** All 13 districts unchanged since 2011. | [uk.gov.in](https://uk.gov.in) |
| **28** | **West Bengal** | State | 23 | 19 | 12,299 | 91,276,115 | **HISTORICAL:** 4 new districts created since 2011. | [wb.gov.in](https://wb.gov.in) |
| **29** | **Andaman & Nicobar Islands** | UT | 3 | 3 | 286 | 380,581 | **MATCH:** All 3 districts unchanged since 2011. | [andaman.gov.in](https://andaman.gov.in) |
| **30** | **Chandigarh** | UT | 1 | 1 | 219 | 1,055,450 | **MATCH:** Single district unchanged. | [chandigarh.gov.in](https://chandigarh.gov.in) |
| **31** | **Dadra & Nagar Haveli and Daman & Diu** | UT | 3 | 3 | 236 | 586,956 | **MERGER REQUIRED:** Currently split in DB as ID 8 (1) & ID 9 (2). | [daman.nic.in](https://daman.nic.in) |
| **32** | **Delhi (NCT)** | UT | 11 | 9 | 2,536 | 16,787,941 | **HISTORICAL:** 2 new districts created in 2012. | [delhi.gov.in](https://delhi.gov.in) |
| **33** | **Jammu and Kashmir** | UT | 20 | 22 | 3,125 | 12,541,302 | **STATUS & BIFURCATION:** Now UT; Leh and Kargil belong to Ladakh. | [jk.gov.in](https://jk.gov.in) |
| **34** | **Ladakh** | UT | 2 | 0 | *(211)* | *(274,289)* | **MISSING UT:** Formed 2019; Leh & Kargil currently under J&K. | [ladakh.nic.in](https://ladakh.nic.in) |
| **35** | **Lakshadweep** | UT | 1 | 1 | 95 | 64,473 | **MATCH:** Single district unchanged. | [lakshadweep.gov.in](https://lakshadweep.gov.in) |
| **36** | **Puducherry** | UT | 4 | 4 | 422 | 1,247,953 | **NAME UPDATE REQUIRED:** In DB as `PONDICHERRY`. Districts match. | [py.gov.in](https://py.gov.in) |
| **—** | **NATIONAL TOTALS** | — | **787** | **640** | **191,679** | **1,210,854,977** | **Reconciled against DB baseline** | **[lgdirectory.gov.in](https://lgdirectory.gov.in)** |

---

## 21. Authoritative Government Sources and Verified URLs

1. **Local Government Directory (LGD), Ministry of Panchayati Raj:**
   * URL: [https://lgdirectory.gov.in/](https://lgdirectory.gov.in/)
   * Purpose: Standardized national directory of 36 States/UTs, 787 districts, and LGD codes.
2. **National Portal of India:**
   * URL: [https://www.india.gov.in/](https://www.india.gov.in/)
   * Purpose: Authoritative list of 28 States and 8 Union Territories.
3. **National Crime Records Bureau (NCRB), Ministry of Home Affairs:**
   * URL: [https://ncrb.gov.in/](https://ncrb.gov.in/)
   * Purpose: Annual "Crime in India" reports (2022, 2023, 2024 editions).
4. **Open Government Data (OGD) Platform India:**
   * URL: [https://data.gov.in/](https://data.gov.in/)
   * Purpose: Machine-readable historical NCRB and Ministry datasets.
5. **Office of the Registrar General & Census Commissioner, India (ORGI):**
   * URL: [https://censusindia.gov.in/](https://censusindia.gov.in/)
   * Purpose: Census 2011 Primary Census Abstract (PCA) district demographic baselines.
6. **National Commission on Population, Ministry of Health and Family Welfare (MoHFW):**
   * URL: [https://main.mohfw.gov.in/](https://main.mohfw.gov.in/)
   * Publication: *Report of the Technical Group on Population Projections (2011–2036)* (Published July 2020).
7. **Government of Telangana Official Portal:**
   * URL: [https://www.telangana.gov.in/](https://www.telangana.gov.in/)
   * Purpose: Official gazette of 33 administrative districts and Hyderabad capital jurisdiction.
8. **Government of Andhra Pradesh District Portal (S3WaaS):**
   * URL: [https://andhrapradesh.s3waas.gov.in/](https://andhrapradesh.s3waas.gov.in/)
   * Purpose: Gazette of 26 reorganized revenue districts (April 4, 2022).

---

## 22. Data Limitations & Methodological Constraints

1. **Decennial Census Hiatus:** No enumerated door-to-door census has taken place since 2011. While national and state projections exist through 2036, there is no official uniform district-level census enumeration newer than 2011.
2. **Temporal Mismatch Between Incidents and Modern Boundaries:** The 191,679 incidents span 2020 to 2025. During this period, boundaries shifted dynamically (e.g., Andhra Pradesh created 13 new districts in 2022; Vijayanagara was carved in Karnataka in 2021). Incidents recorded under a parent district (e.g., Visakhapatnam or Thane) cannot be disaggregated into newly created child districts (Anakapalli or Palghar) without police station-level GIS boundary polygons, which are not present in public open data.
3. **Reporting Lag in Official Crime Statistics:** NCRB annual statistics operate on a 1-to-2-year publication lag. Comprehensive national statistics for 2025 and 2026 are not yet compiled or published by the central government.
4. **Different Granularities (Micro vs. Macro):** Incident records represent individual crimes with specific attributes, whereas NCRB tables represent macro-level annual aggregates. They require separate relational models to prevent methodological corruption.

---

## 23. Recommended Step-by-Step Implementation Roadmap (For Future Phases)

The following migration strategy is proposed for subsequent implementation phases after this audit is reviewed and approved:

### Step 1: State Master Modernization (Non-Breaking)
* Insert `TELANGANA` into `states` as State ID `36` (`state_code = 'TG'`).
* Insert `LADAKH` into `states` as State ID `37` (`state_code = 'LA'`).
* Update state names for `ORISSA` &rarr; `ODISHA` and `PONDICHERRY` &rarr; `PUDUCHERRY`.
* In `states`, designate `DADRA AND NAGAR HAVELI AND DAMAN AND DIU` as the unified UT.

### Step 2: Referential Realignment of Telangana & Ladakh
* Reassign the 10 parent Telangana districts (`Hyderabad`, `Rangareddy`, `Warangal`, `Karimnagar`, `Nizamabad`, `Adilabad`, `Medak`, `Mahbubnagar`, `Nalgonda`, `Khammam`) from `state_id = 2` (Andhra Pradesh) to `state_id = 36` (Telangana).
* Reassign `Leh(Ladakh)` and `Kargil` from `state_id = 14` (Jammu & Kashmir) to `state_id = 37` (Ladakh).
* *Result:* Zero incident rows deleted; all 673 Hyderabad incidents and 5,280 total Telangana incidents immediately reflect under Telangana in state filter aggregations.

### Step 3: Geographic Versioning (Dual-Layer Geography)
* Add status flags to `districts`: `is_census_2011` (Boolean) and `is_current_admin` (Boolean).
* Retain the 640 Census 2011 districts as the historical anchor for the 191,679 incident records and demographic calculations.
* Optionally insert the modern child districts (e.g., the 23 new districts of Telangana and 13 new districts of AP) tagged with `is_current_admin = True` and a parent reference (`parent_district_id`) for future modern data entry.

### Step 4: Additive Schema for Official Aggregate Statistics
* Implement the proposed `official_crime_statistics` table to store annual published NCRB figures (2022, 2023, 2024) at the State and Metropolitan City level, allowing the frontend to present both operational micro-analytics and official government macro-benchmarks.

---

```
============================================================
AUDIT COMPLETE — NO DATABASE OR CODE CHANGES WERE EXECUTED
============================================================
```