export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isOffline(): boolean {
    return this.status === 0;
  }
}

export function fieldError(error: unknown, field: string): string | null {
  if (!(error instanceof HttpError)) return null;
  if (error.status === 409 && error.details && typeof error.details === "object") {
    const details = error.details as { field?: string };
    if (details.field === field) return error.message;
  }
  if (Array.isArray(error.details)) {
    for (const issue of error.details) {
      if (
        issue &&
        typeof issue === "object" &&
        "path" in issue &&
        (issue as { path: string }).path === field
      ) {
        return (issue as { message: string }).message;
      }
    }
  }
  return null;
}
