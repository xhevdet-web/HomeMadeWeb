import { useEffect, useRef, useState } from "react";

/** The site's easing, for inline transitions. */
export const EASE = "cubic-bezier(.2,.7,.2,1)";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Observes the element once; flips to true on first intersection, then disconnects. */
export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/** Inline style that fades and lifts an element in once `shown` turns true. */
export const reveal = (shown: boolean, delay = 0, from = "translateY(32px)") => ({
  opacity: shown ? 1 : 0,
  transform: shown ? "none" : from,
  transition: `opacity 900ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms`,
});
