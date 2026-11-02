import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { ApiError, onUnauthorized } from "../api/client";
import type { User } from "../api/models";
import { LoginModal } from "./LoginModal";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

export interface LoginRequest {
  /** Shown at the top of the modal. */
  message?: string;
  tab?: "signin" | "register";
  /** The action the visitor was trying to do; continued after signing in. */
  onSuccess?: () => void | Promise<void>;
  /** The visitor closed the modal without signing in. */
  onClose?: () => void;
}

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves to whether the account still needs a first or last name. */
  signInWithGoogle: (idToken: string, password?: string) => Promise<{ profileComplete: boolean }>;
  registerAndSignIn: (input: authApi.RegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  /** Runs `action` now when signed in, otherwise after the visitor signs in. */
  requireAuth: (action: () => void | Promise<void>, message?: string) => void;
  openLogin: (request?: LoginRequest) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export const SESSION_ENDED = "Your session has ended. Please sign in again.";

/**
 * The session lives in an httpOnly cookie; this context only keeps the user in memory.
 * On start `GET /auth/me` tells whether the cookie is still valid. Nothing is stored in localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [modal, setModal] = useState<LoginRequest | null>(null);
  const statusRef = useRef(status);
  const expiryTimer = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const openLogin = useCallback((request: LoginRequest = {}) => {
    setModal((prev) =>
      prev
        ? { ...prev, ...request, message: prev.message ?? request.message, onSuccess: request.onSuccess ?? prev.onSuccess }
        : request,
    );
  }, []);

  const signedIn = useCallback((u: User, expiresAt?: number) => {
    setUserState(u);
    setStatus("signedIn");
    window.clearTimeout(expiryTimer.current);
    if (expiresAt) {
      // Sign out when the cookie's lifetime is over; drafts are kept.
      expiryTimer.current = window.setTimeout(() => expire(), Math.max(0, expiresAt - Date.now()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expire = useCallback(() => {
    if (statusRef.current !== "signedIn") return;
    window.clearTimeout(expiryTimer.current);
    setUserState(null);
    setStatus("signedOut");
    openLogin({ message: SESSION_ENDED });
  }, [openLogin]);

  // On start: 200 → signed in; 401 or network error → signed out, silently.
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal, true)
      .then((u) => signedIn(u))
      .catch((e) => {
        if (e instanceof ApiError && e.kind === "aborted") return;
        setStatus("signedOut");
      });
    return () => controller.abort();
  }, [signedIn]);

  useEffect(() => {
    onUnauthorized(expire);
    return () => onUnauthorized(null);
  }, [expire]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user: u, expiresAt } = await authApi.login(email, password);
      signedIn(u, expiresAt);
    },
    [signedIn],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string, password?: string) => {
      const { user: u, expiresAt, profileComplete } = await authApi.googleLogin(idToken, password);
      signedIn(u, expiresAt);
      return { profileComplete };
    },
    [signedIn],
  );

  const registerAndSignIn = useCallback(
    async (input: authApi.RegistrationInput) => {
      await authApi.register(input);
      await signIn(input.email, input.password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      window.clearTimeout(expiryTimer.current);
      setUserState(null);
      setStatus("signedOut");
    }
  }, []);

  const requireAuth = useCallback(
    (action: () => void | Promise<void>, message?: string) => {
      if (statusRef.current === "signedIn") void action();
      else openLogin({ message, onSuccess: action });
    },
    [openLogin],
  );

  const close = (success: boolean) => {
    const current = modal;
    setModal(null);
    if (success) void current?.onSuccess?.();
    else current?.onClose?.();
  };

  return (
    <AuthContext.Provider value={{ status, user, signIn, signInWithGoogle, registerAndSignIn, signOut, setUser: (u) => setUserState(u), requireAuth, openLogin }}>
      {children}
      {modal && <LoginModal request={modal} onDone={() => close(true)} onDismiss={() => close(false)} />}
    </AuthContext.Provider>
  );
}
