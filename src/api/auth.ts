import i18n from "../i18n";
import { request } from "./client";
import { parseUser, type User } from "./models";

/** Delivery details are not asked at sign-up; checkout asks for them before the first order. */
export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  address?: string;
  postalCode?: string | null;
  notificationsEnabled?: boolean;
}

/** Email-only sign-in. Sets the httpOnly `hc_session` cookie and returns the user; there is no token in the response. */
export async function login(email: string, password: string) {
  const data = await request<{ expiresIn: number; user: unknown }>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  return { user: parseUser(data.user), expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 };
}

/**
 * Sign in or sign up with a Google ID token; the API verifies it and sets the same cookie as
 * `login`. A 409 means an account with that email exists: send its password once to link Google.
 */
export async function googleLogin(idToken: string, password?: string) {
  const data = await request<{ expiresIn: number; user: unknown; profileComplete?: boolean }>("/auth/google", {
    method: "POST",
    body: { idToken, password },
  });
  return {
    user: parseUser(data.user),
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000,
    profileComplete: data.profileComplete !== false,
  };
}

export const logout = () => request<null>("/auth/logout", { method: "POST" });

/** Registration does not sign in; call `login` afterwards with the same credentials. */
export function register(input: RegistrationInput) {
  return request<unknown>("/auth/register", {
    method: "POST",
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });
}

/** `quiet` skips the session-ended handling (used on start, where 401 just means signed out). */
export const me = (signal?: AbortSignal, quiet = false) =>
  request<unknown>("/auth/me", { auth: !quiet, signal }).then(parseUser);

export const changePassword = (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
  request<{ message?: string }>("/auth/change-password", { method: "PATCH", body, auth: true });

/** Only the signed-in user's own profile; never PATCH /users/:id (admin-only). */
export const updateProfile = (body: ProfileInput) =>
  request<unknown>("/users/me", { method: "PATCH", body, auth: true }).then(parseUser);

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export const passwordRules = (password: string) => [
  { label: i18n.t("auth.ruleMin", { count: PASSWORD_MIN }), met: password.length >= PASSWORD_MIN },
  { label: i18n.t("auth.ruleMax", { count: PASSWORD_MAX }), met: password.length <= PASSWORD_MAX },
];

export type { User };
