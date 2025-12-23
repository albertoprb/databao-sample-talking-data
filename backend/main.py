import argparse

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello from FastAPI sidecar!"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/greet")
async def greet(name: str = "World"):
    return {"message": f"Hello, {name}! Welcome from FastAPI!"}


def main():
    """Production entry point (used by sidecar)."""
    parser = argparse.ArgumentParser(description="Talking Data Backend Sidecar")
    parser.add_argument("--port", type=int, default=8808, help="Port to run the server on")
    args = parser.parse_args()

    uvicorn.run(app, host="127.0.0.1", port=args.port)


def dev():
    """Development entry point with hot reload."""
    uvicorn.run("main:app", host="127.0.0.1", port=8808, reload=True)


if __name__ == "__main__":
    main()
