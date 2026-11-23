import { HttpError } from "@/lib/api-error";

type ApiOptions = RequestInit & { skipAuthRedirect?: boolean };

/**
 * Thin fetch wrapper:
 *  - JSON by default, multipart when given FormData
 *  - normalises the API's `{ error: { code, message, details } }` envelope
 *  - broadcasts a 401 so the session provider can bounce to /login
 */
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuthRedirect, ...init } = options;
  const isFormData = init.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new HttpError(
      0,
      "offline",
      "You're offline. This will retry when you reconnect.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    if (
      response.status === 401 &&
      !skipAuthRedirect &&
      !path.startsWith("/api/auth/") &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("orbit:unauthorized"));
    }

    throw new HttpError(
      response.status,
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "Something went wrong.",
      payload?.error?.details,
    );
  }

  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
