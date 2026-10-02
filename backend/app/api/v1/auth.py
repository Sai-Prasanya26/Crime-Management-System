from typing import List
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    CreateStaffRequest,
    UpdateUserStatusRequest,
    AuditLogResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from backend.app.services.auth_service import AuthService
from backend.app.repositories.user_repository import UserRepository
from backend.app.api.deps import get_current_user, require_admin
from backend.app.models.auth import User

router = APIRouter()


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login",
    description="Authenticate with username/email and password to receive a JWT access token.",
)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    ip_address = request.client.host if request.client else None
    return AuthService.authenticate(db, login_data, ip_address=ip_address)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Retrieve the authenticated user's safe profile details using a Bearer token.",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return AuthService.get_current_user_profile(current_user)


@router.get(
    "/admin-check",
    response_model=UserResponse,
    summary="Admin Role Verification",
    description="Dedicated administrative endpoint that strictly enforces role=ADMIN.",
)
def admin_check(
    current_user: User = Depends(require_admin),
) -> UserResponse:
    return AuthService.get_current_user_profile(current_user)


@router.post(
    "/logout",
    summary="User Logout",
    description="Record an audit log entry for user session termination.",
)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    UserRepository.log_auth_action(
        db,
        user_id=current_user.id,
        action="LOGOUT",
        ip_address=ip_address,
        details={"username": current_user.username},
    )
    return {"status": "ok", "message": "Session terminated successfully"}


@router.patch(
    "/profile",
    response_model=UserResponse,
    summary="Update Current User Profile",
    description="Update the authenticated user's personal details (full_name and email). User is determined strictly from JWT.",
)
def update_profile(
    profile_data: UpdateProfileRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    ip_address = request.client.host if request.client else None
    return AuthService.update_profile(db, current_user, profile_data, ip_address=ip_address)


@router.post(
    "/change-password",
    summary="Change Password",
    description="Update the authenticated user's password after verifying the current password.",
)
def change_password(
    password_data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    return AuthService.change_password(db, current_user, password_data, ip_address=ip_address)


# =====================================================================
# ADMIN-ONLY CONTROLLED STAFF ACCOUNT MANAGEMENT ENDPOINTS
# =====================================================================

@router.get(
    "/users",
    response_model=List[UserResponse],
    summary="List Staff Accounts (Admin Only)",
    description="Retrieve all registered staff accounts. Strictly restricted to ADMIN role.",
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    return AuthService.list_staff(db, skip=skip, limit=limit)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=201,
    summary="Create Staff Account (Admin Only)",
    description="Create and provision a new authorized staff account with assigned role. Strictly restricted to ADMIN role.",
)
def create_staff_user(
    staff_data: CreateStaffRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    ip_address = request.client.host if request.client else None
    return AuthService.create_staff(db, staff_data, current_user, ip_address=ip_address)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse,
    summary="Update Staff Account Status (Admin Only)",
    description="Activate or deactivate a staff member's account. Inactive accounts cannot log in. Restricted to ADMIN.",
)
def update_user_status(
    user_id: int,
    status_data: UpdateUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    ip_address = request.client.host if request.client else None
    return AuthService.update_staff_status(
        db, user_id, status_data.is_active, current_user, ip_address=ip_address
    )


@router.delete(
    "/users/{user_id}",
    summary="Delete Staff Account (Admin Only)",
    description="Remove a staff account from the system. Restricted to ADMIN.",
)
def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    AuthService.delete_staff(db, user_id, current_user, ip_address=ip_address)
    return {"status": "ok", "message": f"Staff account {user_id} deleted successfully."}


@router.get(
    "/audit-logs",
    response_model=List[AuditLogResponse],
    summary="List Security Audit Logs (Admin Only)",
    description="Retrieve recent authentication, staff provisioning, and security events. Restricted to ADMIN.",
)
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> List[AuditLogResponse]:
    return AuthService.list_audit_logs(db, limit=limit)

