import type { ReactNode } from "react";
import { ButtonLink } from "./Button";
import { Icon, type IconName } from "./Icon";

/** Dashed box that shows a conditional state for design review. */
export function PreviewFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-20 rounded-[2rem] border border-dashed border-border p-4 sm:p-6" aria-label={label}>
      <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, text, action }: {
  icon: IconName;
  title: string;
  text: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-md">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon name={icon} size={28} />
        </span>
        <h2 className="mt-6 font-display text-3xl font-semibold">{title}</h2>
        <p className="mt-3 text-muted-foreground">{text}</p>
        <ButtonLink href={action.href} className="mt-8">
          {action.label}
        </ButtonLink>
      </div>
    </div>
  );
}
