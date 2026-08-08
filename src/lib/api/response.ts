import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard API envelope used by every REST route so clients get a consistent
 * shape for data, errors, and pagination.
 */
export interface ApiMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data, meta }, init);
}

export function created<T>(data: T) {
  return ok(data, undefined, { status: 201 });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json<ApiError>(
    { success: false, error: { code, message, details } },
    { status },
  );
}

export function paginationMeta(
  total: number,
  page: number,
  pageSize: number,
): ApiMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Convert any thrown error into a consistent API error response.
 * Keeps route handlers thin: `try { ... } catch (e) { return handleApiError(e) }`.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Invalid request payload", 422, error.flatten());
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return fail("UNAUTHENTICATED", "Authentication required", 401);
    }
    if (error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to this resource", 403);
    }
    if (error.message === "NOT_FOUND") {
      return fail("NOT_FOUND", "Resource not found", 404);
    }
  }
  console.error("[api] Unhandled error:", error);
  return fail("INTERNAL_ERROR", "Something went wrong", 500);
}
