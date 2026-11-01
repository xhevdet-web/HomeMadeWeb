import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Small toast host, bottom centre, announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const next = useRef(0);

  const toast = useCallback((message: string) => {
    const id = next.current++;
    setToasts((list) => (list.some((t) => t.message === message) ? list : [...list.slice(-2), { id, message }]));
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-32 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            className="animate-rise rounded-full border border-border bg-card/95 px-5 py-3 text-center text-sm font-semibold shadow-glow backdrop-blur-xl"
            style={{ animationDuration: "400ms" }}
          >
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
