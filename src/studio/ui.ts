import { useCallback, useEffect, useRef, useState } from "react";

const PHONE = "(max-width: 767px)";

/** Under 768px the studio step becomes a full-screen app shell. */
export function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

/** The inline message under the stage (also announced). */
export function useNotice() {
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "warn"; id: number } | null>(null);
  const timer = useRef(0);
  const show = useCallback((text: string, tone: "info" | "warn" = "info") => {
    window.clearTimeout(timer.current);
    setNotice({ text, tone, id: Date.now() });
    timer.current = window.setTimeout(() => setNotice(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [notice, show] as const;
}

const HINT_KEY = "hc.hint.dnd";

/** "Tap to add · Hold and drag onto your piece", shown once until the first add. */
export function useDndHint() {
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) !== "seen";
    } catch {
      return false;
    }
  });
  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(HINT_KEY, "seen");
    } catch {
      // Storage blocked: the hint simply comes back next visit.
    }
  }, []);
  return [show, dismiss] as const;
}

/** Plays a CSS animation class once on an element (e.g. "shake" on a tile that doesn't fit). */
export function playOnce(el: Element | null | undefined, className: string) {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), 900);
}

/** True once `value` turns true, for one render cycle (to pulse a button once). */
export function useBecameTrue(value: boolean) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (value && !prev.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 1000);
      prev.current = value;
      return () => window.clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return pulse;
}
