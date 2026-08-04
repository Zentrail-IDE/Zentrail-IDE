import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Boxes, Cpu, Settings2 } from "lucide-react";

interface AppVersion {
  version: string;
  goCore: string;
  pythonRt: string;
}

/**
 * Phase 1 shell: a minimal, dark-first window that proves the Tauri <-> frontend
 * IPC bridge and the design-system tokens are wired up. Later phases replace the
 * placeholder body with the editor, terminal, and agent surfaces.
 */
export function App() {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [ping, setPing] = useState<string>("");

  useEffect(() => {
    invoke<AppVersion>("get_app_version")
      .then(setVersion)
      .catch(() => setVersion({ version: "0.0.0", goCore: "—", pythonRt: "—" }));
  }, []);

  async function runPing() {
    const reply = await invoke<string>("ping", { message: "Zentrail" });
    setPing(reply);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <Boxes size={18} className="accent" />
          <span>Zentrail IDE</span>
        </div>
        <nav className="app__nav">
          <button className="btn" type="button">
            <Cpu size={14} /> Agents
          </button>
          <button className="btn" type="button">
            <Settings2 size={14} /> Settings
          </button>
        </nav>
      </header>

      <main className="app__body">
        <section className="card">
          <h1>Phase 1 — Foundation</h1>
          <p className="muted">
            Desktop shell booted. Tauri v2 · React · TypeScript · Vite.
          </p>
          <dl className="kv">
            <dt>App</dt>
            <dd>{version?.version ?? "loading…"}</dd>
            <dt>Go Core</dt>
            <dd>{version?.goCore ?? "—"}</dd>
            <dt>Python RT</dt>
            <dd>{version?.pythonRt ?? "—"}</dd>
          </dl>
          <button className="btn btn--primary" type="button" onClick={runPing}>
            Ping core
          </button>
          {ping && <p className="ping">↳ {ping}</p>}
        </section>
      </main>
    </div>
  );
}
