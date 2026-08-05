import { create } from "zustand";
import { ipc } from "../lib/ipc";
import type { FileEntry } from "../lib/types";

interface WorkspaceState {
  root: string | null;
  currentDir: string;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  recent: string[];

  openFolder: () => Promise<void>;
  listDir: (rel?: string) => Promise<void>;
  readFile: (rel: string) => Promise<string>;
  writeFile: (rel: string, contents: string) => Promise<void>;
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  root: null,
  currentDir: "",
  entries: [],
  loading: false,
  error: null,
  recent: [],

  async openFolder() {
    const path = await ipc.openFolderDialog();
    if (!path) return;
    set({ root: path, currentDir: "", error: null });
    if (!get().recent.includes(path)) {
      set({ recent: [path, ...get().recent].slice(0, 10) });
    }
    await get().listDir("");
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

  async readFile(rel: string) {
    const { root } = get();
    if (!root) return "";
    return ipc.readTextFile(root, rel);
  },

  async writeFile(rel: string, contents: string) {
    const { root } = get();
    if (!root) return;
    await ipc.writeTextFile(root, rel, contents);
  },
}));
