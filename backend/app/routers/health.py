"""Health check and general endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Hello from FastAPI sidecar!"}


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@router.get("/greet")
async def greet(name: str = "World"):
    """Greeting endpoint."""
    return {"message": f"Hello, {name}! Welcome from FastAPI!"}

