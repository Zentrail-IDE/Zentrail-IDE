import { create } from "zustand";
import { ipc, isTauri } from "../lib/ipc";
import { onTerminalOutput } from "../lib/events";
import {
  createSession,
  closeSession,
  appendLine,
  shellLabel,
  type TerminalProfile,
  type TerminalSession,
  type TerminalStream,
} from "@zentrail/terminal";

interface TerminalState {
  sessions: Record<string, TerminalSession>;
  order: string[];
  activeId: string | null;

  spawn: (profile: TerminalProfile, cwd: string) => Promise<string>;
  setActive: (id: string) => void;
  write: (id: string, data: string) => void;
  close: (id: string) => Promise<void>;
  appendOutput: (sessionId: string, data: string, stream: TerminalStream) => void;
  markExited: (sessionId: string, code: number | null) => void;
}

const PROMPT = (profile: TerminalProfile) =>
  profile.shell === "powershell" || profile.shell === "cmd" ? "PS> " : "$ ";

/** Tiny fake shell used only in demo mode (outside Tauri). */
function simulateCommand(cmd: string, cwd: string): string[] {
  const trimmed = cmd.trim();
  if (trimmed === "") return [];
  if (trimmed === "clear") return ["__CLEAR__"];
  if (trimmed === "pwd") return [cwd || "~"];
  if (trimmed === "help") {
    return ["Available demo commands: pwd, ls, git status, clear, echo <text>"];
  }
  if (trimmed === "ls" || trimmed === "dir") {
    return ["src/  README.md  package.json  tsconfig.json"];
  }
  if (trimmed.startsWith("echo ")) return [trimmed.slice(5)];
  if (trimmed === "git status") {
    return ["On branch main", "Changes not staged for commit:", "  modified: src/app.ts"];
  }
  return [`demo-shell: command not found: ${trimmed.split(" ")[0]}`];
}

export const useTerminal = create<TerminalState>((set, get) => ({
  sessions: {},
  order: [],
  activeId: null,

  async spawn(profile, cwd) {
    const { id } = await ipc.spawnTerminal(profile, cwd);
    const session: TerminalSession = {
      ...createSession(profile),
      id,
      status: "running",
    };
    set((s) => ({
      sessions: { ...s.sessions, [id]: session },
      order: [...s.order, id],
      activeId: id,
    }));

    if (!isTauri()) {
      get().appendOutput(
        id,
        `Zentrail demo terminal — ${shellLabel(profile.shell)}`,
        "system",
      );
      get().appendOutput(id, `${PROMPT(profile)}`, "out");
    }
    return id;
  },

  setActive(id) {
    set({ activeId: id });
  },

  write(id, data) {
    void ipc.writeTerminal(id, data);
    if (isTauri()) return;

    const session = get().sessions[id];
    if (!session) return;
    const cmd = data.replace(/\r?\n$/, "");
    const out = simulateCommand(cmd, session.profile.cwd ?? "");
    if (out.length === 1 && out[0] === "__CLEAR__") {
      set((s) => ({ sessions: { ...s.sessions, [id]: { ...session, lines: [] } } }));
      get().appendOutput(id, `${PROMPT(session.profile)}`, "out");
      return;
    }
    if (cmd.trim() !== "") {
      get().appendOutput(id, `${PROMPT(session.profile)}${cmd}`, "out");
    }
    for (const line of out) get().appendOutput(id, line, "out");
    get().appendOutput(id, `${PROMPT(session.profile)}`, "out");
  },

  async close(id) {
    await ipc.killTerminal(id).catch(() => undefined);
    set((s) => {
      const sessions = { ...s.sessions };
      delete sessions[id];
      const order = s.order.filter((x) => x !== id);
      const activeId = s.activeId === id ? (order.at(-1) ?? null) : s.activeId;
      return { sessions, order, activeId };
    });
  },

  appendOutput(sessionId, data, stream) {
    set((s) => {
      const session = s.sessions[sessionId];
      if (!session) return s;
      return { sessions: { ...s.sessions, [sessionId]: appendLine(session, data, stream) } };
    });
  },

  markExited(sessionId, code) {
    set((s) => {
      const session = s.sessions[sessionId];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionId]: closeSession(session, "exited", code),
        },
      };
    });
  },
}));

// Bridge the Rust backend's streamed output into the store. The subscription is
// set up once at module load; it is a no-op in demo mode.
let wired = false;
export function wireTerminalEvents() {
  if (wired || !isTauri()) return;
  wired = true;
  onTerminalOutput(({ sessionId, data, stream }) => {
    useTerminal.getState().appendOutput(sessionId, data, stream);
  });
}
