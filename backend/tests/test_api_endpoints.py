"""
Phase 4 End-to-End API Integration & Verification Tests.
Tests all geography and crime analytics endpoints against live MySQL database.
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
    resp = client.get("/api/v1/geography/states")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["total"] == 35, f"Expected 35 states, got {data['total']}"
    assert len(data["items"]) == 35
    print(f"[PASS] GET /api/v1/geography/states: PASS ({data['total']} states verified)")


def test_geography_districts():
    # All districts
    resp = client.get("/api/v1/geography/districts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 640, f"Expected 640 districts, got {data['total']}"
    print(f"[PASS] GET /api/v1/geography/districts (all): PASS ({data['total']} districts)")

    # Filtered by state_id=1
    resp_filtered = client.get("/api/v1/geography/districts?state_id=1")
    assert resp_filtered.status_code == 200
    data_filt = resp_filtered.json()
    assert data_filt["total"] > 0
    print(f"[PASS] GET /api/v1/geography/districts?state_id=1: PASS ({data_filt['total']} districts in state 1)")


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
    print("PHASE 4: RUNNING COMPLETE API VERIFICATION TEST SUITE")
    print("=" * 70)
    test_health()
    test_geography_states()
    test_geography_districts()
    test_geography_district_detail()
    test_crime_overview()
    test_crime_trends()
    test_crime_by_category()
    test_crime_by_type()
    test_crime_hourly()
    test_crime_demographics()
    test_crime_weapons()
    test_crime_top_districts()
    print("=" * 70)
    print("ALL API ENDPOINTS PASSED WITH 100% SUCCESS AGAINST LIVE MYSQL DATABASE!")
    print("=" * 70 + "\n")
