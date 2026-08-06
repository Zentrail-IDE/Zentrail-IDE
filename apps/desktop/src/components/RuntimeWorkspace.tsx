import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus,
  X,
  Minus,
  Pin,
  PinOff,
  Trash2,
  RotateCcw,
  Square,
  Send,
  Sparkles,
  Bot,
  ChevronDown,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useRuntime } from "../state/runtimeStore";
import type { PanelLayout } from "@zentrail/agent";
import { gridCols, gridRowCount } from "@zentrail/agent";

/** Full-page multi-agent runtime workspace. */
export function RuntimeWorkspace() {
  const panels = useRuntime((s) => s.panels);
  const panelOrder = useRuntime((s) => s.panelOrder);
  const addingAgent = useRuntime((s) => s.addingAgent);
  const setAddingAgent = useRuntime((s) => s.setAddingAgent);
  const loadAgents = useRuntime((s) => s.loadAgents);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const sorted = panelOrder
    .map((id) => panels.find((p) => p.id === id))
    .filter(Boolean) as PanelLayout[];

  const cols = gridCols(sorted.length);
  const rows = gridRowCount(sorted.length);

  return (
    <div className="rt">
      {sorted.length === 0 && !addingAgent && (
        <div className="rt__empty">
          <Sparkles size={40} className="muted" />
          <h3>AI Runtime Workspace</h3>
          <p className="muted">
            Open AI agents to run them in parallel dockable panels.
          </p>
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => setAddingAgent(true)}
          >
            <Plus size={14} /> Add Agent
          </button>
        </div>
      )}

      {addingAgent && <AgentPicker />}

      {sorted.length > 0 && (
        <div
          className="rt__grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {sorted.map((panel) => (
            <AgentPanel key={panel.id} panel={panel} />
          ))}
          <button
            className="rt__add-fab"
            type="button"
            title="Add Agent"
            onClick={() => setAddingAgent(true)}
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Picker
// ---------------------------------------------------------------------------

function AgentPicker() {
  const agents = useRuntime((s) => s.agents);
  const openAgent = useRuntime((s) => s.openAgent);
  const setAddingAgent = useRuntime((s) => s.setAddingAgent);

  return (
    <div className="rt__picker">
      <div className="rt__picker-header">
        <h3>Add Agent</h3>
        <button
          className="iconbtn"
          type="button"
          onClick={() => setAddingAgent(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="rt__picker-grid">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className="rt__picker-card"
            type="button"
            onClick={() => {
              openAgent(agent.id);
              setAddingAgent(false);
            }}
          >
            <span className="rt__picker-icon" style={{ background: agent.color }}>
              {agent.icon}
            </span>
            <div className="rt__picker-info">
              <span className="rt__picker-name">{agent.name}</span>
              <span className="muted">{agent.provider} · {agent.model}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Panel
// ---------------------------------------------------------------------------

function AgentPanel({ panel }: { panel: PanelLayout }) {
  const agent = useRuntime((s) => s.agents.find((a) => a.id === panel.agentId));
  const session = useRuntime((s) => s.sessions[panel.agentId]);
  const activePanelId = useRuntime((s) => s.activePanelId);
  const setActivePanel = useRuntime((s) => s.setActivePanel);
  const closePanel = useRuntime((s) => s.closePanel);
  const toggleCollapse = useRuntime((s) => s.toggleCollapse);
  const togglePin = useRuntime((s) => s.togglePin);
  const stopAgent = useRuntime((s) => s.stopAgent);
  const restartAgent = useRuntime((s) => s.restartAgent);
  const clearMessages = useRuntime((s) => s.clearMessages);

  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = activePanelId === panel.id;

  // Auto-scroll
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session?.messages.length]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !agent) return;
    useRuntime.getState().sendMessage(agent.id, input.trim());
    setInput("");
  }, [input, agent]);

  if (!agent || !session) return null;

  const statusColor =
    session.status === "running"
      ? "var(--success)"
      : session.status === "error"
        ? "var(--error)"
        : "var(--muted)";

  const statusLabel =
    session.status === "running"
      ? "Running"
      : session.status === "error"
        ? "Error"
        : session.status === "stopped"
          ? "Stopped"
          : "Idle";

  return (
    <div
      className={cn("rt__panel", isActive && "rt__panel--active", panel.collapsed && "rt__panel--collapsed")}
      onClick={() => setActivePanel(panel.id)}
      role="tabpanel"
    >
      {/* Header */}
      <div className="rt__panel-header">
        <div className="rt__panel-title">
          <span className="rt__panel-icon" style={{ background: agent.color }}>
            {agent.icon}
          </span>
          <div className="rt__panel-names">
            <span className="rt__panel-agent">{agent.name}</span>
            <span className="muted rt__panel-model">{agent.model}</span>
          </div>
        </div>

        <div className="rt__panel-status">
          <span className="rt__conn-dot" style={{ background: statusColor }} />
          <span className="muted">{statusLabel}</span>
        </div>

        <div className="rt__panel-actions">
          <div className="rt__menu-wrap" ref={menuRef}>
            <button
              className="iconbtn"
              type="button"
              title="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <ChevronDown size={13} />
            </button>
            {menuOpen && (
              <div className="rt__menu">
                <button type="button" onClick={() => { toggleCollapse(panel.id); setMenuOpen(false); }}>
                  <Minus size={12} /> {panel.collapsed ? "Expand" : "Collapse"}
                </button>
                <button type="button" onClick={() => { togglePin(panel.id); setMenuOpen(false); }}>
                  {panel.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                  {panel.pinned ? "Unpin" : "Pin"}
                </button>
                <button type="button" onClick={() => { clearMessages(agent.id); setMenuOpen(false); }}>
                  <Trash2 size={12} /> Clear
                </button>
                <button type="button" onClick={() => { restartAgent(agent.id); setMenuOpen(false); }}>
                  <RotateCcw size={12} /> Restart
                </button>
                <button
                  type="button"
                  className="rt__menu-danger"
                  onClick={() => { stopAgent(agent.id); setMenuOpen(false); }}
                >
                  <Square size={12} /> Stop
                </button>
              </div>
            )}
          </div>
          <button
            className="iconbtn"
            type="button"
            title="Close"
            onClick={() => closePanel(panel.id)}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!panel.collapsed && (
        <>
          <div className="rt__panel-body" ref={outputRef}>
            {session.messages.length === 0 && (
              <div className="rt__panel-empty">
                <Bot size={24} className="muted" />
                <p className="muted">Ready — type a command below</p>
              </div>
            )}
            {session.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("rt__msg", `rt__msg--${msg.role}`)}
              >
                {msg.role === "user" && <span className="rt__msg-label">You</span>}
                {msg.role === "assistant" && (
                  <span className="rt__msg-label rt__msg-label--ai">
                    {agent.icon} {agent.name}
                  </span>
                )}
                {msg.role === "tool" && (
                  <span className="rt__msg-label rt__msg-label--tool">
                    🔧 {msg.toolName ?? "Tool"}
                  </span>
                )}
                <div className="rt__msg-content">{msg.content}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="rt__panel-footer">
            <input
              ref={inputRef}
              className="rt__panel-input"
              placeholder={`Ask ${agent.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {session.status === "running" ? (
              <button
                className="rt__send-btn rt__send-btn--stop"
                type="button"
                title="Stop"
                onClick={() => stopAgent(agent.id)}
              >
                <Square size={13} />
              </button>
            ) : (
              <button
                className={cn("rt__send-btn", !input.trim() && "is-disabled")}
                type="button"
                title="Send"
                disabled={!input.trim()}
                onClick={handleSend}
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
