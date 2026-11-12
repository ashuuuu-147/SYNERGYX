"""FastAPI v1 API router registration shell."""

from fastapi import APIRouter

api_v1_router = APIRouter()

# Domain routes will be registered here in subsequent tasks:
# api_v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
# api_v1_router.include_router(org_router, prefix="/organization", tags=["organization"])
# etc.
