import { useEffect } from "react";
import {
  GitBranch as GitBranchIcon,
  GitCommit,
  GitPullRequestArrow,
  GitMerge,
  RefreshCw,
  Plus,
  Check,
  FilePlus2,
  Trash2,
  AlertCircle,
  History,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useGit } from "../state/gitStore";
import { useWorkspace } from "../state/workspaceStore";
import {
  splitChanges,
  formatCommitDate,
  formatRefs,
  STATUS_LABELS,
  type GitFileStatus,
} from "@zentrail/git";

/** Sidebar panel for Git: status, commit, history, and branch management. */
export function GitPanel() {
  const root = useWorkspace((s) => s.root);
  const setRoot = useGit((s) => s.setRoot);
  const exists = useGit((s) => s.exists);
  const loading = useGit((s) => s.loading);
  const error = useGit((s) => s.error);
  const gitState = useGit((s) => s.state);
  const refresh = useGit((s) => s.refresh);
  const init = useGit((s) => s.init);

  useEffect(() => {
    setRoot(root);
  }, [root, setRoot]);

  if (!root) {
    return (
      <div className="panel">
        <h2 className="panel__title">Source Control</h2>
        <p className="muted">Open a folder to use Git.</p>
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="panel">
        <h2 className="panel__title">Source Control</h2>
        <p className="muted">
          The current folder is not a Git repository. Initialize one to start tracking changes.
        </p>
        <button className="btn btn--primary" type="button" onClick={() => void init()}>
          <GitBranchIcon size={14} /> Initialize Repository
        </button>
      </div>
    );
  }

  return (
    <div className="git">
      <div className="git__header">
        <span className="git__branch">
          <GitBranchIcon size={13} className="accent" />
          {gitState?.branch ?? "—"}
        </span>
        <button className="iconbtn" type="button" title="Refresh" onClick={() => void refresh()}>
          <RefreshCw size={13} className={cn(loading && "is-spin")} />
        </button>
      </div>

      {error && (
        <p className="git__error">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <SyncBar />
      <CommitBox />
      <ChangesList />
      <HistoryList />
      <BranchList />
    </div>
  );
}

function SyncBar() {
  const state = useGit((s) => s.state);
  const remotes = useGit((s) => s.remotes);
  const pull = useGit((s) => s.pull);
  const push = useGit((s) => s.push);
  const remote = remotes[0]?.name;

  if (!state) return null;
  const dirty = state.changes.length > 0;

  return (
    <div className="git__sync">
      <span className="git__sync-meta">
        {state.ahead > 0 && <span className="badge badge--ahead">↑{state.ahead}</span>}
        {state.behind > 0 && <span className="badge badge--behind">↓{state.behind}</span>}
        {!dirty && state.ahead === 0 && state.behind === 0 && (
          <span className="muted git__clean">Working tree clean</span>
        )}
      </span>
      <div className="git__sync-actions">
        <button
          className="iconbtn"
          type="button"
          title="Pull"
          onClick={() => void pull(remote)}
        >
          <GitPullRequestArrow size={14} />
        </button>
        <button
          className="iconbtn"
          type="button"
          title="Push"
          onClick={() => void push(remote)}
        >
          <GitCommit size={14} />
        </button>
      </div>
    </div>
  );
}

function CommitBox() {
  const message = useGit((s) => s.commitMessage);
  const setMessage = useGit((s) => s.setCommitMessage);
  const commit = useGit((s) => s.commit);
  const state = useGit((s) => s.state);
  const selection = useGit((s) => s.selection);
  const hasSelection = Object.values(selection).some(Boolean);

  if (!state) return null;
  const disabled = !message.trim() || state.changes.length === 0;

  return (
    <div className="git__commit">
      <textarea
        className="git__commit-msg"
        placeholder="Message (commit staged changes)"
        value={message}
        rows={3}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        className="btn btn--primary git__commit-btn"
        type="button"
        disabled={disabled}
        onClick={() => void commit(!hasSelection)}
      >
        <Check size={14} /> Commit
        {hasSelection ? " Selection" : " All"}
      </button>
    </div>
  );
}

function ChangesList() {
  const state = useGit((s) => s.state);
  const toggleSelection = useGit((s) => s.toggleSelection);
  const stageAll = useGit((s) => s.stageAll);
  const unstageAll = useGit((s) => s.unstageAll);
  const stagePaths = useGit((s) => s.stagePaths);
  const unstagePaths = useGit((s) => s.unstagePaths);

  if (!state) return null;
  const { staged, unstaged } = splitChanges(state.changes);

  return (
    <div className="git__section">
      <div className="git__section-head">
        <span>Changes {state.changes.length > 0 && `(${state.changes.length})`}</span>
        <div className="git__section-actions">
          {unstaged.length > 0 && (
            <button
              className="iconbtn"
              type="button"
              title="Stage all"
              onClick={() => void stageAll()}
            >
              <Plus size={13} />
            </button>
          )}
          {staged.length > 0 && (
            <button
              className="iconbtn"
              type="button"
              title="Unstage all"
              onClick={() => void unstageAll()}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {state.changes.length === 0 && <p className="muted git__empty">No changes</p>}

      {staged.length > 0 && (
        <ul className="git__changes">
          {staged.map((c) => (
            <ChangeRow
              key={`s-${c.path}`}
              change={c}
              checked
              onToggle={() => toggleSelection(c.path)}
              onPrimary={() => void unstagePaths([c.path])}
            />
          ))}
        </ul>
      )}

      {unstaged.length > 0 && (
        <ul className="git__changes">
          {unstaged.map((c) => (
            <ChangeRow
              key={`u-${c.path}`}
              change={c}
              checked={false}
              onToggle={() => toggleSelection(c.path)}
              onPrimary={() => void stagePaths([c.path])}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ChangeRow({
  change,
  checked,
  onToggle,
  onPrimary,
}: {
  change: GitFileStatus;
  checked: boolean;
  onToggle: () => void;
  onPrimary: () => void;
}) {
  return (
    <li className="git__change">
      <button
        type="button"
        className={cn("git__check", checked && "is-checked")}
        aria-label={checked ? "Unstage" : "Stage"}
        aria-pressed={checked}
        onClick={onToggle}
      >
        {checked ? <Check size={12} /> : <FilePlus2 size={12} />}
      </button>
      <button type="button" className="git__change-main" onClick={onPrimary} title={change.path}>
        <span className="git__change-name">{change.path}</span>
        <span className={cn("git__badge", `git__badge--${change.status}`)}>
          {STATUS_LABELS[change.status]}
        </span>
      </button>
    </li>
  );
}

function HistoryList() {
  const log = useGit((s) => s.log);
  if (log.length === 0) return null;

  return (
    <div className="git__section">
      <div className="git__section-head">
        <span>
          <History size={12} className="git__inline-ico" /> Commit History
        </span>
      </div>
      <ul className="git__log">
        {log.map((entry) => (
          <li key={entry.hash} className="git__commit">
            <code className="git__hash">{entry.shortHash}</code>
            <div className="git__commit-body">
              <span className="git__commit-msg">{entry.message}</span>
              <span className="muted git__commit-meta">
                {entry.author} · {formatCommitDate(entry.date)}
                {entry.refs.length > 0 && (
                  <span className="git__refs"> · {formatRefs(entry.refs)}</span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BranchList() {
  const branches = useGit((s) => s.branches);
  const checkout = useGit((s) => s.checkout);
  const merge = useGit((s) => s.merge);

  if (branches.length === 0) return null;

  return (
    <div className="git__section">
      <div className="git__section-head">
        <span>Branches ({branches.length})</span>
      </div>
      <ul className="git__branches">
        {branches.map((b) => (
          <li
            key={b.name}
            className={cn("git__branch-row", b.current && "is-current")}
          >
            <button
              type="button"
              className="git__branch-name"
              onClick={() => void checkout(b.name)}
              title={b.current ? "Current branch" : `Checkout ${b.name}`}
            >
              <GitBranchIcon size={13} className={b.current ? "accent" : "muted"} />
              {b.name}
              {b.current && <span className="git__current-tag">current</span>}
            </button>
            {!b.current && (
              <button
                className="iconbtn"
                type="button"
                title={`Merge ${b.name} into current`}
                onClick={() => void merge(b.name)}
              >
                <GitMerge size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
