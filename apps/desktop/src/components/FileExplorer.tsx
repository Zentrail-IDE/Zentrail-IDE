import { Folder, File as FileIcon, ChevronRight, RefreshCw, FolderOpen } from "lucide-react";
import { useWorkspace } from "../state/workspaceStore";
import { useEditor } from "../state/editorStore";
import { useUi } from "../state/uiStore";
import { joinRel, formatBytes } from "../lib/files";

/** Recursive file tree for the open workspace. */
export function FileExplorer() {
  const root = useWorkspace((s) => s.root);
  const currentDir = useWorkspace((s) => s.currentDir);
  const entries = useWorkspace((s) => s.entries);
  const loading = useWorkspace((s) => s.loading);
  const error = useWorkspace((s) => s.error);
  const listDir = useWorkspace((s) => s.listDir);
  const openFolder = useWorkspace((s) => s.openFolder);
  const openFile = useEditor((s) => s.open);
  const pushToast = useUi((s) => s.pushToast);

  if (!root) {
    return (
      <div className="explorer__empty">
        <p className="muted">No folder open.</p>
        <button
          className="btn btn--primary"
          type="button"
          onClick={() => void openFolder()}
        >
          <FolderOpen size={14} /> Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="explorer">
      <div className="explorer__header">
        <span className="explorer__crumb" title={root}>
          {root.split(/[\\/]/).pop() || root}
          {currentDir ? `/${currentDir}` : ""}
        </span>
        <button
          className="iconbtn"
          type="button"
          title="Refresh"
          onClick={() => void listDir(currentDir)}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {error && <p className="explorer__error">{error}</p>}

      <ul className="explorer__list">
        {loading && <li className="muted">Loading…</li>}
        {!loading &&
          entries.map((entry) => (
            <li key={entry.path}>
              <button
                type="button"
                className="explorer__row"
                onClick={() =>
                  entry.isDir
                    ? void listDir(joinRel(currentDir, entry.name))
                    : void openFile(entry).catch((e) =>
                        pushToast({
                          title: "Open failed",
                          body: String(e),
                          kind: "error",
                        }),
                      )
                }
              >
                {entry.isDir ? (
                  <Folder size={15} className="explorer__ico explorer__ico--dir" />
                ) : (
                  <FileIcon size={15} className="explorer__ico" />
                )}
                <span className="explorer__name">{entry.name}</span>
                {!entry.isDir && (
                  <span className="explorer__size">{formatBytes(entry.size)}</span>
                )}
                {entry.isDir && <ChevronRight size={13} className="explorer__chev" />}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
