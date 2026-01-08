"""Pydantic schemas for voice-related API endpoints."""

from pydantic import BaseModel, Field


class TranscriptionResponse(BaseModel):
    """Response from the voice transcription endpoint."""

    transcript: str = Field(
        ...,
        description="The raw transcribed text from the audio",
        examples=["uh can you show me the average sales by region"],
    )

    curated_prompt: str = Field(
        ...,
        description="A refined, actionable prompt for data analysis",
        examples=["Show the average sales grouped by region"],
    )

    confidence: float | None = Field(
        default=None,
        description="Confidence score of the transcription (0.0 to 1.0)",
        ge=0.0,
        le=1.0,
    )

    language: str | None = Field(
        default=None,
        description="Detected language code (e.g., 'en', 'es')",
        examples=["en", "es", "pt"],
    )

    duration_seconds: float | None = Field(
        default=None,
        description="Duration of the audio in seconds",
        ge=0.0,
    )


class VoiceServiceStatus(BaseModel):
    """Status of the voice service."""

    available: bool = Field(
        ...,
        description="Whether the voice service is available",
    )

    provider: str = Field(
        ...,
        description="The name of the current STT provider",
        examples=["gemini", "deepgram", "whisper"],
    )

    message: str = Field(
        default="",
        description="Additional status message",
    )

