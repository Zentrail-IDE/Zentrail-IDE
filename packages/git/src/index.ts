/** Git status model — placeholder for the Phase 3 Git integration. */
export type FileStatus = "modified" | "added" | "deleted" | "untracked" | "renamed";

export interface GitFileStatus {
  path: string;
  status: FileStatus;
}

export interface GitState {
  branch: string;
  ahead: number;
  behind: number;
  changes: GitFileStatus[];
}
