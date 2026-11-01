import type { ReactNode } from "react";
import { Icon } from "./Icon";

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">{children}</div>;
}

export function PageHeader({ eyebrow, title, intro, back, aside }: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  back?: { href: string; label: string };
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
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
        <h1
          className="animate-rise mt-5 font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl"
          style={rise(150)}
        >
          {title}
        </h1>
        {intro && (
          <div className="animate-rise mt-5 max-w-xl text-lg text-muted-foreground" style={rise(300)}>
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
