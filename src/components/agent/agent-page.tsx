"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { X, Download, FileText, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./chat-input";
import { MODE_EXAMPLES } from "./chat-empty-state";
import { UserMessage } from "./message/user-message";
import { AssistantMessage } from "./message/assistant-message";
import { PlanMessage } from "./message/plan-message";
import { ResearchMessage } from "./message/research-message";
import { ResearchRenderer } from "./message/research-message";
import { useChatSessions, type AgentMode } from "@/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";

// ── Report panel ──────────────────────────────────────────────────────────────

interface ReportPanelProps {
  /** Empty string means "generating" — show loading state */
  report: string;
  onClose: () => void;
  loadingMessage?: string;
}

function ReportPanel({ report, onClose, loadingMessage = "Synthesizing research findings…" }: ReportPanelProps) {
  const isGenerating = report === "";

  const download = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Sticky header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Research Report</span>
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Writing…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isGenerating && (
            <Button variant="ghost" size="sm" onClick={download} className="h-7 px-2 text-xs gap-1">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">{loadingMessage}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Document-style padding with constrained width */}
          <div className="px-10 py-8 max-w-2xl mx-auto">
            <ResearchRenderer text={report} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent page ────────────────────────────────────────────────────────────────

interface PendingSpecial {
  type: "plan" | "research";
  query: string;
}

interface AgentPageProps {
  rateLimits?: Partial<Record<AgentMode, number>>;
  onMessageSent?: (mode: AgentMode) => void;
  sessionId?: string;
}

function getTextFromParts(parts: unknown[] | undefined): string {
  if (!parts) return "";
  return parts
    .filter((p): p is { type: string; text: string } =>
      typeof p === "object" && p !== null && (p as { type: string }).type === "text"
    )
    .map((p) => p.text)
    .join("");
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
        ? getTextFromParts(firstUserText.parts as unknown[]).slice(0, 60) || "Conversation"
        : "Conversation";
      updateSession(currentSessionId.current, {
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: getTextFromParts(m.parts as unknown[]),
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
        setPendingSpecials((prev) => [...prev, { type: "plan", query: text }]);
        onMessageSent?.("plan");
        saveToSession("plan");
      } else if (mode === "research") {
        ensureSession("research");
        setPendingSpecials((prev) => [...prev, { type: "research", query: text }]);
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
              {pendingSpecials.map((ps, i) => {
                // Only the most-recently submitted plan controls the report panel.
                // Earlier plans get undefined callbacks so their completions are no-ops.
                const isLatest = i === pendingSpecials.length - 1;
                return (
                  <div key={`ps-${i}`} className="space-y-6">
                    <UserMessage content={ps.query} />
                    {ps.type === "plan" ? (
                      <PlanMessage
                        query={ps.query}
                        onReportStarted={isLatest ? () => {
                          setReportLoadingMessage("Synthesizing research findings…");
                          setReportContent("");
                        } : undefined}
                        onReportReady={isLatest ? (report) => setReportContent(report) : undefined}
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
