import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "../api/client";
import { createProduct, productFormData, type DesignFiles } from "../api/designs";
import type { Category, Product, ProductInput } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { invalidate } from "../hooks/useApi";
import { navigate } from "../router";
import { CAPTURE_FAILED, CaptureError } from "./capture";
import { EMPTY_DRAFTS, persistable, type AnyDraft, type DraftKind, type DraftOf } from "./drafts";
import { useToast } from "./Toasts";
import { applyUpdate, useHistory } from "./useHistory";

const STORAGE_KEY = "hc.drafts.v1";

interface StoredDrafts {
  [categoryId: string]: { draft: AnyDraft; updatedAt: number };
}

function readStored(): StoredDrafts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredDrafts) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

interface SavedDesign {
  signature: string;
  product: Product;
}

interface StudioContextValue {
  drafts: StoredDrafts;
  /** The category's draft when it is of this kind, else a fresh one. */
  getDraft: <K extends DraftKind>(categoryId: string, kind: K) => DraftOf<K>;
  setDraft: (categoryId: string, draft: AnyDraft) => void;
  lastSaved: Record<string, SavedDesign>;
  markSaved: (categoryId: string, saved: SavedDesign) => void;
  /** After an order: the studio that saved this product starts fresh (keeping its base choice). */
  clearOrdered: (productId: string) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside <StudioProvider>");
  return ctx;
}

/**
 * Studio drafts per category. Kept in memory and mirrored to localStorage (without uploaded
 * files, which can't be stored), so a reload doesn't wipe a design.
 */
export function StudioProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<StoredDrafts>(readStored);
  const [lastSaved, setLastSaved] = useState<Record<string, SavedDesign>>({});
  const { user } = useAuth();

  // A saved design belongs to the account that saved it.
  useEffect(() => setLastSaved({}), [user?.id]);

  useEffect(() => {
    try {
      const stored: StoredDrafts = {};
      for (const [id, entry] of Object.entries(drafts)) stored[id] = { ...entry, draft: persistable(entry.draft) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage full or blocked: drafts still live for this visit.
    }
  }, [drafts]);

  const getDraft = useCallback(
    <K extends DraftKind>(categoryId: string, kind: K): DraftOf<K> => {
      const existing = drafts[categoryId]?.draft;
      return existing?.kind === kind ? (existing as DraftOf<K>) : EMPTY_DRAFTS[kind]();
    },
    [drafts],
  );

  const setDraft = useCallback((categoryId: string, draft: AnyDraft) => {
    setDrafts((d) => (d[categoryId]?.draft === draft ? d : { ...d, [categoryId]: { draft, updatedAt: Date.now() } }));
  }, []);

  const markSaved = useCallback((categoryId: string, saved: SavedDesign) => setLastSaved((s) => ({ ...s, [categoryId]: saved })), []);

  const clearOrdered = useCallback(
    (productId: string) => {
      const categoryId = Object.keys(lastSaved).find((id) => lastSaved[id].product.id === productId);
      const current = categoryId ? drafts[categoryId]?.draft : undefined;
      if (!categoryId || !current) return;
      setDraft(categoryId, afterOrder(current));
      setLastSaved(({ [categoryId]: _ordered, ...rest }) => rest);
    },
    [drafts, lastSaved, setDraft],
  );

  return <StudioContext.Provider value={{ drafts, getDraft, setDraft, lastSaved, markSaved, clearOrdered }}>{children}</StudioContext.Provider>;
}

/** Like the app: a mug starts empty, a case keeps its phone, a set keeps its shape and size, a gift its box, jewelry its size. */
function afterOrder(d: AnyDraft): AnyDraft {
  switch (d.kind) {
    case "JEWELRY":
      return { ...d, pieces: [] };
    case "GIFT":
      return { ...d, elements: [] };
    case "CASE":
      return { ...d, elements: [] };
    case "STICKER":
      return { ...EMPTY_DRAFTS.STICKER(), sizeId: d.sizeId };
    case "MUG":
      return EMPTY_DRAFTS.MUG();
    case "APPAREL":
      return EMPTY_DRAFTS.APPAREL();
  }
}

/** Undo/redo history for one studio, kept in sync with its draft. */
export function useStudioHistory<K extends DraftKind>(categoryId: string, kind: K) {
  const { getDraft, setDraft } = useStudio();
  const history = useHistory<DraftOf<K>, (d: DraftOf<K>) => DraftOf<K>>(applyUpdate, () => getDraft(categoryId, kind));
  useEffect(() => setDraft(categoryId, history.state), [categoryId, history.state, setDraft]);
  return history;
}

export interface BuiltDesign {
  input: ProductInput;
  files: DesignFiles;
}

/**
 * "Save design" and "Continue to order". Signed out, the login modal opens over the studio and
 * the action continues after signing in. An unchanged design reuses the last saved product.
 */
export function useSaveDesign(category: Category, build: () => Promise<BuiltDesign>, options: { quantity?: number } = {}) {
  const { requireAuth } = useAuth();
  const { lastSaved, markSaved } = useStudio();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const persist = async () => {
    const { input, files } = await build();
    const signature = JSON.stringify({ input, uploads: files.customDesigns?.map((f) => f.size) ?? [] });
    const previous = lastSaved[category.id];
    if (previous?.signature === signature) return previous.product;
    const product = await createProduct(productFormData(input, files));
    markSaved(category.id, { signature, product });
    invalidate("my-designs");
    return product;
  };

  const run = (then: "stay" | "order"): (() => Promise<void>) => async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const product = await persist();
      toast("Saved to My Designs.");
      if (then === "order") navigate(`#/checkout?design=${product.id}${options.quantity ? `&qty=${options.quantity}` : ""}`);
    } catch (e) {
      // No preview, no save: nothing was sent and the studio stays as it is.
      if (e instanceof CaptureError) toast(CAPTURE_FAILED, { action: { label: "Try again", onClick: () => void run(then)() } });
      else toast(errorMessage(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return {
    saving,
    save: () => requireAuth(run("stay"), "Sign in to save your design. It stays exactly as it is."),
    order: () => requireAuth(run("order"), "Sign in to order your design. It stays exactly as it is."),
  };
}

/** The upload behind a blob URL, for the multipart request. */
export async function uploadBlob(src: string) {
  try {
    return await (await fetch(src)).blob();
  } catch {
    throw new Error("One of your images is no longer available. Re-upload it and try again.");
  }
}
