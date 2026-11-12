"""Standard application errors and exception handling."""

import uuid

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    code: str
    request_id: str


class SynergyxException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "INTERNAL_ERROR",
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code


class NotFoundError(SynergyxException):
    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND, detail=detail, code=code
        )


class ConflictError(SynergyxException):
    def __init__(
        self, detail: str = "Conflict with existing resource", code: str = "CONFLICT"
    ):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code=code)


class UnauthorizedError(SynergyxException):
    def __init__(
        self, detail: str = "Invalid or missing credentials", code: str = "UNAUTHORIZED"
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, code=code
        )


class ForbiddenError(SynergyxException):
    def __init__(self, detail: str = "Access forbidden", code: str = "FORBIDDEN"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN, detail=detail, code=code
        )


class BadRequestError(SynergyxException):
    def __init__(
        self, detail: str = "Invalid request payload", code: str = "BAD_REQUEST"
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST, detail=detail, code=code
        )


async def synergyx_exception_handler(
    request: Request, exc: SynergyxException
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": exc.code,
            "request_id": request_id,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "code": "INTERNAL_SERVER_ERROR",
            "request_id": request_id,
        },
    )
