import { useEffect, useState } from "react";
import {
  Bot,
  Play,
  Square,
  Pause,
  RotateCcw,
  Send,
  Radio,
  Clock,
  Brain,
  Cpu,
  Activity,
  Plus,
  Trash2,
  MessageSquare,
  Users,
  Megaphone,
  Gauge,
  HardDrive,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useAgent } from "../state/agentStore";
import type {
  AgentConfig,
  AgentMemoryEntry,
  AgentMetrics,
  AgentLifecycle,
} from "@zentrail/agent";
import {
  createAgentConfig,
  createAgentMemoryEntry,
} from "@zentrail/agent";

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Bot;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="agent__section">
      <header className="agent__section-head">
        <span className="agent__section-title">
          <Icon size={13} /> {title}
        </span>
        {action}
      </header>
      <div className="agent__section-body">{children}</div>
    </section>
  );
}

const HEALTH_COLOR: Record<string, string> = {
  healthy: "var(--success)",
  degraded: "var(--warning)",
  down: "var(--error)",
};

function fmtUptime(sec: number): string {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** Workspace Agent manager (Phase 6) shown in the activity sidebar. */
export function AgentPanel() {
  const agents = useAgent((s) => s.agents);
  const selectedAgentId = useAgent((s) => s.selectedAgentId);
  const selectAgent = useAgent((s) => s.selectAgent);
  const loadAll = useAgent((s) => s.loadAll);
  const loading = useAgent((s) => s.loading);
  const instances = useAgent((s) => s.instances);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const agent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const lifecycle: AgentLifecycle = agent
    ? (instances[agent.id]?.lifecycle ?? "created")
    : "created";

  return (
    <div className="agent">
      <Section
        icon={Bot}
        title="Agent Manager"
        action={
          <button
            type="button"
            className="btn btn--ghost"
            title="Add agent"
            onClick={() => {
              const name = window.prompt("Agent name")?.trim();
              if (!name) return;
              const cfg = createAgentConfig(
                name,
                "custom",
                "local",
                "local",
                "",
              );
              void useAgent.getState().saveAgent(cfg);
            }}
          >
            <Plus size={12} /> New
          </button>
        }
      >
        {loading && agents.length === 0 ? (
          <p className="muted agent__hint">Loading agents…</p>
        ) : agents.length === 0 ? (
          <p className="muted agent__hint">No agents yet.</p>
        ) : (
          <ul className="agent__list">
            {agents.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "agent__row",
                  a.id === selectedAgentId && "agent__row--active",
                )}
              >
                <button
                  type="button"
                  className="agent__row-main"
                  onClick={() => selectAgent(a.id)}
                >
                  <span
                    className="agent__row-icon"
                    style={{ background: a.color }}
                  >
                    {a.icon}
                  </span>
                  <span className="agent__row-name">{a.name}</span>
                  <AgentStatusDot agentId={a.id} />
                </button>
                <button
                  type="button"
                  className="iconbtn"
                  title="Delete agent"
                  onClick={() => void useAgent.getState().deleteAgent(a.id)}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {agent && (
        <AgentDetail agent={agent} lifecycle={lifecycle} />
      )}
    </div>
  );
}

function AgentStatusDot({ agentId }: { agentId: string }) {
  const instances = useAgent((s) => s.instances);
  const lifecycle = instances[agentId]?.lifecycle ?? "created";
  const color =
    lifecycle === "running"
      ? "var(--success)"
      : lifecycle === "paused" || lifecycle === "starting"
        ? "var(--warning)"
        : lifecycle === "error"
          ? "var(--error)"
          : "var(--muted)";
  return (
    <span
      className="agent__status-dot"
      style={{ background: color }}
      title={lifecycle}
    />
  );
}

function AgentDetail({
  agent,
  lifecycle,
}: {
  agent: AgentConfig;
  lifecycle: AgentLifecycle;
}) {
  const start = useAgent((s) => s.startAgent);
  const stop = useAgent((s) => s.stopAgent);
  const pause = useAgent((s) => s.pauseAgent);
  const resume = useAgent((s) => s.resumeAgent);

  return (
    <>
      <Section icon={Gauge} title={`${agent.name} · Lifecycle`}>
        <div className="agent__lifecycle">
          <span
            className={cn(
              "agent__badge",
              `agent__badge--${lifecycle}`,
            )}
          >
            {lifecycle}
          </span>
          <div className="agent__lifecycle-actions">
            {lifecycle === "running" ? (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void pause(agent.id)}
                >
                  <Pause size={12} /> Pause
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => void stop(agent.id)}
                >
                  <Square size={12} /> Stop
                </button>
              </>
            ) : lifecycle === "paused" ? (
              <>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void resume(agent.id)}
                >
                  <Play size={12} /> Resume
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => void stop(agent.id)}
                >
                  <Square size={12} /> Stop
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void start(agent.id)}
              >
                <Play size={12} /> Start
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void stop(agent.id).then(() => start(agent.id))}
              title="Restart"
            >
              <RotateCcw size={12} /> Restart
            </button>
          </div>
        </div>
        <p className="muted agent__meta">
          {agent.role} · {agent.provider} · {agent.model}
        </p>
      </Section>

      <CommunicationSection agent={agent} />
      <SchedulerSection agent={agent} />
      <MemorySection agent={agent} />
      <BackgroundSection agent={agent} />
      <MonitoringSection agent={agent} />
    </>
  );
}

function CommunicationSection({ agent }: { agent: AgentConfig }) {
  const agents = useAgent((s) => s.agents);
  const messages = useAgent((s) => s.messages);
  const sendMessage = useAgent((s) => s.sendMessage);
  const broadcast = useAgent((s) => s.broadcast);

  const [text, setText] = useState("");
  const [target, setTarget] = useState<string>("broadcast");

  const related = messages.filter(
    (m) => m.fromAgentId === agent.id || m.toAgentId === agent.id,
  );

  const submit = () => {
    if (!text.trim()) return;
    if (target === "broadcast") {
      void broadcast(agent.id, text.trim());
    } else {
      void sendMessage(agent.id, text.trim(), target === "none" ? null : target, "task");
    }
    setText("");
  };

  return (
    <Section icon={MessageSquare} title="Communication">
      <div className="agent__comm">
        <textarea
          className="agent__textarea"
          placeholder={`Message from ${agent.name}…`}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="agent__comm-row">
          <select
            className="agent__input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="broadcast">🌐 Broadcast (all)</option>
            <option value="none">Direct (no target)</option>
            {agents
              .filter((a) => a.id !== agent.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  → {a.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!text.trim()}
            onClick={submit}
          >
            <Send size={12} /> Send
          </button>
        </div>
      </div>
      {related.length > 0 && (
        <ul className="agent__messages">
          {related
            .slice(-12)
            .reverse()
            .map((m) => (
              <li key={m.id} className="agent__message">
                <span className="agent__msg-meta">
                  {m.kind === "broadcast" ? (
                    <Megaphone size={11} />
                  ) : (
                    <Users size={11} />
                  )}{" "}
                  {m.kind}
                </span>
                <span className="agent__msg-content">{m.content}</span>
              </li>
            ))}
        </ul>
      )}
    </Section>
  );
}

function SchedulerSection({ agent }: { agent: AgentConfig }) {
  const schedules = useAgent((s) => s.schedules);
  const scheduleTask = useAgent((s) => s.scheduleTask);
  const cancelSchedule = useAgent((s) => s.cancelSchedule);
  const runSchedule = useAgent((s) => s.runSchedule);

  const [name, setName] = useState("");
  const [cron, setCron] = useState("*/15 * * * *");
  const [task, setTask] = useState("");

  const mine = schedules.filter((s) => s.agentId === agent.id);

  const add = () => {
    if (!name.trim() || !task.trim()) return;
    void scheduleTask(
      createSchedule(agent.id, name.trim(), cron.trim(), task.trim()),
    );
    setName("");
    setTask("");
  };

  return (
    <Section icon={Clock} title="Scheduler">
      <div className="agent__fields">
        <input
          className="agent__input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="agent__input"
          placeholder="cron (e.g. */15 * * * *)"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
        />
        <input
          className="agent__input"
          placeholder="Task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!name.trim() || !task.trim()}
          onClick={add}
        >
          <Plus size={12} /> Schedule
        </button>
      </div>
      {mine.length > 0 ? (
        <ul className="agent__list">
          {mine.map((s) => (
            <li key={s.id} className="agent__row">
              <div className="agent__schedule">
                <span className="agent__row-name">{s.name}</span>
                <span className="muted agent__schedule-cron">
                  {s.cron} · next {fmtTime(s.nextRunAt)}
                </span>
                <span className="muted">runs: {s.runCount}</span>
              </div>
              <div className="agent__row-actions">
                <button
                  type="button"
                  className="iconbtn"
                  title="Run now"
                  onClick={() => void runSchedule(s.id)}
                >
                  <Play size={12} />
                </button>
                <button
                  type="button"
                  className="iconbtn"
                  title="Cancel"
                  onClick={() => void cancelSchedule(s.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted agent__hint">No scheduled tasks.</p>
      )}
    </Section>
  );
}

function createSchedule(
  agentId: string,
  name: string,
  cron: string,
  task: string,
) {
  // Local factory so we don't depend on the package's randomUUID at call sites.
  return {
    id: crypto.randomUUID(),
    agentId,
    name,
    cron,
    task,
    enabled: true,
    nextRunAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    lastRunAt: null,
    runCount: 0,
  };
}

function MemorySection({ agent }: { agent: AgentConfig }) {
  const memory = useAgent((s) => s.memory[agent.id] ?? []);
  const saveMemory = useAgent((s) => s.saveMemory);
  const deleteMemory = useAgent((s) => s.deleteMemory);

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const add = () => {
    if (!key.trim()) return;
    void saveMemory(
      createAgentMemoryEntry(agent.id, key.trim(), value, "fact"),
    );
    setKey("");
    setValue("");
  };

  return (
    <Section icon={Brain} title="Memory">
      {memory.length > 0 && (
        <div className="agent__memory">
          {memory.map((e) => (
            <MemoryRow
              key={e.id}
              entry={e}
              onSave={(next) => void saveMemory(next)}
              onDelete={() => void deleteMemory(e.id)}
            />
          ))}
        </div>
      )}
      <div className="agent__fields">
        <input
          className="agent__input"
          placeholder="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          className="agent__input"
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!key.trim()}
          onClick={add}
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </Section>
  );
}

function MemoryRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: AgentMemoryEntry;
  onSave: (next: AgentMemoryEntry) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(entry.value);
  useEffect(() => setValue(entry.value), [entry.value]);

  return (
    <div className="agent__memory-row">
      <span className="agent__memory-key" title={entry.key}>
        {entry.key}
      </span>
      <textarea
        className="agent__memory-input"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== entry.value) {
            onSave({ ...entry, value });
          }
        }}
      />
      <button type="button" className="iconbtn" title="Remove" onClick={onDelete}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function BackgroundSection({ agent }: { agent: AgentConfig }) {
  const background = useAgent((s) =>
    s.background.filter((b) => b.agentId === agent.id),
  );
  const startBackground = useAgent((s) => s.startBackground);
  const [task, setTask] = useState("");

  const add = () => {
    if (!task.trim()) return;
    void startBackground(agent.id, task.trim());
    setTask("");
  };

  return (
    <Section icon={Radio} title="Background Agents">
      <div className="agent__comm-row">
        <input
          className="agent__input"
          placeholder="Background task…"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!task.trim()}
          onClick={add}
        >
          <Plus size={12} /> Run
        </button>
      </div>
      {background.length > 0 ? (
        <ul className="agent__list">
          {background
            .slice(-8)
            .reverse()
            .map((b) => (
              <li key={b.id} className="agent__row">
                <div className="agent__schedule">
                  <span className="agent__row-name">{b.task}</span>
                  <span
                    className={cn(
                      "agent__badge",
                      `agent__badge--${b.status}`,
                    )}
                  >
                    {b.status}
                  </span>
                </div>
                <span className="muted">{fmtTime(b.startedAt)}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="muted agent__hint">No background runs.</p>
      )}
    </Section>
  );
}

function MonitoringSection({ agent }: { agent: AgentConfig }) {
  const metrics = useAgent((s) => s.metrics[agent.id]);
  const m: AgentMetrics = metrics ?? {
    agentId: agent.id,
    health: "down",
    cpuUsage: 0,
    memUsage: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    messagesSent: 0,
    uptimeSec: 0,
    lastActivity: null,
  };

  return (
    <Section icon={Activity} title="Monitoring">
      <div className="agent__monitor">
        <div className="agent__metric">
          <Cpu size={13} className="muted" />
          <span className="muted">CPU</span>
          <strong>{m.cpuUsage.toFixed(1)}%</strong>
        </div>
        <div className="agent__metric">
          <HardDrive size={13} className="muted" />
          <span className="muted">MEM</span>
          <strong>{m.memUsage.toFixed(0)} MB</strong>
        </div>
        <div className="agent__metric">
          <Activity size={13} className="muted" />
          <span className="muted">Tasks</span>
          <strong>{m.tasksCompleted}</strong>
        </div>
        <div className="agent__metric">
          <MessageSquare size={13} className="muted" />
          <span className="muted">Msgs</span>
          <strong>{m.messagesSent}</strong>
        </div>
        <div className="agent__metric">
          <Clock size={13} className="muted" />
          <span className="muted">Uptime</span>
          <strong>{fmtUptime(m.uptimeSec)}</strong>
        </div>
      </div>
      <div className="agent__health">
        <span className="muted">Health</span>
        <span
          className="agent__health-dot"
          style={{ background: HEALTH_COLOR[m.health] ?? "var(--muted)" }}
        />
        <strong>{m.health}</strong>
      </div>
    </Section>
  );
}
