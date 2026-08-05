import { X, Circle } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useEditor } from "../../state/editorStore";

/** Open-file tab strip above the editor. */
export function EditorTabs() {
  const tabs = useEditor((s) => s.tabs);
  const activeId = useEditor((s) => s.activeId);
  const setActive = useEditor((s) => s.setActive);
  const close = useEditor((s) => s.close);

  if (tabs.length === 0) return <div className="tabs tabs--empty" />;

  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeId}
          className={cn("tab", tab.id === activeId && "is-active")}
          onClick={() => setActive(tab.id)}
        >
          <span className="tab__name">
            {tab.dirty && <Circle size={8} className="tab__dirty" fill="currentColor" />}
            {tab.name}
          </span>
          <button
            type="button"
            className="tab__close"
            aria-label={`Close ${tab.name}`}
            onClick={(e) => {
              e.stopPropagation();
              close(tab.id);
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
