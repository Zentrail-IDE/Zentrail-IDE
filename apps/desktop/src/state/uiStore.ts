import { create } from "zustand";

export type Activity = "explorer" | "search" | "settings" | "git";
export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: string;
  title: string;
  body: string;
  kind: ToastKind;
}

interface UiState {
  sidebar: boolean;
  activity: Activity;
  commandOpen: boolean;
  terminalOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  setActivity: (activity: Activity) => void;
  setCommandOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  setTerminalOpen: (open: boolean) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUi = create<UiState>((set, get) => ({
  sidebar: true,
  activity: "explorer",
  commandOpen: false,
  terminalOpen: true,
  toasts: [],

  toggleSidebar: () => set({ sidebar: !get().sidebar }),
  setActivity: (activity) => set({ activity, sidebar: true }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  toggleTerminal: () => set({ terminalOpen: !get().terminalOpen }),
  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),

  pushToast: (toast) =>
    set({ toasts: [...get().toasts, { ...toast, id: crypto.randomUUID() }] }),

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
