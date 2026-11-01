import { useCallback, useEffect, useState } from "react";

interface HistoryState<S> {
  past: S[];
  present: S;
  future: S[];
  /** Consecutive dispatches with the same merge key become one undo step. */
  mergeKey: string | null;
}

const LIMIT = 100;

/**
 * State wrapper with undo / redo. Every design change goes through `dispatch`.
 * Pass `merge` to fold a burst of changes (typing, arrow keys, sliders) into one step,
 * or `"amend"` to correct the current step without adding a new one.
 */
export function useHistory<S, A>(reducer: (state: S, action: A) => S, initial: S | (() => S)) {
  const [h, setH] = useState<HistoryState<S>>(() => ({
    past: [],
    present: typeof initial === "function" ? (initial as () => S)() : initial,
    future: [],
    mergeKey: null,
  }));

  const dispatch = useCallback(
    (action: A, merge?: string) =>
      setH((s) => {
        const next = reducer(s.present, action);
        if (next === s.present) return s;
        if (merge === "amend" || (merge && merge === s.mergeKey)) return { ...s, present: next, future: [] };
        return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [], mergeKey: merge ?? null };
      }),
    [reducer],
  );

  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length
          ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], mergeKey: null }
          : s,
      ),
    [],
  );

  const redo = useCallback(
    () =>
      setH((s) =>
        s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), mergeKey: null } : s,
      ),
    [],
  );

  const reset = useCallback((state: S) => setH({ past: [], present: state, future: [], mergeKey: null }), []);

  return { state: h.present, dispatch, undo, redo, reset, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

/** Reducer for functional updates: `dispatch(d => ({ ...d, … }))`. */
export function applyUpdate<S>(state: S, update: (s: S) => S) {
  return update(state);
}

/** Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo. Leaves text fields alone. */
export function useUndoShortcuts(undo: () => void, redo: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
}
