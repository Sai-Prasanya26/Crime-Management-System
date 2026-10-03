from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime

RoleType = Literal["ADMIN", "ANALYST", "OFFICER", "INVESTIGATOR", "SUPERVISOR"]


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CreateStaffRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(
        ...,
        min_length=5,
        max_length=100,
        pattern=r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$",
        description="Official email address",
    )
    password: str = Field(..., min_length=6, max_length=100)
    role: RoleType = "OFFICER"
    is_active: bool = True


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100, description="Read-only account identity field")
    username: Optional[str] = Field(None, max_length=50, description="Read-only account identity field")
    role: Optional[str] = Field(None, description="Read-only account identity field")
    is_active: Optional[bool] = Field(None, description="Read-only account identity field")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)
    confirm_password: str = Field(..., min_length=6, max_length=128)

