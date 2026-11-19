import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

const INK = "#3A2C26";
const HAND = "'Dancing Script', cursive";

/** Longer messages are written smaller so they still fit the card (sizes are % of the box width). */
const messageSize = (length: number) => (length <= 30 ? 5.6 : length <= 80 ? 4.7 : length <= 140 ? 4 : 3.4);

/**
 * The hand-written card tucked into the box: what we write on the real card, previewed as the
 * customer types. Sized with container units, so it scales with the box it sits in (the parent
 * must be an `@container`). While `writing`, it lifts a little and shows the pen at the end.
 */
export function GiftCard({ recipient, message, writing }: { recipient: string; message: string; writing: boolean }) {
  const to = recipient.trim();
  const text = message.trim();
  const empty = !to && !text;
  const label = empty ? t("giftFlow.cardPlaceholder") : [to && t("giftFlow.cardTo", { name: to }), text].filter(Boolean).join(". ");

  return (
    <div
      role="img"
      aria-label={t("giftFlow.cardPreview", { text: label })}
      className={`pointer-events-none absolute z-10 origin-bottom-right transition-transform duration-500 ease-out ${writing ? "-translate-y-[3%] rotate-[-3deg] scale-[1.04]" : "rotate-[-6deg]"}`}
      style={{ right: "-9cqw", bottom: "-14cqw", width: "60cqw" }}
    >
      <div
        className={`relative overflow-hidden rounded-[1.6cqw] transition-shadow duration-500 ${writing ? "shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)]" : "shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]"}`}
        style={{
          aspectRatio: "1.45",
          background: `repeating-linear-gradient(to bottom, transparent 0, transparent 8.6cqw, rgba(58,44,38,0.09) 8.6cqw, rgba(58,44,38,0.09) calc(8.6cqw + 1px)), linear-gradient(160deg, #FFFBF2 0%, #F6EBD8 100%)`,
          color: INK,
          padding: "4.2cqw 5cqw 3.4cqw",
        }}
      >
        {/* A strip of washi tape holding the card in the box. */}
        <span
          aria-hidden="true"
          className="absolute top-[-1.4cqw] left-1/2 -translate-x-1/2 rotate-[3deg] opacity-80"
          style={{ width: "18cqw", height: "4.6cqw", background: "color-mix(in oklch, var(--color-primary) 55%, white)" }}
        />
        {/* A small heart doodle in the corner. */}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute" style={{ right: "3.4cqw", bottom: "3cqw", width: "5.4cqw", opacity: empty ? 0.25 : 0.7 }}>
          <path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20Z" fill="none" stroke="#C2553F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {empty ? (
          <p className="leading-snug opacity-40" style={{ fontFamily: HAND, fontSize: "5cqw" }}>
            {t("giftFlow.cardPlaceholder")}
            {writing && <Pen />}
          </p>
        ) : (
          <>
            {to && (
              <p className="truncate font-bold" style={{ fontFamily: HAND, fontSize: "6.2cqw", lineHeight: 1.25 }}>
                {t("giftFlow.cardDear", { name: to })}
              </p>
            )}
            <p
              className="overflow-hidden break-words whitespace-pre-line"
              style={{
                fontFamily: HAND,
                fontSize: `${messageSize(text.length)}cqw`,
                lineHeight: 1.35,
                marginTop: to ? "0.8cqw" : 0,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: to ? 4 : 5,
                paddingRight: "4cqw",
              }}
            >
              {text}
              {writing && <Pen />}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** The blinking pen at the end of the text while the customer writes. */
function Pen() {
  return <span aria-hidden="true" className="ml-[0.5cqw] inline-block h-[1em] w-[0.12em] translate-y-[0.15em] animate-pulse rounded-full" style={{ background: INK }} />;
}
