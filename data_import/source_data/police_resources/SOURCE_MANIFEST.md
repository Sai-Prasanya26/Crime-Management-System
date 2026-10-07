# Official Police Resource Data Source Manifest

## 1. Overview and Institutional Provenance

This directory contains verified official Indian police resource data sourced exclusively from authoritative government publications and official parliamentary records of the Republic of India.

In accordance with strict project data integrity principles:
- **Zero Fabrication**: All personnel and transport quantities reflect verbatim government records.
- **Zero Synthetic Disaggregation**: Official BPR&D data is published at the **State and Union Territory level**. In strict compliance with methodological standards, state quantities are **never** distributed arbitrarily or algorithmically across districts. The native state-level geography is preserved in a dedicated `state_resources` table.
- **Historical Integrity**: The project's 191,679 historical crime incidents, Census 2011 demographics, and ML forecasting predictions are completely untouched.

---

## 2. Authoritative Data Sources

### A. Primary Source: Lok Sabha Parliamentary Unstarred Question No. 2239
* **Issuing Body**: Ministry of Home Affairs, Government of India
* **Forum**: Lok Sabha (House of the People), Parliament of India
* **Question Reference**: Lok Sabha Unstarred Question No. 2239, answered on 15.03.2022 (Phalguna 24, 1943 Saka)
* **Subject**: *Vacancies in Police Stations*
* **Source Organization**: Bureau of Police Research & Development (BPR&D), Ministry of Home Affairs
* **Primary Publication**: *Data on Police Organizations (DoPO) as on 01.01.2020*
* **Official URL**: [Lok Sabha Question 2239 Annexure (Sansad.in)](https://sansad.in/getFile/loksabhaquestions/annex/178/AU2239.pdf)
* **Metrics Covered**:
  - Sanctioned Police Strength (Total Civil, Armed, and Reserve Police)
  - Actual Police Strength (Total Civil, Armed, and Reserve Police)
  - Vacancies / Surplus
* **National Totals Verified**:
  - Total Sanctioned: `2,623,225`
  - Total Actual: `2,091,488`
  - Total Vacancy: `531,737`
* **Geographic Coverage**: 36 States & Union Territories (100% of modern active Indian administrative entities).
* **Reference Date**: `2020-01-01` (Reference Year: `2020`).

### B. Secondary Source: Bureau of Police Research & Development (BPR&D) DoPO Transport Fleet
* **Issuing Body**: Bureau of Police Research & Development (BPR&D), Ministry of Home Affairs, Government of India
* **Publication**: *Data on Police Organizations (DoPO)*
* **Press Release**: Press Information Bureau (PIB), Ministry of Home Affairs (Release ID: 1684346, 29.12.2020)
* **Open Repository**: [Dataful Dataset 20140: Number of Sanctioned and Actual Police, and Vehicles Available](https://dataful.in/datasets/20140/) / [Dataset 20141: Types of Vehicles in State and Police Stations](https://dataful.in/datasets/20141/)
* **Metrics Covered**:
  - Number of operational transport vehicles available with state police forces.
* **National Fleet Total**: `202,925` police vehicles available nationwide across States and UTs.
* **State Records**: Verified state totals for Andhra Pradesh (9,656), Arunachal Pradesh (1,953), Assam (4,181).

---

## 3. Dataset Schema & Column Definitions

File: `bprd_dopo_state_resources.csv`

| Column | Type | Description |
| :--- | :--- | :--- |
| `state_name` | String | Standardized uppercase state/UT name matching MySQL `states.state_name` |
| `resource_type_name` | String | Target resource category matching MySQL `resource_types.resource_name` |
| `sanctioned_quantity` | Integer | Officially sanctioned strength as authorized by government notification |
| `actual_quantity` | Integer | Actual on-duty personnel strength deployed across state jurisdiction |
| `available_quantity` | Integer | Active operational capacity (equals actual quantity for deployed personnel) |
| `reference_year` | SmallInt | Fiscal/administrative reporting year |
| `source_name` | String | Authoritative issuing institution (BPR&D / Ministry of Home Affairs) |
| `source_publication` | String | Name of specific report, table, or parliamentary document |
| `source_url` | String | Authoritative verification URL or digital archive identifier |
| `source_geography` | String | Native geographic granularity (`STATE`) |
| `data_as_of` | Date | Exact reference date of the underlying survey census (`YYYY-MM-DD`) |

---

## 4. Verification Checksums and Summary Statistics

- **Total State Resource Rows**: 39
  - Police Officers (`resource_type_id = 1`): 36 records (all 36 active States/UTs)
  - Patrol Vehicles (`resource_type_id = 2`): 3 verified records
- **Police Officers Sanctioned Total**: `2,623,225` (Exact match with official MHA disclosure)
- **Police Officers Actual Total**: `2,091,488` (Exact match with official MHA disclosure)
- **Police Officers Vacancy Total**: `531,737` (Exact match with official MHA disclosure)
- **Zero Missing States**: All 36 modern States and Union Territories in the project database are mapped.
