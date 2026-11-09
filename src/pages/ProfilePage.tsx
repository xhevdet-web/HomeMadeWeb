import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { changePassword, passwordRules, updateProfile } from "../api/auth";
import { errorMessage } from "../api/client";
import { missingDelivery } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { PasswordChecks } from "../auth/LoginModal";
import { Button } from "../components/Button";
import { Toggle, inputClass } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { SectionLabel } from "../components/Page";
import { setLanguage } from "../i18n";
import { initialsOf } from "../lib/format";
import { navigate } from "../router";
import { useToast } from "../studio/Toasts";
// Light mode is switched off for now (see theme.tsx).
// import { useTheme } from "../theme";
import { DeliveryForm } from "./CheckoutPage";

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, setUser, signOut } = useAuth();
  const toast = useToast();
  // const { theme, setTheme } = useTheme();
  // Opens straight away when the account has no name yet (a new Google account without one).
  const [editing, setEditing] = useState(() => !!user && (!user.firstName.trim() || !user.lastName.trim()));
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  if (!user) return null;
  const missing = missingDelivery(user);
  const albanian = i18n.language === "sq";

  const setNotifications = async (on: boolean) => {
    const previous = user;
    setUser({ ...user, notificationsEnabled: on });
    setSavingNotifications(true);
    try {
      setUser(await updateProfile({ notificationsEnabled: on }));
    } catch (e) {
      setUser(previous);
      toast(errorMessage(e));
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
      <p className="eyebrow animate-rise" style={rise(0)}>
        {t("nav.profile")}
      </p>
      <h1 className="animate-rise mt-5 font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl" style={rise(150)}>
        {user.firstName ? t("profile.hello") : t("profile.helloNoName")} <em className="font-normal text-primary">{user.firstName || t("profile.there")}.</em>
      </h1>

      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="animate-rise rounded-[2rem] border border-border bg-card p-8 lg:sticky lg:top-28" style={rise(300)}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">{initialsOf(user)}</span>
          <h2 className="mt-5 font-display text-3xl font-semibold break-words">
            {user.firstName} {user.lastName}
          </h2>
          <p className="mt-2 break-all text-muted-foreground">{user.email}</p>
          <Button variant="secondary" size="sm" className="mt-6" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            <Icon name="pencil" size={15} /> {editing ? t("profile.closeEditor") : t("profile.editDetails")}
          </Button>
        </aside>

        <div className="animate-rise flex min-w-0 flex-col gap-8" style={rise(450)}>
          {missing.length > 0 && !editing && (
            <div className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <Icon name="alert" className="mt-0.5 text-primary" />
              <p className="flex-1">{t("profile.completeDelivery")}</p>
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold whitespace-nowrap text-primary hover:underline">
                {t("profile.addNow")}
              </button>
            </div>
          )}

          {editing && (
            <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <SectionLabel as="h2">{t("profile.detailsTitle")}</SectionLabel>
              <p className="mb-5 text-sm text-muted-foreground">{t("profile.emailFixed", { email: user.email })}</p>
              <DeliveryForm
                user={user}
                submitLabel={t("common.save")}
                onSaved={(u) => {
                  setUser(u);
                  setEditing(false);
                  toast(t("profile.saved"));
                }}
              />
            </section>
          )}

          {changingPassword && <PasswordForm onDone={() => setChangingPassword(false)} />}

          <Group title={t("profile.account")}>
            <Row icon="user" title={t("profile.personalDetails")} subtitle={user.phone || t("profile.addPhone")} onClick={() => setEditing(true)} />
            <Row icon="mapPin" title={t("profile.deliveryAddress")} subtitle={[user.address, user.postalCode, user.country].filter(Boolean).join(", ") || t("profile.addAddress")} onClick={() => setEditing(true)} />
            <Row icon="lock" title={t("profile.changePassword")} onClick={() => setChangingPassword(true)} />
          </Group>

          <Group title={t("profile.activity")}>
            <Row icon="layers" title={t("nav.myDesigns")} href="#/designs" />
            <Row icon="package" title={t("profile.myOrders")} href="#/orders" />
            <Row icon="bell" title={t("nav.notifications")} href="#/notifications" />
          </Group>

          <Group title={t("profile.preferences")}>
            {/* Light mode is off for now.
            <Row icon="moon" title={t("nav.darkMode")} trailing={<Toggle checked={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} label={t("nav.darkMode")} />} />
            */}
            <Row
              icon="bell"
              title={t("nav.notifications")}
              subtitle={t("profile.notificationsHint")}
              trailing={<Toggle checked={user.notificationsEnabled} onChange={(on) => !savingNotifications && void setNotifications(on)} label={t("nav.notifications")} />}
            />
            <Row
              icon="globe"
              title={t("profile.language")}
              subtitle={albanian ? t("language.albanian") : t("language.english")}
              onClick={() => setLanguage(albanian ? "en" : "sq")}
            />
          </Group>

          <Group title={t("profile.support")}>
            <Row icon="mail" title={t("contact.eyebrow")} href="#/contact" />
          </Group>

          <Group title={t("profile.session")}>
            <Row
              icon="logout"
              title={t("nav.signOut")}
              danger
              onClick={() =>
                void signOut()
                  .catch(() => {})
                  .then(() => navigate("#/"))
              }
            />
          </Group>

          <p className="text-center text-sm text-muted-foreground">{t("profile.version", { version: "1.0.0" })}</p>
        </div>
      </div>
    </div>
  );
}

/** The API's change-password messages, in the page's language. */
const PASSWORD_ERRORS = {
  "Current password is incorrect": "profile.password.currentIncorrect",
  "New password must be different from your current password": "profile.password.samePassword",
  "This account signs in with Google and has no password": "profile.password.googleOnly",
} as const;

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ok = passwordRules(form.newPassword).every((r) => r.met) && form.newPassword === form.confirmPassword;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await changePassword(form);
      toast(t("profile.password.changed"));
      onDone();
    } catch (err) {
      const message = errorMessage(err);
      const known = PASSWORD_ERRORS[message as keyof typeof PASSWORD_ERRORS];
      setError(known ? t(known) : message);
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof form, label: string, auto: string) => (
    <div>
      <label htmlFor={`pw-${k}`} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={`pw-${k}`} type="password" required autoComplete={auto} maxLength={128} value={form[k]} onChange={set(k)} className={inputClass} />
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <SectionLabel as="h2">{t("profile.changePassword")}</SectionLabel>
      {field("currentPassword", t("profile.password.current"), "current-password")}
      <div>
        {field("newPassword", t("profile.password.new"), "new-password")}
        <PasswordChecks password={form.newPassword} />
      </div>
      {field("confirmPassword", t("profile.password.confirm"), "new-password")}
      {form.confirmPassword && form.confirmPassword !== form.newPassword && <p className="text-sm text-destructive">{t("profile.password.noMatch")}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={!ok || busy}>
          {busy ? t("common.saving") : t("profile.changePassword")}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionLabel as="h2">{title}</SectionLabel>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</ul>
    </section>
  );
}

function Row({ icon, title, subtitle, href, onClick, trailing, danger }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-destructive" : ""}`}>{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>}
      </span>
      {!trailing && !danger && <Icon name="chevronRight" size={18} className="text-muted-foreground" />}
    </>
  );
  const rowClass = "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/50";
  return (
    <li>
      {trailing ? (
        <div className="flex items-center gap-4 px-5 py-4">
          {content}
          {trailing}
        </div>
      ) : href ? (
        <a href={href} className={rowClass}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={rowClass}>
          {content}
        </button>
      )}
    </li>
  );
}
