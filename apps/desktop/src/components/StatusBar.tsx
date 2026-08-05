import { Circle, Bell, GitBranch, TerminalSquare } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useWorkspace } from "../state/workspaceStore";
import { useEditor } from "../state/editorStore";
import { useUi } from "../state/uiStore";
import { useGit } from "../state/gitStore";

/** Bottom status bar: workspace, active file, git, and runtime status. */
export function StatusBar() {
  const root = useWorkspace((s) => s.root);
  const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId) ?? null);
  const toastCount = useUi((s) => s.toasts.length);
  const terminalOpen = useUi((s) => s.terminalOpen);
  const toggleTerminal = useUi((s) => s.toggleTerminal);
  const gitState = useGit((s) => s.state);
  const gitExists = useGit((s) => s.exists);

  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <span className="statusbar__item">
          <Circle size={8} className="accent" fill="currentColor" />
          {root ? root.split(/[\\/]/).pop() : "No folder"}
        </span>
        <span className="statusbar__item statusbar__sep">Zentrail Core</span>
        {gitExists && gitState && (
          <button
            type="button"
            className="statusbar__item statusbar__btn"
            title="Open Source Control"
            onClick={() => useUi.getState().setActivity("git")}
          >
            <GitBranch size={12} /> {gitState.branch}
            {gitState.ahead > 0 && <span className="statusbar__cnt">↑{gitState.ahead}</span>}
            {gitState.behind > 0 && <span className="statusbar__cnt">↓{gitState.behind}</span>}
          </button>
        )}
      </div>

      <div className="statusbar__group">
        {tab && (
          <span className="statusbar__item">
            {tab.language} · {tab.name}
          </span>
        )}
        <button
          type="button"
          className={cn("statusbar__item", "statusbar__btn", terminalOpen && "is-active")}
          title="Toggle Terminal (Ctrl+`)"
          aria-pressed={terminalOpen}
          onClick={toggleTerminal}
        >
          <TerminalSquare size={12} /> Terminal
        </button>
        <span className="statusbar__item">
          <Bell size={12} /> {toastCount}
        </span>
      </div>
    </footer>
  );
}
