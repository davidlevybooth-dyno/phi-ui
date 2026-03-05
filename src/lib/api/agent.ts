import { apiPost, apiGet, apiDelete, BASE_URL } from "./client";

export interface DesignRequest {
  message: string;
  context?: Record<string, unknown>;
}

export interface DesignResponse {
  message: string;
  tool_calls: Record<string, unknown>[];
  results: Record<string, unknown>[];
  metadata: Record<string, unknown>;
}

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface RunStatusResponse {
  run_id: string;
  status: RunStatus;
  current_stage?: string;
  progress?: {
    percent_complete: number;
    current_step: string;
    eta_seconds?: number | null;
  };
  plan?: Record<string, unknown>;
  budget?: Record<string, unknown>;
}

const TERMINAL_STATUSES = new Set<RunStatus>(["completed", "failed", "cancelled"]);

export function isTerminalStatus(status: RunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export async function createRun(request: DesignRequest): Promise<{ run_id: string }> {
  return apiPost<{ run_id: string }>("/runs", request);
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  return apiGet<RunStatusResponse>(`/runs/${runId}`);
}

export async function getRunResult(runId: string): Promise<DesignResponse> {
  return apiGet<DesignResponse>(`/runs/${runId}/result`);
}

export async function cancelRun(runId: string): Promise<{ status: string }> {
  return apiDelete<{ status: string }>(`/runs/${runId}`);
}

/** Returns a URL for SSE log streaming. Headers must be set by the caller (EventSource workaround). */
export function getRunLogStreamUrl(runId: string): string {
  return `${BASE_URL}/runs/${runId}/logs/stream`;
}

/**
 * Polls run status until the run reaches a terminal state.
 * Returns a stop function — call it to cancel polling early.
 *
 * Swap this for an EventSource when the backend exposes SSE streaming.
 * See docs/backend-api-gaps.md — Agent SSE Streaming endpoint.
 */
export function pollRunUntilDone(
  runId: string,
  onUpdate: (status: RunStatusResponse) => void,
  intervalMs = 3000
): () => void {
  let active = true;

  const poll = async () => {
    while (active) {
      try {
        const status = await getRunStatus(runId);
        onUpdate(status);
        if (isTerminalStatus(status.status)) break;
      } catch {
        break;
      }
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, intervalMs));
    }
  };

  poll();
  return () => { active = false; };
}
