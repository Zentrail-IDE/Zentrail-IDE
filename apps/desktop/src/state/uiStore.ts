import { create } from "zustand";

export type Activity = "explorer" | "search" | "settings";
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
  toasts: Toast[];

  toggleSidebar: () => void;
  setActivity: (activity: Activity) => void;
  setCommandOpen: (open: boolean) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUi = create<UiState>((set, get) => ({
  sidebar: true,
  activity: "explorer",
  commandOpen: false,
  toasts: [],

  toggleSidebar: () => set({ sidebar: !get().sidebar }),
  setActivity: (activity) => set({ activity, sidebar: true }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),

  pushToast: (toast) =>
    set({ toasts: [...get().toasts, { ...toast, id: crypto.randomUUID() }] }),

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
