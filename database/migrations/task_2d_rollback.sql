-- =============================================================================
-- TASK 2D GEOGRAPHICAL MASTER DATA CLEANUP ROLLBACK SQL
--
-- Restores database to pre-migration Task 2D baseline:
-- 1. Deletes lineage mappings for Lower Siang (#802) and Sankoo (#814)
-- 2. Deletes added districts Lower Siang (#802) and Sankoo (#814)
-- 3. Reactivates 9 dissolved Rajasthan districts (is_current_admin: 0 -> 1)
-- 4. Restores 3 original district names
--
-- Restored counts: 811 total districts, 797 active districts, 14 inactive districts
-- =============================================================================

START TRANSACTION;

-- 1. Remove lineage mappings for 802 and 814
DELETE FROM district_geography_mapping WHERE current_district_id IN (802, 814);

-- 2. Remove added districts 802 and 814
DELETE FROM districts WHERE id IN (802, 814);

-- 3. Reactivate 9 Rajasthan districts
UPDATE districts 
SET is_current_admin = 1 
WHERE id IN (765, 770, 771, 772, 773, 774, 777, 780, 781) 
  AND state_id = 29;

-- 4. Restore original district names
UPDATE districts SET district_name = 'North  And Middle Andaman' WHERE id = 2 AND state_id = 1;
UPDATE districts SET district_name = 'Ch??moukedima' WHERE id = 755 AND state_id = 24;
UPDATE districts SET district_name = 'Tseminy??' WHERE id = 759 AND state_id = 24;

-- Post-rollback checks
SELECT IF((SELECT COUNT(*) FROM districts) = 811, 'ROLLBACK-CHECK 1 PASSED: total districts = 811', 'ABORT: total districts mismatch') AS status;
SELECT IF((SELECT COUNT(*) FROM districts WHERE is_current_admin = 1) = 797, 'ROLLBACK-CHECK 2 PASSED: active districts = 797', 'ABORT: active districts mismatch') AS status;
SELECT IF((SELECT COUNT(*) FROM districts WHERE is_current_admin = 0) = 14, 'ROLLBACK-CHECK 3 PASSED: inactive districts = 14', 'ABORT: inactive districts mismatch') AS status;
SELECT IF((SELECT COUNT(*) FROM district_geography_mapping) = 797, 'ROLLBACK-CHECK 4 PASSED: mappings = 797', 'ABORT: mappings mismatch') AS status;

COMMIT;
