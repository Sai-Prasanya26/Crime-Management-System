from typing import List
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.auth import (
    UserResponse,
    CreateStaffRequest,
    UpdateUserStatusRequest,
    AuditLogResponse,
)
from backend.app.services.auth_service import AuthService
from backend.app.api.deps import require_admin
from backend.app.models.auth import User

router = APIRouter()


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
