import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import { sendContact } from "../api/contact";
import { orders as fetchOrders } from "../api/orders";
import { useAuth } from "../auth/AuthContext";
import { Button, ButtonLink } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { Page, PageHeader, SectionLabel } from "../components/Page";
import { useApi } from "../hooks/useApi";
import { prefersReducedMotion } from "../hooks/useInView";
import {
  CONTACT_LIMITS,
  SUPPORT_EMAIL,
  SUPPORT_TOPICS,
  supportMailUrl,
  validateContact,
  type ContactDraft,
  type ContactField,
  type SupportTopic,
} from "../lib/contact";

const RECENT_ORDERS = 5;
const empty = { subject: "", message: "", orderNumber: "" };

/** The four "How can we help?" cards; each starts the form on one of the app's topics. */
const HELP: { topic: SupportTopic; key: "order" | "design" | "account" | "other"; icon: IconName }[] = [
  { topic: "order", key: "order", icon: "package" },
  { topic: "design", key: "design", icon: "sparkle" },
  { topic: "account", key: "account", icon: "user" },
  { topic: "other", key: "other", icon: "help" },
];

/** A customer-friendly reason the message could not be sent; never raw server text for 5xx. */
function useSendError() {
  const { t } = useTranslation();
  return (failure: unknown) => {
    if (failure instanceof ApiError) {
      if (failure.status === 429) return t("contact.rateLimited");
      // Validation messages from the API, and our own (translated) network/timeout messages.
      if (failure.status === 400 || failure.status === 0) return failure.message;
    }
    return t("contact.sendFailed");
  };
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  const { t } = useTranslation();
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
      {children} {optional && <span className="font-normal text-muted-foreground">{t("common.optional")}</span>}
    </label>
  );
}

/* ---------------- Email card ---------------- */

function EmailCard({ topicLabel }: { topicLabel: string | null }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () =>
    navigator.clipboard
      .writeText(SUPPORT_EMAIL)
      .then(() => setCopied(true))
      .catch(() => {});

  return (
    <section aria-labelledby="contact-email" className="rounded-[2rem] border border-primary/40 bg-primary/10 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon name="mail" size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="contact-email" className="font-display text-xl font-semibold">
            {t("contact.emailTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("contact.emailBody")}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={supportMailUrl(topicLabel)}
          className="min-w-0 font-semibold break-all text-foreground underline decoration-primary/60 underline-offset-4 transition-colors hover:text-primary"
        >
          {SUPPORT_EMAIL}
        </a>
        {canCopy && (
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={t("contact.copyEmail")}
            title={t("contact.copyEmail")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
            <span aria-live="polite">{copied ? t("contact.copied") : null}</span>
          </button>
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="message" size={16} /> {t("contact.replyNote")}
      </p>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function ContactPage({ query }: { query?: URLSearchParams }) {
  const { t } = useTranslation();
  // "Tell me about a similar one" on a sold-out product opens this page with ?produkti=<name>.
  const product = query?.get("produkti")?.trim().slice(0, 100);
  const { user, openLogin } = useAuth();
  const sendError = useSendError();

  // Name and email are typed only when signed out; signed in, the account's are used (as in the app).
  const [guest, setGuest] = useState({ name: "", email: "" });
  const [form, setForm] = useState(() => ({ ...empty, subject: product ? t("products.notifySubject", { name: product }).slice(0, CONTACT_LIMITS.subject) : "" }));
  const [topic, setTopic] = useState<SupportTopic | null>(null);
  const [error, setError] = useState<{ field: ContactField | null; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const sending = useRef(false);
  const formCard = useRef<HTMLDivElement>(null);
  const sentHeading = useRef<HTMLHeadingElement>(null);

  const accountName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.userName || user?.email.split("@")[0] || t("contact.customer");
  const topicLabel = (id: SupportTopic) => t(`contact.topics.${id}`);
  const length = form.message.trim().length;

  // Recent orders, only once the customer says it is about an order.
  const wantsOrders = !!user && (topic === "order" || !!form.orderNumber);
  const { data: orderPage, loading: ordersLoading } = useApi(wantsOrders ? `contact-orders:${user?.id}` : null, (signal) => fetchOrders(1, signal), {
    ttl: 60_000,
  });
  const recent = (orderPage?.data ?? []).slice(0, RECENT_ORDERS);
  const showPicker = recent.length > 0;
  const showOrderInput = topic === "order" && !showPicker && !(wantsOrders && ordersLoading);

  useEffect(() => {
    if (sentTo) sentHeading.current?.focus();
  }, [sentTo]);

  const clearError = () => error && setError(null);
  const update = (key: keyof typeof empty) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    clearError();
  };
  const updateGuest = (key: "name" | "email") => (e: { target: { value: string } }) => {
    setGuest((g) => ({ ...g, [key]: e.target.value }));
    clearError();
  };

  // A topic fills an empty subject (or replaces one it filled before).
  function pickTopic(option: SupportTopic, toggle = true) {
    const next = toggle && topic === option ? null : option;
    setTopic(next);
    setForm((f) => ({
      ...f,
      subject: !f.subject.trim() || SUPPORT_TOPICS.some((id) => topicLabel(id) === f.subject) ? (next ? topicLabel(next) : "") : f.subject,
      orderNumber: next === "order" ? f.orderNumber : "",
    }));
    clearError();
  }

  function startWith(option: SupportTopic) {
    setSentTo(null);
    pickTopic(option, false);
    formCard.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    document.getElementById("contact-message")?.focus({ preventScroll: true });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    const draft: ContactDraft = {
      name: user ? accountName.slice(0, CONTACT_LIMITS.name) : guest.name,
      email: user ? user.email : guest.email,
      subject: form.subject.replace(/\s+/g, " "),
      message: form.message,
      orderNumber: form.orderNumber,
    };
    const invalid = validateContact(draft);
    if (invalid) {
      setError(invalid);
      document.getElementById(`contact-${invalid.field}`)?.focus();
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendContact(draft);
      setForm(empty);
      setTopic(null);
      setSentTo(draft.email.trim());
    } catch (failure) {
      // The draft stays so the customer can retry.
      setError({ field: null, message: sendError(failure) });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const invalid = (field: ContactField) => (error?.field === field ? { "aria-invalid": true, "aria-describedby": "contact-error" } : {});

  return (
    <Page>
      <PageHeader
        eyebrow={t("contact.eyebrow")}
        title={
          <>
            {t("contact.title")} <em className="font-normal text-primary">{t("contact.titleAccent")}</em>
          </>
        }
        intro={t("contact.intro")}
      />

      {/* Phones: help → form → email. Desktop: help and email on the left, the form beside them. */}
      <div className="mt-12 grid items-start gap-6 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-6">
        <section aria-labelledby="contact-help" className="animate-rise lg:col-start-1 lg:row-start-1" style={{ animationDelay: "300ms" }}>
          <h2 id="contact-help" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("contact.helpTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">{t("contact.helpIntro")}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {HELP.map(({ topic: id, key, icon }) => {
              const active = topic === id;
              const title = t(`contact.help.${key}.title`);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => startWith(id)}
                    aria-pressed={active}
                    aria-label={t("contact.helpAction", { topic: title })}
                    className={`group flex h-full w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                      }`}
                    >
                      <Icon name={icon} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{t(`contact.help.${key}.body`)}</span>
                    </span>
                    <Icon name="arrowRight" size={16} className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div
          ref={formCard}
          className="animate-rise scroll-mt-28 rounded-[2rem] border border-border bg-card p-6 sm:p-10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          style={{ animationDelay: "450ms" }}
        >
          {sentTo ? (
            <div role="status" className="flex flex-col items-center py-6 text-center sm:py-10">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <Icon name="check" size={28} />
              </span>
              <h2 ref={sentHeading} tabIndex={-1} className="mt-6 font-display text-3xl font-semibold tracking-tight focus:outline-none">
                {t("contact.sentTitle")}
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                {t("contact.sentBody")}
                <span className="font-semibold break-all text-foreground">{sentTo}</span>
                {t("contact.sentBodyEnd")}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => setSentTo(null)} glow>
                  {t("contact.sendAnother")}
                </Button>
                <ButtonLink href="#/" variant="secondary">
                  {t("contact.backHome")}
                </ButtonLink>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} noValidate aria-labelledby="contact-form-title" className="flex flex-col gap-6">
              <h2 id="contact-form-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("contact.formTitle")}
              </h2>

              {user ? (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/40 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name="user" size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("contact.sendingAs")}</p>
                    <p className="truncate font-semibold">{accountName}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <p className="sr-only">{t("contact.replyTo")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="contact-name">{t("contact.name")}</Label>
                      <input
                        id="contact-name"
                        autoComplete="name"
                        maxLength={CONTACT_LIMITS.name}
                        value={guest.name}
                        onChange={updateGuest("name")}
                        disabled={busy}
                        className={inputClass}
                        {...invalid("name")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">{t("contact.email")}</Label>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        maxLength={CONTACT_LIMITS.email}
                        value={guest.email}
                        onChange={updateGuest("email")}
                        disabled={busy}
                        className={inputClass}
                        {...invalid("email")}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("contact.replyTo")}{" "}
                    <span className="block sm:inline">
                      {t("contact.signInHint")}{" "}
                      <button type="button" onClick={() => openLogin()} className="font-semibold text-primary underline-offset-4 hover:underline">
                        {t("contact.signIn")}
                      </button>
                    </span>
                  </p>
                </div>
              )}

              <div>
                <SectionLabel as="p" id="contact-topic-label">
                  {t("contact.topicLabel")} <span className="tracking-normal normal-case">{t("common.optional")}</span>
                </SectionLabel>
                <div role="group" aria-labelledby="contact-topic-label" className="flex flex-wrap gap-2">
                  {SUPPORT_TOPICS.map((id) => (
                    <Chip key={id} selected={topic === id} onClick={() => pickTopic(id)}>
                      {topicLabel(id)}
                    </Chip>
                  ))}
                </div>
              </div>

              {wantsOrders && ordersLoading && !showPicker && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {t("contact.ordersLoading")}
                </p>
              )}

              {showPicker && (
                <div>
                  <SectionLabel as="p" id="contact-order-label">
                    {t("contact.orderLabel")} <span className="tracking-normal normal-case">{t("common.optional")}</span>
                  </SectionLabel>
                  <div role="group" aria-labelledby="contact-order-label" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {recent.map((order) => {
                      const active = order.orderNumber === form.orderNumber;
                      return (
                        <button
                          key={order.id}
                          type="button"
                          aria-pressed={active}
                          aria-label={t("contact.orderChip", { number: order.orderNumber, name: order.product.name })}
                          onClick={() => {
                            setForm((f) => ({ ...f, orderNumber: active ? "" : order.orderNumber }));
                            clearError();
                          }}
                          className={`w-44 shrink-0 rounded-2xl border p-3 text-left transition-colors ${
                            active ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:bg-secondary"
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${active ? "text-primary" : ""}`}>#{order.orderNumber}</span>
                          <span className="block truncate text-xs text-muted-foreground">{order.product.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showOrderInput && (
                <div>
                  <Label htmlFor="contact-orderNumber" optional>
                    {t("contact.orderNumber")}
                  </Label>
                  <input
                    id="contact-orderNumber"
                    value={form.orderNumber}
                    onChange={update("orderNumber")}
                    maxLength={CONTACT_LIMITS.orderNumber}
                    placeholder={t("contact.orderNumberPlaceholder")}
                    disabled={busy}
                    className={inputClass}
                    {...invalid("orderNumber")}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="contact-subject">{t("contact.subject")}</Label>
                <input
                  id="contact-subject"
                  value={form.subject}
                  onChange={update("subject")}
                  maxLength={CONTACT_LIMITS.subject}
                  placeholder={t("contact.subjectPlaceholder")}
                  disabled={busy}
                  className={inputClass}
                  {...invalid("subject")}
                />
              </div>

              <div>
                <Label htmlFor="contact-message">{t("contact.message")}</Label>
                <textarea
                  id="contact-message"
                  rows={7}
                  value={form.message}
                  onChange={update("message")}
                  maxLength={CONTACT_LIMITS.message}
                  placeholder={t("contact.messagePlaceholder")}
                  disabled={busy}
                  className={`${inputClass} min-h-40 resize-y`}
                  aria-describedby={error?.field === "message" ? "contact-error contact-count" : "contact-count"}
                  aria-invalid={error?.field === "message" || undefined}
                />
                <p
                  id="contact-count"
                  className="mt-1.5 text-right text-xs text-muted-foreground"
                  aria-label={t("contact.charactersLabel", { count: length, max: CONTACT_LIMITS.message })}
                >
                  {length > 0 && length < CONTACT_LIMITS.messageMin ? t("contact.moreNeeded", { count: CONTACT_LIMITS.messageMin - length }) : ""}
                  {length}/{CONTACT_LIMITS.message}
                </p>
              </div>

              {error && (
                <p id="contact-error" role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error.message}
                </p>
              )}

              <div>
                <Button type="submit" size="lg" glow disabled={busy} className="w-full sm:w-auto">
                  {busy ? t("contact.sending") : t("contact.send")} <Icon name="arrowRight" size={16} />
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="animate-rise lg:col-start-1 lg:row-start-2" style={{ animationDelay: "600ms" }}>
          <EmailCard topicLabel={topic ? topicLabel(topic) : null} />
        </div>
      </div>
    </Page>
  );
}
