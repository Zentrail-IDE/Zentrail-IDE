import { create } from "zustand";
import { ipc } from "../lib/ipc";
import type { FileEntry } from "../lib/types";
import { useEditor } from "./editorStore";
import {
  type Workspace,
  type RecentWorkspace,
  type WorkspaceSession,
  type WorkspaceMemory,
  type WorkspaceSettings,
  type WorkspaceTemplate,
  type WorkspaceProject,
  createWorkspace,
  removeProjectFromWorkspace,
  createSession,
  upsertSession,
  emptyMemory,
  setMemoryEntry,
  removeMemoryEntry,
  defaultWorkspaceSettings,
  mergeWorkspaceSettings,
} from "@zentrail/workspace";

interface WorkspaceState {
  // --- Workspace Manager ---
  workspaces: Workspace[];
  current: Workspace | null;
  recent: RecentWorkspace[];
  sessions: WorkspaceSession[];
  memory: WorkspaceMemory;
  settings: WorkspaceSettings;
  templates: WorkspaceTemplate[];

  // --- File explorer (rooted at the current workspace) ---
  root: string | null;
  currentDir: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;

  // --- Manager actions ---
  loadAll: () => Promise<void>;
  openWorkspace: (path: string, name?: string) => Promise<void>;
  openRecent: (path: string) => Promise<void>;
  removeRecent: (path: string) => Promise<void>;
  closeWorkspace: () => void;
  createWorkspace: (name: string, rootPath: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addProject: () => Promise<void>;
  removeProject: (path: string) => Promise<void>;
  saveSession: (name: string) => Promise<void>;
  switchSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setMemory: (key: string, value: string) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;
  applyTemplate: (templateId: string, rootPath?: string, name?: string) => Promise<void>;

  // --- File explorer actions ---
  openFolder: () => Promise<void>;
  listDir: (rel?: string) => Promise<void>;
  readFile: (rel: string) => Promise<string>;
  writeFile: (rel: string, contents: string) => Promise<void>;
}

const EMPTY_SETTINGS = defaultWorkspaceSettings("");

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  current: null,
  recent: [],
  sessions: [],
  memory: emptyMemory(""),
  settings: EMPTY_SETTINGS,
  templates: [],

  root: null,
  currentDir: "",
  entries: [],
  loading: false,
  error: null,

  async loadAll() {
    try {
      const [workspaces, recent, templates] = await Promise.all([
        ipc.listWorkspaces(),
        ipc.recentWorkspaces(),
        ipc.workspaceTemplates(),
      ]);
      set({ workspaces, recent, templates });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  async openWorkspace(path, name) {
    const { workspaces } = get();
    const existing = workspaces.find((w) => w.rootPath === path);
    const ws = existing ?? (await ipc.saveWorkspace(createWorkspace(path, name)));

    if (!existing) set({ workspaces: [...workspaces, ws] });

    await ipc.recordRecent(path, ws.name);
    const [recent, sessions, memory, settings] = await Promise.all([
      ipc.recentWorkspaces(),
      ipc.workspaceSessions(ws.id),
      ipc.workspaceMemory(ws.id),
      ipc.workspaceSettings(ws.id),
    ]);

    set({
      current: ws,
      root: ws.rootPath,
      recent,
      sessions,
      memory,
      settings,
      currentDir: "",
      entries: [],
      error: null,
    });
    await get().listDir("");
  },

  async openRecent(path) {
    const ws = get().workspaces.find((w) => w.rootPath === path);
    await get().openWorkspace(path, ws?.name);
  },

  async removeRecent(path) {
    await ipc.removeRecent(path);
    set({ recent: get().recent.filter((r) => r.path !== path) });
  },

  closeWorkspace() {
    set({
      current: null,
      root: null,
      currentDir: "",
      entries: [],
      sessions: [],
      memory: emptyMemory(""),
      settings: EMPTY_SETTINGS,
      error: null,
    });
  },

  async createWorkspace(name, rootPath) {
    const ws = await ipc.saveWorkspace(createWorkspace(rootPath, name));
    set({ workspaces: [...get().workspaces, ws] });
    await get().openWorkspace(rootPath, name);
  },

  async renameWorkspace(id, name) {
    const ws = get().workspaces.find((w) => w.id === id);
    if (!ws) return;
    const updated = await ipc.saveWorkspace({ ...ws, name });
    set({
      workspaces: get().workspaces.map((w) => (w.id === id ? updated : w)),
      current: get().current?.id === id ? updated : get().current,
    });
  },

  async deleteWorkspace(id) {
    await ipc.deleteWorkspace(id);
    const workspaces = get().workspaces.filter((w) => w.id !== id);
    const closing = get().current?.id === id;
    set({ workspaces });
    if (closing) get().closeWorkspace();
  },

  async addProject() {
    const { current } = get();
    if (!current) return;
    const path = await ipc.openFolderDialog();
    if (!path) return;
    const ws = await ipc.addProject(current.id, path);
    set({
      current: ws,
      workspaces: get().workspaces.map((w) => (w.id === ws.id ? ws : w)),
    });
  },

  async removeProject(path) {
    const { current } = get();
    if (!current) return;
    const ws = removeProjectFromWorkspace(current, path);
    const saved = await ipc.saveWorkspace(ws);
    set({
      current: saved,
      workspaces: get().workspaces.map((w) => (w.id === saved.id ? saved : w)),
    });
  },

  async saveSession(name) {
    const { current, sessions } = get();
    if (!current) return;
    const tabs = useEditor.getState().tabs;
    const active = tabs.find((t) => t.id === useEditor.getState().activeId);
    const session = createSession(
      current.id,
      name,
      tabs.map((t) => t.path),
      active?.path ?? null,
    );
    const saved = await ipc.saveSession(session);
    set({ sessions: upsertSession(sessions, saved) });
  },

  async switchSession(id) {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    const open = useEditor.getState().open;
    for (const path of session.openTabs) {
      await open({
        name: path.split(/[\\/]/).pop() ?? path,
        path,
        isDir: false,
        size: 0,
      });
    }
    if (session.activeTab) {
      const tab = useEditor
        .getState()
        .tabs.find((t) => t.path === session.activeTab);
      if (tab) useEditor.getState().setActive(tab.id);
    }
  },

  async deleteSession(id) {
    await ipc.deleteSession(id);
    set({ sessions: get().sessions.filter((s) => s.id !== id) });
  },

  async setMemory(key, value) {
    const { current, memory } = get();
    const next = setMemoryEntry(memory, key, value);
    set({ memory: next });
    if (current) await ipc.saveMemory(next);
  },

  async removeMemory(id) {
    const { current, memory } = get();
    const next = removeMemoryEntry(memory, id);
    set({ memory: next });
    if (current) await ipc.saveMemory(next);
  },

  async updateSettings(patch) {
    const { current, settings } = get();
    if (!current) return;
    const merged = mergeWorkspaceSettings(settings, patch);
    set({ settings: merged });
    await ipc.saveWorkspaceSettings(current.id, patch as Record<string, unknown>);
  },

  async applyTemplate(templateId, rootPath, name) {
    const root = rootPath ?? (await ipc.openFolderDialog());
    if (!root) return;
    const ws = await ipc.createFromTemplate(templateId, root, name);
    set({ workspaces: [...get().workspaces, ws] });
    await get().openWorkspace(ws.rootPath, ws.name);
  },

  async openFolder() {
    const path = await ipc.openFolderDialog();
    if (!path) return;
    await get().openWorkspace(path);
  },

  async listDir(rel = "") {
    const { root } = get();
    if (!root) return;
    set({ loading: true, error: null, currentDir: rel });
    try {
      const entries = await ipc.readDirectory(root, rel);
      set({ entries, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  },

  async readFile(rel) {
    const { root } = get();
    if (!root) return "";
    return ipc.readTextFile(root, rel);
  },

  async writeFile(rel, contents) {
    const { root } = get();
    if (!root) return;
    await ipc.writeTextFile(root, rel, contents);
  },
}));

/** Convenience selector: the project folders of the current workspace. */
export function currentProjects(state: WorkspaceState): WorkspaceProject[] {
  return state.current?.projects ?? [];
}
