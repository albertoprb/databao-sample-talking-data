"""Data file management endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import VALID_FILE_EXTENSIONS
from app.schemas.data import LoadFileRequest, LoadFileResponse

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/load-file", response_model=LoadFileResponse)
async def load_file(request: LoadFileRequest):
    """Load a data file from the given path."""
    file_path = Path(request.file_path)

    # Validate the file exists
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")

    if not file_path.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {request.file_path}")

    # Validate file extension
    if file_path.suffix.lower() not in VALID_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_path.suffix}. "
            f"Supported: {', '.join(VALID_FILE_EXTENSIONS)}",
        )

    file_size = file_path.stat().st_size

    return LoadFileResponse(
        success=True,
        message=f"File loaded successfully: {file_path.name}",
        file_path=str(file_path.absolute()),
        file_name=file_path.name,
        file_size=file_size,
    )
