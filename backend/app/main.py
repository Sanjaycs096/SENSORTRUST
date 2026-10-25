"""
SensorTrust — FastAPI Main Application Entry Point
IEEE ClimateChain Global Hackathon 2026 — Track D: Climate Data & Environmental Monitoring
Tagline: Trust the Data. Verify the History.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base, SessionLocal, upgrade_database_schema
from app.api.v1 import api_v1_router
from app.services.seed_service import seed_database_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle manager."""
    # Initialize database tables and upgrade existing schemas
    Base.metadata.create_all(bind=engine)
    upgrade_database_schema(engine)

    # Seed initial baseline dataset if configured and empty
    if settings.SEED_ON_STARTUP:
        db = SessionLocal()
        try:
            seed_database_if_empty(db)
        finally:
            db.close()

    yield
    # Shutdown cleanup if needed


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "SensorTrust Backend API: AI-assisted environmental telemetry integrity "
        "and tamper-evident blockchain provenance platform for municipal monitoring networks."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware narrowly restricted to authorized local frontend development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount versioned API router
app.include_router(api_v1_router)


# Root status information endpoint
@app.get("/", tags=["Root"])
def root_info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "tagline": "Trust the Data. Verify the History.",
        "documentation": "/docs",
        "health": "/api/v1/health",
        "apiPrefix": "/api/v1"
    }


# Standardized error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for error in exc.errors():
        details.append({
            "loc": [str(loc) for loc in error.get("loc", [])],
            "msg": error.get("msg", "Invalid parameter"),
            "type": error.get("type", "value_error")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "ERR_REQUEST_VALIDATION_FAILED",
            "message": "The incoming request payload failed schema validation.",
            "details": details
        }
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": f"ERR_HTTP_{exc.status_code}",
            "message": exc.detail
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # In production do not leak raw stack traces
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "ERR_INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred while processing the request."
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
