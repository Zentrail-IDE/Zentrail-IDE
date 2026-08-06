import { create } from "zustand";
import type {
  Agent,
  RuntimeSession,
  PanelLayout,
  RuntimeMessage,
  AgentProvider,
  AgentRole,
} from "@zentrail/agent";
import {
  createAgent,
  createSession,
  createPanel,
  nowIso,
} from "@zentrail/agent";
import { useTerminal } from "./terminalStore";
import { useWorkspace } from "./workspaceStore";

interface RuntimeState {
  agents: Agent[];
  sessions: Record<string, RuntimeSession>;
  panels: PanelLayout[];
  panelOrder: string[];
  activePanelId: string | null;
  addingAgent: boolean;

  loadAgents: () => Promise<void>;
  addAgent: (
    name: string,
    role: AgentRole,
    provider: AgentProvider,
    model: string,
    command: string,
    color?: string,
    icon?: string,
  ) => void;
  removeAgent: (id: string) => void;
  openAgent: (agentId: string) => void;
  closePanel: (panelId: string) => void;
  setActivePanel: (panelId: string) => void;
  toggleCollapse: (panelId: string) => void;
  togglePin: (panelId: string) => void;
  sendMessage: (agentId: string, content: string) => void;
  stopAgent: (agentId: string) => void;
  restartAgent: (agentId: string) => void;
  clearMessages: (agentId: string) => void;
  setAddingAgent: (v: boolean) => void;
}

// Pre-built agent presets the user can quick-add
const PRESETS: Array<Omit<Agent, "id">> = [
  { name: "Claude Code", role: "coder", provider: "anthropic", model: "claude-sonnet-4-20250514", command: "claude", color: "#f59e0b", icon: "🟠" },
  { name: "Gemini CLI", role: "coder", provider: "google", model: "gemini-2.5-pro", command: "gemini", color: "#60a5fa", icon: "🔵" },
  { name: "Codex CLI", role: "coder", provider: "openai", model: "codex-mini", command: "codex", color: "#10b981", icon: "🟢" },
  { name: "Aider", role: "coder", provider: "openai", model: "gpt-4o", command: "aider", color: "#ef4444", icon: "🔴" },
  { name: "OpenCode", role: "coder", provider: "openai", model: "gpt-4o", command: "opencode", color: "#a78bfa", icon: "🟣" },
  { name: "Local Llama", role: "coder", provider: "ollama", model: "llama3.1:8b", command: "ollama run llama3.1", color: "#34d399", icon: "🦙" },
  { name: "Python Agent", role: "custom", provider: "local", model: "python", command: "python3", color: "#fbbf24", icon: "🐍" },
  { name: "Go Agent", role: "custom", provider: "local", model: "go", command: "go run .", color: "#06b6d4", icon: "🐹" },
  { name: "MCP Agent", role: "custom", provider: "mcp", model: "mcp", command: "mcp", color: "#8b5cf6", icon: "🔌" },
];

export { PRESETS };

export const useRuntime = create<RuntimeState>((set, get) => ({
  agents: [],
  sessions: {},
  panels: [],
  panelOrder: [],
  activePanelId: null,
  addingAgent: false,

  async loadAgents() {
    const agents: Agent[] = PRESETS.map((p) => ({
      ...p,
      id: p.name.toLowerCase().replace(/\s+/g, "-"),
    }));
    set({ agents });
  },

  addAgent(name, role, provider, model, command, color = "#2f81f7", icon = "🤖") {
    const agent = createAgent(name, role, provider, model, command, color, icon);
    set((s) => ({
      agents: [...s.agents, agent],
    }));
    get().openAgent(agent.id);
  },

  removeAgent(id) {
    const state = get();
    const panel = state.panels.find((p) => p.agentId === id);
    if (panel) get().closePanel(panel.id);
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
    }));
  },

  openAgent(agentId) {
    const state = get();
    // Don't open duplicate panels
    if (state.panels.some((p) => p.agentId === agentId)) {
      const existing = state.panels.find((p) => p.agentId === agentId);
      if (existing) set({ activePanelId: existing.id });
      return;
    }

    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;

    const session = createSession(agentId);
    const panel = createPanel(agentId, state.panels.length);

    set((s) => ({
      sessions: { ...s.sessions, [agentId]: session },
      panels: [...s.panels, panel],
      panelOrder: [...s.panelOrder, panel.id],
      activePanelId: panel.id,
    }));

    // Spawn a terminal for this agent
    void (async () => {
      try {
        const root = useWorkspace.getState().root ?? "";
        const spawn = useTerminal.getState().spawn;
        const profile = {
          id: crypto.randomUUID(),
          name: agent.name,
          shell: "system" as const,
        };
        const tid = await spawn(profile, root);
        const write = useTerminal.getState().write;
        if (agent.command) {
          await write(tid, `${agent.command}\n`);
        }
        set((s) => ({
          sessions: {
            ...s.sessions,
            [agentId]: {
              ...s.sessions[agentId],
              terminalId: tid,
              status: "running",
              connection: "connected",
            },
          },
        }));
      } catch {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [agentId]: {
              ...s.sessions[agentId],
              status: "error",
              connection: "disconnected",
            },
          },
        }));
      }
    })();
  },

  closePanel(panelId) {
    const state = get();
    const panel = state.panels.find((p) => p.id === panelId);
    if (!panel) return;

    // Kill the terminal
    const session = state.sessions[panel.agentId];
    if (session?.terminalId) {
      void useTerminal.getState().close(session.terminalId);
    }

    const newPanels = state.panels.filter((p) => p.id !== panelId);
    const newOrder = state.panelOrder.filter((id) => id !== panelId);
    const newSessions = { ...state.sessions };
    delete newSessions[panel.agentId];

    set({
      panels: newPanels,
      panelOrder: newOrder,
      sessions: newSessions,
      activePanelId:
        state.activePanelId === panelId
          ? (newPanels.at(-1)?.id ?? null)
          : state.activePanelId,
    });
  },

  setActivePanel(id) {
    set({ activePanelId: id });
  },

  toggleCollapse(panelId) {
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId ? { ...p, collapsed: !p.collapsed } : p,
      ),
    }));
  },

  togglePin(panelId) {
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId ? { ...p, pinned: !p.pinned } : p,
      ),
    }));
  },

  sendMessage(agentId, content) {
    const state = get();
    const session = state.sessions[agentId];
    if (!session) return;

    const userMsg: RuntimeMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: nowIso(),
    };

    const assistantMsg: RuntimeMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: nowIso(),
    };

    set((s) => ({
      sessions: {
        ...s.sessions,
        [agentId]: {
          ...s.sessions[agentId],
          messages: [...s.sessions[agentId].messages, userMsg, assistantMsg],
          status: "running",
        },
      },
    }));

    // Send via terminal if available
    if (session.terminalId) {
      void useTerminal.getState().write(session.terminalId, `${content}\n`);
    }
  },

  stopAgent(agentId) {
    const session = get().sessions[agentId];
    if (session?.terminalId) {
      void useTerminal.getState().close(session.terminalId);
    }
    set((s) => ({
      sessions: {
        ...s.sessions,
        [agentId]: {
          ...s.sessions[agentId],
          status: "stopped",
          connection: "disconnected",
        },
      },
    }));
  },

  restartAgent(agentId) {
    get().stopAgent(agentId);
    const agent = get().agents.find((a) => a.id === agentId);
    if (agent) {
      set((s) => ({
        sessions: {
          ...s.sessions,
          [agentId]: {
            ...s.sessions[agentId],
            status: "idle",
            connection: "disconnected",
            messages: [],
          },
        },
      }));
      get().openAgent(agentId);
    }
  },

  clearMessages(agentId) {
    set((s) => ({
      sessions: {
        ...s.sessions,
        [agentId]: {
          ...s.sessions[agentId],
          messages: [],
        },
      },
    }));
  },

  setAddingAgent(v) {
    set({ addingAgent: v });
  },
}));
