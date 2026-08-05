/** Agent model — placeholder for the Phase 6/7 Workspace & Multi-Agent systems. */
export type AgentRole = "manager" | "planner" | "coder" | "reviewer" | "tester" | "security" | "git";

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: "idle" | "running" | "blocked";
}
