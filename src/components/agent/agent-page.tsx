"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronDown } from "lucide-react";
import { ChatInput } from "./chat-input";
import { MODE_EXAMPLES } from "./chat-empty-state";
import { UserMessage } from "./message/user-message";
import { AssistantMessage } from "./message/assistant-message";
import { PlanMessage } from "./message/plan-message";
import { ResearchMessage } from "./message/research-message";
import { ReportPanel } from "./report-panel";
import { useChatSessions, type AgentMode } from "@/hooks/use-chat-sessions";
import { getTextFromParts } from "@/lib/utils/message";
import { cn } from "@/lib/utils";

// ── Agent page ────────────────────────────────────────────────────────────────

interface PendingSpecial {
  type: "plan" | "research";
  query: string;
  id: string;
}

interface AgentPageProps {
  rateLimits?: Partial<Record<AgentMode, number>>;
  onMessageSent?: (mode: AgentMode) => void;
  sessionId?: string;
}

export function AgentPage({ rateLimits, onMessageSent, sessionId }: AgentPageProps) {
  const [mode, setMode] = useState<AgentMode>("plan");
  const [pendingSpecials, setPendingSpecials] = useState<PendingSpecial[]>([]);
  // null = panel closed, "" = panel open + generating, "..." = panel open + ready
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoadingMessage, setReportLoadingMessage] = useState("Synthesizing research findings…");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { createSession, updateSession } = useChatSessions();
  const currentSessionId = useRef(sessionId ?? null);

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingSpecials]);

  const ensureSession = useCallback(
    (modeUsed: AgentMode) => {
      if (!currentSessionId.current) {
        const session = createSession(modeUsed);
        currentSessionId.current = session.id;
      }
    },
    [createSession]
  );

  const saveToSession = useCallback(
    (modeUsed: AgentMode) => {
      if (!currentSessionId.current) return;
      const firstUserText = messages.find((m) => m.role === "user");
      const title = firstUserText
        ? getTextFromParts(firstUserText.parts).slice(0, 60) || "Conversation"
        : "Conversation";
      updateSession(currentSessionId.current, {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: getTextFromParts(m.parts),
          createdAt: new Date().toISOString(),
        })),
        title,
        mode: modeUsed,
      });
    },
    [messages, updateSession]
  );

  const handleSend = useCallback(
    (text: string) => {
      if (mode === "plan") {
        ensureSession("plan");
        setPendingSpecials((prev) => [...prev, { type: "plan", query: text, id: `plan-${Date.now()}` }]);
        onMessageSent?.("plan");
        saveToSession("plan");
      } else if (mode === "research") {
        ensureSession("research");
        setPendingSpecials((prev) => [...prev, { type: "research", query: text, id: `research-${Date.now()}` }]);
        onMessageSent?.("research");
        saveToSession("research");
      } else {
        ensureSession("chat");
        sendMessage({ text });
        onMessageSent?.("chat");
      }
    },
    [mode, sendMessage, ensureSession, onMessageSent, saveToSession]
  );

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0 || pendingSpecials.length > 0;
  const reportOpen = reportContent !== null;

  // ── Chat column ────────────────────────────────────────────────────────────
  const chatColumn = (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300 min-w-0",
      reportOpen ? "w-1/2 border-r" : "w-full"
    )}>
      <div className="px-4 py-2 border-b shrink-0">
        <div className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-default select-none">
          phi-lite
          <ChevronDown className="h-3 w-3 opacity-50" />
        </div>
      </div>

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
                // Only the most-recently submitted plan controls the report panel.
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
