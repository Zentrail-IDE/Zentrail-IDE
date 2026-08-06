import { useUi } from "../state/uiStore";
import { FileExplorer } from "./FileExplorer";
import { SettingsPanel } from "./SettingsPanel";
import { GitPanel } from "./GitPanel";
import { WorkspacePanel } from "./WorkspacePanel";

function SearchPanel() {
  return (
    <div className="panel">
      <h2 className="panel__title">Search</h2>
      <p className="muted">
        Press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>P</kbd> to quick-open files, or use the
        search field in the command palette.
      </p>
    </div>
  );
}

/** Side panel whose contents depend on the active activity-bar selection. */
export function Sidebar() {
  const sidebar = useUi((s) => s.sidebar);
  const activity = useUi((s) => s.activity);

  if (!sidebar) return null;

  return (
    <aside className="sidebar">
      {activity === "explorer" && <FileExplorer />}
      {activity === "search" && <SearchPanel />}
      {activity === "git" && <GitPanel />}
      {activity === "workspace" && <WorkspacePanel />}
      {activity === "settings" && <SettingsPanel />}
    </aside>
  );
}
