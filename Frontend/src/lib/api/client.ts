"use client";

import { apiBaseUrl } from "@/lib/api/errors";
import type { ApiErrorBody } from "@/lib/api/contracts";

export class ApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export interface RequestOptions {
  token?: string | null;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

function requestId(): string {
  return `web_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Single reusable API layer (spec §18.2). All web→backend traffic goes here —
 * no bare fetch() scattered across components. Backend is the only AI/storage
 * authority; the browser never touches vendor APIs (except Firebase Auth).
 */
export async function apiFetch<T>(path: string, method: string, opts: RequestOptions = {}): Promise<{ data: T; requestId: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-request-id": requestId(),
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body,
      signal: opts.signal,
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Network error", 0);
  }

  const requestIdHeader = res.headers.get("x-request-id") ?? undefined;
  const contentType = res.headers.get("content-type") ?? "";
  let parsed: unknown = null;
  try {
    parsed = contentType.includes("json") ? await res.json() : await res.text();
  } catch {
    throw new ApiError("INTERNAL_ERROR", "Malformed response", res.status, requestIdHeader);
  }

  if (!res.ok) {
    const err = (parsed as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? "INTERNAL_ERROR",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.requestId ?? requestIdHeader
    );
  }
  const data = (parsed as { data?: T })?.data as T;
  return { data, requestId: requestIdHeader ?? "" };
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, "GET", opts),
  post: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, "POST", opts),
  patch: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, "PATCH", opts),
  delete: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, "DELETE", opts),
};
