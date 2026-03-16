"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Info } from "lucide-react";
import { ChatInput } from "@/components/agent/chat-input";
import { MODE_EXAMPLES } from "@/components/agent/chat-empty-state";
import { UserMessage } from "@/components/agent/message/user-message";
import { AssistantMessage } from "@/components/agent/message/assistant-message";
import { PlanMessage } from "@/components/agent/message/plan-message";
import { ResearchMessage } from "@/components/agent/message/research-message";
import { ReportPanel } from "@/components/agent/report-panel";
import { useAgentRateLimit } from "@/hooks/use-agent-rate-limit";
import { useChatSessions, type AgentMode } from "@/hooks/use-chat-sessions";
import { getTextFromParts } from "@/lib/utils/message";
import { cn } from "@/lib/utils";

interface PendingSpecial {
  type: "plan" | "research";
  query: string;
  id: string;
}

// ── AgentTab ──────────────────────────────────────────────────────────────────

export function AgentTab() {
  const [mode, setMode] = React.useState<AgentMode>("plan");
  const [pendingSpecials, setPendingSpecials] = React.useState<PendingSpecial[]>([]);
  // null = panel closed, "" = panel open + generating, "..." = panel open + ready
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoadingMessage, setReportLoadingMessage] = useState("Synthesizing research findings…");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { createSession } = useChatSessions();
  const sessionIdRef = useRef<string | null>(null);

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
        ensureSession();
      if (isLimited(mode)) return;
      increment(mode);

      if (mode === "plan") {
        setPendingSpecials((prev) => [...prev, { type: "plan", query: text, id: `plan-${Date.now()}` }]);
      } else if (mode === "research") {
        setPendingSpecials((prev) => [...prev, { type: "research", query: text, id: `research-${Date.now()}` }]);
      } else {
        sendMessage({ text });
      }
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
  const reportOpen = reportContent !== null;

  // ── Chat column ────────────────────────────────────────────────────────────
  const chatColumn = (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300 min-w-0",
      reportOpen ? "w-1/2 border-r" : "w-full"
    )}>
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
                const textContent = getTextFromParts(msg.parts);
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
              {pendingSpecials.map((ps, i) => {
                const isLatest = i === pendingSpecials.length - 1;
                return (
                  <div key={ps.id} className="space-y-6">
                    <UserMessage content={ps.query} />
                    {ps.type === "plan" ? (
                      <PlanMessage
                        query={ps.query}
                        onReportStarted={isLatest ? () => {
                          setReportLoadingMessage("Synthesizing research findings…");
                          setReportContent("");
                        } : undefined}
                        onReportReady={isLatest ? (report) => setReportContent(report) : undefined}
                        onReportError={isLatest ? () => setReportContent(null) : undefined}
                      />
                    ) : (
                      <ResearchMessage
                        query={ps.query}
                        onReportStarted={isLatest ? () => {
                          setReportLoadingMessage("Researching deeply…");
                          setReportContent("");
                        } : undefined}
                        onReportReady={isLatest ? (report) => setReportContent(report) : undefined}
                      />
                    )}
                  </div>
                );
              })}
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
            <div className="flex justify-center pb-3 mt-1">
              <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs dark:border-blue-800 dark:bg-blue-950/20">
                <Info className="size-3 shrink-0 text-blue-400 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-200">
                  Limit: 5 messages per session.{" "}
                  <Link href="/waitlist" className="font-medium underline underline-offset-2 hover:no-underline">
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

  return (
    <div className="flex h-full overflow-hidden">
      {chatColumn}
      {reportOpen && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <ReportPanel
            report={reportContent!}
            loadingMessage={reportLoadingMessage}
            onClose={() => setReportContent(null)}
          />
        </div>
      )}
    </div>
  );
}
