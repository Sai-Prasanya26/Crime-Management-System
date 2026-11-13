import sys
import glob
import re
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

print("=" * 80)
print("DIAGNOSING FASTAPI SERVER & REPORTING API ROUTES")
print("=" * 80)

# Check CORS
print("1. Checking CORS & Headers...")
resp = client.options("/api/v1/analytics/overview", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "GET"
})
print(f"  OPTIONS /analytics/overview status: {resp.status_code}")
print(f"  Access-Control-Allow-Origin: {resp.headers.get('access-control-allow-origin')}")

# Test without token
print("\n2. Testing unauthenticated requests on reporting routes...")
routes_to_test = [
    ("/api/v1/analytics/overview?district_id=5", "GET"),
    ("/api/v1/analytics/by-category?district_id=5", "GET"),
    ("/api/v1/analytics/trends?interval=year&district_id=5", "GET"),
    ("/api/v1/predictions/district-month?district_id=5&year=2026&month=11", "GET"),
    ("/api/v1/predictions/breakdown?district_id=5&year=2026&month=11", "GET"),
    ("/api/v1/risk/districts/5?assessment_period=2026-11-01", "GET"),
    ("/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11", "GET"),
    ("/api/v1/budget/district/5?year=2026&month=11", "GET"),
    ("/api/v1/budget/full-overview?year=2026&month=11", "GET"),
    ("/api/v1/predictions/monthly?state_id=2&forecast_period=2026-11-01&limit=10", "GET"),
    ("/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01&limit=10", "GET"),
    ("/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=10", "GET"),
    ("/api/v1/geography/states/crime-summary", "GET"),
    ("/api/v1/analytics/top-districts?state_id=2&limit=10", "GET"),
    ("/api/v1/optimization/execute-crime-specific", "POST"),
]

for url, method in routes_to_test:
    if method == "GET":
        r = client.get(url)
    else:
        r = client.post(url, json={"state_id": 2, "assessment_period": "2026-11-01", "scenario_type": "CRIME_SPECIFIC_OPTIMAL"})
    print(f"  {method} {url.split('?')[0]:<45} -> Status: {r.status_code}")

print("=" * 80)
