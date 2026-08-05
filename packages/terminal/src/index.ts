/**
 * Terminal domain models for the Phase 3 Integrated Terminal.
 *
 * These are pure, framework-agnostic types and helpers shared between the
 * desktop UI and (eventually) the Tauri backend. No React, DOM, or Tauri
 * imports belong here — keep this package portable so it can be unit-tested in
 * isolation.
 */

/** Supported shell profiles. `system` resolves to the OS default shell. */
export type ShellKind = "system" | "powershell" | "cmd" | "git-bash";

/** A stream of bytes coming out of a shell process. */
export type TerminalStream = "out" | "err" | "system";

/** A single buffered line of terminal output. */
export interface TerminalLine {
  id: string;
  stream: TerminalStream;
  text: string;
}

/** Lifecycle of a terminal session. */
export type TerminalStatus = "starting" | "running" | "exited" | "killed";

/** A named shell configuration the user can spawn. */
export interface TerminalProfile {
  id: string;
  name: string;
  shell: ShellKind;
  cwd?: string;
  env?: Record<string, string>;
}

/** A live terminal session with its buffered output. */
export interface TerminalSession {
  id: string;
  profile: TerminalProfile;
  title: string;
  status: TerminalStatus;
  exitCode: number | null;
  lines: TerminalLine[];
  createdAt: number;
}

export const SHELL_LABELS: Record<ShellKind, string> = {
  system: "System Shell",
  powershell: "PowerShell",
  cmd: "Command Prompt",
  "git-bash": "Git Bash",
};

/** Human-readable label for a shell kind. */
export function shellLabel(shell: ShellKind): string {
  return SHELL_LABELS[shell];
}

/**
 * Resolve the executable + args used to launch a shell. Cross-platform: on
 * Windows `git-bash` points at the common install location, elsewhere it uses
 * the `bash` on PATH. The backend should guard these paths behind capability
 * checks before launching.
 */
export function shellCommand(
  shell: ShellKind,
  platform: NodeJS.Platform = process.platform,
): { program: string; args: string[] } {
  const isWin = platform === "win32";
  switch (shell) {
    case "powershell":
      return { program: isWin ? "pwsh" : "pwsh", args: [] };
    case "cmd":
      return { program: "cmd", args: ["/K"] };
    case "git-bash":
      return {
        program: isWin ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash",
        args: ["--login", "-i"],
      };
    case "system":
    default:
      return { program: isWin ? "cmd" : "bash", args: [] };
  }
}

/** The default set of profiles offered in the terminal picker. */
export function defaultProfiles(): TerminalProfile[] {
  return (
    [
      { shell: "system" as ShellKind },
      { shell: "powershell" as ShellKind },
      { shell: "cmd" as ShellKind },
      { shell: "git-bash" as ShellKind },
    ] as Array<{ shell: ShellKind }>
  ).map(({ shell }) => ({
    id: crypto.randomUUID(),
    name: shellLabel(shell),
    shell,
  }));
}

/** Create a terminal profile with a generated id. */
export function createProfile(
  name: string,
  shell: ShellKind,
  cwd?: string,
  env?: Record<string, string>,
): TerminalProfile {
  return { id: crypto.randomUUID(), name, shell, cwd, env };
}

/** Build a brand-new session for a profile that is just starting. */
export function createSession(profile: TerminalProfile): TerminalSession {
  return {
    id: crypto.randomUUID(),
    profile,
    title: profile.name,
    status: "starting",
    exitCode: null,
    lines: [],
    createdAt: Date.now(),
  };
}

/** Append output to a session, returning a new immutable session object. */
export function appendLine(
  session: TerminalSession,
  text: string,
  stream: TerminalStream = "out",
): TerminalSession {
  const line: TerminalLine = { id: crypto.randomUUID(), stream, text };
  const lines = [...session.lines, line].slice(-2000);
  return { ...session, lines };
}

/** Mark a session as exited with an optional exit code. */
export function closeSession(
  session: TerminalSession,
  status: TerminalStatus,
  exitCode: number | null = null,
): TerminalSession {
  return { ...session, status, exitCode };
}
