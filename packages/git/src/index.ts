/**
 * Git domain models for the Phase 3 Git integration.
 *
 * Pure, framework-agnostic types and helpers shared between the desktop UI and
 * the Tauri backend. No React, DOM, or Tauri imports belong here.
 */

/** Working-tree state of a single file. */
export type FileStatus =
  | "modified"
  | "added"
  | "deleted"
  | "untracked"
  | "renamed"
  | "copied"
  | "unmerged";

/** A single file change reported by `git status`. */
export interface GitFileStatus {
  path: string;
  status: FileStatus;
  /** Set when `status` is `renamed`/`copied` and the source path is known. */
  oldPath?: string;
  /** True when the change is staged in the index. */
  staged: boolean;
}

/** Aggregate repository state returned by `git status`. */
export interface GitState {
  /** Current branch name, or `(detached)` when HEAD is detached. */
  branch: string;
  detached: boolean;
  ahead: number;
  behind: number;
  changes: GitFileStatus[];
}

/** A single commit in the history log. */
export interface GitLogEntry {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  /** ISO-8601 commit date. */
  date: string;
  message: string;
  /** Ref pointers (branch/tag) pointing at this commit. */
  refs: string[];
}

/** A local or remote branch. */
export interface GitBranch {
  name: string;
  current: boolean;
  remote: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
}

/** A configured remote. */
export interface GitRemote {
  name: string;
  fetch: string;
  push: string;
}

/** Full repository snapshot combining status, history, and branches. */
export interface GitRepository {
  root: string;
  exists: boolean;
  state: GitState | null;
  log: GitLogEntry[];
  branches: GitBranch[];
  remotes: GitRemote[];
}

export const STATUS_LABELS: Record<FileStatus, string> = {
  modified: "Modified",
  added: "Added",
  deleted: "Deleted",
  untracked: "Untracked",
  renamed: "Renamed",
  copied: "Copied",
  unmerged: "Conflict",
};

/** Group changes by staged vs unstaged for display in the UI. */
export function splitChanges(
  changes: GitFileStatus[],
): { staged: GitFileStatus[]; unstaged: GitFileStatus[] } {
  const staged: GitFileStatus[] = [];
  const unstaged: GitFileStatus[] = [];
  for (const c of changes) (c.staged ? staged : unstaged).push(c);
  return { staged, unstaged };
}

/** Count of changes per status for a quick summary badge. */
export function statusSummary(changes: GitFileStatus[]): Record<FileStatus, number> {
  const summary = {
    modified: 0,
    added: 0,
    deleted: 0,
    untracked: 0,
    renamed: 0,
    copied: 0,
    unmerged: 0,
  } as Record<FileStatus, number>;
  for (const c of changes) summary[c.status] += 1;
  return summary;
}

/** True when the working tree has no staged or unstaged changes. */
export function isClean(state: GitState | null): boolean {
  return !state || state.changes.length === 0;
}

/** Format an ISO date as a short relative-ish label (e.g. "2024-01-31"). */
export function formatCommitDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

/** Short ref label for a log entry, e.g. "main, tag: v1.0". */
export function formatRefs(refs: string[]): string {
  return refs.join(", ");
}
