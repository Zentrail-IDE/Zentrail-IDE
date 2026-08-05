import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { FileEntry, NotificationPayload } from "./types";
import type { ShellKind, TerminalProfile } from "@zentrail/terminal";
import type {
  GitState,
  GitLogEntry,
  GitBranch,
  GitRemote,
} from "@zentrail/git";

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
    default:
      throw new Error(`Unknown demo command: ${cmd}`);
  }
}
