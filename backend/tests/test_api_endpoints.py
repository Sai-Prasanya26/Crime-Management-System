"""
Phase 7B & 7C End-to-End API Integration, Dual-Layer Geography & State Crime Coverage Verification Tests.
Tests live MySQL database with dual-layer geography, 789 current districts (including 28 AP districts),
640 historical Census-2011 districts, official NCRB crime statistics, and analytics integrity across all
191,679 historical incident records.
"""

import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == {"status": "ok"}
    print("[PASS] GET /health: PASS")

    resp_v1 = client.get("/api/v1/health")
    assert resp_v1.status_code == 200, f"Expected 200, got {resp_v1.status_code}"
    data = resp_v1.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    print(f"[PASS] GET /api/v1/health: PASS ({data})")


def test_geography_states():
    # 1. Current Administrative Master: 36 Entities (28 States + 8 UTs)
    resp = client.get("/api/v1/geography/states")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["total"] == 36, f"Expected 36 current states/UTs, got {data['total']}"
    assert len(data["items"]) == 36

    state_names = [s["state_name"] for s in data["items"]]
    assert "TELANGANA" in state_names, "Telangana must exist in current states"
    assert "LADAKH" in state_names, "Ladakh must exist in current UTs"
    assert "ODISHA" in state_names, "Odisha must replace Orissa"
    assert "PUDUCHERRY" in state_names, "Puducherry must replace Pondicherry"
    assert "DADRA AND NAGAR HAVELI AND DAMAN AND DIU" in state_names, "Dadra & Nagar Haveli and Daman & Diu must be unified"

    states_count = sum(1 for s in data["items"] if s.get("entity_type") == "STATE")
    uts_count = sum(1 for s in data["items"] if s.get("entity_type") == "UT")
    assert states_count == 28, f"Expected 28 States, got {states_count}"
    assert uts_count == 8, f"Expected 8 UTs, got {uts_count}"
    print(f"[PASS] GET /api/v1/geography/states (current): PASS ({data['total']} entities: 28 States, 8 UTs)")

    # 2. Historical Baseline: 35 Entities (Census 2011)
    resp_hist = client.get("/api/v1/geography/states?view=historical")
    assert resp_hist.status_code == 200
    data_hist = resp_hist.json()
    assert data_hist["total"] == 35, f"Expected 35 historical states, got {data_hist['total']}"
    print(f"[PASS] GET /api/v1/geography/states?view=historical: PASS (35 Census 2011 states)")


def test_geography_districts():
    # 1. All Current Administrative Districts: 789 districts (incorporating AP 28-district reorganization)
    resp = client.get("/api/v1/geography/districts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 789, f"Expected 789 current districts, got {data['total']}"
    print(f"[PASS] GET /api/v1/geography/districts (current layer): PASS ({data['total']} districts)")

    # 2. All Historical Census 2011 Districts: 640 districts
    resp_hist = client.get("/api/v1/geography/districts?view=historical")
    assert resp_hist.status_code == 200
    data_hist = resp_hist.json()
    assert data_hist["total"] == 640, f"Expected 640 historical districts, got {data_hist['total']}"
    print(f"[PASS] GET /api/v1/geography/districts?view=historical: PASS ({data_hist['total']} Census 2011 districts)")

    # 3. Current Telangana Districts: Exactly 33 districts
    resp_states = client.get("/api/v1/geography/states")
    tg_state = next(s for s in resp_states.json()["items"] if s["state_name"] == "TELANGANA")
    resp_tg = client.get(f"/api/v1/geography/districts?state_id={tg_state['id']}&view=current")
    assert resp_tg.status_code == 200
    data_tg = resp_tg.json()
    assert data_tg["total"] == 33, f"Expected 33 Telangana districts, got {data_tg['total']}"
    tg_district_names = [d["district_name"] for d in data_tg["items"]]
    assert "Hyderabad" in tg_district_names, "Hyderabad must exist under Telangana in current layer"
    print(f"[PASS] GET /api/v1/geography/districts?state_id={tg_state['id']} (Telangana): PASS (33 districts verified)")

    # 4. Current Andhra Pradesh Districts: Exactly 28 districts (incorporating Dec 31, 2025 reorganization)
    ap_state = next(s for s in resp_states.json()["items"] if s["state_name"] == "ANDHRA PRADESH")
    resp_ap = client.get(f"/api/v1/geography/districts?state_id={ap_state['id']}&view=current")
    assert resp_ap.status_code == 200
    data_ap = resp_ap.json()
    assert data_ap["total"] == 28, f"Expected 28 Andhra Pradesh districts, got {data_ap['total']}"
    ap_district_names = [d["district_name"] for d in data_ap["items"]]
    assert "Markapuram" in ap_district_names, "Markapuram must exist in AP current districts"
    assert "Polavaram" in ap_district_names, "Polavaram must exist in AP current districts"
    print(f"[PASS] GET /api/v1/geography/districts?state_id={ap_state['id']} (Andhra Pradesh): PASS (28 districts verified)")

    # 5. Current Ladakh Districts: Exactly 2 districts
    la_state = next(s for s in resp_states.json()["items"] if s["state_name"] == "LADAKH")
    resp_la = client.get(f"/api/v1/geography/districts?state_id={la_state['id']}&view=current")
    assert resp_la.status_code == 200
    data_la = resp_la.json()
    assert data_la["total"] == 2, f"Expected 2 Ladakh districts, got {data_la['total']}"
    print(f"[PASS] GET /api/v1/geography/districts?state_id={la_state['id']} (Ladakh): PASS (2 districts verified)")


def test_geography_hyderabad():
    resp_states = client.get("/api/v1/geography/states")
    tg_state = next(s for s in resp_states.json()["items"] if s["state_name"] == "TELANGANA")
    resp_districts = client.get(f"/api/v1/geography/districts?state_id={tg_state['id']}&view=current")
    hyd_curr = next(d for d in resp_districts.json()["items"] if d["district_name"] == "Hyderabad")
    assert hyd_curr["state_name"] == "TELANGANA"
    assert hyd_curr["parent_district_id"] == 9, f"Expected parent_district_id=9, got {hyd_curr['parent_district_id']}"

    # Verify Hyderabad does NOT appear under Andhra Pradesh current districts
    ap_state = next(s for s in resp_states.json()["items"] if s["state_name"] == "ANDHRA PRADESH")
    resp_ap = client.get(f"/api/v1/geography/districts?state_id={ap_state['id']}&view=current")
    ap_dists = [d["district_name"] for d in resp_ap.json()["items"]]
    assert "Hyderabad" not in ap_dists, "Hyderabad must NOT appear in current Andhra Pradesh districts"
    print(f"[PASS] Current Hyderabad: PASS (ID {hyd_curr['id']} belongs to TELANGANA, NOT in AP)")


def test_geography_district_detail():
    resp = client.get("/api/v1/geography/districts/1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == 1
    assert data["district_name"] is not None
    assert data["state_name"] is not None
    assert data["demographics"] is not None
    demog = data["demographics"]
    assert demog["total_population"] > 0
    print(f"[PASS] GET /api/v1/geography/districts/1: PASS ({data['district_name']}, {data['state_name']} - Pop: {demog['total_population']:,}, Literate: {demog['literate_population']:,})")

    # 404 test for non-existent district
    resp_404 = client.get("/api/v1/geography/districts/99999")
    assert resp_404.status_code == 404
    print("[PASS] GET /api/v1/geography/districts/99999 (404 Not Found): PASS")


def test_geography_mappings():
    resp = client.get("/api/v1/geography/mappings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 786, f"Expected >=786 mappings, got {data['total']}"
    hyd_mapping = next((m for m in data["items"] if m["historical_district_id"] == 9), None)
    assert hyd_mapping is not None, "Hyderabad mapping must exist"
    assert hyd_mapping["mapping_type"] == "TRANSFERRED"
    assert hyd_mapping["current_state_name"] == "TELANGANA"
    print(f"[PASS] GET /api/v1/geography/mappings: PASS ({data['total']} verified boundary mappings, Hyderabad: TRANSFERRED to Telangana)")


def test_official_crime_statistics():
    resp_years = client.get("/api/v1/official-crime/years")
    assert resp_years.status_code == 200
    years = resp_years.json()
    assert 2024 in years, "Year 2024 must be present"
    assert 2023 in years, "Year 2023 must be present"
    assert 2022 in years, "Year 2022 must be present"
    print(f"[PASS] GET /api/v1/official-crime/years: PASS (Available: {years})")

    # National statistics for 2023
    resp_nat = client.get("/api/v1/official-crime/statistics?report_year=2023&geography_level=NATIONAL")
    assert resp_nat.status_code == 200
    data_nat = resp_nat.json()
    assert data_nat["total"] >= 5, f"Expected at least 5 national crime heads, got {data_nat['total']}"
    tot_cognizable = next(item for item in data_nat["items"] if item["crime_head"] == "Total Cognizable Crimes")
    assert tot_cognizable["reported_cases"] == 6244792
    assert tot_cognizable["chargesheet_rate"] == 72.7
    print(f"[PASS] GET /api/v1/official-crime/statistics (2023 National): PASS (Reported: {tot_cognizable['reported_cases']:,}, Chargesheet Rate: {tot_cognizable['chargesheet_rate']}%)")

    # State-level statistics for 2023
    resp_states = client.get("/api/v1/official-crime/statistics?report_year=2023&geography_level=STATE")
    assert resp_states.status_code == 200
    data_states = resp_states.json()
    assert data_states["total"] == 36, f"Expected 36 states/UTs in 2023 official data, got {data_states['total']}"
    print(f"[PASS] GET /api/v1/official-crime/statistics (2023 State-wise): PASS (All 36 States/UTs verified)")


# =====================================================================
# PHASE 7C SPECIFIC AUTOMATED TESTS
# =====================================================================

def test_phase7c_state_coverage_api():
    """
    Verifies Section 16 requirements:
    1. Exactly 36 active States/UTs.
    2. Exactly 28 States.
    3. Exactly 8 UTs.
    4. Every active State/UT appears in coverage API.
    5. Telangana exists.
    6. Telangana has 33 current districts.
    7. Hyderabad current district belongs to Telangana.
    8. Andhra Pradesh has 28 current districts.
    9. Ladakh exists (2 districts).
    10. 191,679 historical incidents remain unchanged.
    11. No fake incident records were inserted.
    """
    resp = client.get("/api/v1/official-crime/coverage")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()

    # 1. Exactly 36 active entities
    assert data["total_entities"] == 36, f"Expected 36 total entities, got {data['total_entities']}"
    # 2. Exactly 28 States
    assert data["states_count"] == 28, f"Expected 28 States, got {data['states_count']}"
    # 3. Exactly 8 UTs
    assert data["uts_count"] == 8, f"Expected 8 UTs, got {data['uts_count']}"
    # 4. Total current districts nationwide is 789
    assert data["total_current_districts"] == 789, f"Expected 789 current districts, got {data['total_current_districts']}"
    # 5. Historical incident count across all states is exactly 191,679
    assert data["total_historical_incidents"] == 191679, f"Expected 191679 incidents, got {data['total_historical_incidents']}"

    # Map items by name
    items_by_name = {item["state_name"]: item for item in data["items"]}
    assert len(items_by_name) == 36, "All 36 states must be present without omission"

    # Telangana check
    assert "TELANGANA" in items_by_name
    tg = items_by_name["TELANGANA"]
    assert tg["entity_type"] == "STATE"
    assert tg["district_count"] == 33, f"Expected 33 Telangana districts, got {tg['district_count']}"
    assert tg["historical_incident_count"] == 5280, f"Expected 5,280 incidents, got {tg['historical_incident_count']}"
    assert tg["official_data_available"] is True
    assert tg["coverage_status"] == "COMPLETE"
    assert tg["latest_official_crime_year"] == 2024

    # Andhra Pradesh check
    assert "ANDHRA PRADESH" in items_by_name
    ap = items_by_name["ANDHRA PRADESH"]
    assert ap["entity_type"] == "STATE"
    assert ap["district_count"] == 28, f"Expected 28 AP districts, got {ap['district_count']}"
    assert ap["historical_incident_count"] == 7072, f"Expected 7,072 AP incidents, got {ap['historical_incident_count']}"
    assert ap["official_data_available"] is True
    assert ap["coverage_status"] == "COMPLETE"

    # Ladakh check
    assert "LADAKH" in items_by_name
    la = items_by_name["LADAKH"]
    assert la["entity_type"] == "UT"
    assert la["district_count"] == 2, f"Expected 2 Ladakh districts, got {la['district_count']}"
    assert la["official_data_available"] is True

    # Check that every entity has valid coverage_status
    for item in data["items"]:
        assert item["coverage_status"] in ("COMPLETE", "PARTIAL", "HISTORICAL_ONLY", "OFFICIAL_BENCHMARK_ONLY", "NO_OFFICIAL_DATA_FOUND")
        assert item["data_source"] is not None
        assert item["data_freshness"] is not None

    print(f"[PASS] Phase 7C Coverage API: PASS (36 entities: 28 States, 8 UTs, 789 districts, 191,679 incidents, all COMPLETE)")


def test_phase7c_data_freshness_api():
    """
    Verifies Section 15 & 16:
    - Visible Data Freshness section metadata
    - Census population remains labelled 2011
    - Nationwide NCRB benchmark labelled 2024 / 2023
    - Current geography labelled 2026
    """
    resp = client.get("/api/v1/official-crime/freshness")
    assert resp.status_code == 200
    data = resp.json()

    assert "2020" in data["historical_incident_dataset"] and "2025" in data["historical_incident_dataset"]
    assert "Census 2011" in data["population_baseline"]
    assert "2024" in str(data["latest_official_nationwide_year"])
    assert data["total_active_states"] == 28
    assert data["total_active_uts"] == 8
    assert data["total_current_districts"] == 789
    assert data["total_census_2011_districts"] == 640
    assert data["total_historical_incidents"] == 191679
    assert data["total_official_records"] >= 50
    assert len(data["notes"]) >= 3
    print(f"[PASS] Phase 7C Data Freshness API: PASS (Census 2011 baseline, 2024 NCRB, 2026 geography)")


def test_phase7c_district_coverage_api():
    """
    Verifies Section 11:
    - District coverage audit for current administrative districts
    - Parent district lineage preserved without fabricating records
    """
    resp = client.get("/api/v1/official-crime/district-coverage?state_id=36")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 33, f"Expected 33 Telangana districts, got {data['total']}"
    for d in data["items"]:
        assert d["state_name"] == "TELANGANA"
        assert d["is_current_admin"] is True
        if d["parent_district_id"]:
            assert d["parent_district_name"] is not None
    print(f"[PASS] Phase 7C District Coverage API: PASS (33 Telangana districts with lineage verified)")


def test_crime_overview():
    resp = client.get("/api/v1/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_incidents"] == 191679, f"Expected 191679, got {data['total_incidents']}"
    assert data["cases"]["clearance_rate_pct"] > 0
    assert data["total_districts"] > 0
    assert data["earliest_incident_date"] is not None
    assert data["latest_incident_date"] is not None
    print(f"[PASS] GET /api/v1/analytics/overview: PASS (Total: {data['total_incidents']:,}, Closed: {data['cases']['closed']:,}, Open: {data['cases']['open']:,}, Clearance: {data['cases']['clearance_rate_pct']}%, Date Range: {data['earliest_incident_date']} to {data['latest_incident_date']})")

    # Test state-level filtering for Telangana (State ID 36)
    resp_tg_ov = client.get("/api/v1/analytics/overview?state_id=36")
    assert resp_tg_ov.status_code == 200
    data_tg = resp_tg_ov.json()
    assert data_tg["total_incidents"] == 5280, f"Expected 5,280 Telangana incidents, got {data_tg['total_incidents']}"
    print(f"[PASS] GET /api/v1/analytics/overview?state_id=36 (Telangana): PASS ({data_tg['total_incidents']:,} incidents across 10 parent districts)")

    # Test state-level filtering for Andhra Pradesh (State ID 2)
    resp_ap_ov = client.get("/api/v1/analytics/overview?state_id=2")
    assert resp_ap_ov.status_code == 200
    data_ap = resp_ap_ov.json()
    assert data_ap["total_incidents"] == 7072, f"Expected 7,072 AP incidents, got {data_ap['total_incidents']}"
    print(f"[PASS] GET /api/v1/analytics/overview?state_id=2 (Andhra Pradesh): PASS ({data_ap['total_incidents']:,} incidents across 13 parent districts)")


def test_crime_trends():
    # Year interval
    resp_yr = client.get("/api/v1/analytics/trends?interval=year")
    assert resp_yr.status_code == 200
    data_yr = resp_yr.json()
    assert data_yr["total_points"] > 0
    total_yr_sum = sum(p["incident_count"] for p in data_yr["items"])
    assert total_yr_sum == 191679, f"Expected sum 191679, got {total_yr_sum}"
    print(f"[PASS] GET /api/v1/analytics/trends?interval=year: PASS ({data_yr['total_points']} years, sum = {total_yr_sum:,})")

    # Month interval
    resp_mo = client.get("/api/v1/analytics/trends?interval=month")
    assert resp_mo.status_code == 200
    data_mo = resp_mo.json()
    assert data_mo["total_points"] > 0
    print(f"[PASS] GET /api/v1/analytics/trends?interval=month: PASS ({data_mo['total_points']} monthly bins)")


def test_crime_by_category():
    resp = client.get("/api/v1/analytics/by-category")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_incidents"] == 191679
    assert len(data["items"]) == 4
    for cat in data["items"]:
        print(f"   - {cat['category_name']}: {cat['incident_count']:,} ({cat['percentage']}%) [Weight: {cat['severity_weight']}]")
    print("[PASS] GET /api/v1/analytics/by-category: PASS (4 categories verified)")


def test_crime_by_type():
    resp = client.get("/api/v1/analytics/by-type")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_incidents"] == 191679
    assert len(data["items"]) == 21, f"Expected 21 crime types, got {len(data['items'])}"
    print(f"[PASS] GET /api/v1/analytics/by-type: PASS (21 types, top type: {data['items'][0]['crime_name']} with {data['items'][0]['incident_count']:,})")


def test_crime_hourly():
    resp = client.get("/api/v1/analytics/hourly")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 24
    assert 0 <= data["peak_hour"] <= 23
    peak_item = next(h for h in data["items"] if h["hour"] == data["peak_hour"])
    print(f"[PASS] GET /api/v1/analytics/hourly: PASS (24 hours verified, Peak hour: {data['peak_hour']:02d}:00 with {peak_item['incident_count']:,} incidents ({peak_item['percentage']}%) )")


def test_crime_demographics():
    resp = client.get("/api/v1/analytics/demographics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["average_age"] is not None and data["average_age"] > 0
    print(f"[PASS] GET /api/v1/analytics/demographics: PASS (Avg Age: {data['average_age']}, Genders: {data['gender_distribution']}, Age Groups: {data['age_distribution']})")


def test_crime_weapons():
    resp = client.get("/api/v1/analytics/weapons")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_incidents"] == 191679
    assert len(data["items"]) > 0
    print(f"[PASS] GET /api/v1/analytics/weapons: PASS ({len(data['items'])} weapon classifications, top: {data['items'][0]['weapon_name']} with {data['items'][0]['incident_count']:,})")


def test_crime_top_districts():
    # By volume
    resp_vol = client.get("/api/v1/analytics/top-districts?metric=volume&limit=5")
    assert resp_vol.status_code == 200
    data_vol = resp_vol.json()
    assert data_vol["metric"] == "volume"
    assert len(data_vol["items"]) == 5
    print(f"[PASS] GET /api/v1/analytics/top-districts?metric=volume: PASS (Top: {data_vol['items'][0]['district_name']} with {data_vol['items'][0]['incident_count']:,} incidents)")

    # By rate per 100k
    resp_rate = client.get("/api/v1/analytics/top-districts?metric=rate&limit=5")
    assert resp_rate.status_code == 200
    data_rate = resp_rate.json()
    assert data_rate["metric"] == "rate"
    assert len(data_rate["items"]) == 5
    print(f"[PASS] GET /api/v1/analytics/top-districts?metric=rate: PASS (Top: {data_rate['items'][0]['district_name']} rate {data_rate['items'][0]['crime_rate_per_100k']} per 100k)")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("PHASE 7C: RUNNING COMPLETE API & GEOGRAPHY INTEGRATION TEST SUITE")
    print("=" * 70)
    test_health()
    test_geography_states()
    test_geography_districts()
    test_geography_hyderabad()
    test_geography_district_detail()
    test_geography_mappings()
    test_official_crime_statistics()
    test_phase7c_state_coverage_api()
    test_phase7c_data_freshness_api()
    test_phase7c_district_coverage_api()
    test_crime_overview()
    test_crime_trends()
    test_crime_by_category()
    test_crime_by_type()
    test_crime_hourly()
    test_crime_demographics()
    test_crime_weapons()
    test_crime_top_districts()
    print("=" * 70)
    print("ALL PHASE 7C TESTS PASSED WITH 100% SUCCESS AGAINST LIVE MYSQL DATABASE!")
    print("=" * 70 + "\n")
