import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "../api/client";

interface Entry {
  data: unknown;
  at: number;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Drop cached responses whose key starts with `prefix` (e.g. after saving a design). */
export function invalidate(prefix: string) {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}

interface State<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/**
 * Tiny query hook: data, loading, error, retry. `key` null skips the request.
 * With `ttl` the response is cached and shared between components for that many ms.
 * Requests are aborted when the component unmounts or the key changes.
 */
export function useApi<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>, { ttl = 0 }: { ttl?: number } = {}) {
  const fresh = (k: string | null) => {
    const hit = k && ttl ? cache.get(k) : undefined;
    return hit && Date.now() - hit.at < ttl ? (hit.data as T) : undefined;
  };
  const [state, setState] = useState<State<T>>(() => {
    const data = fresh(key);
    return { data, error: null, loading: !!key && data === undefined };
  });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!key) {
      setState({ data: undefined, error: null, loading: false });
      return;
    }
    const cached = fresh(key);
    if (cached !== undefined) {
      setState({ data: cached, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));

    let run: Promise<T>;
    if (ttl) {
      // Shared requests are not tied to one component's lifetime.
      let shared = inflight.get(key) as Promise<T> | undefined;
      if (!shared) {
        shared = fetcherRef.current(new AbortController().signal).finally(() => inflight.delete(key));
        inflight.set(key, shared);
      }
      run = shared;
    } else {
      run = fetcherRef.current(controller.signal);
    }

    run
      .then((data) => {
        if (ttl) cache.set(key, { data, at: Date.now() });
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      })
      .catch((e) => {
        if (controller.signal.aborted || (e instanceof ApiError && e.kind === "aborted")) return;
        setState({ data: undefined, error: errorMessage(e), loading: false });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => {
    if (key) cache.delete(key);
    setAttempt((a) => a + 1);
  }, [key]);

  const setData = useCallback((update: T | ((d: T | undefined) => T)) => {
    setState((s) => ({ ...s, data: typeof update === "function" ? (update as (d: T | undefined) => T)(s.data) : update }));
  }, []);

  return { ...state, retry, setData };
}

/** Catalog data changes rarely; share it for a minute. */
export const CATALOG_TTL = 60_000;
