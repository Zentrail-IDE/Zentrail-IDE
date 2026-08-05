import { listen } from "@tauri-apps/api/event";
import { isTauri } from "./ipc";
import type { NotificationPayload } from "./types";

/**
 * Subscribe to in-app notifications emitted by the Rust `notify` command.
 * Inside Tauri this uses the real event channel; in demo mode it listens for the
 * matching `CustomEvent` dispatched on `window`.
 */
export function onNotification(cb: (payload: NotificationPayload) => void): () => void {
  if (isTauri()) {
    const pending = listen<NotificationPayload>("zentrail://notify", (e) => cb(e.payload));
    return () => {
      void pending.then((unlisten) => unlisten());
    };
  }

  const handler = (e: Event) => cb((e as CustomEvent<NotificationPayload>).detail);
  window.addEventListener("zentrail://notify", handler);
  return () => window.removeEventListener("zentrail://notify", handler);
}
