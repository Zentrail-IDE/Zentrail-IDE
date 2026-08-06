---
name: desktop-dev-use
description: Scaffold, configure, and build the Zentrail IDE desktop application — a Tauri v2 + React + TypeScript frontend, a Go core backend, and a Python AI runtime. Use when initializing the monorepo, setting up Tauri/Go/Python, wiring IPC, or extending Phase 1 Foundation of Zentrail IDE.
---

# Desktop Dev Use

This skill owns the **desktop application** layer of Zentrail IDE and is the
primary driver for **Phase 1 — Foundation** work. It scaffolds and maintains a
pnpm monorepo composed of:

| Layer        | Tech                                        | Location              |
| ------------ | ------------------------------------------- | --------------------- |
| Desktop UI   | Tauri v2 + React + TypeScript + Vite        | `apps/desktop`        |
| Go Core      | Go + gRPC + WebSocket                       | `backend/go-core`     |
| Python RT    | Python + MCP + LangGraph                    | `runtime/python`      |
| TS packages  | TypeScript shared libraries                 | `packages/*`          |

## When to use

- Bootstrap the project (Phase 1 Foundation): repo structure, dev environment,
  build system, configuration system.
- Add or modify the Tauri desktop shell, window, or menu.
- Wire the React/TS frontend to the Go core over IPC (Tauri commands / events).
- Extend shared `packages/` (ui, editor, workspace, terminal, git, settings,
  skill, agent).
- Integrate the Python AI runtime as a sidecar/child process.

## Hard rules

- **One layer per change.** Keep `apps/desktop` (TS) free of Go/Python logic;
  keep `backend/go-core` free of UI logic.
- **Configuration is centralized** in `configs/` and `packages/settings`; never
  hard-code ports, paths, or theme tokens in app code.
- **Follow the design system** (`DESIGN-SYSTEM.md`): Minimal/Modern, Ocean Blue
  accent, Lucide icons, 4px spacing grid, rounded components, dark-first.
- **Monorepo = pnpm workspaces.** New packages must declare a `package.json`, a
  `tsconfig.json` extending `tsconfig.base.json`, and register in
  `pnpm-workspace.yaml`.
- **Cross-platform from day one.** Tauri targets macOS/Windows/Linux; avoid
  Windows-only or POSIX-only APIs in shared code without a capability guard.

## Phase 1 Foundation checklist (source of truth: `Task-Zentrail.md`)

1. [x] Project initialization (pnpm workspace root)
2. [x] Repository structure (`apps/`, `backend/`, `runtime/`, `packages/`, …)
3. [x] Development environment (`.editorconfig`, `.gitignore`, scripts)
4. [x] Tauri Desktop setup (`apps/desktop/src-tauri`)
5. [x] Go Core initialization (`backend/go-core`)
6. [x] TypeScript UI setup (`apps/desktop` + `packages/ui`)
7. [x] Python Runtime setup (`runtime/python`)
8. [x] Configuration system (`configs/` + `packages/settings`)
9. [x] Build system (workspace scripts + Tauri/Go/Python build targets)

## Phase 3 — Terminal & Git checklist (source of truth: `Task-Zentrail.md`)

1. [x] Integrated Terminal dock (`apps/desktop/src/components/Terminal.tsx`)
2. [x] Terminal profiles: System / PowerShell / CMD / Git Bash (`packages/terminal`)
3. [x] Multi-session tabs with spawn / write / kill over IPC (`state/terminalStore.ts`)
4. [x] Rust terminal backend spawning real shells via `tauri-plugin-shell`
     (`src-tauri/src/commands/terminal.rs`, events `zentrail://terminal-output`)
5. [x] Git sidebar panel: status, staging, commit (`apps/desktop/src/components/GitPanel.tsx`)
6. [x] Git history / log view (`packages/git` + `GitPanel` history list)
7. [x] Branch management: list / checkout / merge (`state/gitStore.ts`)
8. [x] Pull & Push & Sync with ahead/behind indicators (`ipc.ts` + `commands/git.rs`)
9. [x] IPC contract with browser demo fallback (`apps/desktop/src/lib/ipc.ts`)

## Phase 4 — Workspace System checklist (source of truth: `Task-Zentrail.md`)

1. [x] Workspace domain models + helpers + unit tests (`packages/workspace/src/index.ts`, `src/index.test.ts`)
2. [x] Workspace Manager store: workspaces, sessions, memory, settings, recents (`apps/desktop/src/state/workspaceStore.ts`)
3. [x] Multi-project support: per-workspace project folders (`packages/workspace` `WorkspaceProject`)
4. [x] Workspace Sessions: save / restore editor sessions (`workspaceStore.saveSession` / `switchSession`)
5. [x] Workspace Memory: key/value notes per workspace (`packages/workspace` `WorkspaceMemory`)
6. [x] Workspace Settings: workspace-scoped overrides (`packages/workspace` `WorkspaceSettings`)
7. [x] Recent Workspaces: MRU list with open / remove (`workspaceStore.openRecent` / `removeRecent`)
8. [x] Workspace Templates: scaffold presets (`packages/workspace` `defaultTemplates`)
9. [x] Workspace panel UI in the activity sidebar (`apps/desktop/src/components/WorkspacePanel.tsx`)
10. [x] Activity bar + sidebar wiring for the Workspace view (`ActivityBar.tsx`, `Sidebar.tsx`)
11. [x] Command palette: open workspace / recents / templates (`CommandPalette.tsx`)
12. [x] Rust persistence backend (registry in app config dir) (`src-tauri/src/commands/workspace.rs`)
13. [x] IPC contract + browser demo fallback for all workspace commands (`apps/desktop/src/lib/ipc.ts`)

## Conventions

- TypeScript strict mode everywhere; `tsconfig.base.json` owns the shared
  compiler options.
- Feature code lives under `src/` within each package; `index.ts` is the public
  entry point.
- IPC channel names are string literals shared between Rust and TS via a
  generated/ typed contract in `packages/shared-ipc` (added in a later phase).
- Keep PRs scoped to a single layer; the skill should not produce mixed
  frontend/backend diffs unless the task explicitly spans the boundary.
