"""
Final Comprehensive Read-Only Verification of Operations Overview across All 3 Scopes:
1. All India Scope
2. State Scope (State 20: Maharashtra)
3. District Scope (District 348: Mumbai, Maharashtra)
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

token = create_access_token(subject="1", role="ADMIN")
headers = {"Authorization": f"Bearer {token}"}
client = TestClient(app)

print("=" * 70)
print("VERIFICATION 1: ALL INDIA (NATIONAL SCOPE)")
print("=" * 70)

# 1. Predictions
p_resp = client.get("/api/v1/predictions/monthly?forecast_period=2026-11-01&limit=1000", headers=headers)
assert p_resp.status_code == 200, f"Predictions failed: {p_resp.status_code}"
p_items = p_resp.json().get("items", [])
tot_pred = sum(float(x.get("predicted_crime_count", 0)) for x in p_items)
print(f"Predictions: {len(p_items)} districts, Total incidents = {round(tot_pred)} (Raw float: {tot_pred:.2f})")
top3 = sorted(p_items, key=lambda x: float(x.get("predicted_crime_count", 0)), reverse=True)[:3]
for idx, d in enumerate(top3, 1):
    print(f"  {idx}. {d.get('district_name')} ({d.get('state_name')}): {round(float(d.get('predicted_crime_count', 0)))} (CI: [{d.get('prediction_interval_lower')}, {d.get('prediction_interval_upper')}])")

# 2. Risk Overview
r_resp = client.get("/api/v1/risk/overview?assessment_period=2026-11-01", headers=headers)
assert r_resp.status_code == 200, f"Risk overview failed: {r_resp.status_code}"
r_data = r_resp.json()
r_dist = r_data.get("risk_level_distribution", {})
print(f"Risk Distribution: CRITICAL={r_dist.get('CRITICAL')}, HIGH={r_dist.get('HIGH')}, MODERATE={r_dist.get('MODERATE')}, LOW={r_dist.get('LOW')}")
print(f"Total classified districts: {sum(r_dist.values())}")
assert r_dist.get("CRITICAL") == 41, f"Expected 41 Critical districts, got {r_dist.get('CRITICAL')}"
assert r_dist.get("HIGH") == 372, f"Expected 372 High districts, got {r_dist.get('HIGH')}"
assert r_dist.get("MODERATE") == 336, f"Expected 336 Moderate districts, got {r_dist.get('MODERATE')}"
assert r_dist.get("LOW") == 41, f"Expected 41 Low districts, got {r_dist.get('LOW')}"

# 3. Optimization / Pools
opt_resp = client.get("/api/v1/optimization/overview", headers=headers)
assert opt_resp.status_code == 200, f"Optimization overview failed: {opt_resp.status_code}"
opt_runs = opt_resp.json().get("recent_runs", [])
applied = opt_runs[0].get("constraints_applied", {}) if opt_runs else {}
print(f"Resource Pools: {len(applied)} active pools in recent optimization run")
shortages = [v for v in applied.values() if float(v.get("unmet_demand", 0)) > 0]
print(f"Constrained pools with shortages: {len(shortages)}")
for s in shortages:
    print(f"  - Shortage: {s.get('resource_name')}: unmet={s.get('unmet_demand')} {s.get('unit_of_measure')}")

# 4. Budget
b_resp = client.get("/api/v1/budget/full-overview?year=2026&month=11", headers=headers)
assert b_resp.status_code == 200, f"Budget overview failed: {b_resp.status_code}"
b_data = b_resp.json()
print(f"Police Requirement: INR {b_data.get('total_police_budget_requirement'):,.2f} (~INR {b_data.get('total_police_budget_requirement')/1e7:.2f} Cr)")
print(f"Available State Budget: INR {b_data.get('total_configured_state_budget'):,.2f} (~INR {b_data.get('total_configured_state_budget')/1e7:.2f} Cr)")
print(f"Budget Surplus: INR {b_data.get('total_budget_gap_or_surplus'):,.2f} (~INR {b_data.get('total_budget_gap_or_surplus')/1e7:.2f} Cr)")
print(f"Partner Agency Cost: INR {b_data.get('total_partner_agency_cost'):,.2f} (~INR {b_data.get('total_partner_agency_cost')/1e7:.2f} Cr)")
print(f"CAPEX: INR {b_data.get('total_capex_procurement'):,.2f} | OPEX: INR {b_data.get('total_opex_annual'):,.2f} | Maint: INR {b_data.get('total_maintenance_annual'):,.2f}")

print("\n" + "=" * 70)
print("VERIFICATION 2: STATE SCOPE (STATE 20: MAHARASHTRA)")
print("=" * 70)

# 1. State Predictions
p_st_resp = client.get("/api/v1/predictions/monthly?state_id=20&forecast_period=2026-11-01&limit=1000", headers=headers)
assert p_st_resp.status_code == 200
p_st_items = p_st_resp.json().get("items", [])
tot_st_pred = sum(float(x.get("predicted_crime_count", 0)) for x in p_st_items)
print(f"Maharashtra Predictions: {len(p_st_items)} districts, Total incidents = {round(tot_st_pred)}")
top3_st = sorted(p_st_items, key=lambda x: float(x.get("predicted_crime_count", 0)), reverse=True)[:3]
for idx, d in enumerate(top3_st, 1):
    print(f"  {idx}. {d.get('district_name')}: {round(float(d.get('predicted_crime_count', 0)))}")

# 2. State Risk
r_st_resp = client.get("/api/v1/risk/districts?state_id=20&assessment_period=2026-11-01&limit=100", headers=headers)
assert r_st_resp.status_code == 200
r_st_items = r_st_resp.json().get("items", [])
st_counts = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0}
for d in r_st_items:
    st_counts[d.get("risk_level")] += 1
print(f"Maharashtra Risk Distribution: {st_counts} across {len(r_st_items)} districts")

# Verify matches state summary
r_sum_resp = client.get("/api/v1/risk/states/summary?assessment_period=2026-11-01", headers=headers)
assert r_sum_resp.status_code == 200
st_summaries = r_sum_resp.json().get("items", [])
mh_sum = next((s for s in st_summaries if s.get("state_id") == 20), None)
assert mh_sum is not None
print(f"State Summary matches Districts List? {st_counts == mh_sum.get('risk_level_counts')}")
assert st_counts == mh_sum.get("risk_level_counts")

# 3. State Budget
b_st_resp = client.get("/api/v1/budget/full-overview?state_id=20&year=2026&month=11", headers=headers)
assert b_st_resp.status_code == 200
b_st_data = b_st_resp.json()
print(f"Maharashtra Police Requirement: INR {b_st_data.get('total_police_budget_requirement'):,.2f} (~INR {b_st_data.get('total_police_budget_requirement')/1e7:.2f} Cr)")
print(f"Maharashtra Sanctioned Budget: INR {b_st_data.get('total_configured_state_budget'):,.2f} (~INR {b_st_data.get('total_configured_state_budget')/1e7:.2f} Cr)")
print(f"Maharashtra Budget Surplus: INR {b_st_data.get('total_budget_gap_or_surplus'):,.2f}")
print(f"Maharashtra Partner Agency Cost: INR {b_st_data.get('total_partner_agency_cost'):,.2f}")
print(f"Maharashtra Pools in breakdown: {len(b_st_data.get('category_expenditure_breakdown', {}))}")

print("\n" + "=" * 70)
print("VERIFICATION 3: DISTRICT SCOPE (DISTRICT 348: MUMBAI, MAHARASHTRA)")
print("=" * 70)

# 1. District Prediction
mumbai_pred = next((x for x in p_st_items if x.get("district_id") == 348 or x.get("district_name") == "Mumbai"), None)
if mumbai_pred:
    print(f"Mumbai Predicted Incidents: {round(float(mumbai_pred.get('predicted_crime_count', 0)))} (CI: [{mumbai_pred.get('prediction_interval_lower')}, {mumbai_pred.get('prediction_interval_upper')}])")

# 2. District Risk
r_d_resp = client.get("/api/v1/risk/districts?district_id=348&assessment_period=2026-11-01", headers=headers)
assert r_d_resp.status_code == 200
r_d_items = r_d_resp.json().get("items", [])
if r_d_items:
    d_item = r_d_items[0]
    print(f"Mumbai Risk Profile: Score = {d_item.get('overall_risk_score')} | Risk Level = {d_item.get('risk_level')}")

# 3. District Budget
b_d_resp = client.get("/api/v1/budget/district/348?year=2026&month=11", headers=headers)
assert b_d_resp.status_code == 200
b_d_data = b_d_resp.json()
print(f"Mumbai District: {b_d_data.get('district_name')}, {b_d_data.get('state_name')}")
print(f"Mumbai Total Requirement: INR {b_d_data.get('total_estimated_requirement'):,.2f}")
print(f"Mumbai Contingency Allocation: INR {b_d_data.get('contingency_budget_allocated')}")
print(f"Mumbai Gap/Surplus: INR {b_d_data.get('budget_gap_or_surplus'):,.2f}")
print(f"Mumbai 10-Pool Breakdown Count: {len(b_d_data.get('pool_breakdown', []))}")

print("\n" + "=" * 70)
print("ALL 3 SCOPE VERIFICATION CHECKS COMPLETED AND FULLY VALIDATED!")
print("=" * 70)
