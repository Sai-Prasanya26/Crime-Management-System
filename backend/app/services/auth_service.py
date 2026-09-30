from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from backend.app.repositories.user_repository import UserRepository
from backend.app.core.security import verify_password, create_access_token, hash_password
from backend.app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    CreateStaffRequest,
    AuditLogResponse,
)
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

    @staticmethod
    def list_staff(db: Session, skip: int = 0, limit: int = 100):
        users = UserRepository.get_all(db, skip=skip, limit=limit)
        return [UserResponse.model_validate(u) for u in users]

    @staticmethod
    def create_staff(
        db: Session,
        staff_data: CreateStaffRequest,
        admin_user: User,
        ip_address: Optional[str] = None,
    ) -> UserResponse:
        clean_username = staff_data.username.strip().lower()
        clean_email = staff_data.email.strip().lower()

        # Check existing username
        existing_user = UserRepository.get_by_username_or_email(db, clean_username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{staff_data.username.strip()}' is already in use.",
            )

        # Check existing email
        existing_email = UserRepository.get_by_username_or_email(db, clean_email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email address '{staff_data.email.strip()}' is already registered.",
            )

        # Secure Argon2id password hash
        pwd_hash = hash_password(staff_data.password)

        new_user = UserRepository.create_user(
            db=db,
            username=staff_data.username.strip(),
            email=staff_data.email.strip().lower(),
            password_hash=pwd_hash,
            full_name=staff_data.full_name.strip(),
            role=staff_data.role,
            is_active=staff_data.is_active,
        )

        # Audit log creation
        UserRepository.log_auth_action(
            db=db,
            user_id=admin_user.id,
            action="STAFF_ACCOUNT_CREATED",
            ip_address=ip_address,
            details={
                "created_user_id": new_user.id,
                "username": new_user.username,
                "role": new_user.role,
                "is_active": new_user.is_active,
                "created_by": admin_user.username,
            },
        )

        return UserResponse.model_validate(new_user)

    @staticmethod
    def update_staff_status(
        db: Session,
        target_user_id: int,
        is_active: bool,
        admin_user: User,
        ip_address: Optional[str] = None,
    ) -> UserResponse:
        if admin_user.id == target_user_id and not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot deactivate their own active account.",
            )

        target_user = UserRepository.get_by_id(db, target_user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member account not found.",
            )

        updated_user = UserRepository.update_user_status(db, target_user_id, is_active)

        # Audit log status update
        UserRepository.log_auth_action(
            db=db,
            user_id=admin_user.id,
            action="STAFF_ACCOUNT_STATUS_CHANGED",
            ip_address=ip_address,
            details={
                "target_user_id": target_user_id,
                "target_username": target_user.username,
                "new_status": "ACTIVE" if is_active else "INACTIVE",
                "updated_by": admin_user.username,
            },
        )

        return UserResponse.model_validate(updated_user)

    @staticmethod
    def delete_staff(
        db: Session,
        target_user_id: int,
        admin_user: User,
        ip_address: Optional[str] = None,
    ) -> None:
        if admin_user.id == target_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot delete their own account.",
            )

        target_user = UserRepository.get_by_id(db, target_user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff member account not found.",
            )

        target_username = target_user.username
        UserRepository.delete_user(db, target_user_id)

        # Audit log deletion
        UserRepository.log_auth_action(
            db=db,
            user_id=admin_user.id,
            action="STAFF_ACCOUNT_DELETED",
            ip_address=ip_address,
            details={
                "deleted_user_id": target_user_id,
                "deleted_username": target_username,
                "deleted_by": admin_user.username,
            },
        )

    @staticmethod
    def list_audit_logs(db: Session, limit: int = 50):
        logs = UserRepository.get_audit_logs(db, limit=limit)
        return [AuditLogResponse.model_validate(log) for log in logs]

