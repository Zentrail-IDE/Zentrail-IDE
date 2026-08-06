import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TerminalSquare } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useTerminal } from "../state/terminalStore";
import { useWorkspace } from "../state/workspaceStore";
import { defaultProfiles } from "@zentrail/terminal";

/** Full-page terminal for AI Runtime — just a terminal, nothing else. */
export function AiPanel() {
  const root = useWorkspace((s) => s.root);
  const sessions = useTerminal((s) => s.sessions);
  const order = useTerminal((s) => s.order);
  const activeId = useTerminal((s) => s.activeId);
  const spawn = useTerminal((s) => s.spawn);
  const write = useTerminal((s) => s.write);

  // Spawn a dedicated AI terminal on first mount
  useEffect(() => {
    const hasAi = order.some((id) => sessions[id]?.profile.name === "AI Runtime");
    if (!hasAi) {
      const profile = { ...defaultProfiles()[0], name: "AI Runtime" };
      void spawn(profile, root ?? "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the AI session
  const aiId = order.find((id) => sessions[id]?.profile.name === "AI Runtime") ?? activeId ?? order[0];
  const session = aiId ? sessions[aiId] : null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session?.lines.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [aiId]);

  if (!session || !aiId) {
    return (
      <div className="airt">
        <div className="airt__boot">
          <TerminalSquare size={28} className="muted" />
          <p className="muted">Starting AI terminal...</p>
        </div>
      </div>
    );
  }

  const currentSession = session;
  const currentId = aiId;
  const prompt = currentSession.profile.shell === "powershell" || currentSession.profile.shell === "cmd"
    ? "PS> "
    : "$ ";

  function submit() {
    if (currentSession.status === "exited" || currentSession.status === "killed") return;
    write(currentId, value + "\n");
    setValue("");
    setCursor(0);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setValue("");
      setCursor(0);
    } else if (e.key === "ArrowLeft") {
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "ArrowRight") {
      setCursor((c) => Math.min(value.length, c + 1));
    } else if (e.key === "Home") {
      setCursor(0);
    } else if (e.key === "End") {
      setCursor(value.length);
    }
  }

  return (
    <div className="airt" onClick={() => inputRef.current?.focus()}>
      <div className="airt__output" ref={scrollRef}>
        {currentSession.lines.map((line) => (
          <div key={line.id} className={cn("airt__line", `is-${line.stream}`)}>
            {line.text}
          </div>
        ))}
      </div>
      <div className="airt__input-row">
        <span className="airt__prompt">{prompt}</span>
        <input
          ref={inputRef}
          className="airt__input"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          value={value}
          placeholder={currentSession.status === "running" ? "Type a command..." : "terminal closed"}
          disabled={currentSession.status !== "running"}
          onChange={(e) => {
            setValue(e.target.value);
            setCursor(e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyDown={handleKey}
          onFocus={(e) => {
            e.target.selectionStart = cursor;
            e.target.selectionEnd = cursor;
          }}
        />
      </div>
    </div>
  );
}
