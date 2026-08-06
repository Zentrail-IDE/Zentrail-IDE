/**
 * Workspace domain models for the Phase 4 Workspace System.
 *
 * Pure, framework-agnostic types and helpers shared between the desktop UI and
 * the Tauri backend. No React, DOM, Tauri, or Node imports belong here — keep
 * this package portable so it can be unit-tested in isolation and reused by the
 * Rust layer after a serde round-trip.
 *
 * The Phase 4 feature set covered here:
 *  - Workspace Manager        (Workspace + lifecycle)
 *  - Workspace Sessions       (named, restorable editor sessions)
 *  - Workspace Memory         (key/value notes per workspace)
 *  - Workspace Settings       (workspace-scoped overrides)
 *  - Multi-project support    (a workspace owns several project folders)
 *  - Recent Workspaces        (a most-recently-used list)
 *  - Workspace Templates      (scaffolding presets)
 */

/** A folder that belongs to a workspace. Enables multi-project workspaces. */
export interface WorkspaceProject {
  /** Absolute path on disk. */
  path: string;
  /** Display name (defaults to the last path segment). */
  name: string;
}

/** A persisted, named workspace the user can open and switch between. */
export interface Workspace {
  id: string;
  name: string;
  /** Canonical root path of the workspace. */
  rootPath: string;
  /** Additional project folders contained in this workspace. */
  projects: WorkspaceProject[];
  /** Pinned workspaces sort before the rest and survive LRU trimming. */
  pinned: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string;
}

/** A lightweight entry in the most-recently-used workspace list. */
export interface RecentWorkspace {
  /** Mirrors the workspace id when known, otherwise a stable hash of the path. */
  id: string;
  path: string;
  name: string;
  /** ISO-8601 timestamp of the last open. */
  lastOpenedAt: string;
}

/** A restorable editor session bound to a workspace. */
export interface WorkspaceSession {
  id: string;
  workspaceId: string;
  name: string;
  /** Absolute paths of the tabs that were open when the session was saved. */
  openTabs: string[];
  /** The active tab path, or null when none. */
  activeTab: string | null;
  /** ISO-8601 save timestamp. */
  savedAt: string;
}

/** A single key/value memory entry attached to a workspace. */
export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string;
}

/** The full memory store for a single workspace. */
export interface WorkspaceMemory {
  workspaceId: string;
  entries: MemoryEntry[];
}

/** Terminal kind re-used from the workspace settings contract. */
export type WorkspaceTerminal =
  | "system"
  | "powershell"
  | "cmd"
  | "git-bash";

/** Workspace-scoped settings that override the global defaults. */
export interface WorkspaceSettings {
  workspaceId: string;
  preferredTerminal: WorkspaceTerminal;
  defaultSkillTab: "files" | "info";
  /** Glob/segment patterns ignored by search and indexing. */
  ignorePatterns: string[];
}

/** A single file emitted when scaffolding from a template. */
export interface WorkspaceTemplateFile {
  /** Workspace-relative path. */
  path: string;
  contents: string;
}

/** A reusable preset that scaffolds a fresh workspace. */
export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  /** Suggested project folder names created under the chosen root. */
  projects: string[];
  files: WorkspaceTemplateFile[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Current time as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Derive a human-friendly workspace name from its root path. */
export function workspaceNameFromPath(rootPath: string): string {
  const cleaned = rootPath.replace(/[\\/]+$/, "");
  const parts = cleaned.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : cleaned || "Untitled";
}

/** Build a stable id for a path when no real workspace id exists yet. */
export function pathId(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = (hash << 5) - hash + path.charCodeAt(i);
    hash |= 0;
  }
  return `path-${Math.abs(hash).toString(36)}`;
}

/** Construct a new workspace from a root path. */
export function createWorkspace(
  rootPath: string,
  name?: string,
  projects: WorkspaceProject[] = [],
): Workspace {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || workspaceNameFromPath(rootPath),
    rootPath,
    projects,
    pinned: false,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Construct a project entry, defaulting the name to the last path segment. */
export function createProject(path: string, name?: string): WorkspaceProject {
  return { path, name: name?.trim() || workspaceNameFromPath(path) };
}

/** Return a copy of `ws` with `updatedAt` refreshed to now. */
export function touchWorkspace(ws: Workspace): Workspace {
  return { ...ws, updatedAt: nowIso() };
}

/** Add (or replace, by path) a project folder to a workspace. */
export function addProjectToWorkspace(
  ws: Workspace,
  path: string,
  name?: string,
): Workspace {
  const project = createProject(path, name);
  const others = ws.projects.filter((p) => p.path !== project.path);
  return touchWorkspace({ ...ws, projects: [...others, project] });
}

/** Remove a project folder (by path) from a workspace. */
export function removeProjectFromWorkspace(
  ws: Workspace,
  path: string,
): Workspace {
  return touchWorkspace({
    ...ws,
    projects: ws.projects.filter((p) => p.path !== path),
  });
}

// --- Multi-project helpers -------------------------------------------------

/** All root paths that belong to a workspace (root + declared projects). */
export function workspacePaths(ws: Workspace): string[] {
  const roots = new Set<string>([ws.rootPath, ...ws.projects.map((p) => p.path)]);
  return [...roots];
}

// --- Recent workspaces -----------------------------------------------------

/** Insert or refresh a recent entry, most-recent first. */
export function upsertRecent(
  recents: RecentWorkspace[],
  path: string,
  name?: string,
  limit = 20,
): RecentWorkspace[] {
  const id = pathId(path);
  const ts = nowIso();
  const existing = recents.find((r) => r.path === path);
  const entry: RecentWorkspace = existing
    ? { ...existing, name: name ?? existing.name, lastOpenedAt: ts }
    : { id, path, name: name ?? workspaceNameFromPath(path), lastOpenedAt: ts };
  const rest = recents.filter((r) => r.path !== path);
  return [entry, ...rest].slice(0, limit);
}

/** Sort recents by recency (newest first). */
export function sortByRecent(recents: RecentWorkspace[]): RecentWorkspace[] {
  return [...recents].sort(
    (a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt),
  );
}

/** Remove a path from the recent list. */
export function removeRecent(
  recents: RecentWorkspace[],
  path: string,
): RecentWorkspace[] {
  return recents.filter((r) => r.path !== path);
}

// --- Sessions --------------------------------------------------------------

/** Build a new workspace session. */
export function createSession(
  workspaceId: string,
  name: string,
  openTabs: string[],
  activeTab: string | null = null,
): WorkspaceSession {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    name: name.trim() || "Session",
    openTabs,
    activeTab,
    savedAt: nowIso(),
  };
}

/** Upsert a session into a list, replacing by id. */
export function upsertSession(
  sessions: WorkspaceSession[],
  session: WorkspaceSession,
): WorkspaceSession[] {
  const rest = sessions.filter((s) => s.id !== session.id);
  return [session, ...rest].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Keep only the sessions that belong to a given workspace. */
export function sessionsForWorkspace(
  sessions: WorkspaceSession[],
  workspaceId: string,
): WorkspaceSession[] {
  return sessions
    .filter((s) => s.workspaceId === workspaceId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// --- Memory ----------------------------------------------------------------

/** Create an empty memory store for a workspace. */
export function emptyMemory(workspaceId: string): WorkspaceMemory {
  return { workspaceId, entries: [] };
}

/** Set (or update) a memory entry by key, returning a new store. */
export function setMemoryEntry(
  memory: WorkspaceMemory,
  key: string,
  value: string,
): WorkspaceMemory {
  const trimmedKey = key.trim();
  if (!trimmedKey) return memory;
  const ts = nowIso();
  const existing = memory.entries.find((e) => e.key === trimmedKey);
  const entry: MemoryEntry = existing
    ? { ...existing, value, updatedAt: ts }
    : { id: crypto.randomUUID(), key: trimmedKey, value, updatedAt: ts };
  const rest = memory.entries.filter((e) => e.key !== trimmedKey);
  return { ...memory, entries: [...rest, entry].sort((a, b) => a.key.localeCompare(b.key)) };
}

/** Remove a memory entry by id, returning a new store. */
export function removeMemoryEntry(
  memory: WorkspaceMemory,
  id: string,
): WorkspaceMemory {
  return { ...memory, entries: memory.entries.filter((e) => e.id !== id) };
}

/** Look up a memory value by key. */
export function getMemoryValue(
  memory: WorkspaceMemory,
  key: string,
): string | undefined {
  return memory.entries.find((e) => e.key === key)?.value;
}

// --- Settings --------------------------------------------------------------

/** Build the default workspace settings for a workspace id. */
export function defaultWorkspaceSettings(
  workspaceId: string,
): WorkspaceSettings {
  return {
    workspaceId,
    preferredTerminal: "system",
    defaultSkillTab: "files",
    ignorePatterns: ["node_modules", "target", "dist", ".git"],
  };
}

/** Merge a partial patch over the current workspace settings. */
export function mergeWorkspaceSettings(
  current: WorkspaceSettings,
  patch: Partial<WorkspaceSettings>,
): WorkspaceSettings {
  return { ...current, ...patch, workspaceId: current.workspaceId };
}

// --- Templates -------------------------------------------------------------

/** The built-in templates shipped with Zentrail IDE. */
export function defaultTemplates(): WorkspaceTemplate[] {
  return [
    {
      id: "blank",
      name: "Blank Workspace",
      description: "An empty workspace with a README to get you started.",
      projects: ["src"],
      files: [
        {
          path: "README.md",
          contents:
            "# Workspace\n\nCreated from the Blank Workspace template.\n",
        },
      ],
    },
    {
      id: "node-ts",
      name: "Node + TypeScript",
      description: "A minimal Node.js + TypeScript project scaffold.",
      projects: ["src"],
      files: [
        {
          path: "package.json",
          contents:
            '{\n  "name": "workspace",\n  "version": "0.1.0",\n  "type": "module",\n  "scripts": { "start": "node dist/index.js" }\n}\n',
        },
        {
          path: "tsconfig.json",
          contents:
            '{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "strict": true } }\n',
        },
        {
          path: "src/index.ts",
          contents: 'console.log("Hello from Zentrail IDE");\n',
        },
      ],
    },
    {
      id: "python",
      name: "Python",
      description: "A Python project with a venv-ready layout.",
      projects: ["src"],
      files: [
        {
          path: "pyproject.toml",
          contents:
            '[project]\nname = "workspace"\nversion = "0.1.0"\nrequires-python = ">=3.10"\n',
        },
        {
          path: "src/main.py",
          contents: 'def main() -> None:\n    print("Hello from Zentrail IDE")\n\n\nif __name__ == "__main__":\n    main()\n',
        },
      ],
    },
    {
      id: "rust-cli",
      name: "Rust CLI",
      description: "A cargo-ready Rust command-line project.",
      projects: ["src"],
      files: [
        {
          path: "Cargo.toml",
          contents:
            '[package]\nname = "workspace"\nversion = "0.1.0"\nedition = "2021"\n',
        },
        {
          path: "src/main.rs",
          contents: 'fn main() {\n    println!("Hello from Zentrail IDE");\n}\n',
        },
      ],
    },
  ];
}

/** Find a template by id. */
export function findTemplate(
  templates: WorkspaceTemplate[],
  id: string,
): WorkspaceTemplate | undefined {
  return templates.find((t) => t.id === id);
}

/** Build a workspace from a template rooted at `rootPath`. */
export function createFromTemplate(
  template: WorkspaceTemplate,
  rootPath: string,
  name?: string,
): Workspace {
  const projects = template.projects.map((p) =>
    createProject(`${rootPath.replace(/[\\/]+$/, "")}/${p}`, p),
  );
  return createWorkspace(rootPath, name ?? template.name, projects);
}
