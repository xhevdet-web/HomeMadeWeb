import type { ReactNode } from "react";
import { Icon } from "./Icon";

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

/**
 * The page hero type scale, shared by PageHeader and the pages with their own hero layout (About).
 * Label: the `eyebrow` utility (index.css). Title: white, with any <em> in it orange and italic.
 * Intro: muted body text. Spacing: label → title 1rem, title → intro 1.25rem.
 */
export const heroTitle =
  "mt-4 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance break-words text-foreground sm:text-5xl lg:text-6xl [&_em]:font-normal [&_em]:text-primary [&_em]:italic";
export const heroIntro = "mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg";

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">{children}</div>;
}

/**
 * The introductory heading of a page: label, title (with an optional orange italic `accent`) and intro.
 * `title` may also hold its own <em>; it gets the same accent style.
 */
export function PageHeader({ eyebrow, title, accent, intro, back, aside }: {
  eyebrow: string;
  title: ReactNode;
  accent?: ReactNode;
  intro?: ReactNode;
  back?: { href: string; label: string };
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl min-w-0">
        {back && (
          <a
            href={back.href}
            className="animate-rise mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            style={rise(0)}
          >
            <Icon name="arrowLeft" size={16} /> {back.label}
          </a>
        )}
        <p className="eyebrow animate-rise" style={rise(0)}>
          {eyebrow}
        </p>
        <h1 className={`animate-rise ${heroTitle}`} style={rise(150)}>
          {title}
          {accent && <> <em>{accent}</em></>}
        </h1>
        {intro && (
          <div className={`animate-rise ${heroIntro}`} style={rise(300)}>
            {intro}
          </div>
        )}
      </div>
      {aside && (
        <div className="animate-rise shrink-0" style={rise(450)}>
          {aside}
        </div>
      )}
    </header>
  );
}

/** Small uppercase muted label above a group of controls. */
export function SectionLabel({ children, as: Tag = "h3", id }: { children: ReactNode; as?: "h2" | "h3" | "p" | "span"; id?: string }) {
  return (
    <Tag id={id} className="mb-3 block text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
      {children}
    </Tag>
  );
}
