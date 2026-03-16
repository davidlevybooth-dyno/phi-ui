"use client";

import { useState, useCallback, useEffect } from "react";
import type { AgentMode } from "./use-chat-sessions";

const STORAGE_KEY = "dyno-phi-rate";
const LIMIT_PER_MODE = 5;

type RateLimitStore = Record<string, Record<AgentMode, number>>;

function load(): RateLimitStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RateLimitStore) : {};
  } catch {
    return {};
  }
}

function save(store: RateLimitStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function useAgentRateLimit(sessionId: string | null) {
  const [counts, setCounts] = useState<Record<AgentMode, number>>({
    chat: 0,
    research: 0,
    plan: 0,
  });

  useEffect(() => {
    if (!sessionId) return;
    const store = load();
    const sessionCounts = store[sessionId] ?? { chat: 0, research: 0, plan: 0 };
    setCounts(sessionCounts);
  }, [sessionId]);

  const isLimited = useCallback(
    (mode: AgentMode): boolean => {
      if (!sessionId) return false;
      return counts[mode] >= LIMIT_PER_MODE;
    },
    [counts, sessionId]
  );

  const getRemainingCount = useCallback(
    (mode: AgentMode): number => {
      return Math.max(0, LIMIT_PER_MODE - (counts[mode] ?? 0));
    },
    [counts]
  );

  const increment = useCallback(
    (mode: AgentMode) => {
      if (!sessionId) return;
      setCounts((prev) => {
        const next = { ...prev, [mode]: (prev[mode] ?? 0) + 1 };
        const store = load();
        store[sessionId] = next;
        save(store);
        return next;
      });
    },
    [sessionId]
  );

  return { isLimited, getRemainingCount, increment, limit: LIMIT_PER_MODE };
}
