import { Files, Search, GitBranch, Layers, Sparkles, Bot, Settings } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useUi, type Activity } from "../state/uiStore";

const ITEMS: Array<{ id: Activity; icon: typeof Files; label: string }> = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "workspace", icon: Layers, label: "Workspace" },
  { id: "ai", icon: Sparkles, label: "AI Runtime" },
  { id: "agents", icon: Bot, label: "Agents" },
  { id: "settings", icon: Settings, label: "Settings" },
];

/** Narrow vertical strip that switches the active sidebar panel. */
export function ActivityBar() {
  const activity = useUi((s) => s.activity);
  const setActivity = useUi((s) => s.setActivity);

  return (
    <nav className="activitybar" aria-label="Activity bar">
      {ITEMS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={activity === id}
          className={cn("activitybar__btn", activity === id && "is-active")}
          onClick={() => setActivity(id)}
        >
          <Icon size={18} />
        </button>
      ))}
    </nav>
  );
}
