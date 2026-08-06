import { useEffect, useState } from "react";
import {
  Folder,
  Clock,
  Bookmark,
  Layers,
  Plus,
  Trash2,
  Save,
  Play,
  X,
  Boxes,
  Star,
  History,
  FolderOpen,
} from "lucide-react";
import type { Settings } from "@zentrail/settings";
import { useWorkspace } from "../state/workspaceStore";
import type { MemoryEntry, WorkspaceSession, WorkspaceTemplate } from "@zentrail/workspace";

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Folder;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ws__section">
      <header className="ws__section-head">
        <span className="ws__section-title">
          <Icon size={13} /> {title}
        </span>
        {action}
      </header>
      <div className="ws__section-body">{children}</div>
    </section>
  );
}

function MemoryRow({ entry }: { entry: MemoryEntry }) {
  const setMemory = useWorkspace((s) => s.setMemory);
  const removeMemory = useWorkspace((s) => s.removeMemory);
  const [value, setValue] = useState(entry.value);

  useEffect(() => setValue(entry.value), [entry.value]);

  return (
    <div className="ws__memory-row">
      <span className="ws__memory-key" title={entry.key}>
        {entry.key}
      </span>
      <textarea
        className="ws__memory-input"
        value={value}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== entry.value) void setMemory(entry.key, value);
        }}
      />
      <button
        type="button"
        className="iconbtn"
        title="Remove memory"
        onClick={() => void removeMemory(entry.id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SessionRow({ session }: { session: WorkspaceSession }) {
  const switchSession = useWorkspace((s) => s.switchSession);
  const deleteSession = useWorkspace((s) => s.deleteSession);
  return (
    <li className="ws__row">
      <button
        type="button"
        className="ws__row-main"
        onClick={() => void switchSession(session.id)}
        title={`${session.openTabs.length} tab(s) saved`}
      >
        <Play size={13} className="ws__row-ico" />
        <span className="ws__row-name">{session.name}</span>
        <span className="ws__row-meta">{session.openTabs.length} tabs</span>
      </button>
      <button
        type="button"
        className="iconbtn"
        title="Delete session"
        onClick={() => void deleteSession(session.id)}
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function TemplateCard({ template }: { template: WorkspaceTemplate }) {
  const applyTemplate = useWorkspace((s) => s.applyTemplate);
  return (
    <div className="ws__template">
      <div className="ws__template-head">
        <Boxes size={14} className="accent" />
        <span className="ws__template-name">{template.name}</span>
      </div>
      <p className="ws__template-desc">{template.description}</p>
      <button
        type="button"
        className="btn btn--primary ws__template-btn"
        onClick={() => void applyTemplate(template.id)}
      >
        <Plus size={13} /> Create
      </button>
    </div>
  );
}

/** The Workspace System manager shown in the activity sidebar. */
export function WorkspacePanel() {
  const current = useWorkspace((s) => s.current);
  const recent = useWorkspace((s) => s.recent);
  const sessions = useWorkspace((s) => s.sessions);
  const memory = useWorkspace((s) => s.memory);
  const templates = useWorkspace((s) => s.templates);
  const settings = useWorkspace((s) => s.settings);

  const openRecent = useWorkspace((s) => s.openRecent);
  const removeRecent = useWorkspace((s) => s.removeRecent);
  const closeWorkspace = useWorkspace((s) => s.closeWorkspace);
  const renameWorkspace = useWorkspace((s) => s.renameWorkspace);
  const addProject = useWorkspace((s) => s.addProject);
  const removeProject = useWorkspace((s) => s.removeProject);
  const saveSession = useWorkspace((s) => s.saveSession);
  const setMemory = useWorkspace((s) => s.setMemory);
  const updateSettings = useWorkspace((s) => s.updateSettings);
  const openFolder = useWorkspace((s) => s.openFolder);

  const [rename, setRename] = useState(current?.name ?? "");
  const [sessionName, setSessionName] = useState("");
  const [memKey, setMemKey] = useState("");
  const [memVal, setMemVal] = useState("");

  useEffect(() => setRename(current?.name ?? ""), [current?.name]);

  if (!current) {
    return (
      <div className="ws">
        <div className="ws__empty">
          <Layers size={28} className="accent" />
          <p className="muted">No workspace open.</p>
          <button className="btn btn--primary" type="button" onClick={() => void openFolder()}>
            <FolderOpen size={14} /> Open Workspace
          </button>
        </div>

        {templates.length > 0 && (
          <Section icon={Boxes} title="Templates">
            <div className="ws__templates">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  return (
    <div className="ws">
      <Section
        icon={Layers}
        title="Workspace"
        action={
          <button
            type="button"
            className="iconbtn"
            title="Close workspace"
            onClick={closeWorkspace}
          >
            <X size={14} />
          </button>
        }
      >
        <label className="field">
          <span>Name</span>
          <input
            className="ws__input"
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            onBlur={() => {
              if (rename.trim() && rename !== current.name) {
                void renameWorkspace(current.id, rename.trim());
              }
            }}
          />
        </label>
        <p className="ws__path" title={current.rootPath}>
          {current.rootPath}
        </p>

        <div className="ws__subhead">
          <span>Projects</span>
          <button type="button" className="btn btn--ghost" onClick={() => void addProject()}>
            <Plus size={12} /> Add
          </button>
        </div>
        {current.projects.length === 0 ? (
          <p className="muted ws__hint">Single-project workspace.</p>
        ) : (
          <ul className="ws__list">
            {current.projects.map((p) => (
              <li key={p.path} className="ws__row">
                <span className="ws__row-main">
                  <Folder size={13} className="ws__row-ico" />
                  <span className="ws__row-name">{p.name}</span>
                </span>
                <button
                  type="button"
                  className="iconbtn"
                  title="Remove project"
                  onClick={() => void removeProject(p.path)}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="ws__subhead">
          <span>Settings</span>
        </div>
        <label className="field">
          <span>Preferred terminal</span>
          <select
            className="ws__input"
            value={settings.preferredTerminal}
            onChange={(e) =>
              void updateSettings({
                preferredTerminal: e.target.value as Settings["preferredTerminal"],
              })
            }
          >
            <option value="system">System</option>
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
            <option value="git-bash">Git Bash</option>
          </select>
        </label>
        <label className="field">
          <span>Default skill tab</span>
          <select
            className="ws__input"
            value={settings.defaultSkillTab}
            onChange={(e) =>
              void updateSettings({ defaultSkillTab: e.target.value as "files" | "info" })
            }
          >
            <option value="files">Files</option>
            <option value="info">Info</option>
          </select>
        </label>
      </Section>

      {recent.length > 0 && (
        <Section icon={Clock} title="Recent Workspaces">
          <ul className="ws__list">
            {recent.slice(0, 8).map((r) => (
              <li key={r.id} className="ws__row">
                <button
                  type="button"
                  className="ws__row-main"
                  onClick={() => void openRecent(r.path)}
                >
                  <Clock size={13} className="ws__row-ico" />
                  <span className="ws__row-name">{r.name}</span>
                </button>
                <button
                  type="button"
                  className="iconbtn"
                  title="Remove from recents"
                  onClick={() => void removeRecent(r.path)}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        icon={Bookmark}
        title="Sessions"
        action={
          <button
            type="button"
            className="btn btn--ghost"
            title="Save current session"
            onClick={() => void saveSession(sessionName.trim() || "Session")}
          >
            <Save size={12} /> Save
          </button>
        }
      >
        <input
          className="ws__input"
          placeholder="Session name"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
        />
        {sessions.length > 0 ? (
          <ul className="ws__list ws__list--mt">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        ) : (
          <p className="muted ws__hint">No saved sessions yet.</p>
        )}
      </Section>

      <Section icon={History} title="Memory">
        {memory.entries.length > 0 && (
          <div className="ws__memory">
            {memory.entries.map((e) => (
              <MemoryRow key={e.id} entry={e} />
            ))}
          </div>
        )}
        <div className="ws__memory-add">
          <input
            className="ws__input"
            placeholder="key"
            value={memKey}
            onChange={(e) => setMemKey(e.target.value)}
          />
          <input
            className="ws__input"
            placeholder="value"
            value={memVal}
            onChange={(e) => setMemVal(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--primary"
            disabled={!memKey.trim()}
            onClick={() => {
              if (!memKey.trim()) return;
              void setMemory(memKey.trim(), memVal);
              setMemKey("");
              setMemVal("");
            }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </Section>

      {templates.length > 0 && (
        <Section icon={Star} title="Templates">
          <div className="ws__templates">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
