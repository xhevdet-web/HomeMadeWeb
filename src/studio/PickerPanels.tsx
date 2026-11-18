import { useState, type ReactNode } from "react";
import i18n from "../i18n";
import { Icon } from "../components/Icon";
import { Tabs } from "./StudioShell";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

/**
 * The studios' side panel as tabs (Designs / Photo / Text): one part at a time keeps the panel
 * short. Every panel stays mounted and only the active one is shown, so an upload input, a
 * half-typed text or a filter survives switching tabs.
 */
export type PanelId = "designs" | "photo" | "text";

const ICONS = { designs: "sparkle", photo: "image", text: "type" } as const;
const LABELS = { designs: "studio.tabDesigns", photo: "studio.tabPhoto", text: "studio.tabText" } as const;

/** The active panel, falling back to the first available one (e.g. a studio without designs). */
export function usePanel(available: PanelId[]) {
  const [panel, setPanel] = useState<PanelId>(available[0] ?? "designs");
  return [available.includes(panel) ? panel : (available[0] ?? "designs"), setPanel] as const;
}

/** The tab bar; hidden when only one panel exists. `counts` badges a tab (e.g. 2 texts). */
export function PanelTabs({
  panels,
  value,
  onChange,
  counts = {},
  labels = {},
}: {
  panels: PanelId[];
  value: PanelId;
  onChange: (id: PanelId) => void;
  counts?: Partial<Record<PanelId, number>>;
  labels?: Partial<Record<PanelId, string>>;
}) {
  if (panels.length < 2) return null;
  return (
    <Tabs
      label={t("studio.addToDesign")}
      value={value}
      onChange={onChange}
      tabs={panels.map((id) => ({
        id,
        label: (
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name={ICONS[id]} size={14} />
            {labels[id] ?? t(LABELS[id])}
            {!!counts[id] && <span className="rounded-full bg-primary/15 px-1.5 text-[10px] text-primary">{counts[id]}</span>}
          </span>
        ),
      }))}
    />
  );
}

/** One tab's content, with an optional one-line hint above it. */
export function Panel({ id, value, label, hint, children }: { id: PanelId; value: PanelId; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section role="tabpanel" aria-label={label} hidden={value !== id}>
      {hint && <p className="mb-2.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

/** A small note under the tabs (e.g. "keep it inside the dashed area"). */
export function PanelNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 border-t border-border pt-3 text-[11px] leading-snug text-muted-foreground">
      <Icon name="square" size={12} className="mt-px shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}
