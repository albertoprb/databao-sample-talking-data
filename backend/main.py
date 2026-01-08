"""Entry points for the Talking Data backend."""

import argparse

import uvicorn

# Default values (duplicated here to avoid importing config in reloader parent process)
_DEFAULT_HOST = "127.0.0.1"
_DEFAULT_PORT = 8808


def main():
    """Production entry point (used by sidecar)."""
    # Import here to avoid loading config twice with uvicorn reload
    from app import config
    from app.main import app

    parser = argparse.ArgumentParser(description="Talking Data Backend Sidecar")
    parser.add_argument(
        "--port", type=int, default=config.DEFAULT_PORT, help="Port to run the server on"
    )
    args = parser.parse_args()

    uvicorn.run(app, host=config.DEFAULT_HOST, port=args.port)


def dev():
    """Development entry point with hot reload."""
    # Use string import so uvicorn's child process loads the app, not this process
    uvicorn.run("app.main:app", host=_DEFAULT_HOST, port=_DEFAULT_PORT, reload=True)


if __name__ == "__main__":
    main()
