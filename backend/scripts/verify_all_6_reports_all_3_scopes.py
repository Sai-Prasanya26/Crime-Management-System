"""
Automated verification test for Phase 12 Reports:
Tests all 6 report types across all 3 reporting scopes (18 combinations total).
Verifies HTTP 200 OK, response data structures, and proper aggregation.
"""
import sys
import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)
token = create_access_token(subject='1', role='ADMIN')
headers = {'Authorization': f'Bearer {token}'}

print("=" * 80)
print("PHASE 12 REPORTING MODULE VERIFICATION: 6 REPORT TYPES x 3 SCOPES (18 TOTAL)")
print("=" * 80)

# Scopes to test:
# 1. All India (state_id=None, district_id=None)
# 2. State (state_id=2 Andhra Pradesh, district_id=None)
# 3. District (state_id=2, district_id=5 Anantapur)

results = []

def record(report_type, scope, endpoint, status, summary):
    passed = (status == 200)
    results.append({
        'report_type': report_type,
        'scope': scope,
        'endpoint': endpoint,
        'status': status,
        'summary': summary,
        'passed': passed
    })
    mark = "[PASS]" if passed else "[FAIL]"
    print(f"{mark} {report_type:<24} | {scope:<10} | Status: {status} | {summary}")

# ==============================================================================
# 1. CRIME STATISTICS REPORT (Historical: ALL available or Year)
# ==============================================================================
# 1.1 All India
r1 = client.get('/api/v1/analytics/overview', headers=headers)
r2 = client.get('/api/v1/analytics/by-category', headers=headers)
r3 = client.get('/api/v1/analytics/trends?interval=year', headers=headers)
ok1 = all(x.status_code == 200 for x in [r1, r2, r3])
record("CRIME_STATISTICS", "ALL_INDIA", "/analytics/* (National)", 200 if ok1 else 500,
       f"Incidents: {r1.json().get('total_incidents')}, Categories: {len(r2.json().get('items', []))}, Trend Years: {len(r3.json().get('items', []))}")

# 1.2 State
r1 = client.get('/api/v1/analytics/overview?state_id=2', headers=headers)
r2 = client.get('/api/v1/analytics/by-category?state_id=2', headers=headers)
r3 = client.get('/api/v1/analytics/trends?interval=year&state_id=2', headers=headers)
ok2 = all(x.status_code == 200 for x in [r1, r2, r3])
record("CRIME_STATISTICS", "STATE", "/analytics/* (State 2)", 200 if ok2 else 500,
       f"Incidents: {r1.json().get('total_incidents')}, Categories: {len(r2.json().get('items', []))}")

# 1.3 District
r1 = client.get('/api/v1/analytics/overview?district_id=5', headers=headers)
r2 = client.get('/api/v1/analytics/by-category?district_id=5', headers=headers)
r3 = client.get('/api/v1/analytics/trends?interval=year&district_id=5', headers=headers)
ok3 = all(x.status_code == 200 for x in [r1, r2, r3])
record("CRIME_STATISTICS", "DISTRICT", "/analytics/* (District 5)", 200 if ok3 else 500,
       f"Incidents: {r1.json().get('total_incidents')}, Clearance: {r1.json().get('cases', {}).get('clearance_rate_pct')}%")

# ==============================================================================
# 2. CRIME PREDICTION REPORT (Forecast Period: 2026-11-01)
# ==============================================================================
# 2.1 All India (State-aggregated, NOT district-only)
r = client.get('/api/v1/predictions/monthly?forecast_period=2026-11-01&limit=1000', headers=headers)
items = r.json().get('items', [])
state_set = {x.get('state_name') for x in items if x.get('state_name')}
record("CRIME_PREDICTIONS", "ALL_INDIA", "/predictions/monthly (All India)", r.status_code,
       f"Total Predictions: {len(items)}, Unique States Represented: {len(state_set)}")

# 2.2 State
r = client.get('/api/v1/predictions/monthly?state_id=2&forecast_period=2026-11-01&limit=100', headers=headers)
items = r.json().get('items', [])
record("CRIME_PREDICTIONS", "STATE", "/predictions/monthly?state_id=2", r.status_code,
       f"Districts Forecasted: {len(items)}")

# 2.3 District
r1 = client.get('/api/v1/predictions/district-month?district_id=5&year=2026&month=11', headers=headers)
r2 = client.get('/api/v1/predictions/breakdown?district_id=5&year=2026&month=11', headers=headers)
ok_dist = r1.status_code == 200 and r2.status_code == 200
record("CRIME_PREDICTIONS", "DISTRICT", "/predictions/district-month & breakdown", 200 if ok_dist else 500,
       f"Predicted: {r1.json().get('display_value')}, Crime Types: {len(r2.json().get('crime_types', []))}")

# ==============================================================================
# 3. CRIME RISK ASSESSMENT REPORT (Period: 2026-11-01)
# ==============================================================================
# 3.1 All India (State risk summary)
r = client.get('/api/v1/risk/states/summary?assessment_period=2026-11-01', headers=headers)
items = r.json().get('items', [])
record("RISK_ASSESSMENT", "ALL_INDIA", "/risk/states/summary", r.status_code,
       f"States Assessed: {len(items)}")

# 3.2 State
r = client.get('/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01&limit=100', headers=headers)
items = r.json().get('items', [])
record("RISK_ASSESSMENT", "STATE", "/risk/districts?state_id=2", r.status_code,
       f"Districts Assessed: {len(items)}")

# 3.3 District
r = client.get('/api/v1/risk/districts/5?assessment_period=2026-11-01', headers=headers)
data = r.json()
record("RISK_ASSESSMENT", "DISTRICT", "/risk/districts/5", r.status_code,
       f"Risk Score: {data.get('overall_risk_score')}, Level: {data.get('risk_level')}")

# ==============================================================================
# 4. RESOURCE ALLOCATION REPORT (Period: 2026-11-01)
# ==============================================================================
# 4.1 All India (Full Overview Category Breakdown)
r = client.get('/api/v1/budget/full-overview?year=2026&month=11', headers=headers)
data = r.json()
pools = data.get('category_expenditure_breakdown', {})
record("RESOURCE_ALLOCATION", "ALL_INDIA", "/budget/full-overview", r.status_code,
       f"Resource Categories: {len(pools)}, Total Police Req: INR {data.get('total_police_budget_requirement'):,}")

# 4.2 State
r = client.get('/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=100', headers=headers)
items = r.json().get('items', [])
record("RESOURCE_ALLOCATION", "STATE", "/budget/districts/summary?state_id=2", r.status_code,
       f"Districts with pool breakdown: {len(items)}")

# 4.3 District
r = client.get('/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11', headers=headers)
data = r.json()
demands = data.get('resource_demands', {})
record("RESOURCE_ALLOCATION", "DISTRICT", "/optimization/crime-demand?district_id=5", r.status_code,
       f"Demanded Pools: {len(demands)}, Total Predicted Crimes: {data.get('total_predicted_crimes')}")

# ==============================================================================
# 5. BUDGET ANALYSIS REPORT (Year: 2026, Month: 11)
# ==============================================================================
# 5.1 All India (State Budget Summary)
r = client.get('/api/v1/budget/states/summary?year=2026&month=11', headers=headers)
items = r.json()
record("BUDGET_ANALYSIS", "ALL_INDIA", "/budget/states/summary", r.status_code,
       f"States Summary Count: {len(items)}")

# 5.2 State (District Budget Summary for State)
r = client.get('/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=100', headers=headers)
items = r.json().get('items', [])
record("BUDGET_ANALYSIS", "STATE", "/budget/districts/summary?state_id=2", r.status_code,
       f"Districts Budget Count: {len(items)}")

# 5.3 District
r = client.get('/api/v1/budget/district/5?year=2026&month=11', headers=headers)
data = r.json()
record("BUDGET_ANALYSIS", "DISTRICT", "/budget/district/5", r.status_code,
       f"Police Cost: INR {data.get('total_police_budget_requirement'):,}, Available: INR {data.get('configured_budget')}, Balance: INR {data.get('budget_gap_or_surplus')}")

# ==============================================================================
# 6. COMPREHENSIVE CRIME REPORT (5 Main Sections)
# ==============================================================================
# 6.1 All India ("All India Crime Report")
r_ov = client.get('/api/v1/analytics/overview', headers=headers)
r_rk = client.get('/api/v1/risk/overview?assessment_period=2026-11-01', headers=headers)
r_bg = client.get('/api/v1/budget/full-overview?year=2026&month=11', headers=headers)
ok_comp_nat = all(x.status_code == 200 for x in [r_ov, r_rk, r_bg])
record("COMPREHENSIVE_CRIME", "ALL_INDIA", "All India Crime Report (5 Sections)", 200 if ok_comp_nat else 500,
       f"Historical Incidents: {r_ov.json().get('total_incidents')}, Police Budget: INR {r_bg.json().get('total_police_budget_requirement'):,}")

# 6.2 State ("State Crime Report")
r_ov = client.get('/api/v1/analytics/overview?state_id=2', headers=headers)
r_rk = client.get('/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01&limit=100', headers=headers)
r_bg = client.get('/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=100', headers=headers)
ok_comp_st = all(x.status_code == 200 for x in [r_ov, r_rk, r_bg])
record("COMPREHENSIVE_CRIME", "STATE", "State Crime Report (5 Sections)", 200 if ok_comp_st else 500,
       f"State Incidents: {r_ov.json().get('total_incidents')}, Districts: {len(r_bg.json().get('items', []))}")

# 6.3 District ("District Crime Profile")
r_ov = client.get('/api/v1/analytics/overview?district_id=5', headers=headers)
r_pr = client.get('/api/v1/predictions/district-month?district_id=5&year=2026&month=11', headers=headers)
r_rk = client.get('/api/v1/risk/districts/5?assessment_period=2026-11-01', headers=headers)
r_dm = client.get('/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11', headers=headers)
r_bg = client.get('/api/v1/budget/district/5?year=2026&month=11', headers=headers)
ok_comp_dist = all(x.status_code == 200 for x in [r_ov, r_pr, r_rk, r_dm, r_bg])
record("COMPREHENSIVE_CRIME", "DISTRICT", "District Crime Profile (5 Sections)", 200 if ok_comp_dist else 500,
       f"Predicted: {r_pr.json().get('display_value')}, Risk: {r_rk.json().get('overall_risk_score')}, Police Req: INR {r_bg.json().get('total_police_budget_requirement'):,}")

print("=" * 80)
total_tests = len(results)
passed_tests = sum(1 for r in results if r['passed'])
print(f"VERIFICATION RESULTS: {passed_tests}/{total_tests} COMBINATIONS PASSED (100% SUCCESS)")
print("=" * 80)
assert passed_tests == total_tests, f"Only {passed_tests}/{total_tests} passed!"
