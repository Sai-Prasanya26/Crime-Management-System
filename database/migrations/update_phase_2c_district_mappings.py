"""
Phase 2C Maintenance Script: Residual Parent District Mapping Corrections

Targeted corrections for 109 residual parent districts identified and verified in Task 2B:
- mapping_type: SAME -> REORGANIZED
- notes: Updated with specific residual parent jurisdiction and carved child district lineage
- mapping_percentage: Preserved as NULL across all records

Safety Features:
- Exact 3-way ID matching for all 109 rows (mapping ID, historical_district_id, current_district_id).
- Pre-update, post-update, and rollback transactional verification.
- Explicit db.rollback() on any error or assertion failure before commit.
- Preserves all other 688 mapping rows, parent_district_ids, census baseline records,
  districts (811), states (37), incident counts (191,679), demographics (640), and model predictions (21,760).
- Zero credentials logged or exposed.
- Default mode is safe dry-run (no DB writes without --execute).
"""

import sys
import os
import argparse

sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from backend.app.database.session import SessionLocal

# Target records dictionary: 109 verified residual parent districts
TARGET_RECORDS = {
    4: {
        "historical_district_id": 5,
        "current_district_id": 5,
        "historical_name": "Anantapur",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sri Sathya Sai.",
    },
    5: {
        "historical_district_id": 6,
        "current_district_id": 6,
        "historical_name": "Chittoor",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tirupati.",
    },
    7: {
        "historical_district_id": 8,
        "current_district_id": 8,
        "historical_name": "Guntur",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bapatla, Palnadu.",
    },
    8: {
        "historical_district_id": 12,
        "current_district_id": 12,
        "historical_name": "Krishna",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): NTR.",
    },
    9: {
        "historical_district_id": 13,
        "current_district_id": 13,
        "historical_name": "Kurnool",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Nandyal.",
    },
    11: {
        "historical_district_id": 20,
        "current_district_id": 20,
        "historical_name": "Sri Potti Sriramulu Nellore",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following 2022 AP reorganization (transferred Gudur and Sullurpeta divisions to Tirupati; received Kandukur division from Prakasam).",
    },
    12: {
        "historical_district_id": 21,
        "current_district_id": 21,
        "historical_name": "Srikakulam",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following 2022 AP reorganization (transferred Palakonda revenue division to Parvathipuram Manyam).",
    },
    13: {
        "historical_district_id": 22,
        "current_district_id": 22,
        "historical_name": "Visakhapatnam",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Alluri Sitharama Raju, Anakapalli.",
    },
    14: {
        "historical_district_id": 23,
        "current_district_id": 23,
        "historical_name": "Vizianagaram",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Parvathipuram Manyam.",
    },
    15: {
        "historical_district_id": 25,
        "current_district_id": 25,
        "historical_name": "West Godavari",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Eluru.",
    },
    16: {
        "historical_district_id": 26,
        "current_district_id": 26,
        "historical_name": "Y.S.R.",
        "state_name": "ANDHRA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Annamayya.",
    },
    20: {
        "historical_district_id": 30,
        "current_district_id": 30,
        "historical_name": "East Kameng",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pakke Kessang.",
    },
    21: {
        "historical_district_id": 31,
        "current_district_id": 31,
        "historical_name": "East Siang",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Siang.",
    },
    22: {
        "historical_district_id": 32,
        "current_district_id": 32,
        "historical_name": "Kurung Kumey",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kra Daadi.",
    },
    23: {
        "historical_district_id": 33,
        "current_district_id": 33,
        "historical_name": "Lohit",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Namsai.",
    },
    25: {
        "historical_district_id": 35,
        "current_district_id": 35,
        "historical_name": "Lower Subansiri",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kamle, Keyi Panyor.",
    },
    26: {
        "historical_district_id": 36,
        "current_district_id": 36,
        "historical_name": "Papum Pare",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Itanagar Capital Complex.",
    },
    28: {
        "historical_district_id": 38,
        "current_district_id": 38,
        "historical_name": "Tirap",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Longding.",
    },
    31: {
        "historical_district_id": 41,
        "current_district_id": 41,
        "historical_name": "West Kameng",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bichom.",
    },
    32: {
        "historical_district_id": 42,
        "current_district_id": 42,
        "historical_name": "West Siang",
        "state_name": "ARUNACHAL PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Lepa Rada, Shi Yomi.",
    },
    33: {
        "historical_district_id": 43,
        "current_district_id": 43,
        "historical_name": "Baksa",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tamulpur.",
    },
    34: {
        "historical_district_id": 44,
        "current_district_id": 44,
        "historical_name": "Barpeta",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bajali.",
    },
    40: {
        "historical_district_id": 50,
        "current_district_id": 50,
        "historical_name": "Dhubri",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South Salmara-Mankachar.",
    },
    46: {
        "historical_district_id": 56,
        "current_district_id": 56,
        "historical_name": "Jorhat",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Majuli.",
    },
    49: {
        "historical_district_id": 59,
        "current_district_id": 59,
        "historical_name": "Karbi Anglong",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): West Karbi Anglong.",
    },
    54: {
        "historical_district_id": 64,
        "current_district_id": 64,
        "historical_name": "Nagaon",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hojai.",
    },
    56: {
        "historical_district_id": 66,
        "current_district_id": 66,
        "historical_name": "Sivasagar",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Charaideo.",
    },
    57: {
        "historical_district_id": 67,
        "current_district_id": 67,
        "historical_name": "Sonitpur",
        "state_name": "ASSAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Biswanath.",
    },
    99: {
        "historical_district_id": 109,
        "current_district_id": 109,
        "historical_name": "Bastar",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kondagaon.",
    },
    101: {
        "historical_district_id": 111,
        "current_district_id": 111,
        "historical_name": "Bilaspur",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gaurela-Pendra-Marwahi, Mungeli.",
    },
    102: {
        "historical_district_id": 112,
        "current_district_id": 112,
        "historical_name": "Dakshin Bastar Dantewada",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sukma.",
    },
    104: {
        "historical_district_id": 114,
        "current_district_id": 114,
        "historical_name": "Durg",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balod, Bemetara.",
    },
    105: {
        "historical_district_id": 115,
        "current_district_id": 115,
        "historical_name": "Janjgir - Champa",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sakti.",
    },
    109: {
        "historical_district_id": 119,
        "current_district_id": 119,
        "historical_name": "Koriya",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Manendragarh-Chirmiri-Bharatpur.",
    },
    112: {
        "historical_district_id": 122,
        "current_district_id": 122,
        "historical_name": "Raigarh",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sarangarh-Bilaigarh.",
    },
    113: {
        "historical_district_id": 123,
        "current_district_id": 123,
        "historical_name": "Raipur",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Baloda Bazar, Gariaband.",
    },
    114: {
        "historical_district_id": 124,
        "current_district_id": 124,
        "historical_name": "Rajnandgaon",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khairagarh-Chhuikhadan-Gandai, Mohla-Manpur-Ambagarh Chowki.",
    },
    115: {
        "historical_district_id": 125,
        "current_district_id": 125,
        "historical_name": "Surguja",
        "state_name": "CHHATTISGARH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balrampur, Surajpur.",
    },
    123: {
        "historical_district_id": 135,
        "current_district_id": 135,
        "historical_name": "Banas Kantha",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Vav-Tharad.",
    },
    125: {
        "historical_district_id": 137,
        "current_district_id": 137,
        "historical_name": "Bhavnagar",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Botad.",
    },
    128: {
        "historical_district_id": 140,
        "current_district_id": 140,
        "historical_name": "Jamnagar",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Devbhumi Dwarka.",
    },
    129: {
        "historical_district_id": 141,
        "current_district_id": 141,
        "historical_name": "Junagadh",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gir Somnath.",
    },
    135: {
        "historical_district_id": 147,
        "current_district_id": 147,
        "historical_name": "Panch Mahals",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mahisagar.",
    },
    138: {
        "historical_district_id": 150,
        "current_district_id": 150,
        "historical_name": "Rajkot",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Morbi.",
    },
    139: {
        "historical_district_id": 151,
        "current_district_id": 151,
        "historical_name": "Sabar Kantha",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Aravalli.",
    },
    144: {
        "historical_district_id": 156,
        "current_district_id": 156,
        "historical_name": "Vadodara",
        "state_name": "GUJARAT",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Chhota Udaipur.",
    },
    147: {
        "historical_district_id": 159,
        "current_district_id": 159,
        "historical_name": "Bhiwani",
        "state_name": "HARYANA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Charkhi Dadri.",
    },
    151: {
        "historical_district_id": 163,
        "current_district_id": 163,
        "historical_name": "Hisar",
        "state_name": "HARYANA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hansi.",
    },
    227: {
        "historical_district_id": 241,
        "current_district_id": 241,
        "historical_name": "Bellary",
        "state_name": "KARNATAKA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Vijayanagara.",
    },
    278: {
        "historical_district_id": 292,
        "current_district_id": 292,
        "historical_name": "Chhindwara",
        "state_name": "MADHYA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pandhurna.",
    },
    303: {
        "historical_district_id": 317,
        "current_district_id": 317,
        "historical_name": "Rewa",
        "state_name": "MADHYA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mauganj.",
    },
    305: {
        "historical_district_id": 319,
        "current_district_id": 319,
        "historical_name": "Satna",
        "state_name": "MADHYA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Maihar.",
    },
    309: {
        "historical_district_id": 323,
        "current_district_id": 323,
        "historical_name": "Shajapur",
        "state_name": "MADHYA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Agar Malwa.",
    },
    314: {
        "historical_district_id": 328,
        "current_district_id": 328,
        "historical_name": "Tikamgarh",
        "state_name": "MADHYA PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Niwari.",
    },
    349: {
        "historical_district_id": 363,
        "current_district_id": 363,
        "historical_name": "Thane",
        "state_name": "MAHARASHTRA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Palghar.",
    },
    354: {
        "historical_district_id": 368,
        "current_district_id": 368,
        "historical_name": "Chandel",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tengnoupal.",
    },
    355: {
        "historical_district_id": 369,
        "current_district_id": 369,
        "historical_name": "Churachandpur",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pherzawl.",
    },
    356: {
        "historical_district_id": 370,
        "current_district_id": 370,
        "historical_name": "Imphal East",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jiribam.",
    },
    358: {
        "historical_district_id": 372,
        "current_district_id": 372,
        "historical_name": "Senapati",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kangpokpi.",
    },
    359: {
        "historical_district_id": 373,
        "current_district_id": 373,
        "historical_name": "Tamenglong",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Noney.",
    },
    360: {
        "historical_district_id": 374,
        "current_district_id": 374,
        "historical_name": "Thoubal",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kakching.",
    },
    361: {
        "historical_district_id": 375,
        "current_district_id": 375,
        "historical_name": "Ukhrul",
        "state_name": "MANIPUR",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kamjong.",
    },
    362: {
        "historical_district_id": 376,
        "current_district_id": 376,
        "historical_name": "East Garo Hills",
        "state_name": "MEGHALAYA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): North Garo Hills.",
    },
    364: {
        "historical_district_id": 378,
        "current_district_id": 378,
        "historical_name": "Jaintia Hills",
        "state_name": "MEGHALAYA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): East Jaintia Hills.",
    },
    367: {
        "historical_district_id": 381,
        "current_district_id": 381,
        "historical_name": "West Garo Hills",
        "state_name": "MEGHALAYA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South West Garo Hills.",
    },
    368: {
        "historical_district_id": 382,
        "current_district_id": 382,
        "historical_name": "West Khasi Hills",
        "state_name": "MEGHALAYA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Eastern West Khasi Hills, South West Khasi Hills.",
    },
    369: {
        "historical_district_id": 383,
        "current_district_id": 383,
        "historical_name": "Aizawl",
        "state_name": "MIZORAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Saitual.",
    },
    370: {
        "historical_district_id": 384,
        "current_district_id": 384,
        "historical_name": "Champhai",
        "state_name": "MIZORAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khawzawl.",
    },
    373: {
        "historical_district_id": 387,
        "current_district_id": 387,
        "historical_name": "Lunglei",
        "state_name": "MIZORAM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hnahthial.",
    },
    377: {
        "historical_district_id": 391,
        "current_district_id": 391,
        "historical_name": "Dimapur",
        "state_name": "NAGALAND",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Ch??moukedima, Niuland.",
    },
    379: {
        "historical_district_id": 393,
        "current_district_id": 393,
        "historical_name": "Kohima",
        "state_name": "NAGALAND",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tseminy??.",
    },
    384: {
        "historical_district_id": 398,
        "current_district_id": 398,
        "historical_name": "Phek",
        "state_name": "NAGALAND",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Meluri.",
    },
    385: {
        "historical_district_id": 399,
        "current_district_id": 399,
        "historical_name": "Tuensang",
        "state_name": "NAGALAND",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Noklak, Shamator.",
    },
    389: {
        "historical_district_id": 403,
        "current_district_id": 403,
        "historical_name": "East",
        "state_name": "NCT OF DELHI",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shahdara.",
    },
    394: {
        "historical_district_id": 408,
        "current_district_id": 408,
        "historical_name": "South",
        "state_name": "NCT OF DELHI",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South East Delhi.",
    },
    436: {
        "historical_district_id": 450,
        "current_district_id": 450,
        "historical_name": "Firozpur",
        "state_name": "PUNJAB",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Fazilka.",
    },
    437: {
        "historical_district_id": 451,
        "current_district_id": 451,
        "historical_name": "Gurdaspur",
        "state_name": "PUNJAB",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pathankot.",
    },
    448: {
        "historical_district_id": 462,
        "current_district_id": 462,
        "historical_name": "Sangrur",
        "state_name": "PUNJAB",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Malerkotla.",
    },
    451: {
        "historical_district_id": 465,
        "current_district_id": 465,
        "historical_name": "Ajmer",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Beawar, Kekri.",
    },
    452: {
        "historical_district_id": 466,
        "current_district_id": 466,
        "historical_name": "Alwar",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khairthal-Tijara.",
    },
    455: {
        "historical_district_id": 469,
        "current_district_id": 469,
        "historical_name": "Barmer",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balotra.",
    },
    456: {
        "historical_district_id": 470,
        "current_district_id": 470,
        "historical_name": "Bharatpur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Deeg.",
    },
    457: {
        "historical_district_id": 471,
        "current_district_id": 471,
        "historical_name": "Bhilwara",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shahpura.",
    },
    465: {
        "historical_district_id": 479,
        "current_district_id": 479,
        "historical_name": "Ganganagar",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Anupgarh.",
    },
    467: {
        "historical_district_id": 481,
        "current_district_id": 481,
        "historical_name": "Jaipur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Dudu, Jaipur Rural, Kotputli-Behror.",
    },
    469: {
        "historical_district_id": 483,
        "current_district_id": 483,
        "historical_name": "Jalor",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sanchore.",
    },
    472: {
        "historical_district_id": 486,
        "current_district_id": 486,
        "historical_name": "Jodhpur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jodhpur Rural, Phalodi.",
    },
    475: {
        "historical_district_id": 489,
        "current_district_id": 489,
        "historical_name": "Nagaur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Didwana-Kuchaman.",
    },
    479: {
        "historical_district_id": 493,
        "current_district_id": 493,
        "historical_name": "Sawai Madhopur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gangapur City.",
    },
    480: {
        "historical_district_id": 494,
        "current_district_id": 494,
        "historical_name": "Sikar",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Neem Ka Thana.",
    },
    483: {
        "historical_district_id": 497,
        "current_district_id": 497,
        "historical_name": "Udaipur",
        "state_name": "RAJASTHAN",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Salumbar.",
    },
    484: {
        "historical_district_id": 498,
        "current_district_id": 498,
        "historical_name": "East District",
        "state_name": "SIKKIM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pakyong.",
    },
    487: {
        "historical_district_id": 501,
        "current_district_id": 501,
        "historical_name": "West District",
        "state_name": "SIKKIM",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Soreng.",
    },
    495: {
        "historical_district_id": 509,
        "current_district_id": 509,
        "historical_name": "Kancheepuram",
        "state_name": "TAMIL NADU",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Chengalpattu.",
    },
    500: {
        "historical_district_id": 514,
        "current_district_id": 514,
        "historical_name": "Nagapattinam",
        "state_name": "TAMIL NADU",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mayiladuthurai.",
    },
    514: {
        "historical_district_id": 528,
        "current_district_id": 528,
        "historical_name": "Tirunelveli",
        "state_name": "TAMIL NADU",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tenkasi.",
    },
    517: {
        "historical_district_id": 531,
        "current_district_id": 531,
        "historical_name": "Vellore",
        "state_name": "TAMIL NADU",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Ranipet, Tirupathur.",
    },
    518: {
        "historical_district_id": 532,
        "current_district_id": 532,
        "historical_name": "Viluppuram",
        "state_name": "TAMIL NADU",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kallakurichi.",
    },
    521: {
        "historical_district_id": 535,
        "current_district_id": 535,
        "historical_name": "North Tripura",
        "state_name": "TRIPURA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Unakoti.",
    },
    522: {
        "historical_district_id": 536,
        "current_district_id": 536,
        "historical_name": "South Tripura",
        "state_name": "TRIPURA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gomati.",
    },
    523: {
        "historical_district_id": 537,
        "current_district_id": 537,
        "historical_name": "West Tripura",
        "state_name": "TRIPURA",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khowai, Sepahijala.",
    },
    551: {
        "historical_district_id": 565,
        "current_district_id": 565,
        "historical_name": "Ghaziabad",
        "state_name": "UTTAR PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hapur.",
    },
    578: {
        "historical_district_id": 592,
        "current_district_id": 592,
        "historical_name": "Moradabad",
        "state_name": "UTTAR PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sambhal.",
    },
    579: {
        "historical_district_id": 593,
        "current_district_id": 593,
        "historical_name": "Muzaffarnagar",
        "state_name": "UTTAR PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shamli.",
    },
    592: {
        "historical_district_id": 606,
        "current_district_id": 606,
        "historical_name": "Sultanpur",
        "state_name": "UTTAR PRADESH",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Amethi.",
    },
    609: {
        "historical_district_id": 623,
        "current_district_id": 623,
        "historical_name": "Barddhaman",
        "state_name": "WEST BENGAL",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Paschim Bardhaman.",
    },
    612: {
        "historical_district_id": 626,
        "current_district_id": 626,
        "historical_name": "Darjiling",
        "state_name": "WEST BENGAL",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kalimpong.",
    },
    615: {
        "historical_district_id": 629,
        "current_district_id": 629,
        "historical_name": "Jalpaiguri",
        "state_name": "WEST BENGAL",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Alipurduar.",
    },
    622: {
        "historical_district_id": 636,
        "current_district_id": 636,
        "historical_name": "Paschim Medinipur",
        "state_name": "WEST BENGAL",
        "before_type": "SAME",
        "after_type": "REORGANIZED",
        "old_notes": "Administrative boundaries unchanged since 2011",
        "proposed_notes": "Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jhargram.",
    },
}


def verify_pre_update_integrity(db):
    """Verifies that all 109 target rows exist and match expected baseline preconditions."""
    ids_str = ", ".join(str(i) for i in TARGET_RECORDS.keys())
    rows = db.execute(
        text(f"""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage
            FROM district_geography_mapping
            WHERE id IN ({ids_str})
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 109:
        raise ValueError(f"Pre-check failed: Expected exactly 109 target rows, found {len(rows)}.")

    for r in rows:
        exp = TARGET_RECORDS[r.id]
        if r.historical_district_id != exp["historical_district_id"]:
            raise ValueError(f"Pre-check failed for row {r.id}: historical_district_id mismatch ({r.historical_district_id} != {exp['historical_district_id']}).")
        if r.current_district_id != exp["current_district_id"]:
            raise ValueError(f"Pre-check failed for row {r.id}: current_district_id mismatch ({r.current_district_id} != {exp['current_district_id']}).")
        if r.mapping_type != "SAME":
            raise ValueError(f"Pre-check failed for row {r.id}: mapping_type mismatch (found '{r.mapping_type}', expected 'SAME').")
        if r.mapping_percentage is not None:
            raise ValueError(f"Pre-check failed for row {r.id}: mapping_percentage is not NULL (found {r.mapping_percentage}).")

    # Check global invariants
    total_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()
    if total_mappings != 797:
        raise ValueError(f"Pre-check global failed: Total mappings count is {total_mappings}, expected 797.")

    non_null_pcts = db.execute(text("SELECT COUNT(mapping_percentage) FROM district_geography_mapping")).scalar()
    if non_null_pcts != 0:
        raise ValueError(f"Pre-check global failed: Non-null mapping percentages found ({non_null_pcts}), expected 0.")

    print(" -> Pre-update verification PASSED: All 109 target rows and global invariants match baseline state.")


def verify_post_update_integrity(db):
    """Verifies that all 109 target rows were updated to REORGANIZED and global database invariants hold."""
    ids_str = ", ".join(str(i) for i in TARGET_RECORDS.keys())
    rows = db.execute(
        text(f"""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage, notes
            FROM district_geography_mapping
            WHERE id IN ({ids_str})
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 109:
        raise ValueError(f"Post-update verification failed: Expected exactly 109 target rows, found {len(rows)}.")

    for r in rows:
        target = TARGET_RECORDS[r.id]
        if r.historical_district_id != target["historical_district_id"]:
            raise ValueError(f"Post-update failed for row {r.id}: historical_district_id mismatch.")
        if r.current_district_id != target["current_district_id"]:
            raise ValueError(f"Post-update failed for row {r.id}: current_district_id mismatch.")
        if r.mapping_type != "REORGANIZED":
            raise ValueError(f"Post-update failed for row {r.id}: mapping_type is '{r.mapping_type}', expected 'REORGANIZED'.")
        if r.mapping_percentage is not None:
            raise ValueError(f"Post-update failed for row {r.id}: mapping_percentage is not NULL.")
        if r.notes != target["proposed_notes"]:
            raise ValueError(f"Post-update failed for row {r.id}: notes mismatch.")

    # Check global invariants
    total_mappings = db.execute(text("SELECT COUNT(*) FROM district_geography_mapping")).scalar()
    if total_mappings != 797:
        raise ValueError(f"Post-update global check failed: Total mappings count changed! Found {total_mappings}, expected 797.")

    non_null_pcts = db.execute(text("SELECT COUNT(mapping_percentage) FROM district_geography_mapping")).scalar()
    if non_null_pcts != 0:
        raise ValueError(f"Post-update global check failed: Non-null mapping percentages found! Found {non_null_pcts}, expected 0.")

    # Check mapping_type distribution
    type_counts = dict(db.execute(text("SELECT mapping_type, COUNT(*) FROM district_geography_mapping GROUP BY mapping_type")).fetchall())
    expected_distribution = {
        "SAME": 515,
        "REORGANIZED": 135,
        "SPLIT": 134,
        "TRANSFERRED": 11,
        "MERGED": 2,
    }
    for mtype, exp_cnt in expected_distribution.items():
        actual_cnt = type_counts.get(mtype, 0)
        if actual_cnt != exp_cnt:
            raise ValueError(f"Post-update distribution mismatch for {mtype}: Found {actual_cnt}, expected {exp_cnt}.")

    # Core entity invariants
    districts_cnt = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()
    states_cnt = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
    preds_cnt = db.execute(text("SELECT COUNT(*) FROM crime_predictions")).scalar()
    incidents_cnt = db.execute(text("SELECT COUNT(*) FROM crime_incidents")).scalar()
    demographics_cnt = db.execute(text("SELECT COUNT(*) FROM district_demographics")).scalar()

    if districts_cnt != 811 or states_cnt != 37 or preds_cnt != 21760 or incidents_cnt != 191679 or demographics_cnt != 640:
        raise ValueError(f"Post-update global check failed: Core table count altered!")

    print(" -> Post-update verification PASSED: All 109 rows updated to REORGANIZED, distribution and global invariants verified.")


def verify_pre_rollback_integrity(db, dry_run=False):
    """Verifies that all 109 target rows are in a valid state for rollback."""
    ids_str = ", ".join(str(i) for i in TARGET_RECORDS.keys())
    rows = db.execute(
        text(f"""
            SELECT id, historical_district_id, current_district_id, mapping_type
            FROM district_geography_mapping
            WHERE id IN ({ids_str})
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 109:
        raise ValueError(f"Pre-rollback check failed: Expected exactly 109 target rows, found {len(rows)}.")

    reorg_count = sum(1 for r in rows if r.mapping_type == "REORGANIZED")
    same_count = sum(1 for r in rows if r.mapping_type == "SAME")

    if reorg_count == 109:
        print(" -> Pre-rollback verification PASSED: All 109 target rows are currently in 'REORGANIZED' state and eligible for rollback.")
        return True
    elif same_count == 109:
        if dry_run:
            print(" -> Pre-rollback inspection: Database is currently at baseline (all 109 target rows have mapping_type = 'SAME').")
            print("    Migration has not yet been executed. Rollback definitions, compound IDs, and baseline restoration values verified.")
            return False
        else:
            raise ValueError("Cannot execute rollback: all 109 target rows are already in baseline 'SAME' state. Migration has not been applied yet.")
    else:
        raise ValueError(f"Pre-rollback check failed: Inconsistent mapping_type state ({reorg_count} REORGANIZED, {same_count} SAME). Target rows must all be REORGANIZED to execute rollback.")


def verify_post_rollback_integrity(db):
    """Verifies that all 109 target rows have been completely restored to baseline SAME state."""
    ids_str = ", ".join(str(i) for i in TARGET_RECORDS.keys())
    rows = db.execute(
        text(f"""
            SELECT id, historical_district_id, current_district_id, mapping_type, mapping_percentage, notes
            FROM district_geography_mapping
            WHERE id IN ({ids_str})
            ORDER BY id
        """)
    ).fetchall()

    if len(rows) != 109:
        raise ValueError(f"Post-rollback verification failed: Expected 109 rows, found {len(rows)}.")

    for r in rows:
        target = TARGET_RECORDS[r.id]
        if r.mapping_type != "SAME":
            raise ValueError(f"Post-rollback failed for row {r.id}: mapping_type is '{r.mapping_type}', expected 'SAME'.")
        if r.mapping_percentage is not None:
            raise ValueError(f"Post-rollback failed for row {r.id}: mapping_percentage is not NULL.")
        if r.notes != target["old_notes"]:
            raise ValueError(f"Post-rollback failed for row {r.id}: notes mismatch.")

    type_counts = dict(db.execute(text("SELECT mapping_type, COUNT(*) FROM district_geography_mapping GROUP BY mapping_type")).fetchall())
    if type_counts.get("SAME", 0) != 624 or type_counts.get("REORGANIZED", 0) != 26:
        raise ValueError("Post-rollback distribution mismatch!")

    print(" -> Post-rollback verification PASSED: All 109 rows restored to baseline SAME state.")


def apply_updates(db, dry_run=True):
    """Applies Task 2C reclassifications with strict transactional safety."""
    mode_label = "[DRY RUN - READ ONLY]" if dry_run else "[APPLYING DATABASE UPDATES]"
    print("\n" + "=" * 78)
    print(f"TASK 2C RESIDUAL PARENT RECLASSIFICATIONS: {mode_label}")
    print("=" * 78)

    verify_pre_update_integrity(db)

    print(f"\nVerified {len(TARGET_RECORDS)} target records eligible for reclassification.")
    print("Sample of Planned Row Changes (First 5):")
    for idx, (rid, fields) in enumerate(TARGET_RECORDS.items()):
        if idx < 5:
            print(f" -> Mapping ID #{rid}: Hist #{fields['historical_district_id']} ({fields['historical_name']}) -> Curr #{fields['current_district_id']}")
            print(f"    State: {fields['state_name']}")
            print(f"    mapping_type: '{fields['before_type']}' -> '{fields['after_type']}'")
            print(f"    notes: '{fields['proposed_notes']}'")

    if dry_run:
        print("\n[DRY RUN COMPLETE] Pre-conditions verified. 0 changes written to database.")
        print("To apply these changes, rerun with --execute.")
        return

    try:
        # Execute updates in active transaction
        for rid, fields in TARGET_RECORDS.items():
            db.execute(
                text("""
                    UPDATE district_geography_mapping
                    SET mapping_type = :mtype,
                        notes = :notes
                    WHERE id = :rid
                      AND historical_district_id = :hid
                      AND current_district_id = :cid
                      AND mapping_type = 'SAME'
                """),
                {
                    "mtype": fields["after_type"],
                    "notes": fields["proposed_notes"],
                    "rid": rid,
                    "hid": fields["historical_district_id"],
                    "cid": fields["current_district_id"],
                },
            )

        # Post-update verification within the transaction
        verify_post_update_integrity(db)

        # Commit transaction only if all checks pass
        db.commit()
        print("\nSUCCESS: All 109 updates committed to database.")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Update failed, transaction rolled back completely: {e}")
        raise e


def rollback_updates(db, dry_run=True):
    """Restores all 109 target records back to baseline SAME state."""
    mode_label = "[DRY RUN - READ ONLY]" if dry_run else "[APPLYING ROLLBACK]"
    print("\n" + "=" * 78)
    print(f"ROLLBACK TASK 2C: {mode_label}")
    print("=" * 78)

    is_migrated = verify_pre_rollback_integrity(db, dry_run=dry_run)

    print(f"\nTarget Rollback Inventory: {len(TARGET_RECORDS)} records.")
    print("Sample of Planned Rollback Restorations (First 5):")
    for idx, (rid, fields) in enumerate(TARGET_RECORDS.items()):
        if idx < 5:
            print(f" -> Reverting Mapping ID #{rid}: Hist #{fields['historical_district_id']} ({fields['historical_name']}) -> Curr #{fields['current_district_id']}")
            print(f"    State: {fields['state_name']}")
            print(f"    mapping_type: 'REORGANIZED' -> '{fields['before_type']}' (SAME)")
            print(f"    notes: -> '{fields['old_notes']}'")

    if dry_run:
        if is_migrated:
            print(f"\n[ROLLBACK DRY RUN COMPLETE] Pre-rollback checks passed for all {len(TARGET_RECORDS)} target records (currently REORGANIZED).")
            print("To execute rollback, rerun with: --rollback --execute")
        else:
            print(f"\n[ROLLBACK DRY RUN COMPLETE] Pre-rollback checks passed for all {len(TARGET_RECORDS)} target records.")
            print("Database is currently at baseline (SAME). When migration is executed, rollback will restore these exact original values.")
            print("To execute rollback after migration, run: --rollback --execute")
        return

    try:
        for rid, fields in TARGET_RECORDS.items():
            db.execute(
                text("""
                    UPDATE district_geography_mapping
                    SET mapping_type = 'SAME',
                        notes = :notes
                    WHERE id = :rid
                      AND historical_district_id = :hid
                      AND current_district_id = :cid
                      AND mapping_type = 'REORGANIZED'
                """),
                {
                    "notes": fields["old_notes"],
                    "rid": rid,
                    "hid": fields["historical_district_id"],
                    "cid": fields["current_district_id"],
                },
            )

        verify_post_rollback_integrity(db)
        db.commit()
        print("\nSUCCESS: Rollback committed. All 109 rows restored to baseline SAME state.")
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Rollback failed, transaction rolled back completely: {e}")
        raise e


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Task 2C Residual Parent District Mapping Corrections")
    parser.add_argument("--execute", action="store_true", default=False, help="Apply database changes (default is dry-run)")
    parser.add_argument("--rollback", action="store_true", default=False, help="Rollback changes to initial baseline state")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.rollback:
            rollback_updates(db, dry_run=not args.execute)
        else:
            apply_updates(db, dry_run=not args.execute)
    finally:
        db.close()
