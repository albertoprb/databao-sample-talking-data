"""FastAPI application factory and configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.routers import analysis, data, health, voice


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="Talking Data API",
        description="Backend API for the Talking Data application",
        version="0.1.0",
    )

    # Add CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=config.CORS_ALLOW_CREDENTIALS,
        allow_methods=config.CORS_ALLOW_METHODS,
        allow_headers=config.CORS_ALLOW_HEADERS,
    )

    # Include routers
    application.include_router(health.router)
    application.include_router(data.router)
    application.include_router(analysis.router)
    application.include_router(voice.router)

    return application


# Create the app instance
app = create_app()
