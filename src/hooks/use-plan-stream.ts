"use client";

import { useState, useCallback, useRef } from "react";

export type PlanSection = "research_questions" | "primitives" | "context";
export type PlanStatus = "idle" | "planning" | "complete" | "error";

export interface PlanStreamState {
  status: PlanStatus;
  text: string;
  currentSection: PlanSection | "";
  error: string | null;
}

export function usePlanStream() {
  const [state, setState] = useState<PlanStreamState>({
    status: "idle",
    text: "",
    currentSection: "",
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const startPlan = useCallback(
    async (
      query: string,
      options?: {
        autoResearch?: boolean;
        onText?: (chunk: string) => void;
        onSection?: (section: PlanSection) => void;
        onComplete?: (fullText: string) => void;
        onError?: (error: string) => void;
      }
    ) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setState({ status: "planning", text: "", currentSection: "", error: null });

      try {
        const res = await fetch("/api/agent/plan/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, autoResearch: options?.autoResearch ?? false }),
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
                if (eventType === "text" && payload.text) {
                  setState((prev) => ({ ...prev, text: prev.text + payload.text }));
                  options?.onText?.(payload.text);
                } else if (eventType === "section" && payload.section) {
                  setState((prev) => ({ ...prev, currentSection: payload.section }));
                  options?.onSection?.(payload.section);
                } else if (eventType === "complete") {
                  setState((prev) => ({ ...prev, status: "complete" }));
                  options?.onComplete?.(payload.fullText ?? "");
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
    setState((prev) => (prev.status === "planning" ? { ...prev, status: "idle" } : prev));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle", text: "", currentSection: "", error: null });
  }, []);

  return { ...state, startPlan, stop, reset };
}
