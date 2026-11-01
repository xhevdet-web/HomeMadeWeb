import { useEffect, useRef } from "react";
import { product as fetchProduct } from "../api/catalog";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { studioBuilder, studioHref, studioSlug, useStudioCategories } from "../data/homeCategories";
import { redirect } from "../router";
import { useStudio } from "../studio/StudioContext";
import { LoadError, StudioSkeleton } from "../studio/StudioShell";
import { useToast } from "../studio/Toasts";
import { useStudioData } from "../studios/data";
import { moduleFor } from "../studios/registry";
import NotFoundPage from "./NotFoundPage";

/**
 * Routes `#/studios/:slug[/design|/preview]` to the right step of the right studio.
 * The slug comes from the category name; the studio from its builderType, never its name.
 * `?load=<productId>` (Edit copy) restores a saved design and saves edits as a new product.
 */
export default function StudioPage({ slug, step, query }: { slug: string; step?: string; query: URLSearchParams }) {
  const categories = useStudioCategories();
  const category = categories.data?.find((c) => studioSlug(c) === slug);
  const mod = category ? moduleFor(studioBuilder(category)) : null;
  const data = useStudioData(mod ? category : undefined);
  const { getDraft, setDraft } = useStudio();
  const { requireAuth } = useAuth();
  const toast = useToast();
  const loadId = query.get("load");
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

  // Edit copy: load the saved product (own designs need the session), restore it, open the studio.
  useEffect(() => {
    if (!loadId || !category || !mod || !data.data || handled.current === loadId) return;
    handled.current = loadId;
    const studioData = data.data;
    requireAuth(async () => {
      try {
        const saved = await fetchProduct(loadId);
        setDraft(category.id, await mod.fromProduct(saved, category, studioData));
        toast("Your design is open. Saving it creates a new copy.");
      } catch (e) {
        toast(errorMessage(e));
      }
      redirect(studioHref(category, "design"));
    }, "Sign in to open your saved design.");
  }, [loadId, category, mod, data.data, requireAuth, setDraft, toast]);

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
        <LoadError message={data.error ?? "We couldn't load this studio."} onRetry={data.retry} />
      </Page>
    );
  if (target || loadId) return <StudioSkeleton />;

  const Step = !step ? mod.Base! : step === "design" ? mod.Design : mod.Preview;
  return <Step category={category} data={data.data} />;
}
