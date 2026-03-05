"use client";

import { useState, useRef, useCallback } from "react";
import {
  createRun,
  getRunStatus,
  getRunResult,
  cancelRun,
  pollRunUntilDone,
  isTerminalStatus,
  type RunStatusResponse,
  type DesignResponse,
} from "@/lib/api/agent";

const POLL_INTERVAL_MS = 3000;
const MAX_RESULT_POLL_ATTEMPTS = 120;

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  runId?: string;
}

interface AgentSessionState {
  messages: AgentMessage[];
  isRunning: boolean;
  currentRunId: string | null;
  runStatus: RunStatusResponse | null;
}

interface AgentSessionActions {
  sendMessage: (text: string) => Promise<void>;
  stopRun: () => Promise<void>;
}

const WELCOME_MESSAGE: AgentMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the Dyno Phi design agent. Tell me about your protein design goal — describe your target, hotspot residues, or upload a structure — and I'll plan and run the right scoring pipeline for you.",
};

export function useAgentSession(): AgentSessionState & AgentSessionActions {
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME_MESSAGE]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatusResponse | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);

  const replaceMessage = useCallback((id: string, updater: Partial<AgentMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updater } : m)));
  }, []);

  const appendMessage = useCallback((message: AgentMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isRunning) return;

      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };
      appendMessage(userMessage);
      setIsRunning(true);
      setRunStatus(null);

      const placeholderId = `thinking-${Date.now()}`;
      appendMessage({ id: placeholderId, role: "assistant", content: "…" });

      try {
        const { run_id } = await createRun({ message: userMessage.content });
        setCurrentRunId(run_id);
        replaceMessage(placeholderId, { content: "Planning workflow…", runId: run_id });

        stopPollingRef.current = pollRunUntilDone(run_id, setRunStatus, POLL_INTERVAL_MS);

        const result = await waitForResult(run_id);
        const finalContent =
          result?.message ?? "Workflow complete. Check the Jobs tab for detailed results.";
        replaceMessage(placeholderId, { content: finalContent, runId: run_id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        replaceMessage(placeholderId, { content: `Error: ${msg}` });
      } finally {
        stopPollingRef.current?.();
        setIsRunning(false);
        setCurrentRunId(null);
      }
    },
    [isRunning, appendMessage, replaceMessage]
  );

  const stopRun = useCallback(async () => {
    stopPollingRef.current?.();
    if (currentRunId) {
      await cancelRun(currentRunId).catch(() => {});
    }
    setIsRunning(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.content === "…" || m.content === "Planning workflow…"
          ? { ...m, content: "Run cancelled." }
          : m
      )
    );
  }, [currentRunId]);

  return { messages, isRunning, currentRunId, runStatus, sendMessage, stopRun };
}

async function waitForResult(runId: string): Promise<DesignResponse | null> {
  for (let attempt = 0; attempt < MAX_RESULT_POLL_ATTEMPTS; attempt++) {
    await delay(POLL_INTERVAL_MS);
    const status = await getRunStatus(runId);
    if (status.status === "completed") {
      return getRunResult(runId);
    }
    if (isTerminalStatus(status.status)) {
      return null;
    }
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
