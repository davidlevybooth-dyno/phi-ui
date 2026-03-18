import { useQuery } from "@tanstack/react-query";
import { getMyQuota } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";

export type QuotaState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ok"; used: number; max: number; remaining: number; resetAt: string | null };

/**
 * Fetches the current user's job quota and usage via GET /v1/phi/auth/me/quota.
 * No admin key needed — authenticated with the user's own session token.
 * Gracefully degrades to "unavailable" on any error.
 */
export function useQuota(): QuotaState {
  const { ready } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["quota", "me"],
    queryFn: getMyQuota,
    enabled: ready,
    // Quota changes only when jobs are submitted — 5-min stale window is fine.
    staleTime: 5 * 60_000,
    retry: (_, err) => {
      // Don't retry on 404 (endpoint not yet deployed) or parse errors.
      if (!(err instanceof ApiError)) return false;
      return err.status !== 404;
    },
  });

  if (isLoading) return { status: "loading" };
  if (!data) return { status: "unavailable" };

  const used = data.current_total_jobs;
  const max = data.max_total_jobs;
  // -1 means unlimited — don't show a quota bar for unlimited accounts.
  if (max === -1) return { status: "unavailable" };
  return {
    status: "ok",
    used,
    max,
    remaining: Math.max(0, max - used),
    resetAt: data.reset_at ?? null,
  };
}
