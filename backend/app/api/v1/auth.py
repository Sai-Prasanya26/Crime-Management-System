from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserResponse
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
