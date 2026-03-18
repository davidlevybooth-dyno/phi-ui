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
 * Endpoint: GET /v1/phi/admin/quotas/user/{user_id}/usage
 *
 * The backend enforces that a user can only query their own usage unless they
 * are an admin. Returns 403 if the requester's user_id does not match the path
 * parameter. Callers should handle 403 gracefully (show defaults without count).
 */
export function getUserQuotaUsage(userId: string): Promise<QuotaUsage> {
  return apiGet<unknown>(
    `/v1/phi/admin/quotas/user/${encodeURIComponent(userId)}/usage`
  ).then((data) => QuotaUsageSchema.parse(data));
}
