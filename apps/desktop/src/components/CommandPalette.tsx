import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FolderOpen, File as FileIcon, Folder } from "lucide-react";
import { useWorkspace } from "../state/workspaceStore";
import { useEditor } from "../state/editorStore";
import { useUi } from "../state/uiStore";
import { joinRel } from "../lib/files";

/** Quick-open palette: fuzzy filter the current directory and open a file. */
export function CommandPalette() {
  const root = useWorkspace((s) => s.root);
  const currentDir = useWorkspace((s) => s.currentDir);
  const entries = useWorkspace((s) => s.entries);
  const listDir = useWorkspace((s) => s.listDir);
  const openFolder = useWorkspace((s) => s.openFolder);
  const openFile = useEditor((s) => s.open);
  const setOpen = useUi((s) => s.setCommandOpen);
  const pushToast = useUi((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, query]);

  async function choose(name: string, isDir: boolean) {
    if (isDir) {
      await listDir(joinRel(currentDir, name));
      setQuery("");
      setIndex(0);
      return;
    }
    const entry = entries.find((e) => e.name === name);
    if (!entry) return;
    await openFile(entry).catch((e) =>
      pushToast({ title: "Open failed", body: String(e), kind: "error" }),
    );
    setOpen(false);
  }

  return (
    <div className="palette" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="palette__box" onClick={(e) => e.stopPropagation()}>
        <div className="palette__input">
          <Search size={15} className="muted" />
          <input
            ref={inputRef}
            value={query}
            placeholder={root ? "Search files…" : "No folder open — open one first"}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[index]) {
                void choose(results[index].name, results[index].isDir);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>

        <ul className="palette__list">
          {!root && (
            <li>
              <button
                type="button"
                className="palette__row"
                onClick={() => void openFolder()}
              >
                <FolderOpen size={15} className="accent" />
                <span>Open Folder…</span>
              </button>
            </li>
          )}
          {root &&
            results.map((entry, i) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className={`palette__row ${i === index ? "is-active" : ""}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => void choose(entry.name, entry.isDir)}
                >
                  {entry.isDir ? (
                    <Folder size={15} className="explorer__ico--dir" />
                  ) : (
                    <FileIcon size={15} />
                  )}
                  <span>{entry.name}</span>
                </button>
              </li>
            ))}
          {root && results.length === 0 && <li className="muted palette__empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
