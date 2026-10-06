from fastapi import APIRouter
from backend.app.api.v1 import health, geography, analytics, auth, official_crime, admin, predictions

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(geography.router, prefix="/geography", tags=["Geography"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Crime Analytics"])
api_router.include_router(official_crime.router, prefix="/official-crime", tags=["Official NCRB Statistics"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
