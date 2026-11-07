-- =============================================================================
-- TASK 2C GEOGRAPHICAL MAPPING MIGRATION SQL
-- Updates 109 residual parent districts from SAME to REORGANIZED with lineage notes.
-- Transactional with strict multi-column matching and sanity checks.
-- =============================================================================

START TRANSACTION;

-- Pre-update guard check: verify exactly 109 target rows are in 'SAME' state
SET @pre_check_cnt = (SELECT COUNT(*) FROM district_geography_mapping WHERE id IN (4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 25, 26, 28, 31, 32, 33, 34, 40, 46, 49, 54, 56, 57, 99, 101, 102, 104, 105, 109, 112, 113, 114, 115, 123, 125, 128, 129, 135, 138, 139, 144, 147, 151, 227, 278, 303, 305, 309, 314, 349, 354, 355, 356, 358, 359, 360, 361, 362, 364, 367, 368, 369, 370, 373, 377, 379, 384, 385, 389, 394, 436, 437, 448, 451, 452, 455, 456, 457, 465, 467, 469, 472, 475, 479, 480, 483, 484, 487, 495, 500, 514, 517, 518, 521, 522, 523, 551, 578, 579, 592, 609, 612, 615, 622) AND mapping_type = 'SAME');
SELECT IF(@pre_check_cnt = 109, 'PRE-CHECK PASSED: 109 target rows ready', 'PRE-CHECK FAILED: ABORTING TRANSACTION') AS status;

-- Mapping ID #4: Hist #5 (Anantapur) -> Curr #5 (Anantapur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sri Sathya Sai.' WHERE id = 4 AND historical_district_id = 5 AND current_district_id = 5 AND mapping_type = 'SAME';

-- Mapping ID #5: Hist #6 (Chittoor) -> Curr #6 (Chittoor)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tirupati.' WHERE id = 5 AND historical_district_id = 6 AND current_district_id = 6 AND mapping_type = 'SAME';

-- Mapping ID #7: Hist #8 (Guntur) -> Curr #8 (Guntur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bapatla, Palnadu.' WHERE id = 7 AND historical_district_id = 8 AND current_district_id = 8 AND mapping_type = 'SAME';

-- Mapping ID #8: Hist #12 (Krishna) -> Curr #12 (Krishna)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): NTR.' WHERE id = 8 AND historical_district_id = 12 AND current_district_id = 12 AND mapping_type = 'SAME';

-- Mapping ID #9: Hist #13 (Kurnool) -> Curr #13 (Kurnool)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Nandyal.' WHERE id = 9 AND historical_district_id = 13 AND current_district_id = 13 AND mapping_type = 'SAME';

-- Mapping ID #11: Hist #20 (Sri Potti Sriramulu Nellore) -> Curr #20 (Sri Potti Sriramulu Nellore)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following 2022 AP reorganization (transferred Gudur and Sullurpeta divisions to Tirupati; received Kandukur division from Prakasam).' WHERE id = 11 AND historical_district_id = 20 AND current_district_id = 20 AND mapping_type = 'SAME';

-- Mapping ID #12: Hist #21 (Srikakulam) -> Curr #21 (Srikakulam)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following 2022 AP reorganization (transferred Palakonda revenue division to Parvathipuram Manyam).' WHERE id = 12 AND historical_district_id = 21 AND current_district_id = 21 AND mapping_type = 'SAME';

-- Mapping ID #13: Hist #22 (Visakhapatnam) -> Curr #22 (Visakhapatnam)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Alluri Sitharama Raju, Anakapalli.' WHERE id = 13 AND historical_district_id = 22 AND current_district_id = 22 AND mapping_type = 'SAME';

-- Mapping ID #14: Hist #23 (Vizianagaram) -> Curr #23 (Vizianagaram)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Parvathipuram Manyam.' WHERE id = 14 AND historical_district_id = 23 AND current_district_id = 23 AND mapping_type = 'SAME';

-- Mapping ID #15: Hist #25 (West Godavari) -> Curr #25 (West Godavari)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Eluru.' WHERE id = 15 AND historical_district_id = 25 AND current_district_id = 25 AND mapping_type = 'SAME';

-- Mapping ID #16: Hist #26 (Y.S.R.) -> Curr #26 (Y.S.R.)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Annamayya.' WHERE id = 16 AND historical_district_id = 26 AND current_district_id = 26 AND mapping_type = 'SAME';

-- Mapping ID #20: Hist #30 (East Kameng) -> Curr #30 (East Kameng)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pakke Kessang.' WHERE id = 20 AND historical_district_id = 30 AND current_district_id = 30 AND mapping_type = 'SAME';

-- Mapping ID #21: Hist #31 (East Siang) -> Curr #31 (East Siang)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Siang.' WHERE id = 21 AND historical_district_id = 31 AND current_district_id = 31 AND mapping_type = 'SAME';

-- Mapping ID #22: Hist #32 (Kurung Kumey) -> Curr #32 (Kurung Kumey)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kra Daadi.' WHERE id = 22 AND historical_district_id = 32 AND current_district_id = 32 AND mapping_type = 'SAME';

-- Mapping ID #23: Hist #33 (Lohit) -> Curr #33 (Lohit)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Namsai.' WHERE id = 23 AND historical_district_id = 33 AND current_district_id = 33 AND mapping_type = 'SAME';

-- Mapping ID #25: Hist #35 (Lower Subansiri) -> Curr #35 (Lower Subansiri)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kamle, Keyi Panyor.' WHERE id = 25 AND historical_district_id = 35 AND current_district_id = 35 AND mapping_type = 'SAME';

-- Mapping ID #26: Hist #36 (Papum Pare) -> Curr #36 (Papum Pare)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Itanagar Capital Complex.' WHERE id = 26 AND historical_district_id = 36 AND current_district_id = 36 AND mapping_type = 'SAME';

-- Mapping ID #28: Hist #38 (Tirap) -> Curr #38 (Tirap)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Longding.' WHERE id = 28 AND historical_district_id = 38 AND current_district_id = 38 AND mapping_type = 'SAME';

-- Mapping ID #31: Hist #41 (West Kameng) -> Curr #41 (West Kameng)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bichom.' WHERE id = 31 AND historical_district_id = 41 AND current_district_id = 41 AND mapping_type = 'SAME';

-- Mapping ID #32: Hist #42 (West Siang) -> Curr #42 (West Siang)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Lepa Rada, Shi Yomi.' WHERE id = 32 AND historical_district_id = 42 AND current_district_id = 42 AND mapping_type = 'SAME';

-- Mapping ID #33: Hist #43 (Baksa) -> Curr #43 (Baksa)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tamulpur.' WHERE id = 33 AND historical_district_id = 43 AND current_district_id = 43 AND mapping_type = 'SAME';

-- Mapping ID #34: Hist #44 (Barpeta) -> Curr #44 (Barpeta)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Bajali.' WHERE id = 34 AND historical_district_id = 44 AND current_district_id = 44 AND mapping_type = 'SAME';

-- Mapping ID #40: Hist #50 (Dhubri) -> Curr #50 (Dhubri)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South Salmara-Mankachar.' WHERE id = 40 AND historical_district_id = 50 AND current_district_id = 50 AND mapping_type = 'SAME';

-- Mapping ID #46: Hist #56 (Jorhat) -> Curr #56 (Jorhat)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Majuli.' WHERE id = 46 AND historical_district_id = 56 AND current_district_id = 56 AND mapping_type = 'SAME';

-- Mapping ID #49: Hist #59 (Karbi Anglong) -> Curr #59 (Karbi Anglong)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): West Karbi Anglong.' WHERE id = 49 AND historical_district_id = 59 AND current_district_id = 59 AND mapping_type = 'SAME';

-- Mapping ID #54: Hist #64 (Nagaon) -> Curr #64 (Nagaon)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hojai.' WHERE id = 54 AND historical_district_id = 64 AND current_district_id = 64 AND mapping_type = 'SAME';

-- Mapping ID #56: Hist #66 (Sivasagar) -> Curr #66 (Sivasagar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Charaideo.' WHERE id = 56 AND historical_district_id = 66 AND current_district_id = 66 AND mapping_type = 'SAME';

-- Mapping ID #57: Hist #67 (Sonitpur) -> Curr #67 (Sonitpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Biswanath.' WHERE id = 57 AND historical_district_id = 67 AND current_district_id = 67 AND mapping_type = 'SAME';

-- Mapping ID #99: Hist #109 (Bastar) -> Curr #109 (Bastar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kondagaon.' WHERE id = 99 AND historical_district_id = 109 AND current_district_id = 109 AND mapping_type = 'SAME';

-- Mapping ID #101: Hist #111 (Bilaspur) -> Curr #111 (Bilaspur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gaurela-Pendra-Marwahi, Mungeli.' WHERE id = 101 AND historical_district_id = 111 AND current_district_id = 111 AND mapping_type = 'SAME';

-- Mapping ID #102: Hist #112 (Dakshin Bastar Dantewada) -> Curr #112 (Dakshin Bastar Dantewada)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sukma.' WHERE id = 102 AND historical_district_id = 112 AND current_district_id = 112 AND mapping_type = 'SAME';

-- Mapping ID #104: Hist #114 (Durg) -> Curr #114 (Durg)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balod, Bemetara.' WHERE id = 104 AND historical_district_id = 114 AND current_district_id = 114 AND mapping_type = 'SAME';

-- Mapping ID #105: Hist #115 (Janjgir - Champa) -> Curr #115 (Janjgir - Champa)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sakti.' WHERE id = 105 AND historical_district_id = 115 AND current_district_id = 115 AND mapping_type = 'SAME';

-- Mapping ID #109: Hist #119 (Koriya) -> Curr #119 (Koriya)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Manendragarh-Chirmiri-Bharatpur.' WHERE id = 109 AND historical_district_id = 119 AND current_district_id = 119 AND mapping_type = 'SAME';

-- Mapping ID #112: Hist #122 (Raigarh) -> Curr #122 (Raigarh)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sarangarh-Bilaigarh.' WHERE id = 112 AND historical_district_id = 122 AND current_district_id = 122 AND mapping_type = 'SAME';

-- Mapping ID #113: Hist #123 (Raipur) -> Curr #123 (Raipur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Baloda Bazar, Gariaband.' WHERE id = 113 AND historical_district_id = 123 AND current_district_id = 123 AND mapping_type = 'SAME';

-- Mapping ID #114: Hist #124 (Rajnandgaon) -> Curr #124 (Rajnandgaon)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khairagarh-Chhuikhadan-Gandai, Mohla-Manpur-Ambagarh Chowki.' WHERE id = 114 AND historical_district_id = 124 AND current_district_id = 124 AND mapping_type = 'SAME';

-- Mapping ID #115: Hist #125 (Surguja) -> Curr #125 (Surguja)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balrampur, Surajpur.' WHERE id = 115 AND historical_district_id = 125 AND current_district_id = 125 AND mapping_type = 'SAME';

-- Mapping ID #123: Hist #135 (Banas Kantha) -> Curr #135 (Banas Kantha)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Vav-Tharad.' WHERE id = 123 AND historical_district_id = 135 AND current_district_id = 135 AND mapping_type = 'SAME';

-- Mapping ID #125: Hist #137 (Bhavnagar) -> Curr #137 (Bhavnagar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Botad.' WHERE id = 125 AND historical_district_id = 137 AND current_district_id = 137 AND mapping_type = 'SAME';

-- Mapping ID #128: Hist #140 (Jamnagar) -> Curr #140 (Jamnagar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Devbhumi Dwarka.' WHERE id = 128 AND historical_district_id = 140 AND current_district_id = 140 AND mapping_type = 'SAME';

-- Mapping ID #129: Hist #141 (Junagadh) -> Curr #141 (Junagadh)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gir Somnath.' WHERE id = 129 AND historical_district_id = 141 AND current_district_id = 141 AND mapping_type = 'SAME';

-- Mapping ID #135: Hist #147 (Panch Mahals) -> Curr #147 (Panch Mahals)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mahisagar.' WHERE id = 135 AND historical_district_id = 147 AND current_district_id = 147 AND mapping_type = 'SAME';

-- Mapping ID #138: Hist #150 (Rajkot) -> Curr #150 (Rajkot)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Morbi.' WHERE id = 138 AND historical_district_id = 150 AND current_district_id = 150 AND mapping_type = 'SAME';

-- Mapping ID #139: Hist #151 (Sabar Kantha) -> Curr #151 (Sabar Kantha)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Aravalli.' WHERE id = 139 AND historical_district_id = 151 AND current_district_id = 151 AND mapping_type = 'SAME';

-- Mapping ID #144: Hist #156 (Vadodara) -> Curr #156 (Vadodara)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Chhota Udaipur.' WHERE id = 144 AND historical_district_id = 156 AND current_district_id = 156 AND mapping_type = 'SAME';

-- Mapping ID #147: Hist #159 (Bhiwani) -> Curr #159 (Bhiwani)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Charkhi Dadri.' WHERE id = 147 AND historical_district_id = 159 AND current_district_id = 159 AND mapping_type = 'SAME';

-- Mapping ID #151: Hist #163 (Hisar) -> Curr #163 (Hisar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hansi.' WHERE id = 151 AND historical_district_id = 163 AND current_district_id = 163 AND mapping_type = 'SAME';

-- Mapping ID #227: Hist #241 (Bellary) -> Curr #241 (Bellary)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Vijayanagara.' WHERE id = 227 AND historical_district_id = 241 AND current_district_id = 241 AND mapping_type = 'SAME';

-- Mapping ID #278: Hist #292 (Chhindwara) -> Curr #292 (Chhindwara)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pandhurna.' WHERE id = 278 AND historical_district_id = 292 AND current_district_id = 292 AND mapping_type = 'SAME';

-- Mapping ID #303: Hist #317 (Rewa) -> Curr #317 (Rewa)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mauganj.' WHERE id = 303 AND historical_district_id = 317 AND current_district_id = 317 AND mapping_type = 'SAME';

-- Mapping ID #305: Hist #319 (Satna) -> Curr #319 (Satna)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Maihar.' WHERE id = 305 AND historical_district_id = 319 AND current_district_id = 319 AND mapping_type = 'SAME';

-- Mapping ID #309: Hist #323 (Shajapur) -> Curr #323 (Shajapur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Agar Malwa.' WHERE id = 309 AND historical_district_id = 323 AND current_district_id = 323 AND mapping_type = 'SAME';

-- Mapping ID #314: Hist #328 (Tikamgarh) -> Curr #328 (Tikamgarh)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Niwari.' WHERE id = 314 AND historical_district_id = 328 AND current_district_id = 328 AND mapping_type = 'SAME';

-- Mapping ID #349: Hist #363 (Thane) -> Curr #363 (Thane)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Palghar.' WHERE id = 349 AND historical_district_id = 363 AND current_district_id = 363 AND mapping_type = 'SAME';

-- Mapping ID #354: Hist #368 (Chandel) -> Curr #368 (Chandel)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tengnoupal.' WHERE id = 354 AND historical_district_id = 368 AND current_district_id = 368 AND mapping_type = 'SAME';

-- Mapping ID #355: Hist #369 (Churachandpur) -> Curr #369 (Churachandpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pherzawl.' WHERE id = 355 AND historical_district_id = 369 AND current_district_id = 369 AND mapping_type = 'SAME';

-- Mapping ID #356: Hist #370 (Imphal East) -> Curr #370 (Imphal East)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jiribam.' WHERE id = 356 AND historical_district_id = 370 AND current_district_id = 370 AND mapping_type = 'SAME';

-- Mapping ID #358: Hist #372 (Senapati) -> Curr #372 (Senapati)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kangpokpi.' WHERE id = 358 AND historical_district_id = 372 AND current_district_id = 372 AND mapping_type = 'SAME';

-- Mapping ID #359: Hist #373 (Tamenglong) -> Curr #373 (Tamenglong)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Noney.' WHERE id = 359 AND historical_district_id = 373 AND current_district_id = 373 AND mapping_type = 'SAME';

-- Mapping ID #360: Hist #374 (Thoubal) -> Curr #374 (Thoubal)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kakching.' WHERE id = 360 AND historical_district_id = 374 AND current_district_id = 374 AND mapping_type = 'SAME';

-- Mapping ID #361: Hist #375 (Ukhrul) -> Curr #375 (Ukhrul)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kamjong.' WHERE id = 361 AND historical_district_id = 375 AND current_district_id = 375 AND mapping_type = 'SAME';

-- Mapping ID #362: Hist #376 (East Garo Hills) -> Curr #376 (East Garo Hills)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): North Garo Hills.' WHERE id = 362 AND historical_district_id = 376 AND current_district_id = 376 AND mapping_type = 'SAME';

-- Mapping ID #364: Hist #378 (Jaintia Hills) -> Curr #378 (Jaintia Hills)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): East Jaintia Hills.' WHERE id = 364 AND historical_district_id = 378 AND current_district_id = 378 AND mapping_type = 'SAME';

-- Mapping ID #367: Hist #381 (West Garo Hills) -> Curr #381 (West Garo Hills)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South West Garo Hills.' WHERE id = 367 AND historical_district_id = 381 AND current_district_id = 381 AND mapping_type = 'SAME';

-- Mapping ID #368: Hist #382 (West Khasi Hills) -> Curr #382 (West Khasi Hills)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Eastern West Khasi Hills, South West Khasi Hills.' WHERE id = 368 AND historical_district_id = 382 AND current_district_id = 382 AND mapping_type = 'SAME';

-- Mapping ID #369: Hist #383 (Aizawl) -> Curr #383 (Aizawl)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Saitual.' WHERE id = 369 AND historical_district_id = 383 AND current_district_id = 383 AND mapping_type = 'SAME';

-- Mapping ID #370: Hist #384 (Champhai) -> Curr #384 (Champhai)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khawzawl.' WHERE id = 370 AND historical_district_id = 384 AND current_district_id = 384 AND mapping_type = 'SAME';

-- Mapping ID #373: Hist #387 (Lunglei) -> Curr #387 (Lunglei)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hnahthial.' WHERE id = 373 AND historical_district_id = 387 AND current_district_id = 387 AND mapping_type = 'SAME';

-- Mapping ID #377: Hist #391 (Dimapur) -> Curr #391 (Dimapur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Ch??moukedima, Niuland.' WHERE id = 377 AND historical_district_id = 391 AND current_district_id = 391 AND mapping_type = 'SAME';

-- Mapping ID #379: Hist #393 (Kohima) -> Curr #393 (Kohima)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tseminy??.' WHERE id = 379 AND historical_district_id = 393 AND current_district_id = 393 AND mapping_type = 'SAME';

-- Mapping ID #384: Hist #398 (Phek) -> Curr #398 (Phek)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Meluri.' WHERE id = 384 AND historical_district_id = 398 AND current_district_id = 398 AND mapping_type = 'SAME';

-- Mapping ID #385: Hist #399 (Tuensang) -> Curr #399 (Tuensang)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Noklak, Shamator.' WHERE id = 385 AND historical_district_id = 399 AND current_district_id = 399 AND mapping_type = 'SAME';

-- Mapping ID #389: Hist #403 (East) -> Curr #403 (East)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shahdara.' WHERE id = 389 AND historical_district_id = 403 AND current_district_id = 403 AND mapping_type = 'SAME';

-- Mapping ID #394: Hist #408 (South) -> Curr #408 (South)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): South East Delhi.' WHERE id = 394 AND historical_district_id = 408 AND current_district_id = 408 AND mapping_type = 'SAME';

-- Mapping ID #436: Hist #450 (Firozpur) -> Curr #450 (Firozpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Fazilka.' WHERE id = 436 AND historical_district_id = 450 AND current_district_id = 450 AND mapping_type = 'SAME';

-- Mapping ID #437: Hist #451 (Gurdaspur) -> Curr #451 (Gurdaspur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pathankot.' WHERE id = 437 AND historical_district_id = 451 AND current_district_id = 451 AND mapping_type = 'SAME';

-- Mapping ID #448: Hist #462 (Sangrur) -> Curr #462 (Sangrur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Malerkotla.' WHERE id = 448 AND historical_district_id = 462 AND current_district_id = 462 AND mapping_type = 'SAME';

-- Mapping ID #451: Hist #465 (Ajmer) -> Curr #465 (Ajmer)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Beawar, Kekri.' WHERE id = 451 AND historical_district_id = 465 AND current_district_id = 465 AND mapping_type = 'SAME';

-- Mapping ID #452: Hist #466 (Alwar) -> Curr #466 (Alwar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khairthal-Tijara.' WHERE id = 452 AND historical_district_id = 466 AND current_district_id = 466 AND mapping_type = 'SAME';

-- Mapping ID #455: Hist #469 (Barmer) -> Curr #469 (Barmer)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Balotra.' WHERE id = 455 AND historical_district_id = 469 AND current_district_id = 469 AND mapping_type = 'SAME';

-- Mapping ID #456: Hist #470 (Bharatpur) -> Curr #470 (Bharatpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Deeg.' WHERE id = 456 AND historical_district_id = 470 AND current_district_id = 470 AND mapping_type = 'SAME';

-- Mapping ID #457: Hist #471 (Bhilwara) -> Curr #471 (Bhilwara)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shahpura.' WHERE id = 457 AND historical_district_id = 471 AND current_district_id = 471 AND mapping_type = 'SAME';

-- Mapping ID #465: Hist #479 (Ganganagar) -> Curr #479 (Ganganagar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Anupgarh.' WHERE id = 465 AND historical_district_id = 479 AND current_district_id = 479 AND mapping_type = 'SAME';

-- Mapping ID #467: Hist #481 (Jaipur) -> Curr #481 (Jaipur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Dudu, Jaipur Rural, Kotputli-Behror.' WHERE id = 467 AND historical_district_id = 481 AND current_district_id = 481 AND mapping_type = 'SAME';

-- Mapping ID #469: Hist #483 (Jalor) -> Curr #483 (Jalor)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sanchore.' WHERE id = 469 AND historical_district_id = 483 AND current_district_id = 483 AND mapping_type = 'SAME';

-- Mapping ID #472: Hist #486 (Jodhpur) -> Curr #486 (Jodhpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jodhpur Rural, Phalodi.' WHERE id = 472 AND historical_district_id = 486 AND current_district_id = 486 AND mapping_type = 'SAME';

-- Mapping ID #475: Hist #489 (Nagaur) -> Curr #489 (Nagaur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Didwana-Kuchaman.' WHERE id = 475 AND historical_district_id = 489 AND current_district_id = 489 AND mapping_type = 'SAME';

-- Mapping ID #479: Hist #493 (Sawai Madhopur) -> Curr #493 (Sawai Madhopur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gangapur City.' WHERE id = 479 AND historical_district_id = 493 AND current_district_id = 493 AND mapping_type = 'SAME';

-- Mapping ID #480: Hist #494 (Sikar) -> Curr #494 (Sikar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Neem Ka Thana.' WHERE id = 480 AND historical_district_id = 494 AND current_district_id = 494 AND mapping_type = 'SAME';

-- Mapping ID #483: Hist #497 (Udaipur) -> Curr #497 (Udaipur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Salumbar.' WHERE id = 483 AND historical_district_id = 497 AND current_district_id = 497 AND mapping_type = 'SAME';

-- Mapping ID #484: Hist #498 (East District) -> Curr #498 (East District)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Pakyong.' WHERE id = 484 AND historical_district_id = 498 AND current_district_id = 498 AND mapping_type = 'SAME';

-- Mapping ID #487: Hist #501 (West District) -> Curr #501 (West District)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Soreng.' WHERE id = 487 AND historical_district_id = 501 AND current_district_id = 501 AND mapping_type = 'SAME';

-- Mapping ID #495: Hist #509 (Kancheepuram) -> Curr #509 (Kancheepuram)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Chengalpattu.' WHERE id = 495 AND historical_district_id = 509 AND current_district_id = 509 AND mapping_type = 'SAME';

-- Mapping ID #500: Hist #514 (Nagapattinam) -> Curr #514 (Nagapattinam)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Mayiladuthurai.' WHERE id = 500 AND historical_district_id = 514 AND current_district_id = 514 AND mapping_type = 'SAME';

-- Mapping ID #514: Hist #528 (Tirunelveli) -> Curr #528 (Tirunelveli)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Tenkasi.' WHERE id = 514 AND historical_district_id = 528 AND current_district_id = 528 AND mapping_type = 'SAME';

-- Mapping ID #517: Hist #531 (Vellore) -> Curr #531 (Vellore)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Ranipet, Tirupathur.' WHERE id = 517 AND historical_district_id = 531 AND current_district_id = 531 AND mapping_type = 'SAME';

-- Mapping ID #518: Hist #532 (Viluppuram) -> Curr #532 (Viluppuram)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kallakurichi.' WHERE id = 518 AND historical_district_id = 532 AND current_district_id = 532 AND mapping_type = 'SAME';

-- Mapping ID #521: Hist #535 (North Tripura) -> Curr #535 (North Tripura)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Unakoti.' WHERE id = 521 AND historical_district_id = 535 AND current_district_id = 535 AND mapping_type = 'SAME';

-- Mapping ID #522: Hist #536 (South Tripura) -> Curr #536 (South Tripura)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Gomati.' WHERE id = 522 AND historical_district_id = 536 AND current_district_id = 536 AND mapping_type = 'SAME';

-- Mapping ID #523: Hist #537 (West Tripura) -> Curr #537 (West Tripura)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Khowai, Sepahijala.' WHERE id = 523 AND historical_district_id = 537 AND current_district_id = 537 AND mapping_type = 'SAME';

-- Mapping ID #551: Hist #565 (Ghaziabad) -> Curr #565 (Ghaziabad)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Hapur.' WHERE id = 551 AND historical_district_id = 565 AND current_district_id = 565 AND mapping_type = 'SAME';

-- Mapping ID #578: Hist #592 (Moradabad) -> Curr #592 (Moradabad)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Sambhal.' WHERE id = 578 AND historical_district_id = 592 AND current_district_id = 592 AND mapping_type = 'SAME';

-- Mapping ID #579: Hist #593 (Muzaffarnagar) -> Curr #593 (Muzaffarnagar)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Shamli.' WHERE id = 579 AND historical_district_id = 593 AND current_district_id = 593 AND mapping_type = 'SAME';

-- Mapping ID #592: Hist #606 (Sultanpur) -> Curr #606 (Sultanpur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Amethi.' WHERE id = 592 AND historical_district_id = 606 AND current_district_id = 606 AND mapping_type = 'SAME';

-- Mapping ID #609: Hist #623 (Barddhaman) -> Curr #623 (Barddhaman)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Paschim Bardhaman.' WHERE id = 609 AND historical_district_id = 623 AND current_district_id = 623 AND mapping_type = 'SAME';

-- Mapping ID #612: Hist #626 (Darjiling) -> Curr #626 (Darjiling)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Kalimpong.' WHERE id = 612 AND historical_district_id = 626 AND current_district_id = 626 AND mapping_type = 'SAME';

-- Mapping ID #615: Hist #629 (Jalpaiguri) -> Curr #629 (Jalpaiguri)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Alipurduar.' WHERE id = 615 AND historical_district_id = 629 AND current_district_id = 629 AND mapping_type = 'SAME';

-- Mapping ID #622: Hist #636 (Paschim Medinipur) -> Curr #636 (Paschim Medinipur)
UPDATE district_geography_mapping SET mapping_type = 'REORGANIZED', notes = 'Residual parent jurisdiction following administrative boundary reorganizations and carving of modern district(s): Jhargram.' WHERE id = 622 AND historical_district_id = 636 AND current_district_id = 636 AND mapping_type = 'SAME';

-- Post-update verification within transaction
SET @post_check_cnt = (SELECT COUNT(*) FROM district_geography_mapping WHERE id IN (4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 25, 26, 28, 31, 32, 33, 34, 40, 46, 49, 54, 56, 57, 99, 101, 102, 104, 105, 109, 112, 113, 114, 115, 123, 125, 128, 129, 135, 138, 139, 144, 147, 151, 227, 278, 303, 305, 309, 314, 349, 354, 355, 356, 358, 359, 360, 361, 362, 364, 367, 368, 369, 370, 373, 377, 379, 384, 385, 389, 394, 436, 437, 448, 451, 452, 455, 456, 457, 465, 467, 469, 472, 475, 479, 480, 483, 484, 487, 495, 500, 514, 517, 518, 521, 522, 523, 551, 578, 579, 592, 609, 612, 615, 622) AND mapping_type = 'REORGANIZED');
SELECT IF(@post_check_cnt = 109, 'POST-CHECK PASSED: 109 rows updated to REORGANIZED', 'POST-CHECK FAILED: DO NOT COMMIT') AS status;

-- Final Commit (only execute if post-check passed)
COMMIT;
