"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MODAL_ENDPOINT =
  process.env.NEXT_PUBLIC_MODAL_RESEARCH_ENDPOINT ||
  "https://dynotx--research-agent-streaming-fastapi-app.modal.run";

export interface ResearchArtifact {
  id: string;
  question: string;
  answer: string;
  status: "pending" | "streaming" | "completed" | "failed";
  turnCount: number;
  toolCalls: string[];
  error?: string;
}

export function useModalResearch(options?: {
  onAllComplete?: (artifacts: ResearchArtifact[]) => void;
}) {
  const [artifacts, setArtifacts] = useState<ResearchArtifact[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const connections = useRef<Map<string, EventSource>>(new Map());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const startResearch = useCallback(
    (questions: string[], planContext?: string) => {
      if (questions.length === 0) return;

      setIsResearching(true);

      const initial: ResearchArtifact[] = questions.map((q, i) => ({
        id: `rq-${i}-${Date.now()}`,
        question: q,
        answer: "",
        status: "pending",
        turnCount: 0,
        toolCalls: [],
      }));

      setArtifacts(initial);

      questions.forEach((question, idx) => {
        const artifact = initial[idx];
        const contextualQuestion = planContext
          ? `Context: ${planContext}\n\nResearch Question: ${question}`
          : question;

        const url = `${MODAL_ENDPOINT}/research/stream?question=${encodeURIComponent(contextualQuestion)}&max_turns=10`;
        const es = new EventSource(url);
        connections.current.set(artifact.id, es);

        let answer = "";
        let toolCalls: string[] = [];
        const timeoutRef = { current: 0 as unknown as ReturnType<typeof setTimeout> };

        const markDone = (patch: Partial<ResearchArtifact>) => {
          clearTimeout(timeoutRef.current);
          es.close();
          connections.current.delete(artifact.id);
          setArtifacts((prev) => {
            const updated = prev.map((a) =>
              a.id === artifact.id ? { ...a, ...patch } : a
            );
            if (updated.every((a) => a.status === "completed" || a.status === "failed")) {
              setIsResearching(false);
              optionsRef.current?.onAllComplete?.(updated);
            }
            return updated;
          });
        };

        es.addEventListener("message", (e: MessageEvent) => {
          const data = JSON.parse(e.data) as { content?: string; turn?: number };
          answer += data.content ?? "";
          setArtifacts((prev) =>
            prev.map((a) =>
              a.id === artifact.id
                ? { ...a, answer, status: "streaming", turnCount: data.turn ?? a.turnCount }
                : a
            )
          );
        });

        es.addEventListener("tool_call", (e: MessageEvent) => {
          const data = JSON.parse(e.data) as { tool: string };
          toolCalls = [...toolCalls, data.tool];
          setArtifacts((prev) =>
            prev.map((a) => (a.id === artifact.id ? { ...a, toolCalls } : a))
          );
        });

        es.addEventListener("complete", (e: MessageEvent) => {
          const data = JSON.parse(e.data) as { turns: number };
          markDone({ answer, status: "completed", turnCount: data.turns, toolCalls });
        });

        es.onerror = () => {
          markDone({ status: "failed", error: "Connection failed" });
        };

        timeoutRef.current = setTimeout(() => {
          if (!connections.current.has(artifact.id)) return;
          markDone({ status: "failed", error: "Timed out after 2 minutes" });
        }, 2 * 60 * 1000);
      });
    },
    []
  );

  const cancel = useCallback(() => {
    connections.current.forEach((es) => es.close());
    connections.current.clear();
    setIsResearching(false);
  }, []);

  useEffect(() => {
    const conns = connections.current;
    return () => {
      conns.forEach((es) => es.close());
    };
  }, []);

  return { artifacts, isResearching, startResearch, cancel };
}
