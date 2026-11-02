import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { PASSWORD_MAX, PASSWORD_MIN, passwordRules } from "../api/auth";
import { ApiError, errorMessage } from "../api/client";
import { Button } from "../components/Button";
import { inputClass } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { Logo } from "../components/Logo";
import { navigate } from "../router";
import { useAuth, type LoginRequest } from "./AuthContext";
import { GoogleButton, googleSignInEnabled } from "./GoogleButton";

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
          aria-label={shown ? "Hide password" : "Show password"}
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
  if (!f.firstName.trim() || !f.lastName.trim()) return "Please complete your first and last name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Please enter a valid email address.";
  if (!f.password) return "Please enter your password.";
  if (!passwordRules(f.password).every((r) => r.met)) return `Please use a password between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;
  if (f.password !== f.confirm) return "Your passwords do not match.";
  return null;
}

/** Google sign-in failures in plain words; the API's own reasons stay generic on purpose. */
function googleError(e: unknown) {
  if (!(e instanceof ApiError) || e.kind !== "http") return errorMessage(e);
  if (e.message === "Incorrect password") return "That password is incorrect. Try again.";
  if (e.status === 503) return "Google sign-in is unavailable right now. Please use your email and password.";
  return "Unable to sign in with Google. Please try again.";
}

/** The app's registrationErrorMessage. */
function registrationError(e: unknown) {
  if (e instanceof ApiError && e.status === 409) return "This email already has an account. Log in instead.";
  return errorMessage(e);
}

export function PasswordMatch({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const ok = password === confirm;
  return (
    <p className={`mt-2 flex items-center gap-2 text-xs ${ok ? "text-success" : "text-muted-foreground"}`} aria-live="polite">
      <Icon name={ok ? "check" : "minus"} size={13} />
      {ok ? "Passwords match" : "Passwords don’t match yet"}
    </p>
  );
}

export function PasswordChecks({ password }: { password: string }) {
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

/** Sign in / Create account, over the current page so nothing in progress is lost. */
export function LoginModal({ request, onDone, onDismiss }: { request: LoginRequest; onDone: () => void; onDismiss: () => void }) {
  const { signIn, signInWithGoogle, registerAndSignIn } = useAuth();
  const [tab, setTab] = useState(request.tab ?? "signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Google account whose email already has a password account: its password links them once.
  const [link, setLink] = useState<{ idToken: string; message: string } | null>(null);
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
      if (tab === "signin") await signIn(form.loginEmail, form.password);
      else {
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
        setLink({ idToken, message: err.message });
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
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-border bg-card p-6 shadow-glow sm:rounded-[2rem] sm:p-8"
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" onClick={onDismiss} disabled={busy} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary">
            <Icon name="close" size={18} />
          </button>
        </div>
        <h2 id="login-title" className="mt-6 font-display text-3xl font-semibold">
          {tab === "signin" ? (
            <>
              Welcome <em className="font-normal text-primary">back.</em>
            </>
          ) : (
            <>
              Create your <em className="font-normal text-primary">account.</em>
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
            <p className="rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">{link.message}</p>
            <Field id="link-password" label="Your HomeCreator password">
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
              {busy ? "Connecting…" : "Connect Google and sign in"}
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
              Use email and password instead
            </button>
          </form>
        ) : (
          <>
        <div role="tablist" aria-label="Sign in or register" className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-border p-1">
          {(["signin", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "signin" ? "Sign in" : "Create an account"}
            </button>
          ))}
        </div>

        {googleSignInEnabled && (
          <div className="mt-6">
            <GoogleButton disabled={busy} onCredential={(idToken) => void continueWithGoogle(idToken)} />
            <p className="mt-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" /> or with your email <span className="h-px flex-1 bg-border" />
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {tab === "signin" ? (
            <>
              <Field id="login-email" label="Email address">
                <IconInput icon="mail" id="login-email" type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" value={form.loginEmail} onChange={set("loginEmail")} />
              </Field>
              <Field id="login-password" label="Password">
                <PasswordInput id="login-password" required autoComplete="current-password" value={form.password} onChange={set("password")} />
              </Field>
            </>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Why join">
                {(
                  [
                    ["sparkle", "Design your own"],
                    ["hand", "Handmade for you"],
                    ["cash", "Pay on delivery"],
                  ] as const
                ).map(([icon, label]) => (
                  <li key={label} className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5">
                    <Icon name={icon} size={13} className="text-primary" /> {label}
                  </li>
                ))}
              </ul>

              <FormSection title="About you" icon="user">
                <Field id="reg-first" label="First name">
                  <IconInput icon="user" id="reg-first" required autoComplete="given-name" maxLength={100} value={form.firstName} onChange={set("firstName")} />
                </Field>
                <Field id="reg-last" label="Last name">
                  <IconInput icon="user" id="reg-last" required autoComplete="family-name" maxLength={100} value={form.lastName} onChange={set("lastName")} />
                </Field>
              </FormSection>

              <FormSection title="Your account" hint="You’ll sign in with your email. We ask for your delivery address when you place your first order." icon="lock">
                <Field id="reg-email" label="Email address">
                  <IconInput icon="mail" id="reg-email" type="email" required autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
                </Field>
                <Field id="reg-password" label="Password">
                  <PasswordInput id="reg-password" required autoComplete="new-password" placeholder={`At least ${PASSWORD_MIN} characters`} maxLength={PASSWORD_MAX} value={form.password} onChange={set("password")} />
                  <PasswordChecks password={form.password} />
                </Field>
                <Field id="reg-confirm" label="Confirm password">
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
            {busy ? (tab === "signin" ? "Signing in…" : "Creating your account…") : tab === "signin" ? "Sign in" : "Create Account"}
            {!busy && <Icon name="arrowRight" size={18} />}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {tab === "signin" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={() => setTab(tab === "signin" ? "register" : "signin")} className="font-semibold text-primary hover:underline">
              {tab === "signin" ? "Create an account" : "Log In"}
            </button>
          </p>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
