export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
}

/** Payload streamed from the Rust terminal backend to the frontend. */
export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
  stream: "out" | "err" | "system";
}
