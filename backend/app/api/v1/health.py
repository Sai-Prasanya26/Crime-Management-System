from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from backend.app.database.session import get_db

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    database: Optional[str] = None
    tables_verified: Optional[bool] = None
    database_name: Optional[str] = None
    error: Optional[str] = None


REQUIRED_TABLES = [
    "users",
    "states",
    "districts",
    "crime_incidents",
    "official_crime_statistics",
    "district_geography_mapping",
]


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service & Database Health Check",
    description="Verifies backend availability, MySQL connectivity, and required table presence without exposing credentials.",
)
def get_health(db: Session = Depends(get_db)):
    try:
        # 1. Connectivity test
        db.execute(text("SELECT 1;"))

        # 2. Database existence and current database name
        db_name_res = db.execute(text("SELECT DATABASE();")).scalar()

        # 3. Check for required tables
        tables_res = db.execute(text("SHOW TABLES;")).fetchall()
        existing_tables = set(row[0].lower() for row in tables_res if row[0])

        missing_tables = [t for t in REQUIRED_TABLES if t.lower() not in existing_tables]
        if missing_tables:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "degraded",
                    "database": "connected",
                    "tables_verified": False,
                    "database_name": db_name_res,
                    "error": f"Required database tables missing: {', '.join(missing_tables)}",
                },
            )

        return HealthResponse(
            status="ok",
            database="connected",
            tables_verified=True,
            database_name=db_name_res,
        )

    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "tables_verified": False,
                "database_name": None,
                "error": "Server/database is unavailable. Unable to connect to MySQL database.",
            },
        )
