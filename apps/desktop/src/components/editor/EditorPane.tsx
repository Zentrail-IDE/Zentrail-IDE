import Editor from "@monaco-editor/react";
import { FileCode2 } from "lucide-react";
import { useEditor } from "../../state/editorStore";

/** Monaco-based editor bound to the active tab. */
export function EditorPane() {
  const activeId = useEditor((s) => s.activeId);
  const tab = useEditor((s) => s.tabs.find((t) => t.id === s.activeId) ?? null);
  const update = useEditor((s) => s.update);

  if (!tab) {
    return (
      <div className="editor__empty">
        <FileCode2 size={40} className="muted" />
        <p className="muted">Open a file from the explorer to start editing.</p>
      </div>
    );
  }

  return (
    <div className="editor__pane">
      <Editor
        key={activeId ?? "none"}
        height="100%"
        language={tab.language}
        theme="vs-dark"
        path={tab.path}
        value={tab.contents}
        onChange={(value) => update(tab.id, value ?? "")}
        options={{
          fontSize: 13,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: "selection",
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
