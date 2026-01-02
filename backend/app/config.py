"""Application configuration."""

# Supported file extensions for data files
VALID_FILE_EXTENSIONS = {".csv", ".parquet", ".json", ".duckdb"}

# CORS settings
CORS_ORIGINS = ["*"]  # In production, restrict this to your frontend URL
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

# Server defaults
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8808

