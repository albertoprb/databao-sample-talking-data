"""Application configuration.

Loads secrets from .env file, all other config is defined here.
"""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Configure basic logging for config module (runs before main app logging setup)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# Load .env file from backend directory
_backend_dir = Path(__file__).parent.parent
_env_file = _backend_dir / ".env"

logger.info(f"📂 Loading .env from: {_env_file}")
logger.info(f"📄 .env exists: {_env_file.exists()}")

# Load the .env file
_loaded = load_dotenv(_env_file, override=True)
logger.info(f"✅ dotenv loaded: {_loaded}")

# Debug: log what we got
logger.info(
    f"🔑 DEEPGRAM_API_KEY from env: {'SET' if os.environ.get('DEEPGRAM_API_KEY') else 'NOT SET'}"
)

# =============================================================================
# Server settings
# =============================================================================
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8808

# =============================================================================
# CORS settings
# =============================================================================
CORS_ORIGINS = ["*"]  # In production, restrict this to your frontend URL
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# =============================================================================
# Data file settings
# =============================================================================
VALID_FILE_EXTENSIONS = {".csv", ".parquet", ".json", ".duckdb"}

# =============================================================================
# Voice/STT settings
# =============================================================================
# Deepgram API Key (loaded from .env)
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY")
