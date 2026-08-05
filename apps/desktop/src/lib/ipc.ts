import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { FileEntry, NotificationPayload } from "./types";

/** True when running inside the Tauri webview (as opposed to a plain browser). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Thin, typed wrapper over `tauri::command` invocations. When not running inside
 * Tauri (e.g. `pnpm dev` in a browser) it transparently falls back to demo data
 * so the UI remains explorable. All cross-layer calls go through here, keeping
 * the channel names in a single place.
 */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return demo<T>(cmd, args);
  return tauriInvoke<T>(cmd, args);
}

export const ipc = {
  ping: (message: string) => invoke<string>("ping", { message }),
  getAppVersion: () =>
    invoke<{ version: string; goCore: string; pythonRt: string }>("get_app_version"),
  readDirectory: (root: string, rel: string) =>
    invoke<FileEntry[]>("read_directory", { root, rel }),
  readTextFile: (root: string, rel: string) =>
    invoke<string>("read_text_file", { root, rel }),
  writeTextFile: (root: string, rel: string, contents: string) =>
    invoke<void>("write_text_file", { root, rel, contents }),
  openFolderDialog: () => invoke<string | null>("open_folder_dialog"),
  setWindowTitle: (title: string) => invoke<void>("set_window_title", { title }),
  notify: (title: string, body: string) =>
    invoke<void>("notify", { title, body }),
};

// ---------------------------------------------------------------------------
// Demo mode: keep the shell usable outside the Tauri runtime.
// ---------------------------------------------------------------------------

const DEMO_FILES: FileEntry[] = [
  { name: "src", path: "/demo/src", isDir: true, size: 0 },
  { name: "README.md", path: "/demo/README.md", isDir: false, size: 1280 },
  { name: "package.json", path: "/demo/package.json", isDir: false, size: 640 },
  { name: "tsconfig.json", path: "/demo/tsconfig.json", isDir: false, size: 512 },
];

const DEMO_README = `# Zentrail IDE

This is demo content shown when the app runs outside the Tauri runtime.
Open a real workspace with **File → Open Folder** inside the desktop shell.
`;

function demo<T>(cmd: string, args?: Record<string, unknown>): T {
  switch (cmd) {
    case "ping":
      return `pong from Zentrail core: ${args?.message ?? ""}` as T;
    case "get_app_version":
      return { version: "0.1.0", goCore: "demo", pythonRt: "demo" } as T;
    case "read_directory":
      return DEMO_FILES as T;
    case "read_text_file":
      return DEMO_README as T;
    case "write_text_file":
      return undefined as T;
    case "open_folder_dialog":
      return null as T;
    case "set_window_title":
      return undefined as T;
    case "notify": {
      const payload: NotificationPayload = {
        title: String(args?.title ?? "Notification"),
        body: String(args?.body ?? ""),
      };
      window.dispatchEvent(
        new CustomEvent("zentrail://notify", { detail: payload }),
      );
      return undefined as T;
    }
    default:
      throw new Error(`Unknown demo command: ${cmd}`);
  }
}
