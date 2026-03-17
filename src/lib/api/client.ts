import { getApiCredentials } from "./credentials";

const FETCH_TIMEOUT_MS = 30_000;

// Single source of truth for the API base URL.
// Dev:  set NEXT_PUBLIC_API_BASE_URL in .env.local (staging URL, no trailing slash)
// Prod: set NEXT_PUBLIC_API_BASE_URL in Vercel env vars (prod URL, no trailing slash)
const _rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_DYNO_API_BASE_URL;

if (!_rawBaseUrl && process.env.NODE_ENV === "development") {
  console.error(
    "[API Client] NEXT_PUBLIC_API_BASE_URL is not set in .env.local. " +
    "Falling back to production API — requests will hit api.dyno-agents.app."
  );
}

const BASE_URL = (_rawBaseUrl ?? "https://api.dyno-agents.app").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const { apiKey, orgId, userId } = getApiCredentials();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
    "X-Organization-ID": orgId,
    "X-User-ID": userId,
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    // Prefer the backend's own error message (FastAPI uses "detail", others use "message").
    const backendMessage =
      body !== null &&
      typeof body === "object" &&
      ("detail" in body || "message" in body)
        ? String((body as Record<string, unknown>).detail ?? (body as Record<string, unknown>).message)
        : null;
    throw new ApiError(
      res.status,
      backendMessage ?? `API ${res.status}: ${res.statusText}`,
      body
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, timeoutMs);
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

/**
 * Builds a URL for SSE streaming endpoints.
 * EventSource does not support custom headers; auth params must be in the URL.
 * Only use this for streaming — all other requests go through apiGet/apiPost.
 */
export function buildStreamUrl(path: string, extraParams?: Record<string, string>): string {
  const { apiKey, orgId } = getApiCredentials();
  const url = new URL(`${BASE_URL}${path}`);
  if (apiKey) url.searchParams.set("x_api_key", apiKey);
  if (orgId) url.searchParams.set("org_id", orgId);
  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}
