import { request } from "./client";
import { parseUser, type User } from "./models";

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userName?: string;
  phone?: string;
  country?: string;
  address?: string;
  postalCode?: string;
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

/** Sets the httpOnly `hc_session` cookie and returns the user; there is no token in the response. */
export async function login(identifier: string, password: string) {
  const data = await request<{ expiresIn: number; user: unknown }>("/auth/login", {
    method: "POST",
    body: { identifier: identifier.trim().toLowerCase(), password },
  });
  return { user: parseUser(data.user), expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 };
}

export const logout = () => request<null>("/auth/logout", { method: "POST" });

/** Registration does not sign in; call `login` afterwards with the same credentials. */
export function register(input: RegistrationInput) {
  const opt = (v?: string) => v?.trim() || undefined;
  return request<unknown>("/auth/register", {
    method: "POST",
    body: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      userName: opt(input.userName)?.toLowerCase(),
      phone: opt(input.phone),
      country: opt(input.country),
      address: opt(input.address),
      postalCode: opt(input.postalCode),
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
export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/;

export const passwordRules = (password: string) => [
  { label: `At least ${PASSWORD_MIN} characters`, met: password.length >= PASSWORD_MIN },
  { label: `No more than ${PASSWORD_MAX} characters`, met: password.length <= PASSWORD_MAX },
];

export type { User };
