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

export function useResearchStream() {
  const [state, setState] = useState<ResearchState>({
    status: "idle",
    interactionId: null,
    output: "",
    thinkingSteps: [],
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const startResearch = useCallback(
    async (
      query: string,
      options?: {
        onThinking?: (step: ThinkingStep) => void;
        onContent?: (text: string) => void;
        onComplete?: (output: string, thinkingSteps: ThinkingStep[]) => void;
        onError?: (error: string) => void;
      }
    ) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setState({ status: "running", interactionId: null, output: "", thinkingSteps: [], error: null });

      try {
        const res = await fetch("/api/agent/research/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          let dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataLine = line.slice(6).trim();
            } else if (line === "" && eventType && dataLine) {
              try {
                const payload = JSON.parse(dataLine);
                if (eventType === "content" && payload.text) {
                  setState((prev) => ({
                    ...prev,
                    output: payload.fullText ?? prev.output + payload.text,
                  }));
                  options?.onContent?.(payload.text);
                } else if (eventType === "thinking" && payload.summary) {
                  const step: ThinkingStep = {
                    summary: payload.summary,
                    timestamp: payload.timestamp,
                  };
                  setState((prev) => ({
                    ...prev,
                    thinkingSteps: [...prev.thinkingSteps, step],
                  }));
                  options?.onThinking?.(step);
                } else if (eventType === "complete") {
                  setState((prev) => ({ ...prev, status: "complete" }));
                  options?.onComplete?.(payload.finalText ?? "", []);
                } else if (eventType === "error") {
                  const msg = payload.error ?? "Unknown error";
                  setState((prev) => ({ ...prev, status: "error", error: msg }));
                  options?.onError?.(msg);
                }
              } catch {}
              eventType = "";
              dataLine = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({ ...prev, status: "error", error: msg }));
        options?.onError?.(msg);
      }
    },
    []
  );

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
