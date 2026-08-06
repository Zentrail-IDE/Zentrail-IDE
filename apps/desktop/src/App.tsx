import { useEffect } from "react";
import { MenuBar } from "./components/MenuBar";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { EditorTabs } from "./components/editor/EditorTabs";
import { EditorPane } from "./components/editor/EditorPane";
import { RuntimeWorkspace } from "./components/RuntimeWorkspace";
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
 * Zentrail IDE — Core shell.
 *
 * Composes the menu bar, activity bar, sidebar, the main content area
 * (editor or AI runtime workspace), the bottom terminal dock, the status
 * bar, the command palette, and the notification toasts.
 */
export function App() {
  const commandOpen = useUi((s) => s.commandOpen);
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const toggleTerminal = useUi((s) => s.toggleTerminal);
  const pushToast = useUi((s) => s.pushToast);
  const activity = useUi((s) => s.activity);
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

  useEffect(() => {
    void useWorkspace.getState().loadAll();
  }, []);

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

  const isAiActive = activity === "ai";

  return (
    <div className="app">
      <MenuBar />
      <div className="app__middle">
        <ActivityBar />
        {!isAiActive && <Sidebar />}
        <main className={isAiActive ? "rt-workspace" : "editor"}>
          {isAiActive ? (
            <RuntimeWorkspace />
          ) : (
            <>
              <EditorTabs />
              <EditorPane />
            </>
          )}
        </main>
      </div>
      <Terminal />
      <StatusBar />
      {commandOpen && <CommandPalette />}
      <Notifications />
    </div>
  );
}
