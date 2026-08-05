/** Editor tab model — placeholder for the Phase 2 Monaco integration. */
export interface EditorTab {
  id: string;
  path: string;
  language: string;
  dirty: boolean;
}

export interface EditorState {
  tabs: EditorTab[];
  activeId: string | null;
}

export function createTab(path: string, language: string): EditorTab {
  return { id: crypto.randomUUID(), path, language, dirty: false };
}
