"""
Authentication & Authorization Dependencies for FastAPI.
Provides JWT token extraction, user validation, and role-based access control.
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.repositories.user_repository import UserRepository
from backend.app.models.auth import User

# OAuth2 scheme for OpenAPI interactive docs
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and validate JWT access token from Authorization header.
    Returns the authenticated active User or raises HTTP 401.
    """
    auth_header = request.headers.get("Authorization")
    raw_token = token
    if not raw_token and auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header[7:].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserRepository.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


def require_roles(allowed_roles: List[str]):
    """
    Dependency factory to enforce role-based access control (RBAC).
    Allowed roles: 'ADMIN', 'ANALYST', 'OFFICER', 'INVESTIGATOR', 'SUPERVISOR'.
    """
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {', '.join(allowed_roles)} (current: {current_user.role}).",
            )
        return current_user

    return role_dependency


# Specific role dependencies for convenience
require_admin = require_roles(["ADMIN"])
require_analyst = require_roles(["ADMIN", "ANALYST"])
require_officer = require_roles(["ADMIN", "OFFICER"])
require_investigator = require_roles(["ADMIN", "INVESTIGATOR"])
require_supervisor = require_roles(["ADMIN", "SUPERVISOR"])
