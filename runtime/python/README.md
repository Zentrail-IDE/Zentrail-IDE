# Zentrail Python Runtime

The Python AI runtime provides tool/agent orchestration for Zentrail IDE via
**MCP** (Model Context Protocol) and **LangGraph**.

## Phase 1 scope

- Package skeleton (`src/zentrail_runtime`) with a `Runtime` lifecycle.
- `pyproject.toml` declaring dependencies and a `zentrail-runtime` entry point.
- Graceful signal handling so it can run as a Tauri sidecar.

## Setup & run

```bash
pnpm py:install        # create .venv and install (via the workspace)
# or directly:
python -m venv .venv && .venv/Scripts/activate && pip install -e .
zentrail-runtime
```

## Roadmap

- `fastmcp` server exposing tools/resources to the desktop shell.
- `langgraph` orchestration graph for agent collaboration.
- Streaming bridge to the Go core event bus.
