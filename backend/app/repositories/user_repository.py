from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
from typing import Optional
from backend.app.models.auth import User, AuditLog


class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_username_or_email(db: Session, identifier: str) -> Optional[User]:
        """
        Find user by either username or email (case-insensitive).
        """
        clean_id = identifier.strip().lower()
        return (
            db.query(User)
            .filter(
                or_(
                    func.lower(User.username) == clean_id,
                    func.lower(User.email) == clean_id,
                )
            )
            .first()
        )

    @staticmethod
    def update_last_login(db: Session, user_id: int, login_time: datetime) -> None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_login_at = login_time
            db.commit()

    @staticmethod
    def create_user(
        db: Session,
        username: str,
        email: str,
        password_hash: str,
        full_name: str,
        role: str = "ANALYST",
        is_active: bool = True,
    ) -> User:
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def log_auth_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        ip_address: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """
        Audit log for authentication events (login success, login failure, logout).
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type="AUTH",
                entity_id=str(user_id) if user_id else None,
                ip_address=ip_address,
                details=details,
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            db.rollback()
            # Do not block authentication flow if audit log fails
            print(f"[Warning] Failed to write audit log: {e}")
