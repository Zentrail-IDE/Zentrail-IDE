# Zentrail IDE

> **AI-native desktop development environment** — Phase 2: Core IDE

Zentrail IDE combines a modern code editor, integrated AI agents, intelligent
automation, Git operations, and real-time collaboration into a single workspace.
The platform is optimized for high performance using **Go** as the core runtime,
**TypeScript** for the desktop UI, and **Python** for AI orchestration.

This repository currently contains the **Phase 1 — Foundation** scaffold: the
monorepo layout, development environment, Tauri desktop shell, Go core service,
Python AI runtime, shared TypeScript packages, the configuration system, and the
build system.

---

## Architecture

| Layer       | Technology                          | Path                 |
| ----------- | ----------------------------------- | -------------------- |
| Desktop UI  | Tauri v2 · React · TypeScript · Vite | `apps/desktop`       |
| Go Core     | Go · gRPC · WebSocket · SQLite      | `backend/go-core`    |
| Python RT   | Python · MCP · LangGraph            | `runtime/python`     |
| TS Packages | TypeScript shared libraries         | `packages/*`         |

```
zentrail/
├── apps/
│   └── desktop/            # Tauri v2 + React + Vite frontend
├── backend/
│   └── go-core/            # Go core service (gRPC + WebSocket)
├── runtime/
│   └── python/             # Python AI runtime
├── packages/
│   ├── ui/                 # Shared UI primitives (design system)
│   ├── editor/             # Monaco editor integration
│   ├── workspace/          # Workspace manager
│   ├── terminal/           # Terminal integration
│   ├── git/                # Git integration
│   ├── settings/           # Configuration system
│   ├── skill/              # Skill system
│   └── agent/              # Agent system
├── configs/                # Shared configuration presets
├── scripts/                # Dev / build tooling
└── skills/                 # Agent skills (incl. desktop-dev-use)
```

See `ZentrailIDE.md` for the full vision, `Task-Zentrail.md` for the roadmap,
and `DESIGN-SYSTEM.md` for the visual language.

---

## Prerequisites

- **Node.js** >= 20.11 and **pnpm** >= 9
- **Rust** toolchain (stable) + the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- **Go** >= 1.22
- **Python** >= 3.11

---

## Getting started

```bash
# Install workspace dependencies
pnpm install

# Run the desktop app (Tauri dev window)
pnpm dev

# Run the Go core service
pnpm go:run

# Run the Python AI runtime
pnpm py:run
```

Other commands:

```bash
pnpm build            # Build every package
pnpm tauri            # Forwarded Tauri CLI (build / icon / android / ios)
pnpm lint             # Lint every package
pnpm typecheck        # Type-check every package
pnpm test             # Run every package's tests
```

## License

MIT
