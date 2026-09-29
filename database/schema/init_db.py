import sys
import os

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database.session import engine, Base
import backend.app.models  # Ensures all 17 models are registered with Base.metadata


def init_database():
    """Create all 17 frozen tables in the target MySQL database."""
    print("Connecting to MySQL and creating all 17 frozen tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")


if __name__ == "__main__":
    init_database()
