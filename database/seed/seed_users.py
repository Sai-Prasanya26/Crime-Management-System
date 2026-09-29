"""
Seed Initial Users for Phase 6 Authentication & Role-Based Access Control.
Hashes passwords using Argon2id and populates the users table.
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database.session import SessionLocal
from backend.app.models.auth import User
from backend.app.core.security import hash_password

INITIAL_USERS = [
    {
        "username": "admin",
        "email": "admin@crimeops.gov.in",
        "full_name": "Chief System Administrator",
        "role": "ADMIN",
        "plain_password": "Admin@12345",
        "is_active": True,
    },
    {
        "username": "analyst",
        "email": "analyst@crimeops.gov.in",
        "full_name": "Senior Crime Analyst",
        "role": "ANALYST",
        "plain_password": "Analyst@12345",
        "is_active": True,
    },
    {
        "username": "officer",
        "email": "officer@crimeops.gov.in",
        "full_name": "Field Patrol Officer",
        "role": "OFFICER",
        "plain_password": "Officer@12345",
        "is_active": True,
    },
    {
        "username": "inactive",
        "email": "inactive@crimeops.gov.in",
        "full_name": "Suspended User Account",
        "role": "OFFICER",
        "plain_password": "Inactive@12345",
        "is_active": False,
    },
]


def seed_users():
    db = SessionLocal()
    created_count = 0
    updated_count = 0

    try:
        for u_data in INITIAL_USERS:
            existing = db.query(User).filter(
                (User.username == u_data["username"]) | (User.email == u_data["email"])
            ).first()

            pwd_hash = hash_password(u_data["plain_password"])

            if not existing:
                new_user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    password_hash=pwd_hash,
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    is_active=u_data["is_active"],
                )
                db.add(new_user)
                created_count += 1
                print(f"[CREATED] User '{u_data['username']}' with role '{u_data['role']}'")
            else:
                existing.password_hash = pwd_hash
                existing.full_name = u_data["full_name"]
                existing.role = u_data["role"]
                existing.is_active = u_data["is_active"]
                updated_count += 1
                print(f"[UPDATED] User '{u_data['username']}' with role '{u_data['role']}'")

        db.commit()
        print(f"\nUser seeding complete: {created_count} created, {updated_count} updated.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed users: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
