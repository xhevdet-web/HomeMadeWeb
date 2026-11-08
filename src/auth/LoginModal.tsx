import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PASSWORD_MAX, PASSWORD_MIN, passwordRules } from "../api/auth";
import { ApiError, errorMessage } from "../api/client";
import { Button } from "../components/Button";
import { inputClass } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { Logo } from "../components/Logo";
import i18n from "../i18n";
import { navigate } from "../router";
import { useAuth, type LoginRequest } from "./AuthContext";
import { GoogleButton, googleSignInEnabled } from "./GoogleButton";

// Validators and error mappers run on submit, so messages use the current language.
const t = i18n.t.bind(i18n);

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/** An input with a leading icon, like the app's fields. */
function IconInput({ icon, trailing, ...props }: { icon: IconName; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon name={icon} size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
      <input {...props} className={`${inputClass} pl-11 ${trailing ? "pr-12" : ""}`} />
      {trailing}
    </div>
  );
}

/** Password field with show / hide, like the app's PasswordInput. */
function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <IconInput
      icon="lock"
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={shown}
          className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name={shown ? "eyeOff" : "eye"} size={18} />
        </button>
      }
    />
  );
}

function FormSection({ title, hint, icon, children }: { title: string; hint?: string; icon: IconName; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-[1.5rem] border border-border bg-background/40 p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3" aria-hidden="true">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon name={icon} size={17} />
        </span>
        <div>
          <p className="font-display text-lg leading-tight font-semibold">{title}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

/** The app's validateRegistration: the first problem, or null when the form can be sent. */
function registrationProblem(f: { firstName: string; lastName: string; email: string; password: string; confirm: string }) {
  if (!f.firstName.trim() || !f.lastName.trim()) return t("auth.validation.nameRequired");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return t("auth.validation.invalidEmail");
  if (!f.password) return t("auth.validation.passwordRequired");
  if (!passwordRules(f.password).every((r) => r.met)) return t("auth.validation.passwordLength", { min: PASSWORD_MIN, max: PASSWORD_MAX });
  if (f.password !== f.confirm) return t("auth.validation.passwordsDoNotMatch");
  return null;
}

/** Wrong email or password reads in the page's language; other problems as they are. */
function signInError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) return t("auth.invalidCredentials");
  return errorMessage(e);
}

/** Google sign-in failures in plain words; the API's own reasons stay generic on purpose. */
function googleError(e: unknown) {
  if (!(e instanceof ApiError) || e.kind !== "http") return errorMessage(e);
  if (e.message === "Incorrect password") return t("auth.google.incorrectPassword");
  if (e.status === 503) return t("auth.google.unavailable");
  return t("auth.google.failed");
}

/** The app's registrationErrorMessage. */
function registrationError(e: unknown) {
  if (e instanceof ApiError && e.status === 409) return t("auth.emailTaken");
  return errorMessage(e);
}

export function PasswordMatch({ password, confirm }: { password: string; confirm: string }) {
  const { t } = useTranslation();
  if (!confirm) return null;
  const ok = password === confirm;
  return (
    <p className={`mt-2 flex items-center gap-2 text-xs ${ok ? "text-success" : "text-muted-foreground"}`} aria-live="polite">
      <Icon name={ok ? "check" : "minus"} size={13} />
      {ok ? t("auth.passwordsMatch") : t("auth.passwordsNoMatchYet")}
    </p>
  );
}

export function PasswordChecks({ password }: { password: string }) {
  // Re-renders the rule labels when the language changes.
  useTranslation();
  return (
    <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
      {passwordRules(password).map((rule) => (
        <li key={rule.label} className={`flex items-center gap-2 ${rule.met ? "text-success" : "text-muted-foreground"}`}>
          <Icon name={rule.met ? "check" : "minus"} size={13} />
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

const BENEFITS = [
  ["sparkle", "auth.benefits.design"],
  ["hand", "auth.benefits.handmade"],
  ["cash", "auth.benefits.payOnDelivery"],
] as const;

/** Sign in / Create account, over the current page so nothing in progress is lost. */
export function LoginModal({ request, onDone, onDismiss }: { request: LoginRequest; onDone: () => void; onDismiss: () => void }) {
  const { t } = useTranslation();
  const { signIn, signInWithGoogle, registerAndSignIn } = useAuth();
  const [tab, setTab] = useState(request.tab ?? "signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Google account whose email already has a password account: its password links them once.
  const [link, setLink] = useState<{ idToken: string } | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [form, setForm] = useState({
    loginEmail: "",
    password: "",
    confirm: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const dialog = useRef<HTMLDivElement>(null);
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError(null);
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [busy, onDismiss]);

  useEffect(() => {
    setError(null);
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [tab]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === "signin") {
        try {
          await signIn(form.loginEmail, form.password);
        } catch (err) {
          throw new Error(signInError(err));
        }
      } else {
        const problem = registrationProblem(form);
        if (problem) throw new Error(problem);
        try {
          // Delivery details are asked at checkout, before the first order.
          await registerAndSignIn({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
          });
        } catch (err) {
          throw new Error(registrationError(err));
        }
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** Both tabs: the API signs the Google account in, links it, or creates the account. */
  const continueWithGoogle = async (idToken: string, password?: string) => {
    setBusy(true);
    setError(null);
    try {
      const { profileComplete } = await signInWithGoogle(idToken, password);
      onDone();
      // A Google account without a name: the profile opens with its editor. A pending action
      // (ordering) goes on instead; checkout asks for the name with the delivery details.
      if (!profileComplete && !request.onSuccess) navigate("#/profile");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && !password) {
        setLink({ idToken });
        setLinkPassword("");
      } else setError(googleError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onPointerDown={(e) => e.target === e.currentTarget && !busy && onDismiss()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-border bg-card p-6 shadow-glow sm:rounded-[2rem] sm:p-8"
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" onClick={onDismiss} disabled={busy} aria-label={t("common.close")} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary">
            <Icon name="close" size={18} />
          </button>
        </div>
        <h2 id="login-title" className="mt-6 font-display text-3xl font-semibold">
          {tab === "signin" ? (
            <>
              {t("auth.welcome")} <em className="font-normal text-primary">{t("auth.welcomeAccent")}</em>
            </>
          ) : (
            <>
              {t("auth.createTitle")} <em className="font-normal text-primary">{t("auth.createTitleAccent")}</em>
            </>
          )}
        </h2>
        {request.message && <p className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">{request.message}</p>}

        {link ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void continueWithGoogle(link.idToken, linkPassword);
            }}
            className="mt-6 flex flex-col gap-4"
          >
            <p className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">{t("auth.google.linkExplanation")}</p>
            <Field id="link-password" label={t("auth.google.linkPassword")}>
              <PasswordInput
                id="link-password"
                required
                autoComplete="current-password"
                value={linkPassword}
                onChange={(e) => {
                  setLinkPassword(e.target.value);
                  setError(null);
                }}
              />
            </Field>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <Icon name="alert" size={16} className="mt-0.5" /> {error}
              </p>
            )}
            <Button type="submit" size="lg" glow disabled={busy} className="mt-2 w-full">
              {busy ? t("auth.google.connecting") : t("auth.google.linkSubmit")}
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setLink(null);
                setError(null);
              }}
              className="text-center text-sm font-semibold text-primary hover:underline"
            >
              {t("auth.google.linkCancel")}
            </button>
          </form>
        ) : (
          <>
            <div role="tablist" aria-label={t("auth.tabsLabel")} className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-border p-1">
              {(["signin", "register"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {id === "signin" ? t("auth.signIn") : t("auth.createAccount")}
                </button>
              ))}
            </div>

            {googleSignInEnabled && (
              <div className="mt-6">
                <GoogleButton disabled={busy} onCredential={(idToken) => void continueWithGoogle(idToken)} />
                <p className="mt-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" /> {t("auth.orWithEmail")} <span className="h-px flex-1 bg-border" />
                </p>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              {tab === "signin" ? (
                <>
                  <Field id="login-email" label={t("auth.email")}>
                    <IconInput icon="mail" id="login-email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" value={form.loginEmail} onChange={set("loginEmail")} />
                  </Field>
                  <Field id="login-password" label={t("auth.password")}>
                    <PasswordInput id="login-password" required autoComplete="current-password" value={form.password} onChange={set("password")} />
                  </Field>
                </>
              ) : (
                <>
                  <ul className="flex flex-wrap gap-2 text-xs font-semibold" aria-label={t("auth.benefits.label")}>
                    {BENEFITS.map(([icon, label]) => (
                      <li key={label} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5">
                        <Icon name={icon} size={13} className="text-primary" /> {t(label)}
                      </li>
                    ))}
                  </ul>

                  <FormSection title={t("auth.aboutYou")} icon="user">
                    <Field id="reg-first" label={t("auth.firstName")}>
                      <IconInput icon="user" id="reg-first" required autoComplete="given-name" maxLength={100} value={form.firstName} onChange={set("firstName")} />
                    </Field>
                    <Field id="reg-last" label={t("auth.lastName")}>
                      <IconInput icon="user" id="reg-last" required autoComplete="family-name" maxLength={100} value={form.lastName} onChange={set("lastName")} />
                    </Field>
                  </FormSection>

                  <FormSection title={t("auth.yourAccount")} hint={t("auth.accountHint")} icon="lock">
                    <Field id="reg-email" label={t("auth.email")}>
                      <IconInput icon="mail" id="reg-email" type="email" required autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
                    </Field>
                    <Field id="reg-password" label={t("auth.password")}>
                      <PasswordInput id="reg-password" required autoComplete="new-password" placeholder={t("auth.passwordPlaceholder", { count: PASSWORD_MIN })} maxLength={PASSWORD_MAX} value={form.password} onChange={set("password")} />
                      <PasswordChecks password={form.password} />
                    </Field>
                    <Field id="reg-confirm" label={t("auth.confirmPassword")}>
                      <PasswordInput id="reg-confirm" required autoComplete="new-password" maxLength={PASSWORD_MAX} value={form.confirm} onChange={set("confirm")} />
                      <PasswordMatch password={form.password} confirm={form.confirm} />
                    </Field>
                  </FormSection>
                </>
              )}

              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <Icon name="alert" size={16} className="mt-0.5" /> {error}
                </p>
              )}

              <Button type="submit" size="lg" glow disabled={busy} className="mt-2 w-full">
                {busy ? (tab === "signin" ? t("auth.signingIn") : t("auth.creating")) : tab === "signin" ? t("auth.signIn") : t("auth.createSubmit")}
                {!busy && <Icon name="arrowRight" size={18} />}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {tab === "signin" ? t("auth.newHere") : t("auth.haveAccount")}{" "}
                <button type="button" onClick={() => setTab(tab === "signin" ? "register" : "signin")} className="font-semibold text-primary hover:underline">
                  {tab === "signin" ? t("auth.createAccount") : t("auth.logIn")}
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
