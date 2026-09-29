from fastapi import APIRouter
from backend.app.api.v1 import health, geography, analytics

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(geography.router, prefix="/geography", tags=["Geography"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Crime Analytics"])
