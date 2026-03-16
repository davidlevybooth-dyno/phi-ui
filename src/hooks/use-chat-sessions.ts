"use client";

import { useState, useCallback, useEffect } from "react";

export type AgentMode = "chat" | "research" | "plan";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: unknown[];
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: AgentMode;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "dyno-phi-sessions";
const MAX_SESSIONS = 50;

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Quota exceeded — drop oldest sessions and retry
    const trimmed = sessions.slice(-20);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const createSession = useCallback((mode: AgentMode = "chat"): ChatSession => {
    const session: ChatSession = {
      id: generateId(),
      title: "New conversation",
      mode,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, MAX_SESSIONS);
      saveSessions(next);
      return next;
    });
    return session;
  }, []);

  const updateSession = useCallback(
    (id: string, updates: Partial<Pick<ChatSession, "title" | "messages" | "mode">>) => {
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        );
        saveSessions(next);
        return next;
      });
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
  }, []);

  const getSession = useCallback(
    (id: string): ChatSession | undefined => {
      return sessions.find((s) => s.id === id);
    },
    [sessions]
  );

  return { sessions, createSession, updateSession, deleteSession, getSession };
}
