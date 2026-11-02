import i18n from "../i18n";
import { ORDER_STATUSES, statusIndex, statusLabel } from "../api/models";
import { Icon } from "./Icon";

export function StatusPill({ status }: { status: string }) {
  const done = status === "COMPLETED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
        done ? "border-success/50 bg-success/10 text-success" : "border-primary/50 text-primary"
      }`}
    >
      {done && <Icon name="check" size={12} />}
      {statusLabel(status)}
    </span>
  );
}

/** Six segments, one per status; finished steps are filled. An unknown status shows none filled. */
export function OrderProgress({ status, className = "" }: { status: string; className?: string }) {
  const current = statusIndex(status);
  return (
    <div
      className={`flex gap-1.5 ${className}`}
      role="progressbar"
      aria-label={i18n.t("controls.orderProgress")}
      aria-valuemin={0}
      aria-valuemax={ORDER_STATUSES.length}
      aria-valuenow={current + 1}
      aria-valuetext={statusLabel(status)}
    >
      {ORDER_STATUSES.map((s, i) => (
        <span key={s.status} className={`h-1.5 flex-1 rounded-full ${i <= current ? "bg-primary" : "bg-secondary"}`} />
      ))}
    </div>
  );
}
