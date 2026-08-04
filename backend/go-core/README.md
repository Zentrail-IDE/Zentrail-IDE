# Go Core

The Go core service is the high-performance backend for Zentrail IDE.

## Phase 1 scope

- Process bootstrap with graceful shutdown (`main.go`).
- Configuration system (`internal/config`) sourced from environment variables.
- HTTP surface: `/healthz` (JSON health) and `/ws` (WebSocket echo).

## Run

```bash
pnpm go:run          # runs `go run .` via the workspace
# or directly:
go run .
```

## Configure

| Variable          | Default       | Purpose              |
| ----------------- | ------------- | -------------------- |
| `ZENTRAIL_HOST`   | `127.0.0.1`   | Bind host            |
| `ZENTRAIL_PORT`   | `7341`        | Bind port            |
| `ZENTRAIL_ENV`    | `development` | Runtime environment  |
| `ZENTRAIL_DATA_DIR` | `.data`     | SQLite / data dir    |

## Roadmap

- gRPC service definition (`protoc`) for typed frontend/core calls.
- SQLite persistence for workspaces, agents, and memories.
- Event bus bridging WebSocket clients and the Python AI runtime.
