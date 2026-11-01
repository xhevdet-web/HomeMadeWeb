/**
 * Small fetch wrapper for the HomeCreator API. The session is an httpOnly cookie the browser
 * sends by itself (`credentials: "include"`); there is no token in JavaScript. Writes need the
 * `X-HomeMade-Client: web` header, so every request sends it.
 */

const BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

export type ApiErrorKind = "http" | "network" | "timeout" | "config" | "aborted";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public kind: ApiErrorKind = "http",
  ) {
    super(message);
  }
}

export const NETWORK_MESSAGE = "We can't reach the server. Check your connection and try again.";
export const TIMEOUT_MESSAGE = "The request took too long. Please try again.";

let unauthorizedHandler: (() => void) | null = null;

/** Called on a 401 from an authenticated request: the session has ended. */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** The call needs the session; a 401 ends it. */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE) throw new ApiError("The website is not connected to the server (VITE_API_URL is missing).", 0, "config");
  const { method = "GET", body, params, auth = false, signal } = options;
  const form = body instanceof FormData;

  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, form ? 45_000 : 15_000);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward);
  if (signal?.aborted) controller.abort();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-HomeMade-Client": "web",
        // Never set Content-Type for FormData: the browser adds the multipart boundary.
        ...(body !== undefined && !form ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
  } catch {
    if (signal?.aborted && !timedOut) throw new ApiError("Request cancelled.", 0, "aborted");
    throw timedOut ? new ApiError(TIMEOUT_MESSAGE, 0, "timeout") : new ApiError(NETWORK_MESSAGE, 0, "network");
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (response.ok) throw new ApiError("The server sent a response we couldn't read.", response.status);
  }

  if (!response.ok) {
    const message = (data as { message?: unknown } | null)?.message;
    const text = Array.isArray(message) ? message.map(String).join(" ") : typeof message === "string" ? message : "";
    if (response.status === 401 && auth) unauthorizedHandler?.();
    throw new ApiError(text || `Something went wrong (error ${response.status}). Please try again.`, response.status);
  }
  return data as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
