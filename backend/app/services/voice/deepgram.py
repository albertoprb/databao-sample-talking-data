"""Deepgram-based Speech-to-Text provider.

This module implements the STT interface using Deepgram's API,
which provides fast, accurate speech recognition with low latency.
"""

import logging
import os
from typing import Any

from .base import (
    BaseSTTProvider,
    STTConfigError,
    STTProviderType,
    STTResult,
    STTTranscriptionError,
)

logger = logging.getLogger(__name__)


class DeepgramSTTProvider(BaseSTTProvider):
    """Speech-to-Text provider using Deepgram's API.

    Deepgram offers fast, accurate transcription with features like
    smart formatting, punctuation, and word-level timestamps.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "nova-2",
        language: str = "en",
        system_prompt: str | None = None,
    ):
        """Initialize the Deepgram STT provider.

        Args:
            api_key: Deepgram API key. If not provided, reads from DEEPGRAM_API_KEY env var.
            model: The Deepgram model to use. Defaults to nova-2 (latest, most accurate).
            language: Language code for transcription. Defaults to English.
            system_prompt: Optional custom system prompt for curating transcripts.
        """
        super().__init__(system_prompt)
        self._api_key = api_key or os.environ.get("DEEPGRAM_API_KEY")
        self._model = model
        self._language = language
        self._client: Any = None

        # Log initialization details
        logger.info("🔧 DeepgramSTTProvider initialized")
        logger.info(f"   - api_key passed in: {bool(api_key)}")
        logger.info(f"   - api_key from env: {bool(os.environ.get('DEEPGRAM_API_KEY'))}")
        logger.info(f"   - final api_key set: {bool(self._api_key)}")

    @property
    def provider_type(self) -> STTProviderType:
        """Return the provider type."""
        return STTProviderType.DEEPGRAM

    def _get_client(self) -> Any:
        """Get or create the Deepgram client."""
        if self._client is None:
            try:
                from deepgram import DeepgramClient

                # v5.x API: pass API key as keyword argument
                self._client = DeepgramClient(api_key=self._api_key)
                logger.info("✅ Deepgram client created successfully")
            except ImportError as e:
                raise STTConfigError(
                    "deepgram-sdk not installed. Run: pip install deepgram-sdk"
                ) from e
        return self._client

    async def is_available(self) -> bool:
        """Check if Deepgram is properly configured."""
        logger.info("🔍 Checking Deepgram availability...")
        logger.info(f"🔑 API key set: {bool(self._api_key)}")
        if self._api_key:
            # Show masked key for debugging
            key_len = len(self._api_key)
            masked = f"{self._api_key[:8]}...{self._api_key[-4:]}" if key_len > 12 else "***"
            logger.info(f"🔑 API key (masked): {masked}")

        if not self._api_key:
            logger.warning("❌ Deepgram API key is not set!")
            return False

        try:
            self._get_client()
            logger.info("✅ Deepgram client created successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to create Deepgram client: {e}")
            return False

    async def transcribe(self, audio_data: bytes, mime_type: str = "audio/webm") -> STTResult:
        """Transcribe audio using Deepgram's API.

        Args:
            audio_data: Raw audio bytes.
            mime_type: MIME type of the audio.

        Returns:
            STTResult with transcript and curated prompt.

        Raises:
            STTTranscriptionError: If transcription fails.
            STTConfigError: If Deepgram is not properly configured.
        """
        logger.info("[Deepgram] 🎯 Starting transcription")
        logger.info(f"[Deepgram] 📊 Audio size: {len(audio_data)} bytes, MIME: {mime_type}")
        logger.info(f"[Deepgram] ⚙️ Model: {self._model}, Language: {self._language}")

        if not self._api_key:
            logger.error("[Deepgram] ❌ API key not configured!")
            raise STTConfigError(
                "Deepgram API key not configured. Set the DEEPGRAM_API_KEY environment variable."
            )

        # Mask API key for logging
        masked_key = (
            self._api_key[:8] + "..." + self._api_key[-4:] if len(self._api_key) > 12 else "***"
        )
        logger.info(f"[Deepgram] 🔑 Using API key: {masked_key}")

        try:
            client = self._get_client()
            logger.info("[Deepgram] 📡 Client initialized")

            # Transcribe using v5 API - pass bytes directly with options as kwargs
            logger.info("[Deepgram] 🚀 Sending audio to Deepgram API...")
            response = client.listen.v1.media.transcribe_file(
                request=audio_data,
                model=self._model,
                language=self._language,
                smart_format=True,  # Adds punctuation and formatting
                punctuate=True,
                filler_words=True,  # Keep filler words for curation
            )
            logger.info("[Deepgram] ✅ Received response from Deepgram")

            # Extract the transcript
            raw_transcript = ""
            confidence = None
            duration_seconds = None
            detected_language = None

            if response.results and response.results.channels:
                logger.info(f"[Deepgram] 📊 Found {len(response.results.channels)} channel(s)")
                channel = response.results.channels[0]
                if channel.alternatives:
                    logger.info(f"[Deepgram] 📊 Found {len(channel.alternatives)} alternative(s)")
                    alternative = channel.alternatives[0]
                    raw_transcript = alternative.transcript
                    confidence = alternative.confidence
                    preview = raw_transcript[:100]
                    logger.info(f"[Deepgram] 📝 Raw: '{preview}...' (conf: {confidence})")
                else:
                    logger.warning("[Deepgram] ⚠️ No alternatives in channel")
            else:
                logger.warning("[Deepgram] ⚠️ No results or channels in response")

            # Get metadata if available
            if response.metadata:
                duration_seconds = response.metadata.duration
                logger.info(f"[Deepgram] ⏱️ Duration: {duration_seconds}s")

            # detected_language is on the channel in v5
            if response.results and response.results.channels:
                channel = response.results.channels[0]
                if channel.detected_language:
                    detected_language = channel.detected_language
                    logger.info(f"[Deepgram] 🌍 Detected language: {detected_language}")

            if not raw_transcript:
                logger.error("[Deepgram] ❌ No transcript returned!")
                raise STTTranscriptionError("No transcript returned from Deepgram")

            # Generate curated prompt using a simple local approach
            logger.info("[Deepgram] ✨ Curating transcript...")
            curated_prompt = self._curate_transcript(raw_transcript)
            logger.info(f"[Deepgram] ✨ Curated: '{curated_prompt[:100]}...'")

            logger.info("[Deepgram] ✅ Transcription complete!")
            return STTResult(
                transcript=raw_transcript,
                curated_prompt=curated_prompt,
                confidence=confidence,
                language=detected_language or self._language,
                duration_seconds=duration_seconds,
            )

        except STTTranscriptionError:
            raise
        except Exception as e:
            logger.error(f"[Deepgram] ❌ Transcription error: {e}")
            logger.exception("[Deepgram] Full traceback:")
            raise STTTranscriptionError(f"Deepgram transcription failed: {e}") from e

    def _curate_transcript(self, transcript: str) -> str:
        """Curate the transcript into a cleaner prompt.

        This is a simple rule-based approach. For better results,
        you could integrate an LLM to process this.

        Args:
            transcript: The raw transcript from Deepgram.

        Returns:
            A cleaner, more actionable prompt.
        """
        # Remove common filler words
        filler_words = [
            "um",
            "uh",
            "er",
            "ah",
            "like",
            "you know",
            "basically",
            "actually",
            "so",
            "well",
            "I mean",
            "kind of",
            "sort of",
        ]

        result = transcript

        # Remove filler words (case-insensitive)
        for filler in filler_words:
            # Match whole words only
            import re

            pattern = rf"\b{re.escape(filler)}\b"
            result = re.sub(pattern, "", result, flags=re.IGNORECASE)

        # Clean up multiple spaces
        result = re.sub(r"\s+", " ", result).strip()

        # Clean up punctuation issues from removal
        result = re.sub(r"\s+,", ",", result)
        result = re.sub(r",\s*,", ",", result)
        result = re.sub(r"^\s*,\s*", "", result)

        # Capitalize first letter
        if result:
            result = result[0].upper() + result[1:]

        return result if result else transcript
