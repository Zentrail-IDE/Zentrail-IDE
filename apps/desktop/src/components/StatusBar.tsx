import { Circle, Bell } from "lucide-react";
import { useWorkspace } from "../state/workspaceStore";
import { useEditor } from "../state/editorStore";
import { useUi } from "../state/uiStore";

/** Bottom status bar: workspace, active file, and runtime status. */
export function StatusBar() {
  const root = useWorkspace((s) => s.root);
  const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId) ?? null);
  const toastCount = useUi((s) => s.toasts.length);

  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <span className="statusbar__item">
          <Circle size={8} className="accent" fill="currentColor" />
          {root ? root.split(/[\\/]/).pop() : "No folder"}
        </span>
        <span className="statusbar__item statusbar__sep">Zentrail Core</span>
      </div>

      <div className="statusbar__group">
        {tab && (
          <span className="statusbar__item">
            {tab.language} · {tab.name}
          </span>
        )}
        <span className="statusbar__item">
          <Bell size={12} /> {toastCount}
        </span>
      </div>
    </footer>
  );
}
