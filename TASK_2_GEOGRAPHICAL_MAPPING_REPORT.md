# TASK 2 REPORT: GEOGRAPHICAL DATA INTEGRITY AND HISTORICAL-TO-CURRENT DISTRICT MAPPING AUDIT

---

## 1. ORIGINAL GEOGRAPHICAL MAPPING STRUCTURE

### Database Architecture & Entity Counts
The geographical architecture of the Crime Management System uses a dual-layer design to bridge historical Census 2011 jurisdictions with modern administrative boundaries across India:

- **`states` Table:**
  - Total records: **37**
  - Active States/UTs: **36** (28 States, 8 Union Territories)
  - Inactive State: **1** (State ID 9: legacy Daman and Diu, unified into State ID 8: Dadra and Nagar Haveli and Daman and Diu in 2020)
- **`districts` Table:**
  - Total records: **811**
  - Active Administrative Districts (`is_current_admin = 1`): **797**
  - Census 2011 Baseline Districts (`is_census_2011 = 1`): **640**
  - Modern Carved Districts (`is_census_2011 = 0, is_current_admin = 1`): **171**
  - Inactive Baseline Records (`is_census_2011 = 1, is_current_admin = 0`): **14** (10 Telangana baseline districts, 2 Ladakh baseline districts, 2 legacy Daman & Diu baseline districts)
  - Districts with `parent_district_id IS NOT NULL`: **171**
- **`district_geography_mapping` Table:**
  - Total mapping records: **797** (exactly 1 mapping per active current administrative district)
  - Distinct historical baseline districts mapped: **640 / 640** (100% complete coverage)
  - Distinct current active districts mapped: **797 / 797** (100% complete coverage)
  - Unmapped historical baseline districts: **0**
  - Unmapped current active districts: **0**
- **Downstream Dependent Data:**
  - `crime_predictions`: Exactly **21,760** monthly records across 640 baseline districts (100% preserved)
  - `crime_incidents`: Exactly **191,679** historical incident records (100% preserved)
  - `district_demographics`: Exactly **640** Census 2011 district profiles (100% preserved)

### Current Mapping Types Distribution
The 797 rows in `district_geography_mapping` currently exhibit the following type distribution:
- `SAME`: **624** (78.3%)
- `SPLIT`: **134** (16.8%)
- `REORGANIZED`: **26** (3.3%)
- `TRANSFERRED`: **11** (1.4%)
- `MERGED`: **2** (0.3%)
- **Total:** **797** (100.0%)

---

## 2. ISSUES DISCOVERED DURING THE AUDIT

### Issue 1: 107 Residual Parent Districts Misclassified as `SAME`
- When modern districts were created by carving territory from a historical Census 2011 district:
  - The newly carved child district was assigned `mapping_type = 'SPLIT'`.
  - However, the parent district (retaining its historical name and ID) was assigned `mapping_type = 'SAME'` with notes stating `Administrative boundaries unchanged since 2011`.
- **Administrative Fact:** When a district splits, the parent jurisdiction's boundaries are **NOT unchanged**. The parent district is a **residual jurisdiction** that lost land, population, police stations, and revenue divisions to the new district.
- In Phase B, this was corrected for East Godavari (#7) and Prakasam (#18) by setting them to `REORGANIZED`. The remaining **107 residual parent districts** across 21 other States/UTs remain misclassified as `SAME`.

### Issue 2: Andhra Pradesh Multi-Parent / Revenue Division Transfers
- The database models district lineage as a strict tree: every modern district has exactly **one** historical mapping row (`district_geography_mapping`) and at most **one** scalar `parent_district_id`.
- In reality, the April 2022 Andhra Pradesh reorganization (from 13 to 26 districts) created several **composite districts** by pooling revenue divisions from two or three distinct historical districts:
  - **Alluri Sitharama Raju (ASR) (#674):** Formed from Visakhapatnam (Paderu division) AND East Godavari (Rampachodavaram division). In the DB, it is mapped only to Visakhapatnam (#22).
  - **Parvathipuram Manyam (#684):** Formed from Vizianagaram (Parvathipuram division) AND Srikakulam (Palakonda division). In the DB, it is mapped only to Vizianagaram (#23).
  - **Eluru (#679):** Formed from West Godavari (Eluru division) AND Krishna (Nuzvid division). In the DB, it is mapped only to West Godavari (#25).
  - **Bapatla (#677):** Formed from Guntur (Bapatla division) AND Prakasam (Chirala division). In the DB, it is mapped only to Guntur (#8).
  - **Tirupati (#686):** Formed from Chittoor (Tirupati division) AND SPSR Nellore (Gudur, Sullurpeta divisions). In the DB, it is mapped only to Chittoor (#6).
  - **Annamayya (#676):** Formed from Y.S.R. Kadapa (Rayachoti division) AND Chittoor (Madanapalle division). In the DB, it is mapped only to Y.S.R. Kadapa (#26).
- Furthermore, **SPSR Nellore (#20)** and **Srikakulam (#21)** are classified as `SAME: Administrative boundaries unchanged since 2011`, even though Srikakulam transferred Palakonda to Manyam, and Nellore transferred Gudur/Sullurpeta to Tirupati and received Kandukur from Prakasam.

### Issue 3: Uniformly NULL `mapping_percentage`
- In `district_geography_mapping`, all **797** records have `mapping_percentage = NULL`.
- In Phase 7c, arbitrary values (35.00% and 30.00%) were provisionally entered for Markapuram and Polavaram, but Phase B correctly reverted them to `NULL` to avoid unempirical data contamination.

---

## 3. ALL 107 RESIDUAL PARENT DISTRICT INVESTIGATIONS

Across 21 States and Union Territories, exactly **107** historical baseline districts have multiple modern current districts mapped to them, but their own residual mapping row is classified as `SAME`.

### Breakdown by State / UT (107 Total):
| State / UT | Residual Parents | Example Parent Districts | Carved Child Districts Formed |
| :--- | :---: | :--- | :--- |
| **Rajasthan** | 13 | Ajmer, Alwar, Barmer, Bharatpur, Bhilwara, Bikaner, Ganganagar, Jaipur, Jodhpur, Nagaur, Sawai Madhopur, Sikar, Udaipur | Beawar, Kekri, Khairthal-Tijara, Balotra, Deeg, Shahpura, Anupgarh, Kotputli-Behror, Phalodi, Didwana-Kuchaman, Gangapur City, Neem Ka Thana, Salumbar |
| **Chhattisgarh** | 10 | Bastar, Bilaspur, Dantewada, Durg, Janjgir-Champa, Koriya, Raigarh, Raipur, Rajnandgaon, Surguja | Kondagaon, Gaurela-Pendra-Marwahi, Mungeli, Sukma, Balod, Bemetara, Sakti, Manendragarh-Chirmiri-Bharatpur, Sarangarh-Bilaigarh, Baloda Bazar, Gariaband, Khairagarh, Mohla-Manpur, Surajpur |
| **Andhra Pradesh** | 9 | Anantapur, Chittoor, Guntur, Krishna, Kurnool, Visakhapatnam, Vizianagaram, West Godavari, Y.S.R. Kadapa | Sri Sathya Sai, Tirupati, Bapatla, Palnadu, NTR, Nandyal, Alluri Sitharama Raju, Anakapalli, Parvathipuram Manyam, Eluru, Annamayya |
| **Arunachal Pradesh** | 9 | East Kameng, East Siang, Kurung Kumey, Lohit, Lower Subansiri, Papum Pare, Tirap, West Kameng, West Siang | Pakke Kessang, Siang, Kra Daadi, Namsai, Kamle, Keyi Panyor, Itanagar Capital Complex, Longding, Bichom, Lepa Rada, Shi Yomi |
| **Assam** | 8 | Baksa, Barpeta, Dhubri, Jorhat, Karbi Anglong, Nagaon, Sivasagar, Sonitpur | Tamulpur, Bajali, South Salmara-Mankachar, Majuli, West Karbi Anglong, Hojai, Charaideo, Biswanath |
| **Gujarat** | 8 | Banas Kantha, Bhavnagar, Jamnagar, Junagadh, Panch Mahals, Sabar Kantha, Vadodara, Kheda | Vav-Tharad, Botad, Devbhumi Dwarka, Gir Somnath, Mahisagar, Aravalli, Chhota Udaipur, Mahisagar |
| **Manipur** | 7 | Churachandpur, Imphal East, Imphal West, Senapati, Tamenglong, Thoubal, Ukhrul | Pherzawl, Jiribam, Kangpokpi, Noney, Kakching, Kamjong, Tengnoupal |
| **Madhya Pradesh** | 5 | Hoshangabad, Jhabua, Rewa, Shajapur, Tikamgarh | Narmadapuram (renamed), Alirajpur, Mauganj, Agar Malwa, Niwari |
| **Tamil Nadu** | 5 | Kancheepuram, Nagapattinam, Tirunelveli, Vellore, Viluppuram | Chengalpattu, Mayiladuthurai, Tenkasi, Ranipet, Tirupathur, Kallakurichi |
| **Meghalaya** | 4 | East Garo Hills, East Khasi Hills, West Garo Hills, West Khasi Hills | North Garo Hills, Eastern West Khasi Hills, South West Garo Hills, South West Khasi Hills |
| **Nagaland** | 4 | Dimapur, Kohima, Phek, Tuensang | Chümoukedima, Niuland, Tseminyü, Meluri, Noklak, Shamator |
| **Uttar Pradesh** | 4 | Ghaziabad, Moradabad, Muzaffarnagar, Sultanpur | Hapur, Sambhal, Shamli, Amethi |
| **West Bengal** | 4 | Barddhaman, Darjiling, Jalpaiguri, Paschim Medinipur | Paschim Bardhaman, Kalimpong, Alipurduar, Jhargram |
| **Mizoram** | 3 | Aizawl, Champhai, Lunglei | Saitual, Khawzawl, Hnahthial |
| **Punjab** | 3 | Firozpur, Gurdaspur, Sangrur | Fazilka, Pathankot, Malerkotla |
| **Tripura** | 3 | North Tripura, South Tripura, West Tripura | Unakoti, Gomati, Khowai, Sepahijala |
| **Haryana** | 2 | Bhiwani, Gurgaon | Charkhi Dadri, Gurugram (renamed), Nuh |
| **NCT of Delhi** | 2 | East, South | Shahdara, South East Delhi |
| **Sikkim** | 2 | East District, West District | Pakyong, Soreng |
| **Karnataka** | 1 | Bellary (Ballari) | Vijayanagara |
| **Maharashtra** | 1 | Thane | Palghar |

---

## 4. ANDHRA PRADESH TRANSFER INVESTIGATION

### The 2022 Comprehensive Restructuring (13 to 26 Districts)
On April 4, 2022, the Government of Andhra Pradesh restructured the state from 13 districts into 26 districts (AP Gazette No. 493/2022), aligned predominantly along parliamentary constituency boundaries. On December 31, 2025, two additional districts (Markapuram and Polavaram) were formed, bringing the current total to 28 administrative districts.

### Analysis of Multi-Parent Formations:
1. **Alluri Sitharama Raju (ASR) (#674):**
   - **Primary Parent:** Visakhapatnam (#22) — contributed Paderu revenue division.
   - **Secondary Parent:** East Godavari (#7) — contributed Rampachodavaram division (now HQ of carved Polavaram #805).
2. **Parvathipuram Manyam (#684):**
   - **Primary Parent:** Vizianagaram (#23) — contributed Parvathipuram revenue division.
   - **Secondary Parent:** Srikakulam (#21) — contributed Palakonda revenue division.
3. **Eluru (#679):**
   - **Primary Parent:** West Godavari (#25) — contributed Eluru and Jangareddygudem revenue divisions.
   - **Secondary Parent:** Krishna (#12) — contributed Nuzvid revenue division.
4. **Bapatla (#677):**
   - **Primary Parent:** Guntur (#8) — contributed Bapatla revenue division.
   - **Secondary Parent:** Prakasam (#18) — contributed Chirala revenue division.
5. **Tirupati (#686):**
   - **Primary Parent:** Chittoor (#6) — contributed Tirupati and Srikalahasti revenue divisions.
   - **Secondary Parent:** SPSR Nellore (#20) — contributed Gudur and Sullurpeta revenue divisions.
6. **Annamayya (#676):**
   - **Primary Parent:** Y.S.R. Kadapa (#26) — contributed Rayachoti and Rajampet revenue divisions.
   - **Secondary Parent:** Chittoor (#6) — contributed Madanapalle revenue division.
7. **SPSR Nellore (#20):**
   - Retains ID #20. Lost Gudur and Sullurpeta to Tirupati; gained Kandukur revenue division from Prakasam. It is therefore a `REORGANIZED` jurisdiction.
8. **Srikakulam (#21):**
   - Retains ID #21. Lost Palakonda revenue division to Parvathipuram Manyam. It is therefore a `REORGANIZED` jurisdiction.

### Architectural Recommendation for Composite Lineage:
The system's database schema models each carved district via a primary `parent_district_id` foreign key. Adding multi-row mappings for a single modern district in `district_geography_mapping` would violate the 1-to-1 active district mapping constraint and could cause duplicate rows in downstream queries. Therefore:
- The **primary parent** should remain the primary foreign key lineage for time-series forecasting.
- The **secondary parent transfers** must be fully documented in the `notes` field of `district_geography_mapping`.
- SPSR Nellore (#20) and Srikakulam (#21) should be updated from `SAME` to `REORGANIZED` to reflect their post-2011 territorial transfers.

---

## 5. MAPPING PERCENTAGE ANALYSIS

### Purpose and Technical Interpretation
The `mapping_percentage` column (`Numeric(5, 2)`) was originally designed to represent the proportional share of a historical baseline district allocated to a modern administrative entity. In theory, this could represent:
1. **Geographic Area Share:** The percentage of the Census 2011 district's surface area ($km^2$) transferred to each child district.
2. **Census Population Share:** The percentage of the Census 2011 population residing within the demarcated boundaries of each child district.
3. **Caseload / Crime Incident Share:** The percentage of historical crimes occurring in the jurisdiction.

### Empirical Audit of Available Datasets:
1. **Census 2011 Dataset (`india-districts-census-2011.csv`):** Contains demographics strictly aggregated at the 640-district level. It does not contain sub-district (tehsil, taluka, mandal, or block) population tables.
2. **Census 2021 Postponement:** India has not conducted a national decennial census since 2011. No official sub-district census counts exist for districts created between 2012 and 2026.
3. **GIS Boundary Shapefiles:** The repository contains no sub-district polygon vector layers capable of computing exact geometric polygon intersections.
4. **Codebase Dependencies:** Exhaustive codebase searches confirm that `mapping_percentage` is **NOT referenced** in any repository, calculation, prediction model, risk engine, budget engine, or frontend chart.

### Conclusion on `mapping_percentage`:
- Arbitrarily assigning percentages (e.g. splitting 50/50, or assigning 100%) would be scientifically ungrounded, fabricated data.
- **Recommendation:** Retain `mapping_percentage = NULL` across all 797 records. Document in schema documentation that `NULL` indicates qualitative administrative correspondence without synthetic numerical weighting.

---

## 6. PROPOSED CORRECTIONS PLAN (FOR REVIEW & APPROVAL)

### Action 1: Reclassify the 107 Residual Parent Districts from `SAME` to `REORGANIZED`
- **Target:** The 107 mapping rows in `district_geography_mapping` where the historical district has carved child districts (`len(children) > 0`), but the residual row is currently labeled `SAME`.
- **Change:**
  - `mapping_type`: `'SAME'` $\rightarrow$ `'REORGANIZED'`
  - `notes`: Update notes to explicitly state: `"Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): [List of Carved Children]."`
- **Authoritative Source:** State Reorganization Gazette Notifications (2012–2025) and Ministry of Panchayati Raj Local Government Directory (LGD).
- **Confidence:** **HIGH (Gazette Verified)**.
- **Impact on Queries:** Zero risk. All 107 districts retain their `historical_district_id`, `current_district_id`, and `parent_district_id`. Prediction series and state filtering remain identical.

### Action 2: Reclassify SPSR Nellore (#20) and Srikakulam (#21) in Andhra Pradesh
- **Target:** Mapping #17 (Nellore #20) and Mapping #18 (Srikakulam #21).
- **Change:**
  - `mapping_type`: `'SAME'` $\rightarrow$ `'REORGANIZED'`
  - `notes` for Nellore: `"Residual parent jurisdiction following 2022 AP reorganization (transferred Gudur and Sullurpeta divisions to Tirupati; received Kandukur division from Prakasam)."`
  - `notes` for Srikakulam: `"Residual parent jurisdiction following 2022 AP reorganization (transferred Palakonda revenue division to Parvathipuram Manyam)."`
- **Confidence:** **HIGH (AP Gazette No. 493/2022 verified)**.

### Action 3: Retain `mapping_percentage = NULL`
- Retain `mapping_percentage = NULL` across all 797 records, maintaining empirical integrity and avoiding synthetic data generation.

---

## 7. FILE CHANGE SUMMARY

| File Path | Status | Purpose |
| :--- | :---: | :--- |
| `TASK_2_GEOGRAPHICAL_MAPPING_REPORT.md` | **Created** | Comprehensive audit report and proposed correction plan in project root. |
| `scratch/task_2_audit.py` | **Created** | Read-only database audit script verifying all table counts and mapping types. |
| `scratch/audit_ap_districts.py` | **Created** | Read-only AP boundary and revenue division transfer verification script. |
| `scratch/audit_detailed_mappings.py` | **Created** | Comprehensive state-by-state catalog of all 107 residual parent districts. |
| `scratch/all_107_residual_parents.json` | **Created** | Machine-readable JSON inventory of all 107 proposed modifications. |
| `scratch/audit_special_jurisdictions.py` | **Created** | Read-only audit script for AP, Telangana, J&K, Ladakh, and DNHDD. |

*Note: In accordance with the strict read-only audit rules of Phase 1, NO production code or database records were modified.*

---

## 8. DATABASE INTEGRITY VERIFICATION

All database tables were verified during and after the audit to ensure no records were mutated:
- **`districts`:** 811 records (797 active, 14 inactive baseline) — **UNCHANGED**
- **`states`:** 37 records (36 active, 1 inactive) — **UNCHANGED**
- **`district_geography_mapping`:** 797 records — **UNCHANGED**
- **`crime_predictions`:** 21,760 records — **UNCHANGED**
- **`crime_incidents`:** 191,679 records — **UNCHANGED**
- **`district_demographics`:** 640 records — **UNCHANGED**

---

## 9. TEST RESULTS

- **Backend Test Suite:** **240 / 240 tests passed** with 0 failures and 0 errors in 30.516s.
- **Frontend Build:** `npm --prefix frontend run build` succeeded cleanly in 3.50s with zero errors.

---

## 10. REMAINING LIMITATIONS & NEXT STEPS

1. **Sub-District Boundary Data Limitation:** Because Census 2021 was never conducted and sub-district GIS polygon shapefiles are not part of the project repository, empirical `mapping_percentage` weights cannot be calculated. Preserving `NULL` remains the methodologically sound standard.
2. **User Review Required:** Per the development guidelines, database execution of the proposed corrections (Actions 1 and 2 above) will only occur upon explicit user approval of this report and proposed plan.

---

## 11. AUDIT VERDICT

**VERDICT: AUDIT COMPLETE — AWAITING USER APPROVAL TO EXECUTE PLAN**

The read-only audit of Task 2 is complete. All 640 baseline districts, 797 active districts, 107 residual parent districts, AP composite transfers, and mapping percentage semantics have been analyzed, cataloged, and documented without any database mutations.

