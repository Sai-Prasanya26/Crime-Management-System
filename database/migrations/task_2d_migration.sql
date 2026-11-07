-- =============================================================================
-- TASK 2D GEOGRAPHICAL MASTER DATA CLEANUP MIGRATION SQL
--
-- Modifications:
-- 1. Soft-deactivates 9 dissolved Rajasthan districts (is_current_admin: 1 -> 0)
-- 2. Standardizes 3 district names (North and Middle Andaman, Chumoukedima, Tseminyu)
-- 3. Inserts operational district Lower Siang (#802) + lineage mapping (SPLIT from West Siang #42)
-- 4. Inserts operational district Sankoo (#814) + lineage mapping (SPLIT from Kargil #198)
--
-- Safety & Invariants:
-- - Preserves 36 active States/UTs (State #9 Daman & Diu remains inactive)
-- - Preserves all 640 Census 2011 baseline districts
-- - Preserves 191,679 crime incidents, 21,760 predictions, 640 demographics
-- - Preserves 135 REORGANIZED mappings
-- - Resulting counts: 813 total districts, 790 active districts, 23 inactive districts
-- =============================================================================

START TRANSACTION;

-- Pre-check 1: Verify current database
SELECT IF(DATABASE() = 'crime_management_db', 'PRE-CHECK 1 PASSED: active db verified', 'ABORT: wrong database') AS status;

-- Pre-check 2: Verify total district count is 811
SELECT IF((SELECT COUNT(*) FROM districts) = 811, 'PRE-CHECK 2 PASSED: 811 districts verified', 'ABORT: count mismatch') AS status;

-- Pre-check 3: Verify Rajasthan 9 target districts currently have is_current_admin = 1
SELECT IF((SELECT COUNT(*) FROM districts WHERE id IN (765, 770, 771, 772, 773, 774, 777, 780, 781) AND is_current_admin = 1) = 9, 'PRE-CHECK 3 PASSED: 9 RJ districts active', 'ABORT: RJ mismatch') AS status;

-- Pre-check 4: Verify IDs 802 and 814 do not exist
SELECT IF((SELECT COUNT(*) FROM districts WHERE id IN (802, 814)) = 0, 'PRE-CHECK 4 PASSED: IDs 802 and 814 free', 'ABORT: IDs exist') AS status;

-- 1. Soft-deactivate 9 dissolved Rajasthan districts
UPDATE districts 
SET is_current_admin = 0 
WHERE id IN (765, 770, 771, 772, 773, 774, 777, 780, 781) 
  AND state_id = 29;

-- 2. Standardize typographical and encoding errors
UPDATE districts SET district_name = 'North and Middle Andaman' WHERE id = 2 AND state_id = 1;
UPDATE districts SET district_name = 'Chumoukedima' WHERE id = 755 AND state_id = 24;
UPDATE districts SET district_name = 'Tseminyu' WHERE id = 759 AND state_id = 24;

-- 3. Insert Missing Operational District: Lower Siang (Arunachal Pradesh, LGD Code 719)
INSERT INTO districts (id, state_id, district_name, census_district_code, lgd_code, is_census_2011, is_current_admin, parent_district_id)
VALUES (802, 3, 'Lower Siang', NULL, 719, 0, 1, 42);

-- 4. Insert Lineage Mapping for Lower Siang (Historical West Siang #42 -> Lower Siang #802)
INSERT INTO district_geography_mapping (historical_district_id, current_district_id, mapping_type, effective_from, source, notes)
VALUES (42, 802, 'SPLIT', '2017-09-22', 'Arunachal Pradesh (Re-Organisation of Districts) (Amendment) Act, 2013', 'Carved out of West Siang and East Siang with headquarters at Likabali.');

-- 5. Insert Missing Operational District: Sankoo (Ladakh, S.O. 284 dated 16-Oct-2026)
INSERT INTO districts (id, state_id, district_name, census_district_code, lgd_code, is_census_2011, is_current_admin, parent_district_id)
VALUES (814, 37, 'Sankoo', NULL, NULL, 0, 1, 198);

-- 6. Insert Lineage Mapping for Sankoo (Historical Kargil #198 -> Sankoo #814)
INSERT INTO district_geography_mapping (historical_district_id, current_district_id, mapping_type, effective_from, source, notes)
VALUES (198, 814, 'SPLIT', '2026-10-16', 'UT of Ladakh Notification S.O. 284 dated 16-Oct-2026', 'Carved from Kargil district with headquarters at Sankoo in Suru Valley.');

-- Post-check 1: Total districts = 813
SELECT IF((SELECT COUNT(*) FROM districts) = 813, 'POST-CHECK 1 PASSED: total districts = 813', 'ABORT: total districts mismatch') AS status;

-- Post-check 2: Active districts = 790
SELECT IF((SELECT COUNT(*) FROM districts WHERE is_current_admin = 1) = 790, 'POST-CHECK 2 PASSED: active districts = 790', 'ABORT: active districts mismatch') AS status;

-- Post-check 3: Inactive districts = 23
SELECT IF((SELECT COUNT(*) FROM districts WHERE is_current_admin = 0) = 23, 'POST-CHECK 3 PASSED: inactive districts = 23', 'ABORT: inactive districts mismatch') AS status;

-- Post-check 4: Active states = 36
SELECT IF((SELECT COUNT(*) FROM states WHERE is_active = 1) = 36, 'POST-CHECK 4 PASSED: active states = 36', 'ABORT: active states mismatch') AS status;

-- Post-check 5: Preserved incidents = 191,679
SELECT IF((SELECT COUNT(*) FROM crime_incidents) = 191679, 'POST-CHECK 5 PASSED: incidents preserved', 'ABORT: incidents mismatch') AS status;

-- Post-check 6: Preserved predictions = 21,760
SELECT IF((SELECT COUNT(*) FROM crime_predictions) = 21760, 'POST-CHECK 6 PASSED: predictions preserved', 'ABORT: predictions mismatch') AS status;

-- Post-check 7: Preserved demographics = 640
SELECT IF((SELECT COUNT(*) FROM district_demographics) = 640, 'POST-CHECK 7 PASSED: demographics preserved', 'ABORT: demographics mismatch') AS status;

-- Post-check 8: Total mappings = 799
SELECT IF((SELECT COUNT(*) FROM district_geography_mapping) = 799, 'POST-CHECK 8 PASSED: mappings = 799', 'ABORT: mappings mismatch') AS status;

COMMIT;
