import { getApiCredentials } from "./credentials";

const FETCH_TIMEOUT_MS = 30_000;

// Single source of truth for the API base URL.
// Override for local API testing: set NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_DYNO_API_BASE_URL
// (e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:8000). Next.js only exposes NEXT_PUBLIC_* to the client.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_DYNO_API_BASE_URL ??
  "https://api.dyno-agents.app";

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
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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
