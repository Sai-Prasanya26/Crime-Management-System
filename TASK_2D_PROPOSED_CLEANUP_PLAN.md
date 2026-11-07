# TASK 2D-C — PROPOSED GEOGRAPHICAL MASTER DATA CLEANUP PLAN

**Project:** Data-Driven Crime Management System with AI-Based Resource Optimization  
**Date:** November 2026 (Task 2D-C Final Action Plan)  
**Status:** **PROPOSAL ONLY — STRICTLY NO MODIFICATIONS EXECUTED**  

---

## 1. Guiding Principles & Data Preservation Guarantees

1. **Zero Physical Data Deletion:** No records in `districts` or `states` will be physically deleted (`DELETE FROM districts` is strictly prohibited).
2. **Preservation of Census 2011 Baseline (640 Districts):** All 640 baseline districts (IDs 1..640), including the 14 historical transferred records, are protected. They anchor all 191,679 crime incidents, 21,760 predictions, and 640 demographic profiles.
3. **Retention of Validated Gazetted Districts:**
   - **Andhra Pradesh (#804 Markapuram, #805 Polavaram):** RETAINED ACTIVE (`is_current_admin = 1`) as legally gazetted via G.O.Ms.No.524 & G.O.Ms.No.517 on 30-Dec-2025.
   - **Ladakh (#809..#813):** RETAINED ACTIVE (`is_current_admin = 1`) as legally gazetted on 27-Apr-2026 and inaugurated.
   - **Arunachal Pradesh (#692 Itanagar Capital Complex):** RETAINED ACTIVE (`is_current_admin = 1`) as state-tracked capital administration unit.
4. **Soft-Deactivation Pattern (`is_current_admin = 0`):** Applied exclusively to the 9 obsolete Rajasthan districts dissolved by State Gazette Notification dated 29-Dec-2024 and RBI Circular `RBI/2025-26/25`.
5. **Transactional Safety & Reversibility:** All proposed changes will execute inside a single atomic database transaction with pre-checks, post-checks, and a matching rollback script.

---

## 2. Actionable Cleanup Steps

### Step 1: Soft-Deactivate Nine Dissolved Rajasthan Districts
Target the 9 districts dissolved on 29-Dec-2024 (Gazette `Sr. P.9(21) Raj-1/2024-(1-9)`) and confirmed by RBI Circular `RBI/2025-26/25`:

| District ID | District Name | Historical Parent ID | Parent District Name | Successor Re-integration | Action |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **765** | Anupgarh | 479 | Ganganagar | Sri Ganganagar / Bikaner | `SET is_current_admin = 0` |
| **770** | Dudu | 481 | Jaipur | Jaipur | `SET is_current_admin = 0` |
| **771** | Gangapur City | 493 | Sawai Madhopur | Sawai Madhopur / Karauli | `SET is_current_admin = 0` |
| **772** | Jaipur Rural | 481 | Jaipur | Jaipur | `SET is_current_admin = 0` |
| **773** | Jodhpur Rural | 486 | Jodhpur | Jodhpur | `SET is_current_admin = 0` |
| **774** | Kekri | 465 | Ajmer | Ajmer / Tonk | `SET is_current_admin = 0` |
| **777** | Neem Ka Thana | 494 | Sikar | Sikar / Jhunjhunu | `SET is_current_admin = 0` |
| **780** | Sanchore | 483 | Jalor | Jalore | `SET is_current_admin = 0` |
| **781** | Shahpura | 471 | Bhilwara | Bhilwara | `SET is_current_admin = 0` |

- **Verification:** Verified 0 crime incidents, 0 crime predictions, 0 demographic profiles, and 0 child districts.
- **Outcome:** Aligns Rajasthan active administrative districts to **41**.

### Step 2: Add Missing Statutory District (Lower Siang, Arunachal Pradesh)
- **District Name:** `Lower Siang`
- **Target ID:** `802` (Fills the available sequence gap between 801 and 804)
- **State ID:** `3` (Arunachal Pradesh)
- **Parent District ID:** `42` (West Siang)
- **Attributes:** `census_district_code = NULL`, `lgd_code = 719`, `is_census_2011 = 0`, `is_current_admin = 1`
- **Official Evidence:** *Arunachal Pradesh (Re-Organisation of Districts) (Amendment) Act, 2013*; operationalized 22-Sep-2017 with HQ at Likabali; LGD Code: 719; official portal `lowersiang.nic.in`.
- **Lineage Mapping:** Insert into `district_geography_mapping`:
  - `historical_district_id`: `42` (West Siang)
  - `current_district_id`: `802` (Lower Siang)
  - `mapping_type`: `'SPLIT'`
  - `source`: `'Arunachal Pradesh (Re-Organisation of Districts) (Amendment) Act, 2013'`
  - `notes`: `'Carved out of West Siang and East Siang with headquarters at Likabali.'`
  - `effective_from`: `'2017-09-22'`
- **Outcome:** Restores Arunachal Pradesh to its complete, statutory **28** administrative districts.

### Step 3: Add Missing Statutory District (Sankoo, Ladakh)
- **District Name:** `Sankoo`
- **Target ID:** `814` (Next sequential ID after 813 Drass)
- **State ID:** `37` (Ladakh)
- **Parent District ID:** `198` (Kargil)
- **Attributes:** `census_district_code = NULL`, `lgd_code = NULL`, `is_census_2011 = 0`, `is_current_admin = 1`
- **Official Evidence:** UT of Ladakh Notification **S.O. 284 dated 16 October 2026** (under Section 5 of J&K Land Revenue Act 1996); HQ at Sankoo in Suru Valley; encompasses 4 tehsils (Sankoo, GM Pore, TSG, Taisuru).
- **Lineage Mapping:** Insert into `district_geography_mapping`:
  - `historical_district_id`: `198` (Kargil)
  - `current_district_id`: `814` (Sankoo)
  - `mapping_type`: `'SPLIT'`
  - `source`: `'UT of Ladakh Notification S.O. 284 dated 16-Oct-2026'`
  - `notes`: `'Carved from Kargil district with headquarters at Sankoo in Suru Valley.'`
  - `effective_from`: `'2026-10-16'`
- **Outcome:** Establishes Ladakh's complete, statutory **8** administrative districts.

### Step 4: Standardize Typographical and Encoding Errors
1. **District ID #2 (A&N Islands):**
   - `UPDATE districts SET district_name = 'North and Middle Andaman' WHERE id = 2;`
2. **District ID #755 (Nagaland):**
   - `UPDATE districts SET district_name = 'Chumoukedima' WHERE id = 755;`
3. **District ID #759 (Nagaland):**
   - `UPDATE districts SET district_name = 'Tseminyu' WHERE id = 759;`

---

## 3. Reconciliation Results Summary

| Metric | Before Cleanup (Live DB) | Proposed Cleanup Action | After Cleanup Target |
| :--- | :---: | :---: | :---: |
| **Total District Records** | 811 | +2 Inserts (Lower Siang #802, Sankoo #814) | **813** |
| **Census 2011 Baseline Districts** | 640 | 0 Modifications (Strictly Protected) | **640** |
| **Current Active Admin Districts** | 797 | -9 (RJ Soft-Deactivate) + 2 (Lower Siang, Sankoo) | **790** |
| **Inactive Historical / Merged Records** | 14 | +9 (RJ Soft-Deactivated) | **23** |
| **Active States** | 28 | 0 Modifications | **28** |
| **Active Union Territories** | 8 | 0 Modifications | **8** |
| **Total Active Jurisdictions** | 36 | 0 Modifications | **36** |

---

## 4. Draft SQL Migration Preview

The draft preview SQL script has been updated at [`database/migrations/task_2d_preview_cleanup.sql`](file:///C:/Users/saipr.SAIPRASANYA.000/Desktop/Puppyyy/Major%20Project/database/migrations/task_2d_preview_cleanup.sql).
It includes transactional isolation (`START TRANSACTION`), pre-checks, soft-deactivation updates, typo corrections, Lower Siang & Sankoo statutory inserts, post-validation checks, and `ROLLBACK`.
