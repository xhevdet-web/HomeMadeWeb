import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/* Google Identity Services: Google's own "Continue with Google" button, which hands back an ID
 * token (the "credential"). The token goes to the API, which verifies it; nothing here trusts it. */

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
const SCRIPT = "https://accounts.google.com/gsi/client";

interface GoogleId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    context?: "signin" | "signup" | "use";
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Off until VITE_GOOGLE_CLIENT_ID is set, so the website works without Google configured. */
export const googleSignInEnabled = !!CLIENT_ID;

/**
 * Development only: which origin Google will see and which Web client is bundled (its public
 * prefix only). "origin_mismatch" means this origin is missing from that client's Authorized
 * JavaScript origins in Google Cloud. Never logs tokens.
 */
let diagnosed = false;
function diagnose() {
  if (!import.meta.env.DEV || diagnosed) return;
  diagnosed = true;
  console.info(`[google sign-in] origin=${location.origin} client=${CLIENT_ID.split("-")[0]}-…${CLIENT_ID.slice(-30)} mode=${import.meta.env.MODE}`);
}

let loading: Promise<GoogleId> | null = null;
function loadGoogle() {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const fail = () => {
      loading = null;
      reject(new Error("Google sign-in could not load"));
    };
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : fail());
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The same button on Sign in and Create account: the API decides whether the Google account
 * signs in, is linked or becomes a new account. If the customer closes Google's popup, Google
 * calls nothing back and the modal simply stays as it was.
 */
export function GoogleButton({ onCredential, disabled = false }: { onCredential: (idToken: string) => void; disabled?: boolean }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  latest.current = onCredential;
  const [failed, setFailed] = useState(false);

  // Drawn again when the language changes: Google writes the button's text itself.
  useEffect(() => {
    if (!CLIENT_ID) return;
    diagnose();
    let live = true;
    loadGoogle()
      .then((google) => {
        if (!live || !box.current) return;
        box.current.replaceChildren();
        google.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => credential && latest.current(credential),
          ux_mode: "popup",
          auto_select: false,
          context: "use",
        });
        const light = document.documentElement.dataset.theme === "light";
        google.renderButton(box.current, {
          type: "standard",
          theme: light ? "outline" : "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          locale: language,
          // Google draws buttons 200–400px wide.
          width: Math.max(200, Math.min(400, Math.floor(box.current.offsetWidth))),
        });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [language]);

  if (!CLIENT_ID) return null;
  return (
    <div>
      {/* Google's own button must stay visible: its iframe ignores clicks once it is hidden or
          covered (clickjacking protection). The light color-scheme matches the iframe's, so the
          browser doesn't paint a white box behind it on the dark site. */}
      <div
        ref={box}
        aria-busy={disabled}
        style={{ colorScheme: "light" }}
        className={`flex min-h-11 w-full justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`}
      />
      {failed && (
        <p role="alert" className="mt-2 text-center text-xs text-muted-foreground">
          {t("auth.google.loadFailed")}
        </p>
      )}
    </div>
  );
}
