-- =============================================================================
-- TASK 2D-C DRAFT SQL MIGRATION PREVIEW (READ-ONLY REFERENCE)
-- DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL
-- =============================================================================

START TRANSACTION;

-- Pre-check 1: Verify current database is crime_management_db
SELECT IF(DATABASE() = 'crime_management_db', 'PRE-CHECK 1 PASSED: active db verified', 'ABORT: wrong database') AS status;

-- Pre-check 2: Verify total district count is 811
SELECT IF((SELECT COUNT(*) FROM districts) = 811, 'PRE-CHECK 2 PASSED: 811 districts verified', 'ABORT: count mismatch') AS status;

-- Pre-check 3: Verify Rajasthan 9 target districts currently have is_current_admin = 1
SELECT IF((SELECT COUNT(*) FROM districts WHERE id IN (765, 770, 771, 772, 773, 774, 777, 780, 781) AND is_current_admin = 1) = 9, 'PRE-CHECK 3 PASSED: 9 RJ districts active', 'ABORT: RJ mismatch') AS status;

-- 1. Soft-deactivate 9 dissolved Rajasthan districts (Gazette 29-Dec-2024 / RBI Circular RBI/2025-26/25)
UPDATE districts SET is_current_admin = 0 WHERE id IN (765, 770, 771, 772, 773, 774, 777, 780, 781) AND state_id = 29;

-- 2. Standardize Typographical and Character Encoding Errors
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

-- Post-check: Verify new counts
SELECT COUNT(*) AS total_districts_expected_813 FROM districts;
SELECT COUNT(*) AS current_admin_expected_790 FROM districts WHERE is_current_admin = 1;
SELECT COUNT(*) AS inactive_districts_expected_23 FROM districts WHERE is_current_admin = 0;

-- ROLLBACK FOR PREVIEW SAFETY (To apply, replace ROLLBACK with COMMIT upon approval)
ROLLBACK;
