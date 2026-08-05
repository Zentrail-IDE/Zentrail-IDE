import { useEffect } from "react";
import { Info, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@zentrail/ui";
import { useUi, type Toast } from "../state/uiStore";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUi((s) => s.dismissToast);
  const Icon = ICONS[toast.kind];

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <div className={cn("toast", `toast--${toast.kind}`)} role="status">
      <Icon size={16} className="toast__ico" />
      <div className="toast__body">
        <strong>{toast.title}</strong>
        {toast.body && <p>{toast.body}</p>}
      </div>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
      >
        <X size={13} />
      </button>
    </div>
  );
}

/** Stacked toast notifications (bottom-right). */
export function Notifications() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
