import os
import sys

# Ensure workspace root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

token = create_access_token(subject="1", role="ADMIN")
headers = {"Authorization": f"Bearer {token}"}
client = TestClient(app)

print('=== 1. Predictions ===')
resp = client.get('/api/v1/predictions/monthly?forecast_period=2026-11-01&limit=1000', headers=headers)
print('Status:', resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    items = data.get('items', [])
    print(f'Total predictions count: {len(items)}')
    total_incidents = sum(float(x.get('predicted_crime_count', 0)) for x in items)
    print(f'Total predicted incidents: {round(total_incidents)}')
    top3 = sorted(items, key=lambda x: float(x.get('predicted_crime_count', 0)), reverse=True)[:3]
    for d in top3:
        print(f"  - {d.get('district_name')} ({d.get('state_name')}): {round(float(d.get('predicted_crime_count', 0)))} (CI: [{d.get('prediction_interval_lower')}, {d.get('prediction_interval_upper')}])")

print('\n=== 2. Risk Overview ===')
resp = client.get('/api/v1/risk/overview?assessment_period=2026-11-01', headers=headers)
print('Status:', resp.status_code)
if resp.status_code == 200:
    r = resp.json()
    print('Risk distribution:', r.get('risk_level_distribution'))
    print('Top risk districts count:', len(r.get('top_risk_districts', [])))
    for d in r.get('top_risk_districts', [])[:5]:
        print(f"  - {d.get('district_name')} ({d.get('state_name')}): {d.get('overall_risk_score')} [{d.get('risk_level')}]")

print('\n=== 3. Optimization Overview ===')
resp = client.get('/api/v1/optimization/overview', headers=headers)
print('Status:', resp.status_code)
if resp.status_code == 200:
    opt = resp.json()
    runs = opt.get('recent_runs', [])
    print(f'Recent runs: {len(runs)}')
    if runs:
        applied = runs[0].get('constraints_applied', {})
        print(f'Constraints applied keys ({len(applied)} pools):')
        for k, v in applied.items():
            print(f"  - {v.get('resource_name', k)}: demand={v.get('demand')}, allocated={v.get('allocated')}, unmet={v.get('unmet_demand')}, unit={v.get('unit_of_measure')}, partner={v.get('is_external_partner')}")

print('\n=== 4. Budget Overview ===')
resp = client.get('/api/v1/budget/full-overview?year=2026&month=11', headers=headers)
print('Status:', resp.status_code)
if resp.status_code == 200:
    b = resp.json()
    pol_req = b.get('total_police_budget_requirement')
    st_bud = b.get('total_configured_state_budget')
    gap = b.get('total_budget_gap_or_surplus')
    part = b.get('total_partner_agency_cost')
    capex = b.get('total_capex_procurement')
    opex = b.get('total_opex_annual')
    maint = b.get('total_maintenance_annual')
    print(f"Police budget req: {pol_req:,.2f}" if pol_req is not None else "Police req: None")
    print(f"Configured state budget: {st_bud:,.2f}" if st_bud is not None else "State budget: None")
    print(f"Budget gap/surplus: {gap:,.2f}" if gap is not None else "Gap/Surplus: None")
    print(f"Partner agency cost: {part:,.2f}" if part is not None else "Partner cost: None")
    print(f"CAPEX: {capex:,.2f}" if capex is not None else "CAPEX: None")
    print(f"OPEX: {opex:,.2f}" if opex is not None else "OPEX: None")
    print(f"Maintenance: {maint:,.2f}" if maint is not None else "Maintenance: None")
    print(f"Breakdown pools count: {len(b.get('category_expenditure_breakdown', {}))}")
