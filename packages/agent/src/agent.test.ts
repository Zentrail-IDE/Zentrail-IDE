import { describe, it, expect } from "vitest";
import {
  createAgentConfig,
  createAgentInstance,
  createAgentMessage,
  createAgentSchedule,
  createAgentMemoryEntry,
  createAgentMetrics,
  nextRunFromCron,
  lifecycleLabel,
  isActiveLifecycle,
} from "./index";

describe("Phase 6 — Workspace Agent helpers", () => {
  it("builds an agent config with sensible defaults", () => {
    const cfg = createAgentConfig(
      "Coding Agent",
      "coder",
      "openai",
      "gpt-4o",
      "codex",
    );
    expect(cfg.id).toBeTruthy();
    expect(cfg.name).toBe("Coding Agent");
    expect(cfg.role).toBe("coder");
    expect(cfg.autoStart).toBe(false);
    expect(cfg.maxConcurrent).toBe(1);
  });

  it("creates a fresh instance in the created lifecycle", () => {
    const inst = createAgentInstance("coding-agent");
    expect(inst.lifecycle).toBe("created");
    expect(inst.startedAt).toBeNull();
  });

  it("creates a directed message and a broadcast", () => {
    const direct = createAgentMessage("a", "hello", "task", "b");
    expect(direct.toAgentId).toBe("b");
    const broadcast = createAgentMessage("a", "all", "broadcast");
    expect(broadcast.toAgentId).toBeNull();
    expect(broadcast.kind).toBe("broadcast");
  });

  it("computes a future next-run timestamp from a cron expression", () => {
    const iso = nextRunFromCron("*/15 * * * *");
    const ts = new Date(iso).getTime();
    expect(Number.isNaN(ts)).toBe(false);
    expect(ts).toBeGreaterThan(Date.now());
  });

  it("supports @every interval expressions", () => {
    const iso = nextRunFromCron("@every:30s");
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
  });

  it("labels lifecycle states and tracks active ones", () => {
    expect(lifecycleLabel("running")).toBe("Running");
    expect(isActiveLifecycle("running")).toBe(true);
    expect(isActiveLifecycle("stopped")).toBe(false);
  });

  it("builds memory entries and zeroed metrics", () => {
    const mem = createAgentMemoryEntry("a", "key", "value", "fact");
    expect(mem.agentId).toBe("a");
    expect(mem.kind).toBe("fact");
    const metrics = createAgentMetrics("a");
    expect(metrics.health).toBe("healthy");
    expect(metrics.tasksCompleted).toBe(0);
  });

  it("builds a schedule linked to an agent", () => {
    const sched = createAgentSchedule("a", "nightly", "*/15 * * * *", "build");
    expect(sched.agentId).toBe("a");
    expect(sched.enabled).toBe(true);
    expect(sched.runCount).toBe(0);
  });
});
