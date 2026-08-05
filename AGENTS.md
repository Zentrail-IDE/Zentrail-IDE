# AGENTS.md

Guidance for AI agents working in the Zentrail IDE monorepo.

## Repository layout

This is a **pnpm workspace** monorepo. The desktop application is composed of
three independent layers plus shared TypeScript packages:

- `apps/desktop` — Tauri v2 + React + TypeScript + Vite (the UI shell).
- `backend/go-core` — Go core service (gRPC + WebSocket + SQLite).
- `runtime/python` — Python AI runtime (MCP + LangGraph).
- `packages/*` — shared TS libraries (`ui`, `editor`, `workspace`,
  `terminal`, `git`, `settings`, `skill`, `agent`).

## Agent rules

1. **One layer per change.** Do not put Go logic in the frontend or UI logic in
   `go-core`. Cross-layer work must go through well-defined IPC boundaries.
2. **Use pnpm workspaces.** Add new packages with a `package.json` and a
   `tsconfig.json` extending the root `tsconfig.base.json`, and register the
   directory in `pnpm-workspace.yaml`.
3. **TypeScript is strict.** `noUnusedLocals`, `noUnusedParameters`, and
   `isolatedModules` are enforced by `tsconfig.base.json`.
4. **Follow the design system** (`DESIGN-SYSTEM.md`): Minimal/Modern, Ocean Blue
   accent, Lucide icons, 4px spacing grid, rounded components, dark-first.
5. **Centralize configuration** in `configs/` and `packages/settings`. Never
   hard-code ports, paths, or theme tokens in app code.
6. **Cross-platform first.** Tauri targets macOS/Windows/Linux. Guard
   platform-specific APIs behind capability checks.

## Build & verify

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Desktop-only flows use `pnpm dev` / `pnpm tauri`. The Go core uses
`pnpm go:run`; the Python runtime uses `pnpm py:run`.

## Conventions

- Feature code lives under `src/` within each package; `index.ts` is the public
  entry point.
- Keep PRs scoped to a single layer unless the task explicitly spans a boundary.
- IPC channel names must be shared, typed literals between Rust and TS.
