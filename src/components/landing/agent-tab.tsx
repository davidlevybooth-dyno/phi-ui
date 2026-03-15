"use client";

import React, { useCallback, useRef } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/agent/chat-input";
import { MODE_EXAMPLES } from "@/components/agent/chat-empty-state";
import { UserMessage } from "@/components/agent/message/user-message";
import { AssistantMessage } from "@/components/agent/message/assistant-message";
import { PlanMessage } from "@/components/agent/message/plan-message";
import { ResearchMessage } from "@/components/agent/message/research-message";
import { useAgentRateLimit } from "@/hooks/use-agent-rate-limit";
import { useChatSessions, type AgentMode } from "@/hooks/use-chat-sessions";

function getTextFromParts(parts: unknown[] | undefined): string {
  if (!parts) return "";
  return parts
    .filter((p): p is { type: string; text: string } =>
      typeof p === "object" && p !== null && (p as { type: string }).type === "text"
    )
    .map((p) => p.text)
    .join("");
}

interface PendingSpecial {
  type: "plan" | "research";
  query: string;
}

export function AgentTab() {
  const [mode, setMode] = React.useState<AgentMode>("plan");
  const [pendingSpecials, setPendingSpecials] = React.useState<PendingSpecial[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { createSession } = useChatSessions();
  const sessionIdRef = useRef<string | null>(null);

  // Ensure a stable session ID is created once
  const ensureSession = useCallback(() => {
    if (!sessionIdRef.current) {
      const session = createSession(mode);
      sessionIdRef.current = session.id;
    }
    return sessionIdRef.current;
  }, [createSession, mode]);

  const sessionId = sessionIdRef.current;
  const { isLimited, getRemainingCount, increment } = useAgentRateLimit(sessionId);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingSpecials]);

  const handleSend = useCallback(
    (text: string) => {
      const sid = ensureSession();
      if (isLimited(mode)) return;
      increment(mode);

      if (mode === "plan") {
        setPendingSpecials((prev) => [...prev, { type: "plan", query: text }]);
      } else if (mode === "research") {
        setPendingSpecials((prev) => [...prev, { type: "research", query: text }]);
      } else {
        sendMessage({ text });
      }

      void sid;
    },
    [mode, ensureSession, isLimited, increment, sendMessage]
  );

  const rateLimits: Partial<Record<AgentMode, number>> = {
    plan: getRemainingCount("plan"),
    research: getRemainingCount("research"),
    chat: getRemainingCount("chat"),
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0 || pendingSpecials.length > 0;

  return (
    <div className="flex flex-col h-full">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-10">
          <h2 className="text-4xl font-semibold tracking-tight">Ready when you are</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {MODE_EXAMPLES[mode].map((ex) => (
              <button
                key={ex}
                onClick={() => handleSend(ex)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="w-full max-w-2xl">
            <ChatInput
              noBorder
              rows={3}
              mode={mode}
              onModeChange={setMode}
              onSend={handleSend}
              onStop={stop}
              isStreaming={isStreaming}
              rateLimits={rateLimits}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg) => {
                const textContent = getTextFromParts(msg.parts as unknown[]);
                return (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <UserMessage content={textContent} />
                    ) : (
                      <AssistantMessage content={textContent} />
                    )}
                  </div>
                );
              })}
              {pendingSpecials.map((ps, i) => (
                <div key={`ps-${i}`} className="space-y-6">
                  <UserMessage content={ps.query} />
                  {ps.type === "plan" ? (
                    <PlanMessage query={ps.query} />
                  ) : (
                    <ResearchMessage query={ps.query} />
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="shrink-0">
            <ChatInput
              mode={mode}
              onModeChange={setMode}
              onSend={handleSend}
              onStop={stop}
              isStreaming={isStreaming}
              rateLimits={rateLimits}
            />
            {/* Compact rate-limit badge — only visible after first prompt */}
            <div className="flex justify-center pb-3 mt-1">
              <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs dark:border-blue-800 dark:bg-blue-950/20">
                <Info className="size-3 shrink-0 text-blue-400 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-200">
                  Limit: 5 messages per session.{" "}
                  <Link href="/login" className="font-medium underline underline-offset-2 hover:no-underline">
                    Sign in
                  </Link>
                  {" "}for unlimited access and session history.
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
