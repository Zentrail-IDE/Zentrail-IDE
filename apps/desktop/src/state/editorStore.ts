import { create } from "zustand";
import { useWorkspace } from "./workspaceStore";
import { getLanguage } from "../lib/files";
import type { FileEntry } from "../lib/types";

export interface Tab {
  id: string;
  /** Workspace-relative path. */
  path: string;
  name: string;
  language: string;
  contents: string;
  dirty: boolean;
}

interface EditorState {
  tabs: Tab[];
  activeId: string | null;

  open: (entry: FileEntry) => Promise<void>;
  close: (id: string) => void;
  setActive: (id: string) => void;
  update: (id: string, contents: string) => void;
  save: () => Promise<void>;
}

export const useEditor = create<EditorState>((set, get) => ({
  tabs: [],
  activeId: null,

  async open(entry: FileEntry) {
    if (entry.isDir) return;
    const existing = get().tabs.find((t) => t.path === entry.path);
    if (existing) {
      set({ activeId: existing.id });
      return;
    }
    const contents = await useWorkspace.getState().readFile(entry.path);
    const tab: Tab = {
      id: crypto.randomUUID(),
      path: entry.path,
      name: entry.name,
      language: getLanguage(entry.name),
      contents,
      dirty: false,
    };
    set({ tabs: [...get().tabs, tab], activeId: tab.id });
  },

  close(id: string) {
    const tabs = get().tabs.filter((t) => t.id !== id);
    const activeId = get().activeId === id ? (tabs.at(-1)?.id ?? null) : get().activeId;
    set({ tabs, activeId });
  },

  setActive(id: string) {
    set({ activeId: id });
  },

  update(id: string, contents: string) {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, contents, dirty: true } : t)),
    });
  },

  async save() {
    const { activeId, tabs } = get();
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab) return;
    await useWorkspace.getState().writeFile(tab.path, tab.contents);
    set({
      tabs: tabs.map((t) => (t.id === tab.id ? { ...t, dirty: false } : t)),
    });
  },
}));
