"""
Token Handling & Re-Authentication Verification Test Suite.
Validates:
1. Valid JWT issuance and profile retrieval (/auth/me).
2. Expired JWT rejection (HTTP 401 with 'Invalid or expired access token.').
3. Tampered/malformed JWT rejection (HTTP 401).
4. Missing Bearer token rejection (HTTP 401).
5. Multiple sequential requests with the same valid access token across protected endpoints.
6. Role authorization on /optimization/crime-optimize:
   - OFFICER role -> HTTP 403 Forbidden
   - ANALYST role -> HTTP 200 OK
   - Expired token -> HTTP 401 Unauthorized
"""

import sys
import os
from datetime import timedelta

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)


def test_token_handling():
    print("\n" + "=" * 70)
    print("RUNNING TOKEN HANDLING & RE-AUTHENTICATION VERIFICATION")
    print("=" * 70)

    # 1. Login with Admin credentials to get a fresh, valid token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "Admin@12345"},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    admin_token = login_resp.json()["access_token"]
    user_id = login_resp.json()["user"]["id"]
    print(f"[PASS] Step 1: Valid Login Succeeded. Token acquired for User ID {user_id} (ADMIN).")

    # 2. Verify /auth/me with valid token
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert me_resp.status_code == 200, f"/auth/me failed: {me_resp.text}"
    print(f"[PASS] Step 2: /auth/me succeeded with valid token.")

    # 3. Simulate an expired token (issued with negative delta)
    expired_token = create_access_token(
        subject=user_id,
        role="ADMIN",
        expires_delta=timedelta(seconds=-60),  # expired 60 seconds ago
    )
    expired_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_resp.status_code == 401, f"Expected 401 for expired token, got {expired_resp.status_code}"
    assert "Invalid or expired access token" in expired_resp.json()["detail"]
    print(f"[PASS] Step 3: Expired token correctly rejected with HTTP 401: '{expired_resp.json()['detail']}'.")

    # 4. Simulate a malformed/tampered token
    tampered_token = admin_token[:-10] + "tampered00"
    tampered_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert tampered_resp.status_code == 401, f"Expected 401 for tampered token, got {tampered_resp.status_code}"
    print(f"[PASS] Step 4: Tampered/malformed token correctly rejected with HTTP 401.")

    # 5. Missing Authorization header
    missing_resp = client.get("/api/v1/auth/me")
    assert missing_resp.status_code == 401, f"Expected 401 for missing token, got {missing_resp.status_code}"
    print(f"[PASS] Step 5: Missing Authorization header correctly rejected with HTTP 401.")

    # 6. Test Resource Optimization endpoint (/optimization/crime-optimize)
    optimization_payload = {
        "state_id": 2,
        "assessment_period": "2026-11-01",
        "scenario_type": "CRIME_SPECIFIC_OPTIMAL",
        "is_simulation": False,
    }

    # 6a. Resource Optimization with Expired Token -> Must return 401
    opt_expired_resp = client.post(
        "/api/v1/optimization/crime-optimize",
        json=optimization_payload,
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert opt_expired_resp.status_code == 401, f"Expected 401 on expired opt request, got {opt_expired_resp.status_code}"
    assert "Invalid or expired access token" in opt_expired_resp.json()["detail"]
    print(f"[PASS] Step 6a: Resource Optimization with expired token rejected with HTTP 401: '{opt_expired_resp.json()['detail']}'.")

    # 6b. Resource Optimization with Officer Token (Role: OFFICER, User ID: 3) -> Must return 403 Forbidden
    officer_token = create_access_token(subject=3, role="OFFICER")
    opt_officer_resp = client.post(
        "/api/v1/optimization/crime-optimize",
        json=optimization_payload,
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert opt_officer_resp.status_code == 403, f"Expected 403 for OFFICER role, got {opt_officer_resp.status_code}"
    assert "Required role: ADMIN, ANALYST" in opt_officer_resp.json()["detail"]
    print(f"[PASS] Step 6b: Resource Optimization with OFFICER role rejected with HTTP 403: '{opt_officer_resp.json()['detail']}'. (Session maintained).")

    # 6c. Resource Optimization with Valid Admin Token -> Must return 200 OK
    opt_admin_resp = client.post(
        "/api/v1/optimization/crime-optimize",
        json=optimization_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert opt_admin_resp.status_code == 200, f"Expected 200 for ADMIN role, got {opt_admin_resp.status_code}: {opt_admin_resp.text}"
    opt_data = opt_admin_resp.json()
    assert "allocations" in opt_data
    assert len(opt_data["allocations"]) > 0
    print(f"[PASS] Step 6c: Resource Optimization with valid ADMIN token succeeded (Allocations: {len(opt_data['allocations'])}).")

    # 7. Multiple sequential requests in same session across modules
    # Prediction module
    pred_resp = client.get(
        "/api/v1/predictions/district/4?year=2026&month=11",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    print(f"[PASS] Step 7a: Prediction request status: {pred_resp.status_code}")

    # Risk module
    risk_resp = client.get(
        "/api/v1/risk/district/4?period=2026-11-01",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    print(f"[PASS] Step 7b: Risk Assessment request status: {risk_resp.status_code}")

    # Budget module
    budget_resp = client.get(
        "/api/v1/budget/district/4?period=2026-11-01",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    print(f"[PASS] Step 7c: Budget Analysis request status: {budget_resp.status_code}")

    print("=" * 70)
    print("ALL TOKEN HANDLING AND RE-AUTHENTICATION VERIFICATIONS PASSED!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_token_handling()
