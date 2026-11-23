import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "./env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details);

export const unauthorized = (message = "You need to sign in.") =>
  new ApiError(401, "unauthorized", message);

export const forbidden = (message = "You don't have access to that.") =>
  new ApiError(403, "forbidden", message);

export const notFound = (message = "Not found.") =>
  new ApiError(404, "not_found", message);

export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "conflict", message, details);

export const tooManyRequests = (message = "Too many requests. Slow down.") =>
  new ApiError(429, "rate_limited", message);

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Some fields need attention.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  console.error("[api] unhandled error", error);

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "Something went wrong on our side.",
      },
    },
    { status: 500 },
  );
}

/** Wraps a route handler so every thrown ApiError/ZodError becomes JSON. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Cookie auth is same-site, but we still verify the Origin header on writes
 * so a malicious form post from another origin cannot ride an existing cookie.
 */
export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;

  const origin = request.headers.get("origin");
  if (!origin) return; // curl / server-to-server

  const allowed = new Set<string>([env.NEXT_PUBLIC_APP_URL]);
  const host = request.headers.get("host");
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  if (!allowed.has(origin)) {
    throw forbidden("Cross-origin request blocked.");
  }
}

export function noStore<T>(data: T) {
  return json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
