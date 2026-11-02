import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/Button";
import { Page } from "../components/Page";
import i18n from "../i18n";
import { navigate } from "../router";
import { useAuth } from "./AuthContext";

/** Protected pages: show the login modal when signed out, render the page after login. Closing goes home. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, openLogin } = useAuth();

  useEffect(() => {
    if (status === "signedOut") openLogin({ message: i18n.t("auth.prompts.page"), onClose: () => navigate("#/") });
  }, [status, openLogin]);

  if (status === "signedIn") return <>{children}</>;
  return (
    <Page>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border bg-card px-6 py-16 text-center">
        {status === "loading" ? (
          <p className="text-muted-foreground" role="status">
            {t("auth.checkingSession")}
          </p>
        ) : (
          <>
            <p className="font-display text-3xl font-semibold">{t("auth.signInToContinue")}</p>
            <p className="mt-3 text-muted-foreground">{t("auth.accountOnly")}</p>
            <Button className="mt-8" onClick={() => openLogin({ onClose: () => navigate("#/") })}>
              {t("auth.signIn")}
            </Button>
          </>
        )}
      </div>
    </Page>
  );
}
