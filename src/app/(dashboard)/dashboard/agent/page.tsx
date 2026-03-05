"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Bot, User, Loader2, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useAgentSession, type AgentMessage } from "@/hooks/use-agent-session";
import { recommendProtocols } from "@/lib/api/protocols";
import type { RunStatusResponse } from "@/lib/api/agent";
import { cn } from "@/lib/utils";

interface Protocol {
  id: string;
  name: string;
  description?: string;
}

function ChatMessage({ message }: { message: AgentMessage }) {
  return (
    <div className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
          message.role === "user" ? "bg-foreground text-background" : "bg-muted"
        )}
      >
        {message.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div
        className={cn(
          "rounded-lg px-3.5 py-2.5 text-sm max-w-[85%]",
          message.role === "user" ? "bg-foreground text-background" : "bg-muted"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.runId && (
          <p className="text-xs opacity-60 mt-1.5 font-mono">run:{message.runId.slice(0, 8)}</p>
        )}
      </div>
    </div>
  );
}

function WorkflowPlanPanel({ status }: { status: RunStatusResponse | null }) {
  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Zap className="size-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Workflow plan will appear here as the agent executes.
        </p>
      </div>
    );
  }

  const stages =
    (status.plan as { stages?: Record<string, unknown>[] } | undefined)?.stages ?? [];
  const budget = status.budget as
    | { allocated_usd?: number; spent_usd?: number; remaining_usd?: number }
    | undefined;

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">Progress</span>
          <span className="text-xs text-muted-foreground">
            {status.progress?.percent_complete ?? 0}%
          </span>
        </div>
        <Progress value={status.progress?.percent_complete ?? 0} className="h-1.5" />
        {status.progress?.current_step && (
          <p className="text-xs text-muted-foreground mt-1.5">{status.progress.current_step}</p>
        )}
      </div>

      {budget && (
        <Card className="p-3 space-y-1">
          <p className="text-xs font-medium">Budget</p>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Spent</span>
            <span>${budget.spent_usd?.toFixed(2) ?? "0.00"}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Remaining</span>
            <span>${budget.remaining_usd?.toFixed(2) ?? "—"}</span>
          </div>
        </Card>
      )}

      {stages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Pipeline stages</p>
          {stages.map((stage, i) => {
            const s = stage as {
              stage?: string;
              status?: string;
              description?: string;
              cost_usd?: number;
            };
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                    s.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : s.status === "running"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <ChevronRight className="size-2.5" />
                </div>
                <div>
                  <p className="font-medium">{s.stage}</p>
                  {s.description && <p className="text-muted-foreground">{s.description}</p>}
                  {s.cost_usd != null && (
                    <p className="text-muted-foreground">${s.cost_usd.toFixed(2)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  const { messages, isRunning, runStatus, sendMessage, stopRun } = useAgentSession();
  const [input, setInput] = useState("");
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loadingProtocols, setLoadingProtocols] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProtocolRecommendations = useCallback(async (text: string) => {
    if (text.length < 20) {
      setProtocols([]);
      return;
    }
    setLoadingProtocols(true);
    try {
      const result = (await recommendProtocols(text)) as {
        protocols?: Protocol[];
        recommendations?: Protocol[];
      };
      const items = result.protocols ?? result.recommendations ?? [];
      setProtocols(items.slice(0, 3) as Protocol[]);
    } catch {
      setProtocols([]);
    } finally {
      setLoadingProtocols(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = globalThis.setTimeout(() => {
      fetchProtocolRecommendations(val);
    }, 800);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
    setProtocols([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] -m-6">
      <ResizablePanelGroup orientation="horizontal" className="h-full">
        <ResizablePanel defaultSize={62} minSize={40}>
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Bot className="size-4" />
              <span className="text-sm font-medium">Design Agent</span>
              {isRunning && (
                <Badge variant="secondary" className="text-xs gap-1 ml-auto">
                  <Loader2 className="size-3 animate-spin" />
                  Running
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {(protocols.length > 0 || loadingProtocols) && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1.5">Suggested protocols</p>
                <div className="flex gap-1.5 flex-wrap">
                  {loadingProtocols ? (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Loading…
                    </Badge>
                  ) : (
                    protocols.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setInput((v) => v + (v ? " " : "") + `[${p.name}]`)}
                        className="text-xs"
                      >
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-muted transition-colors"
                        >
                          {p.name}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="border-t p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your protein design goal, paste sequences, or specify a target PDB ID…"
                  className="min-h-[80px] resize-none text-sm"
                  disabled={isRunning}
                />
                <div className="flex flex-col gap-1.5">
                  {isRunning ? (
                    <Button size="icon" variant="outline" onClick={stopRun} className="size-9">
                      <Square className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="size-9"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={38} minSize={25}>
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b">
              <span className="text-sm font-medium">Workflow Plan</span>
            </div>
            <WorkflowPlanPanel status={runStatus} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
