import { apiGet } from "./client";
import {
  AuthMeResponseSchema,
  QuotaUsageSchema,
  type AuthMeResponse,
  type QuotaUsage,
} from "@/lib/schemas/auth";

export function getAuthMe(): Promise<AuthMeResponse> {
  return apiGet<unknown>("/v1/phi/auth/me").then((data) =>
    AuthMeResponseSchema.parse(data)
  );
}

/**
 * Fetch the current user's job quota and usage.
 * Endpoint: GET /v1/phi/auth/me/quota
 * Authenticated with the user's own Clerk JWT or ak_ key — no admin access needed.
 * Always returns the quota for whoever's token is on the request.
 */
export function getMyQuota(): Promise<QuotaUsage> {
  return apiGet<unknown>("/v1/phi/auth/me/quota").then((data) =>
    QuotaUsageSchema.parse(data)
  );
}
