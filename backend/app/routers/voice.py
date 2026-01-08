"""Voice API endpoints for speech-to-text transcription."""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import config
from app.schemas.voice import TranscriptionResponse, VoiceServiceStatus
from app.services.voice import DeepgramSTTProvider, VoiceService
from app.services.voice.base import STTConfigError, STTError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])

# Voice service singleton, initialized on first use
_voice_service: VoiceService | None = None


def _create_provider(api_key: str | None) -> DeepgramSTTProvider:
    """Create a Deepgram STT provider.

    Args:
        api_key: The API key for Deepgram.

    Returns:
        A DeepgramSTTProvider instance.
    """
    return DeepgramSTTProvider(api_key=api_key)


def get_voice_service() -> VoiceService:
    """Get or create the voice service singleton.

    API key is read from config (which loads from .env).

    Returns:
        The configured VoiceService instance.
    """
    global _voice_service
    if _voice_service is None:
        api_key = config.DEEPGRAM_API_KEY
        logger.info(f"🔑 DEEPGRAM_API_KEY: {'set' if api_key else 'NOT SET'}")

        provider = _create_provider(api_key)
        _voice_service = VoiceService(provider)
        logger.info("✅ Voice service initialized with Deepgram provider")

    return _voice_service


@router.get("/status", response_model=VoiceServiceStatus)
async def get_voice_status() -> VoiceServiceStatus:
    """Check the status of the voice transcription service.

    Returns:
        Status information about the voice service.
    """
    service = get_voice_service()
    is_available = await service.is_available()

    return VoiceServiceStatus(
        available=is_available,
        provider=service.provider.provider_type.value,
        message="Ready" if is_available else "API key not configured",
    )


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
) -> TranscriptionResponse:
    """Transcribe audio to text and generate a curated prompt.

    This endpoint accepts an audio file, transcribes it using the configured
    STT provider, and returns both the raw transcript and a curated prompt
    suitable for data analysis queries.

    Args:
        audio: The audio file to transcribe. Supports webm, wav, mp3, etc.

    Returns:
        TranscriptionResponse with transcript and curated prompt.

    Raises:
        HTTPException: If transcription fails.
    """
    logger.info("=" * 60)
    logger.info("🎤 VOICE TRANSCRIPTION REQUEST RECEIVED")
    logger.info("=" * 60)

    service = get_voice_service()
    logger.info(f"📡 Using STT provider: {service.provider.provider_type.value}")

    # Check if service is available
    is_available = await service.is_available()
    logger.info(f"🔌 Service available: {is_available}")

    if not is_available:
        logger.error("❌ STT service is not available - check API key configuration")
        raise HTTPException(
            status_code=503,
            detail="STT service not available. Check your API key in .env file.",
        )

    # Read the audio data
    audio_data = await audio.read()
    logger.info(f"📁 Received file: {audio.filename}")
    logger.info(f"📊 File size: {len(audio_data)} bytes ({len(audio_data) / 1024:.2f} KB)")

    if not audio_data:
        logger.error("❌ Empty audio file received")
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine MIME type
    mime_type = audio.content_type or "audio/wav"
    logger.info(f"🎵 MIME type: {mime_type}")

    # Check WAV header if it's a WAV file
    if len(audio_data) >= 44:
        header = audio_data[:4].decode("latin-1", errors="ignore")
        logger.info(f"📋 File header: {repr(header)} (expect 'RIFF' for WAV)")

    try:
        logger.info("🚀 Starting transcription...")
        result = await service.transcribe(audio_data, mime_type)

        logger.info("✅ TRANSCRIPTION SUCCESSFUL")
        transcript_preview = result.transcript[:100]
        curated_preview = result.curated_prompt[:100]
        logger.info(f"📝 Transcript: '{transcript_preview}...'")
        logger.info(f"✨ Curated prompt: '{curated_preview}...'")
        logger.info(f"📊 Confidence: {result.confidence}")
        logger.info(f"🌍 Language: {result.language}")
        logger.info(f"⏱️ Duration: {result.duration_seconds}s")
        logger.info("=" * 60)

        return TranscriptionResponse(
            transcript=result.transcript,
            curated_prompt=result.curated_prompt,
            confidence=result.confidence,
            language=result.language,
            duration_seconds=result.duration_seconds,
        )

    except STTConfigError as e:
        logger.error(f"❌ STT CONFIGURATION ERROR: {e}")
        logger.error("💡 Check your .env file and ensure the API key is set correctly")
        raise HTTPException(
            status_code=503,
            detail=str(e),
        ) from e

    except STTError as e:
        logger.error(f"❌ STT ERROR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {e}",
        ) from e

    except Exception as e:
        logger.exception(f"❌ UNEXPECTED ERROR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}",
        ) from e
