import { useEffect, useState } from "react";

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
  /** Set for in-page anchors like `#how-it-works` (always on the homepage). */
  anchor: string | null;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith("/")) {
    return { path: "/", segments: [], query: new URLSearchParams(), anchor: raw || null };
  }
  const [path, search = ""] = raw.split("?");
  return { path, segments: path.split("/").filter(Boolean), query: new URLSearchParams(search), anchor: null };
}

/** Tiny hash router: re-renders on `hashchange` and scrolls to top (or to the anchor). */
export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    if (route.anchor) document.getElementById(route.anchor)?.scrollIntoView();
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);

  return route;
}

export function navigate(to: string) {
  window.location.hash = to;
}

/** Like `navigate`, but replaces the current history entry (for redirects). */
export function redirect(to: string) {
  window.location.replace(to.startsWith("#") ? to : `#${to}`);
}
