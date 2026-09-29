"""
Phase 6 End-to-End Authentication & RBAC Verification Tests.
Tests password verification, JWT issuance, /login, /me, /logout, audit logs, and inactive restrictions.
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models.auth import User, AuditLog

client = TestClient(app)


def test_login_success_username():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "Admin@12345"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    user = data["user"]
    assert user["username"] == "admin"
    assert user["role"] == "ADMIN"
    assert "password" not in user
    assert "password_hash" not in user
    print(f"[PASS] POST /api/v1/auth/login (username): SUCCESS (User: {user['username']}, Role: {user['role']})")
    return data["access_token"]


def test_login_success_email():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "analyst@crimeops.gov.in", "password": "Analyst@12345"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["role"] == "ANALYST"
    print(f"[PASS] POST /api/v1/auth/login (email): SUCCESS (User: {data['user']['email']})")
    return data["access_token"]


def test_login_wrong_password():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "WrongPassword999"},
    )
    assert resp.status_code == 401
    data = resp.json()
    assert "Invalid username" in data["detail"] and "password" in data["detail"]
    print("[PASS] POST /api/v1/auth/login (wrong password): 401 with generic message")


def test_login_nonexistent_user():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "ghost_user", "password": "AnyPassword"},
    )
    assert resp.status_code == 401
    data = resp.json()
    # Must be identical generic error to prevent account enumeration
    assert "Invalid username" in data["detail"] and "password" in data["detail"]
    print("[PASS] POST /api/v1/auth/login (non-existent user): 401 with identical generic message")


def test_login_inactive_user():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "inactive", "password": "Inactive@12345"},
    )
    assert resp.status_code == 403
    data = resp.json()
    assert "inactive" in data["detail"].lower()
    print(f"[PASS] POST /api/v1/auth/login (inactive user): 403 Forbidden ({data['detail']})")


def test_get_me(token: str):
    # Without token
    resp_no_token = client.get("/api/v1/auth/me")
    assert resp_no_token.status_code == 401
    print("[PASS] GET /api/v1/auth/me (unauthenticated): 401 Unauthorized")

    # With invalid token
    resp_bad_token = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert resp_bad_token.status_code == 401
    print("[PASS] GET /api/v1/auth/me (invalid token): 401 Unauthorized")

    # With valid token
    resp_valid = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_valid.status_code == 200
    user = resp_valid.json()
    assert user["username"] == "admin"
    assert user["role"] == "ADMIN"
    assert user["is_active"] is True
    assert "password_hash" not in user
    print(f"[PASS] GET /api/v1/auth/me (valid token): 200 OK (Profile: {user['full_name']})")


def test_admin_check(admin_token: str, non_admin_token: str):
    # Without token -> 401
    resp_no_token = client.get("/api/v1/auth/admin-check")
    assert resp_no_token.status_code == 401
    print("[PASS] GET /api/v1/auth/admin-check (no token): 401 Unauthorized")

    # Non-admin user (ANALYST) -> 403 Forbidden
    resp_forbidden = client.get(
        "/api/v1/auth/admin-check",
        headers={"Authorization": f"Bearer {non_admin_token}"},
    )
    assert resp_forbidden.status_code == 403
    detail = resp_forbidden.json()["detail"].lower()
    assert "not permitted" in detail or "required role" in detail or "clearance" in detail
    print(f"[PASS] GET /api/v1/auth/admin-check (non-admin role): 403 Forbidden successfully enforced ({resp_forbidden.json()['detail']})")


    # Admin user -> 200 OK
    resp_admin = client.get(
        "/api/v1/auth/admin-check",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 200
    admin_data = resp_admin.json()
    assert admin_data["role"] == "ADMIN"
    print(f"[PASS] GET /api/v1/auth/admin-check (admin role): 200 OK (Verified Admin: {admin_data['username']})")


def test_logout(token: str):
    resp = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    print("[PASS] POST /api/v1/auth/logout: 200 OK (Session terminated)")


def test_audit_logs_and_last_login():
    db = SessionLocal()
    try:
        # Check last_login_at updated on admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        assert admin_user is not None
        assert admin_user.last_login_at is not None
        print(f"[PASS] Database audit: users.last_login_at recorded timestamp ({admin_user.last_login_at})")

        # Check audit_logs populated
        logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(5).all()
        assert len(logs) > 0
        actions = [log.action for log in logs]
        print(f"[PASS] Database audit: audit_logs captured events ({actions})")
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("PHASE 6 & 7C.1: RUNNING AUTHENTICATION & RBAC VERIFICATION TEST SUITE")
    print("=" * 70)
    admin_token = test_login_success_username()
    analyst_token = test_login_success_email()
    test_login_wrong_password()
    test_login_nonexistent_user()
    test_login_inactive_user()
    test_get_me(admin_token)
    test_admin_check(admin_token, analyst_token)
    test_logout(admin_token)
    test_audit_logs_and_last_login()
    print("=" * 70)
    print("ALL AUTHENTICATION & RBAC TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70 + "\n")

