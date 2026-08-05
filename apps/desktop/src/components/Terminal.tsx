import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, X, TerminalSquare, Trash2 } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useTerminal } from "../state/terminalStore";
import { useUi } from "../state/uiStore";
import { useWorkspace } from "../state/workspaceStore";
import {
  defaultProfiles,
  shellLabel,
  type ShellKind,
  type TerminalProfile,
} from "@zentrail/terminal";

/** Bottom dock hosting one or more interactive terminal sessions. */
export function Terminal() {
  const open = useUi((s) => s.terminalOpen);
  const toggleTerminal = useUi((s) => s.toggleTerminal);
  const root = useWorkspace((s) => s.root);

  const sessions = useTerminal((s) => s.sessions);
  const order = useTerminal((s) => s.order);
  const activeId = useTerminal((s) => s.activeId);
  const spawn = useTerminal((s) => s.spawn);
  const setActive = useTerminal((s) => s.setActive);
  const close = useTerminal((s) => s.close);

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (order.length === 0 && root) {
      void spawn(defaultProfiles()[0], root);
    }
  }, [root, order.length, spawn]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  if (!open) return null;

  async function startSession(shell: ShellKind) {
    setPickerOpen(false);
    const profile: TerminalProfile = defaultProfiles().find((p) => p.shell === shell) ?? {
      id: crypto.randomUUID(),
      name: shellLabel(shell),
      shell,
    };
    await spawn(profile, root ?? "");
  }

  return (
    <section className="terminal" aria-label="Integrated terminal">
      <div className="terminal__bar">
        <div className="terminal__tabs" role="tablist">
          {order.map((id) => {
            const session = sessions[id];
            if (!session) return null;
            return (
              <div
                key={id}
                role="tab"
                aria-selected={id === activeId}
                className={cn("terminal__tab", id === activeId && "is-active")}
                onClick={() => setActive(id)}
              >
                <TerminalSquare size={13} className="terminal__tab-ico" />
                <span>{session.title}</span>
                <button
                  type="button"
                  className="terminal__tab-close"
                  aria-label={`Close ${session.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void close(id);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="terminal__actions">
          <div className="terminal__picker" ref={pickerRef}>
            <button
              type="button"
              className="iconbtn"
              title="New terminal"
              aria-label="New terminal"
              onClick={() => setPickerOpen((v) => !v)}
            >
              <Plus size={15} />
            </button>
            {pickerOpen && (
              <div className="terminal__menu" role="menu">
                {(["system", "powershell", "cmd", "git-bash"] as ShellKind[]).map((shell) => (
                  <button
                    key={shell}
                    type="button"
                    role="menuitem"
                    className="terminal__menu-item"
                    onClick={() => void startSession(shell)}
                  >
                    {shellLabel(shell)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="iconbtn"
            title="Close panel"
            aria-label="Close terminal panel"
            onClick={toggleTerminal}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {activeId && sessions[activeId] ? (
        <TerminalView sessionId={activeId} cwd={root ?? ""} />
      ) : (
        <div className="terminal__empty muted">
          No terminal open. Use <kbd>+</kbd> to start one.
        </div>
      )}
    </section>
  );
}

function TerminalView({ sessionId, cwd }: { sessionId: string; cwd: string }) {
  const session = useTerminal((s) => s.sessions[sessionId]);
  const write = useTerminal((s) => s.write);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session?.lines.length]);

  if (!session) return null;

  function submit() {
    if (session.status === "exited" || session.status === "killed") return;
    write(sessionId, value + "\n");
    setValue("");
  }

  return (
    <div className="terminal__body">
      <div className="terminal__output" ref={scrollRef}>
        {session.lines.map((line) => (
          <div key={line.id} className={cn("terminal__line", `is-${line.stream}`)}>
            {line.text}
          </div>
        ))}
        {session.status !== "running" && (
          <div className="terminal__line is-system">
            [process {session.status}
            {session.exitCode !== null ? `, exit code ${session.exitCode}` : ""}]
          </div>
        )}
      </div>
      <div className="terminal__input">
        <input
          ref={inputRef}
          value={value}
          spellCheck={false}
          autoComplete="off"
          placeholder={session.status === "running" ? cwd : "terminal closed"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              setValue("");
            }
          }}
        />
      </div>
    </div>
  );
}
