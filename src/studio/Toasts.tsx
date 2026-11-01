import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export interface ToastOptions {
  /** A button in the toast, e.g. "Try again". */
  action?: { label: string; onClick: () => void };
  /** How long the toast stays, in ms. */
  duration?: number;
}

type Toast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Toast>(() => {});

export const useToast = () => useContext(ToastContext);

interface Item {
  id: number;
  message: string;
  action?: ToastOptions["action"];
}

/** Small toast host, bottom centre, announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Item[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback<Toast>(
    (message, options = {}) => {
      const id = next.current++;
      setToasts((list) => [...list.filter((t) => t.message !== message).slice(-2), { id, message, action: options.action }]);
      window.setTimeout(() => dismiss(id), options.duration ?? (options.action ? 9000 : 2800));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-32 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-rise flex max-w-md items-center gap-3 rounded-full border border-border bg-card/95 py-3 text-sm font-semibold shadow-glow backdrop-blur-xl ${
              t.action ? "pointer-events-auto rounded-3xl pr-2 pl-5" : "px-5 text-center"
            }`}
            style={{ animationDuration: "400ms" }}
          >
            <p className="flex-1">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(t.id);
                  t.action!.onClick();
                }}
                className="min-h-11 shrink-0 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
