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


def test_controlled_staff_account_workflow(admin_token: str, analyst_token: str):
    # 1. Access restriction check on listing staff accounts
    resp_unauth = client.get("/api/v1/admin/users")
    assert resp_unauth.status_code == 401, f"Expected 401 for unauthenticated list_users, got {resp_unauth.status_code}"
    print("[PASS] GET /api/v1/admin/users (unauthenticated): 401 Unauthorized successfully enforced")

    resp_analyst = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {analyst_token}"})
    assert resp_analyst.status_code == 403, f"Expected 403 for analyst list_users, got {resp_analyst.status_code}"
    print("[PASS] GET /api/v1/admin/users (analyst): 403 Forbidden successfully enforced")

    # 2. Admin can list existing staff accounts
    resp_admin = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_admin.status_code == 200
    initial_users = resp_admin.json()
    assert len(initial_users) >= 4
    print(f"[PASS] GET /api/v1/admin/users (admin): 200 OK ({len(initial_users)} staff accounts retrieved)")

    # 3. Clean up any leftover test user if exists
    db = SessionLocal()
    try:
        old_test = db.query(User).filter(User.username == "test_officer_phase75").first()
        if old_test:
            db.delete(old_test)
            db.commit()
    finally:
        db.close()

    # 4. Admin creates a new authorized staff account via POST /api/v1/admin/users
    payload = {
        "full_name": "Test Crime Officer",
        "username": "test_officer_phase75",
        "email": "test.officer.phase75@crimeops.local",
        "password": "Officer@Test12345",
        "role": "OFFICER",
        "is_active": True,
    }
    resp_create = client.post(
        "/api/v1/admin/users",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_create.status_code == 201, f"Expected 201, got {resp_create.status_code}: {resp_create.text}"
    new_user_data = resp_create.json()
    new_user_id = new_user_data["id"]
    assert new_user_data["username"] == "test_officer_phase75"
    assert new_user_data["full_name"] == "Test Crime Officer"
    assert new_user_data["role"] == "OFFICER"
    assert new_user_data["is_active"] is True
    assert "password" not in new_user_data
    assert "password_hash" not in new_user_data
    print(f"[PASS] POST /api/v1/admin/users (create staff): 201 Created (ID: {new_user_id}, Role: OFFICER)")

    # 5. Duplicate account validation (username) -> 409 Conflict
    dup_user_payload = {
        "full_name": "Duplicate Officer",
        "username": "test_officer_phase75",
        "email": "different.email@crimeops.local",
        "password": "Password@12345",
        "role": "OFFICER",
        "is_active": True,
    }
    resp_dup_user = client.post(
        "/api/v1/admin/users",
        json=dup_user_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_dup_user.status_code == 409, f"Expected 409 for duplicate username, got {resp_dup_user.status_code}"
    assert "Username already exists" in resp_dup_user.json()["detail"]
    print("[PASS] Duplicate username validation: 409 Conflict ('Username already exists.')")

    # 6. Duplicate account validation (email) -> 409 Conflict
    dup_email_payload = {
        "full_name": "Duplicate Email Officer",
        "username": "different_username",
        "email": "test.officer.phase75@crimeops.local",
        "password": "Password@12345",
        "role": "OFFICER",
        "is_active": True,
    }
    resp_dup_email = client.post(
        "/api/v1/admin/users",
        json=dup_email_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_dup_email.status_code == 409, f"Expected 409 for duplicate email, got {resp_dup_email.status_code}"
    assert "Email already exists" in resp_dup_email.json()["detail"]
    print("[PASS] Duplicate email validation: 409 Conflict ('Email already exists.')")

    # 7. Verify database: password hash is Argon2id, NOT plaintext
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.id == new_user_id).first()
        assert db_user is not None
        assert db_user.password_hash.startswith("$argon2id$")
        assert "Officer@Test12345" not in db_user.password_hash
        print("[PASS] Security check: password is securely hashed with Argon2id, NOT plaintext")
    finally:
        db.close()

    # 8. Newly authorized officer logs in
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "test_officer_phase75", "password": "Officer@Test12345"},
    )
    assert login_resp.status_code == 200, f"Expected 200 login, got {login_resp.status_code}"
    officer_token = login_resp.json()["access_token"]
    assert login_resp.json()["user"]["role"] == "OFFICER"
    print("[PASS] POST /api/v1/auth/login (new staff member): 200 OK (JWT issued, Role: OFFICER)")

    # 9. Officer cannot access Admin User Management
    officer_admin_check = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert officer_admin_check.status_code == 403
    print("[PASS] GET /api/v1/admin/users (new officer): 403 Forbidden successfully enforced")

    # 10. Admin deactivates the staff account
    resp_deactivate = client.patch(
        f"/api/v1/admin/users/{new_user_id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_deactivate.status_code == 200
    assert resp_deactivate.json()["is_active"] is False
    print(f"[PASS] PATCH /api/v1/admin/users/{new_user_id}/status: Account deactivated successfully")

    # 11. Deactivated account attempt to log in is rejected with 403
    login_inactive_resp = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "test_officer_phase75", "password": "Officer@Test12345"},
    )
    assert login_inactive_resp.status_code == 403
    assert "Account is inactive" in login_inactive_resp.json()["detail"]
    print("[PASS] POST /api/v1/auth/login (deactivated account): 403 Forbidden ('Account is inactive. Please contact an administrator.')")

    # 12. Clean up: Admin deletes the test account so production-like DB is kept clean
    resp_del = client.delete(
        f"/api/v1/admin/users/{new_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_del.status_code == 200
    print(f"[PASS] DELETE /api/v1/admin/users/{new_user_id}: Test account cleaned up successfully")

    # 13. Security Audit Logs verification
    resp_audit = client.get(
        "/api/v1/admin/audit-logs?limit=20",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_audit.status_code == 200
    audit_actions = [a["action"] for a in resp_audit.json()]
    assert "CREATE" in audit_actions
    assert "STAFF_ACCOUNT_STATUS_CHANGED" in audit_actions
    assert "STAFF_ACCOUNT_DELETED" in audit_actions
    print(f"[PASS] GET /api/v1/admin/audit-logs: 200 OK (Captured CREATE, STATUS_CHANGED, DELETED)")


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
    test_controlled_staff_account_workflow(admin_token, analyst_token)
    test_logout(admin_token)
    test_audit_logs_and_last_login()
    print("=" * 70)
    print("ALL AUTHENTICATION & STAFF MANAGEMENT TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70 + "\n")

