import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Icon tile + heading (+ optional action on the right) at the top of a panel. */
export function CardTitle({ icon, children, action }: { icon: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon name={icon} size={18} />
      </span>
      <h2 className="flex-1 font-display text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}
