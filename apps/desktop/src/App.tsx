import { useEffect } from "react";
import { MenuBar } from "./components/MenuBar";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { EditorTabs } from "./components/editor/EditorTabs";
import { EditorPane } from "./components/editor/EditorPane";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { Notifications } from "./components/Notifications";
import { Terminal } from "./components/Terminal";
import { useUi } from "./state/uiStore";
import { useEditor } from "./state/editorStore";
import { useWorkspace } from "./state/workspaceStore";
import { useGit } from "./state/gitStore";
import { wireTerminalEvents } from "./state/terminalStore";
import { onNotification } from "./lib/events";

/**
 * Phase 3 — Core IDE shell + Integrated Terminal & Git.
 *
 * Composes the menu bar, activity bar, sidebar (explorer / search / source
 * control / settings), the Monaco editor with tabs, the bottom terminal dock,
 * the status bar, the command palette, and the notification toasts. All backend
 * communication flows through `lib/ipc`.
 */
export function App() {
  const commandOpen = useUi((s) => s.commandOpen);
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const toggleTerminal = useUi((s) => s.toggleTerminal);
  const pushToast = useUi((s) => s.pushToast);
  const root = useWorkspace((s) => s.root);
  const setGitRoot = useGit((s) => s.setRoot);

  useEffect(() => {
    return onNotification((p) =>
      pushToast({ title: p.title, body: p.body, kind: "info" }),
    );
  }, [pushToast]);

  useEffect(() => {
    wireTerminalEvents();
  }, []);

  // Hydrate the Workspace Manager (workspaces, recents, templates) on launch.
  useEffect(() => {
    void useWorkspace.getState().loadAll();
  }, []);

  // Keep the Git store pointed at the open workspace so the status bar branch
  // indicator is always populated, independent of the active sidebar panel.
  useEffect(() => {
    setGitRoot(root);
  }, [root, setGitRoot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void useEditor.getState().save();
      } else if (mod && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
      } else if (e.key === "Escape") {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, toggleTerminal]);

  return (
    <div className="app">
      <MenuBar />
      <div className="app__middle">
        <ActivityBar />
        <Sidebar />
        <main className="editor">
          <EditorTabs />
          <EditorPane />
        </main>
      </div>
      <Terminal />
      <StatusBar />
      {commandOpen && <CommandPalette />}
      <Notifications />
    </div>
  );
}
