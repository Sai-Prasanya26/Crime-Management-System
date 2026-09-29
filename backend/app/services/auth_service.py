from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from backend.app.repositories.user_repository import UserRepository
from backend.app.core.security import verify_password, create_access_token
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from backend.app.models.auth import User


class AuthService:
    @staticmethod
    def authenticate(
        db: Session,
        login_data: LoginRequest,
        ip_address: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticate user with username/email and password.
        Updates last_login_at on success and logs audit events.
        """
        # Generic error message to prevent user enumeration
        generic_auth_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            user = UserRepository.get_by_username_or_email(db, login_data.username_or_email)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Server/database is unavailable.",
            )

        if not user:
            # Audit failed attempt (no user found)
            UserRepository.log_auth_action(
                db,
                user_id=None,
                action="LOGIN_FAILURE",
                ip_address=ip_address,
                details={"identifier": login_data.username_or_email, "reason": "User not found"},
            )
            raise generic_auth_error

        # Verify password hash
        if not verify_password(login_data.password, user.password_hash):
            UserRepository.log_auth_action(
                db,
                user_id=user.id,
                action="LOGIN_FAILURE",
                ip_address=ip_address,
                details={"reason": "Invalid password"},
            )
            raise generic_auth_error

        # Check active status
        if not user.is_active:
            UserRepository.log_auth_action(
                db,
                user_id=user.id,
                action="LOGIN_INACTIVE",
                ip_address=ip_address,
                details={"reason": "Inactive account"},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Please contact an administrator.",
            )

        # Successful login: update last_login_at
        now = datetime.now(timezone.utc)
        UserRepository.update_last_login(db, user.id, now)

        # Audit log success
        UserRepository.log_auth_action(
            db,
            user_id=user.id,
            action="LOGIN_SUCCESS",
            ip_address=ip_address,
            details={"role": user.role},
        )

        # Generate JWT token
        token = create_access_token(subject=user.id, role=user.role)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    def get_current_user_profile(user: User) -> UserResponse:
        return UserResponse.model_validate(user)
