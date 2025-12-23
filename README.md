# 1. Project Overview

A local-first desktop application designed to showcase the Databao context engine and agent. The app allows users to drop local files (CSV, Parquet, JSON) or connect databases, performing instant and voice-first data analysis via DuckDB and AI-driven insights via Databao and Gemini Live Chat API.

# 2. System Architecture & Data Flow

- Runtime: Tauri (Rust) orchestrating a Python FastAPI sidecar. pyinstaller/nuitka (to ship Python sidecar)
- Data Engine: All local files are mounted as virtual tables in DuckDB.
- Context Layer: Databao acts as the primary "Agent" layer, interfacing between the raw DuckDB stats and the LLM. More on https://github.com/JetBrains/databao.
- UI Logic: A "Streaming-First" interface where answers (text, tables, charts) are prepended to a vertical feed. The user never see the written form.

# 3. Core User Experience (Step-by-Step)

## Phase 1: Ingestion

- Input: Drag-and-drop files to get path or DB connection string. No need to load the file into memory given it's a local-first application.
- Backend Action: Read files directly using DuckDB as virtual tables.
- Show a loading annimation of the agent scanning the schema and generating the context, then getting statistical summary of insights.

## Phase 2: Automated Cold-Start Analysis

- Statistical Profiling: Python backend uses DuckDB to generate descriptive statistics (null counts, distributions, correlations).
- Agent Initialization: The databao agent scans the DuckDB schema to establish metadata context.
- Insight Generation: 1. Pass DuckDB stats to Databao Agent. 2. Agent (might have to be other agent than databao agent) generates 10 high-value business questions. 3. Agent answers these questions sequentially.
- Streaming UI: Results (Text + Vega-Lite JSON) must stream one-by-one, prepending to the top of the React feed.

## Phase 3: Voice-First Interaction

- Input: Record audio (hold Spacebar/Mic button).
- Show animation as the user speaks. When the user stops speaking, we stop the animation and show an animation of the agent processing the question.
- Processing: Audio is processed via Gemini Live Chat API.
- Constraint: The user's spoken question is converted to a Databao agent query but is never displayed as text to the user; only the resulting answer and visualization appear.
- The answer is appended to the top of the screen. Streaming 1 by 1. After the answer is appended, the animation is removed and the user can speak again.

# 4. Technology Stack details

| Layer             | Technology              | Key Implementation Notes                                        |
| ----------------- | ----------------------- | --------------------------------------------------------------- |
| Shell             | Tauri + Rust            | Manages Python sidecar lifecycle                                |
| Frontend          | React, Tailwind, Shadcn | State managed with Zustand (with persistence)                   |
| Visualization     | Vega-Lite               | Rendered via react-vega (transitioning from Plotly)             |
| Backend           | FastAPI + uv            | High-performance async Python endpoints                         |
| Analytics Engine  | DuckDB + SQLAlchemy     | DuckDB for data analytics; SQLAlchemy ORM for DB interaction    |
| Local Persistence | SQLite                  | Handles app state and history persistence locally               |
| AI/Agent Layer    | Databao + Voice AI API  | Databao for RAG/context; Gemini for live voice/LLM interactions |

my-data-app/
├── src-tauri/
│ ├── src/
│ │ └── main.rs
│ ├── bin/ # Compiled python binaries are here
│ ├── Cargo.toml
│ └── tauri.conf.json # Configures the "externalBin" sidecar settings
│
├── frontend/ # Standard Vite/React
│ ├── src/
│ │ ├── api/ # Added: Centralized Tanstack Query fetchers
│ │ ├── components/
│ │ ├── hooks/ # useStreamingAnalysis.ts lives here
│ │ └── stores/
│ └── ...
│
├── backend/ # Python sidecar
│ ├── app/
│ │ ├── main.py
│ │ ├── routers/
│ │ ├── services/
│ │ ├── models/ # SQLAlchemy schemas for SQLite
│ │ └── db/
│ ├── scripts/ # Added: Build script to trigger PyInstaller/Nuitka
│ │ └── build_sidecar.py
│ ├── pyproject.toml # uv config
│ └── uv.lock
│
├── .gitignore # Ensure it ignores .sqlite and .duckdb files
└── README.md

# Development & Release setup instructions

1. Clone the repository
2. Install [Bun](https://bun.sh/) (for JavaScript package management and running scripts)
   ```sh
   curl -fsSL https://bun.sh/install | bash
   ```
3. Install [uv](https://github.com/astral-sh/uv) (for Python package management, much faster than pip)
   ```sh
   curl -Ls https://astral.sh/uv/install.sh | sh
   ```
   Install Python 3.12 via uv (needed for dev headers)
   ```sh
   uv python install 3.12
   ```
4. Install Tauri dependencies
   ```sh
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf ccache
   ```
   Install Rust
   ```sh
   curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
   ```
5. Install Python dependencies
   ```sh
   uv sync
   ```
6. Install JavaScript dependencies
   ```sh
   bun install
   ```
7. Run on dev mode
   ```sh
   cd backend && uv run dev
   cd frontend && bun tauri dev
   ```
8. Release
   - Build the backend sidecar
   ```sh
   cd backend && uv run build-sidecar
   ```
   - Build the Tauri application
   ```sh
   cd frontend && bun tauri build
   ```
   The application delivery will be in the `frontend/target/release/bundle` directory.
