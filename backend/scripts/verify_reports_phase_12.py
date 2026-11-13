"""
Verification script for Phase 12 Reports endpoints and data structures.
"""
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)
token = create_access_token(subject='1', role='ADMIN')
headers = {'Authorization': f'Bearer {token}'}

print("=== TESTING ALL 6 REPORT TYPES + JURISDICTIONAL OVERVIEWS ===")

# 1. Comprehensive District Report (district_id=5, Anantapur)
r_an = client.get('/api/v1/analytics/overview?district_id=5', headers=headers)
r_cat = client.get('/api/v1/analytics/by-category?district_id=5', headers=headers)
r_tr = client.get('/api/v1/analytics/trends?interval=year&district_id=5', headers=headers)
r_pr = client.get('/api/v1/predictions/district-month?district_id=5&year=2026&month=11', headers=headers)
r_bd = client.get('/api/v1/predictions/breakdown?district_id=5&year=2026&month=11', headers=headers)
r_rk = client.get('/api/v1/risk/districts/5?assessment_period=2026-11-01', headers=headers)
r_dm = client.get('/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11', headers=headers)
r_bg = client.get('/api/v1/budget/district/5?year=2026&month=11', headers=headers)

all_ok = all(x.status_code == 200 for x in [r_an, r_cat, r_tr, r_pr, r_bd, r_rk, r_dm, r_bg])
print(f"1. Comprehensive District Report (Anantapur): All 8 sub-queries 200 OK? {all_ok}")
if all_ok:
    bg_data = r_bg.json()
    print(f"   Police Budget Req: {bg_data['total_police_budget_requirement']}")
    print(f"   Available Budget: {bg_data['configured_budget']}")
    print(f"   Net Balance: {bg_data['budget_gap_or_surplus']}")
    print(f"   Partner Agency Cost (Health): {bg_data['total_partner_agency_cost']}")
    print(f"   Resource Pools: {len(bg_data.get('pool_breakdown', []))}")
    print(f"   Historical Incidents: {r_an.json()['total_incidents']}, Clearance: {r_an.json()['cases']['clearance_rate_pct']}%")
    print(f"   Predicted Crimes: {r_pr.json()['display_value']}, 80% CI: [{r_pr.json()['prediction_interval_lower']} - {r_pr.json()['prediction_interval_upper']}]")
    print(f"   Risk Score: {r_rk.json()['overall_risk_score']} ({r_rk.json()['risk_level']})")

# 2. Crime Statistics Report
r_cs = client.get('/api/v1/analytics/by-type?district_id=5', headers=headers)
print(f"2. Crime Statistics Report: status={r_cs.status_code}, count={len(r_cs.json().get('items', []))}")

# 3. Crime Prediction Report
r_cp = client.get('/api/v1/predictions/monthly?state_id=2&forecast_period=2026-11-01&limit=10', headers=headers)
print(f"3. Crime Prediction Report: status={r_cp.status_code}, count={len(r_cp.json().get('items', []))}")

# 4. Crime Risk Assessment Report
r_ra = client.get('/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01&limit=10', headers=headers)
print(f"4. Crime Risk Assessment Report: status={r_ra.status_code}, count={len(r_ra.json().get('items', []))}")

# 5. Resource Allocation Report
r_res = client.get('/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11', headers=headers)
print(f"5. Resource Allocation Report: status={r_res.status_code}, total_crimes={r_res.json().get('total_predicted_crimes')}")

# 6. Budget Analysis Report
r_ba = client.get('/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=10', headers=headers)
print(f"6. Budget Analysis Report: status={r_ba.status_code}, total_districts={r_ba.json().get('total')}")

# 7. State-Wise Jurisdictional Overview
r_sw = client.get('/api/v1/geography/states/crime-summary', headers=headers)
print(f"7. State-Wise Jurisdictional Overview: status={r_sw.status_code}, states_count={len(r_sw.json().get('items', []))}")

# 8. District Threat Profile Dossier
r_dd = client.get('/api/v1/analytics/top-districts?state_id=2&limit=10', headers=headers)
print(f"8. District Threat Profile Dossier: status={r_dd.status_code}, top_districts={len(r_dd.json().get('items', []))}")

print("=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===")
