"""FastAPI v1 API router registration shell."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    actions,
    analytics,
    auth,
    dashboard,
    documents,
    insights,
    organization,
    production_records,
    recommendations,
    reports,
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
api_v1_router.include_router(insights.router)
api_v1_router.include_router(recommendations.router)
api_v1_router.include_router(actions.router)
api_v1_router.include_router(reports.router)
