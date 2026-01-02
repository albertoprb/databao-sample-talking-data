"""Pydantic schemas for data-related endpoints."""

from pydantic import BaseModel


class LoadFileRequest(BaseModel):
    """Request model for loading a data file."""

    file_path: str


class LoadFileResponse(BaseModel):
    """Response model for loading a data file."""

    success: bool
    message: str
    file_path: str
    file_name: str
    file_size: int

