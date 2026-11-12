"""FastAPI Application Entry Point and Factory."""

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.errors import (
    SynergyxException,
    generic_exception_handler,
    synergyx_exception_handler,
)
from app.core.logging import logger


def create_app() -> FastAPI:
    """Application factory for SYNERGYX API."""
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Request ID and timing middleware
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.time()

        response = await call_next(request)

        duration = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        logger.info(
            f"{request.method} {request.url.path} completed with status {response.status_code} in {duration}ms"
        )
        return response

    # Exception Handlers
    app.add_exception_handler(SynergyxException, synergyx_exception_handler)
    if settings.APP_ENV == "production":
        app.add_exception_handler(Exception, generic_exception_handler)

    # Health Check Endpoints (Blueprint Section 11.2)
    @app.get("/health/live", tags=["health"])
    def health_live():
        """Liveness check: process is running without database dependency."""
        return {
            "status": "live",
            "app": settings.APP_NAME,
            "env": settings.APP_ENV,
        }

    @app.get("/health/ready", tags=["health"])
    def health_ready():
        """Readiness check: configuration and core components are available."""
        return {
            "status": "ready",
            "app": settings.APP_NAME,
            "env": settings.APP_ENV,
        }

    # Mount API v1 router
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
