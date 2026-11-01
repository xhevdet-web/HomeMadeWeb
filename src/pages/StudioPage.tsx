import { useEffect } from "react";
import { getStudio } from "../data/mock";
import { redirect } from "../router";
import { useStudio } from "../studio/StudioContext";
import { useToast } from "../studio/Toasts";
import { studioModule } from "../studios/registry";
import NotFoundPage from "./NotFoundPage";

/**
 * Routes `#/studios/:slug[/design|/preview]` to the right step of the right studio.
 * Handles `?load=<designId>` (Edit copy / Continue my design) and sends people back to step 1 when it isn't done.
 */
export default function StudioPage({ slug, step, query }: { slug: string; step?: string; query: URLSearchParams }) {
  const studio = getStudio(slug);
  const { drafts, saved, load } = useStudio();
  const toast = useToast();
  const mod = studio ? studioModule(studio.slug) : undefined;
  const loadId = query.get("load");
  const validStep = step === undefined || step === "design" || step === "preview";

  let target: string | null = null;
  let notice: string | null = null;
  if (studio && mod && validStep) {
    const base = `#/studios/${studio.slug}`;
    if (loadId) target = `${base}/design`;
    else if (!step && !mod.Base) target = `${base}/design`;
    else if (step && mod.Base && !mod.baseDone(drafts[studio.slug])) {
      target = base;
      notice = mod.baseNotice;
    }
  }

  useEffect(() => {
    if (!target || !studio || !mod) return;
    if (loadId) {
      const s = saved.find((x) => x.id === loadId && x.studio === studio.slug);
      if (s) load(studio.slug, s.draft, s.id);
      else load(studio.slug, mod.sample());
    }
    if (notice) toast(notice);
    redirect(target);
    // Runs once per redirect target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, loadId]);

  if (!studio || !mod || !validStep) return <NotFoundPage />;
  if (target) return null;
  const Step = !step ? mod.Base! : step === "design" ? mod.Design : mod.Preview;
  return <Step />;
}
