import { Fragment } from "react";
import { Icon } from "./Icon";

/** "1 Choose base → 2 Design → 3 Review". Steps before `active` show as done. */
export function StepIndicator({ steps, active, className = "" }: { steps: string[]; active: number; className?: string }) {
  return (
    <ol className={`flex flex-wrap items-center gap-x-3 gap-y-3 text-sm ${className}`} aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <li aria-hidden="true" className="text-muted-foreground">
                →
              </li>
            )}
            <li className="flex items-center gap-2.5" aria-current={current ? "step" : undefined}>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full font-display font-bold ${
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "border border-primary text-primary"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className={`font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
