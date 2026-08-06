import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { FileEntry, NotificationPayload } from "./types";
import type { ShellKind, TerminalProfile } from "@zentrail/terminal";
import type {
  GitState,
  GitLogEntry,
  GitBranch,
  GitRemote,
} from "@zentrail/git";
import type {
  Workspace,
  RecentWorkspace,
  WorkspaceSession,
  WorkspaceMemory,
  WorkspaceSettings,
  WorkspaceTemplate,
} from "@zentrail/workspace";

/** True when running inside the Tauri webview (as opposed to a plain browser). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Thin, typed wrapper over `tauri::command` invocations. When not running inside
 * Tauri (e.g. `pnpm dev` in a browser) it transparently falls back to demo data
 * so the UI remains explorable. All cross-layer calls go through here, keeping
 * the channel names in a single place.
 */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return demo<T>(cmd, args);
  return tauriInvoke<T>(cmd, args);
}

export const ipc = {
  ping: (message: string) => invoke<string>("ping", { message }),
  getAppVersion: () =>
    invoke<{ version: string; goCore: string; pythonRt: string }>("get_app_version"),
  readDirectory: (root: string, rel: string) =>
    invoke<FileEntry[]>("read_directory", { root, rel }),
  readTextFile: (root: string, rel: string) =>
    invoke<string>("read_text_file", { root, rel }),
  writeTextFile: (root: string, rel: string, contents: string) =>
    invoke<void>("write_text_file", { root, rel, contents }),
  openFolderDialog: () => invoke<string | null>("open_folder_dialog"),
  setWindowTitle: (title: string) => invoke<void>("set_window_title", { title }),
  notify: (title: string, body: string) =>
    invoke<void>("notify", { title, body }),

  // ---- Phase 3: Integrated Terminal -------------------------------------
  listShells: () => invoke<ShellKind[]>("list_shells"),
  spawnTerminal: (profile: TerminalProfile, cwd: string) =>
    invoke<{ id: string }>("spawn_terminal", { profile, cwd }),
  writeTerminal: (id: string, data: string) =>
    invoke<void>("write_terminal", { id, data }),
  killTerminal: (id: string) => invoke<void>("kill_terminal", { id }),

  // ---- Phase 3: Git -----------------------------------------------------
  gitStatus: (root: string) => invoke<GitState | null>("git_status", { root }),
  gitLog: (root: string, limit: number) =>
    invoke<GitLogEntry[]>("git_log", { root, limit }),
  gitBranches: (root: string) =>
    invoke<{ branches: GitBranch[]; remotes: GitRemote[] }>("git_branches", {
      root,
    }),
  gitStage: (root: string, paths: string[]) =>
    invoke<void>("git_stage", { root, paths }),
  gitUnstage: (root: string, paths: string[]) =>
    invoke<void>("git_unstage", { root, paths }),
  gitCheckout: (root: string, name: string) =>
    invoke<void>("git_checkout", { root, name }),
  gitCommit: (root: string, message: string, all: boolean) =>
    invoke<{ hash: string }>("git_commit", { root, message, all }),
  gitPull: (root: string, remote?: string) =>
    invoke<{ stdout: string }>("git_pull", { root, remote }),
  gitPush: (root: string, remote?: string) =>
    invoke<{ stdout: string }>("git_push", { root, remote }),
  gitMerge: (root: string, branch: string) =>
    invoke<{ stdout: string }>("git_merge", { root, branch }),
  gitInit: (root: string) => invoke<void>("git_init", { root }),

  // ---- Phase 4: Workspace System -----------------------------------------
  listWorkspaces: () => invoke<Workspace[]>("list_workspaces"),
  saveWorkspace: (workspace: Workspace) =>
    invoke<Workspace>("save_workspace", { workspace }),
  deleteWorkspace: (id: string) =>
    invoke<void>("delete_workspace", { id }),
  recentWorkspaces: () => invoke<RecentWorkspace[]>("recent_workspaces"),
  recordRecent: (path: string, name?: string) =>
    invoke<RecentWorkspace>("record_recent", { path, name }),
  removeRecent: (path: string) => invoke<void>("remove_recent", { path }),
  workspaceSessions: (workspaceId: string) =>
    invoke<WorkspaceSession[]>("workspace_sessions", { workspaceId }),
  saveSession: (session: WorkspaceSession) =>
    invoke<WorkspaceSession>("save_session", { session }),
  deleteSession: (id: string) => invoke<void>("delete_session", { id }),
  workspaceMemory: (workspaceId: string) =>
    invoke<WorkspaceMemory>("workspace_memory", { workspaceId }),
  saveMemory: (memory: WorkspaceMemory) =>
    invoke<WorkspaceMemory>("save_memory", { memory }),
  workspaceSettings: (workspaceId: string) =>
    invoke<WorkspaceSettings>("workspace_settings", { workspaceId }),
  saveWorkspaceSettings: (workspaceId: string, patch: Record<string, unknown>) =>
    invoke<WorkspaceSettings>("save_workspace_settings", {
      workspaceId,
      patch,
    }),
  workspaceTemplates: () => invoke<WorkspaceTemplate[]>("workspace_templates"),
  addProject: (workspaceId: string, path: string) =>
    invoke<Workspace>("add_project", { workspaceId, path }),
  createFromTemplate: (
    templateId: string,
    rootPath: string,
    name?: string,
  ) => invoke<Workspace>("create_from_template", { templateId, rootPath, name }),
};

// ---------------------------------------------------------------------------
// Demo mode: keep the shell usable outside the Tauri runtime.
// ---------------------------------------------------------------------------

const DEMO_FILES: FileEntry[] = [
  { name: "src", path: "/demo/src", isDir: true, size: 0 },
  { name: "README.md", path: "/demo/README.md", isDir: false, size: 1280 },
  { name: "package.json", path: "/demo/package.json", isDir: false, size: 640 },
  { name: "tsconfig.json", path: "/demo/tsconfig.json", isDir: false, size: 512 },
];

const DEMO_README = `# Zentrail IDE

This is demo content shown when the app runs outside the Tauri runtime.
Open a real workspace with **File → Open Folder** inside the desktop shell.
`;

const DEMO_GIT_STATUS: GitState = {
  branch: "main",
  detached: false,
  ahead: 2,
  behind: 1,
  changes: [
    { path: "src/app.ts", status: "modified", staged: false },
    { path: "src/ui/button.tsx", status: "added", staged: true },
    { path: "docs/roadmap.md", status: "modified", staged: true },
    { path: "config/legacy.json", status: "deleted", staged: false },
    { path: "experiments/proto.ts", status: "untracked", staged: false },
    { path: "lib/core.ts", status: "renamed", oldPath: "lib/old-core.ts", staged: false },
  ],
};

const DEMO_GIT_LOG: GitLogEntry[] = [
  {
    hash: "9f3c1a7e2b4d5e6f70819a2b3c4d5e6f70819283",
    shortHash: "9f3c1a7",
    author: "Ada Lovelace",
    email: "ada@zentrail.dev",
    date: "2024-08-01T10:24:00Z",
    message: "Add integrated terminal and git panels",
    refs: ["main", "HEAD"],
  },
  {
    hash: "1a2b3c4d5e6f70819a2b3c4d5e6f70819a2b3c4d",
    shortHash: "1a2b3c4",
    author: "Alan Turing",
    email: "alan@zentrail.dev",
    date: "2024-07-30T14:05:00Z",
    message: "Wire workspace manager to the file explorer",
    refs: ["origin/main"],
  },
  {
    hash: "5e6f70819a2b3c4d5e6f70819a2b3c4d5e6f7081",
    shortHash: "5e6f7081",
    author: "Grace Hopper",
    email: "grace@zentrail.dev",
    date: "2024-07-28T09:12:00Z",
    message: "Initial scaffold of the Tauri desktop shell",
    refs: ["v0.1.0"],
  },
];

const DEMO_GIT_BRANCHES = {
  branches: [
    { name: "main", current: true, remote: false, upstream: "origin/main", ahead: 2, behind: 1 },
    { name: "feature/ai-runtime", current: false, remote: false, ahead: 0, behind: 0 },
    { name: "fix/terminal-scroll", current: false, remote: false, ahead: 0, behind: 0 },
  ] as GitBranch[],
  remotes: [
    { name: "origin", fetch: "https://github.com/zentrail/ide.git", push: "https://github.com/zentrail/ide.git" },
  ] as GitRemote[],
};

// In-memory demo registry for the Phase 4 Workspace System. Mirrors the
// on-disk registry maintained by the Rust backend when running in the shell.
const DEMO_WORKSPACES: Workspace[] = [];
const DEMO_RECENTS: RecentWorkspace[] = [];
const DEMO_SESSIONS: WorkspaceSession[] = [];
const DEMO_MEMORY: Record<string, WorkspaceMemory> = {};
const DEMO_SETTINGS: Record<string, WorkspaceSettings> = {};
const DEMO_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "blank",
    name: "Blank Workspace",
    description: "An empty workspace with a README to get you started.",
    projects: ["src"],
    files: [{ path: "README.md", contents: "# Workspace\n\nCreated from the Blank Workspace template.\n" }],
  },
  {
    id: "node-ts",
    name: "Node + TypeScript",
    description: "A minimal Node.js + TypeScript project scaffold.",
    projects: ["src"],
    files: [
      { path: "package.json", contents: '{ "name": "workspace", "version": "0.1.0", "type": "module" }\n' },
      { path: "src/index.ts", contents: 'console.log("Hello from Zentrail IDE");\n' },
    ],
  },
  {
    id: "python",
    name: "Python",
    description: "A Python project with a venv-ready layout.",
    projects: ["src"],
    files: [
      { path: "pyproject.toml", contents: '[project]\nname = "workspace"\nversion = "0.1.0"\n' },
      { path: "src/main.py", contents: 'def main() -> None:\n    print("Hello from Zentrail IDE")\n' },
    ],
  },
  {
    id: "rust-cli",
    name: "Rust CLI",
    description: "A cargo-ready Rust command-line project.",
    projects: ["src"],
    files: [
      { path: "Cargo.toml", contents: '[package]\nname = "workspace"\nversion = "0.1.0"\nedition = "2021"\n' },
      { path: "src/main.rs", contents: 'fn main() {\n    println!("Hello from Zentrail IDE");\n}\n' },
    ],
  },
];

function demo<T>(cmd: string, args?: Record<string, unknown>): T {
  switch (cmd) {
    case "ping":
      return `pong from Zentrail core: ${args?.message ?? ""}` as T;
    case "get_app_version":
      return { version: "0.1.0", goCore: "demo", pythonRt: "demo" } as T;
    case "read_directory":
      return DEMO_FILES as T;
    case "read_text_file":
      return DEMO_README as T;
    case "write_text_file":
      return undefined as T;
    case "open_folder_dialog":
      return null as T;
    case "set_window_title":
      return undefined as T;
    case "notify": {
      const payload: NotificationPayload = {
        title: String(args?.title ?? "Notification"),
        body: String(args?.body ?? ""),
      };
      window.dispatchEvent(new CustomEvent("zentrail://notify", { detail: payload }));
      return undefined as T;
    }
    case "list_shells":
      return ["system", "powershell", "cmd", "git-bash"] as T;
    case "spawn_terminal":
      // In demo mode the real pty lives in the Terminal store, so we echo the
      // profile id back as the session id.
      return { id: String((args?.profile as TerminalProfile)?.id ?? crypto.randomUUID()) } as T;
    case "write_terminal":
      return undefined as T;
    case "kill_terminal":
      return undefined as T;
    case "git_status":
      return DEMO_GIT_STATUS as T;
    case "git_log":
      return DEMO_GIT_LOG as T;
    case "git_branches":
      return DEMO_GIT_BRANCHES as T;
    case "git_stage":
    case "git_unstage":
    case "git_checkout":
    case "git_init":
      return undefined as T;
    case "git_commit":
      return { hash: crypto.randomUUID().replace(/-/g, "").slice(0, 40) } as T;
    case "git_pull":
    case "git_push":
    case "git_merge":
      return { stdout: `demo: ${cmd} completed` } as T;
    case "list_workspaces":
      return [...DEMO_WORKSPACES] as T;
    case "save_workspace": {
      const ws = args?.workspace as Workspace;
      const stored: Workspace = {
        ...ws,
        id: ws.id || crypto.randomUUID(),
        createdAt: ws.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const idx = DEMO_WORKSPACES.findIndex((w) => w.id === stored.id);
      if (idx >= 0) DEMO_WORKSPACES[idx] = stored;
      else DEMO_WORKSPACES.push(stored);
      return stored as T;
    }
    case "delete_workspace": {
      const id = String(args?.id);
      const removed = DEMO_WORKSPACES.find((w) => w.id === id);
      for (let i = DEMO_WORKSPACES.length - 1; i >= 0; i--) {
        if (DEMO_WORKSPACES[i].id === id) DEMO_WORKSPACES.splice(i, 1);
      }
      if (removed) {
        for (let i = DEMO_RECENTS.length - 1; i >= 0; i--) {
          if (DEMO_RECENTS[i].path === removed.rootPath) DEMO_RECENTS.splice(i, 1);
        }
      }
      for (let i = DEMO_SESSIONS.length - 1; i >= 0; i--) {
        if (DEMO_SESSIONS[i].workspaceId === id) DEMO_SESSIONS.splice(i, 1);
      }
      delete DEMO_MEMORY[id];
      delete DEMO_SETTINGS[id];
      return undefined as T;
    }
    case "recent_workspaces":
      return [...DEMO_RECENTS] as T;
    case "record_recent": {
      const path = String(args?.path);
      const name = (args?.name as string | undefined) ?? path.split(/[\\/]/).pop() ?? path;
      const entry: RecentWorkspace = {
        id: `path-${path.length}`,
        path,
        name,
        lastOpenedAt: new Date().toISOString(),
      };
      for (let i = DEMO_RECENTS.length - 1; i >= 0; i--) {
        if (DEMO_RECENTS[i].path === path) DEMO_RECENTS.splice(i, 1);
      }
      DEMO_RECENTS.unshift(entry);
      DEMO_RECENTS.splice(20);
      return entry as T;
    }
    case "remove_recent": {
      const path = String(args?.path);
      for (let i = DEMO_RECENTS.length - 1; i >= 0; i--) {
        if (DEMO_RECENTS[i].path === path) DEMO_RECENTS.splice(i, 1);
      }
      return undefined as T;
    }
    case "workspace_sessions": {
      const id = String(args?.workspaceId);
      return DEMO_SESSIONS.filter((s) => s.workspaceId === id) as T;
    }
    case "save_session": {
      const session = args?.session as WorkspaceSession;
      const stored: WorkspaceSession = {
        ...session,
        id: session.id || crypto.randomUUID(),
        savedAt: new Date().toISOString(),
      };
      const idx = DEMO_SESSIONS.findIndex((s) => s.id === stored.id);
      if (idx >= 0) DEMO_SESSIONS[idx] = stored;
      else DEMO_SESSIONS.push(stored);
      return stored as T;
    }
    case "delete_session": {
      const id = String(args?.id);
      for (let i = DEMO_SESSIONS.length - 1; i >= 0; i--) {
        if (DEMO_SESSIONS[i].id === id) DEMO_SESSIONS.splice(i, 1);
      }
      return undefined as T;
    }
    case "workspace_memory": {
      const id = String(args?.workspaceId);
      return (DEMO_MEMORY[id] ?? { workspaceId: id, entries: [] }) as T;
    }
    case "save_memory": {
      const memory = args?.memory as WorkspaceMemory;
      DEMO_MEMORY[memory.workspaceId] = memory;
      return memory as T;
    }
    case "workspace_settings": {
      const id = String(args?.workspaceId);
      return (
        DEMO_SETTINGS[id] ?? {
          workspaceId: id,
          preferredTerminal: "system",
          defaultSkillTab: "files",
          ignorePatterns: ["node_modules", "target", "dist", ".git"],
        }
      ) as T;
    }
    case "save_workspace_settings": {
      const id = String(args?.workspaceId);
      const patch = (args?.patch as Record<string, unknown>) ?? {};
      const current = DEMO_SETTINGS[id] ?? {
        workspaceId: id,
        preferredTerminal: "system",
        defaultSkillTab: "files",
        ignorePatterns: ["node_modules", "target", "dist", ".git"],
      };
      const merged = {
        ...current,
        workspaceId: id,
        preferredTerminal:
          (patch.preferredTerminal as string) ?? current.preferredTerminal,
        defaultSkillTab:
          (patch.defaultSkillTab as string) ?? current.defaultSkillTab,
        ignorePatterns:
          (patch.ignorePatterns as string[]) ?? current.ignorePatterns,
      } as WorkspaceSettings;
      DEMO_SETTINGS[id] = merged;
      return merged as T;
    }
    case "workspace_templates":
      return DEMO_TEMPLATES as T;
    case "add_project": {
      const id = String(args?.workspaceId);
      const path = String(args?.path);
      const ws = DEMO_WORKSPACES.find((w) => w.id === id);
      if (!ws) throw new Error("workspace not found");
      if (!ws.projects.some((p) => p.path === path)) {
        ws.projects.push({ path, name: path.split(/[\\/]/).pop() ?? path });
      }
      return ws as T;
    }
    case "create_from_template": {
      const templateId = String(args?.templateId);
      const rootPath = String(args?.rootPath);
      const name = args?.name as string | undefined;
      const template = DEMO_TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new Error("template not found");
      const ws: Workspace = {
        id: crypto.randomUUID(),
        name: name || template.name,
        rootPath,
        projects: template.projects.map((p) => ({
          path: `${rootPath.replace(/[\\/]+$/, "")}/${p}`,
          name: p,
        })),
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DEMO_WORKSPACES.push(ws);
      return ws as T;
    }
    default:
      throw new Error(`Unknown demo command: ${cmd}`);
  }
}
