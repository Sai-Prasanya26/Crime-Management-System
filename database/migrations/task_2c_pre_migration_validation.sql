-- =============================================================================
-- TASK 2C PRE-MIGRATION VALIDATION SQL
-- Run this read-only script before executing the Task 2C migration.
-- =============================================================================

-- 1. Verify total row count in district_geography_mapping (must be exactly 797)
SELECT COUNT(*) AS total_mappings_expected_797 FROM district_geography_mapping;

-- 2. Verify all mapping_percentage values are NULL (must be 0 non-null)
SELECT COUNT(mapping_percentage) AS non_null_percentages_expected_0 FROM district_geography_mapping;

-- 3. Verify mapping_type distribution before migration
-- Expected: SAME=624, SPLIT=134, REORGANIZED=26, TRANSFERRED=11, MERGED=2
SELECT mapping_type, COUNT(*) AS count FROM district_geography_mapping GROUP BY mapping_type ORDER BY count DESC;

-- 4. Verify that exactly 109 target records exist and all have mapping_type = 'SAME'
SELECT COUNT(*) AS target_same_count_expected_109 FROM district_geography_mapping WHERE id IN (4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 25, 26, 28, 31, 32, 33, 34, 40, 46, 49, 54, 56, 57, 99, 101, 102, 104, 105, 109, 112, 113, 114, 115, 123, 125, 128, 129, 135, 138, 139, 144, 147, 151, 227, 278, 303, 305, 309, 314, 349, 354, 355, 356, 358, 359, 360, 361, 362, 364, 367, 368, 369, 370, 373, 377, 379, 384, 385, 389, 394, 436, 437, 448, 451, 452, 455, 456, 457, 465, 467, 469, 472, 475, 479, 480, 483, 484, 487, 495, 500, 514, 517, 518, 521, 522, 523, 551, 578, 579, 592, 609, 612, 615, 622) AND mapping_type = 'SAME';

-- 5. Verify that no target record has an unexpected mapping_type
SELECT id, historical_district_id, current_district_id, mapping_type FROM district_geography_mapping WHERE id IN (4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 25, 26, 28, 31, 32, 33, 34, 40, 46, 49, 54, 56, 57, 99, 101, 102, 104, 105, 109, 112, 113, 114, 115, 123, 125, 128, 129, 135, 138, 139, 144, 147, 151, 227, 278, 303, 305, 309, 314, 349, 354, 355, 356, 358, 359, 360, 361, 362, 364, 367, 368, 369, 370, 373, 377, 379, 384, 385, 389, 394, 436, 437, 448, 451, 452, 455, 456, 457, 465, 467, 469, 472, 475, 479, 480, 483, 484, 487, 495, 500, 514, 517, 518, 521, 522, 523, 551, 578, 579, 592, 609, 612, 615, 622) AND mapping_type != 'SAME';
