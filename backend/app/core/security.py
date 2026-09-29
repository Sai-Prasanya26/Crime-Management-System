"""
Security & Cryptographic Utilities for Phase 6 Authentication.
Implements OWASP-recommended Argon2id password hashing and PyJWT tokens.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Union
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from backend.app.core.config import settings

# Initialize Argon2 password hasher with standard secure parameters
_pwd_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(plain_password: str) -> str:
    """
    Securely hash a plaintext password using Argon2id algorithm.
    """
    if not plain_password:
        raise ValueError("Password cannot be empty")
    return _pwd_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored Argon2id hash.
    Returns True if valid, False otherwise.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        return _pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception:
        return False


def create_access_token(
    subject: Union[str, int],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token containing subject (user_id), role, and expiration.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire_minutes = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expire = now + timedelta(minutes=expire_minutes)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token.
    Returns the payload dictionary if valid, or None if expired/invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
    except Exception:
        return None
