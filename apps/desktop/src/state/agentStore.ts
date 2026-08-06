import { create } from "zustand";
import { ipc } from "../lib/ipc";
import type {
  AgentConfig,
  AgentInstance,
  AgentMessage,
  AgentSchedule,
  AgentMemoryEntry,
  BackgroundAgentRun,
  AgentMetrics,
  AgentMessageKind,
  AgentLifecycle,
} from "@zentrail/agent";
import {
  createAgentConfig,
  createAgentSchedule,
  createAgentMemoryEntry,
} from "@zentrail/agent";

interface AgentState {
  agents: AgentConfig[];
  instances: Record<string, AgentInstance>;
  messages: AgentMessage[];
  schedules: AgentSchedule[];
  memory: Record<string, AgentMemoryEntry[]>;
  background: BackgroundAgentRun[];
  metrics: Record<string, AgentMetrics>;
  selectedAgentId: string | null;
  loading: boolean;
  error: string | null;

  // Lifecycle / loading
  loadAll: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadInstances: () => Promise<void>;
  loadMessages: (agentId?: string) => Promise<void>;
  loadSchedules: (agentId?: string) => Promise<void>;
  loadMemory: (agentId: string) => Promise<void>;
  loadBackground: (agentId?: string) => Promise<void>;
  loadMetrics: () => Promise<void>;
  refreshAgent: (agentId: string) => Promise<void>;

  // Agent Manager
  selectAgent: (id: string | null) => void;
  saveAgent: (agent: AgentConfig) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;

  // Agent Lifecycle
  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
  pauseAgent: (id: string) => Promise<void>;
  resumeAgent: (id: string) => Promise<void>;

  // Agent Communication
  sendMessage: (
    fromAgentId: string,
    content: string,
    toAgentId?: string | null,
    kind?: AgentMessageKind,
  ) => Promise<void>;
  broadcast: (fromAgentId: string, content: string) => Promise<void>;

  // Agent Scheduler
  scheduleTask: (schedule: AgentSchedule) => Promise<void>;
  cancelSchedule: (id: string) => Promise<void>;
  runSchedule: (id: string) => Promise<void>;

  // Agent Memory
  saveMemory: (entry: AgentMemoryEntry) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;

  // Background Agents
  startBackground: (agentId: string, task: string) => Promise<void>;
}

function instanceMap(instances: AgentInstance[]): Record<string, AgentInstance> {
  const map: Record<string, AgentInstance> = {};
  for (const inst of instances) map[inst.agentId] = inst;
  return map;
}

export function lifecycleOf(
  instances: Record<string, AgentInstance>,
  agentId: string,
): AgentLifecycle {
  return instances[agentId]?.lifecycle ?? "created";
}

export const useAgent = create<AgentState>((set, get) => ({
  agents: [],
  instances: {},
  messages: [],
  schedules: [],
  memory: {},
  background: [],
  metrics: {},
  selectedAgentId: null,
  loading: false,
  error: null,

  async loadAll() {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().loadAgents(),
        get().loadInstances(),
        get().loadMessages(),
        get().loadSchedules(),
        get().loadBackground(),
        get().loadMetrics(),
      ]);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  async loadAgents() {
    const agents = await ipc.agentListAgents();
    set({
      agents,
      selectedAgentId:
        get().selectedAgentId ?? agents[0]?.id ?? null,
    });
    // Load memory for each agent.
    await Promise.all(agents.map((a) => get().loadMemory(a.id)));
  },

  async loadInstances() {
    const list = await ipc.agentListInstances();
    set({ instances: instanceMap(list) });
  },

  async loadMessages(agentId) {
    const messages = await ipc.agentListMessages(agentId);
    set({ messages });
  },

  async loadSchedules(agentId) {
    const schedules = await ipc.agentListSchedules(agentId);
    set({ schedules });
  },

  async loadMemory(agentId) {
    const entries = await ipc.agentGetMemory(agentId);
    set((s) => ({ memory: { ...s.memory, [agentId]: entries } }));
  },

  async loadBackground(agentId) {
    const background = await ipc.agentListBackground(agentId);
    set({ background });
  },

  async loadMetrics() {
    const list = await ipc.agentGetAllMetrics();
    const metrics: Record<string, AgentMetrics> = {};
    for (const m of list) metrics[m.agentId] = m;
    set({ metrics });
    // Fill per-agent metrics so monitoring always has an entry.
    const missing = get().agents.filter((a) => !metrics[a.id]);
    if (missing.length > 0) {
      for (const a of missing) {
        metrics[a.id] = await ipc.agentGetMetrics(a.id);
      }
      set({ metrics: { ...metrics } });
    }
  },

  async refreshAgent(agentId) {
    await Promise.all([
      get().loadInstances(),
      get().loadMetrics(),
      get().loadMemory(agentId),
      get().loadBackground(agentId),
    ]);
  },

  selectAgent(id) {
    set({ selectedAgentId: id });
  },

  async saveAgent(agent) {
    await ipc.agentSaveAgent(agent);
    await get().loadAgents();
  },

  async deleteAgent(id) {
    await ipc.agentDeleteAgent(id);
    await get().loadAll();
  },

  async startAgent(id) {
    await ipc.agentStart(id);
    await get().refreshAgent(id);
  },

  async stopAgent(id) {
    await ipc.agentStop(id);
    await get().refreshAgent(id);
  },

  async pauseAgent(id) {
    await ipc.agentPause(id);
    await get().refreshAgent(id);
  },

  async resumeAgent(id) {
    await ipc.agentResume(id);
    await get().refreshAgent(id);
  },

  async sendMessage(fromAgentId, content, toAgentId = null, kind = "task") {
    await ipc.agentSendMessage(fromAgentId, toAgentId, kind, content);
    await get().loadMessages();
    await get().loadMetrics();
  },

  async broadcast(fromAgentId, content) {
    await ipc.agentBroadcast(fromAgentId, content);
    await get().loadMessages();
    await get().loadMetrics();
  },

  async scheduleTask(schedule) {
    await ipc.agentScheduleTask(schedule);
    await get().loadSchedules();
  },

  async cancelSchedule(id) {
    await ipc.agentCancelSchedule(id);
    await get().loadSchedules();
  },

  async runSchedule(id) {
    await ipc.agentRunSchedule(id);
    await get().loadSchedules();
    await get().loadMessages();
    await get().loadMetrics();
  },

  async saveMemory(entry) {
    await ipc.agentSaveMemory(entry);
    await get().loadMemory(entry.agentId);
  },

  async deleteMemory(id) {
    const entry = Object.values(get().memory)
      .flat()
      .find((m) => m.id === id);
    if (!entry) return;
    await ipc.agentDeleteMemory(id);
    await get().loadMemory(entry.agentId);
  },

  async startBackground(agentId, task) {
    await ipc.agentStartBackground(agentId, task);
    await get().loadBackground(agentId);
    // Refresh after the simulated completion.
    setTimeout(() => {
      void get().loadBackground(agentId);
      void get().loadMetrics();
    }, 2200);
  },
}));

// Re-export factory helpers so callers can build entities without importing
// the package directly.
export {
  createAgentConfig,
  createAgentSchedule,
  createAgentMemoryEntry,
};
