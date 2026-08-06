import { useState } from "react";
import {
  Check,
  ChevronRight,
  ChevronDown,
  Settings,
  Globe,
  Cpu,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useAi } from "../state/aiStore";
import type { AiModel, ModelSettings } from "@zentrail/ai";

/** Model selection and configuration sub-panel. */
export function ModelManager() {
  const models = useAi((s) => s.models);
  const activeModelId = useAi((s) => s.activeModelId);
  const setActiveModel = useAi((s) => s.setActiveModel);
  const toggleModel = useAi((s) => s.toggleModel);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cloudModels = models.filter((m) => m.origin === "cloud");
  const localModels = models.filter((m) => m.origin === "local");

  return (
    <div className="ai__models">
      <ModelGroup
        label="Cloud Models"
        icon={<Globe size={12} />}
        models={cloudModels}
        activeModelId={activeModelId}
        expanded={expanded}
        onSelect={setActiveModel}
        onToggle={toggleModel}
        onExpand={setExpanded}
      />
      <ModelGroup
        label="Local Models"
        icon={<Cpu size={12} />}
        models={localModels}
        activeModelId={activeModelId}
        expanded={expanded}
        onSelect={setActiveModel}
        onToggle={toggleModel}
        onExpand={setExpanded}
      />
      {expanded && <ModelSettingsPanel modelId={expanded} />}
    </div>
  );
}

function ModelGroup({
  label,
  icon,
  models,
  activeModelId,
  expanded,
  onSelect,
  onToggle,
  onExpand,
}: {
  label: string;
  icon: React.ReactNode;
  models: AiModel[];
  activeModelId: string | null;
  expanded: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onExpand: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="ai__model-group">
      <button
        type="button"
        className="ai__group-head"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span>{label}</span>
        <span className="muted">({models.length})</span>
      </button>
      {open && (
        <ul className="ai__model-list">
          {models.map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              isActive={m.id === activeModelId}
              onSelect={() => onSelect(m.id)}
              onToggle={() => onToggle(m.id)}
              onExpand={() => onExpand(expanded === m.id ? null : m.id)}
            />
          ))}
          {models.length === 0 && (
            <li className="muted ai__empty">No models available</li>
          )}
        </ul>
      )}
    </div>
  );
}

function ModelRow({
  model,
  isActive,
  onSelect,
  onToggle,
  onExpand,
}: {
  model: AiModel;
  isActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <li className={cn("ai__model-row", isActive && "is-active")}>
      <button
        type="button"
        className="ai__model-select"
        onClick={onSelect}
        title={`Use ${model.name}`}
      >
        <Check size={12} className={cn(!isActive && "is-hidden")} />
        <span className="ai__model-name">{model.name}</span>
      </button>
      <div className="ai__model-actions">
        <button
          type="button"
          className={cn("ai__toggle", model.enabled && "is-on")}
          title={model.enabled ? "Disable model" : "Enable model"}
          onClick={onToggle}
        >
          {model.enabled ? <Check size={10} /> : <span className="ai__toggle-off" />}
        </button>
        <button
          type="button"
          className="iconbtn"
          title="Settings"
          onClick={onExpand}
        >
          <Settings size={11} />
        </button>
      </div>
    </li>
  );
}

function ModelSettingsPanel({ modelId }: { modelId: string }) {
  const getModelSettings = useAi((s) => s.getModelSettings);
  const saveModelSettings = useAi((s) => s.saveModelSettings);
  const models = useAi((s) => s.models);
  const model = models.find((m) => m.id === modelId);
  const settings = getModelSettings(modelId);
  const [local, setLocal] = useState<ModelSettings>({ ...settings });

  const update = (patch: Partial<ModelSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    saveModelSettings(next);
  };

  if (!model) return null;

  return (
    <div className="ai__settings">
      <div className="ai__settings-title">
        <Settings size={12} /> {model.name}
      </div>
      <label className="ai__setting">
        <span>Temperature: {local.temperature.toFixed(1)}</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={local.temperature}
          onChange={(e) => update({ temperature: Number(e.target.value) })}
        />
      </label>
      <label className="ai__setting">
        <span>Max Tokens: {local.maxTokens}</span>
        <input
          type="range"
          min="256"
          max="131072"
          step="256"
          value={local.maxTokens}
          onChange={(e) => update({ maxTokens: Number(e.target.value) })}
        />
      </label>
      <label className="ai__setting">
        <span>Top P: {local.topP.toFixed(1)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={local.topP}
          onChange={(e) => update({ topP: Number(e.target.value) })}
        />
      </label>
      <label className="ai__setting">
        <span>Frequency Penalty: {local.frequencyPenalty.toFixed(1)}</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={local.frequencyPenalty}
          onChange={(e) =>
            update({ frequencyPenalty: Number(e.target.value) })
          }
        />
      </label>
      <label className="ai__setting">
        <span>Presence Penalty: {local.presencePenalty.toFixed(1)}</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={local.presencePenalty}
          onChange={(e) =>
            update({ presencePenalty: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}
