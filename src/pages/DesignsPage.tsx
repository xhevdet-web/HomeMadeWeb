import { useState } from "react";
import { useTranslation } from "react-i18next";
import { userProducts } from "../api/designs";
import { type Category, type Product } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { Chip } from "../components/Controls";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import { useApi } from "../hooks/useApi";
import { formatDate, money } from "../lib/format";
import { LoadError } from "../studio/StudioShell";
import { DesignPreview } from "../studios/DesignPreview";

const MAX_CHIPS = 3;

function DesignSkeleton() {
  const { t } = useTranslation();
  return (
    <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label={t("designs.loading")}>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="h-[480px] animate-pulse rounded-[2rem] border border-border bg-card" />
      ))}
    </ul>
  );
}

/** "Amber ×8", grouped per component. */
function materials(p: Product, item: string) {
  const lines = new Map<string, number>();
  for (const it of p.items ?? []) {
    const name = it.subCategory?.name ?? item;
    lines.set(name, (lines.get(name) ?? 0) + it.quantity);
  }
  return [...lines].map(([name, n]) => `${name} ×${n}`);
}

function DesignCard({ product, category }: { product: Product; category: Category | undefined }) {
  const { t } = useTranslation();
  const chips = materials(product, t("order.item"));
  const editable = product.origin !== "COMPANY" && !!category && !!studioBuilder(category);
  const meta = [product.category?.name ?? category?.name, product.selectedSize?.name, product.baseProduct?.name, product.createdAt && formatDate(product.createdAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col rounded-[2rem] border border-border bg-card p-4">
      <div className="relative">
        <DesignPreview product={product} category={category} missingNote />
        {product.origin === "COMPANY" && <span className="absolute top-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur-md">{t("designs.readyMade")}</span>}
      </div>
      <div className="flex flex-1 flex-col px-2 pt-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold break-words">{product.name}</h2>
          <span className="font-display text-xl font-semibold text-primary">{money(product.price)}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {chips.slice(0, MAX_CHIPS).map((m) => (
              <li key={m} className="rounded-full bg-secondary px-3 py-1 text-xs">
                {m}
              </li>
            ))}
            {chips.length > MAX_CHIPS && <li className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{t("designs.more", { count: chips.length - MAX_CHIPS })}</li>}
          </ul>
        )}
        <div className="mt-auto" />
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
          {editable ? (
            <a href={`${studioHref(category!, "design")}?load=${product.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              <Icon name="pencil" size={15} /> {t("designs.editCopy")}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">{product.origin === "COMPANY" ? t("designs.madeByUs") : ""}</span>
          )}
          <ButtonLink href={`#/checkout?design=${product.id}`} size="sm">
            {t("designs.order")}
          </ButtonLink>
        </div>
      </div>
    </li>
  );
}

export default function DesignsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const categories = useStudioCategories();
  const { data, loading, error, retry } = useApi(user ? `my-designs:${user.id}` : null, (signal) => userProducts(user!.id, signal));
  const [filter, setFilter] = useState("all");
  const designs = [...(data ?? [])].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const used = [...new Map(designs.map((d) => [d.categoryId, d.category?.name ?? t("designs.other")])).entries()];
  const shown = filter === "all" ? designs : designs.filter((d) => d.categoryId === filter);

  return (
    <Page>
      <PageHeader
        eyebrow={t("designs.eyebrow")}
        title={
          <>
            {t("designs.title")} <em className="font-normal text-primary">{t("designs.titleAccent")}</em>
          </>
        }
        intro={data ? t("designs.count", { count: designs.length }) : t("designs.intro")}
        aside={
          <ButtonLink href="#/create">
            <Icon name="plus" size={18} /> {t("designs.new")}
          </ButtonLink>
        }
      />

      {loading && <DesignSkeleton />}
      {error && <LoadError className="mt-12" message={error} onRetry={retry} />}
      {data && designs.length === 0 && (
        <div className="mt-12">
          <EmptyState icon="sparkle" title={t("designs.emptyTitle")} text={t("designs.emptyText")} action={{ href: "#/create", label: t("orders.emptyAction") }} />
        </div>
      )}
      {data && designs.length > 0 && (
        <>
          {used.length > 1 && (
            <div className="mt-12 flex flex-wrap gap-2" role="group" aria-label={t("designs.filter")}>
              <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
                {t("create.groups.all")}
              </Chip>
              {used.map(([id, name]) => (
                <Chip key={id} selected={filter === id} onClick={() => setFilter(id)}>
                  {name}
                </Chip>
              ))}
            </div>
          )}
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <DesignCard key={p.id} product={p} category={categories.data?.find((c) => c.id === p.categoryId)} />
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
