import { DEFAULT_SETTINGS, Settings, SettingsSchema } from "./schema";

/** In-memory settings cache with a simple subscribe API (renderer side). */
export class SettingsStore {
  private state: Settings = DEFAULT_SETTINGS;
  private listeners = new Set<(s: Settings) => void>();

  get(): Settings {
    return this.state;
  }

  /** Validate and apply a partial patch, returning the merged result. */
  set(patch: Partial<Settings>): Settings {
    const next = SettingsSchema.parse({ ...this.state, ...patch });
    this.state = next;
    this.listeners.forEach((l) => l(next));
    return next;
  }

  reset(): Settings {
    return this.set({ ...DEFAULT_SETTINGS });
  }

  subscribe(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export * from "./schema";
