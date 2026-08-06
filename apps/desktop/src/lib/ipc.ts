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
import type {
  AiModel,
  ProviderCredential,
  Conversation,
  ChatRequest,
  PromptTemplate,
} from "@zentrail/ai";
import type {
  AgentConfig,
  AgentInstance,
  AgentMessage,
  AgentMessageKind,
  AgentSchedule,
  AgentMemoryEntry,
  BackgroundAgentRun,
  AgentMetrics,
} from "@zentrail/agent";

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

  // ---- Phase 5: AI Runtime -----------------------------------------------
  aiListModels: () => invoke<AiModel[]>("ai_list_models"),
  aiSaveModel: (model: AiModel) =>
    invoke<AiModel>("ai_save_model", { model }),
  aiDeleteModel: (id: string) => invoke<void>("ai_delete_model", { id }),
  aiListCredentials: () => invoke<ProviderCredential[]>("ai_list_credentials"),
  aiSaveCredential: (cred: ProviderCredential) =>
    invoke<ProviderCredential>("ai_save_credential", { cred }),
  aiDeleteCredential: (id: string) =>
    invoke<void>("ai_delete_credential", { id }),
  aiListConversations: () => invoke<Conversation[]>("ai_list_conversations"),
  aiSaveConversation: (conv: Conversation) =>
    invoke<Conversation>("ai_save_conversation", { conv }),
  aiDeleteConversation: (id: string) =>
    invoke<void>("ai_delete_conversation", { id }),
  aiChatStream: (request: ChatRequest) =>
    invoke<unknown[]>("ai_chat_stream", { request }),
  aiListTemplates: () => invoke<PromptTemplate[]>("ai_list_templates"),
  aiSaveTemplate: (template: PromptTemplate) =>
    invoke<PromptTemplate>("ai_save_template", { template }),
  aiDeleteTemplate: (id: string) =>
    invoke<void>("ai_delete_template", { id }),

  // ---- Phase 6: Workspace Agent -------------------------------------------
  agentListAgents: () => invoke<AgentConfig[]>("agent_list_agents"),
  agentSaveAgent: (agent: AgentConfig) =>
    invoke<AgentConfig>("agent_save_agent", { agent }),
  agentDeleteAgent: (id: string) =>
    invoke<void>("agent_delete_agent", { id }),
  agentListInstances: () => invoke<AgentInstance[]>("agent_list_instances"),
  agentStart: (id: string) => invoke<AgentInstance>("agent_start", { agentId: id }),
  agentStop: (id: string) => invoke<AgentInstance>("agent_stop", { agentId: id }),
  agentPause: (id: string) => invoke<AgentInstance>("agent_pause", { agentId: id }),
  agentResume: (id: string) => invoke<AgentInstance>("agent_resume", { agentId: id }),
  agentSendMessage: (
    fromAgentId: string,
    toAgentId: string | null,
    kind: string,
    content: string,
  ) =>
    invoke<AgentMessage>("agent_send_message", {
      fromAgentId,
      toAgentId,
      kind,
      content,
    }),
  agentBroadcast: (fromAgentId: string, content: string) =>
    invoke<AgentMessage>("agent_broadcast", {
      fromAgentId,
      content,
    }),
  agentListMessages: (agentId?: string) =>
    invoke<AgentMessage[]>("agent_list_messages", { agentId }),
  agentScheduleTask: (schedule: AgentSchedule) =>
    invoke<AgentSchedule>("agent_schedule_task", { schedule }),
  agentListSchedules: (agentId?: string) =>
    invoke<AgentSchedule[]>("agent_list_schedules", { agentId }),
  agentCancelSchedule: (id: string) =>
    invoke<void>("agent_cancel_schedule", { id }),
  agentRunSchedule: (id: string) =>
    invoke<AgentSchedule>("agent_run_schedule", { id }),
  agentGetMemory: (agentId: string) =>
    invoke<AgentMemoryEntry[]>("agent_get_memory", { agentId }),
  agentSaveMemory: (entry: AgentMemoryEntry) =>
    invoke<AgentMemoryEntry>("agent_save_memory", { entry }),
  agentDeleteMemory: (id: string) =>
    invoke<void>("agent_delete_memory", { id }),
  agentStartBackground: (agentId: string, task: string) =>
    invoke<BackgroundAgentRun>("agent_start_background", { agentId, task }),
  agentListBackground: (agentId?: string) =>
    invoke<BackgroundAgentRun[]>("agent_list_background", { agentId }),
  agentGetMetrics: (agentId: string) =>
    invoke<AgentMetrics>("agent_get_metrics", { agentId }),
  agentGetAllMetrics: () => invoke<AgentMetrics[]>("agent_get_all_metrics"),
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

// Phase 5: AI Runtime demo data
const DEMO_AI_MODELS: AiModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    origin: "cloud",
    modelId: "gpt-4o",
    contextWindow: 128000,
    capabilities: ["chat", "code", "vision", "function-calling", "streaming"],
    enabled: true,
    createdAt: "2024-08-01T00:00:00Z",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    origin: "cloud",
    modelId: "claude-sonnet-4-20250514",
    contextWindow: 200000,
    capabilities: ["chat", "code", "vision", "function-calling", "streaming"],
    enabled: true,
    createdAt: "2024-08-01T00:00:00Z",
  },
  {
    id: "llama3.1",
    name: "Llama 3.1 8B",
    provider: "ollama",
    origin: "local",
    modelId: "llama3.1:8b",
    contextWindow: 128000,
    capabilities: ["chat", "code", "streaming"],
    enabled: true,
    createdAt: "2024-08-01T00:00:00Z",
  },
  {
    id: "codellama",
    name: "CodeLlama 13B",
    provider: "ollama",
    origin: "local",
    modelId: "codellama:13b",
    contextWindow: 16000,
    capabilities: ["chat", "code", "completion", "streaming"],
    enabled: false,
    createdAt: "2024-08-01T00:00:00Z",
  },
];

const DEMO_AI_CREDENTIALS: ProviderCredential[] = [
  {
    id: "cred-openai",
    provider: "openai",
    label: "OpenAI API",
    apiKey: "sk-...demo",
    createdAt: "2024-08-01T00:00:00Z",
  },
];

const DEMO_AI_CONVERSATIONS: Conversation[] = [];
const DEMO_AI_TEMPLATES: PromptTemplate[] = [];
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

// Phase 6: Workspace Agent demo registries (mirror the on-disk registry).
const DEMO_AGENTS: AgentConfig[] = [
  {
    id: "manager-agent",
    name: "Manager Agent",
    role: "planner",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    command: "claude",
    color: "#f59e0b",
    icon: "🧠",
    description: "Coordinates multi-agent workflows",
    tags: ["orchestration"],
    autoStart: false,
    maxConcurrent: 2,
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "coding-agent",
    name: "Coding Agent",
    role: "coder",
    provider: "openai",
    model: "gpt-4o",
    command: "codex",
    color: "#10b981",
    icon: "💻",
    description: "Implements features and fixes",
    tags: ["implementation"],
    autoStart: false,
    maxConcurrent: 1,
    priority: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "review-agent",
    name: "Review Agent",
    role: "reviewer",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    command: "claude",
    color: "#60a5fa",
    icon: "🔍",
    description: "Reviews code changes",
    tags: ["quality"],
    autoStart: false,
    maxConcurrent: 1,
    priority: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_INSTANCES: AgentInstance[] = [];
const DEMO_MESSAGES: AgentMessage[] = [];
const DEMO_SCHEDULES: AgentSchedule[] = [];
const DEMO_AGENT_MEMORY: AgentMemoryEntry[] = [];
const DEMO_BACKGROUND: BackgroundAgentRun[] = [];
const DEMO_METRICS: Record<string, AgentMetrics> = {};

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
    // ---- Phase 5: AI Runtime demo handlers --------------------------------
    case "ai_list_models":
      return DEMO_AI_MODELS as T;
    case "ai_save_model": {
      const model = args?.model as AiModel;
      const idx = DEMO_AI_MODELS.findIndex((m) => m.id === model.id);
      if (idx >= 0) DEMO_AI_MODELS[idx] = model;
      else DEMO_AI_MODELS.push(model);
      return model as T;
    }
    case "ai_delete_model": {
      const id = String(args?.id);
      const mi = DEMO_AI_MODELS.findIndex((m) => m.id === id);
      if (mi >= 0) DEMO_AI_MODELS.splice(mi, 1);
      return undefined as T;
    }
    case "ai_list_credentials":
      return DEMO_AI_CREDENTIALS as T;
    case "ai_save_credential": {
      const cred = args?.cred as ProviderCredential;
      const ci = DEMO_AI_CREDENTIALS.findIndex((c) => c.id === cred.id);
      if (ci >= 0) DEMO_AI_CREDENTIALS[ci] = cred;
      else DEMO_AI_CREDENTIALS.push(cred);
      return cred as T;
    }
    case "ai_delete_credential": {
      const cid = String(args?.id);
      const di = DEMO_AI_CREDENTIALS.findIndex((c) => c.id === cid);
      if (di >= 0) DEMO_AI_CREDENTIALS.splice(di, 1);
      return undefined as T;
    }
    case "ai_list_conversations":
      return [...DEMO_AI_CONVERSATIONS] as T;
    case "ai_save_conversation": {
      const conv = args?.conv as Conversation;
      const xi = DEMO_AI_CONVERSATIONS.findIndex((c) => c.id === conv.id);
      if (xi >= 0) DEMO_AI_CONVERSATIONS[xi] = conv;
      else DEMO_AI_CONVERSATIONS.unshift(conv);
      return conv as T;
    }
    case "ai_delete_conversation": {
      const eid = String(args?.id);
      const ei = DEMO_AI_CONVERSATIONS.findIndex((c) => c.id === eid);
      if (ei >= 0) DEMO_AI_CONVERSATIONS.splice(ei, 1);
      return undefined as T;
    }
    case "ai_chat_stream": {
      // Simulate a streaming response with word-by-word delivery
      const req = args?.request as ChatRequest;
      const lastMsg = req.messages[req.messages.length - 1];
      const userText = lastMsg?.content ?? "";
      const responseText = `I'm a demo AI assistant running in Zentrail IDE. You said: "${userText.slice(0, 100)}". In production, this would be a real response from the ${req.modelId} model via the configured API provider. The streaming would deliver tokens in real-time for a smooth chat experience.`;
      const words = responseText.split(" ");
      const chunks: Array<{ conversationId: string; messageId: string; delta: string; done: boolean }> = [];
      for (let i = 0; i < words.length; i++) {
        chunks.push({
          conversationId: "demo-conv",
          messageId: "demo-msg",
          delta: (i === 0 ? "" : " ") + words[i],
          done: i === words.length - 1,
        });
      }
      // Return chunks wrapped in an async iterator pattern
      return (async function* () {
        for (const chunk of chunks) {
          await new Promise((r) => setTimeout(r, 30));
          yield chunk;
        }
      })() as T;
    }
    case "ai_list_templates":
      return DEMO_AI_TEMPLATES as T;
    case "ai_save_template": {
      const template = args?.template as PromptTemplate;
      const ti = DEMO_AI_TEMPLATES.findIndex((t) => t.id === template.id);
      if (ti >= 0) DEMO_AI_TEMPLATES[ti] = template;
      else DEMO_AI_TEMPLATES.push(template);
      return template as T;
    }
    case "ai_delete_template": {
      const tid = String(args?.id);
      const tdi = DEMO_AI_TEMPLATES.findIndex((t) => t.id === tid);
      if (tdi >= 0) DEMO_AI_TEMPLATES.splice(tdi, 1);
      return undefined as T;
    }

    // ---- Phase 6: Workspace Agent demo handlers ---------------------------
    case "agent_list_agents":
      return [...DEMO_AGENTS] as T;
    case "agent_save_agent": {
      const agent = args?.agent as AgentConfig;
      const idx = DEMO_AGENTS.findIndex((a) => a.id === agent.id);
      const stored: AgentConfig = {
        ...agent,
        id: agent.id || crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) DEMO_AGENTS[idx] = stored;
      else DEMO_AGENTS.push(stored);
      return stored as T;
    }
    case "agent_delete_agent": {
      const id = String(args?.id);
      for (let i = DEMO_AGENTS.length - 1; i >= 0; i--) {
        if (DEMO_AGENTS[i].id === id) DEMO_AGENTS.splice(i, 1);
      }
      for (let i = DEMO_INSTANCES.length - 1; i >= 0; i--) {
        if (DEMO_INSTANCES[i].agentId === id) DEMO_INSTANCES.splice(i, 1);
      }
      for (let i = DEMO_SCHEDULES.length - 1; i >= 0; i--) {
        if (DEMO_SCHEDULES[i].agentId === id) DEMO_SCHEDULES.splice(i, 1);
      }
      for (let i = DEMO_AGENT_MEMORY.length - 1; i >= 0; i--) {
        if (DEMO_AGENT_MEMORY[i].agentId === id) DEMO_AGENT_MEMORY.splice(i, 1);
      }
      for (let i = DEMO_BACKGROUND.length - 1; i >= 0; i--) {
        if (DEMO_BACKGROUND[i].agentId === id) DEMO_BACKGROUND.splice(i, 1);
      }
      delete DEMO_METRICS[id];
      return undefined as T;
    }
    case "agent_list_instances":
      return [...DEMO_INSTANCES] as T;
    case "agent_start": {
      const id = String(args?.agentId);
      for (let i = DEMO_INSTANCES.length - 1; i >= 0; i--) {
        if (DEMO_INSTANCES[i].agentId === id) DEMO_INSTANCES.splice(i, 1);
      }
      const instance: AgentInstance = {
        id: crypto.randomUUID(),
        agentId: id,
        lifecycle: "running",
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        lastHeartbeat: new Date().toISOString(),
        error: null,
        pid: null,
      };
      DEMO_INSTANCES.push(instance);
      DEMO_METRICS[id] = {
        ...(DEMO_METRICS[id] ?? {
          agentId: id,
          health: "healthy",
          cpuUsage: 0,
          memUsage: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          messagesSent: 0,
          uptimeSec: 0,
          lastActivity: null,
        }),
        health: "healthy",
        cpuUsage: 4,
        memUsage: 64,
      };
      return instance as T;
    }
    case "agent_stop": {
      const id = String(args?.agentId);
      for (let i = DEMO_INSTANCES.length - 1; i >= 0; i--) {
        if (DEMO_INSTANCES[i].agentId === id) DEMO_INSTANCES.splice(i, 1);
      }
      const instance: AgentInstance = {
        id: crypto.randomUUID(),
        agentId: id,
        lifecycle: "stopped",
        startedAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        error: null,
        pid: null,
      };
      DEMO_INSTANCES.push(instance);
      if (DEMO_METRICS[id]) DEMO_METRICS[id].health = "down";
      return instance as T;
    }
    case "agent_pause": {
      const id = String(args?.agentId);
      const instance: AgentInstance = {
        id: crypto.randomUUID(),
        agentId: id,
        lifecycle: "paused",
        startedAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        error: null,
        pid: null,
      };
      DEMO_INSTANCES.push(instance);
      if (DEMO_METRICS[id]) DEMO_METRICS[id].health = "degraded";
      return instance as T;
    }
    case "agent_resume": {
      const id = String(args?.agentId);
      const instance: AgentInstance = {
        id: crypto.randomUUID(),
        agentId: id,
        lifecycle: "running",
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        lastHeartbeat: new Date().toISOString(),
        error: null,
        pid: null,
      };
      DEMO_INSTANCES.push(instance);
      if (DEMO_METRICS[id]) DEMO_METRICS[id].health = "healthy";
      return instance as T;
    }
    case "agent_send_message": {
      const from = String(args?.fromAgentId);
      const to = (args?.toAgentId as string | null) ?? null;
      const kind = (args?.kind as AgentMessageKind) ?? "task";
      const content = String(args?.content ?? "");
      const msg: AgentMessage = {
        id: crypto.randomUUID(),
        fromAgentId: from,
        toAgentId: to,
        kind,
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };
      DEMO_MESSAGES.push(msg);
      if (DEMO_METRICS[from]) {
        DEMO_METRICS[from].messagesSent += 1;
        DEMO_METRICS[from].lastActivity = msg.timestamp;
      }
      return msg as T;
    }
    case "agent_broadcast": {
      const from = String(args?.fromAgentId);
      const content = String(args?.content ?? "");
      const msg: AgentMessage = {
        id: crypto.randomUUID(),
        fromAgentId: from,
        toAgentId: null,
        kind: "broadcast",
        content,
        timestamp: new Date().toISOString(),
        read: false,
      };
      DEMO_MESSAGES.push(msg);
      if (DEMO_METRICS[from]) DEMO_METRICS[from].messagesSent += 1;
      return msg as T;
    }
    case "agent_list_messages": {
      const id = args?.agentId ? String(args.agentId) : null;
      return DEMO_MESSAGES.filter(
        (m) => !id || m.fromAgentId === id || m.toAgentId === id,
      ) as T;
    }
    case "agent_schedule_task": {
      const schedule = args?.schedule as AgentSchedule;
      const stored: AgentSchedule = {
        ...schedule,
        id: schedule.id || crypto.randomUUID(),
        nextRunAt: schedule.nextRunAt || new Date(Date.now() + 15 * 60_000).toISOString(),
      };
      const idx = DEMO_SCHEDULES.findIndex((s) => s.id === stored.id);
      if (idx >= 0) DEMO_SCHEDULES[idx] = stored;
      else DEMO_SCHEDULES.push(stored);
      return stored as T;
    }
    case "agent_list_schedules": {
      const id = args?.agentId ? String(args.agentId) : null;
      return DEMO_SCHEDULES.filter((s) => !id || s.agentId === id) as T;
    }
    case "agent_cancel_schedule": {
      const id = String(args?.id);
      for (let i = DEMO_SCHEDULES.length - 1; i >= 0; i--) {
        if (DEMO_SCHEDULES[i].id === id) DEMO_SCHEDULES.splice(i, 1);
      }
      return undefined as T;
    }
    case "agent_run_schedule": {
      const id = String(args?.id);
      const sched = DEMO_SCHEDULES.find((s) => s.id === id);
      if (!sched) throw new Error("schedule not found");
      sched.lastRunAt = new Date().toISOString();
      sched.runCount += 1;
      sched.nextRunAt = new Date(Date.now() + 15 * 60_000).toISOString();
      if (DEMO_METRICS[sched.agentId]) {
        DEMO_METRICS[sched.agentId].tasksCompleted += 1;
        DEMO_METRICS[sched.agentId].lastActivity = sched.lastRunAt;
      }
      DEMO_MESSAGES.push({
        id: crypto.randomUUID(),
        fromAgentId: sched.agentId,
        toAgentId: null,
        kind: "result",
        content: `[scheduled] ${sched.task}`,
        timestamp: sched.lastRunAt,
        read: false,
      });
      return sched as T;
    }
    case "agent_get_memory": {
      const id = String(args?.agentId);
      return DEMO_AGENT_MEMORY.filter((m) => m.agentId === id) as T;
    }
    case "agent_save_memory": {
      const entry = args?.entry as AgentMemoryEntry;
      const ts = new Date().toISOString();
      const stored: AgentMemoryEntry = {
        ...entry,
        id: entry.id || crypto.randomUUID(),
        createdAt: entry.createdAt || ts,
        updatedAt: ts,
      };
      const idx = DEMO_AGENT_MEMORY.findIndex((m) => m.id === stored.id);
      if (idx >= 0) DEMO_AGENT_MEMORY[idx] = stored;
      else DEMO_AGENT_MEMORY.push(stored);
      return stored as T;
    }
    case "agent_delete_memory": {
      const id = String(args?.id);
      for (let i = DEMO_AGENT_MEMORY.length - 1; i >= 0; i--) {
        if (DEMO_AGENT_MEMORY[i].id === id) DEMO_AGENT_MEMORY.splice(i, 1);
      }
      return undefined as T;
    }
    case "agent_start_background": {
      const id = String(args?.agentId);
      const task = String(args?.task ?? "");
      const run: BackgroundAgentRun = {
        id: crypto.randomUUID(),
        agentId: id,
        task,
        status: "running",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        logTail: ["[background] task started"],
      };
      DEMO_BACKGROUND.push(run);
      // Simulate completion after a short delay.
      setTimeout(() => {
        run.status = "completed";
        run.finishedAt = new Date().toISOString();
        run.logTail = ["[background] task started", "[background] task completed"];
        if (DEMO_METRICS[id]) DEMO_METRICS[id].tasksCompleted += 1;
      }, 2000);
      return run as T;
    }
    case "agent_list_background": {
      const id = args?.agentId ? String(args.agentId) : null;
      return DEMO_BACKGROUND.filter((b) => !id || b.agentId === id) as T;
    }
    case "agent_get_metrics": {
      const id = String(args?.agentId);
      return (
        DEMO_METRICS[id] ?? {
          agentId: id,
          health: "down",
          cpuUsage: 0,
          memUsage: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          messagesSent: 0,
          uptimeSec: 0,
          lastActivity: null,
        }
      ) as T;
    }
    case "agent_get_all_metrics":
      return Object.values(DEMO_METRICS) as T;
    default:
      throw new Error(`Unknown demo command: ${cmd}`);
  }
}
