import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "../api/client";
import { sendContact } from "../api/contact";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";

export default function ContactPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email ?? "",
    subject: "",
    message: "",
    orderNumber: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendContact(form);
      // Our own wording in the page's language; the server's reply is in English.
      setSent(t("contact.sentBody"));
    } catch (err) {
      // Includes the server's rate-limit (429) message as it is.
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof form, label: string, opts: { type?: string; auto?: string; optional?: boolean } = {}) => (
    <div>
      <label htmlFor={`contact-${k}`} className="mb-1.5 block text-sm font-semibold">
        {label} {opts.optional && <span className="font-normal text-muted-foreground">{t("common.optional")}</span>}
      </label>
      <input id={`contact-${k}`} type={opts.type ?? "text"} autoComplete={opts.auto} required={!opts.optional} value={form[k]} onChange={set(k)} className={inputClass} />
    </div>
  );

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
      <div className="mt-12 max-w-2xl rounded-[2rem] border border-border bg-card p-6 sm:p-10">
        {sent ? (
          <div role="status" className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Icon name="check" size={24} />
            </span>
            <p className="mt-5 font-display text-2xl font-semibold">{t("contact.sent")}</p>
            <p className="mt-2 text-muted-foreground">{sent}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", t("contact.name"), { auto: "name" })}
              {field("email", t("contact.email"), { type: "email", auto: "email" })}
            </div>
            {field("subject", t("contact.subject"))}
            {field("orderNumber", t("contact.orderNumber"), { optional: true })}
            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold">
                {t("contact.message")}
              </label>
              <textarea id="contact-message" required rows={6} value={form.message} onChange={set("message")} className={`${inputClass} resize-y`} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div>
              <Button type="submit" glow disabled={busy}>
                {busy ? t("contact.sending") : t("contact.send")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Page>
  );
}
