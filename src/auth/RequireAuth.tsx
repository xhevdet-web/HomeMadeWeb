import { useEffect, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Page } from "../components/Page";
import { navigate } from "../router";
import { useAuth } from "./AuthContext";

/** Protected pages: show the login modal when signed out, render the page after login. Closing goes home. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, openLogin } = useAuth();

  useEffect(() => {
    if (status === "signedOut") openLogin({ message: "Sign in to see this page.", onClose: () => navigate("#/") });
  }, [status, openLogin]);

  if (status === "signedIn") return <>{children}</>;
  return (
    <Page>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border bg-card px-6 py-16 text-center">
        {status === "loading" ? (
          <p className="text-muted-foreground" role="status">
            Checking your session…
          </p>
        ) : (
          <>
            <p className="font-display text-3xl font-semibold">Sign in to continue.</p>
            <p className="mt-3 text-muted-foreground">This page is only for your account.</p>
            <Button className="mt-8" onClick={() => openLogin({ onClose: () => navigate("#/") })}>
              Sign in
            </Button>
          </>
        )}
      </div>
    </Page>
  );
}
