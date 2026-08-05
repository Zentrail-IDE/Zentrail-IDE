/** Terminal profile — placeholder for the Phase 3 Integrated Terminal. */
export type ShellKind = "system" | "powershell" | "cmd" | "git-bash";

export interface TerminalProfile {
  id: string;
  name: string;
  shell: ShellKind;
  cwd?: string;
}

export function createProfile(name: string, shell: ShellKind): TerminalProfile {
  return { id: crypto.randomUUID(), name, shell };
}
