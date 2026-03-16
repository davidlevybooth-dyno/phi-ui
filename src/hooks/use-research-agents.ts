"use client";

import { useState, useCallback, useRef } from "react";

export type ResearchStatus = "idle" | "running" | "complete" | "error";

export interface ThinkingStep {
  summary: string;
  timestamp: number;
}

export interface ResearchState {
  status: ResearchStatus;
  interactionId: string | null;
  output: string;
  thinkingSteps: ThinkingStep[];
  error: string | null;
}

function isTransientErrorMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("terminated") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("network") ||
    lower.includes("socket") ||
    lower.includes("body")
  );
}

/**
 * Reads an SSE stream from a Response body.
 * Calls onEvent for each complete event block and tracks the last Google event_id.
 * Returns whether a terminal event (complete or fatal error) was reached.
 */
async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (
    eventType: string,
    data: string,
    googleEventId: string
  ) => { terminal?: boolean; transientError?: string } | void,
  abortSignal: AbortSignal
): Promise<{ lastGoogleEventId: string; completed: boolean; transientError: string | null }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastGoogleEventId = "";
  let completed = false;
  let transientError: string | null = null;

  try {
    outer: while (!abortSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEventType = "";
      let currentData = "";
      let currentId = "";

      for (const line of lines) {
        if (line.startsWith("id: ")) {
          currentId = line.slice(4).trim();
        } else if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentData = line.slice(6).trim();
        } else if (line === "" && currentEventType && currentData) {
          if (currentId) lastGoogleEventId = currentId;

          const result = onEvent(currentEventType, currentData, currentId);

          if (result?.terminal) { completed = true; break outer; }
          if (result?.transientError) { transientError = result.transientError; break outer; }

          currentEventType = "";
          currentData = "";
          currentId = "";
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return { lastGoogleEventId, completed, transientError };
}

export function useResearchStream() {
  const [state, setState] = useState<ResearchState>({
    status: "idle",
    interactionId: null,
    output: "",
    thinkingSteps: [],
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({ status: "running", interactionId: null, output: "", thinkingSteps: [], error: null });

    // Tracks Google's event_id for reconnection — must survive across reconnects.
    let lastGoogleEventId = "";

    // Processes a single parsed SSE event, updating React state.
    // Returns { terminal: true } to stop reading, or { transientError } to trigger reconnect.
    const processEvent = (
      eventType: string,
      data: string
    ): { terminal?: boolean; transientError?: string } | void => {
      try {
        const payload = JSON.parse(data) as Record<string, unknown>;

        if (eventType === "thinking" && payload.summary) {
          const step: ThinkingStep = {
            summary: payload.summary as string,
            timestamp: payload.timestamp as number,
          };
          setState((prev) => ({
            ...prev,
            thinkingSteps: [...prev.thinkingSteps, step],
          }));
        } else if (eventType === "content" && payload.text) {
          setState((prev) => ({
            ...prev,
            output: (payload.fullText as string | undefined) ?? prev.output + (payload.text as string),
          }));
        } else if (eventType === "complete") {
          const completedSteps = Array.isArray(payload.thinkingSteps)
            ? (payload.thinkingSteps as ThinkingStep[])
            : [];
          // finalText is the full research report. When interactions.get is called
          // on an already-completed interaction, Google skips replaying incremental
          // content.delta events and delivers everything here — so we must set output
          // from finalText, not rely on prior content events.
          const finalText = (payload.finalText as string | undefined) ?? "";
          setState((prev) => ({
            ...prev,
            status: "complete",
            output: finalText || prev.output,
            // Prefer already-accumulated steps from individual thinking events.
            // Only fall back to completedSteps if we received none individually
            // (e.g. the interaction was already done when the stream attached).
            thinkingSteps: prev.thinkingSteps.length > 0 ? prev.thinkingSteps : completedSteps,
          }));
          return { terminal: true };
        } else if (eventType === "error") {
          const msg = (payload.error as string) ?? "Unknown error";
          if (isTransientErrorMessage(msg)) {
            return { transientError: msg };
          }
          setState((prev) => ({ ...prev, status: "error", error: msg }));
          return { terminal: true };
        }
      } catch {
        // Ignore malformed SSE payloads.
      }
    };

    try {
      // ── Phase 1: create the interaction (fast — returns in ~800ms) ────────────
      const startRes = await fetch("/api/agent/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: abort.signal,
      });

      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${startRes.status}`);
      }

      const { interactionId } = (await startRes.json()) as { interactionId: string };
      setState((prev) => ({ ...prev, interactionId }));

      // ── Phase 2: stream events (replays all events from the start when no
      //   lastEventId is given, so no thinking steps are missed) ─────────────
      let completed = false;
      let transientError: string | null = null;
      let reconnectCount = 0;
      const MAX_RECONNECTS = 3;

      do {
        if (reconnectCount > 0) {
          if (abort.signal.aborted) break;
          const delay = 2000 * reconnectCount;
          console.warn(
            `[useResearchStream] reconnecting (${reconnectCount}/${MAX_RECONNECTS}) from event ${lastGoogleEventId}`
          );
          await new Promise((resolve) => globalThis.setTimeout(resolve, delay));
          if (abort.signal.aborted) break;
        }

        const url = lastGoogleEventId
          ? `/api/agent/research/${interactionId}/stream?lastEventId=${encodeURIComponent(lastGoogleEventId)}`
          : `/api/agent/research/${interactionId}/stream`;

        const streamRes = await fetch(url, { signal: abort.signal });
        if (!streamRes.ok || !streamRes.body) {
          throw new Error(`HTTP ${streamRes.status}`);
        }

        const result = await readSSEStream(
          streamRes.body,
          (eventType, data, googleEventId) => {
            if (googleEventId) lastGoogleEventId = googleEventId;
            return processEvent(eventType, data);
          },
          abort.signal
        );

        lastGoogleEventId = result.lastGoogleEventId || lastGoogleEventId;
        completed = result.completed;
        transientError = result.transientError;
        reconnectCount++;
      } while (!completed && transientError !== null && reconnectCount <= MAX_RECONNECTS);

      if (!completed && transientError !== null) {
        setState((prev) => ({ ...prev, status: "error", error: transientError! }));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({ ...prev, status: "error", error: msg }));
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => (prev.status === "running" ? { ...prev, status: "idle" } : prev));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle", interactionId: null, output: "", thinkingSteps: [], error: null });
  }, []);

  return { ...state, startResearch, stop, reset };
}
