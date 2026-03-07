import { apiPost, apiGet, apiDelete, buildStreamUrl } from "./client";
import {
  RunStatusResponseSchema,
  CreateRunResponseSchema,
  type RunStatusResponse,
} from "@/lib/schemas/agent";

export type { RunStatusResponse };

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

export type RunStatus = RunStatusResponse["status"];

const TERMINAL_STATUSES = new Set<RunStatus>(["completed", "failed", "cancelled"]);

export function isTerminalStatus(status: RunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export async function createRun(request: DesignRequest): Promise<{ run_id: string }> {
  const data = await apiPost<unknown>("/runs", request);
  return CreateRunResponseSchema.parse(data);
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  const data = await apiGet<unknown>(`/runs/${runId}`);
  return RunStatusResponseSchema.parse(data);
}

export async function getRunResult(runId: string): Promise<DesignResponse> {
  return apiGet<DesignResponse>(`/runs/${runId}/result`);
}

export async function cancelRun(runId: string): Promise<{ status: string }> {
  return apiDelete<{ status: string }>(`/runs/${runId}`);
}

/** Returns a URL for SSE log streaming. Credentials are embedded as query params (EventSource workaround). */
export function getRunLogStreamUrl(runId: string): string {
  return buildStreamUrl(`/runs/${runId}/logs/stream`);
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
