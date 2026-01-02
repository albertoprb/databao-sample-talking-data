"""Data analysis streaming endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import VALID_FILE_EXTENSIONS
from app.schemas.analysis import AnalyzeRequest
from app.services.analyzer import DataAnalyzer

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/stream")
async def analyze_stream(request: AnalyzeRequest):
    """Stream analysis results for a data file using Server-Sent Events."""
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

    analyzer = DataAnalyzer(str(file_path.absolute()))

    return StreamingResponse(
        analyzer.analyze_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

