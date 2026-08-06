import { useEffect, useMemo, useRef, useState } from "react";
import { Search, FolderOpen, File as FileIcon, Folder, Layers } from "lucide-react";
import { useWorkspace } from "../state/workspaceStore";
import { useEditor } from "../state/editorStore";
import { useUi } from "../state/uiStore";
import { joinRel } from "../lib/files";

interface PaletteCommand {
  id: string;
  label: string;
  icon: typeof FolderOpen;
  run: () => void | Promise<void>;
}

/** Quick-open palette: workspace commands plus fuzzy file search. */
export function CommandPalette() {
  const root = useWorkspace((s) => s.root);
  const currentDir = useWorkspace((s) => s.currentDir);
  const entries = useWorkspace((s) => s.entries);
  const listDir = useWorkspace((s) => s.listDir);
  const openFolder = useWorkspace((s) => s.openFolder);
  const openRecent = useWorkspace((s) => s.openRecent);
  const applyTemplate = useWorkspace((s) => s.applyTemplate);
  const recent = useWorkspace((s) => s.recent);
  const templates = useWorkspace((s) => s.templates);
  const openFile = useEditor((s) => s.open);
  const setOpen = useUi((s) => s.setCommandOpen);
  const pushToast = useUi((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands = useMemo<PaletteCommand[]>(() => {
    const base: PaletteCommand[] = [
      {
        id: "open-workspace",
        label: "Open Workspace…",
        icon: FolderOpen,
        run: () => void openFolder(),
      },
      ...recent.slice(0, 8).map((r) => ({
        id: `recent-${r.id}`,
        label: `Open recent: ${r.name}`,
        icon: FolderOpen,
        run: () => void openRecent(r.path),
      })),
      ...templates.map((t) => ({
        id: `template-${t.id}`,
        label: `New from template: ${t.name}`,
        icon: Layers,
        run: () => void applyTemplate(t.id),
      })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, recent, templates, openFolder, openRecent, applyTemplate]);

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

  function runCommand(cmd: PaletteCommand) {
    setOpen(false);
    void cmd.run();
  }

  const total = commands.length + (root ? results.length : 0);

  return (
    <div className="palette" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div className="palette__box" onClick={(e) => e.stopPropagation()}>
        <div className="palette__input">
          <Search size={15} className="muted" />
          <input
            ref={inputRef}
            value={query}
            placeholder={root ? "Search files or commands…" : "Open a workspace to begin"}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, total - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                if (index < commands.length) runCommand(commands[index]);
                else {
                  const entry = results[index - commands.length];
                  if (entry) void choose(entry.name, entry.isDir);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>

        <ul className="palette__list">
          {commands.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                className={`palette__row ${i === index ? "is-active" : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => runCommand(cmd)}
              >
                <cmd.icon size={15} className="accent" />
                <span>{cmd.label}</span>
              </button>
            </li>
          ))}
          {root &&
            results.map((entry, i) => {
              const idx = commands.length + i;
              return (
                <li key={entry.path}>
                  <button
                    type="button"
                    className={`palette__row ${idx === index ? "is-active" : ""}`}
                    onMouseEnter={() => setIndex(idx)}
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
              );
            })}
          {total === 0 && <li className="muted palette__empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
