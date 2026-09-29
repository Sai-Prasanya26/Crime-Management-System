from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from backend.app.database.session import get_db

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    database: Optional[str] = None


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Health check endpoint to verify backend service and database availability.
    """
    try:
        db.execute(text("SELECT 1;"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return HealthResponse(status="ok", database=db_status)
