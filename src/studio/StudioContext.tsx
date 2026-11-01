import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getStudio, resolveItem, type OrderItem, type StudioSlug } from "../data/mock";
import { navigate } from "../router";
import { INITIAL_DRAFTS, type AnyDraft, type DraftMap } from "./drafts";
import { useToast } from "./Toasts";
import { applyUpdate, useHistory } from "./useHistory";

export interface DesignInfo {
  meta: string;
  price: number;
  /** Quantity to pre-fill at checkout (mugs). */
  quantity?: number;
  materials?: string[];
}

export interface SavedDesign extends DesignInfo {
  id: string;
  studio: StudioSlug;
  name: string;
  quantity: number;
  draft: AnyDraft;
}

interface StudioContextValue {
  drafts: DraftMap;
  setDraft: <K extends StudioSlug>(slug: K, draft: DraftMap[K]) => void;
  /** Load a draft into a studio; `savedId` makes the next save update that saved design. */
  load: <K extends StudioSlug>(slug: K, draft: DraftMap[K], savedId?: string) => void;
  saved: SavedDesign[];
  save: (slug: StudioSlug, info: DesignInfo) => string;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

/** Drafts per studio and the in-memory "My Designs" store. Lives for the session only. */
export function StudioProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<DraftMap>(INITIAL_DRAFTS);
  const [saved, setSaved] = useState<SavedDesign[]>([]);
  const savedIds = useRef<Partial<Record<StudioSlug, string>>>({});
  const draftsRef = useRef(drafts);
  const savedRef = useRef(saved);

  const setDraft = useCallback(<K extends StudioSlug>(slug: K, draft: DraftMap[K]) => {
    setDrafts((d) => {
      if (d[slug] === draft) return d;
      const next = { ...d, [slug]: draft };
      draftsRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(
    <K extends StudioSlug>(slug: K, draft: DraftMap[K], savedId?: string) => {
      savedIds.current[slug] = savedId;
      setDraft(slug, draft);
    },
    [setDraft],
  );

  const save = useCallback((slug: StudioSlug, info: DesignInfo) => {
    const draft = draftsRef.current[slug];
    const existing = savedRef.current.find((s) => s.id === savedIds.current[slug]);
    const base = `Custom ${getStudio(slug)?.name ?? "design"}`;
    const taken = savedRef.current.filter((s) => s.name.startsWith(base)).length;
    const entry: SavedDesign = {
      id: existing?.id ?? `my-${slug}-${Date.now().toString(36)}`,
      studio: slug,
      name: existing?.name ?? (taken ? `${base} ${taken + 1}` : base),
      ...info,
      quantity: info.quantity ?? 1,
      draft,
    };
    const next = existing ? savedRef.current.map((s) => (s.id === entry.id ? entry : s)) : [entry, ...savedRef.current];
    savedRef.current = next;
    setSaved(next);
    savedIds.current[slug] = entry.id;
    return entry.id;
  }, []);

  return <StudioContext.Provider value={{ drafts, setDraft, load, saved, save }}>{children}</StudioContext.Provider>;
}

/** Undo/redo history for one studio, kept in sync with its draft in context. */
export function useStudioHistory<K extends StudioSlug>(slug: K) {
  const { drafts, setDraft } = useStudio();
  const history = useHistory<DraftMap[K], (d: DraftMap[K]) => DraftMap[K]>(applyUpdate, () => drafts[slug]);
  useEffect(() => setDraft(slug, history.state), [slug, history.state, setDraft]);
  return history;
}

/** "Save design" and "Continue to order" for a studio. */
export function useDesignActions(slug: StudioSlug, info: DesignInfo) {
  const { save } = useStudio();
  const toast = useToast();
  return {
    save: () => {
      save(slug, info);
      toast("Saved to My Designs.");
    },
    order: () => {
      const id = save(slug, info);
      navigate(`#/checkout?design=${id}&qty=${info.quantity ?? 1}`);
    },
  };
}

/** The item behind `?design=`: a design saved this session, or one of the sample designs. */
export function useOrderItem(query: URLSearchParams): OrderItem {
  const { saved } = useStudio();
  const design = saved.find((s) => s.id === query.get("design"));
  return design ? savedItem(design) : resolveItem(query);
}

export function savedItem(d: SavedDesign): OrderItem {
  return {
    name: d.name,
    meta: d.meta,
    image: getStudio(d.studio)?.image ?? "",
    unitPrice: d.price,
    editHref: `#/studios/${d.studio}/design?load=${d.id}`,
    ref: `design=${d.id}`,
    savedId: d.id,
  };
}
