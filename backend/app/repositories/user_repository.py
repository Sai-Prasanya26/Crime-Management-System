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
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        return db.query(User).order_by(User.id.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def update_user_status(db: Session, user_id: int, is_active: bool) -> Optional[User]:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_active = is_active
            db.commit()
            db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False

    @staticmethod
    def get_audit_logs(db: Session, limit: int = 50):
        return db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()

    @staticmethod
    def log_auth_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        entity_type: str = "AUTH",
        entity_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """
        Audit log for authentication & staff management events.
        """
        try:
            log_entry = AuditLog(
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id if entity_id is not None else (str(user_id) if user_id else None),
                ip_address=ip_address,
                details=details,
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            db.rollback()
            # Do not block authentication flow if audit log fails
            print(f"[Warning] Failed to write audit log: {e}")
