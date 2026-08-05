import { useState } from "react";
import { Save } from "lucide-react";
import {
  SettingsStore,
  DEFAULT_SETTINGS,
  type Settings,
} from "@zentrail/settings";
import { ipc } from "../lib/ipc";
import { useUi } from "../state/uiStore";

// Renderer-side settings instance (mirrors the schema in @zentrail/settings).
const store = new SettingsStore();

/** Minimal settings panel wired to the shared settings schema + notify command. */
export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>(store.get());
  const pushToast = useUi((s) => s.pushToast);

  function update(patch: Partial<Settings>) {
    setSettings(store.set(patch));
  }

  function save() {
    ipc
      .notify("Settings saved", "Your preferences were applied.")
      .catch(() => undefined);
    pushToast({ title: "Settings", body: "Preferences applied.", kind: "success" });
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Settings</h2>

      <label className="field">
        <span>Theme</span>
        <select
          value={settings.themeMode}
          onChange={(e) => update({ themeMode: e.target.value as Settings["themeMode"] })}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>

      <label className="field">
        <span>Accent color</span>
        <input
          type="color"
          value={settings.accent}
          onChange={(e) => update({ accent: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Preferred terminal</span>
        <select
          value={settings.preferredTerminal}
          onChange={(e) =>
            update({ preferredTerminal: e.target.value as Settings["preferredTerminal"] })
          }
        >
          <option value="system">System</option>
          <option value="powershell">PowerShell</option>
          <option value="cmd">CMD</option>
          <option value="git-bash">Git Bash</option>
        </select>
      </label>

      <button className="btn btn--primary" type="button" onClick={save}>
        <Save size={14} /> Apply
      </button>

      <p className="muted panel__hint">
        Defaults: <code>{JSON.stringify(DEFAULT_SETTINGS)}</code>
      </p>
    </div>
  );
}
