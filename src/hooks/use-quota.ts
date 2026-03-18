import { useQuery } from "@tanstack/react-query";
import { getUserQuotaUsage } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { useSettingsStore } from "@/lib/stores/auth-store";
import { ApiError } from "@/lib/api/client";

export type QuotaState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ok"; used: number; max: number; remaining: number; resetAt: string | null };

/**
 * Fetches the current user's job quota and usage.
 * Returns a simplified QuotaState that components can render without knowing
 * the API shape. Gracefully degrades to "unavailable" on 403/404.
 */
export function useQuota(): QuotaState {
  const { ready } = useAuth();
  const userId = useSettingsStore((s) => s.userId);

  const { data, isLoading } = useQuery({
    queryKey: ["quota", userId],
    queryFn: () => getUserQuotaUsage(userId),
    enabled: ready && !!userId && userId !== "default-user",
    // Quota changes only when jobs are submitted — 5-min stale window is fine.
    staleTime: 5 * 60_000,
    retry: (_, err) => {
      // Don't retry on 403 (not authorized to view own quota) or 404.
      const status = err instanceof ApiError ? err.status : undefined;
      return status !== 403 && status !== 404;
    },
  });

  if (isLoading) return { status: "loading" };
  if (!data) return { status: "unavailable" };

  const used = data.current_total_jobs;
  const max = data.max_jobs;
  return {
    status: "ok",
    used,
    max,
    remaining: Math.max(0, max - used),
    resetAt: data.reset_at ?? null,
  };
}
