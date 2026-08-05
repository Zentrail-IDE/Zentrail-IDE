import { create } from "zustand";
import { ipc } from "../lib/ipc";
import type {
  GitState,
  GitLogEntry,
  GitBranch,
  GitRemote,
  GitFileStatus,
} from "@zentrail/git";

interface GitStoreState {
  root: string | null;
  exists: boolean;
  state: GitState | null;
  log: GitLogEntry[];
  branches: GitBranch[];
  remotes: GitRemote[];
  loading: boolean;
  error: string | null;
  commitMessage: string;
  /** Working-tree paths the user has ticked for the next commit. */
  selection: Record<string, boolean>;

  setRoot: (root: string | null) => void;
  refresh: () => Promise<void>;
  setCommitMessage: (message: string) => void;
  toggleSelection: (path: string) => void;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  stagePaths: (paths: string[]) => Promise<void>;
  unstagePaths: (paths: string[]) => Promise<void>;
  commit: (all: boolean) => Promise<void>;
  checkout: (name: string) => Promise<void>;
  pull: (remote?: string) => Promise<void>;
  push: (remote?: string) => Promise<void>;
  merge: (branch: string) => Promise<void>;
  init: () => Promise<void>;
}

export const useGit = create<GitStoreState>((set, get) => ({
  root: null,
  exists: false,
  state: null,
  log: [],
  branches: [],
  remotes: [],
  loading: false,
  error: null,
  commitMessage: "",
  selection: {},

  setRoot(root) {
    set({ root, state: null, log: [], branches: [], remotes: [], selection: {} });
    if (root) void get().refresh();
  },

  async refresh() {
    const { root } = get();
    if (!root) return;
    set({ loading: true, error: null });
    try {
      const [state, log, branches] = await Promise.all([
        ipc.gitStatus(root),
        ipc.gitLog(root, 50),
        ipc.gitBranches(root),
      ]);
      set({
        exists: state !== null,
        state,
        log,
        branches: branches.branches,
        remotes: branches.remotes,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
        exists: false,
      });
    }
  },

  setCommitMessage(commitMessage) {
    set({ commitMessage });
  },

  toggleSelection(path) {
    set((s) => ({ selection: { ...s.selection, [path]: !s.selection[path] } }));
  },

  async stageAll() {
    const { root } = get();
    if (!root) return;
    await ipc.gitStage(root, []);
    await get().refresh();
  },

  async unstageAll() {
    const { root } = get();
    if (!root) return;
    await ipc.gitUnstage(root, []);
    await get().refresh();
  },

  async stagePaths(paths) {
    const { root } = get();
    if (!root || paths.length === 0) return;
    await ipc.gitStage(root, paths);
    await get().refresh();
  },

  async unstagePaths(paths) {
    const { root } = get();
    if (!root || paths.length === 0) return;
    await ipc.gitUnstage(root, paths);
    await get().refresh();
  },

  async commit(all) {
    const { root, commitMessage, selection } = get();
    if (!root || !commitMessage.trim()) return;
    const selected = Object.keys(selection).filter((p) => selection[p]);
    if (selected.length > 0) {
      await ipc.gitStage(root, selected);
      await ipc.gitCommit(root, commitMessage.trim(), false);
    } else {
      await ipc.gitCommit(root, commitMessage.trim(), all);
    }
    set({ commitMessage: "", selection: {} });
    await get().refresh();
  },

  async checkout(name) {
    const { root } = get();
    if (!root) return;
    await ipc.gitCheckout(root, name);
    await get().refresh();
  },

  async pull(remote) {
    const { root } = get();
    if (!root) return;
    await ipc.gitPull(root, remote);
    await get().refresh();
  },

  async push(remote) {
    const { root } = get();
    if (!root) return;
    await ipc.gitPush(root, remote);
    await get().refresh();
  },

  async merge(branch) {
    const { root } = get();
    if (!root) return;
    await ipc.gitMerge(root, branch);
    await get().refresh();
  },

  async init() {
    const { root } = get();
    if (!root) return;
    await ipc.gitInit(root);
    await get().refresh();
  },
}));

/** Convenience: current branch name or null when no repo is open. */
export function currentBranch(state: GitState | null): string | null {
  return state?.branch ?? null;
}

export type { GitFileStatus };
