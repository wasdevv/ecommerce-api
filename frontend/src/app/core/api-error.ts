import { HttpErrorResponse } from '@angular/common/http';

/** The API's error envelope, flattened: validation (`errors`) or business rule (`code` + `details`). */
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  errors: Record<string, string[]>;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = typeof error.error === 'object' && error.error ? error.error : {};
    return {
      status: error.status,
      // status 0 = the request never got an answer (offline, DNS, server down)
      message: error.status === 0 ? 'Could not reach the server. Check your connection.' : (body.message ?? `Request failed (${error.status})`),
      code: body.code,
      details: body.details,
      errors: body.errors ?? {},
    };
  }
  return { status: 0, message: 'Something went wrong.', errors: {} };
}

/** First validation message for a field, or the general message when the error isn't about fields. */
export const fieldError = (e: ApiError | null, field: string) => e?.errors[field]?.[0] ?? null;
export const generalError = (e: ApiError | null) => (e && !Object.keys(e.errors).length ? e : null);
