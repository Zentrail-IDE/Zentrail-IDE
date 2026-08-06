import { describe, it, expect } from "vitest";
import {
  createWorkspace,
  addProjectToWorkspace,
  removeProjectFromWorkspace,
  workspacePaths,
  upsertRecent,
  sortByRecent,
  removeRecent,
  createSession,
  upsertSession,
  sessionsForWorkspace,
  emptyMemory,
  setMemoryEntry,
  removeMemoryEntry,
  getMemoryValue,
  defaultWorkspaceSettings,
  mergeWorkspaceSettings,
  defaultTemplates,
  findTemplate,
  createFromTemplate,
  workspaceNameFromPath,
} from "./index";

describe("workspace lifecycle", () => {
  it("creates a workspace with a derived name", () => {
    const ws = createWorkspace("/home/user/my-app");
    expect(ws.name).toBe("my-app");
    expect(ws.rootPath).toBe("/home/user/my-app");
    expect(ws.projects).toEqual([]);
    expect(ws.pinned).toBe(false);
    expect(ws.id).toBeTruthy();
  });

  it("honours an explicit name", () => {
    const ws = createWorkspace("/abs/path", "Custom");
    expect(ws.name).toBe("Custom");
  });

  it("adds and removes project folders without duplicates", () => {
    let ws = createWorkspace("/ws");
    ws = addProjectToWorkspace(ws, "/ws/lib");
    ws = addProjectToWorkspace(ws, "/ws/lib"); // duplicate path is replaced
    expect(ws.projects).toHaveLength(1);
    expect(workspacePaths(ws)).toEqual(["/ws", "/ws/lib"]);

    ws = removeProjectFromWorkspace(ws, "/ws/lib");
    expect(ws.projects).toHaveLength(0);
  });
});

describe("recent workspaces", () => {
  it("inserts newest first and dedupes by path", () => {
    let recents = upsertRecent([], "/a", "A");
    recents = upsertRecent(recents, "/b", "B");
    expect(recents.map((r) => r.path)).toEqual(["/b", "/a"]);

    recents = upsertRecent(recents, "/a", "A-renamed");
    expect(recents.map((r) => r.path)).toEqual(["/a", "/b"]);
    expect(recents[0].name).toBe("A-renamed");
  });

  it("respects the limit", () => {
    let recents: ReturnType<typeof upsertRecent> = [];
    for (let i = 0; i < 25; i++) recents = upsertRecent(recents, `/p${i}`);
    expect(recents).toHaveLength(20);
  });

  it("sorts and removes", () => {
    let recents = upsertRecent([], "/a");
    recents = upsertRecent(recents, "/b");
    expect(sortByRecent(recents).map((r) => r.path)).toEqual(["/b", "/a"]);
    recents = removeRecent(recents, "/b");
    expect(recents.map((r) => r.path)).toEqual(["/a"]);
  });
});

describe("sessions", () => {
  it("creates and upserts sessions per workspace", () => {
    const s1 = createSession("ws1", "Morning", ["/ws/a.ts"], "/ws/a.ts");
    const s2 = createSession("ws1", "Evening", ["/ws/b.ts"]);
    let list = upsertSession([], s1);
    list = upsertSession(list, s2);
    expect(sessionsForWorkspace(list, "ws1")).toHaveLength(2);
    expect(sessionsForWorkspace(list, "ws2")).toHaveLength(0);
  });
});

describe("memory", () => {
  it("sets, updates, reads, and removes entries", () => {
    let mem = emptyMemory("ws1");
    mem = setMemoryEntry(mem, "goal", "ship phase 4");
    expect(getMemoryValue(mem, "goal")).toBe("ship phase 4");

    mem = setMemoryEntry(mem, "goal", "ship phase 4 now");
    expect(mem.entries).toHaveLength(1);
    expect(getMemoryValue(mem, "goal")).toBe("ship phase 4 now");

    const id = mem.entries[0].id;
    mem = removeMemoryEntry(mem, id);
    expect(getMemoryValue(mem, "goal")).toBeUndefined();
  });

  it("ignores empty keys", () => {
    const mem = setMemoryEntry(emptyMemory("ws1"), "   ", "x");
    expect(mem.entries).toHaveLength(0);
  });
});

describe("settings", () => {
  it("merges patches while preserving the workspace id", () => {
    const base = defaultWorkspaceSettings("ws1");
    const next = mergeWorkspaceSettings(base, { preferredTerminal: "cmd" });
    expect(next.preferredTerminal).toBe("cmd");
    expect(next.workspaceId).toBe("ws1");
  });
});

describe("templates", () => {
  it("ships built-in templates and resolves them to workspaces", () => {
    const templates = defaultTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);

    const node = findTemplate(templates, "node-ts");
    expect(node).toBeDefined();

    const ws = createFromTemplate(node!, "/code/app", "App");
    expect(ws.name).toBe("App");
    expect(ws.rootPath).toBe("/code/app");
    expect(ws.projects[0].path).toBe("/code/app/src");
  });
});

describe("name derivation", () => {
  it("handles trailing slashes and segments", () => {
    expect(workspaceNameFromPath("/a/b/c/")).toBe("c");
    expect(workspaceNameFromPath("C:\\Users\\dev")).toBe("dev");
  });
});
