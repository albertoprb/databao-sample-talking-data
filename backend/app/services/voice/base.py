"""Abstract base class for Speech-to-Text providers.

This module defines the interface that all STT providers must implement,
enabling easy swapping between different services (Gemini, Deepgram, Whisper, etc.)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Protocol, runtime_checkable


class STTProviderType(str, Enum):
    """Supported STT provider types."""

    DEEPGRAM = "deepgram"


@dataclass
class STTResult:
    """Result from speech-to-text transcription."""

    transcript: str
    """The raw transcribed text from the audio."""

    curated_prompt: str
    """A refined, actionable prompt derived from the transcript for the agent."""

    confidence: float | None = None
    """Confidence score of the transcription (0.0 to 1.0), if available."""

    language: str | None = None
    """Detected language code (e.g., 'en', 'es'), if available."""

    duration_seconds: float | None = None
    """Duration of the audio in seconds, if available."""


@runtime_checkable
class STTProvider(Protocol):
    """Protocol defining the interface for STT providers.

    All STT implementations must conform to this protocol to be
    swappable in the VoiceService.
    """

    @property
    def provider_type(self) -> STTProviderType:
        """Return the type of this provider."""
        ...

    async def transcribe(self, audio_data: bytes, mime_type: str = "audio/webm") -> STTResult:
        """Transcribe audio data to text and generate a curated prompt.

        Args:
            audio_data: Raw audio bytes.
            mime_type: MIME type of the audio (e.g., 'audio/webm', 'audio/wav').

        Returns:
            STTResult containing the transcript and curated prompt.

        Raises:
            STTError: If transcription fails.
        """
        ...

    async def is_available(self) -> bool:
        """Check if the provider is properly configured and available.

        Returns:
            True if the provider can be used, False otherwise.
        """
        ...


class STTError(Exception):
    """Base exception for STT-related errors."""

    pass


class STTConfigError(STTError):
    """Raised when STT provider is not properly configured."""

    pass


class STTTranscriptionError(STTError):
    """Raised when transcription fails."""

    pass


class BaseSTTProvider(ABC):
    """Abstract base class for STT providers with common functionality."""

    def __init__(self, system_prompt: str | None = None):
        """Initialize the provider.

        Args:
            system_prompt: Optional system prompt for curating the transcript
                          into an actionable query.
        """
        self._system_prompt = system_prompt or self._default_system_prompt()

    def _default_system_prompt(self) -> str:
        """Return the default system prompt for curating transcripts."""
        return """You are a voice query interpreter for a data analysis application.

Your task is to take a user's spoken query (which may contain filler words, 
hesitations, or informal language) and convert it into a clear, actionable 
data analysis prompt.

Guidelines:
1. Remove filler words (um, uh, like, you know, etc.)
2. Correct obvious speech recognition errors based on context
3. Preserve the user's intent and any specific details mentioned
4. Format the query as a clear question or command for data analysis
5. If the query mentions specific columns, metrics, or filters, preserve them exactly
6. Keep the prompt concise but complete

Examples:
- Input: "uh can you show me like the um average sales by region"
  Output: "Show the average sales grouped by region"

- Input: "what's the uh correlation between price and um you know quantity"
  Output: "Calculate the correlation between price and quantity"

- Input: "filter the data to only show um records from 2023 and then give me a summary"
  Output: "Filter data to 2023 and provide a summary"

Respond with ONLY the curated prompt, nothing else."""

    @property
    @abstractmethod
    def provider_type(self) -> STTProviderType:
        """Return the type of this provider."""
        pass

    @abstractmethod
    async def transcribe(self, audio_data: bytes, mime_type: str = "audio/webm") -> STTResult:
        """Transcribe audio data to text and generate a curated prompt."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is properly configured and available."""
        pass


class VoiceService:
    """High-level voice service that manages STT providers.

    This service provides a clean interface for the rest of the application
    and handles provider selection and fallback logic.
    """

    def __init__(self, provider: STTProvider):
        """Initialize the voice service with a provider.

        Args:
            provider: The STT provider to use for transcription.
        """
        self._provider = provider

    @property
    def provider(self) -> STTProvider:
        """Get the current STT provider."""
        return self._provider

    def set_provider(self, provider: STTProvider) -> None:
        """Switch to a different STT provider.

        Args:
            provider: The new provider to use.
        """
        self._provider = provider

    async def transcribe(self, audio_data: bytes, mime_type: str = "audio/webm") -> STTResult:
        """Transcribe audio using the configured provider.

        Args:
            audio_data: Raw audio bytes.
            mime_type: MIME type of the audio.

        Returns:
            STTResult with transcript and curated prompt.

        Raises:
            STTError: If transcription fails.
        """
        if not await self._provider.is_available():
            raise STTConfigError(
                f"STT provider '{self._provider.provider_type.value}' is not available. "
                "Check your configuration and API keys."
            )

        return await self._provider.transcribe(audio_data, mime_type)

    async def is_available(self) -> bool:
        """Check if the voice service is ready to use."""
        return await self._provider.is_available()
