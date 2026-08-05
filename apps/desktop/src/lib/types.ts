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
