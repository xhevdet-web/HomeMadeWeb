import { useEffect, useRef } from "react";
import i18n from "../i18n";
import { product as fetchProduct } from "../api/catalog";
import { errorMessage } from "../api/client";
import { savedDesign } from "../api/designs";
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { studioBuilder, studioHref, studioSlug, useStudioCategories } from "../data/homeCategories";
import { redirect } from "../router";
import { useStudio } from "../studio/StudioContext";
import { StudioSteps } from "../studio/StudioFrame";
import { LoadError, StudioSkeleton } from "../studio/StudioShell";
import { useToast } from "../studio/Toasts";
import { useStudioData } from "../studios/data";
import { moduleFor } from "../studios/registry";
import NotFoundPage from "./NotFoundPage";

/**
 * Routes `#/studios/:slug[/design|/preview]` to the right step of the right studio.
 * The slug comes from the category name; the studio from its builderType, never its name.
 * `?load=<productId>` (Edit copy) restores a design and saves edits as a new design.
 * `?saved=<savedDesignId>` (My designs → Continue designing) restores a saved design, and
 * "Save design" then saves the changes back to that same saved design.
 */
export default function StudioPage({ slug, step, query }: { slug: string; step?: string; query: URLSearchParams }) {
  const categories = useStudioCategories();
  const category = categories.data?.find((c) => studioSlug(c) === slug);
  const mod = category ? moduleFor(studioBuilder(category)) : null;
  const data = useStudioData(mod ? category : undefined);
  const { getDraft, setDraft, linkSaved } = useStudio();
  const { requireAuth } = useAuth();
  const toast = useToast();
  const savedId = query.get("saved");
  const copyId = query.get("load");
  const loadId = savedId ?? copyId;
  const validStep = step === undefined || step === "design" || step === "preview";
  const handled = useRef<string | null>(null);

  let target: string | null = null;
  let notice: string | null = null;
  if (category && mod && data.data && validStep && !loadId) {
    if (!step && !mod.Base) target = studioHref(category, "design");
    else if (step && mod.Base && !mod.baseDone(getDraft(category.id, mod.kind), category, data.data)) {
      target = studioHref(category);
      notice = mod.baseNotice;
    }
  }

  useEffect(() => {
    if (!target) return;
    if (notice) toast(notice);
    redirect(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Load the design (own designs need the session), restore it, open the studio. A saved design
  // stays linked so its changes are saved back to it; an edit copy is saved as a new design.
  useEffect(() => {
    if (!loadId || !category || !mod || !data.data || handled.current === loadId) return;
    handled.current = loadId;
    const studioData = data.data;
    requireAuth(async () => {
      try {
        const kept = savedId ? await savedDesign(savedId) : null;
        const product = kept ? kept.product : await fetchProduct(loadId);
        setDraft(category.id, await mod.fromProduct(product, category, studioData));
        linkSaved(category.id, kept?.id ?? null);
        toast(kept ? i18n.t("studio.savedOpened", { name: kept.name }) : i18n.t("studio.designOpened"));
      } catch (e) {
        toast(errorMessage(e));
      }
      redirect(studioHref(category, "design"));
      // Login closed: open the studio as it is, never leave the customer on a loading screen.
    }, i18n.t("auth.prompts.openDesign"), () => redirect(studioHref(category)));
  }, [loadId, savedId, category, mod, data.data, requireAuth, setDraft, linkSaved, toast]);

  if (categories.loading || (mod && data.loading)) return <StudioSkeleton />;
  if (categories.error)
    return (
      <Page>
        <LoadError message={categories.error} onRetry={categories.retry} />
      </Page>
    );
  if (!category || !mod || !validStep) return <NotFoundPage />;
  if (data.error || !data.data)
    return (
      <Page>
        <LoadError message={data.error ?? i18n.t("studio.loadFailed")} onRetry={data.retry} />
      </Page>
    );
  if (target || loadId) return <StudioSkeleton />;

  const Step = !step ? mod.Base! : step === "design" ? mod.Design : mod.Preview;
  return (
    <StudioSteps.Provider value={{ hasBase: !!mod.Base }}>
      <Step category={category} data={data.data} />
    </StudioSteps.Provider>
  );
}
