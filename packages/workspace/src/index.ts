/** Workspace model — placeholder for the Phase 4 Workspace System. */
export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  recentPaths: string[];
}

export function createWorkspace(name: string, rootPath: string): Workspace {
  return { id: crypto.randomUUID(), name, rootPath, recentPaths: [rootPath] };
}
