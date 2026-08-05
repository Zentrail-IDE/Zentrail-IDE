import { useEffect } from "react";
import { MenuBar } from "./components/MenuBar";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { EditorTabs } from "./components/editor/EditorTabs";
import { EditorPane } from "./components/editor/EditorPane";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { Notifications } from "./components/Notifications";
import { useUi } from "./state/uiStore";
import { useEditor } from "./state/editorStore";
import { onNotification } from "./lib/events";

/**
 * Phase 2 — Core IDE shell.
 *
 * Composes the menu bar, activity bar, sidebar (explorer / search / settings),
 * the Monaco editor with tabs, the status bar, the command palette, and the
 * notification toasts. All backend communication flows through `lib/ipc`.
 */
export function App() {
  const commandOpen = useUi((s) => s.commandOpen);
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const pushToast = useUi((s) => s.pushToast);

  useEffect(() => {
    return onNotification((p) =>
      pushToast({ title: p.title, body: p.body, kind: "info" }),
    );
  }, [pushToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void useEditor.getState().save();
      } else if (e.key === "Escape") {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

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
      <StatusBar />
      {commandOpen && <CommandPalette />}
      <Notifications />
    </div>
  );
}
