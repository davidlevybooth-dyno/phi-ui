import { z } from "zod";

export const AuthMeResponseSchema = z.object({
  user_id: z.string(),
  email: z.string().optional(),
  display_name: z.string().nullable().optional(),
  org_id: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
});

export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

// ---------------------------------------------------------------------------
// Quota usage — GET /v1/phi/admin/quotas/user/{user_id}/usage
// ---------------------------------------------------------------------------

export const QuotaUsageSchema = z.object({
  user_id: z.string().optional(),
  scope: z.string().optional(),
  scope_id: z.string().optional(),
  max_total_jobs: z.number().int(),
  max_concurrent_jobs: z.number().int().optional(),
  current_total_jobs: z.number().int(),
  current_concurrent_jobs: z.number().int().optional(),
  reset_at: z.string().nullable().optional(),
}).passthrough();

export type QuotaUsage = z.infer<typeof QuotaUsageSchema>;
