import { useEffect, useState, type MouseEvent } from "react";

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

/**
 * Each history entry remembers its position and the entry below it (`hcPrev`), so in-app Back
 * buttons can step back through the browser history instead of pushing a duplicate page.
 * Pushing duplicates is what made Studio → Back → Studio loops: the browser's Back then walked
 * through every copy. Kept in `history.state`, so it survives reloads, Back and Forward.
 */
interface EntryState {
  hcIdx: number;
  hcPrev: string | null;
}

const readEntry = (): EntryState | null => {
  const s = window.history.state as Partial<EntryState> | null;
  return s && typeof s.hcIdx === "number" ? { hcIdx: s.hcIdx, hcPrev: s.hcPrev ?? null } : null;
};

const normalise = (hash: string) => (hash.startsWith("#") ? hash : `#${hash}`) || "#/";
const currentHash = () => normalise(window.location.hash || "#/");

let last: { idx: number; hash: string } | null = null;
/** Scroll position of each entry, to put a page back where it was after Back / Forward. */
const scrolls = new Map<number, number>();

/** Stamps the current entry: a new one (pushed by a link) gets the next index and its predecessor. */
function stamp(): { entry: EntryState; returning: boolean } {
  const known = readEntry();
  if (known) {
    // The same slot again is a redirect (replaced entry), not a return to an earlier page.
    const returning = !!last && known.hcIdx !== last.idx;
    last = { idx: known.hcIdx, hash: currentHash() };
    return { entry: known, returning };
  }
  const entry: EntryState = last ? { hcIdx: last.idx + 1, hcPrev: last.hash } : { hcIdx: 0, hcPrev: null };
  window.history.replaceState({ ...(window.history.state ?? {}), ...entry }, "");
  last = { idx: entry.hcIdx, hash: currentHash() };
  return { entry, returning: false };
}

/** The page below this one in the browser history, if it was reached inside the website. */
export function previousHash(): string | null {
  return readEntry()?.hcPrev ?? null;
}

/** Tiny hash router: re-renders on `hashchange`; new pages start at the top, Back restores the scroll. */
export function useRoute() {
  const [route, setRoute] = useState(() => {
    stamp();
    return parse(window.location.hash);
  });
  // A scroll position to go back to, "keep" to stay where the page is, or null for the top.
  const [restore, setRestore] = useState<number | "keep" | null>(null);

  useEffect(() => {
    const onChange = () => {
      if (last) scrolls.set(last.idx, window.scrollY);
      const { entry, returning } = stamp();
      const keep = keepScroll;
      keepScroll = false;
      setRestore(keep ? "keep" : returning ? (scrolls.get(entry.hcIdx) ?? null) : null);
      setRoute(parse(window.location.hash));
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useEffect(() => {
    if (route.anchor) document.getElementById(route.anchor)?.scrollIntoView();
    else if (restore === "keep") return;
    else if (restore !== null) {
      // After the page has laid out (cached data renders in the same frame).
      const frame = requestAnimationFrame(() => window.scrollTo({ top: restore, behavior: "instant" }));
      return () => cancelAnimationFrame(frame);
    } else window.scrollTo({ top: 0, behavior: "instant" });
  }, [route, restore]);

  return route;
}

export function navigate(to: string) {
  window.location.hash = to;
}

let keepScroll = false;

/**
 * Changes the URL's query on the same page (filters, sorting) without jumping to the top.
 * `replace` swaps the current history entry instead of adding one (e.g. while typing a search).
 */
export function updateQuery(to: string, { replace = false }: { replace?: boolean } = {}) {
  if (normalise(to) === currentHash()) return;
  keepScroll = true;
  if (replace) redirect(to);
  else navigate(to);
}

/**
 * Like `navigate`, but replaces the current history entry (for redirects), keeping its place in
 * the history so Back still goes where it went before.
 */
export function redirect(to: string) {
  const hash = normalise(to);
  if (hash === currentHash()) return;
  window.history.replaceState(window.history.state, "", hash);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/**
 * Goes to `to` without growing the history when it is the page we just came from: steps back
 * instead (Studio → Preview → "Back to studio" → the original Studio entry, not a new copy).
 */
export function backOrNavigate(to: string) {
  if (previousHash() === normalise(to)) window.history.back();
  else navigate(to);
}

/**
 * An in-app Back button: back through the browser history when this page was reached inside the
 * website, otherwise (opened from a link or bookmark) to `fallback`, replacing this entry so the
 * browser's Back still leaves as expected.
 */
export function goBack(fallback: string) {
  if (previousHash() !== null) window.history.back();
  else redirect(fallback);
}

/** onClick for an `<a href>`: steps back instead of pushing a copy of the previous page. */
export function backIfPrevious(e: MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = e.currentTarget.getAttribute("href");
  if (href && previousHash() === normalise(href)) {
    e.preventDefault();
    window.history.back();
  }
}
