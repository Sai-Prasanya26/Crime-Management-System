import time
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

from backend.app.core.security import create_access_token

token = create_access_token(subject='1', role='ADMIN')
headers = {"Authorization": f"Bearer {token}"}
print(f"Using generated ADMIN JWT token: {token[:20]}...")

print("\n" + "="*80)
print("PROFILING ALL REPORTING ENDPOINTS WITH AUTHENTICATED USER")
print("="*80)

endpoints = [
    # Scope 1: ALL INDIA
    ("GET /analytics/overview (All India)", "/api/v1/analytics/overview"),
    ("GET /analytics/by-category (All India)", "/api/v1/analytics/by-category"),
    ("GET /analytics/trends (All India)", "/api/v1/analytics/trends?interval=year"),
    ("GET /risk/overview (All India)", "/api/v1/risk/overview?assessment_period=2026-11-01"),
    ("GET /risk/states/summary (All India)", "/api/v1/risk/states/summary?assessment_period=2026-11-01"),
    ("GET /budget/full-overview (All India)", "/api/v1/budget/full-overview?year=2026&month=11"),
    ("GET /geography/states/crime-summary", "/api/v1/geography/states/crime-summary"),

    # Scope 2: STATE (Andhra Pradesh, id=2)
    ("GET /analytics/overview?state_id=2", "/api/v1/analytics/overview?state_id=2"),
    ("GET /analytics/by-category?state_id=2", "/api/v1/analytics/by-category?state_id=2"),
    ("GET /analytics/trends?state_id=2", "/api/v1/analytics/trends?interval=year&state_id=2"),
    ("GET /budget/districts/summary?state_id=2", "/api/v1/budget/districts/summary?state_id=2&year=2026&month=11&limit=100"),
    ("GET /risk/districts?state_id=2", "/api/v1/risk/districts?state_id=2&assessment_period=2026-11-01&limit=100"),
    ("GET /predictions/monthly?state_id=2", "/api/v1/predictions/monthly?state_id=2&forecast_period=2026-11-01&limit=100"),

    # Scope 3: DISTRICT (Anantapur, id=5)
    ("GET /analytics/overview?district_id=5", "/api/v1/analytics/overview?district_id=5"),
    ("GET /analytics/by-category?district_id=5", "/api/v1/analytics/by-category?district_id=5"),
    ("GET /analytics/trends?district_id=5", "/api/v1/analytics/trends?interval=year&district_id=5"),
    ("GET /predictions/district-month?district_id=5", "/api/v1/predictions/district-month?district_id=5&year=2026&month=11"),
    ("GET /predictions/breakdown?district_id=5", "/api/v1/predictions/breakdown?district_id=5&year=2026&month=11"),
    ("GET /risk/districts/5", "/api/v1/risk/districts/5?assessment_period=2026-11-01"),
    ("GET /optimization/crime-demand?district_id=5", "/api/v1/optimization/crime-demand?district_id=5&year=2026&month=11"),
    ("GET /budget/district/5", "/api/v1/budget/district/5?year=2026&month=11"),
]

for label, url in endpoints:
    t0 = time.time()
    resp = client.get(url, headers=headers)
    dur = time.time() - t0
    status = resp.status_code
    size = len(resp.content)
    print(f"{label:<48} | Status: {status} | Time: {dur:6.2f}s | Size: {size} bytes")

print("="*80)
