/**
 * Agent & Runtime domain models.
 *
 * Pure, framework-agnostic types for the multi-agent runtime workspace.
 * No React, DOM, Tauri, or Node imports.
 */

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export type AgentRole =
  | "coder"
  | "planner"
  | "reviewer"
  | "tester"
  | "security"
  | "git"
  | "documentation"
  | "custom";

export type AgentStatus = "idle" | "running" | "error" | "stopped";

export type AgentProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "ollama"
  | "lmstudio"
  | "mcp"
  | "local"
  | "custom";

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  provider: AgentProvider;
  model: string;
  command: string;
  color: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Runtime Session
// ---------------------------------------------------------------------------

export type RuntimeConnection = "connected" | "disconnected" | "connecting";

export interface RuntimeMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  toolName?: string;
  toolArgs?: string;
}

export interface RuntimeSession {
  agentId: string;
  status: AgentStatus;
  connection: RuntimeConnection;
  messages: RuntimeMessage[];
  terminalId: string | null;
  startedAt: string;
  tokenUsage: { prompt: number; completion: number; total: number };
}

// ---------------------------------------------------------------------------
// Panel Layout
// ---------------------------------------------------------------------------

export type DockPosition = "left" | "right" | "top" | "bottom" | "float";

export interface PanelLayout {
  id: string;
  agentId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dock: DockPosition;
  order: number;
  collapsed: boolean;
  pinned: boolean;
  tabGroupId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function nowIso(): string {
  return new Date().toISOString();
}

export function createAgent(
  name: string,
  role: AgentRole,
  provider: AgentProvider,
  model: string,
  command: string,
  color = "#2f81f7",
  icon = "🤖",
): Agent {
  return {
    id: crypto.randomUUID(),
    name,
    role,
    provider,
    model,
    command,
    color,
    icon,
  };
}

export function createSession(agentId: string): RuntimeSession {
  return {
    agentId,
    status: "idle",
    connection: "disconnected",
    messages: [],
    terminalId: null,
    startedAt: nowIso(),
    tokenUsage: { prompt: 0, completion: 0, total: 0 },
  };
}

export function createPanel(
  agentId: string,
  order: number,
): PanelLayout {
  return {
    id: crypto.randomUUID(),
    agentId,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    dock: "float",
    order,
    collapsed: false,
    pinned: false,
    tabGroupId: null,
  };
}

/** Compute grid template based on panel count. */
export function gridTemplate(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "1fr";
  if (count === 2) return "1fr 1fr";
  if (count === 3) return "1fr 1fr 1fr";
  if (count === 4) return "1fr 1fr";
  if (count <= 6) return "1fr 1fr 1fr";
  if (count <= 9) return "1fr 1fr 1fr";
  return "1fr 1fr 1fr 1fr";
}

/** Compute grid rows based on panel count. */
export function gridRows(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "1fr";
  if (count <= 3) return "1fr";
  if (count <= 6) return "1fr 1fr";
  if (count <= 9) return "1fr 1fr 1fr";
  return "1fr 1fr 1fr";
}

/** Number of columns for a given panel count. */
export function gridCols(count: number): number {
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 2;
  return 3;
}

/** Number of rows for a given panel count. */
export function gridRowCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return Math.ceil(count / 4);
}

// ===========================================================================
// Phase 6 — Workspace Agent
// ===========================================================================
//
// The Workspace Agent is the persistent, managed layer on top of the runtime
// agents used by the AI panel. Where the runtime layer (see Agent / RuntimeSession
// above) is ephemeral and tied to a UI panel, the Workspace Agent system owns
// the lifecycle, scheduling, memory and monitoring of long-lived background
// agents across the whole workspace.
//
//   - Agent Manager      : CRUD registry of agent definitions
//   - Agent Lifecycle    : created → starting → running → paused → stopped
//   - Agent Communication : direct messages + broadcast between agents
//   - Agent Scheduler    : cron / interval based task scheduling
//   - Agent Memory       : persistent key/value memory per agent
//   - Background Agents  : detached runs that execute outside the UI
//   - Agent Monitoring   : health & resource metrics per agent

/** Lifecycle states an agent instance moves through. */
export type AgentLifecycle =
  | "created"
  | "starting"
  | "running"
  | "paused"
  | "stopped"
  | "error";

/** Health classification used by the monitoring layer. */
export type AgentHealth = "healthy" | "degraded" | "down";

/** Kind of a cross-agent communication message. */
export type AgentMessageKind = "task" | "result" | "status" | "request" | "broadcast";

/** Persistence + configuration definition of an agent (Agent Manager). */
export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  provider: AgentProvider;
  model: string;
  command: string;
  color: string;
  icon: string;
  description: string;
  tags: string[];
  /** Start automatically when the workspace opens. */
  autoStart: boolean;
  /** Max concurrent background tasks for this agent. */
  maxConcurrent: number;
  /** Scheduling priority (higher runs first). */
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/** A live instance of an agent plus its lifecycle state. */
export interface AgentInstance {
  id: string;
  agentId: string;
  lifecycle: AgentLifecycle;
  startedAt: string | null;
  stoppedAt: string | null;
  lastHeartbeat: string | null;
  error: string | null;
  pid: number | null;
}

/** A message exchanged between agents (Agent Communication). */
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  /** Target agent id; `null` means a broadcast to every agent. */
  toAgentId: string | null;
  kind: AgentMessageKind;
  content: string;
  timestamp: string;
  read: boolean;
}

/** A scheduled task for an agent (Agent Scheduler). */
export interface AgentSchedule {
  id: string;
  agentId: string;
  name: string;
  /** Cron expression or "@every:Nm" / "@every:Ns" interval. */
  cron: string;
  task: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
}

/** A single persistent memory entry for an agent (Agent Memory). */
export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  key: string;
  value: string;
  kind: "fact" | "context" | "instruction" | "result";
  createdAt: string;
  updatedAt: string;
}

/** Status of a detached background run (Background Agents). */
export type BackgroundAgentStatus = "queued" | "running" | "completed" | "failed";

/** A detached background execution of an agent task. */
export interface BackgroundAgentRun {
  id: string;
  agentId: string;
  task: string;
  status: BackgroundAgentStatus;
  startedAt: string;
  finishedAt: string | null;
  logTail: string[];
}

/** Monitoring metrics for a single agent. */
export interface AgentMetrics {
  agentId: string;
  health: AgentHealth;
  /** CPU usage percentage (0-100). */
  cpuUsage: number;
  /** Memory usage in megabytes. */
  memUsage: number;
  tasksCompleted: number;
  tasksFailed: number;
  messagesSent: number;
  /** Uptime in seconds (0 when stopped). */
  uptimeSec: number;
  lastActivity: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an agent definition with sensible defaults (Agent Manager). */
export function createAgentConfig(
  name: string,
  role: AgentRole,
  provider: AgentProvider,
  model: string,
  command: string,
  partial: Partial<Omit<AgentConfig, "id" | "name" | "role" | "provider" | "model" | "command" | "createdAt" | "updatedAt">> = {},
): AgentConfig {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    name,
    role,
    provider,
    model,
    command,
    color: partial.color ?? "#2f81f7",
    icon: partial.icon ?? "🤖",
    description: partial.description ?? "",
    tags: partial.tags ?? [],
    autoStart: partial.autoStart ?? false,
    maxConcurrent: partial.maxConcurrent ?? 1,
    priority: partial.priority ?? 0,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Build a fresh instance for an agent (Agent Lifecycle). */
export function createAgentInstance(agentId: string): AgentInstance {
  return {
    id: crypto.randomUUID(),
    agentId,
    lifecycle: "created",
    startedAt: null,
    stoppedAt: null,
    lastHeartbeat: null,
    error: null,
    pid: null,
  };
}

/** Build a communication message. `toAgentId === null` broadcasts. */
export function createAgentMessage(
  fromAgentId: string,
  content: string,
  kind: AgentMessageKind = "task",
  toAgentId: string | null = null,
): AgentMessage {
  return {
    id: crypto.randomUUID(),
    fromAgentId,
    toAgentId,
    kind,
    content,
    timestamp: nowIso(),
    read: false,
  };
}

/** Build a schedule for an agent (Agent Scheduler). */
export function createAgentSchedule(
  agentId: string,
  name: string,
  cron: string,
  task: string,
): AgentSchedule {
  return {
    id: crypto.randomUUID(),
    agentId,
    name,
    cron,
    task,
    enabled: true,
    nextRunAt: nextRunFromCron(cron),
    lastRunAt: null,
    runCount: 0,
  };
}

/** Build a memory entry for an agent (Agent Memory). */
export function createAgentMemoryEntry(
  agentId: string,
  key: string,
  value: string,
  kind: AgentMemoryEntry["kind"] = "fact",
): AgentMemoryEntry {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    agentId,
    key,
    value,
    kind,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Build a background run record (Background Agents). */
export function createBackgroundAgentRun(
  agentId: string,
  task: string,
): BackgroundAgentRun {
  return {
    id: crypto.randomUUID(),
    agentId,
    task,
    status: "queued",
    startedAt: nowIso(),
    finishedAt: null,
    logTail: [],
  };
}

/** Build a zeroed metrics object (Agent Monitoring). */
export function createAgentMetrics(agentId: string): AgentMetrics {
  return {
    agentId,
    health: "healthy",
    cpuUsage: 0,
    memUsage: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    messagesSent: 0,
    uptimeSec: 0,
    lastActivity: null,
  };
}

/** Compute the next run timestamp (ISO) for a cron / interval expression. */
export function nextRunFromCron(cron: string): string {
  const now = Date.now();
  const every = /^@every:(\d+)([smh])$/i.exec(cron.trim());
  if (every) {
    const n = Number(every[1]);
    const unit = every[2].toLowerCase();
    const ms = unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000;
    return new Date(now + n * ms).toISOString();
  }
  const step = /^\*\/(\d+)\s+\*(\s+\*){3,4}$/.exec(cron.trim());
  if (step) {
    const mins = Number(step[1]);
    return new Date(now + Math.max(1, mins) * 60_000).toISOString();
  }
  // Default fallback: run again in 15 minutes.
  return new Date(now + 15 * 60_000).toISOString();
}

/** Human-readable label for a lifecycle state. */
export function lifecycleLabel(lifecycle: AgentLifecycle): string {
  switch (lifecycle) {
    case "created":
      return "Created";
    case "starting":
      return "Starting";
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "error":
      return "Error";
  }
}

/** Whether an instance is currently executing (used by monitoring). */
export function isActiveLifecycle(lifecycle: AgentLifecycle): boolean {
  return lifecycle === "running" || lifecycle === "starting" || lifecycle === "paused";
}
