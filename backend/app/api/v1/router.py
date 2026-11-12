"""FastAPI v1 API router registration shell."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    dashboard,
    documents,
    organization,
    production_records,
    utility_records,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_v1_router.include_router(organization.router, prefix="/organization", tags=["organization"])
api_v1_router.include_router(documents.router)
api_v1_router.include_router(utility_records.router)
api_v1_router.include_router(production_records.router)
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(analytics.router)
