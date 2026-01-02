"""Entry points for the Talking Data backend."""

import argparse

import uvicorn

from app import config
from app.main import app

__all__ = ["app"]


def main():
    """Production entry point (used by sidecar)."""
    parser = argparse.ArgumentParser(description="Talking Data Backend Sidecar")
    parser.add_argument(
        "--port", type=int, default=config.DEFAULT_PORT, help="Port to run the server on"
    )
    args = parser.parse_args()

    uvicorn.run(app, host=config.DEFAULT_HOST, port=args.port)


def dev():
    """Development entry point with hot reload."""
    uvicorn.run("app.main:app", host=config.DEFAULT_HOST, port=config.DEFAULT_PORT, reload=True)


if __name__ == "__main__":
    main()
